/** Pure helpers for scoped featured windows (no React / UI imports). */

export function isFeaturedNow(featuredUntil: string | null | undefined): boolean {
  if (!featuredUntil) return false;
  return new Date(featuredUntil) > new Date();
}

export type FeaturedTimestamps = {
  featured_homepage_until?: string | null;
  featured_category_until?: string | null;
  featured_until?: string | null;
};

export function isHomepageFeaturedNow(t: FeaturedTimestamps): boolean {
  return isFeaturedNow(t.featured_homepage_until ?? null);
}

export function isCategoryFeaturedNow(t: FeaturedTimestamps): boolean {
  return isFeaturedNow(t.featured_category_until ?? null);
}

export function isListingFeaturedAnywhere(t: FeaturedTimestamps): boolean {
  return (
    isHomepageFeaturedNow(t) ||
    isCategoryFeaturedNow(t) ||
    isFeaturedNow(t.featured_until ?? null)
  );
}

export function isFeaturedBadgeForBrowseSurface(
  t: FeaturedTimestamps,
  surface: "homepage" | "category",
): boolean {
  if (surface === "category") return isCategoryFeaturedNow(t);
  return isHomepageFeaturedNow(t);
}
