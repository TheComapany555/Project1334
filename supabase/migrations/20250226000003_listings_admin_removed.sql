-- Admin can remove a listing from public view (moderation). Broker still sees it in dashboard.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS admin_removed_at timestamptz;

COMMENT ON COLUMN public.listings.admin_removed_at IS 'Set by admin to hide listing from search and public detail. Broker can still see in dashboard.';
