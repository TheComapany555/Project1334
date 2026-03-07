-- Agencies table: the account-level entity that owns listings
CREATE TABLE public.agencies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE,
  logo_url      text,
  phone         text,
  email         text,
  website       text,
  bio           text,
  social_links  jsonb,
  status        text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'disabled')),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_agencies_slug ON public.agencies(slug);
CREATE INDEX idx_agencies_status ON public.agencies(status);

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Public: only active agencies visible
CREATE POLICY "agencies_public_select_active"
  ON public.agencies FOR SELECT
  TO anon
  USING (status = 'active');

COMMENT ON TABLE public.agencies IS 'Agency (business) accounts. Each agency has one or more brokers. Listings belong to an agency.';

-- Add agency columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  ADD COLUMN agency_role text CHECK (agency_role IN ('owner', 'member'));

CREATE INDEX idx_profiles_agency ON public.profiles(agency_id);

-- Add agency_id to listings
ALTER TABLE public.listings
  ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL;

CREATE INDEX idx_listings_agency ON public.listings(agency_id);

-- Migrate existing data: create an agency for each existing broker
-- and link their profiles + listings
DO $$
DECLARE
  rec RECORD;
  new_agency_id uuid;
  agency_slug text;
  slug_suffix int;
BEGIN
  FOR rec IN
    SELECT id, name, company, phone, email_public, website, bio, logo_url, social_links, slug, status
    FROM public.profiles
    WHERE role = 'broker'
  LOOP
    -- Generate a unique agency slug (prefix with 'a-' to avoid colliding with broker slugs)
    agency_slug := 'a-' || COALESCE(rec.slug, rec.id::text);
    slug_suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.agencies WHERE slug = agency_slug) LOOP
      slug_suffix := slug_suffix + 1;
      agency_slug := 'a-' || COALESCE(rec.slug, rec.id::text) || '-' || slug_suffix;
    END LOOP;

    INSERT INTO public.agencies (name, slug, logo_url, phone, email, website, bio, social_links, status)
    VALUES (
      COALESCE(rec.company, rec.name, 'Agency'),
      agency_slug,
      rec.logo_url,
      rec.phone,
      rec.email_public,
      rec.website,
      rec.bio,
      rec.social_links,
      COALESCE(rec.status, 'pending')
    )
    RETURNING id INTO new_agency_id;

    -- Link the broker profile to the new agency as owner
    UPDATE public.profiles
    SET agency_id = new_agency_id, agency_role = 'owner'
    WHERE id = rec.id;

    -- Link all listings from this broker to the agency
    UPDATE public.listings
    SET agency_id = new_agency_id
    WHERE broker_id = rec.id;
  END LOOP;
END
$$;
