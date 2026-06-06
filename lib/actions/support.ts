"use server";

import { getServerSession } from "next-auth";
import { Resend } from "resend";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createNotification, notifyAdmins } from "@/lib/actions/notifications";
import {
  supportTicketConfirmationEmail,
  supportTicketAdminNotificationEmail,
} from "@/lib/email-templates";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TRANSITIONS,
  type SupportTicket,
  type SupportTicketCategory,
  type SupportTicketDetail,
  type SupportTicketMessage,
  type SupportTicketPriority,
  type SupportTicketStatus,
  type SupportTicketWithMeta,
} from "@/lib/types/support";
import {
  buildPaginated,
  normalizePagination,
  type Paginated,
} from "@/lib/types/pagination";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const VALID_CATEGORIES = Object.keys(TICKET_CATEGORY_LABELS) as SupportTicketCategory[];
const VALID_PRIORITIES = Object.keys(TICKET_PRIORITY_LABELS) as SupportTicketPriority[];

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

async function getEmailForProfile(
  supabase: ReturnType<typeof createServiceRoleClient>,
  profileId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("email")
    .eq("id", profileId)
    .single();
  return data?.email ?? null;
}

/** Count messages per ticket for a set of ticket ids (one query, tallied in JS). */
async function messageCountsFor(
  supabase: ReturnType<typeof createServiceRoleClient>,
  ticketIds: string[],
  opts: { includeInternal: boolean },
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ticketIds.length === 0) return counts;
  let q = supabase
    .from("support_ticket_messages")
    .select("ticket_id, is_internal")
    .in("ticket_id", ticketIds);
  if (!opts.includeInternal) q = q.eq("is_internal", false);
  const { data } = await q;
  for (const row of data ?? []) {
    counts.set(row.ticket_id, (counts.get(row.ticket_id) ?? 0) + 1);
  }
  return counts;
}

// ────────────────────────────────────────────────────────────────
// Broker actions
// ────────────────────────────────────────────────────────────────

export async function createTicket(form: {
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  description: string;
}): Promise<{ ok: true; id: string; ticketNo: number } | { ok: false; error: string }> {
  const { userId } = await requireBroker();

  const subject = form.subject?.trim();
  const description = form.description?.trim();
  if (!subject) return { ok: false, error: "Please enter a subject." };
  if (subject.length > 200) return { ok: false, error: "Subject must be 200 characters or fewer." };
  if (!description) return { ok: false, error: "Please describe your issue." };
  if (description.length > 5000) return { ok: false, error: "Description is too long (max 5000 characters)." };
  const category: SupportTicketCategory = VALID_CATEGORIES.includes(form.category) ? form.category : "general";
  const priority: SupportTicketPriority = VALID_PRIORITIES.includes(form.priority) ? form.priority : "normal";

  const supabase = createServiceRoleClient();

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({ broker_id: userId, subject, category, priority })
    .select("id, ticket_no")
    .single();
  if (error || !ticket) return { ok: false, error: "Failed to create the ticket. Please try again." };

  const { error: msgError } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    sender_id: userId,
    sender_role: "broker",
    body: description,
  });
  if (msgError) {
    // Roll back the ticket so we don't leave an empty one behind.
    await supabase.from("support_tickets").delete().eq("id", ticket.id);
    return { ok: false, error: "Failed to create the ticket. Please try again." };
  }

  const ticketNo = ticket.ticket_no as number;
  const brokerName = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .single()
    .then((r) => r.data?.name ?? null);

  // In-app: notify all admins.
  notifyAdmins({
    type: "ticket_created",
    title: `New support ticket #${ticketNo}`,
    message: subject,
    link: `/admin/support/${ticket.id}`,
  }).catch(() => {});

  // Email: confirmation to the submitter (exactly one) + notification to admins.
  const brokerEmail = await getEmailForProfile(supabase, userId);
  if (brokerEmail) {
    resend.emails
      .send({
        from: EMAIL_FROM,
        to: brokerEmail,
        subject: `We've received your request — ticket #${ticketNo}`,
        html: supportTicketConfirmationEmail({
          brokerName,
          ticketNo,
          subject,
          ticketUrl: `${APP_URL}/dashboard/support/${ticket.id}`,
        }),
      })
      .catch(() => undefined);
  }

  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
  const adminIds = (admins ?? []).map((a) => a.id);
  if (adminIds.length > 0) {
    const { data: adminUsers } = await supabase.from("users").select("email").in("id", adminIds);
    const adminEmails = (adminUsers ?? []).map((u) => u.email).filter(Boolean) as string[];
    if (adminEmails.length > 0) {
      resend.emails
        .send({
          from: EMAIL_FROM,
          to: adminEmails,
          subject: `New support ticket #${ticketNo}: ${subject}`,
          html: supportTicketAdminNotificationEmail({
            ticketNo,
            subject,
            brokerName,
            brokerEmail,
            categoryLabel: TICKET_CATEGORY_LABELS[category],
            priorityLabel: TICKET_PRIORITY_LABELS[priority],
            messageExcerpt: description.slice(0, 600),
            ticketUrl: `${APP_URL}/admin/support/${ticket.id}`,
          }),
        })
        .catch(() => undefined);
    }
  }

  return { ok: true, id: ticket.id, ticketNo };
}

