"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const DEFAULT_PERIOD_DAYS = 30;
const ALLOWED_PERIODS = [7, 30, 90] as const;
export type InsightsPeriodDays = (typeof ALLOWED_PERIODS)[number];

function normalizePeriod(input: number | undefined): InsightsPeriodDays {
  if (input && (ALLOWED_PERIODS as readonly number[]).includes(input)) {
    return input as InsightsPeriodDays;
  }
  return DEFAULT_PERIOD_DAYS;
}

export type HotBuyerSignal =
  | "multiple_visits"
  | "nda_requested"
  | "nda_signed"
  | "saved";

export type HotBuyer = {
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  signals: HotBuyerSignal[];
  visit_count: number;
  last_seen_at: string | null;
  /** Human label for the most recent meaningful activity, e.g. "Signed NDA", "Saved listing". */
  last_activity_label: string | null;
  last_activity_at: string | null;
};

export type ListingInsightsMetrics = {
  listing: {
    id: string;
    title: string;
    asking_price: number | null;
    price_type: "fixed" | "poa";
    category: string | null;
    suburb: string | null;
    state: string | null;
  };
  period_days: number;
  metrics: {
    total_views: number;
    unique_visitors: number;
    repeat_visitors: number;
    enquiries: number;
    calls: number;
    nda_requests: number;
    nda_signed: number;
    documents_viewed: number;
    saved_listings: number;
    days_live: number;
  };
  hot_buyers: HotBuyer[];
};

async function requireBrokerForListing(listingId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    throw new Error("Unauthorized");
  }
  const supabase = createServiceRoleClient();
  const { data: listing } = await supabase
    .from("listings")
    .select(
      `id, broker_id, agency_id, title, asking_price, price_type, suburb, state, published_at,
       category:categories(name)`
    )
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) throw new Error("Listing not found");

  const brokerId = session.user.id;
  const agencyId = session.user.agencyId ?? null;
  const agencyRole = session.user.agencyRole ?? null;
  const owns =
    listing.broker_id === brokerId ||
    (agencyId && agencyRole === "owner" && listing.agency_id === agencyId);

  if (!owns) throw new Error("Forbidden");
  return { listing, supabase };
}

