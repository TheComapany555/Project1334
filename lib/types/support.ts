export type SupportTicketCategory =
  | "general"
  | "technical"
  | "billing"
  | "listings"
  | "account"
  | "other";

export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";

export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "awaiting_reply"
  | "resolved"
  | "closed";

export type SupportTicketSenderRole = "broker" | "admin";

export type SupportTicket = {
  id: string;
  ticket_no: number;
  broker_id: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assigned_admin_id: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
};

export type SupportTicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_role: SupportTicketSenderRole;
  body: string;
  is_internal: boolean;
  attachments: unknown[];
  created_at: string;
};

/** Ticket row enriched for list/detail views. */
export type SupportTicketWithMeta = SupportTicket & {
  broker?: { name: string | null; photo_url: string | null } | null;
  assigned_admin?: { name: string | null } | null;
  message_count?: number;
};

export type SupportTicketDetail = SupportTicket & {
  broker?: { name: string | null; photo_url: string | null; email?: string | null } | null;
  assigned_admin?: { name: string | null } | null;
  messages: SupportTicketMessage[];
};

// ── Display metadata (shared by broker + admin UIs) ──

export const TICKET_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  general: "General",
  technical: "Technical",
  billing: "Billing",
  listings: "Listings",
  account: "Account",
  other: "Other",
};

export const TICKET_PRIORITY_LABELS: Record<SupportTicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  awaiting_reply: "Awaiting reply",
  resolved: "Resolved",
  closed: "Closed",
};

/** Status transitions the admin can apply from a given status. */
export const TICKET_STATUS_TRANSITIONS: Record<
  SupportTicketStatus,
  SupportTicketStatus[]
> = {
  open: ["in_progress", "awaiting_reply", "resolved", "closed"],
  in_progress: ["awaiting_reply", "resolved", "closed"],
  awaiting_reply: ["in_progress", "resolved", "closed"],
  resolved: ["in_progress", "closed"],
  closed: ["in_progress"],
};
