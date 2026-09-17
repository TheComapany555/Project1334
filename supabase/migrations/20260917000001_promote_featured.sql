-- Fourth global toggle: promote_featured ("sell Featured while the site is free").
--
-- Client request (Sep 2026): the platform currently runs in FREE MODE
-- (billing_enabled = false, migration 20260910000001), which hides every paid
-- surface including featured upgrades. The client still wants to earn from
-- Featured placements during the free period, so this flag re-opens ONLY the
-- featured upsell while everything else stays free.
--
-- When promote_featured = true:
--   * a one-time upsell dialog is offered to the broker right after they
--     publish a listing (dismissal is remembered per listing, so it never nags);
--   * the "Feature this listing" action and the /feature page work normally,
--     even while billing_enabled is false;
--   * nothing else changes: no subscription is required, listing tiers stay
--     free, and every published listing is still discoverable.
--
-- What paying actually buys (unchanged behaviour, just sold again): the
-- homepage featured rail, top-of-search ranking within the chosen scope, and
-- the Featured badge. Free listings remain searchable, they simply rank
-- normally and never reach the homepage rail.
--
-- Independent of billing_enabled on purpose: the client can switch the upsell
-- off without turning paywalls back on, and vice versa. When billing_enabled
-- is true the featured surfaces are available regardless of this flag.
--
-- Fails CLOSED (missing column => false): a deploy ahead of this migration
-- keeps the quiet free-mode experience rather than surprising brokers with an
-- unexpected sales dialog.

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS promote_featured boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.site_settings.promote_featured IS
  'When true, featured-listing upgrades are promoted and purchasable even while billing_enabled is false (free mode): brokers see a one-time upsell dialog after publishing and the /feature page stays open. Does not affect subscriptions or listing tiers. Managed from /admin/settings.';

COMMENT ON TABLE public.site_settings IS
  'Singleton row of global site toggles. listings_coming_soon hides all public listings behind a Coming Soon card; basic_listings_searchable lifts the Basic-tier marketplace paywall; billing_enabled switches all subscription/listing paywalls on (true) or off (false = free mode); promote_featured sells Featured placements during free mode. Managed from /admin/settings.';
