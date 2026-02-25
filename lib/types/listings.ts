export type ListingStatus = "draft" | "published" | "under_offer" | "sold" | "unpublished";
export type PriceType = "fixed" | "poa";

export type Category = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sort_order: number;
};

export type ListingHighlight = {
  id: string;
  label: string;
  accent: "primary" | "secondary" | "warning";
  active: boolean;
};

export type ListingImage = {
  id: string;
  listing_id: string;
  url: string;
  sort_order: number;
};

export type Listing = {
  id: string;
  broker_id: string;
  slug: string;
  title: string;
  category_id: string | null;
  location_text: string | null;
  state: string | null;
  suburb: string | null;
  postcode: string | null;
  asking_price: number | null;
  price_type: PriceType;
  revenue: number | null;
  profit: number | null;
  lease_details: string | null;
  summary: string | null;
  description: string | null;
  status: ListingStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  listing_images?: ListingImage[];
  listing_highlights?: ListingHighlight[];
};

/** For broker's own listing edit - includes highlight_ids for form. */
export type ListingForEdit = Listing & { highlight_ids?: string[] };

export type ListingFormData = {
  title: string;
  category_id: string | null;
  location_text: string | null;
  state: string | null;
  suburb: string | null;
  postcode: string | null;
  asking_price: number | null;
  price_type: PriceType;
  revenue: number | null;
  profit: number | null;
  lease_details: string | null;
  summary: string | null;
  description: string | null;
  highlight_ids: string[];
};
