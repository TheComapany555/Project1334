-- Pre-launch site-wide password gate.
-- A single shared password that every visitor must enter before the site
-- renders. The plaintext is never stored — only a bcrypt hash, verified
-- server-side by /api/site-gate/unlock. The gate is toggled on/off at the
-- edge via the SITE_GATE_ENABLED env var; the password lives here.

CREATE TABLE IF NOT EXISTS public.site_access_gate (
  -- Singleton: there is only ever one gate password for the whole site.
  id            boolean PRIMARY KEY DEFAULT true,
  password_hash text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_access_gate_singleton CHECK (id = true)
);

ALTER TABLE public.site_access_gate ENABLE ROW LEVEL SECURITY;
-- Service-role only — the unlock API reads the hash and verifies server-side.

COMMENT ON TABLE public.site_access_gate IS
  'Singleton row holding the bcrypt hash of the pre-launch site-wide access password. Verified server-side by /api/site-gate/unlock. Toggle the gate on/off with the SITE_GATE_ENABLED env var; set/rotate the password with `npm run seed:site-gate`.';
COMMENT ON COLUMN public.site_access_gate.password_hash IS
  'bcrypt hash (cost 12) of the shared access password. Never store plaintext.';

DROP TRIGGER IF EXISTS trg_site_access_gate_updated_at ON public.site_access_gate;
CREATE TRIGGER trg_site_access_gate_updated_at
  BEFORE UPDATE ON public.site_access_gate
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_data_room();
