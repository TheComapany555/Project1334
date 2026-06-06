-- Tier B / Feature #7: Engagement-Based Listing Ranking.
--
-- A single denormalised engagement_score per listing, recomputed periodically
-- (GitHub Actions cron) from views / saves / call-clicks / enquiries with
-- recency decay — so listings with recent activity rank higher, while old
-- popular listings fade instead of dominating the feed forever. The new
-- "Trending" sort orders by this score. The score is NOT realtime; it is
-- refreshed on a schedule.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS engagement_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_updated_at timestamptz;

COMMENT ON COLUMN public.listings.engagement_score IS
  'Recency-decayed weighted engagement (views/saves/calls/enquiries), recomputed by the listing-ranking cron. Drives the "Trending" sort. Not realtime.';

-- Trending sort orders published listings by this score.
CREATE INDEX IF NOT EXISTS idx_listings_engagement
  ON public.listings(engagement_score DESC)
  WHERE status = 'published';

-- Recompute engagement_score for every listing in one set-based pass (kept in
-- the DB so we never ship raw event rows to Node). Weights reflect intent:
-- enquiry 6 > call 4 > save 3 > view 1. Each event decays by half every
-- `p_half_life_days`; events older than `p_window_days` are ignored (negligible
-- weight, and it bounds the scan).
CREATE OR REPLACE FUNCTION public.recompute_listing_engagement_scores(
  p_half_life_days double precision DEFAULT 14,
  p_window_days integer DEFAULT 60
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_window_start timestamptz := now() - make_interval(days => p_window_days);
  v_decay double precision := ln(2) / GREATEST(p_half_life_days, 0.0001);
BEGIN
  WITH events AS (
    SELECT listing_id, viewed_at AS t, 1.0::double precision AS weight
      FROM public.listing_views WHERE viewed_at > v_window_start
    UNION ALL
    SELECT listing_id, created_at, 3.0 FROM public.user_favorites WHERE created_at > v_window_start
    UNION ALL
    SELECT listing_id, clicked_at, 4.0 FROM public.call_clicks  WHERE clicked_at > v_window_start
    UNION ALL
    SELECT listing_id, created_at, 6.0 FROM public.enquiries    WHERE created_at > v_window_start
  ),
  scores AS (
    SELECT listing_id,
           SUM(weight * exp(-v_decay * EXTRACT(EPOCH FROM (now() - t)) / 86400.0)) AS score
      FROM events
     GROUP BY listing_id
  )
  UPDATE public.listings l
     SET engagement_score = COALESCE(s.score, 0),
         engagement_updated_at = now()
    FROM (SELECT id FROM public.listings) ids
    LEFT JOIN scores s ON s.listing_id = ids.id
   WHERE l.id = ids.id;
END;
$$;

COMMENT ON FUNCTION public.recompute_listing_engagement_scores(double precision, integer) IS
  'Tier B Feature #7: recompute listings.engagement_score from recency-decayed weighted engagement. Called by the listing-ranking cron (npm run cron:listing-ranking).';
