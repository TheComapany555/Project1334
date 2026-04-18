-- Bundle: homepage + category placement (scope = 'both'), one row per active category × 7/14/30 days.
-- Matches broker UI "Homepage + Category" when listing has that category.
-- Idempotent. Prices are placeholder cents (AUD); edit in Admin → Products.

INSERT INTO public.products (
  name,
  description,
  price,
  currency,
  duration_days,
  product_type,
  scope,
  category_id,
  status
)
SELECT
  concat('Featured — ', c.name, ' — Homepage + Category — ', d.days, ' days'),
  concat(
    'Featured on the main homepage and at the top of the ',
    c.name,
    ' category for ',
    d.days,
    ' days.'
  ),
  CASE d.days
    WHEN 7 THEN 24800
    WHEN 14 THEN 42800
    WHEN 30 THEN 84800
  END,
  'aud',
  d.days,
  'featured',
  'both',
  c.id,
  'active'
FROM public.categories c
CROSS JOIN (VALUES (7), (14), (30)) AS d(days)
WHERE coalesce(c.active, true) = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.product_type = 'featured'
      AND p.scope = 'both'
      AND p.category_id = c.id
      AND p.duration_days = d.days
  );
