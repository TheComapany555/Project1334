"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { shareListingEmail, shareMultipleListingsEmail } from "@/lib/email-templates";
import { setContactTags } from "@/lib/actions/contact-tags";
import type { BrokerContact, ContactTag } from "@/lib/types/contacts";
import {
  buildPaginated,
  normalizePagination,
  type Paginated,
} from "@/lib/types/pagination";

export type { BrokerContact } from "@/lib/types/contacts";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@salebiz.com.au";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

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

export type ListContactsParams = {
  page?: number;
  pageSize?: number;
  q?: string | null;
  tagId?: string | null;
  consent?: "yes" | "no" | null;
};

/**
 * Paginated contacts. Tag filtering is post-fetch for the page slice;
 * if tag filtering becomes a hot path, push it into a join-aware view.
 */
export async function listBrokerContacts(
  params: ListContactsParams = {},
): Promise<Paginated<BrokerContact>> {
  const { userId, agencyId, agencyRole } = await requireBroker();
  const supabase = createServiceRoleClient();
  const { page, pageSize, offset } = normalizePagination(params);

  let query = supabase
    .from("broker_contacts")
    .select(
      `*,
       broker_contact_tag_map(
         tag_id,
         contact_tags(*)
       )`,
      { count: "exact" },
    );

  if (agencyId && agencyRole === "owner") {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("agency_id", agencyId);
    const brokerIds = (profiles ?? []).map((p) => p.id);
    if (brokerIds.length > 0) query = query.in("broker_id", brokerIds);
    else query = query.eq("broker_id", userId);
  } else {
    query = query.eq("broker_id", userId);
  }

  if (params.consent === "yes") query = query.eq("consent_marketing", true);
  else if (params.consent === "no") query = query.eq("consent_marketing", false);

  if (params.q?.trim()) {
    const k = params.q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(`name.ilike.%${k}%,email.ilike.%${k}%,phone.ilike.%${k}%`);
  }
  query = query.order("created_at", { ascending: false });

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);
  if (error) return buildPaginated<BrokerContact>([], 0, page, pageSize);

  let rows: BrokerContact[] = (data ?? []).map((row: Record<string, unknown>) => {
    const tagRows =
      (row.broker_contact_tag_map as { contact_tags: ContactTag | null }[] | null) ??
      [];
    const tags = tagRows
      .map((m) => m.contact_tags)
      .filter((t): t is ContactTag => !!t);
    const { broker_contact_tag_map: _drop, ...rest } = row;
    void _drop;
    return { ...(rest as Omit<BrokerContact, "tags">), tags };
  }) as BrokerContact[];

  if (params.tagId) {
    rows = rows.filter((c) => (c.tags ?? []).some((t) => t.id === params.tagId));
  }

  return buildPaginated(rows, count ?? 0, page, pageSize);
}

/** @deprecated Use `listBrokerContacts`. */
export async function getContacts(): Promise<BrokerContact[]> {
  const { rows } = await listBrokerContacts({ page: 1, pageSize: 200 });
  return rows;
}

