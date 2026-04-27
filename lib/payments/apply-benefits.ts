import type { createServiceRoleClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createServiceRoleClient>;

/**
 * Set scope-aware featured timestamps on a listing without clobbering an
 * existing scope. e.g. paying for "category" while "homepage" is still active
 * extends category only. is_featured is true if either scope is still active;
 * featured_until is the latest end date (legacy / analytics).
 */
export async function applyFeaturedToListing(
  supabase: SupabaseAdmin,
  listingId: string,
  packageDays: number,
  scope: "homepage" | "category" | "both"
) {
  const now = new Date();

  const { data: listing } = await supabase
    .from("listings")
    .select(
      "featured_homepage_until, featured_category_until, featured_scope"
    )
    .eq("id", listingId)
    .single();

  const homepageBase =
    listing?.featured_homepage_until &&
    new Date(listing.featured_homepage_until) > now
      ? new Date(listing.featured_homepage_until)
      : now;
  const categoryBase =
    listing?.featured_category_until &&
    new Date(listing.featured_category_until) > now
      ? new Date(listing.featured_category_until)
      : now;

  const newHomepage = new Date(
    homepageBase.getTime() + packageDays * 24 * 60 * 60 * 1000
  );
  const newCategory = new Date(
    categoryBase.getTime() + packageDays * 24 * 60 * 60 * 1000
  );

  const payload: Record<string, unknown> = {
    featured_from: now.toISOString(),
    featured_package_days: packageDays,
    featured_scope: scope,
  };

  if (scope === "homepage") {
    payload.featured_homepage_until = newHomepage.toISOString();
  } else if (scope === "category") {
    payload.featured_category_until = newCategory.toISOString();
  } else {
    payload.featured_homepage_until = newHomepage.toISOString();
    payload.featured_category_until = newCategory.toISOString();
  }

  const finalHp =
    scope === "homepage" || scope === "both"
      ? newHomepage.toISOString()
      : listing?.featured_homepage_until ?? null;
  const finalCat =
    scope === "category" || scope === "both"
      ? newCategory.toISOString()
      : listing?.featured_category_until ?? null;

  const hpMs = finalHp ? new Date(finalHp).getTime() : 0;
  const catMs = finalCat ? new Date(finalCat).getTime() : 0;
  payload.is_featured = hpMs > now.getTime() || catMs > now.getTime();
  const stampTimes = [hpMs, catMs].filter((t) => t > 0);
  payload.featured_until =
    stampTimes.length > 0
      ? new Date(Math.max(...stampTimes)).toISOString()
      : null;

  await supabase.from("listings").update(payload).eq("id", listingId);
}

/**
 * Apply a listing-tier purchase: mark payment paid, publish listing with the
 * paid tier, and apply featured timestamps if the tier is "featured".
 */
export async function applyListingTierBenefits(
  supabase: SupabaseAdmin,
  metadata: Record<string, string> | null | undefined
) {
  if (!metadata) return;

  const paymentId = metadata.payment_id;
  const listingId = metadata.listing_id;
  const listingTier = metadata.listing_tier || "standard";
  const packageDays = Number(metadata.package_days ?? 0);

  if (paymentId) {
    await supabase
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", paymentId);
  }

  if (listingId) {
    const now = new Date();

    const { data: existingListing } = await supabase
      .from("listings")
      .select("published_at")
      .eq("id", listingId)
      .single();

    const payload: Record<string, unknown> = {
      listing_tier: listingTier,
      tier_paid_at: now.toISOString(),
      status: "published",
      published_at: existingListing?.published_at ?? now.toISOString(),
    };

    await supabase.from("listings").update(payload).eq("id", listingId);

    if (listingTier === "featured" && packageDays > 0) {
      const scope =
        (metadata.featured_scope as "homepage" | "category" | "both" | undefined) ??
        "homepage";
      await applyFeaturedToListing(supabase, listingId, packageDays, scope);
    }
  }
}
