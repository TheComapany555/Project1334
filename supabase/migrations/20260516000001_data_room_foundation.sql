-- M2 Phase 1: Virtual Data Room foundation
-- ============================================================
--
-- Restructures NDA + document approval into a unified virtual Virtual Data Room model
-- where a buyer requests access to a listing's Virtual Data Room (not individual
-- documents), the broker approves with a chosen access level + permissions +
-- optional expiry, and document/folder visibility flows from that single
-- access record.
--
-- Adds:
--   * document_folders             — folder/subfolder hierarchy per listing
--   * listing_documents.folder_id  — file → folder link
--   * listing_documents.description, .version  — file metadata
--   * buyer_data_room_access       — one row per (listing, buyer)
--   * buyer_data_room_permissions  — granular file/folder grants when access_level='selected'
--
-- Backfills existing approved document_access_requests into the new model so
-- nothing breaks for buyers who already had approved access.
--
-- The legacy document_access_requests table is kept (not dropped) for
-- audit/history; new code reads from buyer_data_room_access / _permissions.

-- ── 1. Folders ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.document_folders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  parent_folder_id  uuid REFERENCES public.document_folders(id) ON DELETE CASCADE,
  name              text NOT NULL,
  description       text,
  sort_order        integer NOT NULL DEFAULT 0,
  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_folders_no_self_parent CHECK (id <> parent_folder_id),
  CONSTRAINT document_folders_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_document_folders_listing
  ON public.document_folders(listing_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent
  ON public.document_folders(parent_folder_id);
-- Two folders cannot share the same name under the same parent within a listing.
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_folders_name_per_parent
  ON public.document_folders(listing_id, COALESCE(parent_folder_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
-- Service-role only — server actions enforce the broker/buyer boundary.

COMMENT ON TABLE public.document_folders IS
  'Folder hierarchy for a listing''s Virtual Data Room. Subfolders supported via parent_folder_id. NULL parent = top-level folder for the listing.';

-- ── 2. Listing documents — folder + metadata ─────────────────

ALTER TABLE public.listing_documents
  ADD COLUMN IF NOT EXISTS folder_id        uuid REFERENCES public.document_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description      text,
  ADD COLUMN IF NOT EXISTS version          integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_listing_documents_folder
  ON public.listing_documents(folder_id);

COMMENT ON COLUMN public.listing_documents.folder_id IS
  'Optional folder this document lives in. NULL = root level of the listing Virtual Data Room.';
COMMENT ON COLUMN public.listing_documents.version IS
  'Increment on re-upload over the same document slot. Reserved for future versioning UI.';

-- ── 3. Buyer data-room access (one row per listing+buyer) ────

CREATE TABLE IF NOT EXISTS public.buyer_data_room_access (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'revoked', 'expired')),
  access_level        text NOT NULL DEFAULT 'all'
    CHECK (access_level IN ('all', 'selected')),
  download_allowed    boolean NOT NULL DEFAULT true,
  requested_at        timestamptz NOT NULL DEFAULT now(),
  reviewed_at         timestamptz,
  reviewed_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at          timestamptz,
  expired_at          timestamptz,
  revoked_at          timestamptz,
  denial_reason       text,
  broker_notes        text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_buyer_data_room_access_buyer
  ON public.buyer_data_room_access(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_data_room_access_listing_status
  ON public.buyer_data_room_access(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_buyer_data_room_access_expires
  ON public.buyer_data_room_access(expires_at)
  WHERE expires_at IS NOT NULL AND status = 'approved';

ALTER TABLE public.buyer_data_room_access ENABLE ROW LEVEL SECURITY;
-- Service-role only — server actions enforce the boundary.

COMMENT ON TABLE public.buyer_data_room_access IS
  'One row per (listing, buyer) describing the buyer''s access state to that listing''s Virtual Data Room. Replaces per-document approval as the primary gate.';
COMMENT ON COLUMN public.buyer_data_room_access.access_level IS
  'all = buyer sees every approved document in the Virtual Data Room. selected = buyer sees only files/folders listed in buyer_data_room_permissions.';
COMMENT ON COLUMN public.buyer_data_room_access.download_allowed IS
  'When false, buyer can preview but not download files.';

-- ── 4. Per-folder / per-file grants for selected access ─────

CREATE TABLE IF NOT EXISTS public.buyer_data_room_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_id   uuid NOT NULL REFERENCES public.buyer_data_room_access(id) ON DELETE CASCADE,
  folder_id   uuid REFERENCES public.document_folders(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.listing_documents(id) ON DELETE CASCADE,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  granted_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT buyer_data_room_permissions_target_xor CHECK (
    (folder_id IS NOT NULL AND document_id IS NULL) OR
    (folder_id IS NULL AND document_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_buyer_data_room_permissions_access
  ON public.buyer_data_room_permissions(access_id);
CREATE INDEX IF NOT EXISTS idx_buyer_data_room_permissions_folder
  ON public.buyer_data_room_permissions(folder_id)
  WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_buyer_data_room_permissions_document
  ON public.buyer_data_room_permissions(document_id)
  WHERE document_id IS NOT NULL;

-- One grant per (access, folder) and (access, document) — no duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS uq_buyer_data_room_permissions_folder
  ON public.buyer_data_room_permissions(access_id, folder_id)
  WHERE folder_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_buyer_data_room_permissions_document
  ON public.buyer_data_room_permissions(access_id, document_id)
  WHERE document_id IS NOT NULL;

ALTER TABLE public.buyer_data_room_permissions ENABLE ROW LEVEL SECURITY;
-- Service-role only — server actions enforce the boundary.

COMMENT ON TABLE public.buyer_data_room_permissions IS
  'Folders or documents granted to a specific buyer access record. Only consulted when buyer_data_room_access.access_level = ''selected''.';

-- ── 5. updated_at triggers ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at_data_room()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_document_folders_updated_at ON public.document_folders;
CREATE TRIGGER trg_document_folders_updated_at
  BEFORE UPDATE ON public.document_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_data_room();

DROP TRIGGER IF EXISTS trg_buyer_data_room_access_updated_at ON public.buyer_data_room_access;
CREATE TRIGGER trg_buyer_data_room_access_updated_at
  BEFORE UPDATE ON public.buyer_data_room_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_data_room();

DROP TRIGGER IF EXISTS trg_listing_documents_updated_at ON public.listing_documents;
CREATE TRIGGER trg_listing_documents_updated_at
  BEFORE UPDATE ON public.listing_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_data_room();

-- ── 6. Backfill from legacy document_access_requests ─────────
--
-- For every buyer who had any non-rejected document_access_request on a
-- listing, create a buyer_data_room_access row. If any of their requests were
-- approved we mark the access as approved with access_level='selected' and
-- create matching per-document permissions. If they only had pending requests
-- we create a pending access row so the broker can review it via the new UI.
--
-- NDA signers who never triggered a document_access_request are also seeded
-- with a pending access row so the broker sees them in the new access queue.

INSERT INTO public.buyer_data_room_access (
  listing_id, buyer_id, status, access_level, requested_at, reviewed_at,
  reviewed_by, created_at
)
SELECT
  src.listing_id,
  src.user_id,
  src.status,
  CASE WHEN src.status = 'approved' THEN 'selected' ELSE 'all' END AS access_level,
  src.requested_at,
  src.reviewed_at,
  src.reviewed_by,
  src.requested_at AS created_at
FROM (
  SELECT
    dar.listing_id,
    dar.user_id,
    CASE
      WHEN bool_or(dar.status = 'approved') THEN 'approved'
      WHEN bool_or(dar.status = 'pending')  THEN 'pending'
      ELSE 'denied'
    END AS status,
    MIN(dar.requested_at) AS requested_at,
    MAX(dar.reviewed_at)  AS reviewed_at,
    (ARRAY_AGG(dar.reviewed_by ORDER BY dar.reviewed_at DESC NULLS LAST))[1] AS reviewed_by
  FROM public.document_access_requests dar
  GROUP BY dar.listing_id, dar.user_id
) src
ON CONFLICT (listing_id, buyer_id) DO NOTHING;

-- Seed pending access rows for NDA signers who never raised a document request.
INSERT INTO public.buyer_data_room_access (
  listing_id, buyer_id, status, access_level, requested_at, created_at
)
SELECT
  ns.listing_id,
  ns.user_id,
  'pending',
  'all',
  ns.signed_at,
  ns.signed_at
FROM public.nda_signatures ns
WHERE NOT EXISTS (
  SELECT 1 FROM public.buyer_data_room_access bda
  WHERE bda.listing_id = ns.listing_id AND bda.buyer_id = ns.user_id
)
ON CONFLICT (listing_id, buyer_id) DO NOTHING;

-- Per-document permission rows for buyers we backfilled as approved.
INSERT INTO public.buyer_data_room_permissions (
  access_id, document_id, granted_at, granted_by
)
SELECT
  bda.id,
  dar.document_id,
  COALESCE(dar.reviewed_at, dar.requested_at),
  dar.reviewed_by
FROM public.document_access_requests dar
JOIN public.buyer_data_room_access bda
  ON bda.listing_id = dar.listing_id AND bda.buyer_id = dar.user_id
WHERE dar.status = 'approved'
  AND bda.status = 'approved'
ON CONFLICT DO NOTHING;

-- ── 7. Done ──────────────────────────────────────────────────
--
-- RLS policy updates and read-side gating live in Phase 2 (the workflow
-- rewrite) so we can land this schema change without changing behaviour for
-- existing buyers in the meantime. The legacy document_access_requests
-- policies and table remain intact.