/** Save an enquiry as a contact, carrying through the consent the buyer gave on the form. */
export async function saveEnquiryAsContact(enquiryId: string): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: enquiry } = await supabase
    .from("enquiries")
    .select("id, contact_name, contact_email, contact_phone, interest, consent_marketing, broker_id, created_at")
    .eq("id", enquiryId)
    .single();

  if (!enquiry) return { ok: false, error: "Enquiry not found" };
  if (enquiry.broker_id !== userId) return { ok: false, error: "Not your enquiry" };

  const consentGiven = !!enquiry.consent_marketing;

  const { error } = await supabase.from("broker_contacts").upsert(
    {
      broker_id: userId,
      name: enquiry.contact_name,
      email: enquiry.contact_email,
      phone: enquiry.contact_phone,
      interest: enquiry.interest ?? null,
      source: "enquiry",
      enquiry_id: enquiry.id,
      consent_marketing: consentGiven,
      consent_given_at: consentGiven ? enquiry.created_at : null,
      consent_source: consentGiven ? "enquiry" : null,
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
  interest?: string;
  consent_marketing?: boolean;
  tag_ids?: string[];
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  if (!form.email?.trim()) return { ok: false, error: "Email is required" };

  const consent = !!form.consent_marketing;
  const { data, error } = await supabase
    .from("broker_contacts")
    .upsert(
      {
        broker_id: userId,
        name: form.name?.trim() || null,
        email: form.email.trim().toLowerCase(),
        phone: form.phone?.trim() || null,
        company: form.company?.trim() || null,
        notes: form.notes?.trim() || null,
        interest: form.interest?.trim() || null,
        source: "manual",
        consent_marketing: consent,
        consent_given_at: consent ? new Date().toISOString() : null,
        consent_source: consent ? "manual" : null,
      },
      { onConflict: "broker_id,email" }
    )
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to add contact" };

  if (form.tag_ids && form.tag_ids.length > 0) {
    const tagResult = await setContactTags(data.id, form.tag_ids);
    if (!tagResult.ok) return { ok: false, error: tagResult.error, id: data.id };
  }

  return { ok: true, id: data.id };
}

/** Update a contact. */
export async function updateContact(
  id: string,
  form: {
    name?: string;
    phone?: string;
    company?: string;
    notes?: string;
    interest?: string;
    consent_marketing?: boolean;
    tag_ids?: string[];
  }
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  // Read current consent so we can correctly stamp consent_given_at only on transition.
  const { data: existing } = await supabase
    .from("broker_contacts")
    .select("consent_marketing, consent_given_at, consent_source")
    .eq("id", id)
    .eq("broker_id", userId)
    .single();
  if (!existing) return { ok: false, error: "Contact not found" };

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (form.name !== undefined) update.name = form.name.trim() || null;
  if (form.phone !== undefined) update.phone = form.phone.trim() || null;
  if (form.company !== undefined) update.company = form.company.trim() || null;
  if (form.notes !== undefined) update.notes = form.notes.trim() || null;
  if (form.interest !== undefined) update.interest = form.interest.trim() || null;
  if (form.consent_marketing !== undefined) {
    update.consent_marketing = form.consent_marketing;
    if (form.consent_marketing && !existing.consent_marketing) {
      update.consent_given_at = new Date().toISOString();
      update.consent_source = "manual";
    } else if (!form.consent_marketing) {
      update.consent_given_at = null;
      update.consent_source = null;
    }
  }

  const { error } = await supabase
    .from("broker_contacts")
    .update(update)
    .eq("id", id)
    .eq("broker_id", userId);

  if (error) return { ok: false, error: error.message };

  if (form.tag_ids !== undefined) {
    const tagResult = await setContactTags(id, form.tag_ids);
    if (!tagResult.ok) return { ok: false, error: tagResult.error };
  }

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

type ShareSendResult = {
  ok: boolean;
  sent: number;
  skipped: { contactId: string; email: string; reason: string }[];
  failed: { contactId: string; email: string; error: string }[];
  error?: string;
};

type ShareListingData = {
  id: string;
  title: string;
  slug: string;
  asking_price: number | null;
  price_type: string | null;
  location_text: string | null;
};

type ShareBrokerData = {
  name: string | null;
  company: string | null;
};

function formatListingPrice(listing: ShareListingData): string | null {
  if (listing.price_type === "poa") return "Price on application";
  if (listing.asking_price != null) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(Number(listing.asking_price));
  }
  return null;
}

async function fetchListingForShare(
  listingId: string,
  brokerId: string
): Promise<ShareListingData | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("listings")
    .select("id, broker_id, agency_id, title, slug, asking_price, price_type, location_text")
    .eq("id", listingId)
    .single();
  if (!data) return null;

  // Broker owns the listing OR broker is an agency owner on the same agency
  if (data.broker_id !== brokerId) {
    if (!data.agency_id) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, agency_role")
      .eq("id", brokerId)
      .single();
    if (
      !profile ||
      profile.agency_id !== data.agency_id ||
      profile.agency_role !== "owner"
    ) {
      return null;
    }
  }

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    asking_price: data.asking_price,
    price_type: data.price_type,
    location_text: data.location_text,
  };
}

/** Send a listing to a single saved contact via email. */
export async function sendListingToContact(
  contactId: string,
  listingId: string,
  customMessage?: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await sendListingToContacts(listingId, [contactId], customMessage);
  if (!result.ok) return { ok: false, error: result.error };
  if (result.failed.length > 0)
    return { ok: false, error: result.failed[0].error };
  if (result.skipped.length > 0)
    return { ok: false, error: result.skipped[0].reason };
  return { ok: true };
}

/**
 * Send a listing to multiple saved contacts in one batch.
 * Contacts without consent_marketing are skipped and returned in `skipped`.
 * Resend's batch API caps at 100 recipients per call, so we chunk.
 */
