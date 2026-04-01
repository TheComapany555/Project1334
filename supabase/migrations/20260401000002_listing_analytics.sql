-- Milestone 3 (Analytics): Listing Views Tracking
-- =================================================

CREATE TABLE IF NOT EXISTS listing_views (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       uuid        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id          uuid        REFERENCES users(id) ON DELETE SET NULL,
  platform         text        NOT NULL DEFAULT 'web'
                               CHECK (platform IN ('web', 'mobile')),
  duration_seconds integer,
  viewed_at        timestamptz NOT NULL DEFAULT now(),
  ip_address       text
);

CREATE INDEX idx_listing_views_listing    ON listing_views(listing_id);
CREATE INDEX idx_listing_views_user       ON listing_views(user_id);
CREATE INDEX idx_listing_views_platform   ON listing_views(listing_id, platform);
CREATE INDEX idx_listing_views_date       ON listing_views(listing_id, viewed_at DESC);

ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;

-- Brokers can SELECT views for their own listings
CREATE POLICY "Brokers can view own listing analytics"
  ON listing_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_id
        AND listings.broker_id = auth.uid()
    )
  );

-- Agency owners can SELECT views for all agency listings
CREATE POLICY "Agency owners can view agency listing analytics"
  ON listing_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings l
      JOIN profiles p ON p.agency_id = l.agency_id
      WHERE l.id = listing_id
        AND p.id = auth.uid()
        AND p.agency_role = 'owner'
    )
  );

-- Admins can SELECT all views
CREATE POLICY "Admins can view all listing analytics"
  ON listing_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
