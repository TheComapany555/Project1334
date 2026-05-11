"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type {
  BuyerFundingStatus,
  BuyerTimeframe,
} from "@/lib/actions/buyer-account";
import type { ContactTag } from "@/lib/types/contacts";

export type BuyerActivityKind =
  // Inferred from existing system tables (already wired):
  | "view"
  | "enquiry"
  | "save"
  | "nda_signed"
  | "nda_requested"
  | "document_approved"
  | "call"
  // Sourced from M1.2 crm_activities (added when that table lands):
  | "email_sent"
  | "email_received"
  | "call_logged"
  | "note_added"
  | "follow_up_set"
  | "follow_up_completed"
  | "status_changed"
  | "listing_shared"
  // Document download tracking (M1 audit):
  | "document_viewed"
  | "document_downloaded"
  // Sourced from M1.3 messages:
  | "message_sent"
  | "message_received"
  // Sourced from M2.3 buyer_feedback:
  | "feedback_logged";

export type BuyerActivityEvent = {
  id: string;
  kind: BuyerActivityKind;
  at: string;
  listing_id: string;
  /** Optional contextual metadata (enquiry message, document name, etc). */
  detail?: string | null;
};

export type BuyerListingSummary = {
  listing_id: string;
  title: string;
  slug: string;
  status: string;
  views: number;
  /** Distinct *days* the buyer viewed this listing minus 1 (i.e. returns after the first visit). */
  return_visits: number;
  enquiries: number;
  calls: number;
  saved: boolean;
  nda_signed: boolean;
  nda_requested: boolean;
  documents_viewed: number;
  documents_downloaded: number;
  last_activity_at: string | null;
};

export type BuyerEnquirySummary = {
  id: string;
  listing_id: string;
  listing_title: string;
  reason: string | null;
  message: string;
  contact_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  created_at: string;
};

export type BuyerProfileMetrics = {
  listings_touched: number;
  total_views: number;
  /** Total distinct view-days minus listings_touched (returns across all listings). */
  total_return_visits: number;
  total_enquiries: number;
  total_calls: number;
  saves: number;
  nda_signed: number;
  nda_requested: number;
  documents_viewed: number;
  documents_downloaded: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
};

export type BuyerCrmStatus =
  | "new_lead"
  | "contacted"
  | "interested"
  | "meeting_scheduled"
  | "nda_signed"
  | "documents_shared"
  | "negotiating"
  | "closed";

export type BuyerPreferencesSnapshot = {
  budget_min: number | null;
  budget_max: number | null;
  preferred_industries: string[];
  preferred_locations: string[];
  funding_status: BuyerFundingStatus | null;
  timeframe: BuyerTimeframe | null;
  location_text: string | null;
};

export type BuyerCrmRecord = {
  contact_id: string | null;
  status: BuyerCrmStatus | null;
  notes: string | null;
  interest: string | null;
  tags: ContactTag[];
  next_follow_up_at: string | null;
  last_emailed_at: string | null;
  last_called_at: string | null;
  last_contacted_at: string | null;
  first_interaction_at: string | null;
  consent_marketing: boolean;
};

export type BuyerProfile = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  photo_url: string | null;
  role: string;
  created_at: string | null;
  last_active_at: string | null;
  /** Buyer-side preferences captured from /account or enquiry forms. */
  preferences: BuyerPreferencesSnapshot;
  /** Whether the buyer is already in this broker's CRM (broker_contacts). */
  in_contacts: boolean;
  /** @deprecated Use `crm.contact_id` — kept for older callers. */
  contact_id: string | null;
  /** CRM-state snapshot scoped to *this* broker's relationship with the buyer. */
  crm: BuyerCrmRecord;
  /** Listing this profile is being viewed in the context of (optional). */
  scope_listing: { id: string; title: string; slug: string } | null;
  metrics: BuyerProfileMetrics;
  listings: BuyerListingSummary[];
  enquiries: BuyerEnquirySummary[];
  activity: BuyerActivityEvent[];
};

async function requireBroker() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  return {
    id: session.user.id,
    agencyId: session.user.agencyId ?? null,
    agencyRole: session.user.agencyRole ?? null,
  };
}

