-- M1.3: Internal Messaging / Chat (Broker ↔ Buyer)
--
-- One thread per (broker, buyer, listing). When listing_id is NULL the thread
-- is the "general" thread between that broker and buyer (used when they
-- already have multiple listings and want a single ongoing chat). The unique
-- constraint accepts NULL listing_id once because we use NULLS NOT DISTINCT
-- (Postgres 15+; Supabase baseline).
--
-- Both tables: RLS enabled, no public/authenticated policies — service-role
-- writes only via `requireAuth()`-scoped server actions. NextAuth's
-- `auth.uid()` is NULL on the Postgres side, so RLS policies that key on it
-- are useless here — the server actions are the boundary.
--
-- Down (reference):
--   DROP TABLE IF EXISTS public.messages;
--   DROP TABLE IF EXISTS public.message_threads;

-- ── 1. Threads ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.message_threads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id            uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  broker_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_at       timestamptz,
  last_message_preview  text,                  -- first ~140 chars of latest msg
  last_sender_role      text CHECK (last_sender_role IN ('broker', 'buyer')),
  broker_unread_count   int  NOT NULL DEFAULT 0,
  buyer_unread_count    int  NOT NULL DEFAULT 0,
  archived_by_broker    boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- One thread per (broker, buyer, listing). NULL listing_id (the "general"
-- thread) is unique-by-pair too, hence NULLS NOT DISTINCT.
CREATE UNIQUE INDEX IF NOT EXISTS idx_threads_unique_triple
  ON public.message_threads (broker_id, buyer_user_id, listing_id) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_threads_broker_recent
  ON public.message_threads (broker_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_threads_buyer_recent
  ON public.message_threads (buyer_user_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_threads_listing
  ON public.message_threads (listing_id)
  WHERE listing_id IS NOT NULL;

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.message_threads IS
  'Broker↔buyer chat thread. Listing-scoped when listing_id is set; "general" when NULL. Server actions enforce participant access.';

-- ── 2. Messages ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id     uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_role   text NOT NULL CHECK (sender_role IN ('broker', 'buyer')),
  body          text NOT NULL,
  attachments   jsonb NOT NULL DEFAULT '[]'::jsonb,    -- [{ url, name, size, mime }]
  read_at       timestamptz,                            -- set when recipient reads
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON public.messages (thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_thread_unread
  ON public.messages (thread_id, sender_role, read_at)
  WHERE read_at IS NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.messages IS
  'Individual chat messages. read_at is set on the recipient''s viewing — sender side is not tracked separately.';
COMMENT ON COLUMN public.messages.attachments IS
  'Array of { url, name, size, mime }. Files live in the message-attachments storage bucket; URLs here are private signed URLs minted on read.';

-- ── 3. Storage bucket for attachments ────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Service-role only — same pattern as listing-documents.
CREATE POLICY "Service role can manage message attachments"
  ON storage.objects FOR ALL
  USING (bucket_id = 'message-attachments')
  WITH CHECK (bucket_id = 'message-attachments');

-- ── 4. updated_at trigger on messages → bump the thread ──────────────────
-- Avoids needing the application to issue a separate UPDATE every time.

CREATE OR REPLACE FUNCTION public.bump_thread_on_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.message_threads
     SET last_message_at      = NEW.created_at,
         last_message_preview = LEFT(NEW.body, 140),
         last_sender_role     = NEW.sender_role,
         broker_unread_count  = CASE
           WHEN NEW.sender_role = 'buyer'
             THEN broker_unread_count + 1
             ELSE broker_unread_count
         END,
         buyer_unread_count   = CASE
           WHEN NEW.sender_role = 'broker'
             THEN buyer_unread_count + 1
             ELSE buyer_unread_count
         END,
         updated_at           = NEW.created_at
   WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_thread_on_message ON public.messages;
CREATE TRIGGER trg_bump_thread_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.bump_thread_on_message();
