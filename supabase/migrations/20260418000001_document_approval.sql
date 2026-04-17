-- Per-document broker approval for listing documents.
-- Buyers can only view documents the broker has explicitly approved.
-- ============================================================

ALTER TABLE public.listing_documents
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_listing_documents_approval
  ON public.listing_documents(listing_id, approval_status);

-- Backfill: documents that exist before this migration are assumed approved
-- so we don't break existing buyer access on rollout.
UPDATE public.listing_documents
SET approval_status = 'approved',
    approved_at = COALESCE(created_at, now())
WHERE approval_status = 'pending';

-- Replace the old public read policy so non-confidential docs also require approval
DROP POLICY IF EXISTS "Public can view non-confidential document names" ON public.listing_documents;

CREATE POLICY "Public can view approved non-confidential documents"
  ON public.listing_documents FOR SELECT
  USING (
    is_confidential = false
    AND approval_status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_documents.listing_id
        AND listings.status = 'published'
    )
  );

-- Track per-buyer document access requests so brokers can approve specific viewers
-- in addition to publishing documents broadly.
CREATE TABLE IF NOT EXISTS public.document_access_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  uuid NOT NULL REFERENCES public.listing_documents(id) ON DELETE CASCADE,
  listing_id   uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  rejection_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, user_id)
);

CREATE INDEX idx_document_access_requests_doc ON public.document_access_requests(document_id);
CREATE INDEX idx_document_access_requests_user ON public.document_access_requests(user_id);
CREATE INDEX idx_document_access_requests_listing_status
  ON public.document_access_requests(listing_id, status);

ALTER TABLE public.document_access_requests ENABLE ROW LEVEL SECURITY;

-- Buyers can read their own requests
CREATE POLICY "document_access_requests_select_own"
  ON public.document_access_requests FOR SELECT
  USING (user_id = auth.uid());

-- Buyers can create their own requests
CREATE POLICY "document_access_requests_insert_own"
  ON public.document_access_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

COMMENT ON COLUMN public.listing_documents.approval_status IS
  'pending = uploaded but not visible to buyers yet. approved = visible per existing confidential/NDA rules. rejected = hidden, kept for audit.';
COMMENT ON TABLE public.document_access_requests IS
  'Per-buyer document access requests. Brokers approve individual buyers in addition to publishing documents.';
