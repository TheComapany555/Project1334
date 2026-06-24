-- Know Your Buyer (KYB) — Sumsub identity verification foundation.
--
-- Brokers verify a buyer's identity (and later their company / beneficial
-- owners) through Sumsub before progressing a deal. One Sumsub account serves
-- all of SaleBiz; records stay scoped to the initiating broker + listing.
--
-- Scope decision (hybrid):
--   • kyb_buyer_identity   — the Sumsub identity (KYC) check is PER BUYER. One
--     applicant per contact, reused across all of that buyer's listings.
--   • kyb_listing_compliance — the broker-entered compliance form (purchasing
--     structure, source of funds, PEP, beneficial owner, …) is a SEPARATE
--     record PER (buyer + listing + broker), matching the client's
--     childcare-vs-café example.
--
-- ⚠️ Sensitive PII (DOB, address, source of funds, PEP). Same RLS posture as
-- crm_activities / broker_contact_listing_status: RLS ON, NO public/
-- authenticated policies — all reads/writes go through service-role server
-- actions that enforce broker/agency scoping in code (see lib/actions/kyb.ts).
-- Raw ID documents are NEVER stored here; they stay in Sumsub. We persist only
-- structured results/status + the broker-entered form.
--
-- Down (reference only):
--   DROP TABLE IF EXISTS public.kyb_listing_compliance;
--   DROP TABLE IF EXISTS public.kyb_buyer_identity;