export async function getMyTickets(): Promise<SupportTicketWithMeta[]> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("support_tickets")
    .select("*, assigned_admin:profiles!assigned_admin_id(name)")
    .eq("broker_id", userId)
    .order("last_message_at", { ascending: false });
  const tickets = (data ?? []) as (SupportTicket & { assigned_admin?: unknown })[];
  const counts = await messageCountsFor(
    supabase,
    tickets.map((t) => t.id),
    { includeInternal: false },
  );
  return tickets.map((t) => ({
    ...t,
    assigned_admin: firstOf(t.assigned_admin as { name: string | null } | null),
    message_count: counts.get(t.id) ?? 0,
  }));
}

export async function getMyTicket(id: string): Promise<SupportTicketDetail | null> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("*, assigned_admin:profiles!assigned_admin_id(name)")
    .eq("id", id)
    .eq("broker_id", userId)
    .single();
  if (!ticket) return null;
  // Brokers never see internal notes.
  const { data: messages } = await supabase
    .from("support_ticket_messages")
    .select("*")
    .eq("ticket_id", id)
    .eq("is_internal", false)
    .order("created_at", { ascending: true });
  return {
    ...(ticket as SupportTicket),
    assigned_admin: firstOf(
      (ticket as { assigned_admin?: unknown }).assigned_admin as { name: string | null } | null,
    ),
    messages: (messages ?? []) as SupportTicketMessage[],
  };
}

export async function replyToTicket(
  id: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBroker();
  const text = body?.trim();
  if (!text) return { ok: false, error: "Message can't be empty." };
  if (text.length > 5000) return { ok: false, error: "Message is too long (max 5000 characters)." };

  const supabase = createServiceRoleClient();
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, ticket_no, status, assigned_admin_id")
    .eq("id", id)
    .eq("broker_id", userId)
    .single();
  if (!ticket) return { ok: false, error: "Ticket not found." };
  if (ticket.status === "closed") {
    return { ok: false, error: "This ticket is closed. Please open a new ticket." };
  }

  const { error } = await supabase.from("support_ticket_messages").insert({
    ticket_id: id,
    sender_id: userId,
    sender_role: "broker",
    body: text,
  });
  if (error) return { ok: false, error: "Failed to send your reply." };

  // The broker replied — surface activity to the team and re-open if it was
  // waiting on them.
  const nextStatus = ticket.status === "awaiting_reply" ? "in_progress" : ticket.status;
  await supabase
    .from("support_tickets")
    .update({ last_message_at: new Date().toISOString(), status: nextStatus })
    .eq("id", id);

  if (ticket.assigned_admin_id) {
    createNotification({
      userId: ticket.assigned_admin_id,
      type: "ticket_reply",
      title: `Reply on ticket #${ticket.ticket_no}`,
      link: `/admin/support/${id}`,
    }).catch(() => {});
  } else {
    notifyAdmins({
      type: "ticket_reply",
      title: `Reply on ticket #${ticket.ticket_no}`,
      link: `/admin/support/${id}`,
    }).catch(() => {});
  }

  return { ok: true };
}

// ────────────────────────────────────────────────────────────────
// Admin actions
// ────────────────────────────────────────────────────────────────

export type ListAdminTicketsParams = {
  page?: number;
  pageSize?: number;
  q?: string | null;
  status?: string | null;
  priority?: string | null;
};

export async function listAdminTickets(
  params: ListAdminTicketsParams = {},
): Promise<Paginated<SupportTicketWithMeta>> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { page, pageSize, offset } = normalizePagination(params);

  let query = supabase
    .from("support_tickets")
    .select(
      "*, broker:profiles!broker_id(name, photo_url), assigned_admin:profiles!assigned_admin_id(name)",
      { count: "exact" },
    );

  if (params.status?.trim() && params.status !== "all") {
    query = query.eq("status", params.status.trim());
  }
  if (params.priority?.trim() && params.priority !== "all") {
    query = query.eq("priority", params.priority.trim());
  }
  if (params.q?.trim()) {
    const k = params.q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.ilike("subject", `%${k}%`);
  }
  query = query.order("last_message_at", { ascending: false });

  const { data, count, error } = await query.range(offset, offset + pageSize - 1);
  if (error) return buildPaginated<SupportTicketWithMeta>([], 0, page, pageSize);

  const tickets = (data ?? []) as (SupportTicket & {
    broker?: unknown;
    assigned_admin?: unknown;
  })[];
  const counts = await messageCountsFor(
    supabase,
    tickets.map((t) => t.id),
    { includeInternal: true },
  );
  const rows: SupportTicketWithMeta[] = tickets.map((t) => ({
    ...t,
    broker: firstOf(t.broker as { name: string | null; photo_url: string | null } | null),
    assigned_admin: firstOf(t.assigned_admin as { name: string | null } | null),
    message_count: counts.get(t.id) ?? 0,
  }));
  return buildPaginated(rows, count ?? 0, page, pageSize);
}

