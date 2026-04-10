-- Add "Childcare" category
INSERT INTO public.categories (name, slug, active, sort_order)
VALUES ('Childcare', 'childcare', true, 5)
ON CONFLICT (slug) DO NOTHING;
