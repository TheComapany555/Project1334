-- Featured listing scope: brokers can pay to feature on the homepage,
-- inside a specific category, or both (independently priced).
-- ============================================================

-- featured_scope: where the listing should appear as featured.
--   homepage  - shown on the main page featured section only
--   category  - shown inside category listing pages only
--   both      - shown on both homepage and within its category
-- Existing is_featured stays as the legacy/global toggle (admin-set);
-- when set without a scope it defaults to 'both' for back-compat.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS featured_scope text
    CHECK (featured_scope IN ('homepage', 'category', 'both')),
  ADD COLUMN IF NOT EXISTS featured_homepage_until timestamptz,
  ADD COLUMN IF NOT EXISTS featured_category_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_listings_featured_homepage
  ON public.listings(featured_homepage_until)
  WHERE featured_homepage_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_featured_category
  ON public.listings(featured_category_until)
  WHERE featured_category_until IS NOT NULL;

-- Backfill: any listing currently is_featured + featured_until in the future
-- is given scope='both' so it keeps appearing in both surfaces.
UPDATE public.listings
SET featured_scope = 'both',
    featured_homepage_until = featured_until,
    featured_category_until = featured_until
WHERE is_featured = true
  AND featured_until IS NOT NULL
  AND featured_until > now()
  AND featured_scope IS NULL;

COMMENT ON COLUMN public.listings.featured_scope IS
  'Most recent paid feature scope: homepage, category, or both. Per-scope expiry tracked in featured_homepage_until / featured_category_until.';
