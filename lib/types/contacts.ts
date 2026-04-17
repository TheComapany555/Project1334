export type ContactSource = "enquiry" | "manual" | "share" | "import";
export type ConsentSource = "enquiry" | "manual" | "share" | "import";

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
  created_at: string;
  updated_at: string;
  tags: ContactTag[];
};
