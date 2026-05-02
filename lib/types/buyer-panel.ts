/** Shape of a single saved listing row shown in the buyer side panel. */
export type BuyerSavedListing = {
  id: string;
  slug: string;
  title: string;
  location_text: string | null;
  asking_price: number | null;
  price_type: "fixed" | "poa";
  cover_image_url: string | null;
  saved_at: string;
};

/** Shape of a single enquiry shown to the buyer in "My enquiries". */
export type BuyerEnquiryRow = {
  id: string;
  created_at: string;
  reason: string | null;
  message: string;
  status: "sent" | "viewed" | "replied" | "closed";
  listing: {
    id: string;
    slug: string;
    title: string;
    cover_image_url: string | null;
  } | null;
};

/** Shape of a listing a broker pushed directly to the buyer (share invites). */
export type BuyerSentToMeRow = {
  invite_id: string;
  token: string;
  custom_message: string | null;
  sent_at: string;
  expires_at: string;
  opened_at: string | null;
  broker_name: string | null;
  listing: {
    id: string;
    slug: string;
    title: string;
    cover_image_url: string | null;
    asking_price: number | null;
    price_type: "fixed" | "poa";
    location_text: string | null;
  } | null;
};

/** A listing the cron job matched against one of the buyer's alert preferences. */
export type BuyerMatchedListing = {
  match_id: string;
  matched_at: string;
  preference_label: string | null;
  matched_for: string | null;
  listing: {
    id: string;
    slug: string;
    title: string;
    cover_image_url: string | null;
    asking_price: number | null;
    price_type: "fixed" | "poa";
    location_text: string | null;
    published_at: string | null;
  } | null;
};

export type BuyerAlertPreference = {
  id: string;
  user_id: string;
  label: string | null;
  business_type: string | null;
  category_id: string | null;
  category_name: string | null;
  state: string | null;
  suburb: string | null;
  min_price: number | null;
  max_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Aggregate snapshot used to render the right-hand profile panel. */
export type BuyerPanelSnapshot = {
  saved: {
    items: BuyerSavedListing[];
    total: number;
  };
  enquiries: {
    items: BuyerEnquiryRow[];
    total: number;
  };
  sentToMe: {
    items: BuyerSentToMeRow[];
    total: number;
  };
  matched: {
    items: BuyerMatchedListing[];
    total: number;
  };
  alerts: BuyerAlertPreference[];
};
