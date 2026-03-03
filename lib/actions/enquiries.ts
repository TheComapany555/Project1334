"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import type { Enquiry, EnquiryWithListing, EnquiryWithListingAndBroker } from "@/lib/types/enquiries";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";

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
      html: `
        <p>You received a new enquiry for your listing <strong>${listing.title}</strong>.</p>
        <p><strong>Reason:</strong> ${reasonLabel}</p>
        <p><strong>From:</strong> ${contactName || contactEmail}</p>
        <p><strong>Email:</strong> ${contactEmail}</p>
        ${contactPhone ? `<p><strong>Phone:</strong> ${contactPhone}</p>` : ""}
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
        <p><a href="${listingUrl}">View listing</a> | <a href="${dashboardUrl}">View in dashboard</a></p>
      `,
    }).catch(() => {});
  }

  return { ok: true };
}

async function requireBroker() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id };
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

/** Broker: list enquiries for current user. */
export async function getEnquiriesByBroker(): Promise<EnquiryWithListing[]> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("enquiries")
    .select(`
      *,
      listing:listings(id, title, slug)
    `)
    .eq("broker_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  const rows = (data ?? []) as (Enquiry & { listing?: { id: string; title: string; slug: string }[] })[];
  return rows.map((r) => ({
    ...r,
    listing: Array.isArray(r.listing) ? r.listing[0] ?? null : r.listing ?? null,
  }));
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
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 20));
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
