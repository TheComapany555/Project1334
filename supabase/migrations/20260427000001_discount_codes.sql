-- ============================================================================
-- Promotional discount codes (broker / agency onboarding promo)
-- ----------------------------------------------------------------------------
-- A code-based promotional system for the listing checkout flow. Supports
-- percentage-off discounts (1-100%). When a code is applied at checkout we
-- create a Stripe Checkout Session with a Stripe Coupon attached so:
--   - 100% off → Stripe processes the $0 session natively (visible on the
--     Stripe dashboard with the coupon line item)
--   - partial off → Stripe collects the discounted amount, also showing the
--     coupon usage on the dashboard
--
-- Each discount_codes row maps 1:1 to a Stripe Coupon (created lazily and
-- cached in stripe_coupon_id). Stripe coupons are immutable, so editing the
-- percent_off in admin clears stripe_coupon_id and a new Stripe coupon is
-- created on next use.
--
-- Admin manages codes from /admin/discount-codes:
--   active flag, percent_off, optional expiry, optional max_uses cap.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  description   text,
  percent_off   integer NOT NULL CHECK (percent_off BETWEEN 1 AND 100),

  -- Optional usage cap. NULL = unlimited.
  max_uses      integer,
  used_count    integer NOT NULL DEFAULT 0,

  -- Optional validity window. NULL valid_until = no expiry.
  valid_from    timestamptz NOT NULL DEFAULT now(),
  valid_until   timestamptz,

  active        boolean NOT NULL DEFAULT true,

  -- Stripe Coupon ID (synced lazily on first redemption). Cleared whenever
  -- percent_off changes since Stripe coupons are immutable.
  stripe_coupon_id text,

  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discount_codes_code_idx ON public.discount_codes(code);
CREATE INDEX IF NOT EXISTS discount_codes_active_idx ON public.discount_codes(active);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Add discount tracking to payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS discount_code_id uuid REFERENCES public.discount_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount integer,
  ADD COLUMN IF NOT EXISTS original_amount integer;

CREATE INDEX IF NOT EXISTS payments_discount_code_idx ON public.payments(discount_code_id);