-- ── Table A: per-buyer Sumsub identity (KYC) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.kyb_buyer_identity (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id              uuid NOT NULL REFERENCES public.broker_contacts(id) ON DELETE CASCADE,
  -- Mirrors broker_contacts.buyer_user_id when the contact is a registered buyer.
  buyer_user_id           uuid REFERENCES public.users(id) ON DELETE SET NULL,
  -- Sumsub linkage. external_user_id is the stable id we send to Sumsub (= contact_id).
  sumsub_applicant_id     text UNIQUE,
  sumsub_external_user_id text,
  verification_status     text NOT NULL DEFAULT 'not_started'
    CHECK (verification_status IN (
      'not_started','link_sent','pending','approved',
      'rejected','resubmission_requested','expired'
    )),
  -- Sumsub correlation/inspection id, returned on the review webhook.
  verification_reference  text,
  link_sent_at            timestamptz,
  verified_at             timestamptz,
  -- Full Sumsub review result (reviewAnswer + rejectLabels) for the individual.
  individual_result       jsonb,
  -- Identity data pulled back from Sumsub on approval (client asked for these).
  verified_dob            date,
  verified_address        text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- One identity record per contact (the buyer). Upserts target this constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_kyb_identity_contact
  ON public.kyb_buyer_identity (contact_id);
CREATE INDEX IF NOT EXISTS idx_kyb_identity_applicant
  ON public.kyb_buyer_identity (sumsub_applicant_id)
  WHERE sumsub_applicant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kyb_identity_broker
  ON public.kyb_buyer_identity (broker_id);

ALTER TABLE public.kyb_buyer_identity ENABLE ROW LEVEL SECURITY;
-- No public/authenticated policies: service-role server actions only.

COMMENT ON TABLE public.kyb_buyer_identity IS
  'Per-buyer Sumsub identity (KYC) verification. One applicant per contact, reused across that buyer''s listings. PII — service-role only, no anon policy.';
COMMENT ON COLUMN public.kyb_buyer_identity.sumsub_external_user_id IS
  'The externalUserId sent to Sumsub (= contact_id). Lets the webhook match results back without storing PII in Sumsub metadata.';

-- ── Table B: per-(buyer, listing, broker) compliance form ──────────────────
CREATE TABLE IF NOT EXISTS public.kyb_listing_compliance (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id                   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id                  uuid NOT NULL REFERENCES public.broker_contacts(id) ON DELETE CASCADE,
  listing_id                  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_user_id               uuid REFERENCES public.users(id) ON DELETE SET NULL,
  -- Compliance form (broker-entered; DOB/address may pre-fill from Sumsub).
  full_legal_name             text,
  dob                         date,
  residential_address         text,
  purchasing_structure        text
    CHECK (purchasing_structure IS NULL OR purchasing_structure IN (
      'individual','company','trust','company_as_trustee'
    )),
  company_name                text,
  acn_abn                     text,
  beneficial_owner            text,
  source_of_funds             text
    CHECK (source_of_funds IS NULL OR source_of_funds IN (
      'cash','business_loan','home_equity','investor_funds','seller_finance','other'
    )),
  acting_on_behalf            boolean,
  beneficial_owners_offshore  boolean,
  is_pep                      boolean,
  -- Phase 2: company (KYB) verification, scoped to this listing's deal.
  sumsub_company_applicant_id text,
  company_verification_status text NOT NULL DEFAULT 'not_started'
    CHECK (company_verification_status IN (
      'not_started','link_sent','pending','approved',
      'rejected','resubmission_requested','expired'
    )),
  company_verification_reference text,
  company_link_sent_at        timestamptz,
  company_verified_at         timestamptz,
  -- Stored verification results.
  company_result              jsonb,
  beneficial_owner_result     jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- One compliance record per (contact, listing). Upserts target this constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_kyb_compliance_contact_listing
  ON public.kyb_listing_compliance (contact_id, listing_id);
CREATE INDEX IF NOT EXISTS idx_kyb_compliance_listing
  ON public.kyb_listing_compliance (listing_id);
CREATE INDEX IF NOT EXISTS idx_kyb_compliance_broker
  ON public.kyb_listing_compliance (broker_id);
-- Fast company-applicant match from the webhook.
CREATE INDEX IF NOT EXISTS idx_kyb_compliance_company_applicant
  ON public.kyb_listing_compliance (sumsub_company_applicant_id)
  WHERE sumsub_company_applicant_id IS NOT NULL;

ALTER TABLE public.kyb_listing_compliance ENABLE ROW LEVEL SECURITY;
-- No public/authenticated policies: service-role server actions only.

COMMENT ON TABLE public.kyb_listing_compliance IS
  'Per-(buyer, listing, broker) KYB compliance form + stored company/beneficial-owner results. PII — service-role only, no anon policy.';

-- ── updated_at triggers (reuse the shared function) ────────────────────────
DROP TRIGGER IF EXISTS trg_kyb_buyer_identity_updated_at ON public.kyb_buyer_identity;
CREATE TRIGGER trg_kyb_buyer_identity_updated_at
  BEFORE UPDATE ON public.kyb_buyer_identity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_data_room();

DROP TRIGGER IF EXISTS trg_kyb_listing_compliance_updated_at ON public.kyb_listing_compliance;
CREATE TRIGGER trg_kyb_listing_compliance_updated_at
  BEFORE UPDATE ON public.kyb_listing_compliance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_data_room();

-- ── New pipeline stage: know_your_buyer ────────────────────────────────────
-- Insert a "Know Your Buyer" stage after nda_signed. We DROP & re-add the CHECK
-- on BOTH status columns with the full canonical list (incl. the sold/lost
-- reconciliation), so this is safe whether or not 20260621000001 was applied.
ALTER TABLE public.broker_contacts
  DROP CONSTRAINT IF EXISTS broker_contacts_status_check;
UPDATE public.broker_contacts SET status = 'sold' WHERE status = 'closed';
ALTER TABLE public.broker_contacts
  ADD CONSTRAINT broker_contacts_status_check CHECK (status IN (
    'new_lead','contacted','interested','meeting_scheduled',
    'nda_signed','know_your_buyer','documents_shared','negotiating','sold','lost'
  ));

ALTER TABLE public.broker_contact_listing_status
  DROP CONSTRAINT IF EXISTS broker_contact_listing_status_status_check;
UPDATE public.broker_contact_listing_status SET status = 'sold' WHERE status = 'closed';
ALTER TABLE public.broker_contact_listing_status
  ADD CONSTRAINT broker_contact_listing_status_status_check CHECK (status IN (
    'new_lead','contacted','interested','meeting_scheduled',
    'nda_signed','know_your_buyer','documents_shared','negotiating','sold','lost'
  ));

-- ── Notification type: kyb_verification_complete ───────────────────────────
-- Brokers get an in-app notification when a buyer's verification result lands.
-- Re-add the full canonical list (all existing types) plus the new KYB type.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'enquiry_received','enquiry_reply','enquiry_sent',
    'listing_published','listing_unpublished','listing_shared','listing_alert_match',
    'payment_received','payment_approved','invoice_requested',
    'subscription_activated','subscription_cancelled','subscription_expiring',
    'broker_joined','broker_removed','agency_approved',
    'document_access_requested','general',
    'follow_up_due','email_received','feedback_logged',
    'message_received','message_sent',
    'data_room_request','data_room_view','data_room_download',
    'access_approved','access_expiring','access_expired','new_files_added',
    'listing_assigned',
    'ticket_created','ticket_reply','ticket_status_changed','ticket_assigned',
    'kyb_verification_complete'
  ));
