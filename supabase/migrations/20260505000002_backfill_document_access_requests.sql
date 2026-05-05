-- Backfill pending document access for buyers who already signed NDAs before per-doc approval existed.
INSERT INTO public.document_access_requests (
  document_id,
  listing_id,
  user_id,
  status,
  requested_at
)
SELECT
  d.id,
  d.listing_id,
  s.user_id,
  'pending',
  COALESCE(s.signed_at, now())
FROM public.nda_signatures s
INNER JOIN public.listing_ndas n
  ON n.listing_id = s.listing_id AND n.is_required = true
INNER JOIN public.listing_documents d
  ON d.listing_id = s.listing_id
  AND d.approval_status = 'approved'
  AND d.is_confidential = true
ON CONFLICT (document_id, user_id) DO NOTHING;
