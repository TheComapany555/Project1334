-- Listing tier products (upsert by name+product_type)
INSERT INTO products (name, description, price, currency, duration_days, status, product_type)
VALUES
  ('Basic Listing', 'Visible via direct link only. No search result placement.', 0, 'aud', NULL, 'active', 'listing_tier'),
  ('Standard Listing', 'Full visibility in search results and category pages.', 4900, 'aud', NULL, 'active', 'listing_tier'),
  ('Featured Listing Tier', 'Homepage placement, top search ranking, and featured badge for 30 days.', 9900, 'aud', 30, 'active', 'listing_tier')
ON CONFLICT (name, product_type) DO UPDATE SET
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  duration_days = EXCLUDED.duration_days,
  status = EXCLUDED.status;

-- Monthly subscription product
INSERT INTO products (name, description, price, currency, duration_days, status, product_type)
VALUES
  ('Agency Monthly Subscription', 'Monthly platform access for your agency. All brokers included.', 19900, 'aud', 30, 'active', 'subscription')
ON CONFLICT (name, product_type) DO UPDATE SET
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  duration_days = EXCLUDED.duration_days,
  status = EXCLUDED.status;
