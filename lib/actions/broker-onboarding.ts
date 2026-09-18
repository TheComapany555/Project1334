"use server";

import { getServerSession } from "next-auth";
import { Resend } from "resend";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { notifyAdmins } from "@/lib/actions/notifications";
import { verifyRecaptcha } from "@/lib/recaptcha";
import {
  onboardingRequestConfirmationEmail,
  onboardingRequestConfirmationEmailText,
  onboardingRequestAdminNotificationEmail,
} from "@/lib/email-templates";
import {
  EMAIL_FROM_DEFAULT,
  EMAIL_REPLY_TO,
  htmlToPlainText,
} from "@/lib/email-sender";
import {
  LISTING_COUNT_LABELS,
  LISTING_COUNT_OPTIONS,
  ONBOARDING_STATUS_LABELS,
  type OnboardingRequest,
  type OnboardingRequestStatus,
} from "@/lib/types/onboarding";
import {
  buildPaginated,
  normalizePagination,
  type Paginated,
} from "@/lib/types/pagination";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const VALID_LISTING_COUNTS = LISTING_COUNT_OPTIONS.map((o) => o.value) as string[];
const VALID_STATUSES = Object.keys(
  ONBOARDING_STATUS_LABELS,
) as OnboardingRequestStatus[];

/** How long a given email must wait between submissions. */
const RESUBMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

export type SubmitOnboardingRequestResult =
  | { ok: true; requestNo: number }
  | { ok: false; error: string };

/**
 * Public, unauthenticated: a broker asks the Salebiz team to onboard them.
 *
 * Guarded by reCAPTCHA plus a per-email cooldown, because anyone on the
 * internet can call this and every accepted row emails our admins.
 */
export async function submitOnboardingRequest(form: {
  name: string;
  email: string;
  phone?: string;
  agencyName?: string;
  listingCount?: string;
  message?: string;
  captchaToken?: string | null;
}): Promise<SubmitOnboardingRequestResult> {
  const captchaOk = await verifyRecaptcha(form.captchaToken ?? null);
  if (!captchaOk) {
    return { ok: false, error: "CAPTCHA verification failed. Please try again." };
  }

  const name = form.name?.trim();
  const email = form.email?.trim().toLowerCase();
  const phone = form.phone?.trim() || null;
  const agencyName = form.agencyName?.trim() || null;
  const message = form.message?.trim() || null;

  if (!name) return { ok: false, error: "Please enter your name." };
  if (name.length > 100) {
    return { ok: false, error: "Name must be 100 characters or fewer." };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (phone && phone.length > 40) {
    return { ok: false, error: "Phone number is too long." };
  }
  if (agencyName && agencyName.length > 200) {
    return { ok: false, error: "Agency name must be 200 characters or fewer." };
  }
  if (message && message.length > 2000) {
    return { ok: false, error: "Message is too long (max 2000 characters)." };
  }
  const listingCount =
    form.listingCount && VALID_LISTING_COUNTS.includes(form.listingCount)
      ? form.listingCount
      : null;

  const supabase = createServiceRoleClient();

  // Per-email cooldown: stops a stuck submit button (or a bot) from flooding
  // admin inboxes. Reported as success so we don't leak whether the email
  // already requested onboarding.
  const { data: recent } = await supabase
    .from("broker_onboarding_requests")
    .select("request_no, created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    recent &&
    Date.now() - new Date(recent.created_at).getTime() < RESUBMIT_WINDOW_MS
  ) {
    return { ok: true, requestNo: recent.request_no as number };
  }

  // Link a signed-in broker for context; absence is normal and fine.
  const session = await getServerSession(authOptions);
  const profileId =
    session?.user?.id && session.user.role === "broker"
      ? session.user.id
      : null;

  const { data: row, error } = await supabase
    .from("broker_onboarding_requests")
    .insert({
      name,
      email,
      phone,
      agency_name: agencyName,
      listing_count: listingCount,
      message,
      profile_id: profileId,
    })
    .select("id, request_no")
    .single();

  if (error || !row) {
    return {
      ok: false,
      error: "We couldn't submit your request. Please try again.",
    };
  }

  const requestNo = row.request_no as number;
  const adminUrl = `${APP_URL}/admin/onboarding-requests`;

  // In-app notification for admins.
  notifyAdmins({
    type: "onboarding_request",
    title: `New onboarding request #${requestNo}`,
    message: agencyName ? `${name} — ${agencyName}` : name,
    link: "/admin/onboarding-requests",
  }).catch(() => {});

  // Confirmation to the requester. Replies here are from a real person about
  // their own setup, so point them somewhere a human reads.
  resend.emails
    .send({
      from: EMAIL_FROM_DEFAULT,
      replyTo: EMAIL_REPLY_TO,
      to: email,
      subject: `We've got your request — we'll set you up (#${requestNo})`,
      html: onboardingRequestConfirmationEmail({ name, requestNo }),
      text: onboardingRequestConfirmationEmailText({ name, requestNo }),
    })
    .catch(() => undefined);

  // Notification to every admin.
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  const adminIds = (admins ?? []).map((a) => a.id);
  if (adminIds.length > 0) {
    const { data: adminUsers } = await supabase
      .from("users")
      .select("email")
      .in("id", adminIds);
    const adminEmails = (adminUsers ?? [])
      .map((u) => u.email)
      .filter(Boolean) as string[];
    if (adminEmails.length > 0) {
      const adminHtml = onboardingRequestAdminNotificationEmail({
        requestNo,
        name,
        email,
        phone,
        agencyName,
        listingCountLabel: listingCount
          ? (LISTING_COUNT_LABELS[listingCount] ?? listingCount)
          : null,
        message,
        adminUrl,
      });
      resend.emails
        .send({
          from: EMAIL_FROM_DEFAULT,
          // Replying goes straight back to the broker who asked.
          replyTo: email,
          to: adminEmails,
          subject: `New onboarding request #${requestNo}: ${agencyName ?? name}`,
          html: adminHtml,
          text: htmlToPlainText(adminHtml),
        })
        .catch(() => undefined);
    }
  }

  return { ok: true, requestNo };
}

export type ListOnboardingRequestsParams = {
  page?: number;
  pageSize?: number;
  q?: string | null;
  status?: string | null;
};

/** Admin: paginated list for /admin/onboarding-requests. */
export async function listOnboardingRequests(
  params: ListOnboardingRequestsParams = {},
): Promise<Paginated<OnboardingRequest>> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { page, pageSize, offset } = normalizePagination(params);

  let q = supabase
    .from("broker_onboarding_requests")
    .select("*", { count: "exact" });

  if (params.status?.trim()) q = q.eq("status", params.status.trim());
  if (params.q?.trim()) {
    const k = params.q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
    q = q.or(`name.ilike.%${k}%,email.ilike.%${k}%,agency_name.ilike.%${k}%`);
  }

  const { data, count } = await q
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  return buildPaginated((data ?? []) as OnboardingRequest[], count ?? 0, page, pageSize);
}

/** Admin: move a request through the workflow. */
export async function setOnboardingRequestStatus(
  id: string,
  status: OnboardingRequestStatus,
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireAdmin();
  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("broker_onboarding_requests")
    .update({
      status,
      handled_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Admin: save an internal note. Never shown to the requester. */
export async function setOnboardingRequestNotes(
  id: string,
  notes: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (notes.length > 5000) {
    return { ok: false, error: "Note is too long (max 5000 characters)." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("broker_onboarding_requests")
    .update({
      admin_notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
