-- Allow admins to waive the subscription gate per agency (onboarding / comp access).
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS subscription_exempt boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.agencies.subscription_exempt IS
  'When true, agency brokers can use the dashboard without an active paid subscription.';

-- Ensure at least one active subscription product exists for self-serve checkout.
-- The 2026-06-03 single-plan migration deactivated legacy tiers but did not
-- insert a replacement — brokers then saw "No plans available" on Subscribe.
INSERT INTO public.products (
  name,
  description,
  price,
  currency,
  duration_days,
  status,
  product_type,
  pricing_model,
  included_seats,
  extra_seat_price,
  tier_rank
)
SELECT
  'Agency Subscription',
  'Monthly agency fee covering your first broker. Each additional broker is billed as an extra seat.',
  19900,
  'aud',
  30,
  'active',
  'subscription',
  'tiered_seats',
  1,
  9500,
  10
WHERE NOT EXISTS (
  SELECT 1
  FROM public.products
  WHERE product_type = 'subscription'
    AND status = 'active'
);
