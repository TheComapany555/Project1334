-- OTP verification for mobile app buyer (user) sign-up — token column stores bcrypt hash of the code
ALTER TABLE public.auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_type_check;
ALTER TABLE public.auth_tokens ADD CONSTRAINT auth_tokens_type_check
  CHECK (type IN ('email_verification', 'password_reset', 'mobile_email_otp'));
