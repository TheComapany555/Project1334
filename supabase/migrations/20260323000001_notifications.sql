-- In-app notification system
CREATE TABLE public.notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type            text NOT NULL
    CHECK (type IN (
      'enquiry_received',
      'enquiry_reply',
      'listing_published',
      'listing_unpublished',
      'payment_received',
      'payment_approved',
      'invoice_requested',
      'subscription_activated',
      'subscription_cancelled',
      'subscription_expiring',
      'broker_joined',
      'broker_removed',
      'agency_approved',
      'general'
    )),
  title           text NOT NULL,
  message         text,
  link            text,               -- optional in-app link (e.g. /dashboard/enquiries)
  is_read         boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread
  ON public.notifications(user_id, is_read)
  WHERE is_read = false;

CREATE INDEX idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
