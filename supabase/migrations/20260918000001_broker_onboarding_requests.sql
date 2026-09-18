-- Broker onboarding requests ("we manage onboarding for you").
--
-- A broker who would rather not set the account up themselves submits this
-- form; the Salebiz team does the onboarding for them. Unlike support_tickets
-- these come from people who usually have NO account yet, so there is no
-- profile FK — contact details are captured as plain columns.
--
-- Emails on submit: one confirmation to the requester + one notification to
-- admins (mirrors the support-ticket decision: no ongoing email spam).

CREATE TABLE IF NOT EXISTS public.broker_onboarding_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Human-friendly sequential reference shown in the UI and emails.
  request_no      bigint GENERATED ALWAYS AS IDENTITY,

  -- Contact details. No FK: the requester typically has no account yet.
  name            text NOT NULL,
  email           text NOT NULL,
  phone           text,
  agency_name     text,
  listing_count   text,
  message         text,

  -- If a signed-in broker submitted it, link them for context (optional).
  profile_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  status          text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'in_progress', 'completed', 'declined')),

  -- Internal admin-only notes; never returned to the requester.
  admin_notes     text,
  handled_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_broker_onboarding_requests_no
  ON public.broker_onboarding_requests(request_no);
CREATE INDEX IF NOT EXISTS idx_broker_onboarding_requests_status
  ON public.broker_onboarding_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broker_onboarding_requests_email
  ON public.broker_onboarding_requests(email);

ALTER TABLE public.broker_onboarding_requests ENABLE ROW LEVEL SECURITY;
-- Service-role only: the public form writes through a server action that
-- rate-limits and verifies reCAPTCHA. No anon SELECT policy — these rows hold
-- contact details and must never be readable by the public path.

COMMENT ON TABLE public.broker_onboarding_requests IS
  'Brokers requesting managed onboarding ("we set it up for you"). Public form -> server action; admin list at /admin/onboarding-requests. Statuses: new|contacted|in_progress|completed|declined.';

-- updated_at trigger (reuses the shared function used by support_tickets).
DROP TRIGGER IF EXISTS trg_broker_onboarding_requests_updated_at
  ON public.broker_onboarding_requests;
CREATE TRIGGER trg_broker_onboarding_requests_updated_at
  BEFORE UPDATE ON public.broker_onboarding_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_data_room();

-- In-app notification type for a new managed-onboarding request.
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
    'ticket_assigned',
    -- KYB / Know Your Buyer
    'kyb_verification_complete',
    -- Managed onboarding requests
    'onboarding_request'
  ));
