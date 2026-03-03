-- Broker status for admin: active (can log in) or disabled (cannot log in).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'disabled'));

COMMENT ON COLUMN public.profiles.status IS 'Broker only: active = can log in; disabled = admin disabled. Admins always active.';

-- Public broker profile: only show active brokers
DROP POLICY IF EXISTS "profiles_public_select_brokers" ON public.profiles;
CREATE POLICY "profiles_public_select_brokers"
  ON public.profiles FOR SELECT
  TO anon
  USING (role = 'broker' AND status = 'active');
