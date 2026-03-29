-- profiles.role must allow 'user' for mobile buyer accounts (was only broker|admin)
-- Drops the OLD check (no 'user' in definition) even if Postgres named it something other than profiles_role_check.

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT c.conname::text AS cname, pg_get_constraintdef(c.oid) AS def
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
