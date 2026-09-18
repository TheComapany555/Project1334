/** Managed-onboarding requests: brokers asking the Salebiz team to set them up. */

export type OnboardingRequestStatus =
  | "new"
  | "contacted"
  | "in_progress"
  | "completed"
  | "declined";

export const ONBOARDING_STATUS_LABELS: Record<
  OnboardingRequestStatus,
  string
> = {
  new: "New",
  contacted: "Contacted",
  in_progress: "In progress",
  completed: "Completed",
  declined: "Declined",
};

/** Rough size bands, so we can triage without asking for exact numbers. */
export const LISTING_COUNT_OPTIONS = [
  { value: "none", label: "Not listing yet" },
  { value: "1-5", label: "1–5 businesses" },
  { value: "6-20", label: "6–20 businesses" },
  { value: "21-50", label: "21–50 businesses" },
  { value: "50+", label: "More than 50" },
] as const;

export type ListingCountBand = (typeof LISTING_COUNT_OPTIONS)[number]["value"];

export const LISTING_COUNT_LABELS: Record<string, string> = Object.fromEntries(
  LISTING_COUNT_OPTIONS.map((o) => [o.value, o.label]),
);

export type OnboardingRequest = {
  id: string;
  request_no: number;
  name: string;
  email: string;
  phone: string | null;
  agency_name: string | null;
  listing_count: string | null;
  message: string | null;
  profile_id: string | null;
  status: OnboardingRequestStatus;
  admin_notes: string | null;
  handled_by: string | null;
  created_at: string;
  updated_at: string;
};
