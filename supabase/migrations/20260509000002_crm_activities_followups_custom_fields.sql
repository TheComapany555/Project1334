-- M1.2: CRM Communication, Follow-Ups, Status Tracking, Email Logging.
--
-- Adds:
--   1. crm_activities         — unified activity log (manual + system events)
--   2. crm_follow_ups         — follow-up reminders/tasks
--   3. crm_custom_fields      — company-level custom CRM columns (admin-defined)
--   4. crm_custom_field_values — per-contact values for custom columns
--   5. broker_bcc_addresses   — per-broker private inbound email token
--   6. profiles.email_templates — JSON column for the in-platform composer
--   7. Notification CHECK widening for the new event types we'll emit.
--
-- All tables: RLS enabled, no public policies — service-role only writes.
-- Read paths go through `requireBroker()` server actions with explicit
-- broker_id / agency_id scoping (matches the broker_contacts pattern).
--
-- Down (reference only):
--   DROP TABLE IF EXISTS public.crm_custom_field_values;
--   DROP TABLE IF EXISTS public.crm_custom_fields;
--   DROP TABLE IF EXISTS public.crm_follow_ups;
--   DROP TABLE IF EXISTS public.crm_activities;
--   DROP TABLE IF EXISTS public.broker_bcc_addresses;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS email_templates;

-- ── 1. crm_activities ────────────────────────────────────────────────────
-- One row per logged event for a (broker, contact_or_buyer) pair. Both manual
-- entries (broker types a note) and system events (auto-status-change,
-- email_sent via composer, BCC pipeline match) live here so the buyer panel
-- timeline has a single source of truth.

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES public.broker_contacts(id) ON DELETE CASCADE,
  buyer_user_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  listing_id      uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  kind            text NOT NULL CHECK (kind IN (
    'email_sent',
    'email_received',
    'call_logged',
    'note_added',
    'follow_up_set',
    'follow_up_completed',
    'status_changed',
    'message_sent',
    'message_received',
    'listing_shared',
    'feedback_logged'
  )),
  subject         text,                  -- email subject / call outcome / note title
  body            text,                  -- email body / call notes / note content
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
                                         -- timestamps, message_id, status from→to,
                                         -- attachments[], etc.
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_broker_contact
  ON public.crm_activities (broker_id, contact_id, occurred_at DESC)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_activities_broker_buyer
  ON public.crm_activities (broker_id, buyer_user_id, occurred_at DESC)
  WHERE buyer_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_activities_broker_listing
  ON public.crm_activities (broker_id, listing_id, occurred_at DESC)
  WHERE listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_activities_broker_recent
  ON public.crm_activities (broker_id, occurred_at DESC);

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
-- No public/authenticated policies: service-role server actions only.

COMMENT ON TABLE public.crm_activities IS
  'Unified CRM event log. Powers the buyer panel timeline and "last contacted" mirror columns on broker_contacts.';
COMMENT ON COLUMN public.crm_activities.metadata IS
  'Per-kind extensions. Email: { message_id, attachments, direction }. Call: { outcome, duration }. Status: { from, to }. Etc.';

-- ── 2. crm_follow_ups ────────────────────────────────────────────────────
-- Follow-up tasks. Separate from crm_activities so we can index by due_at
-- and filter "overdue / due today" cheaply.

CREATE TABLE IF NOT EXISTS public.crm_follow_ups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES public.broker_contacts(id) ON DELETE CASCADE,
  buyer_user_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  listing_id      uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  due_at          timestamptz NOT NULL,
  title           text NOT NULL,
  notes           text,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_due
  ON public.crm_follow_ups (broker_id, due_at)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_contact
  ON public.crm_follow_ups (contact_id, due_at)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_buyer
  ON public.crm_follow_ups (buyer_user_id, due_at)
  WHERE buyer_user_id IS NOT NULL;

ALTER TABLE public.crm_follow_ups ENABLE ROW LEVEL SECURITY;
-- Service-role only.

COMMENT ON TABLE public.crm_follow_ups IS
  'CRM follow-up tasks. Cron at 8am AEST emits follow_up_due notifications for items where due_at::date = current_date AND completed_at IS NULL.';

