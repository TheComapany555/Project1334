/**
 * Unified hot-lead scoring.
 *
 * Single source of truth for "is this buyer a hot lead", so the CRM "Hot leads"
 * tab, the buyer-profile badge, and the listing AI "hot buyers" all agree.
 * A hot lead is based on ALL of:
 *   1. Buyer activity     — enquiries, calls, saves, document opens/downloads
 *   2. NDA activity       — requested / signed
 *   3. Listing views      — total views on the broker's listings
 *   4. Broker-applied tags — a "hot"/"vip" tag is an explicit broker signal
 *   5. Engagement history — how recent the engagement is, and how far down the
 *                           pipeline the buyer has progressed
 *
 * Pure functions: callers pass `nowMs` (so this stays deterministic/testable
 * and never calls Date.now() during a React render).
 */
import type { BuyerCrmStatus, HotLeadTier } from "@/lib/types/contacts";

export type { HotLeadTier } from "@/lib/types/contacts";

/** Tag names that count as an explicit broker "hot" flag (case-insensitive). */
export const HOT_LEAD_TAG_NAMES = ["hot lead", "hot", "vip"];

export function hasHotLeadTag(tags: { name: string }[] | null | undefined): boolean {
  return (tags ?? []).some((t) =>
    HOT_LEAD_TAG_NAMES.includes(t.name.trim().toLowerCase()),
  );
}

export type HotLeadSignals = {
  // 3. Listing views
  views: number;
  // 1. Buyer activity
  enquiries: number;
  calls: number;
  saves: number;
  documentViews: number;
  documentDownloads: number;
  // 2. NDA activity
  ndaRequested: boolean;
  ndaSigned: boolean;
  // 4. Broker-applied tags
  hasHotTag: boolean;
  // 5. Engagement history
  pipelineStatus: BuyerCrmStatus | null;
  /** Most recent activity timestamp (ISO). Drives the recency factor. */
  lastActivityAt: string | null;
};

// How far down the pipeline the buyer has progressed (engagement history).
// Terminal outcomes (sold/lost) are 0 — neither is an active hot lead to chase.
const STAGE_BONUS: Record<BuyerCrmStatus, number> = {
  new_lead: 0,
  contacted: 2,
  interested: 5,
  meeting_scheduled: 8,
  nda_signed: 10,
  know_your_buyer: 11,
  documents_shared: 12,
  negotiating: 16,
  sold: 0,
  lost: 0,
};

export const HOT_LEAD_THRESHOLDS = { hot: 30, warm: 12 } as const;

/**
 * Recency-weighted engagement score. Higher = hotter. `nowMs` is the current
 * epoch ms (passed in for purity).
 */
export function computeHotLeadScore(s: HotLeadSignals, nowMs: number): number {
  let activity = 0;

  // 3. Listing views (capped so a serial refresher can't dominate).
  activity += Math.min(s.views, 12) * 1;

  // 1. Buyer activity.
  activity += s.enquiries * 8;
  activity += s.calls * 5;
  activity += s.saves * 4;
  activity += s.documentViews * 4;
  activity += s.documentDownloads * 6; // downloads outweigh views — they kept the file

  // 2. NDA activity.
  if (s.ndaRequested) activity += 6;
  if (s.ndaSigned) activity += 12;

  // 5. Engagement history — pipeline progression.
  activity += s.pipelineStatus ? STAGE_BONUS[s.pipelineStatus] ?? 0 : 0;

  // 5. Engagement history — recency. Recent engagement keeps a lead hot;
  // stale activity cools it. No timestamp → neutral.
  const score = activity * recencyMultiplier(s.lastActivityAt, nowMs);

  // 4. Broker-applied tag — an explicit signal from the person who knows the
  // deal. Strong additive boost on top of the behavioural score.
  return s.hasHotTag ? score + 40 : score;
}

function recencyMultiplier(lastActivityAt: string | null, nowMs: number): number {
  if (!lastActivityAt) return 1;
  const t = new Date(lastActivityAt).getTime();
  if (!Number.isFinite(t)) return 1;
  const days = (nowMs - t) / 86_400_000;
  if (days <= 7) return 1.25;
  if (days <= 30) return 1;
  if (days <= 90) return 0.6;
  return 0.35;
}

export function classifyHotLead(score: number, hasHotTag: boolean): HotLeadTier {
  // Broker override always wins — an explicit "hot" tag means hot.
  if (hasHotTag) return "hot";
  if (score >= HOT_LEAD_THRESHOLDS.hot) return "hot";
  if (score >= HOT_LEAD_THRESHOLDS.warm) return "warm";
  return "cold";
}

/** Convenience: signals → tier in one call. */
export function tierForSignals(s: HotLeadSignals, nowMs: number): HotLeadTier {
  return classifyHotLead(computeHotLeadScore(s, nowMs), s.hasHotTag);
}

export const HOT_LEAD_TIER_LABEL: Record<HotLeadTier, string> = {
  hot: "Hot lead",
  warm: "Warm",
  cold: "New interest",
};

export const HOT_LEAD_TIER_TONE: Record<HotLeadTier, string> = {
  hot: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warm: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  cold: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
};
