-- Tier B / Feature #8: Support Ticket System.
--
-- Brokers raise support tickets to the admin/support team. Each ticket is a
-- thread of messages (support_ticket_messages). Admins can reply, leave
-- internal-only notes, assign tickets, and move them through a status workflow.
-- Emails: one confirmation to the submitter on creation + a notification to
-- admins; ongoing updates use in-app notifications (no email spam to the
-- submitter — see the client's decision).

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Human-friendly sequential reference shown in the UI/emails (e.g. "#1042").
  ticket_no         bigint GENERATED ALWAYS AS IDENTITY,
  broker_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject           text NOT NULL,
  category          text NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'technical', 'billing', 'listings', 'account', 'other')),
  priority          text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status            text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'awaiting_reply', 'resolved', 'closed')),
  assigned_admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_message_at   timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_ticket_no ON public.support_tickets(ticket_no);
CREATE INDEX IF NOT EXISTS idx_support_tickets_broker   ON public.support_tickets(broker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status   ON public.support_tickets(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_admin_id);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
-- Service-role only — server actions enforce "broker owns ticket" and "admin only".

COMMENT ON TABLE public.support_tickets IS
  'Feature #8: broker → admin support tickets. Thread lives in support_ticket_messages. Statuses: open|in_progress|awaiting_reply|resolved|closed.';

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_role  text NOT NULL CHECK (sender_role IN ('broker', 'admin')),
  body         text NOT NULL,
  -- Internal admin-only notes are never shown to the broker.
  is_internal  boolean NOT NULL DEFAULT false,
  attachments  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket
  ON public.support_ticket_messages(ticket_id, created_at);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
-- Service-role only.

COMMENT ON TABLE public.support_ticket_messages IS
  'Feature #8: messages within a support ticket. is_internal = admin-only note, never returned to the broker.';

-- updated_at trigger (reuses the shared function).
DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_data_room();

-- In-app notifications for ticket lifecycle events.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    -- Pre-existing
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
    'general',
    -- M1.2 (CRM)
    'follow_up_due',
    'email_received',
    'feedback_logged',
    -- M1.3 (messaging)
    'message_received',
    'message_sent',
    -- M2.2 (Virtual Data Room)
    'data_room_request',
    'data_room_view',
    'data_room_download',
    'access_approved',
    'access_expiring',
    'access_expired',
    'new_files_added',
    -- Tier B / Feature #6 (listing assignment)
    'listing_assigned',
    -- Tier B / Feature #8 (support tickets)
    'ticket_created',
    'ticket_reply',
    'ticket_status_changed',
    'ticket_assigned'
  ));
