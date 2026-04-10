"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import type { Enquiry, EnquiryWithListing, EnquiryWithListingAndBroker } from "@/lib/types/enquiries";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";
import { enquiryNotificationEmail, enquiryConfirmationEmail } from "@/lib/email-templates";
import { createNotification } from "@/lib/actions/notifications";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export type SubmitEnquiryResult = { ok: true } | { ok: false; error: string };

/** Public: submit enquiry from listing page. Sends email to broker. */
export async function submitEnquiry(
  listingId: string,
  formData: FormData
): Promise<SubmitEnquiryResult> {
  const message = (formData.get("message") as string)?.trim();
  const contactEmail = (formData.get("contact_email") as string)?.trim().toLowerCase();
  const contactName = (formData.get("contact_name") as string)?.trim() || null;
  const contactPhone = (formData.get("contact_phone") as string)?.trim() || null;
  const reason = (formData.get("reason") as string)?.trim() || null;

  if (!message || message.length < 10) {
    return { ok: false, error: "Please enter a message (at least 10 characters)." };
  }
  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const supabase = createServiceRoleClient();
  const { data: listing, error: listError } = await supabase
    .from("listings")
    .select("id, broker_id, title, slug")
    .eq("id", listingId)
    .eq("status", "published")
    .single();
  if (listError || !listing) {
    return { ok: false, error: "Listing not found or not available." };
  }

  const { data: enquiryRow, error: insertError } = await supabase
    .from("enquiries")
    .insert({
      listing_id: listing.id,
      broker_id: listing.broker_id,
      reason: reason || null,
      message,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
    })
    .select("id, created_at")
    .single();
  if (insertError) return { ok: false, error: "Failed to send enquiry. Please try again." };

  const { data: brokerUser } = await supabase
    .from("users")
    .select("email")
    .eq("id", listing.broker_id)
    .single();
  const brokerEmail = brokerUser?.email;
  if (brokerEmail) {
    const reasonLabel = reason && ENQUIRY_REASON_LABELS[reason] ? ENQUIRY_REASON_LABELS[reason] : reason || "—";
    const listingUrl = `${APP_URL}/listing/${listing.slug}`;
    const dashboardUrl = `${APP_URL}/dashboard/enquiries`;
    await resend.emails.send({
      from: EMAIL_FROM,
      to: brokerEmail,
      subject: `New enquiry: ${listing.title}`,
      html: enquiryNotificationEmail({
        listingTitle: listing.title,
        reasonLabel,
        contactName,
        contactEmail,
        contactPhone,
        message,
        listingUrl,
        dashboardUrl,
      }),
    }).catch(() => {});
  }

  // Confirmation email to the enquirer
  {
    const listingUrl = `${APP_URL}/listing/${listing.slug}`;
    const { data: brokerProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", listing.broker_id)
      .single();

    await resend.emails.send({
      from: EMAIL_FROM,
      to: contactEmail,
      subject: `Your enquiry on "${listing.title}" — Salebiz`,
      html: enquiryConfirmationEmail({
        contactName,
        listingTitle: listing.title,
        listingUrl,
        brokerName: brokerProfile?.name ?? null,
      }),
    }).catch(() => {});
  }

  // In-app notification for the broker
  await createNotification({
    userId: listing.broker_id,
    type: "enquiry_received",
    title: `New enquiry on "${listing.title}"`,
    message: contactName ? `From ${contactName}` : `From ${contactEmail}`,
    link: "/dashboard/enquiries",
  }).catch(() => {});

  return { ok: true };
}

async function requireBroker() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return {
    userId: session.user.id,
    agencyId: session.user.agencyId ?? null,
    agencyRole: session.user.agencyRole ?? null,
  };
}

async function requireAdmin() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
}

/** Broker: list enquiries. Agency owners see all agency enquiries. */
export async function getEnquiriesByBroker(): Promise<EnquiryWithListing[]> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("enquiries")
    .select(`
      *,
      listing:listings(id, title, slug, category:categories(id, name))
    `);

  if (agencyId && agencyRole === "owner") {
    // Agency owners see enquiries for all brokers in the agency
    const { data: agencyProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("agency_id", agencyId);
    const brokerIds = (agencyProfiles ?? []).map((p) => p.id);
    if (brokerIds.length > 0) {
      query = query.in("broker_id", brokerIds);
    } else {
      query = query.eq("broker_id", userId);
    }
  } else {
    query = query.eq("broker_id", userId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as (Enquiry & { listing?: any[] | any })[];
  return rows.map((r) => {
    const listing = Array.isArray(r.listing) ? r.listing[0] ?? null : r.listing ?? null;
    return {
      ...r,
      listing: listing ? {
        ...listing,
        category: Array.isArray(listing.category) ? listing.category[0] ?? null : listing.category ?? null,
      } : null,
    };
  });
}

/** Admin: list all enquiries with listing and broker info. */
export async function getAllEnquiries(options?: {
  page?: number;
  pageSize?: number;
  reason?: string | null;
  broker_id?: string | null;
}): Promise<{ enquiries: EnquiryWithListingAndBroker[]; total: number }> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("enquiries")
    .select(`
      *,
      listing:listings(id, title, slug),
      broker:profiles!broker_id(id, name, company)
    `, { count: "exact" })
    .order("created_at", { ascending: false });
  if (options?.reason?.trim()) query = query.eq("reason", options.reason.trim());
  if (options?.broker_id?.trim()) query = query.eq("broker_id", options.broker_id.trim());
  const { data: rows, error, count } = await query.range(from, to);
  if (error) return { enquiries: [], total: 0 };
  const list = (rows ?? []) as (Enquiry & {
    listing?: { id: string; title: string; slug: string }[] | { id: string; title: string; slug: string };
    broker?: { id: string; name: string | null; company: string | null }[] | { id: string; name: string | null; company: string | null };
  })[];
  const enquiries: EnquiryWithListingAndBroker[] = list.map((r) => ({
    ...r,
    listing: Array.isArray(r.listing) ? r.listing[0] ?? null : r.listing ?? null,
    broker: Array.isArray(r.broker) ? r.broker[0] ?? null : r.broker ?? null,
  }));
  return { enquiries, total: count ?? 0 };
}

/** Admin: lightweight fetch of enquiry dates + reasons for charts (no joins, no limit). */
export async function getEnquiryChartData(): Promise<{ created_at: string; reason: string | null }[]> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("enquiries")
    .select("created_at, reason")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}
