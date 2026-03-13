-- Seed default featured listing products
-- Run this after the products migration (20250310000002_products.sql)

INSERT INTO products (name, description, price, currency, duration_days, status)
VALUES
  (
    'Featured Listing – 7 Days',
    'Boost your listing for 7 days with a featured badge, priority search ranking, and highlighted display.',
    4900,
    'aud',
    7,
    'active'
  ),
  (
    'Featured Listing – 14 Days',
    'Boost your listing for 14 days with a featured badge, priority search ranking, and highlighted display.',
    7900,
    'aud',
    14,
    'active'
  ),
  (
    'Featured Listing – 30 Days',
    'Boost your listing for 30 days with a featured badge, priority search ranking, and highlighted display.',
    12900,
    'aud',
    30,
    'active'
  )
ON CONFLICT DO NOTHING;
