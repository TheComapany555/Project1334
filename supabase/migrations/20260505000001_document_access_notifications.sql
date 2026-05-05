-- Allow in-app notifications when a buyer requests confidential document access via NDA flow.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'enquiry_received',
    'enquiry_reply',
    'enquiry_sent',
    'listing_published',
    'listing_unpublished',
    'listing_shared',
    'listing_alert_match',
    'payment_received',
    'payment_approved',
    'invoice_requested',
    'subscription_activated',
    'subscription_cancelled',
    'subscription_expiring',
    'broker_joined',
    'broker_removed',
    'agency_approved',
    'document_access_requested',
    'general'
  ));
