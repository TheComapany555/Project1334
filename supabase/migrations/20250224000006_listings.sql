-- Listings table (broker_id references profiles; we use service role for CRUD with session check)
CREATE TABLE public.listings (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  broker_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug           text NOT NULL UNIQUE,
  title          text NOT NULL,
  category_id    uuid REFERENCES public.categories(id),
  location_text  text,
  state          text,
  suburb         text,
  postcode       text,
  asking_price   numeric,
  price_type     text NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'poa')),
  revenue        numeric,
  profit         numeric,
  lease_details  text,
  summary        text,
  description    text,
  status         text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'under_offer', 'sold', 'unpublished')),
  published_at   timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_listings_broker ON public.listings(broker_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_category ON public.listings(category_id);
CREATE INDEX idx_listings_state ON public.listings(state);
CREATE INDEX idx_listings_slug ON public.listings(slug);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Public: published listings only (for search and listing detail)
CREATE POLICY "listings_public_select_published"
  ON public.listings FOR SELECT
  TO anon
  USING (status = 'published');

-- listing_images
CREATE TABLE public.listing_images (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  url         text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0
);

CREATE INDEX idx_listing_images_listing ON public.listing_images(listing_id);

ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

-- Public can read images (for public listing page; listing visibility is by parent status)
CREATE POLICY "listing_images_public_select"
  ON public.listing_images FOR SELECT
  TO anon
  USING (true);

-- listing_highlight_map (many-to-many)
CREATE TABLE public.listing_highlight_map (
  listing_id   uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  highlight_id uuid NOT NULL REFERENCES public.listing_highlights(id) ON DELETE CASCADE,
  PRIMARY KEY (listing_id, highlight_id)
);

CREATE INDEX idx_listing_highlight_map_listing ON public.listing_highlight_map(listing_id);

ALTER TABLE public.listing_highlight_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_highlight_map_public_select"
  ON public.listing_highlight_map FOR SELECT
  TO anon
  USING (true);
