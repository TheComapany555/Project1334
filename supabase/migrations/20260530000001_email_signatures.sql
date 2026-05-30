-- Feature #4: Automatic Email Signature
-- Adds:
--   1. profiles.signature_title — broker's job title (e.g. "Senior Business Broker")
--   2. profiles.signature_html — broker's custom HTML signature override; when
--      non-null, used verbatim. When null, the platform auto-builds a signature
--      from the broker's profile + agency data.
--   3. profiles.signature_enabled — kill switch so brokers can opt out.
--   4. agencies.signature_disclaimer — agency-level disclaimer appended to the
--      auto-built signature for every broker in the agency.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signature_title    text,
  ADD COLUMN IF NOT EXISTS signature_html     text,
  ADD COLUMN IF NOT EXISTS signature_enabled  boolean NOT NULL DEFAULT true;

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS signature_disclaimer text;

COMMENT ON COLUMN public.profiles.signature_title IS
  'Optional job title shown in the broker''s automatic email signature (e.g. "Senior Business Broker").';
COMMENT ON COLUMN public.profiles.signature_html IS
  'Custom HTML signature that overrides the auto-built signature when present.';
COMMENT ON COLUMN public.profiles.signature_enabled IS
  'When false, no signature is appended to broker-composed outbound emails.';
COMMENT ON COLUMN public.agencies.signature_disclaimer IS
  'Agency disclaimer appended to every auto-built broker signature from this agency.';
