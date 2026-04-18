-- Seed featured listing products (homepage + one row per active category × 7/14/30 days).
-- Idempotent: skips when a matching row already exists (same type, scope, category, duration).
-- Prices are placeholder cents (AUD); edit in Admin → Products after migration.
-- Requires: public.categories, public.products with product_type, scope, category_id (see 20260418000005).

-- ── Homepage featured (no category) ─────────────────────────────────────────
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
  v.name,
  v.description,
  v.price,
  'aud',
  v.days,
  'featured',
  'homepage',
  NULL,
  'active'
FROM (
  VALUES
    (
      7,
      'Featured — Homepage — 7 days',
      'Featured placement on the main marketplace homepage for 7 days.',
      14900
    ),
    (
      14,
      'Featured — Homepage — 14 days',
      'Featured placement on the main marketplace homepage for 14 days.',
      24900
    ),
    (
      30,
      'Featured — Homepage — 30 days',
      'Featured placement on the main marketplace homepage for 30 days.',
      49900
    )
) AS v(days, name, description, price)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.products p
  WHERE p.product_type = 'featured'
    AND p.scope = 'homepage'
    AND p.category_id IS NULL
    AND p.duration_days = v.days
);

-- ── Per-category featured (every active row in public.categories) ──────────
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
  concat('Featured — ', c.name, ' — ', d.days, ' days'),
  concat(
    'Featured at the top of the ',
    c.name,
    ' category for ',
    d.days,
    ' days.'
  ),
  CASE d.days
    WHEN 7 THEN 9900
    WHEN 14 THEN 17900
    WHEN 30 THEN 34900
  END,
  'aud',
  d.days,
  'featured',
  'category',
  c.id,
  'active'
FROM public.categories c
CROSS JOIN (VALUES (7), (14), (30)) AS d(days)
WHERE coalesce(c.active, true) = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.product_type = 'featured'
      AND p.scope = 'category'
      AND p.category_id = c.id
      AND p.duration_days = d.days
  );
