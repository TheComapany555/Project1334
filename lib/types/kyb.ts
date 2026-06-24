// Know Your Buyer (KYB) — shared types + option maps.
//
// Two records back the feature (see migration 20260624000001):
//   • KybBuyerIdentity   — per-buyer Sumsub identity (KYC) check (reused across listings)
//   • KybListingCompliance — per-(buyer, listing, broker) compliance form
//
// Sensitive PII: these are only ever returned to the owning broker by
// service-role server actions (lib/actions/kyb.ts). Never expose to anon/public.

/** Lifecycle of the buyer's Sumsub identity check. Mirrors the DB CHECK. */
export type KybVerificationStatus =
  | "not_started"
  | "link_sent"
  | "pending"
  | "approved"
  | "rejected"
  | "resubmission_requested"
  | "expired";

export const KYB_STATUS_LABEL: Record<KybVerificationStatus, string> = {
  not_started: "Not started",
  link_sent: "Link sent",
  pending: "In review",
  approved: "Approved",
  rejected: "Rejected",
  resubmission_requested: "Resubmission requested",
  expired: "Link expired",
};

/** Badge tint per status (matches the CRM stage tone convention). */
export const KYB_STATUS_TONE: Record<KybVerificationStatus, string> = {
  not_started: "bg-muted text-muted-foreground border-border",
  link_sent: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  resubmission_requested:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  expired: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300",
};

export type PurchasingStructure =
  | "individual"
  | "company"
  | "trust"
  | "company_as_trustee";

export const PURCHASING_STRUCTURE_OPTIONS: {
  value: PurchasingStructure;
  label: string;
}[] = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
  { value: "trust", label: "Trust" },
  { value: "company_as_trustee", label: "Company as Trustee" },
];

export type SourceOfFunds =
  | "cash"
  | "business_loan"
  | "home_equity"
  | "investor_funds"
  | "seller_finance"
  | "other";

export const SOURCE_OF_FUNDS_OPTIONS: { value: SourceOfFunds; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "business_loan", label: "Business Loan" },
  { value: "home_equity", label: "Home Equity" },
  { value: "investor_funds", label: "Investor Funds" },
  { value: "seller_finance", label: "Seller Finance" },
  { value: "other", label: "Other" },
];

/** Per-buyer Sumsub identity record (table A). */
export type KybBuyerIdentity = {
  id: string;
  broker_id: string;
  contact_id: string;
  buyer_user_id: string | null;
  sumsub_applicant_id: string | null;
  sumsub_external_user_id: string | null;
  verification_status: KybVerificationStatus;
  verification_reference: string | null;
  link_sent_at: string | null;
  verified_at: string | null;
  individual_result: Record<string, unknown> | null;
  verified_dob: string | null;
  verified_address: string | null;
  created_at: string;
  updated_at: string;
};

/** Per-(buyer, listing, broker) compliance form record (table B). */
export type KybListingCompliance = {
  id: string;
  broker_id: string;
  contact_id: string;
  listing_id: string;
  buyer_user_id: string | null;
  full_legal_name: string | null;
  dob: string | null;
  residential_address: string | null;
  purchasing_structure: PurchasingStructure | null;
  company_name: string | null;
  acn_abn: string | null;
  beneficial_owner: string | null;
  source_of_funds: SourceOfFunds | null;
  acting_on_behalf: boolean | null;
  beneficial_owners_offshore: boolean | null;
  is_pep: boolean | null;
  // Phase 2: company (KYB) verification, scoped to this listing's deal.
  sumsub_company_applicant_id: string | null;
  company_verification_status: KybVerificationStatus;
  company_verification_reference: string | null;
  company_link_sent_at: string | null;
  company_verified_at: string | null;
  company_result: Record<string, unknown> | null;
  beneficial_owner_result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

/** Purchasing structures that imply a company/KYB verification is relevant. */
export const COMPANY_STRUCTURES: PurchasingStructure[] = [
  "company",
  "trust",
  "company_as_trustee",
];

/** What the KYB tab reads for a (contact, listing): the form + the buyer's identity. */
export type KybTabData = {
  identity: KybBuyerIdentity | null;
  compliance: KybListingCompliance | null;
  /** True when SUMSUB_COMPANY_LEVEL_NAME is configured (gates the company card). */
  companyAvailable: boolean;
};

/** Editable fields the broker submits from the KYB form (table B columns). */
export type KybComplianceInput = {
  fullLegalName: string;
  dob: string | null;
  residentialAddress: string;
  purchasingStructure: PurchasingStructure | null;
  companyName: string;
  acnAbn: string;
  beneficialOwner: string;
  sourceOfFunds: SourceOfFunds | null;
  actingOnBehalf: boolean | null;
  beneficialOwnersOffshore: boolean | null;
  isPep: boolean | null;
};
