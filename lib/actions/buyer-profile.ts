"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type BuyerActivityKind =
  | "view"
  | "enquiry"
  | "save"
  | "nda_signed"
  | "nda_requested"
  | "document_approved"
  | "call";

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
  enquiries: number;
  calls: number;
  saved: boolean;
  nda_signed: boolean;
  nda_requested: boolean;
  documents_viewed: number;
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
  total_enquiries: number;
  total_calls: number;
  saves: number;
  nda_signed: number;
  nda_requested: number;
  documents_viewed: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
};

export type BuyerProfile = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  photo_url: string | null;
  role: string;
  created_at: string | null;
  /** Whether the buyer is already in this broker's CRM (broker_contacts). */
  in_contacts: boolean;
  contact_id: string | null;
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
  const [profileRes, userRes, contactRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, name, phone, photo_url, created_at")
      .eq("id", buyerId)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id, email, created_at")
      .eq("id", buyerId)
      .maybeSingle(),
    supabase
      .from("broker_contacts")
      .select("id")
      .eq("broker_id", broker.id)
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
  ]);

  const views = viewsRes.data ?? [];
  const enquiries = enquiriesRes.data ?? [];
  const saves = savesRes.data ?? [];
  const ndaSigs = ndaSigsRes.data ?? [];
  const docAccess = docAccessRes.data ?? [];
  const calls = callsRes.data ?? [];

  // Authorisation: the buyer must have at least one interaction with this broker's listings
  const hasInteraction =
    views.length +
      enquiries.length +
      saves.length +
      ndaSigs.length +
      docAccess.length +
      calls.length >
    0;
  if (!hasInteraction) {
    // Fall back: enquiry by email (anonymous buyers without user_id)
    if (!profile && !user) throw new Error("Forbidden");
    throw new Error("Forbidden");
  }

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
        enquiries: 0,
        calls: 0,
        saved: false,
        nda_signed: false,
        nda_requested: false,
        documents_viewed: 0,
        last_activity_at: null,
      };
      listingAgg.set(listingId, row);
    }
    listingsTouched.add(listingId);
    return row;
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
    if (d.status === "approved") row.documents_viewed++;
    bumpLast(row, d.requested_at);
  }
  for (const c of calls) {
    const row = ensureListing(c.listing_id);
    if (!row) continue;
    row.calls++;
    bumpLast(row, c.clicked_at);
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

  // 9) Check if this buyer is in broker_contacts
  const { data: contactRows } = await supabase
    .from("broker_contacts")
    .select("id, email")
    .eq("broker_id", broker.id);
  const contactRow = (contactRows ?? []).find(
    (c) => c.email.toLowerCase() === preferredEmail.toLowerCase(),
  );

  return {
    id: user.id,
    name: preferredName,
    email: preferredEmail,
    phone: preferredPhone,
    photo_url: profile?.photo_url ?? null,
    role: profile?.role ?? "user",
    created_at: profile?.created_at ?? user.created_at ?? null,
    in_contacts: !!contactRow,
    contact_id: contactRow?.id ?? null,
    scope_listing,
    metrics: {
      listings_touched: listingsTouched.size,
      total_views: views.length,
      total_enquiries: enquiries.length,
      total_calls: calls.length,
      saves: saves.length,
      nda_signed: ndaSigs.length,
      nda_requested: new Set(docAccess.map((d) => d.listing_id)).size,
      documents_viewed: docAccess.filter((d) => d.status === "approved").length,
      first_seen_at,
      last_seen_at,
    },
    listings,
    enquiries: enquiriesSummary,
    activity,
  };

  // (contactRes was a probe — actual lookup happens in step 9 to compare emails)
  void contactRes;
}
