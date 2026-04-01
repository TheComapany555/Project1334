"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";

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

export type ListingAnalyticsStat = {
  listing_id: string;
  title: string;
  slug: string;
  views: number;
  web_views: number;
  mobile_views: number;
  enquiries: number;
  saves: number;
  nda_sigs: number;
  avg_duration: number | null;
  engagement_rate: number; // enquiries / views * 100
};

export type DailyViewStat = {
  date: string;
  web: number;
  mobile: number;
  enquiries: number;
};

export type AnalyticsOverview = {
  // Period-based (filtered to selected range)
  total_views: number;
  web_views: number;
  mobile_views: number;
  enquiries: number;
  avg_duration_seconds: number | null;
  engagement_rate: number;

  // Trend vs previous period (percentage change, null = no prev data)
  views_trend: number | null;
  enquiries_trend: number | null;

  // All-time totals
  saves_total: number;
  nda_sigs_total: number;

  // Chart data
  daily: DailyViewStat[];

  // Per-listing breakdown (all time)
  per_listing: ListingAnalyticsStat[];

  period_days: number;
};

export async function getBrokerAnalytics(periodDays = 30): Promise<AnalyticsOverview> {
  const broker = await requireBroker();
  const supabase = createServiceRoleClient();

  // Build listing ID list
  let listingRows: { id: string; title: string; slug: string }[] = [];
  {
    let q = supabase.from("listings").select("id, title, slug");
    if (broker.agencyId && broker.agencyRole === "owner") {
      q = q.eq("agency_id", broker.agencyId);
    } else {
      q = q.eq("broker_id", broker.id);
    }
    const { data } = await q;
    listingRows = data ?? [];
  }

  const listingIds = listingRows.map((r) => r.id);
  const listingMeta: Record<string, { title: string; slug: string }> = {};
  for (const r of listingRows) listingMeta[r.id] = { title: r.title, slug: r.slug };

  if (listingIds.length === 0) {
    return emptyOverview(periodDays);
  }

  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 86400_000);
  const prevPeriodStart = new Date(now.getTime() - 2 * periodDays * 86400_000);

  // ─── Parallel data fetch ──────────────────────────────────────────
  const [viewsRes, enquiriesRes, savesRes, ndaRes] = await Promise.all([
    supabase
      .from("listing_views")
      .select("id, listing_id, platform, duration_seconds, viewed_at")
      .in("listing_id", listingIds)
      .order("viewed_at", { ascending: false }),

    supabase
      .from("enquiries")
      .select("id, listing_id, created_at")
      .in("listing_id", listingIds)
      .order("created_at", { ascending: false }),

    supabase
      .from("user_favorites")
      .select("listing_id")
      .in("listing_id", listingIds),

    supabase
      .from("nda_signatures")
      .select("listing_id, signed_at")
      .in("listing_id", listingIds),
  ]);

  const allViews = viewsRes.data ?? [];
  const allEnquiries = enquiriesRes.data ?? [];
  const allSaves = savesRes.data ?? [];
  const allNdaSigs = ndaRes.data ?? [];

  // ─── Period filtering ────────────────────────────────────────────
  const periodViews = allViews.filter((v) => new Date(v.viewed_at) >= periodStart);
  const prevViews = allViews.filter(
    (v) =>
      new Date(v.viewed_at) >= prevPeriodStart &&
      new Date(v.viewed_at) < periodStart
  );
  const periodEnquiries = allEnquiries.filter(
    (e) => new Date(e.created_at) >= periodStart
  );
  const prevEnquiries = allEnquiries.filter(
    (e) =>
      new Date(e.created_at) >= prevPeriodStart &&
      new Date(e.created_at) < periodStart
  );

  // ─── KPI aggregates ──────────────────────────────────────────────
  const total_views = periodViews.length;
  const web_views = periodViews.filter((v) => v.platform === "web").length;
  const mobile_views = periodViews.filter((v) => v.platform === "mobile").length;
  const enquiries = periodEnquiries.length;
  const saves_total = allSaves.length;
  const nda_sigs_total = allNdaSigs.length;
  const engagement_rate =
    total_views > 0 ? Math.round((enquiries / total_views) * 1000) / 10 : 0;

  const durRows = periodViews.filter((v) => v.duration_seconds != null);
  const avg_duration_seconds =
    durRows.length > 0
      ? Math.round(
          durRows.reduce((s, v) => s + (v.duration_seconds ?? 0), 0) /
            durRows.length
        )
      : null;

  const calcTrend = (current: number, previous: number): number | null => {
    if (previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
  };

  const views_trend = calcTrend(total_views, prevViews.length);
  const enquiries_trend = calcTrend(enquiries, prevEnquiries.length);

  // ─── Daily breakdown ─────────────────────────────────────────────
  const dailyMap = new Map<string, { web: number; mobile: number; enquiries: number }>();
  for (let i = 0; i < periodDays; i++) {
    const d = new Date(now.getTime() - i * 86400_000);
    dailyMap.set(d.toISOString().slice(0, 10), { web: 0, mobile: 0, enquiries: 0 });
  }
  for (const v of periodViews) {
    const key = v.viewed_at.slice(0, 10);
    if (dailyMap.has(key)) {
      const day = dailyMap.get(key)!;
      if (v.platform === "web") day.web++;
      else day.mobile++;
    }
  }
  for (const e of periodEnquiries) {
    const key = e.created_at.slice(0, 10);
    if (dailyMap.has(key)) dailyMap.get(key)!.enquiries++;
  }
  const daily: DailyViewStat[] = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, c]) => ({ date, ...c }));

  // ─── Per-listing (all time) ───────────────────────────────────────
  const listingMap = new Map<
    string,
    { web: number; mobile: number; durations: number[]; enquiries: number; saves: number; ndas: number }
  >();
  for (const id of listingIds) {
    listingMap.set(id, { web: 0, mobile: 0, durations: [], enquiries: 0, saves: 0, ndas: 0 });
  }
  for (const v of allViews) {
    const s = listingMap.get(v.listing_id);
    if (!s) continue;
    if (v.platform === "web") s.web++;
    else s.mobile++;
    if (v.duration_seconds != null) s.durations.push(v.duration_seconds);
  }
  for (const e of allEnquiries) {
    const s = listingMap.get(e.listing_id);
    if (s) s.enquiries++;
  }
  for (const f of allSaves) {
    const s = listingMap.get(f.listing_id);
    if (s) s.saves++;
  }
  for (const n of allNdaSigs) {
    const s = listingMap.get(n.listing_id);
    if (s) s.ndas++;
  }

  const per_listing: ListingAnalyticsStat[] = listingIds
    .map((id) => {
      const s = listingMap.get(id)!;
      const meta = listingMeta[id]!;
      const views = s.web + s.mobile;
      return {
        listing_id: id,
        title: meta.title,
        slug: meta.slug,
        views,
        web_views: s.web,
        mobile_views: s.mobile,
        enquiries: s.enquiries,
        saves: s.saves,
        nda_sigs: s.ndas,
        avg_duration:
          s.durations.length > 0
            ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length)
            : null,
        engagement_rate:
          views > 0 ? Math.round((s.enquiries / views) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.views - a.views);

  return {
    total_views,
    web_views,
    mobile_views,
    enquiries,
    avg_duration_seconds,
    engagement_rate,
    views_trend,
    enquiries_trend,
    saves_total,
    nda_sigs_total,
    daily,
    per_listing,
    period_days: periodDays,
  };
}

function emptyOverview(periodDays: number): AnalyticsOverview {
  return {
    total_views: 0,
    web_views: 0,
    mobile_views: 0,
    enquiries: 0,
    avg_duration_seconds: null,
    engagement_rate: 0,
    views_trend: null,
    enquiries_trend: null,
    saves_total: 0,
    nda_sigs_total: 0,
    daily: [],
    per_listing: [],
    period_days: periodDays,
  };
}
