-- Business taxonomy (Category -> Sub-category) + REAXML import support.
--
-- Adopts the full industry taxonomy from the "Business categories" PDF and adds
-- the columns/tables the REAXML importer needs. Designed to be additive and
-- backward-compatible:
--   * categories.category_id KEEPS meaning "top-level category" (all existing
--     consumers keep working); sub-category is a new, optional layer.
--   * Legacy categories that aren't in the new taxonomy are DEACTIVATED, not
--     deleted, so any existing listing FK stays valid.
--   * "retail" and "services" already exist as slugs -> we upsert (reuse the
--     same rows/ids) instead of duplicating.
-- Idempotent: safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Sub-categories table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subcategories (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name        text NOT NULL,
  slug        text NOT NULL,
  active      boolean DEFAULT true,
  sort_order  int DEFAULT 0,
  UNIQUE (category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_subcategories_category ON public.subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_active ON public.subcategories(active);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Public: active sub-categories only (mirrors categories policy; for filters + form).
DROP POLICY IF EXISTS "subcategories_public_select_active" ON public.subcategories;
CREATE POLICY "subcategories_public_select_active"
  ON public.subcategories FOR SELECT
  TO anon
  USING (active = true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. New listing columns: sub-category + exclusivity (both additive/nullable)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.subcategories(id),
  ADD COLUMN IF NOT EXISTS exclusivity text CHECK (exclusivity IN ('exclusive', 'open'));

CREATE INDEX IF NOT EXISTS idx_listings_subcategory ON public.listings(subcategory_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Private vendor details (REAXML vendorDetails) — NEVER exposed publicly.
--    RLS enabled with NO anon/authenticated policy => only the service-role
--    client (used by server actions) can read/write. Public listing queries
--    select listings.* and must never touch this table.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_vendor_details (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  name        text,
  phone       text,
  email       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_vendor_details_listing ON public.listing_vendor_details(listing_id);

ALTER TABLE public.listing_vendor_details ENABLE ROW LEVEL SECURITY;
-- (intentionally no policies — private to the service role)

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. External source refs (REAXML uniqueID/agentID) — for idempotent re-import
--    and reusable by the future Agentbox/Reapit integration.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_external_refs (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id           uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  source_platform      text NOT NULL,
  external_id          text NOT NULL,
  external_agent_id    text,
  external_modified_at timestamptz,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  UNIQUE (source_platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_external_refs_listing ON public.listing_external_refs(listing_id);

ALTER TABLE public.listing_external_refs ENABLE ROW LEVEL SECURITY;
-- (intentionally no policies — managed by the service role)

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Seed top-level categories (upsert: reuses existing retail/services rows)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.categories (name, slug, active, sort_order) VALUES
  ('Accommodation/Tourism',    'accommodation-tourism',    true, 0),
  ('Automotive',               'automotive',               true, 1),
  ('Beauty/Health',            'beauty-health',            true, 2),
  ('Business/Property',        'business-property',        true, 3),
  ('Education/Training',       'education-training',       true, 4),
  ('Food/Hospitality',         'food-hospitality',         true, 5),
  ('Franchise',                'franchise',                true, 6),
  ('Home/Garden',              'home-garden',              true, 7),
  ('Import/Export/Whole',      'import-export-whole',      true, 8),
  ('Industrial/Manufacturing', 'industrial-manufacturing', true, 9),
  ('Leisure/Entertainment',    'leisure-entertainment',    true, 10),
  ('Professional',             'professional',             true, 11),
  ('Retail',                   'retail',                   true, 12),
  ('Rural',                    'rural',                    true, 13),
  ('Services',                 'services',                 true, 14),
  ('Transport/Distribution',   'transport-distribution',   true, 15)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      active = true,
      sort_order = EXCLUDED.sort_order;

-- Deactivate legacy categories that are NOT part of the new taxonomy.
-- (retail/services are kept — they map to the new top-level Retail/Services.)
UPDATE public.categories
  SET active = false
  WHERE slug IN ('cafe-restaurant', 'hospitality', 'other', 'childcare');

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Seed sub-categories. Slug is derived from the name (lowercase, non-alnum
--    runs -> '-'), keeping it readable and unique within its category.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id,
       v.name,
       lower(regexp_replace(regexp_replace(v.name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')) AS slug,
       0
FROM (VALUES
  -- Accommodation/Tourism
  ('accommodation-tourism', 'Aged Care'),
  ('accommodation-tourism', 'Backpacker/Hostel'),
  ('accommodation-tourism', 'Boarding Kennels'),
  ('accommodation-tourism', 'Caravan Park'),
  ('accommodation-tourism', 'Function Centre'),
  ('accommodation-tourism', 'Guest House/B&B'),
  ('accommodation-tourism', 'Hotel'),
  ('accommodation-tourism', 'Management Rights'),
  ('accommodation-tourism', 'Motel'),
  ('accommodation-tourism', 'Resort'),
  ('accommodation-tourism', 'Retirement Village'),
  ('accommodation-tourism', 'Theme Park'),
  ('accommodation-tourism', 'Tours'),
  -- Automotive
  ('automotive', 'Accessories/Parts'),
  ('automotive', 'Aeronautical'),
  ('automotive', 'Auto Electrical'),
  ('automotive', 'Bike and Motorcycle'),
  ('automotive', 'Car Dealership'),
  ('automotive', 'Car Rental'),
  ('automotive', 'Car Wash'),
  ('automotive', 'Detailing'),
  ('automotive', 'Driving Schools'),
  ('automotive', 'Marine'),
  ('automotive', 'Mechanical Repair'),
  ('automotive', 'Panel Beating'),
  ('automotive', 'Service Station'),
  ('automotive', 'Truck'),
  ('automotive', 'Wreckers'),
  -- Beauty/Health
  ('beauty-health', 'Beauty Products'),
  ('beauty-health', 'Beauty Salon'),
  ('beauty-health', 'Dental'),
  ('beauty-health', 'Hair'),
  ('beauty-health', 'Health Spa'),
  ('beauty-health', 'Hospital'),
  ('beauty-health', 'Massage'),
  ('beauty-health', 'Medical'),
  ('beauty-health', 'Medical Practice'),
  ('beauty-health', 'Nails'),
  ('beauty-health', 'Natural Therapies'),
  ('beauty-health', 'Nursing Home'),
  ('beauty-health', 'Recreation/Sport'),
  -- Business/Property
  ('business-property', 'Business & Property'),
  ('business-property', 'Online Business'),
  ('business-property', 'Online Business with premisis'),
  ('business-property', 'Property'),
  -- Education/Training
  ('education-training', 'Child Care'),
  ('education-training', 'Educational'),
  ('education-training', 'Employment/Recruitment'),
  ('education-training', 'Training'),
  -- Food/Hospitality
  ('food-hospitality', 'Alcohol/Liquor'),
  ('food-hospitality', 'Bakery'),
  ('food-hospitality', 'Butcher'),
  ('food-hospitality', 'Cafe/Coffee Shop'),
  ('food-hospitality', 'Catering'),
  ('food-hospitality', 'Convenience Store'),
  ('food-hospitality', 'Deli'),
  ('food-hospitality', 'Distributors'),
  ('food-hospitality', 'Fruit/Veg'),
  ('food-hospitality', 'Juice Bar'),
  ('food-hospitality', 'Manufacturers'),
  ('food-hospitality', 'Restaurant'),
  ('food-hospitality', 'Retailer'),
  ('food-hospitality', 'Supermarket'),
  ('food-hospitality', 'Takeaway Food'),
  ('food-hospitality', 'Wholesalers'),
  -- Franchise
  ('franchise', 'Franchise'),
  -- Home/Garden
  ('home-garden', 'Gardening'),
  ('home-garden', 'Home Based'),
  ('home-garden', 'Homewares/Hardware'),
  ('home-garden', 'Irrigation Services'),
  ('home-garden', 'Nursery'),
  -- Import/Export/Whole
  ('import-export-whole', 'Customs'),
  ('import-export-whole', 'Export'),
  ('import-export-whole', 'Freight'),
  ('import-export-whole', 'Import'),
  ('import-export-whole', 'Wholesale'),
  -- Industrial/Manufacturing
  ('industrial-manufacturing', 'Building and Construction'),
  ('industrial-manufacturing', 'Civil'),
  ('industrial-manufacturing', 'Clothing/Footwear'),
  ('industrial-manufacturing', 'Electrical'),
  ('industrial-manufacturing', 'Food/Beverage'),
  ('industrial-manufacturing', 'Furniture/Timber'),
  ('industrial-manufacturing', 'Glass/Ceramic'),
  ('industrial-manufacturing', 'Machinery/Metal'),
  ('industrial-manufacturing', 'Manufacturing/Engineering'),
  ('industrial-manufacturing', 'Mining/Earth Moving'),
  ('industrial-manufacturing', 'Oil/Gas'),
  ('industrial-manufacturing', 'Paper/Printing'),
  ('industrial-manufacturing', 'Plastic'),
  ('industrial-manufacturing', 'Water'),
  ('industrial-manufacturing', 'Welding'),
  -- Leisure/Entertainment
  ('leisure-entertainment', 'Adult'),
  ('leisure-entertainment', 'Aircraft'),
  ('leisure-entertainment', 'Amusements'),
  ('leisure-entertainment', 'Aquatic/Marine'),
  ('leisure-entertainment', 'Arts/Crafts'),
  ('leisure-entertainment', 'Bars/Nightclubs'),
  ('leisure-entertainment', 'Function Centre'),
  ('leisure-entertainment', 'Gambling'),
  ('leisure-entertainment', 'Garden/Nurseries'),
  ('leisure-entertainment', 'Hotel'),
  ('leisure-entertainment', 'Music/Video'),
  ('leisure-entertainment', 'Recreation/Sport'),
  ('leisure-entertainment', 'Sports Complex/Gym'),
  ('leisure-entertainment', 'Vending'),
  -- Professional
  ('professional', 'Accounting'),
  ('professional', 'Advertising/Mkting'),
  ('professional', 'Bookkeeping'),
  ('professional', 'Brokerage'),
  ('professional', 'Civil'),
  ('professional', 'Communications'),
  ('professional', 'Computer/IT'),
  ('professional', 'Finance'),
  ('professional', 'Insurance'),
  ('professional', 'Internet'),
  ('professional', 'Legal'),
  ('professional', 'Media'),
  ('professional', 'Medical'),
  ('professional', 'Property/Real Estate'),
  ('professional', 'Recruitment'),
  ('professional', 'Scientific'),
  ('professional', 'Security'),
  ('professional', 'Travel'),
  -- Retail
  ('retail', 'Animal related'),
  ('retail', 'Clothing/Accessories'),
  ('retail', 'Entertainment/Tech'),
  ('retail', 'Florist/Nursery'),
  ('retail', 'Food/Beverage'),
  ('retail', 'Health/Beauty'),
  ('retail', 'Homeware/Hardware'),
  ('retail', 'Newsagency/Tatts'),
  ('retail', 'Office Supplies'),
  ('retail', 'Pharmacies'),
  ('retail', 'Post Offices'),
  ('retail', 'Retail'),
  ('retail', 'Vending'),
  -- Rural
  ('rural', 'Aerial'),
  ('rural', 'Agricultural'),
  ('rural', 'Aquaculture'),
  ('rural', 'Crop Harvesting'),
  ('rural', 'Dairy Farming'),
  ('rural', 'Farming'),
  ('rural', 'Fertiliser'),
  ('rural', 'Fishing/Forestry'),
  ('rural', 'Fruit Picking'),
  ('rural', 'Hunting/Trap'),
  ('rural', 'Insemination'),
  ('rural', 'Irrigation Services'),
  ('rural', 'Land Clearing'),
  ('rural', 'Livestock'),
  ('rural', 'Machinery'),
  ('rural', 'Mustering'),
  ('rural', 'Shearing'),
  ('rural', 'Wool Classing'),
  -- Services
  ('services', 'Aircraft'),
  ('services', 'Alarms'),
  ('services', 'Animal related'),
  ('services', 'Boats/Marine'),
  ('services', 'Car/Bus/Truck'),
  ('services', 'Cleaning'),
  ('services', 'Communication'),
  ('services', 'Copy/Laminate'),
  ('services', 'Courier'),
  ('services', 'Driving Schools'),
  ('services', 'Electrical'),
  ('services', 'Entertainment'),
  ('services', 'Garden/Household'),
  ('services', 'Hire/Rent'),
  ('services', 'Limousine/Taxi'),
  ('services', 'Machinery'),
  ('services', 'Management Rights'),
  ('services', 'Medical'),
  ('services', 'Mobile Services'),
  ('services', 'Pest related'),
  ('services', 'Pool/Water'),
  ('services', 'Print/Photo'),
  ('services', 'Professional Services'),
  ('services', 'Repair'),
  -- Transport/Distribution
  ('transport-distribution', 'Air'),
  ('transport-distribution', 'Bus'),
  ('transport-distribution', 'Car'),
  ('transport-distribution', 'Parking'),
  ('transport-distribution', 'Rail'),
  ('transport-distribution', 'Road'),
  ('transport-distribution', 'Sea'),
  ('transport-distribution', 'Taxi'),
  ('transport-distribution', 'Truck')
) AS v(cat_slug, name)
JOIN public.categories c ON c.slug = v.cat_slug
ON CONFLICT (category_id, slug) DO NOTHING;
