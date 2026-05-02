"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import type { Enquiry, EnquiryWithListing, EnquiryWithListingAndBroker } from "@/lib/types/enquiries";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";
import { enquiryNotificationEmail, enquiryConfirmationEmail } from "@/lib/email-templates";
import { createNotification } from "@/lib/actions/notifications";
import {
  buildPaginated,
  normalizePagination,
  type Paginated,
} from "@/lib/types/pagination";

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
  const interest = (formData.get("interest") as string)?.trim() || null;
  const consentMarketing = formData.get("consent_marketing") === "true";

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

  // If a buyer is logged in, link this enquiry to their account so it shows up in
  // their profile panel and we can drive auto-save / auto-fill behaviours.
  const session = await getServerSession(authOptions);
  const buyerId =
    session?.user?.id && session.user.role === "user" ? session.user.id : null;

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
      interest,
      consent_marketing: consentMarketing,
      user_id: buyerId,
    })
    .select("id, created_at")
    .single();
  if (insertError) return { ok: false, error: "Failed to send enquiry. Please try again." };

  // Auto-save: every enquiry sent by a logged-in buyer auto-favourites the listing.
  // Auto-fill: persist the buyer's name/phone on first submit so future forms pre-fill.
  // In-app notification: buyer sees the enquiry confirmation in their bell.
  if (buyerId) {
    await supabase
      .from("user_favorites")
      .upsert(
        { user_id: buyerId, listing_id: listing.id },
        { onConflict: "user_id,listing_id", ignoreDuplicates: true },
      )
      .then(() => undefined, () => undefined);

    if (contactName || contactPhone) {
      const profilePatch: Record<string, string | null> = {};
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("name, phone")
        .eq("id", buyerId)
        .maybeSingle();
      if (contactName && !existingProfile?.name?.trim()) {
        profilePatch.name = contactName;
      }
      if (contactPhone && !existingProfile?.phone?.trim()) {
        profilePatch.phone = contactPhone;
      }
      if (Object.keys(profilePatch).length > 0) {
        profilePatch.updated_at = new Date().toISOString();
        await supabase
          .from("profiles")
          .update(profilePatch)
          .eq("id", buyerId)
          .eq("role", "user")
          .then(() => undefined, () => undefined);
      }
    }

    await createNotification({
      userId: buyerId,
      type: "enquiry_sent",
      title: `Enquiry sent: ${listing.title}`,
      message: "We notified the broker. They'll be in touch shortly.",
      link: "/account",
    }).catch(() => {});
  }

  const { data: brokerUser } = await supabase
    .from("users")
    .select("email")
    .eq("id", listing.broker_id)
    .single();
  const brokerEmail = brokerUser?.email;
  if (brokerEmail) {
    const reasonLabel = reason && ENQUIRY_REASON_LABELS[reason] ? ENQUIRY_REASON_LABELS[reason] : reason || "Not specified";
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

export type ListBrokerEnquiriesParams = {
  page?: number;
  pageSize?: number;
  q?: string | null;
  reason?: string | null;
};

/** Paginated broker enquiries. Agency owners see all agency enquiries. */
export async function listBrokerEnquiries(
  params: ListBrokerEnquiriesParams = {},
): Promise<Paginated<EnquiryWithListing>> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();
  const { page, pageSize, offset } = normalizePagination(params);

  let query = supabase
    .from("enquiries")
    .select(
      `
      *,
      listing:listings(id, title, slug, category:categories(id, name))
    `,
      { count: "exact" },
    );

  if (agencyId && agencyRole === "owner") {
    const { data: agencyProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("agency_id", agencyId);
    const brokerIds = (agencyProfiles ?? []).map((p) => p.id);
    if (brokerIds.length > 0) query = query.in("broker_id", brokerIds);
    else query = query.eq("broker_id", userId);
  } else {
    query = query.eq("broker_id", userId);
  }

  if (params.reason?.trim() && params.reason !== "all") {
    query = query.eq("reason", params.reason.trim());
  }
  if (params.q?.trim()) {
    const k = params.q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(
      `contact_name.ilike.%${k}%,contact_email.ilike.%${k}%,message.ilike.%${k}%`,
    );
  }
  query = query.order("created_at", { ascending: false });

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);
  if (error) return buildPaginated<EnquiryWithListing>([], 0, page, pageSize);

  const rowsRaw = (data ?? []) as (Enquiry & { listing?: any[] | any })[];
  const rows: EnquiryWithListing[] = rowsRaw.map((r) => {
    const listing = Array.isArray(r.listing)
      ? r.listing[0] ?? null
      : r.listing ?? null;
    return {
      ...r,
      listing: listing
        ? {
            ...listing,
            category: Array.isArray(listing.category)
              ? listing.category[0] ?? null
              : listing.category ?? null,
          }
        : null,
    };
  });

  return buildPaginated(rows, count ?? 0, page, pageSize);
}

/** @deprecated Use `listBrokerEnquiries`. */
export async function getEnquiriesByBroker(): Promise<EnquiryWithListing[]> {
  const { rows } = await listBrokerEnquiries({ page: 1, pageSize: 100 });
  return rows;
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
