-- Per-category pricing for featured listings.
-- A "featured" product can be:
--   - global (category_id NULL, scope='homepage' or 'both')
--   - category-specific (category_id set, scope='category')
-- Admin can set different prices per category (e.g. Childcare ≠ Cafe).
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS scope text DEFAULT 'homepage'
    CHECK (scope IN ('homepage', 'category', 'both'));

-- Backfill: existing featured products have no category and apply to homepage+both
UPDATE public.products
SET scope = 'both'
WHERE product_type = 'featured'
  AND scope IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_scope
  ON public.products(category_id, scope)
  WHERE product_type = 'featured';

-- Replace the existing (name, product_type) unique constraint so we can have
-- the same featured-product name across different categories.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_name_product_type_unique;

-- New unique key: (name, product_type, category_id, scope, duration_days)
-- Using a unique index lets NULL category_id + NULL duration coexist correctly.
CREATE UNIQUE INDEX IF NOT EXISTS products_unique_variant
  ON public.products (
    name,
    product_type,
    COALESCE(category_id::text, ''),
    COALESCE(scope, ''),
    COALESCE(duration_days, 0)
  );

-- Track which category a featured payment applied to (for analytics + admin view)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS featured_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS featured_scope text
    CHECK (featured_scope IN ('homepage', 'category', 'both'));

CREATE INDEX IF NOT EXISTS idx_payments_featured_category
  ON public.payments(featured_category_id)
  WHERE featured_category_id IS NOT NULL;

COMMENT ON COLUMN public.products.category_id IS
  'For featured products scoped to a single category. NULL means homepage / global.';
COMMENT ON COLUMN public.products.scope IS
  'Where this featured product places the listing: homepage, category, or both.';
