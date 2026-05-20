-- Email read-receipt tracking on crm_activities.
--
-- We attach a per-email tracking token at send time and inject a 1×1 pixel
-- in the outbound HTML. When the buyer's mail client loads the pixel, our
-- /api/track/email/open endpoint stamps opened_at + bumps open_count on
-- the matching crm_activities row.
--
-- - tracking_token: opaque, generated client-side (nanoid). Nullable because
--   not every activity is an outbound email (calls, notes, etc.).
-- - opened_at: first-open timestamp (kept as the *first* open for analytics;
--   re-opens only bump open_count).
-- - open_count: defaults to 0. Many email clients pre-fetch images for spam
--   filtering, so a count of 1 isn't strictly proof of a human open — but
--   it's still the industry-standard signal brokers expect.

ALTER TABLE public.crm_activities
  ADD COLUMN IF NOT EXISTS tracking_token text,
  ADD COLUMN IF NOT EXISTS opened_at      timestamptz,
  ADD COLUMN IF NOT EXISTS open_count     integer NOT NULL DEFAULT 0;

-- Partial unique index so we can look up the row by token in O(log n) without
-- forcing every non-email row to carry a NULL slot in a unique constraint.
CREATE UNIQUE INDEX IF NOT EXISTS crm_activities_tracking_token_idx
  ON public.crm_activities (tracking_token)
  WHERE tracking_token IS NOT NULL;
