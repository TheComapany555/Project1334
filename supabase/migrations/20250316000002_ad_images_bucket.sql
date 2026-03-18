-- Public bucket for advertisement images (admin-managed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-images', 'ad-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read for ad images (anon can view)
CREATE POLICY "ad_images_public_read"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'ad-images');

-- Service role can insert/update/delete (app uses service role for uploads)
-- Default storage policies with service role allow full access.
