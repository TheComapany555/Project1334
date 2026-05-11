-- M1.1: Extend buyer profiles + broker_contacts so the CRM slide-out panel
-- has the data it needs (budget, industries, funding, timeframe, etc.) and so
-- the same buyer never shows up twice in a broker's CRM.
--
-- Down (manual revert reference):
--   ALTER TABLE public.broker_contacts DROP COLUMN IF EXISTS buyer_user_id;
--   ALTER TABLE public.broker_contacts DROP COLUMN IF EXISTS status;
--   ALTER TABLE public.broker_contacts DROP COLUMN IF EXISTS last_emailed_at;
--   ALTER TABLE public.broker_contacts DROP COLUMN IF EXISTS last_called_at;
--   ALTER TABLE public.broker_contacts DROP COLUMN IF EXISTS last_contacted_at;
--   ALTER TABLE public.broker_contacts DROP COLUMN IF EXISTS first_interaction_at;
--   ALTER TABLE public.broker_contacts DROP COLUMN IF EXISTS next_follow_up_at;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS budget_min;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS budget_max;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferred_industries;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferred_locations;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS funding_status;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS timeframe;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_active_at;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS location_text;

-- ── 1. Buyer-side profile fields ──────────────────────────────────────────
-- These are only meaningful for role='user' (buyers). Brokers/admins ignore
-- them. Kept on `profiles` (instead of a sibling table) so the existing
-- `profiles` RLS + service-role write path covers them.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS budget_min            bigint
    CHECK (budget_min IS NULL OR budget_min >= 0),
  ADD COLUMN IF NOT EXISTS budget_max            bigint
    CHECK (budget_max IS NULL OR budget_max >= 0),
  ADD COLUMN IF NOT EXISTS preferred_industries  text[],
  ADD COLUMN IF NOT EXISTS preferred_locations   text[],
  ADD COLUMN IF NOT EXISTS funding_status        text
    CHECK (funding_status IS NULL OR funding_status IN
      ('self_funded','pre_approved','seeking_finance','unspecified')),
  ADD COLUMN IF NOT EXISTS timeframe             text
    CHECK (timeframe IS NULL OR timeframe IN
      ('lt_3m','3_6m','6_12m','gt_12m','unspecified')),
  ADD COLUMN IF NOT EXISTS location_text         text,
  ADD COLUMN IF NOT EXISTS last_active_at        timestamptz;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_budget_range
  CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max);

CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at
  ON public.profiles (last_active_at DESC)
  WHERE last_active_at IS NOT NULL;

COMMENT ON COLUMN public.profiles.budget_min IS
  'Buyer-only: minimum budget in AUD (whole dollars).';
COMMENT ON COLUMN public.profiles.budget_max IS
  'Buyer-only: maximum budget in AUD (whole dollars).';
COMMENT ON COLUMN public.profiles.preferred_industries IS
  'Buyer-only: free-form industry preferences (e.g. ["Cafe","Childcare"]).';
COMMENT ON COLUMN public.profiles.preferred_locations IS
  'Buyer-only: region/suburb names the buyer wants.';
COMMENT ON COLUMN public.profiles.funding_status IS
  'Buyer-only: funding readiness for the purchase.';
COMMENT ON COLUMN public.profiles.timeframe IS
  'Buyer-only: how soon they intend to buy (lt_3m=<3m, gt_12m=>12m).';
COMMENT ON COLUMN public.profiles.last_active_at IS
  'Bumped on auth, enquiry, NDA sign, document view. Powers the CRM activity panel.';

-- ── 2. CRM columns on broker_contacts ─────────────────────────────────────
-- These power the pipeline status, follow-ups, and "last contacted" surfaces
-- in the CRM table and the buyer slide-out panel.

ALTER TABLE public.broker_contacts
  ADD COLUMN IF NOT EXISTS buyer_user_id        uuid
    REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status               text NOT NULL DEFAULT 'new_lead'
    CHECK (status IN (
      'new_lead','contacted','interested','meeting_scheduled',
      'nda_signed','documents_shared','negotiating','closed'
    )),
  ADD COLUMN IF NOT EXISTS last_emailed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS last_called_at       timestamptz,
  ADD COLUMN IF NOT EXISTS last_contacted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS first_interaction_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_follow_up_at    timestamptz;

CREATE INDEX IF NOT EXISTS idx_broker_contacts_buyer_user
  ON public.broker_contacts (broker_id, buyer_user_id)
  WHERE buyer_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_broker_contacts_status
  ON public.broker_contacts (broker_id, status);

CREATE INDEX IF NOT EXISTS idx_broker_contacts_follow_up_due
  ON public.broker_contacts (broker_id, next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;

COMMENT ON COLUMN public.broker_contacts.buyer_user_id IS
  'Links a CRM row to the actual buyer account when known. Backfilled from enquiries.user_id; populated thereafter on enquiry, NDA sign, listing share.';
COMMENT ON COLUMN public.broker_contacts.status IS
  'Pipeline status. Auto-advances on broker actions (email_sent, nda_signed, …); manual change always allowed.';
COMMENT ON COLUMN public.broker_contacts.next_follow_up_at IS
  'Mirror of the soonest open crm_follow_ups.due_at for fast CRM list sorting.';

-- ── 3. Backfill buyer_user_id / first_interaction_at from existing data ──
-- enquiries.user_id is reliable when the buyer was logged in at submission.
UPDATE public.broker_contacts c
SET buyer_user_id = e.user_id
FROM public.enquiries e
WHERE c.enquiry_id = e.id
  AND e.user_id IS NOT NULL
  AND c.buyer_user_id IS NULL;

-- For rows without a linked enquiry, try matching by email against users.
UPDATE public.broker_contacts c
SET buyer_user_id = u.id
FROM public.users u
WHERE c.buyer_user_id IS NULL
  AND lower(c.email) = lower(u.email);

-- first_interaction_at = earliest of created_at and any matched enquiry timestamp.
UPDATE public.broker_contacts c
SET first_interaction_at = LEAST(c.created_at, e.created_at)
FROM public.enquiries e
WHERE c.enquiry_id = e.id
  AND c.first_interaction_at IS NULL;

UPDATE public.broker_contacts
SET first_interaction_at = created_at
WHERE first_interaction_at IS NULL;

-- ── 4. Uniqueness: same buyer can't appear twice for one broker ──────────
-- We keep the existing (broker_id, email) unique index. Add a partial unique
-- index on (broker_id, buyer_user_id) so once we know the user, we never
-- create a parallel row for them under a different email.
CREATE UNIQUE INDEX IF NOT EXISTS idx_broker_contacts_unique_buyer
  ON public.broker_contacts (broker_id, buyer_user_id)
  WHERE buyer_user_id IS NOT NULL;
