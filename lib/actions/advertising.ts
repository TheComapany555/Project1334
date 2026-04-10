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

/** Increment click count for an ad atomically via RPC (avoids read-then-write race). */
export async function trackAdClick(
  id: string
): Promise<{ ok: boolean }> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.rpc("increment_ad_click", { ad_id: id });

  if (error) {
    // Fallback if RPC not yet deployed: read-then-write
    const { data: ad } = await supabase
      .from("advertisements")
      .select("click_count")
      .eq("id", id)
      .single();
    if (!ad) return { ok: false };
    const { error: updateErr } = await supabase
      .from("advertisements")
      .update({ click_count: (ad.click_count ?? 0) + 1 })
      .eq("id", id);
    return { ok: !updateErr };
  }

  return { ok: true };
}
