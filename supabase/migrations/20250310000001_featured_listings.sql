-- Add featured listing fields to listings table
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_package_days INTEGER;

-- Index for fast featured-listing queries and ordering
CREATE INDEX IF NOT EXISTS listings_featured_until_idx
  ON listings(featured_until);

-- Payments table for Stripe transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  broker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,

  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,

  stripe_session_id TEXT,
  stripe_payment_intent TEXT,

  package_days INTEGER NOT NULL,

  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'aud',

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invoiced', 'approved', 'paid')),

  invoice_requested BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Indexes for common payment queries
CREATE INDEX IF NOT EXISTS payments_broker_id_idx ON payments(broker_id);
CREATE INDEX IF NOT EXISTS payments_agency_id_idx ON payments(agency_id);
CREATE INDEX IF NOT EXISTS payments_listing_id_idx ON payments(listing_id);
CREATE INDEX IF NOT EXISTS payments_stripe_session_id_idx ON payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
