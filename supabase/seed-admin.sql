-- Seed an admin user for testing. Run in Supabase SQL Editor (or psql).
-- Login: admin@salebiz.com.au / admin123

WITH u AS (
  INSERT INTO public.users (email, password_hash, email_verified_at, updated_at)
  VALUES (
    'admin@salebiz.com.au',
    '$2b$12$S7KNLik9EkI/xBu8XZkGeuuxdWBn89w5E2gOph1bbOsa.36WFstQW',
    now(),
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    email_verified_at = now(),
    updated_at = now()
  RETURNING id
)
INSERT INTO public.profiles (id, role, name, updated_at)
SELECT id, 'admin', 'Admin', now() FROM u
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = now();
