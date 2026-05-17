export type ListingStatus = "draft" | "published" | "under_offer" | "sold" | "unpublished";
export type PriceType = "fixed" | "poa";
export type ListingTier = "basic" | "standard" | "featured";

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
  agency_id: string | null;
  slug: string;
  title: string;
  category_id: string | null;
  location_text: string | null;
  state: string | null;
  suburb: string | null;
  postcode: string | null;
  region: string | null;
  asking_price: number | null;
  price_type: PriceType;
  revenue: number | null;
  profit: number | null;
  lease_details: string | null;
  summary: string | null;
  description: string | null;
  status: ListingStatus;
  listing_tier: ListingTier;
  tier_product_id: string | null;
  tier_paid_at: string | null;
  is_featured: boolean;
  featured_from: string | null;
  featured_until: string | null;
  featured_package_days: number | null;
  featured_scope: "homepage" | "category" | "both" | null;
  featured_homepage_until: string | null;
  featured_category_until: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  listing_images?: ListingImage[];
  listing_highlights?: ListingHighlight[];
  broker?: { name: string | null; photo_url: string | null };
  agency?: { name: string; slug: string | null; logo_url: string | null } | null;
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
  region: string | null;
  asking_price: number | null;
  price_type: PriceType;
  revenue: number | null;
  profit: number | null;
  lease_details: string | null;
  summary: string | null;
  description: string | null;
  highlight_ids: string[];
};

export const SUGGESTED_REGIONS: { value: string; label: string; state?: string }[] = [
  { value: "Sydney", label: "Sydney", state: "NSW" },
  { value: "North Shore", label: "North Shore (Sydney)", state: "NSW" },
  { value: "Western Sydney", label: "Western Sydney", state: "NSW" },
  { value: "Eastern Suburbs", label: "Eastern Suburbs (Sydney)", state: "NSW" },
  { value: "Inner West", label: "Inner West (Sydney)", state: "NSW" },
  { value: "Northern Beaches", label: "Northern Beaches (Sydney)", state: "NSW" },
  { value: "Regional NSW", label: "Regional NSW", state: "NSW" },
  { value: "Newcastle / Hunter", label: "Newcastle / Hunter", state: "NSW" },
  { value: "Central Coast", label: "Central Coast", state: "NSW" },
  { value: "Wollongong / Illawarra", label: "Wollongong / Illawarra", state: "NSW" },

  { value: "Brisbane", label: "Brisbane", state: "QLD" },
  { value: "Gold Coast", label: "Gold Coast", state: "QLD" },
  { value: "Sunshine Coast", label: "Sunshine Coast", state: "QLD" },
  { value: "Regional QLD", label: "Regional QLD", state: "QLD" },

  { value: "Melbourne", label: "Melbourne", state: "VIC" },
  { value: "Regional VIC", label: "Regional VIC", state: "VIC" },
  { value: "Geelong / Bellarine", label: "Geelong / Bellarine", state: "VIC" },

  { value: "Adelaide", label: "Adelaide", state: "SA" },
  { value: "Regional SA", label: "Regional SA", state: "SA" },

  { value: "Perth", label: "Perth", state: "WA" },
  { value: "Regional WA", label: "Regional WA", state: "WA" },

  { value: "Hobart", label: "Hobart", state: "TAS" },
  { value: "Regional TAS", label: "Regional TAS", state: "TAS" },

  { value: "Canberra / ACT", label: "Canberra / ACT", state: "ACT" },
  { value: "Darwin / NT", label: "Darwin / NT", state: "NT" },
];
