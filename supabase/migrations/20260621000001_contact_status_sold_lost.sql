-- Split the terminal CRM pipeline stage into explicit outcomes.
--
-- Before: the pipeline ended in a single ambiguous `closed` (could be won or
-- lost). Now: `sold` (deal won) replaces `closed`, and a new `lost` stage marks
-- buyers who dropped out. Lets brokers — and the AI insights — distinguish a
-- won deal from a lost one for recommendations and follow-ups.
--
-- Applies to both status columns: broker_contacts.status (overall/headline
-- stage) and broker_contact_listing_status.status (per-listing stage). Existing
-- `closed` rows are migrated to `sold`.
--
-- IMPORTANT ordering: drop the old CHECK BEFORE the backfill (the old check
-- rejects 'sold'), then re-add the widened CHECK.
--
-- Down (reference only): reverse the value (sold->closed), drop 'lost' rows or
-- map them to 'closed', and restore the original CHECK lists.

-- ── broker_contacts.status ─────────────────────────────────────────────────
ALTER TABLE public.broker_contacts
  DROP CONSTRAINT IF EXISTS broker_contacts_status_check;

UPDATE public.broker_contacts SET status = 'sold' WHERE status = 'closed';

ALTER TABLE public.broker_contacts
  ADD CONSTRAINT broker_contacts_status_check CHECK (status IN (
    'new_lead','contacted','interested','meeting_scheduled',
    'nda_signed','documents_shared','negotiating','sold','lost'
  ));

-- ── broker_contact_listing_status.status ───────────────────────────────────
-- (Created in 20260620000001; runs before this migration by timestamp order.)
ALTER TABLE public.broker_contact_listing_status
  DROP CONSTRAINT IF EXISTS broker_contact_listing_status_status_check;

UPDATE public.broker_contact_listing_status SET status = 'sold' WHERE status = 'closed';

ALTER TABLE public.broker_contact_listing_status
  ADD CONSTRAINT broker_contact_listing_status_status_check CHECK (status IN (
    'new_lead','contacted','interested','meeting_scheduled',
    'nda_signed','documents_shared','negotiating','sold','lost'
  ));

COMMENT ON COLUMN public.broker_contacts.status IS
  'Overall pipeline stage (max across listings, never auto-demoted). Terminal outcomes: sold (won) / lost.';
