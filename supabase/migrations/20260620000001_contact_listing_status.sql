-- Per-listing CRM pipeline status.
--
-- Problem this fixes: `broker_contacts.status` is a SINGLE status per
-- (broker, buyer) pair, so a buyer who is "Negotiating" on one business and a
-- "New Lead" on another can only carry one ambiguous status with no listing
-- attached. This table records the pipeline stage for a buyer on a SPECIFIC
-- listing, so the buyer profile can show a status next to each linked listing
-- and AI Insights can read the per-listing stage.
--
-- `broker_contacts.status` is retained as the OVERALL/headline stage (the
-- furthest stage the buyer has reached on any of the broker's listings). It is
-- rolled up (never auto-demoted) when a per-listing status advances, so the
-- existing CRM list table, presets, and filters keep working unchanged.
--
-- Same RLS posture as crm_activities: RLS on, NO public/authenticated
-- policies — all reads/writes go through service-role server actions that
-- enforce broker/agency scoping in code (see lib/actions/crm.ts).
--
-- Down (reference only):
--   DROP TABLE IF EXISTS public.broker_contact_listing_status;

CREATE TABLE IF NOT EXISTS public.broker_contact_listing_status (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id    uuid NOT NULL REFERENCES public.broker_contacts(id) ON DELETE CASCADE,
  -- Mirrors broker_contacts.buyer_user_id when known so AI Insights can match
  -- a listing's logged-in buyers to their per-listing stage without a join.
  buyer_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  listing_id    uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'new_lead'
    CHECK (status IN (
      'new_lead','contacted','interested','meeting_scheduled',
      'nda_signed','documents_shared','negotiating','closed'
    )),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- One stage per (contact, listing). Upserts target this constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bcls_unique_contact_listing
  ON public.broker_contact_listing_status (contact_id, listing_id);

-- Fast lookup of all stages for one contact (buyer profile / panel).
CREATE INDEX IF NOT EXISTS idx_bcls_contact
  ON public.broker_contact_listing_status (contact_id);

-- Fast lookup of stages for all buyers on one listing (AI Insights).
CREATE INDEX IF NOT EXISTS idx_bcls_listing_buyer
  ON public.broker_contact_listing_status (listing_id, buyer_user_id)
  WHERE buyer_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bcls_broker_listing
  ON public.broker_contact_listing_status (broker_id, listing_id);

ALTER TABLE public.broker_contact_listing_status ENABLE ROW LEVEL SECURITY;
-- No public/authenticated policies: service-role server actions only.

COMMENT ON TABLE public.broker_contact_listing_status IS
  'Per-(contact, listing) CRM pipeline stage. broker_contacts.status remains the overall/headline stage (max across listings, never auto-demoted).';
COMMENT ON COLUMN public.broker_contact_listing_status.buyer_user_id IS
  'Mirror of broker_contacts.buyer_user_id at write time. Lets listing AI Insights match logged-in buyers to their per-listing stage directly.';
