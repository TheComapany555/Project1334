export type ProductStatus = "active" | "inactive";
export type ProductType = "featured" | "listing_tier" | "subscription";
export type FeaturedScope = "homepage" | "category" | "both";
export type PricingModel = "flat" | "tiered_seats";

export const FEATURED_SCOPE_LABELS: Record<FeaturedScope, string> = {
  homepage: "Homepage",
  category: "Category page",
  both: "Homepage + Category",
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number | null;
  product_type: ProductType;
  status: ProductStatus;
  category_id: string | null;
  scope: FeaturedScope | null;
  pricing_model: PricingModel;
  /** Brokers covered by `price` (tiered_seats plans only). */
  included_seats: number | null;
  /** Cents per extra broker per month above included_seats (tiered_seats only). */
  extra_seat_price: number | null;
  /** Display order in the agency-facing plan picker. */
  tier_rank: number | null;
  created_at: string;
  updated_at: string;
};
