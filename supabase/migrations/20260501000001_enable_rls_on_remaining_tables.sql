-- ============================================================================
-- Enable Row-Level Security on tables flagged by Supabase's security advisor
-- ----------------------------------------------------------------------------
-- All three tables are accessed exclusively from server-side code via
-- createServiceRoleClient() (lib/supabase/admin.ts), and the service role key
-- bypasses RLS. Enabling RLS without permissive policies therefore locks the
-- tables down to server-only access without breaking application code.
--
-- This matches the pattern already used by discount_codes
-- (20260427000001_discount_codes.sql).
-- ============================================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
