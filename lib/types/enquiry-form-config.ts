export type EnquiryCustomQuestionKind = "text" | "long_text";

export type EnquiryCustomQuestion = {
  id: string;
  label: string;
  required: boolean;
  kind: EnquiryCustomQuestionKind;
};

export type ListingEnquiryFormConfig = {
  listing_id: string;
  show_phone: boolean;
  require_phone: boolean;
  show_reason: boolean;
  show_interest: boolean;
  show_budget: boolean;
  require_budget: boolean;
  show_funding: boolean;
  require_funding: boolean;
  show_industry: boolean;
  require_industry: boolean;
  show_timeframe: boolean;
  require_timeframe: boolean;
  custom_questions: EnquiryCustomQuestion[];
  created_at: string;
  updated_at: string;
};

export const DEFAULT_ENQUIRY_FORM_CONFIG: Omit<
  ListingEnquiryFormConfig,
  "listing_id" | "created_at" | "updated_at"
> = {
  show_phone: true,
  require_phone: false,
  show_reason: true,
  show_interest: true,
  show_budget: false,
  require_budget: false,
  show_funding: false,
  require_funding: false,
  show_industry: false,
  require_industry: false,
  show_timeframe: false,
  require_timeframe: false,
  custom_questions: [],
};

export const MAX_CUSTOM_QUESTIONS = 5;

export const FUNDING_STATUS_OPTIONS = [
  { value: "self_funded", label: "Self-funded" },
  { value: "loan_approved", label: "Loan pre-approved" },
  { value: "loan_pending", label: "Applying for finance" },
  { value: "investor_backed", label: "Investor / partner backed" },
  { value: "not_yet", label: "Not yet arranged" },
] as const;

export const PURCHASE_TIMEFRAME_OPTIONS = [
  { value: "immediate", label: "Ready now" },
  { value: "1_to_3_months", label: "1–3 months" },
  { value: "3_to_6_months", label: "3–6 months" },
  { value: "6_to_12_months", label: "6–12 months" },
  { value: "exploring", label: "Just exploring" },
] as const;
