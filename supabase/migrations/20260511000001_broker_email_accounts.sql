-- Connected Inbox (M1.2 §Email Logging) — per-broker OAuth tokens for
-- Gmail / Outlook / etc. When a broker connects their inbox, the Salebiz
-- composer sends THROUGH their account (gmail.users.messages.send), so:
--   - emails appear in the broker's own Sent folder
--   - replies thread naturally in their inbox
--   - Salebiz auto-logs every send to CRM
--
-- Tokens are stored as ciphertext only — encryption is done at the
-- application layer (lib/crypto/email-tokens.ts) with AES-256-GCM and a
-- secret loaded from EMAIL_TOKEN_ENCRYPTION_KEY. The DB never sees plaintext
-- refresh tokens.
--
-- Down (reference): DROP TABLE IF EXISTS public.broker_email_accounts;

CREATE TABLE IF NOT EXISTS public.broker_email_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider            text NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  /** The actual mailbox address — joe@brokeragency.com.au */
  email_address       text NOT NULL,
  /** The display name returned by the provider (used as From). */
  display_name        text,
  /** AES-256-GCM ciphertext. Never logged. */
  access_token_enc    text,
  refresh_token_enc   text,
  access_expires_at   timestamptz,
  scopes              text[] NOT NULL DEFAULT '{}',
  status              text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'revoked', 'error')),
  last_synced_at      timestamptz,
  last_error          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- One account per provider per broker. Reconnecting overwrites.
  UNIQUE (broker_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_broker_email_accounts_broker
  ON public.broker_email_accounts (broker_id);

ALTER TABLE public.broker_email_accounts ENABLE ROW LEVEL SECURITY;
-- Service-role only — server actions enforce the boundary. Refresh tokens
-- must never be exposed to any client.

COMMENT ON TABLE public.broker_email_accounts IS
  'OAuth-connected inboxes per broker. Tokens encrypted at rest via app-layer AES-256-GCM. Drives Connected Inbox composer flow.';
COMMENT ON COLUMN public.broker_email_accounts.access_token_enc IS
  'AES-256-GCM ciphertext (base64-url). Decrypt server-side only.';
COMMENT ON COLUMN public.broker_email_accounts.refresh_token_enc IS
  'AES-256-GCM ciphertext (base64-url). Decrypt server-side only.';
