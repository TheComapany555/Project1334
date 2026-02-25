-- Categories for listings (admin manages in M6; we need them for listing form)
CREATE TABLE public.categories (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  active     boolean DEFAULT true,
  sort_order int DEFAULT 0
);

CREATE INDEX idx_categories_active ON public.categories(active);
CREATE INDEX idx_categories_slug ON public.categories(slug);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public: active categories only (for filters and listing form)
CREATE POLICY "categories_public_select_active"
  ON public.categories FOR SELECT
  TO anon
  USING (active = true);

-- Seed default categories (brokers need at least one to create listings)
INSERT INTO public.categories (name, slug, active, sort_order) VALUES
  ('Cafe & Restaurant', 'cafe-restaurant', true, 0),
  ('Retail', 'retail', true, 1),
  ('Hospitality', 'hospitality', true, 2),
  ('Services', 'services', true, 3),
  ('Other', 'other', true, 4);
