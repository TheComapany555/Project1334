-- Add CRM fields to broker_contacts:
--   - consent tracking for marketing communications
--   - "interest" field for buyer intent capture
-- ============================================================

ALTER TABLE public.broker_contacts
  ADD COLUMN IF NOT EXISTS interest text,
  ADD COLUMN IF NOT EXISTS consent_marketing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_given_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_source text
    CHECK (consent_source IN ('enquiry', 'manual', 'share', 'import'));

-- Allow 'share' (added via listing share flow) and 'import' as future sources.
-- Drop and re-add the source check to widen the existing enum.
ALTER TABLE public.broker_contacts
  DROP CONSTRAINT IF EXISTS broker_contacts_source_check;

ALTER TABLE public.broker_contacts
  ADD CONSTRAINT broker_contacts_source_check
  CHECK (source IN ('enquiry', 'manual', 'share', 'import'));

-- Backfill: contacts created manually pre-consent are treated as having
-- broker-asserted consent (the broker added them, source='manual').
-- Enquiry-sourced contacts default to false until a consent record exists.
UPDATE public.broker_contacts
SET consent_marketing = true,
    consent_given_at = created_at,
    consent_source = 'manual'
WHERE source = 'manual'
  AND consent_marketing = false;

CREATE INDEX IF NOT EXISTS idx_broker_contacts_consent
  ON public.broker_contacts(broker_id, consent_marketing)
  WHERE consent_marketing = true;

COMMENT ON COLUMN public.broker_contacts.consent_marketing IS
  'Whether the contact has opted in to marketing emails (e.g. listing shares). Required to be true before bulk-emailing.';
COMMENT ON COLUMN public.broker_contacts.consent_source IS
  'Where the consent originated: enquiry form checkbox, manual broker entry, listing share, or import.';
