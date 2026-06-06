/**
 * Listing engagement-ranking recompute. Runs as a background job (GitHub
 * Actions cron), not a request handler — no "use server" directive so it can
 * also be invoked from a plain tsx script outside the Next.js runtime.
 *
 * The heavy lifting is a set-based SQL function
 * (recompute_listing_engagement_scores) so raw event rows never leave the DB.
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";

// Each engagement event loses half its weight every this-many days.
const DEFAULT_HALF_LIFE_DAYS = 14;
// Events older than this are ignored (negligible weight; bounds the scan).
const DEFAULT_WINDOW_DAYS = 60;

export type RankingRunSummary = {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  halfLifeDays: number;
  windowDays: number;
  /** Published listings with a positive score after the run (visibility only). */
  listingsScored: number | null;
  error?: string;
};

export async function runListingRankingRecompute(
  opts: { halfLifeDays?: number; windowDays?: number } = {},
): Promise<RankingRunSummary> {
  const startedAt = new Date().toISOString();
  const halfLifeDays = opts.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS;
  const windowDays = opts.windowDays ?? DEFAULT_WINDOW_DAYS;
  const supabase = createServiceRoleClient();

  const { error } = await supabase.rpc("recompute_listing_engagement_scores", {
    p_half_life_days: halfLifeDays,
    p_window_days: windowDays,
  });

  let listingsScored: number | null = null;
  if (!error) {
    const { count } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gt("engagement_score", 0);
    listingsScored = count ?? 0;
  }

  return {
    ok: !error,
    startedAt,
    finishedAt: new Date().toISOString(),
    halfLifeDays,
    windowDays,
    listingsScored,
    ...(error ? { error: error.message } : {}),
  };
}
