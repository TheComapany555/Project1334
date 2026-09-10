-- Third global toggle: billing_enabled ("free mode" switch).
--
-- Client request (Sep 2026): run the platform completely free for ~6 months
-- to drive adoption, but keep the option to switch payments back on later
-- without a redeploy. This flag is that switch.
--
-- When billing_enabled = false (FREE MODE, the default):
--   * agency subscription gate is off: every broker/agency passes
--     checkAgencySubscriptionAccess and the dashboard lock screen never shows;
--   * listing tier paywall is off: the tier picker is hidden, new listings are
--     created as 'basic', and publish/go-live never require tier payment;
--   * Basic-tier marketplace exclusion is off: every published listing is
--     discoverable on the homepage and /search regardless of tier;
--   * subscribe / payments / featured-upgrade surfaces are hidden.
-- When billing_enabled = true, all of the above paywalls behave as before.
--
-- Nothing is deleted: plans, subscriptions, Stripe wiring and the per-agency
-- subscription_exempt waiver all remain intact and take effect again the
-- moment the flag is switched back on from /admin/settings.
--
-- Code reads this column FAIL-OPEN-TO-FREE (missing column => false) so that
-- deploying ahead of this migration already gives the client the free
-- platform he asked for; the admin switch just can't be flipped until the
-- migration is applied.

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS billing_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.site_settings.billing_enabled IS
  'When false (default = free mode), every subscription and listing-tier paywall is switched off and all published listings are discoverable. When true, normal billing applies. Managed from /admin/settings.';

COMMENT ON TABLE public.site_settings IS
  'Singleton row of global site toggles. listings_coming_soon hides all public listings behind a Coming Soon card; basic_listings_searchable lifts the Basic-tier marketplace paywall; billing_enabled switches all subscription/listing paywalls on (true) or off (false = free mode). Managed from /admin/settings.';
