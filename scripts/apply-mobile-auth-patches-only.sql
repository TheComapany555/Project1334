-- =============================================================================
-- Mobile auth patches ONLY (run in Supabase → SQL → New query)
-- =============================================================================
-- Use this when `supabase db push` fails with "relation already exists" because
-- your remote DB was built outside the migration history. This applies ONLY:
--   1) auth_tokens.type = mobile_email_otp (OTP email verification)
--   2) profiles.role includes 'user' (mobile buyers)
-- Safe to run multiple times (idempotent).
-- =============================================================================

-- ── 1) auth_tokens: allow type 'mobile_email_otp' ──────────────────────────
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT c.conname::text AS cname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'auth_tokens'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%type%IN%(%'
      AND pg_get_constraintdef(c.oid) NOT LIKE '%mobile_email_otp%'
  LOOP
    EXECUTE format('ALTER TABLE public.auth_tokens DROP CONSTRAINT %I', rec.cname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'auth_tokens'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%mobile_email_otp%'
  ) THEN
    ALTER TABLE public.auth_tokens ADD CONSTRAINT auth_tokens_type_check
      CHECK (type IN ('email_verification', 'password_reset', 'mobile_email_otp'));
  END IF;
END $$;

-- ── 2) profiles.role: allow 'user' ─────────────────────────────────────────
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT c.conname::text AS cname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'profiles'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%role%IN%(%'
      AND pg_get_constraintdef(c.oid) NOT LIKE '%''user''%'
      AND pg_get_constraintdef(c.oid) NOT LIKE '% user,%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', rec.cname);
  END LOOP;
END $$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('broker', 'admin', 'user'));

COMMENT ON TABLE public.profiles IS '1:1 with users; role: broker | admin | user (mobile buyers).';

-- Done. Try registering again in the mobile app.
