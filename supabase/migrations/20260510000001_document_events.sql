-- M1 audit fix — track real document view + download events per buyer.
--
-- Closes the spec gap in Section 1 "Buyer Activity": "Documents viewed" and
-- "Documents downloaded" were never recorded — the only signal we had was
-- whether the broker had approved access. Now we record actual events when
-- a buyer opens or downloads a confidential file.
--
-- The buyer panel + full profile read this to power:
--   - per-listing `documents_viewed` (count of view events)
--   - per-listing `documents_downloaded` (count of download events)
--   - the activity timeline (`document_downloaded` kind)
--
-- Down (reference): DROP TABLE IF EXISTS public.document_events;

CREATE TABLE IF NOT EXISTS public.document_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid NOT NULL REFERENCES public.listing_documents(id) ON DELETE CASCADE,
  listing_id    uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  event_kind    text NOT NULL CHECK (event_kind IN ('view', 'download')),
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  ip_address    text
);

CREATE INDEX IF NOT EXISTS idx_doc_events_listing_doc
  ON public.document_events (listing_id, document_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_doc_events_user
  ON public.document_events (user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_doc_events_listing_kind
  ON public.document_events (listing_id, event_kind);

ALTER TABLE public.document_events ENABLE ROW LEVEL SECURITY;
-- Service-role only — server actions enforce the boundary.

COMMENT ON TABLE public.document_events IS
  'One row per document view/download. Powers per-buyer document metrics and the document_viewed/document_downloaded timeline events.';
