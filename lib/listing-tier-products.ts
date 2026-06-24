import type { Product } from "@/lib/types/products";
import type { ListingTier } from "@/lib/types/listings";

/** Map a listing tier to the admin product name needle (seed names are stable). */
function tierNeedle(tier: ListingTier): string {
  if (tier === "basic") return "basic";
  if (tier === "standard") return "standard";
  return "featured";
}

/**
 * Match an active listing_tier product to a tier slot by name.
 * Prefer exact tier words so "Featured Listing Tier" never matches "standard".
 */
export function matchTierProduct(
  products: Product[],
  tier: ListingTier,
): Product | null {
  const needle = tierNeedle(tier);
  return (
    products.find((p) => {
      const name = p.name.toLowerCase();
      if (needle === "featured") {
        return name.includes("featured");
      }
      if (needle === "standard") {
        return name.includes("standard") && !name.includes("featured");
      }
      return name.includes("basic");
    }) ?? null
  );
}

/** Derive tier slug from a paid product name (used in Stripe metadata). */
export function listingTierFromProductName(productName: string): ListingTier {
  const name = productName.toLowerCase();
  if (name.includes("featured")) return "featured";
  if (name.includes("standard")) return "standard";
  return "basic";
}
