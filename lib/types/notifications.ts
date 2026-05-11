export type NotificationType =
  // Pre-existing
  | "enquiry_received"
  | "enquiry_reply"
  | "enquiry_sent"
  | "listing_published"
  | "listing_unpublished"
  | "listing_shared"
  | "listing_alert_match"
  | "payment_received"
  | "payment_approved"
  | "invoice_requested"
  | "subscription_activated"
  | "subscription_cancelled"
  | "subscription_expiring"
  | "broker_joined"
  | "broker_removed"
  | "agency_approved"
  | "document_access_requested"
  | "general"
  // M1.2 (CRM)
  | "follow_up_due"
  | "email_received"
  | "feedback_logged"
  // M1.3 (messaging)
  | "message_received"
  | "message_sent"
  // M2.2 (data room)
  | "data_room_request"
  | "data_room_view"
  | "data_room_download"
  | "access_approved"
  | "access_expiring"
  | "access_expired"
  | "new_files_added";

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
