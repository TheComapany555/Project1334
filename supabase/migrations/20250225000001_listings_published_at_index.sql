-- Optimize public search "newest first" (status = published, order by published_at)
CREATE INDEX IF NOT EXISTS idx_listings_status_published_at
  ON public.listings(status, published_at DESC NULLS LAST);
