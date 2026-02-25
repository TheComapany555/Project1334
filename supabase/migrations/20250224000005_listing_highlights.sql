-- Highlight tags (pills) for listings - seed data
CREATE TABLE public.listing_highlights (
  id     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  label  text NOT NULL,
  accent text NOT NULL DEFAULT 'primary' CHECK (accent IN ('primary', 'secondary', 'warning')),
  active boolean DEFAULT true
);

ALTER TABLE public.listing_highlights ENABLE ROW LEVEL SECURITY;

-- Public read active highlights (for display and for broker form)
CREATE POLICY "listing_highlights_public_select"
  ON public.listing_highlights FOR SELECT
  TO anon
  USING (active = true);

-- Seed from UI design (doc appendix)
INSERT INTO public.listing_highlights (label, accent) VALUES
  ('Urgent Sale', 'warning'),
  ('Under Management', 'secondary'),
  ('Strong Cash Flow', 'primary'),
  ('Consistent Revenue', 'primary'),
  ('Prime Location', 'primary'),
  ('Long Lease', 'secondary'),
  ('Low Rental', 'secondary'),
  ('Turnkey Business', 'primary'),
  ('Growth Potential', 'primary');
