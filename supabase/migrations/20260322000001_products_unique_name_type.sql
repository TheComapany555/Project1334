-- Add unique constraint on (name, product_type) to prevent duplicate products
-- First clean up any existing duplicates (keep the oldest row per name+product_type)
DELETE FROM products
WHERE id NOT IN (
  SELECT DISTINCT ON (name, product_type) id
  FROM products
  ORDER BY name, product_type, created_at ASC
);

-- Now add the constraint
ALTER TABLE products
  ADD CONSTRAINT products_name_product_type_unique UNIQUE (name, product_type);
