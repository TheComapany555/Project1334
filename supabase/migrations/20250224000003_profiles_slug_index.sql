-- Index for public broker profile lookups by slug
CREATE INDEX IF NOT EXISTS idx_profiles_slug_role ON public.profiles(slug) WHERE role = 'broker';
