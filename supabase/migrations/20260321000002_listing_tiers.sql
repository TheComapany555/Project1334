-- Add listing tier columns
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS listing_tier text NOT NULL DEFAULT 'basic'
    CHECK (listing_tier IN ('basic', 'standard', 'featured')),
  ADD COLUMN IF NOT EXISTS tier_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tier_paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_listings_tier ON public.listings(listing_tier);

-- Add product_type to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'featured'
    CHECK (product_type IN ('featured', 'listing_tier', 'subscription'));

-- Add payment_type and subscription_id to payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'featured'
    CHECK (payment_type IN ('featured', 'listing_tier', 'subscription')),
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.agency_subscriptions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payments_payment_type_idx ON payments(payment_type);
CREATE INDEX IF NOT EXISTS payments_subscription_id_idx ON payments(subscription_id);

-- Backfill: existing published listings get tier_paid_at set
UPDATE public.listings
SET tier_paid_at = COALESCE(published_at, created_at)
WHERE status IN ('published', 'under_offer', 'sold');

-- Backfill: active featured listings get 'featured' tier
UPDATE public.listings
SET listing_tier = 'featured'
WHERE is_featured = true
  AND featured_until IS NOT NULL
  AND featured_until > now();
