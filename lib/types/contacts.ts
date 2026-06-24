export type ContactSource = "enquiry" | "manual" | "share" | "import";
export type ConsentSource = "enquiry" | "manual" | "share" | "import";

/** Hot-lead tier from the unified scorer (see lib/crm/hot-lead.ts). */
export type HotLeadTier = "hot" | "warm" | "cold";

/** How a contact entered the CRM — human label for "why are they here". */
export const CONTACT_SOURCE_LABEL: Record<ContactSource, string> = {
  enquiry: "Enquiry",
  manual: "Added manually",
  share: "Listing shared",
  import: "Imported",
};

export type TagColor =
  | "primary"
  | "secondary"
  | "warning"
  | "success"
  | "danger"
  | "neutral";

export const TAG_COLOR_CLASSES: Record<TagColor, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-secondary text-secondary-foreground border-border",
  warning: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
  success: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
  danger: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50",
  neutral: "bg-muted text-muted-foreground border-border",
};

export const TAG_COLOR_OPTIONS: { value: TagColor; label: string }[] = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "danger", label: "Danger" },
  { value: "neutral", label: "Neutral" },
];

export type ContactTag = {
  id: string;
  broker_id: string;
  name: string;
  color: TagColor;
  created_at: string;
};

export type BrokerContact = {
  id: string;
  broker_id: string;
  buyer_user_id: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
  interest: string | null;
  source: ContactSource;
  consent_marketing: boolean;
  consent_given_at: string | null;
  consent_source: ConsentSource | null;
  enquiry_id: string | null;
  /** Pipeline status added in M1.1 (default 'new_lead'). */
  status: BuyerCrmStatus | null;
  last_emailed_at: string | null;
  last_called_at: string | null;
  last_contacted_at: string | null;
  first_interaction_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  tags: ContactTag[];
  /** Joined from `profiles` when the contact is a registered buyer. */
  buyer_budget_min?: number | null;
  buyer_budget_max?: number | null;
  /** Distinct category_ids of broker-owned listings this contact has interacted with. */
  interacted_category_ids?: string[];
  /**
   * Highest data-room access state this contact has reached across any of the
   * broker's listings. "none" = no record; otherwise the strongest state.
   */
  nda_state?: "none" | "pending" | "approved" | "denied" | "revoked" | "expired";
  /**
   * Listings this buyer is linked to — listings they enquired on and/or that
   * the broker set a per-listing pipeline stage on — each with that stage.
   * Lets the CRM list show "what listing they're interested in" and "what
   * stage they're at for each listing" without opening the profile.
   */
  linked_listings?: {
    listing_id: string;
    title: string;
    slug: string;
    stage: BuyerCrmStatus | null;
  }[];
  /**
   * Title of the listing that brought this contact into the CRM (the
   * originating enquiry's listing). Null for manual/import/share contacts.
   * Answers "why are they in the CRM".
   */
  reason_listing_title?: string | null;
  /**
   * Unified hot-lead tier — combines buyer activity, NDA activity, listing
   * views, broker-applied tags, and engagement history (recency + pipeline
   * stage). Computed server-side by listBrokerContacts. See lib/crm/hot-lead.ts.
   */
  hot_tier?: HotLeadTier;
  /** Raw hot-lead score behind `hot_tier` (for sorting/debugging). */
  hot_score?: number;
};

export type BuyerCrmStatus =
  | "new_lead"
  | "contacted"
  | "interested"
  | "meeting_scheduled"
  | "nda_signed"
  | "know_your_buyer"
  | "documents_shared"
  | "negotiating"
  | "sold"
  | "lost";

/** Pipeline stages in progression order, with the two terminal outcomes last. */
export const BUYER_CRM_STATUSES: BuyerCrmStatus[] = [
  "new_lead",
  "contacted",
  "interested",
  "meeting_scheduled",
  "nda_signed",
  "know_your_buyer",
  "documents_shared",
  "negotiating",
  "sold",
  "lost",
];

/** Rank for "advance only, never auto-demote" comparisons. */
export const BUYER_CRM_STATUS_ORDER: Record<BuyerCrmStatus, number> =
  BUYER_CRM_STATUSES.reduce(
    (acc, s, i) => {
      acc[s] = i;
      return acc;
    },
    {} as Record<BuyerCrmStatus, number>,
  );

/** Display labels, shared across CRM table, buyer profile, and slide-out panel. */
export const BUYER_CRM_STATUS_LABEL: Record<BuyerCrmStatus, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  interested: "Interested",
  meeting_scheduled: "Meeting scheduled",
  nda_signed: "NDA Signed",
  know_your_buyer: "Know Your Buyer",
  documents_shared: "Documents shared",
  negotiating: "Negotiating",
  sold: "Sold",
  lost: "Lost",
};

/** Badge/select tint per stage. */
export const BUYER_CRM_STATUS_TONE: Record<BuyerCrmStatus, string> = {
  new_lead: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  contacted: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  interested: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  meeting_scheduled: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  nda_signed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  know_your_buyer: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  documents_shared: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  negotiating: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  sold: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  lost: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};