export async function getAdminTicket(id: string): Promise<SupportTicketDetail | null> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("*, broker:profiles!broker_id(name, photo_url), assigned_admin:profiles!assigned_admin_id(name)")
    .eq("id", id)
    .single();
  if (!ticket) return null;
  const { data: messages } = await supabase
    .from("support_ticket_messages")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const broker = firstOf(
    (ticket as { broker?: unknown }).broker as { name: string | null; photo_url: string | null } | null,
  );
  const brokerEmail = await getEmailForProfile(supabase, (ticket as SupportTicket).broker_id);

  return {
    ...(ticket as SupportTicket),
    broker: broker ? { ...broker, email: brokerEmail } : null,
    assigned_admin: firstOf(
      (ticket as { assigned_admin?: unknown }).assigned_admin as { name: string | null } | null,
    ),
    messages: (messages ?? []) as SupportTicketMessage[],
  };
}

export async function replyToTicketAsAdmin(
  id: string,
  body: string,
  isInternal: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireAdmin();
  const text = body?.trim();
  if (!text) return { ok: false, error: "Message can't be empty." };
  if (text.length > 5000) return { ok: false, error: "Message is too long (max 5000 characters)." };

  const supabase = createServiceRoleClient();
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, ticket_no, broker_id, status")
    .eq("id", id)
    .single();
  if (!ticket) return { ok: false, error: "Ticket not found." };

  const { error } = await supabase.from("support_ticket_messages").insert({
    ticket_id: id,
    sender_id: userId,
    sender_role: "admin",
    body: text,
    is_internal: isInternal,
  });
  if (error) return { ok: false, error: "Failed to send the reply." };

  await supabase
    .from("support_tickets")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", id);

  // Internal notes stay invisible to the broker — no notification.
  if (!isInternal) {
    createNotification({
      userId: ticket.broker_id,
      type: "ticket_reply",
      title: `Support replied to ticket #${ticket.ticket_no}`,
      link: `/dashboard/support/${id}`,
    }).catch(() => {});
  }

  return { ok: true };
}

export async function updateTicketStatus(
  id: string,
  status: SupportTicketStatus,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, ticket_no, broker_id, status")
    .eq("id", id)
    .single();
  if (!ticket) return { ok: false, error: "Ticket not found." };

  const current = ticket.status as SupportTicketStatus;
  if (current !== status && !TICKET_STATUS_TRANSITIONS[current]?.includes(status)) {
    return { ok: false, error: `Cannot change status from ${current} to ${status}.` };
  }

  const { error } = await supabase
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "Failed to update status." };

  if (current !== status) {
    createNotification({
      userId: ticket.broker_id,
      type: "ticket_status_changed",
      title: `Ticket #${ticket.ticket_no} is now "${TICKET_STATUS_LABELS[status]}"`,
      link: `/dashboard/support/${id}`,
    }).catch(() => {});
  }

  return { ok: true };
}

export async function assignTicket(
  id: string,
  adminId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireAdmin();
  const supabase = createServiceRoleClient();

  if (adminId) {
    const { data: admin } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", adminId)
      .eq("role", "admin")
      .single();
    if (!admin) return { ok: false, error: "That user isn't an admin." };
  }

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, ticket_no")
    .eq("id", id)
    .single();
  if (!ticket) return { ok: false, error: "Ticket not found." };

  const { error } = await supabase
    .from("support_tickets")
    .update({ assigned_admin_id: adminId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "Failed to assign the ticket." };

  // Let the assignee know — unless they assigned it to themselves.
  if (adminId && adminId !== userId) {
    createNotification({
      userId: adminId,
      type: "ticket_assigned",
      title: `Ticket #${ticket.ticket_no} was assigned to you`,
      link: `/admin/support/${id}`,
    }).catch(() => {});
  }

  return { ok: true };
}

/** Admins available for the assignment picker. */
export async function listAdmins(): Promise<{ id: string; name: string | null }[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "admin")
    .order("name", { ascending: true });
  return (data ?? []) as { id: string; name: string | null }[];
}
