-- Feature 3: Buyer Listing Alerts — match log
-- Records every (buyer × listing) match so the cron job never double-notifies
-- and the buyer panel can show recent matches.

CREATE TABLE IF NOT EXISTS public.buyer_alert_matches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  preference_id   uuid REFERENCES public.buyer_alert_preferences(id) ON DELETE SET NULL,
  listing_id      uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  matched_at      timestamptz NOT NULL DEFAULT now(),
  email_sent_at   timestamptz,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  -- One row per (buyer, listing) — even when multiple preferences match the same listing,
  -- we notify the buyer exactly once.
  UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_buyer_alert_matches_user_recent
  ON public.buyer_alert_matches (user_id, matched_at DESC);

CREATE INDEX IF NOT EXISTS idx_buyer_alert_matches_listing
  ON public.buyer_alert_matches (listing_id);

ALTER TABLE public.buyer_alert_matches ENABLE ROW LEVEL SECURITY;

-- Buyers can read their own matches; the cron uses the service-role key and
-- bypasses RLS so we don't need separate insert/update policies.
CREATE POLICY buyer_alert_matches_select ON public.buyer_alert_matches
  FOR SELECT USING (auth.uid() = user_id);
