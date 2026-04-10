-- Call tracking: record each phone call button click per listing
CREATE TABLE public.call_clicks (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  broker_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  platform    text NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'mobile')),
  ip_address  text,
  clicked_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_clicks_listing_id ON public.call_clicks (listing_id);
CREATE INDEX idx_call_clicks_broker_id ON public.call_clicks (broker_id);
CREATE INDEX idx_call_clicks_clicked_at ON public.call_clicks (clicked_at DESC);

ALTER TABLE public.call_clicks ENABLE ROW LEVEL SECURITY;

-- Brokers can see call clicks on their own listings
CREATE POLICY "call_clicks_broker_select"
  ON public.call_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.broker_id = auth.uid()
    )
  );

-- Agency owners can see call clicks on agency listings
CREATE POLICY "call_clicks_agency_owner_select"
  ON public.call_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      JOIN public.profiles p ON p.agency_id = l.agency_id
      WHERE l.id = listing_id
        AND p.id = auth.uid()
        AND p.agency_role = 'owner'
    )
  );

-- Anyone can insert (tracking is fire-and-forget)
CREATE POLICY "call_clicks_insert"
  ON public.call_clicks FOR INSERT
  WITH CHECK (true);