export async function sendListingToContacts(
  listingId: string,
  contactIds: string[],
  customMessage?: string
): Promise<ShareSendResult> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  if (contactIds.length === 0) {
    return { ok: false, sent: 0, skipped: [], failed: [], error: "Select at least one contact." };
  }
  if (contactIds.length > 500) {
    return { ok: false, sent: 0, skipped: [], failed: [], error: "Too many recipients. Send in batches of 500 or fewer." };
  }

  const listing = await fetchListingForShare(listingId, userId);
  if (!listing) {
    return { ok: false, sent: 0, skipped: [], failed: [], error: "Listing not found or you do not own it." };
  }

  const { data: broker } = await supabase
    .from("profiles")
    .select("name, company")
    .eq("id", userId)
    .single();
  const brokerData: ShareBrokerData = {
    name: broker?.name ?? null,
    company: broker?.company ?? null,
  };
  const brokerName = brokerData.name || brokerData.company || "A broker";

  const { data: contacts } = await supabase
    .from("broker_contacts")
    .select("id, email, name, consent_marketing")
    .in("id", contactIds)
    .eq("broker_id", userId);

  const contactMap = new Map<string, { id: string; email: string; name: string | null; consent_marketing: boolean }>();
  (contacts ?? []).forEach((c) => contactMap.set(c.id, c));

  const skipped: ShareSendResult["skipped"] = [];
  const sendable: { id: string; email: string; name: string | null }[] = [];

  for (const id of contactIds) {
    const c = contactMap.get(id);
    if (!c) {
      skipped.push({ contactId: id, email: "", reason: "Contact not found" });
      continue;
    }
    if (!c.consent_marketing) {
      skipped.push({
        contactId: id,
        email: c.email,
        reason: "No marketing consent on file",
      });
      continue;
    }
    sendable.push({ id: c.id, email: c.email, name: c.name });
  }

  const listingUrl = `${APP_URL}/listing/${listing.slug}`;
  const price = formatListingPrice(listing);
  const location = listing.location_text;
  const subject = `${brokerName} shared a listing: ${listing.title}`;

  const failed: ShareSendResult["failed"] = [];

  // Resend batch API: up to 100 emails per call.
  const BATCH_SIZE = 100;
  for (let i = 0; i < sendable.length; i += BATCH_SIZE) {
    const slice = sendable.slice(i, i + BATCH_SIZE);
    const payloads = slice.map((contact) => ({
      from: EMAIL_FROM,
      to: contact.email,
      subject,
      html: shareListingEmail({
        contactName: contact.name,
        brokerName,
        brokerCompany: brokerData.company,
        listingTitle: listing.title,
        listingUrl,
        price,
        location,
        customMessage: customMessage ?? null,
      }),
    }));

    try {
      await resend.batch.send(payloads);
    } catch {
      // Fallback to individual sends so partial failures are recorded
      for (const contact of slice) {
        try {
          await resend.emails.send({
            from: EMAIL_FROM,
            to: contact.email,
            subject,
            html: shareListingEmail({
              contactName: contact.name,
              brokerName,
              brokerCompany: brokerData.company,
              listingTitle: listing.title,
              listingUrl,
              price,
              location,
              customMessage: customMessage ?? null,
            }),
          });
        } catch (err) {
          failed.push({
            contactId: contact.id,
            email: contact.email,
            error: err instanceof Error ? err.message : "Send failed",
          });
        }
      }
    }
  }

  // Record successful sends as share-invite history rows for audit/analytics.
  const sentContacts = sendable.filter(
    (c) => !failed.some((f) => f.contactId === c.id)
  );
  if (sentContacts.length > 0) {
    const inviteRows = sentContacts.map((c) => ({
      listing_id: listing.id,
      broker_id: userId,
      recipient_name: c.name,
      recipient_email: c.email,
      token: crypto.randomUUID(),
      broker_name_snapshot: brokerData.name,
      broker_email_snapshot: null,
      custom_message: customMessage?.trim() || null,
      send_type: "contact",
    }));
    await supabase.from("listing_share_invites").insert(inviteRows);
  }

  const sent = sendable.length - failed.length;
  return {
    ok: failed.length === 0,
    sent,
    skipped,
    failed,
  };
}

// ---------------------------------------------------------------------------
// Multi-listing bulk send
// ---------------------------------------------------------------------------

export type MultiBulkSendResult = {
  ok: boolean;
  sent: number;
  listingsFound: number;
  skipped: { contactId: string; email: string; reason: string }[];
  failed: { contactId: string; email: string; error: string }[];
  error?: string;
};

/**
 * Send multiple listings in a single combined email to multiple contacts.
 *
 * Each recipient gets ONE email containing all selected listings — no inbox
 * flooding. Contacts without marketing consent are skipped.
 *
 * Rate-limiting strategy:
 *  - Resend batch API accepts up to 100 emails per call.
 *  - We wait DELAY_BETWEEN_BATCHES ms between each batch call so we stay
 *    comfortably below Resend's per-second throughput limit.
 */
