import { cache } from "react";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Global "is billing switched on?" flag, the client's free-mode switch.
 *
 * Reads `site_settings.billing_enabled` (migration 20260910000001). When it is
 * false the platform is in FREE MODE: the agency subscription gate, the
 * per-listing tier paywall and the Basic-tier marketplace exclusion are all
 * bypassed, and the subscribe/payments/featured-upgrade surfaces are hidden.
 * Nothing is deleted; flipping the switch back on from /admin/settings
 * restores every paywall exactly as it was.
 *
 * Deliberately FAILS OPEN TO FREE: if the column/migration is missing or the
 * read errors, this returns `false` (free mode). The client explicitly asked
 * for the platform to be free now, and recent migrations have a history of
 * lagging behind deploys, so a deploy ahead of the migration still delivers
 * the free platform; only the admin switch is unavailable until it's applied.
 * (Opposite polarity to `getBasicListingsSearchable`, which fails closed.)
 *
 * Wrapped in React `cache()` so the layout, server actions and search that run
 * within one request share a single DB round-trip.
 */
export const isBillingEnabled = cache(async (): Promise<boolean> => {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("billing_enabled")
      .eq("id", true)
      .maybeSingle();
    if (error || !data) return false;
    return data.billing_enabled === true;
  } catch {
    return false;
  }
});

/**
 * Global "promote Featured listings?" flag (migration 20260917000001).
 *
 * The client wants to keep earning from Featured placements while the rest of
 * the platform runs free. When this is true the featured upsell is live even
 * though `isBillingEnabled()` is false: brokers get a one-time dialog after
 * publishing a listing, and the /feature purchase page stays open.
 *
 * Deliberately FAILS CLOSED (missing column/read error => false) so a deploy
 * ahead of the migration keeps the quiet free-mode experience rather than
 * surprising brokers with an unexpected sales dialog.
 *
 * Cached per request, same as `isBillingEnabled`.
 */
export const isFeaturedPromoted = cache(async (): Promise<boolean> => {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("promote_featured")
      .eq("id", true)
      .maybeSingle();
    if (error || !data) return false;
    return data.promote_featured === true;
  } catch {
    return false;
  }
});

/**
 * True when featured upgrades should be purchasable at all: either normal
 * billing is on, or the client has switched on the free-mode Featured upsell.
 * This is the single check every featured surface should use.
 */
export const canSellFeatured = cache(async (): Promise<boolean> => {
  const [billing, promoted] = await Promise.all([
    isBillingEnabled(),
    isFeaturedPromoted(),
  ]);
  return billing || promoted;
});
