-- Feature #1: Admin / Agency Direct Account Creation (Bypass Email Verification)
-- Adds:
--   1. 'set_password' auth_tokens type — used for the "Set Password" link emailed
--      to users whose accounts are created by an admin (or agency owner). Longer
--      TTL than the regular 1h password_reset because the recipient may not be
--      expecting the email.
--   2. admin_audit_log table — records admin-initiated actions for traceability.

ALTER TABLE public.auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_type_check;
ALTER TABLE public.auth_tokens ADD CONSTRAINT auth_tokens_type_check
  CHECK (type IN ('email_verification', 'password_reset', 'mobile_email_otp', 'set_password'));

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action           text NOT NULL,
  target_user_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  target_agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  metadata         jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user ON public.admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
-- No policies: only server (service role) writes/reads this table.

COMMENT ON TABLE public.admin_audit_log IS 'Records admin-initiated actions (e.g. creating broker/agency accounts). Service-role access only.';
