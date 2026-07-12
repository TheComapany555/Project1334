-- Global site settings (singleton).
-- First toggle: listings_coming_soon — when true, every public/buyer-facing
-- listing surface renders a "Coming Soon" card instead of real listings, so the
-- client can load listings before launch without exposing them. Flipped from
-- /admin/settings; enforced in code (service role bypasses RLS).

CREATE TABLE IF NOT EXISTS public.site_settings (
  -- Singleton: exactly one settings row for the whole site.
  id                   boolean PRIMARY KEY DEFAULT true,
  listings_coming_soon boolean NOT NULL DEFAULT false,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = true)
);

INSERT INTO public.site_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
-- Service-role only — read/written exclusively by server code.

COMMENT ON TABLE public.site_settings IS
  'Singleton row of global site toggles. listings_coming_soon hides all public listings behind a Coming Soon card; managed from /admin/settings.';

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_data_room();
