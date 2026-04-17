export type EnquiryReason =
  | "general"
  | "request_viewing"
  | "make_offer"
  | "request_callback"
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
  interest: string | null;
  consent_marketing: boolean;
  created_at: string;
};

export type EnquiryWithListing = Enquiry & {
  listing?: { id: string; title: string; slug: string; category?: { id: string; name: string } | null } | null;
};

export type EnquiryWithListingAndBroker = EnquiryWithListing & {
  broker?: { id: string; name: string | null; company: string | null } | null;
};

export const ENQUIRY_REASON_LABELS: Record<string, string> = {
  general: "General enquiry",
  request_viewing: "Request viewing",
  make_offer: "Make an offer",
  request_callback: "Request call back",
  other: "Other",
};
