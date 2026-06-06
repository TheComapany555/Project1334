-- Security hardening for Feature #7.
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, and PostgREST
-- exposes public-schema functions as RPC to the anon/authenticated roles. The
-- engagement recompute is an internal maintenance job that only the cron
-- (service_role) should ever call — expose it to nobody else.

REVOKE ALL ON FUNCTION public.recompute_listing_engagement_scores(double precision, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_listing_engagement_scores(double precision, integer) FROM anon;
REVOKE ALL ON FUNCTION public.recompute_listing_engagement_scores(double precision, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_listing_engagement_scores(double precision, integer) TO service_role;
