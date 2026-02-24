-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for NextAuth Credentials (email/password). App-only access via service role.
CREATE TABLE public.users (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             text NOT NULL UNIQUE,
  password_hash     text NOT NULL,
  email_verified_at timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- No policies: only server (service role) reads/writes users. No anon/authenticated access.

-- Profiles (1:1 with NextAuth user id = users.id)
CREATE TABLE public.profiles (
  id            uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'broker' CHECK (role IN ('broker', 'admin')),
  name          text,
  company       text,
  phone         text,
  email_public  text,
  website       text,
  bio           text,
  logo_url      text,
  photo_url     text,
  social_links  jsonb,
  slug          text UNIQUE,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Public: brokers only (for public broker profiles)
CREATE POLICY "profiles_public_select_brokers"
  ON public.profiles FOR SELECT
  TO anon
  USING (role = 'broker');

-- Authenticated (e.g. future Supabase Auth use): own row only
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profile insert/update from app via service role (no anon/authenticated INSERT)
COMMENT ON TABLE public.profiles IS '1:1 with users; role controls dashboard access (broker | admin).';
COMMENT ON TABLE public.users IS 'NextAuth credentials store; access via service role only.';