/**
 * Resolve the listing IDs the broker may inspect activity against.
 * Solo brokers see their own listings; agency owners see all agency listings.
 */
async function getBrokerListingIds(
  broker: { id: string; agencyId: string | null; agencyRole: string | null },
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<{ ids: string[]; meta: Map<string, { title: string; slug: string; status: string }> }> {
  let q = supabase.from("listings").select("id, title, slug, status");
  if (broker.agencyId && broker.agencyRole === "owner") {
    q = q.eq("agency_id", broker.agencyId);
  } else {
    q = q.eq("broker_id", broker.id);
  }
  const { data } = await q;
  const rows = data ?? [];
  const meta = new Map<string, { title: string; slug: string; status: string }>();
  for (const r of rows) meta.set(r.id, { title: r.title, slug: r.slug, status: r.status });
  return { ids: rows.map((r) => r.id), meta };
}

export async function getBuyerProfile(
  buyerId: string,
  options?: { listingId?: string | null },
): Promise<BuyerProfile> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  // 1) Resolve broker's listing universe
  const { ids: brokerListingIds, meta: listingMeta } = await getBrokerListingIds(
    broker,
    supabase,
  );
  if (brokerListingIds.length === 0) {
    throw new Error("Forbidden");
  }

  // Optional listing scope
  let scope_listing: BuyerProfile["scope_listing"] = null;
  if (options?.listingId) {
    const m = listingMeta.get(options.listingId);
    if (!m) throw new Error("Forbidden");
    scope_listing = { id: options.listingId, title: m.title, slug: m.slug };
  }

  // 2) Fetch the buyer profile + user record (for email + created_at)
  const [profileRes, userRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, name, phone, photo_url, created_at, last_active_at, budget_min, budget_max, preferred_industries, preferred_locations, funding_status, timeframe, location_text")
      .eq("id", buyerId)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id, email, created_at")
      .eq("id", buyerId)
      .maybeSingle(),
  ]);

  if (!userRes.data) throw new Error("Buyer not found");
  const profile = profileRes.data;
  const user = userRes.data;

  // 3) Fetch all interactions across the broker's listings (and scoped if applicable)
  const targetListingIds = scope_listing ? [scope_listing.id] : brokerListingIds;

  const [
    viewsRes,
    enquiriesRes,
    savesRes,
    ndaSigsRes,
    docAccessRes,
    callsRes,
    docEventsRes,
  ] = await Promise.all([
    supabase
      .from("listing_views")
      .select("id, listing_id, viewed_at, duration_seconds")
      .eq("user_id", buyerId)
      .in("listing_id", targetListingIds),

    supabase
      .from("enquiries")
      .select("id, listing_id, reason, message, contact_name, contact_email, contact_phone, created_at")
      .eq("user_id", buyerId)
      .in("listing_id", targetListingIds),

    supabase
      .from("user_favorites")
      .select("listing_id, created_at")
      .eq("user_id", buyerId)
      .in("listing_id", targetListingIds),

    supabase
      .from("nda_signatures")
      .select("listing_id, signer_name, signer_email, signed_at")
      .eq("user_id", buyerId)
      .in("listing_id", targetListingIds),

    supabase
      .from("document_access_requests")
      .select("id, listing_id, document_id, status, requested_at, reviewed_at")
      .eq("user_id", buyerId)
      .in("listing_id", targetListingIds),

    supabase
      .from("call_clicks")
      .select("id, listing_id, clicked_at")
      .eq("user_id", buyerId)
      .in("listing_id", targetListingIds),

    supabase
      .from("document_events")
      .select("id, listing_id, document_id, event_kind, occurred_at")
      .eq("user_id", buyerId)
      .in("listing_id", targetListingIds),
  ]);

  const views = viewsRes.data ?? [];
  const enquiries = enquiriesRes.data ?? [];
  const saves = savesRes.data ?? [];
  const ndaSigs = ndaSigsRes.data ?? [];
  const docAccess = docAccessRes.data ?? [];
  const calls = callsRes.data ?? [];
  const docEvents = docEventsRes.data ?? [];

  // Authorisation: the buyer must have at least one interaction with this broker's listings
  let hasInteraction =
    views.length +
      enquiries.length +
      saves.length +
      ndaSigs.length +
      docAccess.length +
      calls.length >
    0;
  if (!hasInteraction) {
    // M1.2: A broker that's already added the buyer to their CRM (or logged
    // any activity) has a valid relationship even without buyer-initiated
    // events. This unblocks panels for manually-added contacts that have
    // since been linked to a buyer account.
    const [{ count: crmCount }, { count: contactCount }] = await Promise.all([
      supabase
        .from("crm_activities")
        .select("id", { count: "exact", head: true })
        .eq("broker_id", broker.id)
        .eq("buyer_user_id", buyerId),
      supabase
        .from("broker_contacts")
        .select("id", { count: "exact", head: true })
        .eq("broker_id", broker.id)
        .eq("buyer_user_id", buyerId),
    ]);
    hasInteraction = (crmCount ?? 0) + (contactCount ?? 0) > 0;
  }
  if (!hasInteraction) throw new Error("Forbidden");

  // Resolve document names for any document_access entries (best-effort)
  let docNameById = new Map<string, string>();
  const docIds = Array.from(new Set(docAccess.map((d) => d.document_id))).filter(Boolean);
  if (docIds.length) {
    const { data: docRows } = await supabase
      .from("listing_documents")
      .select("id, name")
      .in("id", docIds);
    docNameById = new Map((docRows ?? []).map((d) => [d.id, d.name] as const));
  }

  // 4) Build per-listing summary
  const listingsTouched = new Set<string>();
  const listingAgg = new Map<
    string,
    BuyerListingSummary
  >();

  function ensureListing(listingId: string): BuyerListingSummary | null {
    const meta = listingMeta.get(listingId);
    if (!meta) return null;
    let row = listingAgg.get(listingId);
    if (!row) {
      row = {
        listing_id: listingId,
        title: meta.title,
        slug: meta.slug,
        status: meta.status,
        views: 0,
        return_visits: 0,
        enquiries: 0,
        calls: 0,
        saved: false,
        nda_signed: false,
        nda_requested: false,
        documents_viewed: 0,
        documents_downloaded: 0,
        last_activity_at: null,
      };
      listingAgg.set(listingId, row);
    }
    listingsTouched.add(listingId);
    return row;
  }

  // Return visits = distinct calendar days a buyer viewed each listing minus 1
  // (the "first visit"). E.g. viewed today + 2 days ago + 5 days ago = 2 returns.
  const viewDaysPerListing = new Map<string, Set<string>>();
  for (const v of views) {
    if (!v.viewed_at) continue;
    const day = v.viewed_at.slice(0, 10); // YYYY-MM-DD
    if (!viewDaysPerListing.has(v.listing_id)) {
      viewDaysPerListing.set(v.listing_id, new Set());
    }
    viewDaysPerListing.get(v.listing_id)!.add(day);
  }

  function bumpLast(row: BuyerListingSummary, at: string | null) {
    if (!at) return;
    if (!row.last_activity_at || at > row.last_activity_at) {
      row.last_activity_at = at;
    }
  }

  for (const v of views) {
    const row = ensureListing(v.listing_id);
    if (!row) continue;
    row.views++;
    bumpLast(row, v.viewed_at);
  }
  for (const e of enquiries) {
    const row = ensureListing(e.listing_id);
    if (!row) continue;
    row.enquiries++;
    bumpLast(row, e.created_at);
  }
  for (const s of saves) {
    const row = ensureListing(s.listing_id);
    if (!row) continue;
    row.saved = true;
    bumpLast(row, s.created_at);
  }
  for (const n of ndaSigs) {
    const row = ensureListing(n.listing_id);
    if (!row) continue;
    row.nda_signed = true;
    row.nda_requested = true;
    bumpLast(row, n.signed_at);
  }
  for (const d of docAccess) {
    const row = ensureListing(d.listing_id);
    if (!row) continue;
    row.nda_requested = true;
    bumpLast(row, d.requested_at);
  }
  // Real document view/download events (M1 audit fix).
  for (const e of docEvents) {
    const row = ensureListing(e.listing_id);
    if (!row) continue;
    if (e.event_kind === "view") row.documents_viewed++;
    else if (e.event_kind === "download") row.documents_downloaded++;
    bumpLast(row, e.occurred_at);
  }
  for (const c of calls) {
    const row = ensureListing(c.listing_id);
    if (!row) continue;
    row.calls++;
    bumpLast(row, c.clicked_at);
  }

  // Populate return_visits per listing from the day-set computed above.
  for (const row of listingAgg.values()) {
    const days = viewDaysPerListing.get(row.listing_id);
    row.return_visits = days ? Math.max(0, days.size - 1) : 0;
  }

  const listings = Array.from(listingAgg.values()).sort((a, b) => {
    const ta = a.last_activity_at ?? "";
    const tb = b.last_activity_at ?? "";
    return tb.localeCompare(ta);
  });

  // 5) Build activity timeline (chronological, newest first)
  const activity: BuyerActivityEvent[] = [];
  for (const v of views) {
    activity.push({
      id: `view-${v.id}`,
      kind: "view",
      at: v.viewed_at,
      listing_id: v.listing_id,
      detail: v.duration_seconds ? `${v.duration_seconds}s on page` : null,
    });
  }
  for (const e of enquiries) {
    activity.push({
      id: `enq-${e.id}`,
      kind: "enquiry",
      at: e.created_at,
      listing_id: e.listing_id,
      detail: e.reason ?? null,
    });
  }
  for (const s of saves) {
    activity.push({
      id: `save-${s.listing_id}-${s.created_at}`,
      kind: "save",
      at: s.created_at,
      listing_id: s.listing_id,
    });
  }
  for (const n of ndaSigs) {
    activity.push({
      id: `nda-${n.listing_id}-${n.signed_at}`,
      kind: "nda_signed",
      at: n.signed_at,
      listing_id: n.listing_id,
    });
  }
  for (const d of docAccess) {
    activity.push({
      id: `doc-${d.id}`,
      kind: d.status === "approved" ? "document_approved" : "nda_requested",
      at: d.reviewed_at ?? d.requested_at,
      listing_id: d.listing_id,
      detail: docNameById.get(d.document_id) ?? null,
    });
  }
  for (const c of calls) {
    activity.push({
      id: `call-${c.id}`,
      kind: "call",
      at: c.clicked_at,
      listing_id: c.listing_id,
    });
  }
  // Real document view/download events (M1 audit fix). Need to re-fetch
  // doc names that aren't already in docNameById (i.e. docs the buyer
  // viewed but didn't go through the approval flow).
  if (docEvents.length > 0) {
    const missingIds = Array.from(
      new Set(
        docEvents
          .map((e) => e.document_id)
          .filter((id): id is string => !!id && !docNameById.has(id)),
      ),
    );
    if (missingIds.length > 0) {
      const { data: extraDocs } = await supabase
        .from("listing_documents")
        .select("id, name")
        .in("id", missingIds);
      for (const d of extraDocs ?? []) docNameById.set(d.id, d.name);
    }
  }
  for (const e of docEvents) {
    activity.push({
      id: `docevt-${e.id}`,
      kind: e.event_kind === "download" ? "document_downloaded" : "document_viewed",
      at: e.occurred_at,
      listing_id: e.listing_id,
      detail: docNameById.get(e.document_id) ?? null,
    });
  }

  // M1.2: merge in crm_activities for this broker + buyer (notes, calls
  // logged via the dialog, emails sent through the composer or BCC pipeline,
  // status changes, follow-ups set/completed, listing shares, feedback).
  // Scoped to listings in `targetListingIds` if listing_id is set; broker
  // scope is enforced by `requireBroker` + the broker.id filter below.
  const { data: crmRows } = await supabase
    .from("crm_activities")
    .select("id, kind, subject, body, listing_id, occurred_at")
    .eq("broker_id", broker.id)
    .eq("buyer_user_id", buyerId)
    .order("occurred_at", { ascending: false })
    .limit(200);
  for (const row of crmRows ?? []) {
    // If the activity is listing-scoped, drop ones outside this broker's
    // listing universe (defence-in-depth — broker filter already covers it).
    if (row.listing_id && !brokerListingIds.includes(row.listing_id)) continue;
    activity.push({
      id: `crm-${row.id}`,
      kind: row.kind as BuyerActivityKind,
      at: row.occurred_at,
      listing_id: row.listing_id ?? "",
      detail: row.subject ?? row.body?.slice(0, 140) ?? null,
    });
  }

  activity.sort((a, b) => b.at.localeCompare(a.at));

  // 6) Build aggregates
  const dates = activity.map((a) => a.at).filter(Boolean);
  const first_seen_at = dates.length ? dates[dates.length - 1] : null;
  const last_seen_at = dates.length ? dates[0] : null;

  // 7) Enquiry summaries with listing titles
  const enquiriesSummary: BuyerEnquirySummary[] = enquiries
    .map((e) => {
      const meta = listingMeta.get(e.listing_id);
      return {
        id: e.id,
        listing_id: e.listing_id,
        listing_title: meta?.title ?? "(unknown listing)",
        reason: e.reason,
        message: e.message,
        contact_name: e.contact_name,
        contact_email: e.contact_email,
        contact_phone: e.contact_phone,
        created_at: e.created_at,
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  // 8) Pull preferred contact info (NDA signer overrides profile when broker only knows them via NDA)
  const preferredEmail =
    user.email ?? ndaSigs[0]?.signer_email ?? enquiries[0]?.contact_email ?? "";
  const preferredName =
    profile?.name ?? ndaSigs[0]?.signer_name ?? enquiries[0]?.contact_name ?? null;
  const preferredPhone =
    profile?.phone ?? enquiries[0]?.contact_phone ?? null;

  return await buildBuyerProfileResponse({
    broker,
    supabase,
    user,
    profile,
    buyerId,
    scope_listing,
    listingsTouched,
    listings,
    enquiriesSummary,
    activity,
    views,
    enquiries,
    saves,
    ndaSigs,
    docAccess,
    calls,
    docEvents,
    first_seen_at,
    last_seen_at,
    preferredEmail,
    preferredName,
    preferredPhone,
  });
}

/**
 * Open the slide-out panel from a CRM `broker_contacts` row.
 *
 * Behaviour:
 *  - If the contact has `buyer_user_id`, returns the full BuyerProfile via
 *    `getBuyerProfile` (rich activity, metrics, listings).
 *  - Otherwise returns a "lite" BuyerProfile sourced from the contact row
 *    alone (no cross-listing activity to show — the contact is just a
 *    name + email a broker added manually).
 *
 * Both branches return the same shape so the slide-out can render uniformly.
 */
export async function getBuyerPanelByContactId(
  contactId: string,
): Promise<BuyerProfile> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  const { data: contact } = await supabase
    .from("broker_contacts")
    .select("id, broker_id, buyer_user_id, name, email, phone, interest, notes, status, next_follow_up_at, last_emailed_at, last_called_at, last_contacted_at, first_interaction_at, consent_marketing, source, created_at")
    .eq("id", contactId)
    .maybeSingle();

  if (!contact) throw new Error("Contact not found");

  // Broker-isolation: solo broker owns the row directly, agency owners see
  // anything in their agency.
  if (contact.broker_id !== broker.id) {
    if (broker.agencyId && broker.agencyRole === "owner") {
      const { data: ownerCheck } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", contact.broker_id)
        .maybeSingle();
      if (!ownerCheck || ownerCheck.agency_id !== broker.agencyId) {
        throw new Error("Forbidden");
      }
    } else {
      throw new Error("Forbidden");
    }
  }

  // If we know the buyer's user id, delegate to the full builder.
  if (contact.buyer_user_id) {
    return await getBuyerProfile(contact.buyer_user_id);
  }

  // Otherwise: lite payload from the contact row only.
  const [{ data: tagRows }, { data: liteCrmActivity }] = await Promise.all([
    supabase
      .from("broker_contact_tag_map")
      .select("contact_tags(*)")
      .eq("contact_id", contact.id),
    supabase
      .from("crm_activities")
      .select("id, kind, subject, body, listing_id, occurred_at")
      .eq("contact_id", contact.id)
      .order("occurred_at", { ascending: false })
      .limit(50),
  ]);
  const tags = ((tagRows ?? []) as unknown as { contact_tags: ContactTag | null }[])
    .map((m) => m.contact_tags)
    .filter((t): t is ContactTag => !!t);

  const liteActivity: BuyerActivityEvent[] = (liteCrmActivity ?? []).map(
    (row) => ({
      id: `crm-${row.id}`,
      kind: row.kind as BuyerActivityKind,
      at: row.occurred_at,
      listing_id: row.listing_id ?? "",
      detail: row.subject ?? row.body?.slice(0, 140) ?? null,
    }),
  );

  return {
    id: contact.id, // synthetic — there's no users.id for this contact
    name: contact.name ?? null,
    email: contact.email,
    phone: contact.phone ?? null,
    photo_url: null,
    role: "user",
    created_at: contact.created_at,
    last_active_at: null,
    preferences: {
      budget_min: null,
      budget_max: null,
      preferred_industries: [],
      preferred_locations: [],
      funding_status: null,
      timeframe: null,
      location_text: null,
    },
    in_contacts: true,
    contact_id: contact.id,
    crm: {
      contact_id: contact.id,
      status: (contact.status as BuyerCrmStatus | null) ?? null,
      notes: contact.notes ?? null,
      interest: contact.interest ?? null,
      tags,
      next_follow_up_at: contact.next_follow_up_at ?? null,
      last_emailed_at: contact.last_emailed_at ?? null,
      last_called_at: contact.last_called_at ?? null,
      last_contacted_at: contact.last_contacted_at ?? null,
      first_interaction_at: contact.first_interaction_at ?? null,
      consent_marketing: !!contact.consent_marketing,
    },
    scope_listing: null,
    metrics: {
      listings_touched: 0,
      total_views: 0,
      total_return_visits: 0,
      total_enquiries: 0,
      total_calls: 0,
      saves: 0,
      nda_signed: 0,
      nda_requested: 0,
      documents_viewed: 0,
      documents_downloaded: 0,
      first_seen_at: contact.first_interaction_at ?? null,
      last_seen_at: contact.last_contacted_at ?? null,
    },
    listings: [],
    enquiries: [],
    activity: liteActivity,
  };
}

// ── Internal: shared builder for the rich (user-known) BuyerProfile ──
// Extracted so getBuyerProfile and getBuyerPanelByContactId can both use it.

type BuildArgs = {
  broker: { id: string; agencyId: string | null; agencyRole: string | null };
  supabase: ReturnType<typeof createServiceRoleClient>;
  user: { id: string; email: string; created_at: string | null };
  profile: {
    role: string | null;
    name: string | null;
    phone: string | null;
    photo_url: string | null;
    created_at: string | null;
    last_active_at: string | null;
    budget_min: number | null;
    budget_max: number | null;
    preferred_industries: string[] | null;
    preferred_locations: string[] | null;
    funding_status: string | null;
    timeframe: string | null;
    location_text: string | null;
  } | null;
  buyerId: string;
  scope_listing: BuyerProfile["scope_listing"];
  listingsTouched: Set<string>;
  listings: BuyerListingSummary[];
  enquiriesSummary: BuyerEnquirySummary[];
  activity: BuyerActivityEvent[];
  views: { id: string }[];
  enquiries: { id: string; listing_id: string }[];
  saves: { listing_id: string }[];
  ndaSigs: { listing_id: string }[];
  docAccess: { id: string; listing_id: string; status: string }[];
  calls: { id: string }[];
  docEvents: { id: string; listing_id: string; event_kind: string }[];
  first_seen_at: string | null;
  last_seen_at: string | null;
  preferredEmail: string;
  preferredName: string | null;
  preferredPhone: string | null;
};

async function buildBuyerProfileResponse(a: BuildArgs): Promise<BuyerProfile> {
  const { broker, supabase, user, profile, buyerId, preferredEmail } = a;

  // 9) Look up this broker's CRM row for this buyer.
  // Prefer (broker_id, buyer_user_id); fall back to email match for legacy rows
  // that haven't been linked yet (the M1.1 backfill catches most, this catches
  // anything created since).
  type CrmRow = {
    id: string;
    status: string | null;
    notes: string | null;
    interest: string | null;
    next_follow_up_at: string | null;
    last_emailed_at: string | null;
    last_called_at: string | null;
    last_contacted_at: string | null;
    first_interaction_at: string | null;
    consent_marketing: boolean | null;
  };
  let crmRow: CrmRow | null = null;

  const byUser = await supabase
    .from("broker_contacts")
    .select("id, status, notes, interest, next_follow_up_at, last_emailed_at, last_called_at, last_contacted_at, first_interaction_at, consent_marketing")
    .eq("broker_id", broker.id)
    .eq("buyer_user_id", buyerId)
    .maybeSingle();
  if (byUser.data) {
    crmRow = byUser.data as unknown as CrmRow;
  } else if (preferredEmail) {
    const byEmail = await supabase
      .from("broker_contacts")
      .select("id, status, notes, interest, next_follow_up_at, last_emailed_at, last_called_at, last_contacted_at, first_interaction_at, consent_marketing")
      .eq("broker_id", broker.id)
      .ilike("email", preferredEmail)
      .maybeSingle();
    if (byEmail.data) crmRow = byEmail.data as unknown as CrmRow;
  }

  let crmTags: ContactTag[] = [];
  if (crmRow?.id) {
    const { data: tagRows } = await supabase
      .from("broker_contact_tag_map")
      .select("contact_tags(*)")
      .eq("contact_id", crmRow.id);
    crmTags = ((tagRows ?? []) as unknown as { contact_tags: ContactTag | null }[])
      .map((m) => m.contact_tags)
      .filter((t): t is ContactTag => !!t);
  }

  const crmStatus = (crmRow?.status as BuyerCrmStatus | null) ?? null;

  return {
    id: user.id,
    name: a.preferredName,
    email: preferredEmail,
    phone: a.preferredPhone,
    photo_url: profile?.photo_url ?? null,
    role: profile?.role ?? "user",
    created_at: profile?.created_at ?? user.created_at ?? null,
    last_active_at: profile?.last_active_at ?? null,
    preferences: {
      budget_min: profile?.budget_min ?? null,
      budget_max: profile?.budget_max ?? null,
      preferred_industries: profile?.preferred_industries ?? [],
      preferred_locations: profile?.preferred_locations ?? [],
      funding_status: (profile?.funding_status as BuyerFundingStatus | null) ?? null,
      timeframe: (profile?.timeframe as BuyerTimeframe | null) ?? null,
      location_text: profile?.location_text ?? null,
    },
    in_contacts: !!crmRow,
    contact_id: crmRow?.id ?? null,
    crm: {
      contact_id: crmRow?.id ?? null,
      status: crmStatus,
      notes: crmRow?.notes ?? null,
      interest: crmRow?.interest ?? null,
      tags: crmTags,
      next_follow_up_at: crmRow?.next_follow_up_at ?? null,
      last_emailed_at: crmRow?.last_emailed_at ?? null,
      last_called_at: crmRow?.last_called_at ?? null,
      last_contacted_at: crmRow?.last_contacted_at ?? null,
      first_interaction_at: crmRow?.first_interaction_at ?? null,
      consent_marketing: !!crmRow?.consent_marketing,
    },
    scope_listing: a.scope_listing,
    metrics: {
      listings_touched: a.listingsTouched.size,
      total_views: a.views.length,
      total_return_visits: a.listings.reduce(
        (acc, l) => acc + l.return_visits,
        0,
      ),
      total_enquiries: a.enquiries.length,
      total_calls: a.calls.length,
      saves: a.saves.length,
      nda_signed: a.ndaSigs.length,
      nda_requested: new Set(a.docAccess.map((d) => d.listing_id)).size,
      documents_viewed: a.docEvents.filter((e) => e.event_kind === "view").length,
      documents_downloaded: a.docEvents.filter(
        (e) => e.event_kind === "download",
      ).length,
      first_seen_at: a.first_seen_at,
      last_seen_at: a.last_seen_at,
    },
    listings: a.listings,
    enquiries: a.enquiriesSummary,
    activity: a.activity,
  };
}
