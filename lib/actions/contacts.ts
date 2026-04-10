"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { shareListingEmail } from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export type BrokerContact = {
  id: string;
  broker_id: string;
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
  source: string;
  enquiry_id: string | null;
  created_at: string;
  updated_at: string;
};

async function requireBroker() {
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

/** List all contacts for the broker (or agency if owner). */
export async function getContacts(): Promise<BrokerContact[]> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();

  let query = supabase.from("broker_contacts").select("*");

  if (agencyId && agencyRole === "owner") {
    // Agency owners see all agency broker contacts
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("agency_id", agencyId);
    const brokerIds = (profiles ?? []).map((p) => p.id);
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
  return (data ?? []) as BrokerContact[];
}

/** Save an enquiry as a contact. */
export async function saveEnquiryAsContact(enquiryId: string): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  // Fetch the enquiry
  const { data: enquiry } = await supabase
    .from("enquiries")
    .select("id, contact_name, contact_email, contact_phone, broker_id")
    .eq("id", enquiryId)
    .single();

  if (!enquiry) return { ok: false, error: "Enquiry not found" };
  if (enquiry.broker_id !== userId) return { ok: false, error: "Not your enquiry" };

  const { error } = await supabase.from("broker_contacts").upsert(
    {
      broker_id: userId,
      name: enquiry.contact_name,
      email: enquiry.contact_email,
      phone: enquiry.contact_phone,
      source: "enquiry",
      enquiry_id: enquiry.id,
    },
    { onConflict: "broker_id,email" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Add a contact manually. */
export async function addContact(form: {
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  if (!form.email?.trim()) return { ok: false, error: "Email is required" };

  const { error } = await supabase.from("broker_contacts").upsert(
    {
      broker_id: userId,
      name: form.name?.trim() || null,
      email: form.email.trim().toLowerCase(),
      phone: form.phone?.trim() || null,
      company: form.company?.trim() || null,
      notes: form.notes?.trim() || null,
      source: "manual",
    },
    { onConflict: "broker_id,email" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Update a contact. */
export async function updateContact(
  id: string,
  form: { name?: string; phone?: string; company?: string; notes?: string }
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("broker_contacts")
    .update({
      name: form.name?.trim() || null,
      phone: form.phone?.trim() || null,
      company: form.company?.trim() || null,
      notes: form.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("broker_id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Delete a contact. */
export async function deleteContact(id: string): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("broker_contacts")
    .delete()
    .eq("id", id)
    .eq("broker_id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Send a listing to a contact via email. */
export async function sendListingToContact(
  contactId: string,
  listingId: string
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  // Fetch contact
  const { data: contact } = await supabase
    .from("broker_contacts")
    .select("email, name")
    .eq("id", contactId)
    .eq("broker_id", userId)
    .single();
  if (!contact) return { ok: false, error: "Contact not found" };

  // Fetch listing
  const { data: listing } = await supabase
    .from("listings")
    .select("title, slug, asking_price, price_type, location_text")
    .eq("id", listingId)
    .single();
  if (!listing) return { ok: false, error: "Listing not found" };

  // Fetch broker name
  const { data: broker } = await supabase
    .from("profiles")
    .select("name, company")
    .eq("id", userId)
    .single();

  const brokerName = broker?.name || broker?.company || "A broker";
  const listingUrl = `${APP_URL}/listing/${listing.slug}`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: contact.email,
      subject: `${brokerName} shared a listing: ${listing.title}`,
      html: shareListingEmail({
        contactName: contact.name,
        brokerName,
        listingTitle: listing.title,
        listingUrl,
        price: listing.price_type === "poa"
          ? "Price on application"
          : listing.asking_price
            ? new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Number(listing.asking_price))
            : null,
        location: listing.location_text,
      }),
    });
  } catch {
    return { ok: false, error: "Failed to send email" };
  }

  return { ok: true };
}
