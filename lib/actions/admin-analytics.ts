"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type {
  AdminAnalytics,
  AnalyticsKPIs,
  RecentEnquiry,
  RecentPayment,
  RevenueTimePoint,
  Segment,
  TimePoint,
  TopAgency,
  TopBroker,
  TopCategory,
  TopListing,
} from "@/lib/types/admin-analytics";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

const MS_DAY = 24 * 60 * 60 * 1000;
const MONTHS_WINDOW = 12;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * MS_DAY).toISOString();
}

function monthKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(monthKey(d));
  }
  return out;
}

function fillTimeSeries(
  data: Map<string, number>,
  months: string[]
): TimePoint[] {
  return months.map((month) => ({ month, value: data.get(month) ?? 0 }));
}

function fillRevenueSeries(
  data: Map<string, { revenue: number; count: number }>,
  months: string[]
): RevenueTimePoint[] {
  return months.map((month) => {
    const v = data.get(month);
    return { month, revenue: v?.revenue ?? 0, count: v?.count ?? 0 };
  });
}

function bucketBy<T>(rows: T[], keyOf: (r: T) => string | null | undefined) {
  const out = new Map<string, number>();
  for (const r of rows) {
    const k = keyOf(r);
    if (!k) continue;
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

function segmentsFromMap(
  map: Map<string, number>,
  labelMap: Record<string, string> = {},
  order?: string[]
): Segment[] {
  const keys = order ?? Array.from(map.keys());
  return keys
    .map((key) => ({
      key,
      label: labelMap[key] ?? key,
      count: map.get(key) ?? 0,
    }))
    .filter((s) => s.count > 0 || (order && order.includes(s.key)));
}

function bucketByMonth<T>(
  rows: T[],
  dateOf: (r: T) => string | null | undefined,
  months: string[]
): TimePoint[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = dateOf(r);
    if (!d) continue;
    const k = monthKey(d);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return fillTimeSeries(map, months);
}

// ─────────────────────────────────────────────────────────────────────────────

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const months = lastNMonths(MONTHS_WINDOW);

  const since30 = isoDaysAgo(30);
  const since60 = isoDaysAgo(60);

  const [
    paymentsRes,
    subsRes,
    plansRes,
    listingsRes,
    agenciesRes,
    brokersRes,
    enquiriesRes,
    discountCodesRes,
    adsRes,
    categoriesRes,
    listingMetaRes,
    viewsRes,
    callsRes,
    ndaRes,
    sharesRes,
    productsRes,
  ] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, broker_id, agency_id, amount, original_amount, discount_amount, currency, status, payment_type, paid_at, created_at, discount_code_id, product_id, listing_id"
      )
      .order("created_at", { ascending: false }),

    supabase
      .from("agency_subscriptions")
      .select(
        "id, status, plan_product_id, current_period_start, current_period_end, cancelled_at, created_at"
      ),

    supabase
      .from("products")
      .select("id, name, price, currency, product_type")
      .eq("product_type", "subscription"),

    supabase
      .from("listings")
      .select(
        "id, title, status, listing_tier, category_id, broker_id, agency_id, created_at, admin_removed_at"
      ),

    supabase.from("agencies").select("id, name, status, created_at"),

    supabase
      .from("profiles")
      .select("id, name, email, status, agency_id, created_at")
      .eq("role", "broker"),

    supabase
      .from("enquiries")
      .select(
        "id, listing_id, broker_id, contact_name, contact_email, created_at"
      )
      .order("created_at", { ascending: false }),

    supabase
      .from("discount_codes")
      .select("id, code, percent_off, used_count, max_uses, active"),

    supabase
      .from("advertisements")
      .select("placement, status, click_count, impression_count, end_date"),

    supabase.from("categories").select("id, name").eq("active", true),

    supabase.from("listings").select("id, title, agency_id, listing_tier"),

    supabase
      .from("listing_views")
      .select("listing_id, platform, viewed_at"),

    supabase
      .from("call_clicks")
      .select("listing_id, platform, clicked_at"),

    supabase
      .from("nda_signatures")
      .select("listing_id, signed_at"),

    supabase
      .from("listing_share_invites")
      .select("sent_at, opened_at, nda_signed_at, account_created_at"),

    supabase.from("products").select("id, name"),
  ]);

  const payments = paymentsRes.data ?? [];
  const subs = subsRes.data ?? [];
  const subPlans = plansRes.data ?? [];
  const listings = listingsRes.data ?? [];
  const agencies = agenciesRes.data ?? [];
  const brokers = brokersRes.data ?? [];
  const enquiries = enquiriesRes.data ?? [];
  const discountCodes = discountCodesRes.data ?? [];
  const ads = adsRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const listingMeta = listingMetaRes.data ?? [];
  const views = viewsRes.data ?? [];
  const calls = callsRes.data ?? [];
  const ndaSigs = ndaRes.data ?? [];
  const shares = sharesRes.data ?? [];
  const products = productsRes.data ?? [];

  // Lookup tables
  const agencyNameById = new Map<string, string>(
    agencies.map((a) => [a.id as string, a.name as string])
  );
  const brokerById = new Map<
    string,
    { name: string | null; email: string; agencyId: string | null }
  >(
    brokers.map((b) => [
      b.id as string,
      {
        name: (b.name as string | null) ?? null,
        email: b.email as string,
        agencyId: (b.agency_id as string | null) ?? null,
      },
    ])
  );
  const productNameById = new Map<string, string>(
    products.map((p) => [p.id as string, p.name as string])
  );
  const categoryNameById = new Map<string, string>(
    categories.map((c) => [c.id as string, c.name as string])
  );
  const listingMetaById = new Map<
    string,
    { title: string; agencyId: string | null; tier: string | null }
  >(
    listingMeta.map((l) => [
      l.id as string,
      {
        title: l.title as string,
        agencyId: (l.agency_id as string | null) ?? null,
        tier: (l.listing_tier as string | null) ?? null,
      },
    ])
  );

  // ── KPIs ────────────────────────────────────────────────────────────────

  const paid = payments.filter((p) => p.status === "paid");
  const totalRevenue = paid.reduce((s, p) => s + (p.amount ?? 0), 0);

  const revenueLast30Days = paid
    .filter((p) => p.paid_at && p.paid_at >= since30)
    .reduce((s, p) => s + (p.amount ?? 0), 0);

  const revenuePrev30Days = paid
    .filter((p) => p.paid_at && p.paid_at >= since60 && p.paid_at < since30)
    .reduce((s, p) => s + (p.amount ?? 0), 0);

  const planPriceById = new Map<string, number>(
    subPlans.map((p) => [p.id as string, p.price as number])
  );
  const mrr = subs
    .filter((s) => s.status === "active" || s.status === "trialing")
    .reduce(
      (sum, s) => sum + (planPriceById.get(s.plan_product_id as string) ?? 0),
      0
    );

  const activeSubscriptions = subs.filter((s) => s.status === "active").length;
  const trialingSubscriptions = subs.filter(
    (s) => s.status === "trialing"
  ).length;
  const pastDueSubscriptions = subs.filter(
    (s) => s.status === "past_due"
  ).length;
  const cancelledLast30Days = subs.filter(
    (s) => s.cancelled_at && s.cancelled_at >= since30
  ).length;

  const liveListings = listings.filter((l) => !l.admin_removed_at);
  const publishedListings = liveListings.filter(
    (l) => l.status === "published"
  ).length;
  const draftListings = liveListings.filter((l) => l.status === "draft").length;
  const newListingsLast30Days = liveListings.filter(
    (l) => l.created_at && l.created_at >= since30
  ).length;
  const newListingsPrev30Days = liveListings.filter(
    (l) => l.created_at && l.created_at >= since60 && l.created_at < since30
  ).length;

  const totalAgencies = agencies.length;
  const activeAgencies = agencies.filter((a) => a.status === "active").length;
  const newAgenciesLast30Days = agencies.filter(
    (a) => a.created_at && a.created_at >= since30
  ).length;

  const totalBrokers = brokers.length;
  const activeBrokers = brokers.filter((b) => b.status === "active").length;

  const totalEnquiries = enquiries.length;
  const enquiriesLast30Days = enquiries.filter(
    (e) => e.created_at && e.created_at >= since30
  ).length;
  const enquiriesPrev30Days = enquiries.filter(
    (e) => e.created_at && e.created_at >= since60 && e.created_at < since30
  ).length;

  const totalDiscountRedemptions = discountCodes.reduce(
    (s, c) => s + (c.used_count ?? 0),
    0
  );
  const totalDiscountSavings = payments
    .filter((p) => p.status === "paid" && p.discount_amount)
    .reduce((s, p) => s + (p.discount_amount ?? 0), 0);

  const totalViews = views.length;
  const viewsLast30Days = views.filter(
    (v) => v.viewed_at && v.viewed_at >= since30
  ).length;
  const viewsPrev30Days = views.filter(
    (v) => v.viewed_at && v.viewed_at >= since60 && v.viewed_at < since30
  ).length;

  const totalCalls = calls.length;
  const callsLast30Days = calls.filter(
    (c) => c.clicked_at && c.clicked_at >= since30
  ).length;

  const totalNDASignatures = ndaSigs.length;
  const ndaLast30Days = ndaSigs.filter(
    (n) => n.signed_at && n.signed_at >= since30
  ).length;

  const totalShareInvites = shares.length;
  const shareInvitesOpened = shares.filter((s) => s.opened_at).length;
  const shareInvitesNDASigned = shares.filter((s) => s.nda_signed_at).length;
  const shareInvitesAccountCreated = shares.filter(
    (s) => s.account_created_at
  ).length;

  const viewToEnquiryRate =
    totalViews > 0 ? Math.min(1, totalEnquiries / totalViews) : 0;

  const kpis: AnalyticsKPIs = {
    totalRevenue,
    mrr,
    revenueLast30Days,
    revenuePrev30Days,
    activeSubscriptions,
    trialingSubscriptions,
    pastDueSubscriptions,
    cancelledLast30Days,
    publishedListings,
    draftListings,
    newListingsLast30Days,
    newListingsPrev30Days,
    totalAgencies,
    activeAgencies,
    newAgenciesLast30Days,
    totalBrokers,
    activeBrokers,
    totalEnquiries,
    enquiriesLast30Days,
    enquiriesPrev30Days,
    totalDiscountRedemptions,
    totalDiscountSavings,
    totalViews,
    viewsLast30Days,
    viewsPrev30Days,
    totalCalls,
    callsLast30Days,
    totalNDASignatures,
    ndaLast30Days,
    totalShareInvites,
    shareInvitesOpened,
    shareInvitesNDASigned,
    shareInvitesAccountCreated,
    viewToEnquiryRate,
  };

  // ── Time series ─────────────────────────────────────────────────────────

  const revenueByMonthMap = new Map<string, { revenue: number; count: number }>();
  for (const p of paid) {
    const stamp = p.paid_at ?? p.created_at;
    if (!stamp) continue;
    const k = monthKey(stamp);
    const cur = revenueByMonthMap.get(k) ?? { revenue: 0, count: 0 };
    cur.revenue += p.amount ?? 0;
    cur.count += 1;
    revenueByMonthMap.set(k, cur);
  }
  const revenueByMonth = fillRevenueSeries(revenueByMonthMap, months);
  const paymentsByMonth: TimePoint[] = revenueByMonth.map((r) => ({
    month: r.month,
    value: r.count,
  }));

  const mrrByMonth: TimePoint[] = months.map((m) => {
    const [y, mo] = m.split("-").map(Number);
    const monthEnd = new Date(Date.UTC(y, mo, 0, 23, 59, 59)).toISOString();
    let monthMrr = 0;
    for (const s of subs) {
      if (!s.created_at || s.created_at > monthEnd) continue;
      if (s.cancelled_at && s.cancelled_at <= monthEnd) continue;
      monthMrr += planPriceById.get(s.plan_product_id as string) ?? 0;
    }
    return { month: m, value: monthMrr };
  });

  const newListingsByMonth = bucketByMonth(
    liveListings,
    (l) => l.created_at as string,
    months
  );
  const enquiriesByMonth = bucketByMonth(
    enquiries,
    (e) => e.created_at as string,
    months
  );
  const viewsByMonth = bucketByMonth(
    views,
    (v) => v.viewed_at as string,
    months
  );
  const ndaSignaturesByMonth = bucketByMonth(
    ndaSigs,
    (n) => n.signed_at as string,
    months
  );
  const newAgenciesByMonth = bucketByMonth(
    agencies,
    (a) => a.created_at as string,
    months
  );
  const newBrokersByMonth = bucketByMonth(
    brokers,
    (b) => b.created_at as string,
    months
  );

  // ── Distribution segments ───────────────────────────────────────────────

  const PAYMENT_TYPE_LABELS: Record<string, string> = {
    featured: "Featured upgrades",
    listing_tier: "Listing tiers",
    subscription: "Subscriptions",
  };
  const revenueByTypeMap = new Map<string, { revenue: number; count: number }>();
  for (const p of paid) {
    const k = p.payment_type ?? "other";
    const cur = revenueByTypeMap.get(k) ?? { revenue: 0, count: 0 };
    cur.revenue += p.amount ?? 0;
    cur.count += 1;
    revenueByTypeMap.set(k, cur);
  }
  const revenueByPaymentType: Segment[] = Array.from(revenueByTypeMap.entries())
    .map(([key, v]) => ({
      key,
      label: PAYMENT_TYPE_LABELS[key] ?? key,
      count: v.count,
      amount: v.revenue,
    }))
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));

  const PAYMENT_STATUS_LABELS: Record<string, string> = {
    paid: "Paid",
    pending: "Pending",
    invoiced: "Invoiced",
    approved: "Approved",
  };
  const paymentsByStatusMap = new Map<string, { revenue: number; count: number }>();
  for (const p of payments) {
    const k = p.status ?? "other";
    const cur = paymentsByStatusMap.get(k) ?? { revenue: 0, count: 0 };
    cur.revenue += p.amount ?? 0;
    cur.count += 1;
    paymentsByStatusMap.set(k, cur);
  }
  const paymentsByStatus: Segment[] = Array.from(paymentsByStatusMap.entries())
    .map(([key, v]) => ({
      key,
      label: PAYMENT_STATUS_LABELS[key] ?? key,
      count: v.count,
      amount: v.revenue,
    }))
    .sort((a, b) => b.count - a.count);

  const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
    active: "Active",
    trialing: "Trialing",
    past_due: "Past due",
    cancelled: "Cancelled",
    pending: "Pending",
    expired: "Expired",
  };
  const subscriptionsByStatus = segmentsFromMap(
    bucketBy(subs, (s) => s.status as string),
    SUBSCRIPTION_STATUS_LABELS
  ).sort((a, b) => b.count - a.count);

  const LISTING_STATUS_LABELS: Record<string, string> = {
    draft: "Draft",
    published: "Published",
    under_offer: "Under offer",
    sold: "Sold",
    unpublished: "Unpublished",
  };
  const listingsByStatus = segmentsFromMap(
    bucketBy(liveListings, (l) => l.status as string),
    LISTING_STATUS_LABELS
  ).sort((a, b) => b.count - a.count);

  const TIER_LABELS: Record<string, string> = {
    basic: "Basic",
    standard: "Standard",
    featured: "Featured",
  };
  const listingsByTier = segmentsFromMap(
    bucketBy(liveListings, (l) => l.listing_tier as string),
    TIER_LABELS,
    ["basic", "standard", "featured"]
  );

  const listingsByCategoryMap = bucketBy(liveListings, (l) => l.category_id as string);
  const listingsByCategory: Segment[] = Array.from(
    listingsByCategoryMap.entries()
  )
    .map(([key, count]) => ({
      key,
      label: categoryNameById.get(key) ?? "Uncategorised",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const AGENCY_STATUS_LABELS: Record<string, string> = {
    active: "Active",
    pending: "Pending",
    disabled: "Disabled",
  };
  const agenciesByStatus = segmentsFromMap(
    bucketBy(agencies, (a) => a.status as string),
    AGENCY_STATUS_LABELS,
    ["active", "pending", "disabled"]
  );

  const BROKER_STATUS_LABELS: Record<string, string> = {
    active: "Active",
    pending: "Pending",
    disabled: "Disabled",
  };
  const brokersByStatus = segmentsFromMap(
    bucketBy(brokers, (b) => b.status as string),
    BROKER_STATUS_LABELS,
    ["active", "pending", "disabled"]
  );

  const PLATFORM_LABELS: Record<string, string> = {
    web: "Web",
    mobile: "Mobile",
  };
  const viewsByPlatform = segmentsFromMap(
    bucketBy(views, (v) => v.platform as string),
    PLATFORM_LABELS,
    ["web", "mobile"]
  );
  const callsByPlatform = segmentsFromMap(
    bucketBy(calls, (c) => c.platform as string),
    PLATFORM_LABELS,
    ["web", "mobile"]
  );

  // ── Tables ──────────────────────────────────────────────────────────────

  // Listing -> count of enquiries / views
  const enquiriesByListing = new Map<string, number>();
  for (const e of enquiries) {
    const k = e.listing_id as string | null;
    if (!k) continue;
    enquiriesByListing.set(k, (enquiriesByListing.get(k) ?? 0) + 1);
  }
  const viewsByListing = new Map<string, number>();
  for (const v of views) {
    const k = v.listing_id as string | null;
    if (!k) continue;
    viewsByListing.set(k, (viewsByListing.get(k) ?? 0) + 1);
  }

  function listingRow(id: string): TopListing | null {
    const meta = listingMetaById.get(id);
    if (!meta) return null;
    return {
      id,
      title: meta.title,
      enquiries: enquiriesByListing.get(id) ?? 0,
      views: viewsByListing.get(id) ?? 0,
      agencyName: meta.agencyId ? agencyNameById.get(meta.agencyId) ?? null : null,
      tier: meta.tier,
    };
  }

  const topListingsByEnquiries: TopListing[] = Array.from(
    enquiriesByListing.entries()
  )
    .map(([id]) => listingRow(id))
    .filter((r): r is TopListing => !!r && r.enquiries > 0)
    .sort((a, b) => b.enquiries - a.enquiries)
    .slice(0, 10);

  const topListingsByViews: TopListing[] = Array.from(viewsByListing.entries())
    .map(([id]) => listingRow(id))
    .filter((r): r is TopListing => !!r && r.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Top categories: listings + enquiries on listings in that category
  const categoryEnquiries = new Map<string, number>();
  for (const l of liveListings) {
    if (!l.category_id) continue;
    const eCount = enquiriesByListing.get(l.id as string) ?? 0;
    categoryEnquiries.set(
      l.category_id as string,
      (categoryEnquiries.get(l.category_id as string) ?? 0) + eCount
    );
  }
  const topCategories: TopCategory[] = Array.from(
    listingsByCategoryMap.entries()
  )
    .map(([id, count]) => ({
      id,
      name: categoryNameById.get(id) ?? "Uncategorised",
      listings: count,
      enquiries: categoryEnquiries.get(id) ?? 0,
    }))
    .sort((a, b) => b.listings - a.listings)
    .slice(0, 10);

  // Top brokers by enquiries received on their listings (excludes agency-owned-only)
  const brokerListings = new Map<string, number>();
  for (const l of liveListings) {
    const bid = l.broker_id as string | null;
    if (!bid) continue;
    brokerListings.set(bid, (brokerListings.get(bid) ?? 0) + 1);
  }
  const brokerEnquiries = new Map<string, number>();
  for (const e of enquiries) {
    const bid = e.broker_id as string | null;
    if (!bid) continue;
    brokerEnquiries.set(bid, (brokerEnquiries.get(bid) ?? 0) + 1);
  }
  const allBrokerIds = new Set<string>([
    ...brokerListings.keys(),
    ...brokerEnquiries.keys(),
  ]);
  const topBrokers: TopBroker[] = Array.from(allBrokerIds)
    .map((id) => {
      const b = brokerById.get(id);
      if (!b) return null;
      return {
        id,
        name: b.name,
        email: b.email,
        agencyName: b.agencyId
          ? agencyNameById.get(b.agencyId) ?? null
          : null,
        listings: brokerListings.get(id) ?? 0,
        enquiries: brokerEnquiries.get(id) ?? 0,
      };
    })
    .filter((r): r is TopBroker => !!r)
    .sort((a, b) => {
      // Sort by enquiries primarily, then by listings.
      const e = b.enquiries - a.enquiries;
      return e !== 0 ? e : b.listings - a.listings;
    })
    .slice(0, 10);

  // Top agencies by listings + revenue
  const agencyListings = new Map<string, number>();
  const agencyBrokers = new Map<string, number>();
  for (const l of liveListings) {
    const aid = l.agency_id as string | null;
    if (!aid) continue;
    agencyListings.set(aid, (agencyListings.get(aid) ?? 0) + 1);
  }
  for (const b of brokers) {
    const aid = b.agency_id as string | null;
    if (!aid) continue;
    agencyBrokers.set(aid, (agencyBrokers.get(aid) ?? 0) + 1);
  }
  const agencyRevenue = new Map<string, number>();
  for (const p of paid) {
    const aid = p.agency_id as string | null;
    if (!aid) continue;
    agencyRevenue.set(aid, (agencyRevenue.get(aid) ?? 0) + (p.amount ?? 0));
  }
  // Add broker-attributed revenue to their agency
  for (const p of paid) {
    if (p.agency_id) continue;
    const bid = p.broker_id as string | null;
    if (!bid) continue;
    const b = brokerById.get(bid);
    if (!b?.agencyId) continue;
    agencyRevenue.set(
      b.agencyId,
      (agencyRevenue.get(b.agencyId) ?? 0) + (p.amount ?? 0)
    );
  }
  const topAgencies: TopAgency[] = agencies
    .map((a) => ({
      id: a.id as string,
      name: a.name as string,
      brokers: agencyBrokers.get(a.id as string) ?? 0,
      listings: agencyListings.get(a.id as string) ?? 0,
      revenue: agencyRevenue.get(a.id as string) ?? 0,
    }))
    .filter((a) => a.listings > 0 || a.revenue > 0)
    .sort((a, b) => {
      const r = b.revenue - a.revenue;
      return r !== 0 ? r : b.listings - a.listings;
    })
    .slice(0, 10);

  // Recent payments (last 10)
  const recentPayments: RecentPayment[] = payments.slice(0, 10).map((p) => {
    const broker = p.broker_id
      ? brokerById.get(p.broker_id as string)
      : undefined;
    const agencyName = p.agency_id
      ? agencyNameById.get(p.agency_id as string) ?? null
      : broker?.agencyId
        ? agencyNameById.get(broker.agencyId) ?? null
        : null;
    return {
      id: p.id as string,
      brokerName: broker?.name ?? broker?.email ?? null,
      agencyName,
      productName: p.product_id
        ? productNameById.get(p.product_id as string) ?? null
        : null,
      amount: p.amount ?? 0,
      status: p.status as string,
      createdAt: p.created_at as string,
    };
  });

  // Recent enquiries (last 10)
  const recentEnquiries: RecentEnquiry[] = enquiries.slice(0, 10).map((e) => ({
    id: e.id as string,
    contactName: (e.contact_name as string | null) ?? null,
    contactEmail: (e.contact_email as string | null) ?? null,
    listingTitle: e.listing_id
      ? listingMetaById.get(e.listing_id as string)?.title ?? null
      : null,
    createdAt: e.created_at as string,
  }));

  // Discount codes
  const topDiscountCodes = discountCodes
    .filter((c) => c.active && (c.used_count ?? 0) > 0)
    .map((c) => ({
      code: c.code as string,
      percentOff: c.percent_off as number,
      redemptions: c.used_count ?? 0,
      maxUses: (c.max_uses as number | null) ?? null,
    }))
    .sort((a, b) => b.redemptions - a.redemptions)
    .slice(0, 5);

  // Ads by placement
  const placements: Array<"homepage" | "search" | "listing"> = [
    "homepage",
    "search",
    "listing",
  ];
  const now = new Date().toISOString();
  const adsByPlacement = placements.map((placement) => {
    const slice = ads.filter((a) => a.placement === placement);
    const active = slice.filter(
      (a) => a.status === "active" && (!a.end_date || a.end_date > now)
    );
    const impressions = slice.reduce(
      (s, a) => s + (a.impression_count ?? 0),
      0
    );
    const clicks = slice.reduce((s, a) => s + (a.click_count ?? 0), 0);
    return {
      placement,
      activeAds: active.length,
      impressions,
      clicks,
      ctr: impressions > 0 ? clicks / impressions : 0,
    };
  });

  return {
    kpis,
    charts: {
      revenueByMonth,
      paymentsByMonth,
      mrrByMonth,
      newListingsByMonth,
      enquiriesByMonth,
      viewsByMonth,
      ndaSignaturesByMonth,
      newAgenciesByMonth,
      newBrokersByMonth,
      revenueByPaymentType,
      paymentsByStatus,
      subscriptionsByStatus,
      listingsByStatus,
      listingsByTier,
      listingsByCategory,
      agenciesByStatus,
      brokersByStatus,
      viewsByPlatform,
      callsByPlatform,
      topListingsByEnquiries,
      topListingsByViews,
      topCategories,
      topBrokers,
      topAgencies,
      recentPayments,
      recentEnquiries,
      topDiscountCodes,
      adsByPlacement,
    },
    generatedAt: new Date().toISOString(),
  };
}