-- ── 3. crm_custom_fields ─────────────────────────────────────────────────
-- Custom CRM columns — set at the AGENCY level so all brokers in the agency
-- share the same column setup (per the locked-in clarification). For solo
-- brokers without an agency, fall back to broker_id ownership.

CREATE TABLE IF NOT EXISTS public.crm_custom_fields (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  broker_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  key             text NOT NULL,         -- machine key, e.g. 'hot_lead'
  label           text NOT NULL,         -- display name, e.g. 'Hot lead'
  field_type      text NOT NULL CHECK (field_type IN ('text','number','boolean','select','date')),
  options         jsonb,                  -- for 'select': [{ value, label, color? }]
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Exactly one owner: agency-level OR solo-broker, never both, never neither.
ALTER TABLE public.crm_custom_fields
  ADD CONSTRAINT chk_crm_custom_fields_owner
  CHECK ((agency_id IS NULL) <> (broker_id IS NULL));

-- Per-owner unique keys. NULLS NOT DISTINCT requires Postgres 15+ (Supabase
-- baseline); without it, the partial-unique-index workaround would be needed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_custom_fields_unique_key
  ON public.crm_custom_fields (COALESCE(agency_id, broker_id), key);

CREATE INDEX IF NOT EXISTS idx_crm_custom_fields_agency
  ON public.crm_custom_fields (agency_id, sort_order)
  WHERE agency_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_custom_fields_broker
  ON public.crm_custom_fields (broker_id, sort_order)
  WHERE broker_id IS NOT NULL;

ALTER TABLE public.crm_custom_fields ENABLE ROW LEVEL SECURITY;
-- Service-role only.

COMMENT ON TABLE public.crm_custom_fields IS
  'Company-level custom CRM columns (admin-defined). Agency owners can manage; brokers in the agency see and use them.';

-- ── 4. crm_custom_field_values ──────────────────────────────────────────
-- One row per (contact, field). Stored as jsonb to handle any field_type.
-- For 'boolean': { v: true } / { v: false }. For 'select': { v: 'optionValue' }.

CREATE TABLE IF NOT EXISTS public.crm_custom_field_values (
  contact_id      uuid NOT NULL REFERENCES public.broker_contacts(id) ON DELETE CASCADE,
  field_id        uuid NOT NULL REFERENCES public.crm_custom_fields(id) ON DELETE CASCADE,
  value           jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_custom_field_values_field
  ON public.crm_custom_field_values (field_id);

ALTER TABLE public.crm_custom_field_values ENABLE ROW LEVEL SECURITY;
-- Service-role only.

-- ── 5. broker_bcc_addresses ─────────────────────────────────────────────
-- Each broker gets a private inbound token. The broker BCC's an address like
-- `bcc-<token>@<INBOUND_DOMAIN>` on outbound emails sent from their normal
-- inbox; the inbound webhook (M1.2 step 6) parses the token to identify the
-- broker, matches the recipient email to a CRM contact, and logs the email.

CREATE TABLE IF NOT EXISTS public.broker_bcc_addresses (
  broker_id       uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  token           text NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_bcc_addresses ENABLE ROW LEVEL SECURITY;
-- Service-role only.

COMMENT ON COLUMN public.broker_bcc_addresses.token IS
  'Random URL-safe token (e.g. nanoid). Used as the local-part of the inbound BCC address. Treat as a secret — anyone with this address can post emails into the broker''s CRM timeline.';

-- ── 6. profiles.email_templates ─────────────────────────────────────────
-- Saved email templates for the in-platform composer (M1.2 step 6). Stored
-- inline on the profile to avoid a separate table for what is small data.
-- Shape: array of { id, name, subject, body, created_at }.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_templates jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.email_templates IS
  'In-platform email composer templates. Array of { id, name, subject, body, created_at }. Per-broker.';

-- ── 7. Notification types ───────────────────────────────────────────────
-- Widen the existing CHECK to allow the new event types M1.2 and M2 will emit.
-- Keep all existing types intact.

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
    -- M1.2 (this milestone)
    'follow_up_due',
    'email_received',
    'feedback_logged',
    -- M1.3 (messaging)
    'message_received',
    'message_sent',
    -- M2.2 (data room)
    'data_room_request',
    'data_room_view',
    'data_room_download',
    'access_approved',
    'access_expiring',
    'access_expired',
    'new_files_added'
  ));
