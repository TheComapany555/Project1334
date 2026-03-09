-- Platform products table (admin-managed)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  description TEXT,

  price INTEGER NOT NULL,          -- price in cents
  currency TEXT NOT NULL DEFAULT 'aud',

  duration_days INTEGER,           -- e.g. 7, 14, 30 for featured listings

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add product reference to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payments_product_id_idx ON payments(product_id);
