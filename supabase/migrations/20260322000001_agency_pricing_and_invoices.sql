-- ============================================================================
-- Milestone 2: Custom Agency Pricing + Invoice Request Flow
-- ============================================================================

-- 1. Agency pricing overrides table
-- Allows admin to set custom prices per agency per product
CREATE TABLE IF NOT EXISTS public.agency_pricing_overrides (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  custom_price    integer NOT NULL,  -- in cents (same as products.price)
  currency        text NOT NULL DEFAULT 'aud',
  notes           text,              -- admin notes about the custom pricing
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, product_id)
);

CREATE INDEX idx_agency_pricing_agency ON public.agency_pricing_overrides(agency_id);
ALTER TABLE public.agency_pricing_overrides ENABLE ROW LEVEL SECURITY;

-- 2. Add invoice-related columns to payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS invoice_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_notes text,
  ADD COLUMN IF NOT EXISTS invoice_admin_notes text;

-- 3. Ensure invoice_requested column exists (may already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'invoice_requested'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN invoice_requested boolean NOT NULL DEFAULT false;
  END IF;
END $$;
