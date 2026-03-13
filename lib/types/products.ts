export type ProductStatus = "active" | "inactive";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
};
