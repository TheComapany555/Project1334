-- M2 Phase 7: optional broader region tag on listings.
-- ============================================================
--
-- Brokers asked for a wider-area tag (e.g. "Sydney", "North Shore",
-- "Western Sydney", "Regional NSW") so they can list a business without
-- having to commit to a specific suburb early in the sale.
--
-- Implemented as a free-text column rather than a lookup table so we can
-- evolve the suggested-regions list in code without future migrations.
-- The broker UI offers a curated dropdown but stores the chosen label as text.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS region text;

CREATE INDEX IF NOT EXISTS idx_listings_region
  ON public.listings(region)
  WHERE region IS NOT NULL;

COMMENT ON COLUMN public.listings.region IS
  'Optional broader-area tag (e.g. "Sydney", "North Shore", "Regional NSW"). Free text; the broker UI uses a curated suggestions list.';
