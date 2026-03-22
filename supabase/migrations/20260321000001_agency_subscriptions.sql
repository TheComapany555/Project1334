-- Agency subscriptions table for Stripe recurring billing
CREATE TABLE public.agency_subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id              uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,

  -- Stripe references
  stripe_customer_id     text,
  stripe_subscription_id text UNIQUE,
  stripe_price_id        text,

  -- Subscription plan reference
  plan_product_id        uuid REFERENCES public.products(id) ON DELETE SET NULL,

  -- Status tracking
  status                 text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'past_due', 'cancelled', 'expired', 'trialing')),

  -- Billing period
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean DEFAULT false,
  cancelled_at           timestamptz,

  -- Grace period: agency still has access for N days after payment failure
  grace_period_end       timestamptz,

  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

-- Only one active-ish subscription per agency at a time
CREATE UNIQUE INDEX idx_agency_subscriptions_agency_active
  ON public.agency_subscriptions(agency_id)
  WHERE status IN ('active', 'trialing', 'past_due', 'pending');

CREATE INDEX idx_agency_subscriptions_stripe_sub
  ON public.agency_subscriptions(stripe_subscription_id);
CREATE INDEX idx_agency_subscriptions_stripe_customer
  ON public.agency_subscriptions(stripe_customer_id);
CREATE INDEX idx_agency_subscriptions_status
  ON public.agency_subscriptions(status);
CREATE INDEX idx_agency_subscriptions_period_end
  ON public.agency_subscriptions(current_period_end);

ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;

-- Backfill: existing active agencies get a grandfathered subscription (1 year)
INSERT INTO public.agency_subscriptions (agency_id, status, current_period_start, current_period_end)
SELECT id, 'active', now(), now() + interval '1 year'
FROM public.agencies
WHERE status = 'active';