export async function getListingInsightsMetrics(
  listingId: string,
  periodDaysInput?: number,
): Promise<ListingInsightsMetrics> {
  const { listing, supabase } = await requireBrokerForListing(listingId);

  const periodDays = normalizePeriod(periodDaysInput);
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 86400_000);
  const periodStartISO = periodStart.toISOString();

  // Period-bounded data: views, enquiries, calls
  // All-time data: saves, NDAs, document access (these are "totals" by spec)
  const [
    viewsRes,
    enqRes,
    callsRes,
    savesRes,
    ndaSignaturesRes,
    docAccessRes,
    shareInvitesRes,
  ] = await Promise.all([
    supabase
      .from("listing_views")
      .select("id, user_id, ip_address, viewed_at")
      .eq("listing_id", listingId)
      .gte("viewed_at", periodStartISO),

    supabase
      .from("enquiries")
      .select("id, user_id, contact_name, contact_email, contact_phone, created_at")
      .eq("listing_id", listingId),

    supabase
      .from("call_clicks")
      .select("id, user_id, clicked_at")
      .eq("listing_id", listingId)
      .gte("clicked_at", periodStartISO),

    supabase
      .from("user_favorites")
      .select("user_id, created_at")
      .eq("listing_id", listingId),

    supabase
      .from("nda_signatures")
      .select("user_id, signer_name, signer_email, signed_at")
      .eq("listing_id", listingId),

    supabase
      .from("document_access_requests")
      .select("user_id, status, requested_at")
      .eq("listing_id", listingId),

    supabase
      .from("listing_share_invites")
      .select(
        "recipient_name, recipient_email, account_created_user_id, sent_at, opened_at, nda_signed_at",
      )
      .eq("listing_id", listingId),
  ]);

  const views = viewsRes.data ?? [];
  const allEnquiries = enqRes.data ?? [];
  const enquiries = allEnquiries.filter(
    (e) => e.created_at >= periodStartISO,
  );
  const calls = callsRes.data ?? [];
  const saves = savesRes.data ?? [];
  const ndaSignatures = ndaSignaturesRes.data ?? [];
  const docAccess = docAccessRes.data ?? [];
  const shareInvites = shareInvitesRes.data ?? [];

  // ── Aggregate views: unique vs repeat (key by user_id else ip_address) ──
  const visitorViewCounts = new Map<string, number>();
  for (const v of views) {
    const key = v.user_id ?? `ip:${v.ip_address ?? "anon"}`;
    visitorViewCounts.set(key, (visitorViewCounts.get(key) ?? 0) + 1);
  }
  const unique_visitors = visitorViewCounts.size;
  let repeat_visitors = 0;
  for (const c of visitorViewCounts.values()) if (c > 1) repeat_visitors++;

  const nda_requests = new Set(docAccess.map((d) => d.user_id)).size;
  const nda_signed = new Set(ndaSignatures.map((n) => n.user_id)).size;
  const documents_viewed = docAccess.filter(
    (d) => d.status === "approved",
  ).length;

  const days_live = listing.published_at
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() - new Date(listing.published_at).getTime()) /
            86400_000,
        ),
      )
    : 0;

  // ── Hot buyers ──
  // Build per-user records, including signals, contact info, and the most
  // recent meaningful activity so the broker has something to act on.
  type UserAgg = {
    user_id: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    visit_count: number;
    last_seen_at: string | null;
    last_activity_label: string | null;
    last_activity_at: string | null;
    signals: Set<HotBuyerSignal>;
  };
  const buyers = new Map<string, UserAgg>();

  function ensure(
    userId: string | null,
    name: string | null,
    email: string | null,
    phone: string | null = null,
  ) {
    if (!userId) return null;
    let agg = buyers.get(userId);
    if (!agg) {
      agg = {
        user_id: userId,
        name,
        email,
        phone,
        visit_count: 0,
        last_seen_at: null,
        last_activity_label: null,
        last_activity_at: null,
        signals: new Set(),
      };
      buyers.set(userId, agg);
    } else {
      if (!agg.name && name) agg.name = name;
      if (!agg.email && email) agg.email = email;
      if (!agg.phone && phone) agg.phone = phone;
    }
    return agg;
  }

  function noteActivity(agg: UserAgg, at: string | null, label: string) {
    if (!at) return;
    if (!agg.last_activity_at || at > agg.last_activity_at) {
      agg.last_activity_at = at;
      agg.last_activity_label = label;
    }
  }

  // Visit counts per known user (anonymous IP-only views are not surfaceable)
  for (const v of views) {
    if (!v.user_id) continue;
    const agg = ensure(v.user_id, null, null);
    if (!agg) continue;
    agg.visit_count++;
    if (!agg.last_seen_at || v.viewed_at > agg.last_seen_at) {
      agg.last_seen_at = v.viewed_at;
    }
    noteActivity(agg, v.viewed_at, "Viewed listing");
  }
  for (const [uid, agg] of buyers.entries()) {
    void uid;
    if (agg.visit_count > 1) agg.signals.add("multiple_visits");
  }

  // Saves
  for (const s of saves) {
    const agg = ensure(s.user_id, null, null);
    if (!agg) continue;
    agg.signals.add("saved");
    noteActivity(agg, s.created_at, "Saved listing");
  }

  // NDA requests (document access requests indicate active interest in NDA-gated data)
  for (const d of docAccess) {
    const agg = ensure(d.user_id, null, null);
    if (!agg) continue;
    agg.signals.add("nda_requested");
    noteActivity(agg, d.requested_at, "Requested document access");
  }

  // NDA signed — signer_name/signer_email are entered manually at signing time,
  // so they are the most authoritative contact info we have.
  for (const n of ndaSignatures) {
    const agg = ensure(n.user_id, n.signer_name ?? null, n.signer_email ?? null);
    if (!agg) continue;
    agg.signals.add("nda_signed");
    agg.signals.add("nda_requested");
    noteActivity(agg, n.signed_at, "Signed NDA");
  }

  // Enquiries — enrich contact info even if the buyer doesn't trigger one of
  // the four spec signals. Brokers always want a name/email when reaching out.
  for (const e of allEnquiries) {
    const agg = ensure(
      e.user_id,
      (e as { contact_name?: string | null }).contact_name ?? null,
      (e as { contact_email?: string | null }).contact_email ?? null,
      (e as { contact_phone?: string | null }).contact_phone ?? null,
    );
    if (!agg) continue;
    noteActivity(agg, e.created_at, "Sent enquiry");
  }

  // Share invites — broker sent the listing directly to this email, so we can
  // attach the recipient name/email if their account is now linked.
  for (const inv of shareInvites) {
    const agg = ensure(
      inv.account_created_user_id,
      (inv as { recipient_name?: string | null }).recipient_name ?? null,
      (inv as { recipient_email?: string | null }).recipient_email ?? null,
    );
    if (!agg) continue;
    if (inv.nda_signed_at) noteActivity(agg, inv.nda_signed_at, "Signed NDA via invite");
    else if (inv.opened_at) noteActivity(agg, inv.opened_at, "Opened share invite");
  }

  // Hydrate remaining buyers from profiles as a final fallback. We also pull
  // phone here because the profile is the canonical source for it.
  const missingProfiles = Array.from(buyers.values()).filter(
    (b) => b.user_id && (!b.name || !b.email || !b.phone),
  );
  if (missingProfiles.length) {
    const ids = Array.from(new Set(missingProfiles.map((b) => b.user_id!)));
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, name, email, phone")
      .in("id", ids);
    const profileById = new Map(
      (profileRows ?? []).map(
        (p) => [p.id, p as { id: string; name: string | null; email: string | null; phone: string | null }] as const,
      ),
    );
    for (const b of missingProfiles) {
      if (!b.user_id) continue;
      const p = profileById.get(b.user_id);
      if (p) {
        if (!b.name) b.name = p.name ?? null;
        if (!b.email) b.email = p.email ?? null;
        if (!b.phone) b.phone = p.phone ?? null;
      }
    }
  }

  // Rank: NDA signed → NDA requested → multiple visits → saved
  const SIGNAL_RANK: Record<HotBuyerSignal, number> = {
    nda_signed: 4,
    nda_requested: 3,
    multiple_visits: 2,
    saved: 1,
  };
  function score(b: UserAgg): number {
    let s = 0;
    for (const sig of b.signals) s += SIGNAL_RANK[sig];
    return s + Math.min(b.visit_count, 5) * 0.1;
  }

  const hot_buyers: HotBuyer[] = Array.from(buyers.values())
    .filter((b) => b.signals.size > 0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 8)
    .map((b) => ({
      user_id: b.user_id,
      name: b.name,
      email: b.email,
      phone: b.phone,
      signals: Array.from(b.signals),
      visit_count: b.visit_count,
      last_seen_at: b.last_seen_at,
      last_activity_label: b.last_activity_label,
      last_activity_at: b.last_activity_at,
    }));

  const rawCat = (listing as { category?: unknown }).category;
  const catName = Array.isArray(rawCat)
    ? ((rawCat[0] as { name?: string | null } | undefined)?.name ?? null)
    : ((rawCat as { name?: string | null } | null | undefined)?.name ?? null);

  return {
    listing: {
      id: listing.id,
      title: listing.title,
      asking_price: listing.asking_price,
      price_type: listing.price_type as "fixed" | "poa",
      category: catName,
      suburb: listing.suburb,
      state: listing.state,
    },
    period_days: periodDays,
    metrics: {
      total_views: views.length,
      unique_visitors,
      repeat_visitors,
      enquiries: enquiries.length,
      calls: calls.length,
      nda_requests,
      nda_signed,
      documents_viewed,
      saved_listings: saves.length,
      days_live,
    },
    hot_buyers,
  };
}
