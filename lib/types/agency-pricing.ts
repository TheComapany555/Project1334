export type AgencyPricingOverride = {
  id: string;
  agency_id: string;
  product_id: string;
  custom_price: number; // cents
  /** Override for tiered_seats plans only. NULL = use product default. */
  custom_extra_seat_price: number | null;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: { id: string; name: string; price: number; currency: string; product_type: string } | null;
};

export type AgencyPricingForAdmin = AgencyPricingOverride & {
  agency?: { id: string; name: string; slug: string | null } | null;
};
