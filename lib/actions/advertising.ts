"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { Advertisement, AdPlacement } from "@/lib/types/advertising";

/**
 * Fetch active ads for a given placement.
 * Auto-filters by status, start_date, and end_date (auto-expiry).
 */
export async function getActiveAdsByPlacement(
  placement: AdPlacement
): Promise<Advertisement[]> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("advertisements")
    .select("*")
    .eq("placement", placement)
    .eq("status", "active")
    .lte("start_date", now)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as Advertisement[];
}

/** Increment click count for an ad. */
export async function trackAdClick(
  id: string
): Promise<{ ok: boolean }> {
  const supabase = createServiceRoleClient();

  // Fetch current count, then increment
  const { data: ad } = await supabase
    .from("advertisements")
    .select("click_count")
    .eq("id", id)
    .single();

  if (!ad) return { ok: false };

  const { error } = await supabase
    .from("advertisements")
    .update({ click_count: (ad.click_count ?? 0) + 1 })
    .eq("id", id);

  return { ok: !error };
}
