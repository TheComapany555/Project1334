export type ProductStatus = "active" | "inactive";
export type ProductType = "featured" | "listing_tier" | "subscription";
export type FeaturedScope = "homepage" | "category" | "both";

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
  created_at: string;
  updated_at: string;
};