export async function sendMultipleListingsToContacts(
  listingIds: string[],
  contactIds: string[],
  customMessage?: string
): Promise<MultiBulkSendResult> {
  const { userId } = await requireBroker();
  const supabase = createServiceRoleClient();

  if (listingIds.length === 0) {
    return { ok: false, sent: 0, listingsFound: 0, skipped: [], failed: [], error: "Select at least one listing." };
  }
  if (contactIds.length === 0) {
    return { ok: false, sent: 0, listingsFound: 0, skipped: [], failed: [], error: "Select at least one contact." };
  }
  if (contactIds.length > 500) {
    return { ok: false, sent: 0, listingsFound: 0, skipped: [], failed: [], error: "Too many recipients. Send in batches of 500 or fewer." };
  }

  // Fetch all requested listings (verifies ownership for each)
  const listingResults = await Promise.all(
    listingIds.map((id) => fetchListingForShare(id, userId))
  );
  const validListings = listingResults.filter((l): l is ShareListingData => l !== null);

  if (validListings.length === 0) {
    return { ok: false, sent: 0, listingsFound: 0, skipped: [], failed: [], error: "None of the selected listings were found or accessible." };
  }

  const { data: broker } = await supabase
    .from("profiles")
    .select("name, company")
    .eq("id", userId)
    .single();

  const brokerData: ShareBrokerData = {
    name: broker?.name ?? null,
    company: broker?.company ?? null,
  };
  const brokerName = brokerData.name || brokerData.company || "A broker";

  // Resolve contacts, enforce consent
  const { data: contacts } = await supabase
    .from("broker_contacts")
    .select("id, email, name, consent_marketing")
    .in("id", contactIds)
    .eq("broker_id", userId);

  const contactMap = new Map<
    string,
    { id: string; email: string; name: string | null; consent_marketing: boolean }
  >();
  (contacts ?? []).forEach((c) => contactMap.set(c.id, c));

  const skipped: MultiBulkSendResult["skipped"] = [];
  const sendable: { id: string; email: string; name: string | null }[] = [];

  for (const id of contactIds) {
    const c = contactMap.get(id);
    if (!c) {
      skipped.push({ contactId: id, email: "", reason: "Contact not found" });
      continue;
    }
    if (!c.consent_marketing) {
      skipped.push({ contactId: id, email: c.email, reason: "No marketing consent on file" });
      continue;
    }
    sendable.push({ id: c.id, email: c.email, name: c.name });
  }

  const subject =
    validListings.length === 1
      ? `${brokerName} shared a listing: ${validListings[0].title}`
      : `${brokerName} shared ${validListings.length} listings with you`;

  const listingPayloads = validListings.map((listing) => ({
    title: listing.title,
    url: `${APP_URL}/listing/${listing.slug}`,
    price: formatListingPrice(listing),
    location: listing.location_text,
  }));

  const failed: MultiBulkSendResult["failed"] = [];

  // Resend batch API: up to 100 per call.
  // A 1.2-second pause between batches keeps us well under rate limits.
  const BATCH_SIZE = 100;
  const DELAY_BETWEEN_BATCHES = 1200;

  for (let i = 0; i < sendable.length; i += BATCH_SIZE) {
    if (i > 0) {
      await new Promise<void>((r) => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }

    const slice = sendable.slice(i, i + BATCH_SIZE);
    const payloads = slice.map((contact) => ({
      from: EMAIL_FROM,
      to: contact.email,
      subject,
      html: shareMultipleListingsEmail({
        contactName: contact.name,
        brokerName,
        brokerCompany: brokerData.company,
        listings: listingPayloads,
        customMessage: customMessage ?? null,
      }),
    }));

    try {
      await resend.batch.send(payloads);
    } catch {
      // Batch failed — retry individually so we capture per-address failures
      for (const contact of slice) {
        try {
          await resend.emails.send({
            from: EMAIL_FROM,
            to: contact.email,
            subject,
            html: shareMultipleListingsEmail({
              contactName: contact.name,
              brokerName,
              brokerCompany: brokerData.company,
              listings: listingPayloads,
              customMessage: customMessage ?? null,
            }),
          });
        } catch (err) {
          failed.push({
            contactId: contact.id,
            email: contact.email,
            error: err instanceof Error ? err.message : "Send failed",
          });
        }
      }
    }
  }

  // Audit log: one share_invite row per contact × listing
  const sentContacts = sendable.filter(
    (c) => !failed.some((f) => f.contactId === c.id)
  );
  if (sentContacts.length > 0) {
    const inviteRows = sentContacts.flatMap((c) =>
      validListings.map((listing) => ({
        listing_id: listing.id,
        broker_id: userId,
        recipient_name: c.name,
        recipient_email: c.email,
        token: crypto.randomUUID(),
        broker_name_snapshot: brokerData.name,
        broker_email_snapshot: null,
        custom_message: customMessage?.trim() || null,
        send_type: "contact_bulk",
      }))
    );
    await supabase.from("listing_share_invites").insert(inviteRows);
  }

  const sent = sendable.length - failed.length;
  return {
    ok: failed.length === 0,
    sent,
    listingsFound: validListings.length,
    skipped,
    failed,
  };
}
