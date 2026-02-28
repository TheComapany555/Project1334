export type EnquiryReason =
  | "general"
  | "request_viewing"
  | "make_offer"
  | "other";

export type Enquiry = {
  id: string;
  listing_id: string;
  broker_id: string;
  reason: string | null;
  message: string;
  contact_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  created_at: string;
};

export type EnquiryWithListing = Enquiry & {
  listing?: { id: string; title: string; slug: string } | null;
};

export type EnquiryWithListingAndBroker = EnquiryWithListing & {
  broker?: { id: string; name: string | null; company: string | null } | null;
};

export const ENQUIRY_REASON_LABELS: Record<string, string> = {
  general: "General enquiry",
  request_viewing: "Request viewing",
  make_offer: "Make an offer",
  other: "Other",
};
