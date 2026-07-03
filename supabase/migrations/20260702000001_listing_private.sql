-- Private Listings (off-market): a broker-only visibility axis, orthogonal to status.
-- A listing is publicly visible only when status='published' AND admin_removed_at IS NULL
-- AND is_private = false. Private listings stay in the broker dashboard/CRM but never
-- appear on any public/anon surface. Mirrors the admin_removed_at precedent.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listings.is_private IS 'Broker-set off-market flag. When true the listing is hidden from all public/anon surfaces (search, detail, profiles, sitemap, buyer alerts, mobile) but stays visible in the broker dashboard/CRM.';

-- Tighten the anon SELECT policy so a private listing is never readable via the anon key
-- (PostgREST bypasses the in-code filters; RLS is the last line of defence here).
DROP POLICY IF EXISTS "listings_public_select_published" ON public.listings;
CREATE POLICY "listings_public_select_published"
  ON public.listings FOR SELECT
  TO anon
  USING (status = 'published' AND is_private = false);

-- Partial index for the hot public-visibility filter.
CREATE INDEX IF NOT EXISTS idx_listings_public_visible
  ON public.listings (status, published_at)
  WHERE is_private = false AND admin_removed_at IS NULL;
