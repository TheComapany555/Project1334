-- Performance optimization: add missing indexes on frequently queried columns
-- and an RPC for atomic ad click counting.

-- ═══════════════════════════════════════════════════════════════
-- Missing indexes on foreign keys and filter columns
-- ═══════════════════════════════════════════════════════════════

-- listing_highlight_map: queried on every listing fetch
CREATE INDEX IF NOT EXISTS idx_listing_highlight_map_listing_id
  ON listing_highlight_map (listing_id);

CREATE INDEX IF NOT EXISTS idx_listing_highlight_map_highlight_id
  ON listing_highlight_map (highlight_id);

-- user_favorites: queried every time the saved tab loads
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id
  ON user_favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_listing_id
  ON user_favorites (listing_id);

-- enquiries: frequently filtered by broker_id, listing_id, and user_id
CREATE INDEX IF NOT EXISTS idx_enquiries_listing_id
  ON enquiries (listing_id);

CREATE INDEX IF NOT EXISTS idx_enquiries_broker_id
  ON enquiries (broker_id);

-- listing_views: analytics queries filter by listing_id and viewed_at
CREATE INDEX IF NOT EXISTS idx_listing_views_listing_id
  ON listing_views (listing_id);

CREATE INDEX IF NOT EXISTS idx_listing_views_viewed_at
  ON listing_views (viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_views_listing_viewed
  ON listing_views (listing_id, viewed_at DESC);

-- nda_signatures: queried by listing_id in analytics
CREATE INDEX IF NOT EXISTS idx_nda_signatures_listing_id
  ON nda_signatures (listing_id);

-- listings: commonly filtered by status, broker_id, agency_id
CREATE INDEX IF NOT EXISTS idx_listings_status
  ON listings (status);

CREATE INDEX IF NOT EXISTS idx_listings_broker_id
  ON listings (broker_id);

CREATE INDEX IF NOT EXISTS idx_listings_agency_id
  ON listings (agency_id);

CREATE INDEX IF NOT EXISTS idx_listings_slug
  ON listings (slug);

-- Composite index for published listings search (most common query)
CREATE INDEX IF NOT EXISTS idx_listings_published_search
  ON listings (status, admin_removed_at, listing_tier, published_at DESC)
  WHERE status = 'published' AND admin_removed_at IS NULL;

-- Featured listings filter
CREATE INDEX IF NOT EXISTS idx_listings_featured
  ON listings (is_featured, featured_until DESC)
  WHERE is_featured = true;

-- listing_images: queried by listing_id on every listing render
CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id
  ON listing_images (listing_id, sort_order);

-- listing_documents: queried by listing_id
CREATE INDEX IF NOT EXISTS idx_listing_documents_listing_id
  ON listing_documents (listing_id);

-- products: filtered by status and product_type
CREATE INDEX IF NOT EXISTS idx_products_status_type
  ON products (status, product_type);

-- agency_pricing_overrides: looked up by product_id
CREATE INDEX IF NOT EXISTS idx_agency_pricing_product_id
  ON agency_pricing_overrides (product_id);

-- payments: filtered by created_at for reporting
CREATE INDEX IF NOT EXISTS idx_payments_created_at
  ON payments (created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- Atomic ad click increment RPC
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_ad_click(ad_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE advertisements
  SET click_count = COALESCE(click_count, 0) + 1
  WHERE id = ad_id;
$$;
