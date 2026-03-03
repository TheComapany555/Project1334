-- Allow 'pending' status for brokers awaiting admin approval.
-- Pending brokers cannot sign in until an admin sets status to 'active'.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'active', 'disabled'));

COMMENT ON COLUMN public.profiles.status IS 'Broker only: pending = awaiting approval; active = can log in; disabled = admin disabled.';
