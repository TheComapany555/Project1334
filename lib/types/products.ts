export type ProductStatus = "active" | "inactive";
export type ProductType = "featured" | "listing_tier" | "subscription";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number | null;
  product_type: ProductType;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
};
