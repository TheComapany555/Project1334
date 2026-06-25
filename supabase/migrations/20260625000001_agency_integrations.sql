-- Agency listing-source integrations (Feature: Agentbox / Reapit connector).
--
-- Stores per-agency credentials + sync state for external listing sources. The
-- connector reuses the existing `listing_external_refs` table for de-duplication
-- (just a new `source_platform` value, e.g. 'agentbox') and `listing_vendor_details`
-- for private vendor info — so no new tables are needed for the import itself.
--
-- Design:
--   * Per-agency: one connection per (agency, platform). Only agency owners
--     connect; imported listings are shared across the agency. This matches how
--     Agentbox issues one Client ID + API Key per office/group.
--   * Credentials are NEVER stored in plaintext: `api_key_encrypted` holds an
--     AES-256-GCM payload (see lib/crypto/secrets.ts). `client_id` is not secret
--     but is only ever returned to the client masked.
--   * RLS enabled with NO policies => only the service-role client (server
--     actions) can read/write. Credentials never reach the browser.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.agency_integrations (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id         uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  platform          text NOT NULL,                 -- 'agentbox' (extensible)
  client_id         text NOT NULL,
  api_key_encrypted text NOT NULL,                 -- AES-256-GCM (iv.tag.ciphertext)
  status            text NOT NULL DEFAULT 'pending_ip_whitelist'
                      CHECK (status IN ('connected', 'pending_ip_whitelist', 'error', 'disconnected')),
  last_error        text,
  last_synced_at    timestamptz,
  last_sync_result  jsonb,
  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (agency_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_agency_integrations_agency ON public.agency_integrations(agency_id);

ALTER TABLE public.agency_integrations ENABLE ROW LEVEL SECURITY;
-- (intentionally no policies — private to the service role; credentials at rest)
