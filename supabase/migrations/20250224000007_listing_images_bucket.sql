-- Public bucket for listing images (max 10 per listing, 5MB each enforced in app)
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read for listing images (anon can view)
CREATE POLICY "listing_images_public_read"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'listing-images');

-- Service role can insert/update/delete (app uses service role for uploads)
-- Default storage policies with service role allow full access.
