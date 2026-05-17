-- M2 Phase 6: per-listing enquiry form customisation
-- ============================================================
--
-- Brokers can toggle which buyer-qualifying fields appear on their listing's
-- enquiry form and add up to a handful of custom short-answer questions.
--
-- Config rows are optional — listings without one default to today's form
-- (all standard fields enabled, no custom questions, none required beyond
-- email + message).

CREATE TABLE IF NOT EXISTS public.listing_enquiry_form_config (
  listing_id            uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  -- Standard field toggles
  show_phone            boolean NOT NULL DEFAULT true,
  require_phone         boolean NOT NULL DEFAULT false,
  show_reason           boolean NOT NULL DEFAULT true,
  show_interest         boolean NOT NULL DEFAULT true,
  show_budget           boolean NOT NULL DEFAULT false,
  require_budget        boolean NOT NULL DEFAULT false,
  show_funding          boolean NOT NULL DEFAULT false,
  require_funding       boolean NOT NULL DEFAULT false,
  show_industry         boolean NOT NULL DEFAULT false,
  require_industry      boolean NOT NULL DEFAULT false,
  show_timeframe        boolean NOT NULL DEFAULT false,
  require_timeframe     boolean NOT NULL DEFAULT false,
  -- Up to 5 broker-defined free-text questions, stored as ordered JSONB array of
  -- { id: uuid, label: text, required: boolean, kind: 'text' | 'long_text' }
  custom_questions      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_enquiry_form_config ENABLE ROW LEVEL SECURITY;
-- Service-role only — server actions enforce broker ownership.

COMMENT ON TABLE public.listing_enquiry_form_config IS
  'Per-listing enquiry form customisation. Each listing has at most one row; absence means use the default form layout.';
COMMENT ON COLUMN public.listing_enquiry_form_config.custom_questions IS
  'Ordered array of broker-defined questions: [{id, label, required, kind}]. Keep small (max 5 enforced in app).';

-- updated_at trigger reuses the helper from the data-room migration.
DROP TRIGGER IF EXISTS trg_listing_enquiry_form_config_updated_at
  ON public.listing_enquiry_form_config;
CREATE TRIGGER trg_listing_enquiry_form_config_updated_at
  BEFORE UPDATE ON public.listing_enquiry_form_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_data_room();

-- Storage on enquiries themselves for the qualifying fields + custom answers.
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS budget_range       text,
  ADD COLUMN IF NOT EXISTS funding_status     text,
  ADD COLUMN IF NOT EXISTS industry_experience text,
  ADD COLUMN IF NOT EXISTS purchase_timeframe text,
  ADD COLUMN IF NOT EXISTS custom_answers     jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.enquiries.custom_answers IS
  'Map of { question_id: answer_text } for broker-defined custom questions on this listing.';
