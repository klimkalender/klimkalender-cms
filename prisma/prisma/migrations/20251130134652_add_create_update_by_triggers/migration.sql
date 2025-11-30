-- ============================================================
-- 0. CREATE AUTH SCHEMA
-- ============================================================

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- AUTH.UID() FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid AS $$
BEGIN
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 1. PUBLIC PROFILES TABLE (safe, client-queryable)
-- ============================================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. RLS POLICIES FOR PROFILES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles
CREATE POLICY "Allow public read of profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Users may update ONLY their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Users may insert their own profile (normally via trigger)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 3. TRIGGER: ON AUTH.USER CREATED → INSERT PROFILE ROW
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- prefill table
INSERT INTO public.profiles (id, username, full_name, avatar_url, created_at, updated_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.raw_user_meta_data->>'avatar_url',
  now(),
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ============================================================
-- 5. TRIGGER: AUTO-SET updated_at + updated_by ON UPDATE
-- ============================================================

CREATE OR REPLACE FUNCTION update_mod_info()
RETURNS trigger AS $$
BEGIN
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_create_info()
RETURNS trigger AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- for each table that needs it, add triggers

CREATE TRIGGER trg_update_mod_info
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION update_mod_info();

CREATE TRIGGER trg_update_create_info
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION update_create_info();

CREATE TRIGGER trg_update_mod_info
BEFORE UPDATE ON public.tags
FOR EACH ROW
EXECUTE FUNCTION update_mod_info();

CREATE TRIGGER trg_update_create_info
BEFORE INSERT ON public.tags
FOR EACH ROW
EXECUTE FUNCTION update_create_info();

CREATE TRIGGER trg_update_mod_info
BEFORE UPDATE ON public.organizers
FOR EACH ROW
EXECUTE FUNCTION update_mod_info();

CREATE TRIGGER trg_update_create_info
BEFORE INSERT ON public.organizers
FOR EACH ROW
EXECUTE FUNCTION update_create_info();


CREATE TRIGGER trg_update_mod_info
BEFORE UPDATE ON public.venues
FOR EACH ROW
EXECUTE FUNCTION update_mod_info();

CREATE TRIGGER trg_update_create_info
BEFORE INSERT ON public.venues
FOR EACH ROW
EXECUTE FUNCTION update_create_info();


CREATE TRIGGER trg_update_mod_info
BEFORE UPDATE ON public.wasm_events
FOR EACH ROW
EXECUTE FUNCTION update_mod_info();

CREATE TRIGGER trg_update_create_info
BEFORE INSERT ON public.wasm_events
FOR EACH ROW
EXECUTE FUNCTION update_create_info();