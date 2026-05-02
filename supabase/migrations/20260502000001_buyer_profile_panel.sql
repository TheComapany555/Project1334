-- Feature 2: Buyer Profile Panel
-- 1) Saved alert preferences for buyers (Feature 3 cron will read from this).
-- 2) Extend notifications enum so brokers/listings can ping buyers.

-- ── Buyer alert preferences ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.buyer_alert_preferences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label           text,                                    -- friendly name e.g. "Sydney cafés"
  business_type   text,                                    -- free-text keyword for matching (e.g. "café")
  category_id     uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  state           text,                                    -- AU state code (e.g. "NSW")
  suburb          text,
  min_price       bigint CHECK (min_price IS NULL OR min_price >= 0),
  max_price       bigint CHECK (max_price IS NULL OR max_price >= 0),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (
    min_price IS NULL OR max_price IS NULL OR min_price <= max_price
  )
);

CREATE INDEX IF NOT EXISTS idx_buyer_alert_prefs_user
  ON public.buyer_alert_preferences (user_id);

CREATE INDEX IF NOT EXISTS idx_buyer_alert_prefs_active
  ON public.buyer_alert_preferences (is_active)
  WHERE is_active = true;

ALTER TABLE public.buyer_alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY buyer_alert_prefs_select ON public.buyer_alert_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY buyer_alert_prefs_insert ON public.buyer_alert_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY buyer_alert_prefs_update ON public.buyer_alert_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY buyer_alert_prefs_delete ON public.buyer_alert_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- ── Notification types ─────────────────────────────────────────────────────
-- Add buyer-specific notification types: shared listings, alert matches,
-- enquiry confirmation copy for the buyer's own bell.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'enquiry_received',
    'enquiry_reply',
    'enquiry_sent',
    'listing_published',
    'listing_unpublished',
    'listing_shared',
    'listing_alert_match',
    'payment_received',
    'payment_approved',
    'invoice_requested',
    'subscription_activated',
    'subscription_cancelled',
    'subscription_expiring',
    'broker_joined',
    'broker_removed',
    'agency_approved',
    'general'
  ));
