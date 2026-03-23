export type NotificationType =
  | "enquiry_received"
  | "enquiry_reply"
  | "listing_published"
  | "listing_unpublished"
  | "payment_received"
  | "payment_approved"
  | "invoice_requested"
  | "subscription_activated"
  | "subscription_cancelled"
  | "subscription_expiring"
  | "broker_joined"
  | "broker_removed"
  | "agency_approved"
  | "general";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};
