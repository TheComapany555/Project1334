-- Tiered subscription plans with per-seat overage.
-- ============================================================
--
-- The original subscription model was a flat-fee-per-agency "Agency Monthly
-- Subscription" ($199/mo, unlimited brokers). Some agencies have many brokers
-- → flat pricing under-monetises them.
--
-- This migration adds:
--   * `products.pricing_model` — distinguishes legacy flat from new tiered plans
--   * `products.included_seats` + `products.extra_seat_price` — for tiered plans
--   * `products.tier_rank` — sort order in the agency-facing plan picker
--   * `agency_subscriptions.quantity` — broker count locked at subscribe time
--   * `agency_subscriptions.included_seats_snapshot` — snapshot of plan's included seats
--   * `agency_subscriptions.extra_seat_price_snapshot` — snapshot of overage rate
--   * `agency_pricing_overrides.custom_extra_seat_price` — per-agency override
--
-- Grandfathering: existing agencies on the legacy flat plan stay where they
-- are. New plans are added alongside; the legacy plan is left active so it
-- continues to work for already-subscribed agencies. Admins can migrate
-- agencies to a tiered plan via the admin UI when they're ready.

-- ── 1. Extend `products` ────────────────────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS pricing_model     text NOT NULL DEFAULT 'flat'
    CHECK (pricing_model IN ('flat', 'tiered_seats')),
  ADD COLUMN IF NOT EXISTS included_seats    integer,
  ADD COLUMN IF NOT EXISTS extra_seat_price  integer,
  ADD COLUMN IF NOT EXISTS tier_rank         smallint;

COMMENT ON COLUMN public.products.pricing_model IS
  'flat = single fixed price for unlimited brokers (legacy). tiered_seats = base price + N included brokers + per-seat overage.';
COMMENT ON COLUMN public.products.included_seats IS
  'Brokers covered by the base tier price (tiered_seats plans only).';
COMMENT ON COLUMN public.products.extra_seat_price IS
  'Cents per extra broker per month above included_seats (tiered_seats plans only).';
COMMENT ON COLUMN public.products.tier_rank IS
  'Display order in the subscribe-page plan picker (low to high).';

-- ── 2. Extend `agency_subscriptions` ────────────────────────
--
-- Snapshots are stored on the subscription row so billing stays stable even
-- if an admin later edits the plan's pricing. Quantity is the broker count
-- this subscription is billing for THIS period; it gets reconciled at each
-- invoice cycle via the Stripe webhook.

ALTER TABLE public.agency_subscriptions
  ADD COLUMN IF NOT EXISTS quantity                  integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS included_seats_snapshot   integer,
  ADD COLUMN IF NOT EXISTS extra_seat_price_snapshot integer,
  ADD COLUMN IF NOT EXISTS extra_seat_stripe_price_id text,
  ADD COLUMN IF NOT EXISTS extra_seat_stripe_item_id  text;

COMMENT ON COLUMN public.agency_subscriptions.quantity IS
  'Broker count this subscription period is being billed for. Updated each invoice cycle by the seat-reconciliation webhook handler.';
COMMENT ON COLUMN public.agency_subscriptions.included_seats_snapshot IS
  'Snapshot of the plan''s included_seats at subscribe time. Decouples billing from later admin edits.';
COMMENT ON COLUMN public.agency_subscriptions.extra_seat_price_snapshot IS
  'Snapshot of the per-extra-seat price (in cents) at subscribe time.';
COMMENT ON COLUMN public.agency_subscriptions.extra_seat_stripe_price_id IS
  'Stripe Price ID for the per-extra-seat recurring line item on this subscription.';
COMMENT ON COLUMN public.agency_subscriptions.extra_seat_stripe_item_id IS
  'Stripe SubscriptionItem ID for the per-extra-seat line item. Needed to update quantity on broker count changes.';

-- ── 3. Extend `agency_pricing_overrides` ────────────────────

ALTER TABLE public.agency_pricing_overrides
  ADD COLUMN IF NOT EXISTS custom_extra_seat_price integer;

COMMENT ON COLUMN public.agency_pricing_overrides.custom_extra_seat_price IS
  'Optional per-agency override (in cents) for the plan''s extra_seat_price. NULL = use product default.';

-- ── 4. Ensure UNIQUE (name, product_type) so seed INSERTs can use ON CONFLICT.
--
-- An earlier migration (20260322000001_products_unique_name_type.sql) added
-- this constraint, but some environments have drifted and don't have it.
-- We add it defensively here so this migration can stand on its own —
-- dedup any existing rows first, then add the constraint if missing.

DELETE FROM public.products
WHERE id NOT IN (
  SELECT DISTINCT ON (name, product_type) id
  FROM public.products
  ORDER BY name, product_type, created_at ASC
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_name_product_type_unique'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_name_product_type_unique UNIQUE (name, product_type);
  END IF;
END $$;

-- ── 5. Seed 3 default tiered plans ──────────────────────────
--
-- Placeholder prices; admin can edit via the pricing admin UI.
--   Starter — $99/mo · 3 included · $39/extra
--   Growth  — $249/mo · 10 included · $29/extra
--   Scale   — $499/mo · 25 included · $19/extra

INSERT INTO public.products (
  name, description, price, currency, duration_days, status, product_type,
  pricing_model, included_seats, extra_seat_price, tier_rank
)
VALUES
  (
    'Starter',
    '3 brokers included. Extra brokers billed monthly as a seat add-on.',
    9900, 'aud', 30, 'active', 'subscription',
    'tiered_seats', 3, 3900, 10
  ),
  (
    'Growth',
    '10 brokers included. Built for mid-sized teams that want headroom to grow.',
    24900, 'aud', 30, 'active', 'subscription',
    'tiered_seats', 10, 2900, 20
  ),
  (
    'Scale',
    '25 brokers included. Best value for large agencies — lowest per-seat rate.',
    49900, 'aud', 30, 'active', 'subscription',
    'tiered_seats', 25, 1900, 30
  )
ON CONFLICT (name, product_type) DO UPDATE SET
  description        = EXCLUDED.description,
  -- Don't overwrite price/included_seats/extra_seat_price if admin has edited
  -- them since the migration first ran. We only ensure these columns exist;
  -- the values come from the first run.
  pricing_model      = EXCLUDED.pricing_model,
  status             = EXCLUDED.status,
  tier_rank          = COALESCE(public.products.tier_rank, EXCLUDED.tier_rank);

-- Stamp tier_rank on the legacy flat plan so it appears at the bottom of the
-- picker if it's ever shown.
UPDATE public.products
SET tier_rank = 100
WHERE product_type = 'subscription'
  AND pricing_model = 'flat'
  AND tier_rank IS NULL;
