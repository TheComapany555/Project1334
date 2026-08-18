-- Second global toggle: basic_listings_searchable.
--
-- By design, Basic (free) listings are excluded from the marketplace surfaces
-- (homepage + /search) — paid Standard/Featured tiers are what buy that
-- exposure, and Basic listings stay reachable by direct /listing/<slug> URL.
-- See docs/testing-guide-m1-m2.md ("basic = direct URL only").
--
-- That paywall is correct for steady-state trading, but it makes a freshly
-- imported catalogue (every import defaults to tier 'basic') look completely
-- empty on the public site. This flag lets an admin lift the tier gate so ALL
-- published listings appear in browse/search, without deleting the paywall —
-- it can be switched back off at any time to restore tier-based monetisation.
--
-- Defaults to false: existing paywall behaviour is preserved until an admin
-- opts in from /admin/settings.

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS basic_listings_searchable boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.site_settings.basic_listings_searchable IS
  'When true, Basic-tier listings appear on the homepage and /search alongside Standard/Featured. When false (default), only paid tiers and active featured placements are surfaced; Basic remains direct-URL only. Managed from /admin/settings.';

COMMENT ON TABLE public.site_settings IS
  'Singleton row of global site toggles. listings_coming_soon hides all public listings behind a Coming Soon card; basic_listings_searchable lifts the Basic-tier marketplace paywall. Managed from /admin/settings.';
