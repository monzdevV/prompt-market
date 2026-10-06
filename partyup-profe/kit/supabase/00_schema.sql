-- =====================================================================
-- 00_schema.sql · Esquema completo de la base de datos (Supabase)
-- =====================================================================
-- Generado concatenando, en el orden en que se aplicaron (historial git),
-- historial/schema.sql + las 31 migraciones de historial/migration_*.sql
-- (se conservan solo como referencia; NO hay que ejecutarlas).
-- Se ejecuta UNA vez sobre un proyecto de Supabase VACÍO:
--   Supabase -> SQL Editor -> pegar todo -> Run.
-- Requisitos previos: activar las extensiones pg_cron y postgis
--   (Database -> Extensions). pg_trgm la crea este script.
-- Única corrección respecto a los originales: en schema.sql la función
-- public.user_party_ids() se ha movido ANTES de las políticas que la usan
-- (en el original se usaba antes de crearla y el script fallaba en limpio).
-- =====================================================================


-- #####################################################################
-- ## schema.sql
-- #####################################################################

-- ============================================
-- PREVIASPLUS Database Schema
-- ============================================
-- Run this in the Supabase SQL Editor to set up the database.

-- ============================================
-- TABLES
-- ============================================

-- Users table (synced with auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  provider TEXT CHECK (provider IN ('apple', 'google')),
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Parties table
CREATE TABLE IF NOT EXISTS public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  creator_id UUID REFERENCES public.users(id),
  creator_is_pro BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Party participants (join table)
CREATE TABLE IF NOT EXISTS public.party_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.parties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('host', 'member')),
  drinks JSONB DEFAULT '{"beer":0,"cubata":0,"shot":0,"wine":0,"cocktail":0,"other":0,"total":0}',
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(party_id, user_id)
);

-- Party media (photos - 1 per user per party)
CREATE TABLE IF NOT EXISTS public.party_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.parties(id) ON DELETE CASCADE NOT NULL,
  uploader_id UUID REFERENCES public.users(id) NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(party_id, uploader_id)
);

-- Party notes (1 note per user per party)
CREATE TABLE IF NOT EXISTS public.party_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.parties(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(party_id, author_id)
);

-- Drink events (history)
CREATE TABLE IF NOT EXISTS public.drink_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.parties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  drink_type TEXT NOT NULL CHECK (drink_type IN ('beer', 'cubata', 'shot', 'wine', 'cocktail', 'other')),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_parties_code ON public.parties(code);
CREATE INDEX IF NOT EXISTS idx_parties_status ON public.parties(status);
CREATE INDEX IF NOT EXISTS idx_party_participants_party ON public.party_participants(party_id);
CREATE INDEX IF NOT EXISTS idx_party_participants_user ON public.party_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_party_media_party ON public.party_media(party_id);
CREATE INDEX IF NOT EXISTS idx_party_notes_party ON public.party_notes(party_id);
CREATE INDEX IF NOT EXISTS idx_drink_events_party ON public.drink_events(party_id);

-- Full replica identity for party_participants so Supabase Realtime
-- delivers all columns in INSERT/UPDATE/DELETE events.
ALTER TABLE public.party_participants REPLICA IDENTITY FULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_events ENABLE ROW LEVEL SECURITY;

-- Helper: returns party IDs for the current user (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.user_party_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT party_id FROM public.party_participants WHERE user_id = auth.uid();
$$;

-- Users: read own profile + profiles of fellow party members (least privilege)
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Party members can read fellow members profiles"
  ON public.users FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM public.party_participants
      WHERE party_id IN (SELECT public.user_party_ids())
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Parties: authenticated can create; participants can read
CREATE POLICY "Authenticated users can create parties"
  ON public.parties FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can read their parties"
  ON public.parties FOR SELECT
  USING (
    creator_id = auth.uid()
    OR id IN (SELECT public.user_party_ids())
  );

CREATE POLICY "Creator can update party"
  ON public.parties FOR UPDATE
  USING (creator_id = auth.uid());

-- Party participants: participants can read; users can join/leave
CREATE POLICY "Participants can read party members"
  ON public.party_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR party_id IN (SELECT public.user_party_ids())
  );

CREATE POLICY "Authenticated users can join parties"
  ON public.party_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
  ON public.party_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Party media: participants can view; users manage own media
CREATE POLICY "Participants can view party media"
  ON public.party_media FOR SELECT
  USING (party_id IN (SELECT public.user_party_ids()));

CREATE POLICY "Users can upload own media"
  ON public.party_media FOR INSERT
  WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Users can update own media"
  ON public.party_media FOR UPDATE
  USING (auth.uid() = uploader_id);

CREATE POLICY "Users can delete own media"
  ON public.party_media FOR DELETE
  USING (auth.uid() = uploader_id);

-- Party notes: same as media
CREATE POLICY "Participants can view party notes"
  ON public.party_notes FOR SELECT
  USING (party_id IN (SELECT public.user_party_ids()));

CREATE POLICY "Users can create own notes"
  ON public.party_notes FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own notes"
  ON public.party_notes FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own notes"
  ON public.party_notes FOR DELETE
  USING (auth.uid() = author_id);

-- Drink events: participants can view; users create own
CREATE POLICY "Participants can view drink events"
  ON public.drink_events FOR SELECT
  USING (party_id IN (SELECT public.user_party_ids()));

CREATE POLICY "Users can create own drink events"
  ON public.drink_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STORAGE
-- ============================================

-- Create the party-photos bucket (run this in the Storage section or via SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('party-photos', 'party-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: extract party_id from storage path (format: "{partyId}/{userId}.{ext}")
CREATE OR REPLACE FUNCTION public.extract_party_id_from_path(path TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT (string_to_array(path, '/'))[1]::UUID;
$$;

-- Storage policies for party-photos bucket (restricted to party participants)
CREATE POLICY "Participants can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'party-photos'
    AND auth.uid() IS NOT NULL
    AND public.extract_party_id_from_path(name) IN (SELECT public.user_party_ids())
  );

CREATE POLICY "Participants can view photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'party-photos'
    AND auth.uid() IS NOT NULL
    AND public.extract_party_id_from_path(name) IN (SELECT public.user_party_ids())
  );

CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'party-photos'
    AND auth.uid() IS NOT NULL
    AND public.extract_party_id_from_path(name) IN (SELECT public.user_party_ids())
    AND (string_to_array(name, '/'))[2] LIKE auth.uid()::TEXT || '.%'
  );

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Atomic drink increment (prevents race conditions in concurrent updates)
CREATE OR REPLACE FUNCTION public.increment_drink(
  p_party_id UUID,
  p_user_id UUID,
  p_drink_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_drinks JSONB;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.party_participants
  SET drinks = jsonb_set(
    jsonb_set(
      drinks,
      ARRAY[p_drink_type],
      to_jsonb(COALESCE((drinks->>p_drink_type)::int, 0) + 1)
    ),
    ARRAY['total'],
    to_jsonb(COALESCE((drinks->>'total')::int, 0) + 1)
  )
  WHERE party_id = p_party_id AND user_id = p_user_id
  RETURNING drinks INTO updated_drinks;

  INSERT INTO public.drink_events (party_id, user_id, drink_type)
  VALUES (p_party_id, p_user_id, p_drink_type);

  RETURN updated_drinks;
END;
$$;

-- Atomic drink decrement (correction, no event logged)
CREATE OR REPLACE FUNCTION public.decrement_drink(
  p_party_id UUID,
  p_user_id UUID,
  p_drink_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_count INT;
  updated_drinks JSONB;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE((drinks->>p_drink_type)::int, 0)
  INTO current_count
  FROM public.party_participants
  WHERE party_id = p_party_id AND user_id = p_user_id;

  IF current_count <= 0 THEN
    SELECT drinks INTO updated_drinks
    FROM public.party_participants
    WHERE party_id = p_party_id AND user_id = p_user_id;
    RETURN updated_drinks;
  END IF;

  UPDATE public.party_participants
  SET drinks = jsonb_set(
    jsonb_set(
      drinks,
      ARRAY[p_drink_type],
      to_jsonb(GREATEST(COALESCE((drinks->>p_drink_type)::int, 0) - 1, 0))
    ),
    ARRAY['total'],
    to_jsonb(GREATEST(COALESCE((drinks->>'total')::int, 0) - 1, 0))
  )
  WHERE party_id = p_party_id AND user_id = p_user_id
  RETURNING drinks INTO updated_drinks;

  RETURN updated_drinks;
END;
$$;

-- Join party by code (bypasses RLS so non-participants can find the party).
-- Returns the full party with participants as JSONB so the client does not
-- need a separate SELECT (which can hang due to connection pooling).
CREATE OR REPLACE FUNCTION public.join_party_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_id UUID;
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_is_active BOOLEAN;
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_party_id
  FROM public.parties
  WHERE code = upper(p_code) AND status = 'active';

  IF v_party_id IS NULL THEN
    RAISE EXCEPTION 'Party not found or already ended';
  END IF;

  SELECT id, is_active INTO v_existing_id, v_is_active
  FROM public.party_participants
  WHERE party_id = v_party_id AND user_id = v_user_id;

  IF v_existing_id IS NOT NULL THEN
    IF NOT v_is_active THEN
      UPDATE public.party_participants
      SET is_active = true
      WHERE id = v_existing_id;
    END IF;
  ELSE
    INSERT INTO public.party_participants (party_id, user_id, role, drinks)
    VALUES (v_party_id, v_user_id, 'member',
      '{"beer":0,"cubata":0,"shot":0,"wine":0,"cocktail":0,"other":0,"total":0}'::jsonb);
  END IF;

  -- Build full party response within the same transaction
  SELECT jsonb_build_object(
    'id', p.id,
    'code', p.code,
    'name', p.name,
    'status', p.status,
    'creator_id', p.creator_id,
    'creator_is_pro', p.creator_is_pro,
    'created_at', p.created_at,
    'ended_at', p.ended_at,
    'party_participants', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'party_id', pp.party_id,
          'user_id', pp.user_id,
          'role', pp.role,
          'drinks', pp.drinks,
          'joined_at', pp.joined_at,
          'is_active', pp.is_active,
          'users', jsonb_build_object(
            'display_name', u.display_name,
            'avatar_url', u.avatar_url
          )
        )
      ),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM public.parties p
  LEFT JOIN public.party_participants pp ON pp.party_id = p.id
  LEFT JOIN public.users u ON u.id = pp.user_id
  WHERE p.id = v_party_id
  GROUP BY p.id;

  RETURN v_result;
END;
$$;

-- End party atomically (marks party as ended + deactivates all participants)
CREATE OR REPLACE FUNCTION public.end_party_by_creator(p_party_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_creator_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT creator_id INTO v_creator_id
  FROM public.parties
  WHERE id = p_party_id AND status = 'active';

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Party not found or already ended';
  END IF;

  IF v_creator_id != v_user_id THEN
    RAISE EXCEPTION 'Only the party creator can end the party';
  END IF;

  UPDATE public.parties
  SET status = 'ended', ended_at = now()
  WHERE id = p_party_id;

  UPDATE public.party_participants
  SET is_active = false
  WHERE party_id = p_party_id;
END;
$$;

-- ============================================
-- REALTIME
-- ============================================

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_media;
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drink_events;

-- #####################################################################
-- ## migration_fix_rls.sql
-- #####################################################################

-- ============================================
-- Migration: Fix RLS recursion on party_participants
-- ============================================
-- Run this in the Supabase SQL Editor to fix the
-- "infinite recursion detected in policy for relation party_participants" error.

-- Step 1: Create helper function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_party_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT party_id FROM public.party_participants WHERE user_id = auth.uid();
$$;

-- Step 2: Drop the recursive policy
DROP POLICY IF EXISTS "Participants can read party members" ON public.party_participants;

-- Step 3: Recreate using the helper function
CREATE POLICY "Participants can read party members"
  ON public.party_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR party_id IN (SELECT public.user_party_ids())
  );

-- Step 4: Update other policies that had EXISTS subqueries on party_participants
DROP POLICY IF EXISTS "Participants can read their parties" ON public.parties;
CREATE POLICY "Participants can read their parties"
  ON public.parties FOR SELECT
  USING (
    creator_id = auth.uid()
    OR id IN (SELECT public.user_party_ids())
  );

DROP POLICY IF EXISTS "Participants can view party media" ON public.party_media;
CREATE POLICY "Participants can view party media"
  ON public.party_media FOR SELECT
  USING (party_id IN (SELECT public.user_party_ids()));

DROP POLICY IF EXISTS "Participants can view party notes" ON public.party_notes;
CREATE POLICY "Participants can view party notes"
  ON public.party_notes FOR SELECT
  USING (party_id IN (SELECT public.user_party_ids()));

DROP POLICY IF EXISTS "Participants can view drink events" ON public.drink_events;
CREATE POLICY "Participants can view drink events"
  ON public.drink_events FOR SELECT
  USING (party_id IN (SELECT public.user_party_ids()));

-- #####################################################################
-- ## migration_fix_storage_rls.sql
-- #####################################################################

-- ============================================
-- Migration: Fix storage bucket RLS policies
-- ============================================
-- Current policies only check auth.uid() IS NOT NULL,
-- allowing any authenticated user to access any party's photos.
-- This migration restricts access to party participants only.

-- Helper: extract party_id from storage path (format: "{partyId}/{userId}.{ext}")
CREATE OR REPLACE FUNCTION public.extract_party_id_from_path(path TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT (string_to_array(path, '/'))[1]::UUID;
$$;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Participants can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Participants can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

-- INSERT: only party participants can upload to their party's folder
CREATE POLICY "Participants can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'party-photos'
    AND auth.uid() IS NOT NULL
    AND public.extract_party_id_from_path(name) IN (SELECT public.user_party_ids())
  );

-- SELECT: only party participants can view their party's photos
CREATE POLICY "Participants can view photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'party-photos'
    AND auth.uid() IS NOT NULL
    AND public.extract_party_id_from_path(name) IN (SELECT public.user_party_ids())
  );

-- DELETE: only the uploader can delete their own photo
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'party-photos'
    AND auth.uid() IS NOT NULL
    AND public.extract_party_id_from_path(name) IN (SELECT public.user_party_ids())
    AND (string_to_array(name, '/'))[2] LIKE auth.uid()::TEXT || '.%'
  );

-- #####################################################################
-- ## migration_atomic_drinks.sql
-- #####################################################################

-- ============================================
-- Migration: Atomic drink increment/decrement
-- ============================================
-- Replaces the non-atomic READ-MODIFY-WRITE pattern in the client
-- with server-side atomic operations that use PostgreSQL row locking
-- to prevent race conditions during concurrent drink updates.

-- Atomically increments a drink count and inserts the corresponding event.
-- Returns the updated drinks JSONB for client reconciliation.
CREATE OR REPLACE FUNCTION public.increment_drink(
  p_party_id UUID,
  p_user_id UUID,
  p_drink_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_drinks JSONB;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.party_participants
  SET drinks = jsonb_set(
    jsonb_set(
      drinks,
      ARRAY[p_drink_type],
      to_jsonb(COALESCE((drinks->>p_drink_type)::int, 0) + 1)
    ),
    ARRAY['total'],
    to_jsonb(COALESCE((drinks->>'total')::int, 0) + 1)
  )
  WHERE party_id = p_party_id AND user_id = p_user_id
  RETURNING drinks INTO updated_drinks;

  INSERT INTO public.drink_events (party_id, user_id, drink_type)
  VALUES (p_party_id, p_user_id, p_drink_type);

  RETURN updated_drinks;
END;
$$;

-- Atomically decrements a drink count.
-- Returns the updated drinks JSONB for client reconciliation.
-- No drink_event is inserted (decrement is a correction, not a consumption event).
CREATE OR REPLACE FUNCTION public.decrement_drink(
  p_party_id UUID,
  p_user_id UUID,
  p_drink_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_count INT;
  updated_drinks JSONB;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE((drinks->>p_drink_type)::int, 0)
  INTO current_count
  FROM public.party_participants
  WHERE party_id = p_party_id AND user_id = p_user_id;

  IF current_count <= 0 THEN
    SELECT drinks INTO updated_drinks
    FROM public.party_participants
    WHERE party_id = p_party_id AND user_id = p_user_id;
    RETURN updated_drinks;
  END IF;

  UPDATE public.party_participants
  SET drinks = jsonb_set(
    jsonb_set(
      drinks,
      ARRAY[p_drink_type],
      to_jsonb(GREATEST(COALESCE((drinks->>p_drink_type)::int, 0) - 1, 0))
    ),
    ARRAY['total'],
    to_jsonb(GREATEST(COALESCE((drinks->>'total')::int, 0) - 1, 0))
  )
  WHERE party_id = p_party_id AND user_id = p_user_id
  RETURNING drinks INTO updated_drinks;

  RETURN updated_drinks;
END;
$$;

-- #####################################################################
-- ## migration_join_party_rpc.sql
-- #####################################################################

-- ============================================
-- Migration: Add join_party_by_code RPC function
-- ============================================
-- Run this in the Supabase SQL Editor.
-- Solves the RLS chicken-and-egg problem: a user needs to read a party
-- to join it, but the SELECT policy requires being a participant first.
-- This SECURITY DEFINER function bypasses RLS to find the party by code,
-- then atomically inserts or reactivates the user as a participant.
-- Returns the full party with participants as JSONB so the client does
-- not need a separate SELECT (which can hang due to connection pooling).

CREATE OR REPLACE FUNCTION public.join_party_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_id UUID;
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_is_active BOOLEAN;
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the active party by code (bypasses RLS)
  SELECT id INTO v_party_id
  FROM public.parties
  WHERE code = upper(p_code) AND status = 'active';

  IF v_party_id IS NULL THEN
    RAISE EXCEPTION 'Party not found or already ended';
  END IF;

  -- Check if user already has a participant row
  SELECT id, is_active INTO v_existing_id, v_is_active
  FROM public.party_participants
  WHERE party_id = v_party_id AND user_id = v_user_id;

  IF v_existing_id IS NOT NULL THEN
    -- Reactivate if previously left
    IF NOT v_is_active THEN
      UPDATE public.party_participants
      SET is_active = true
      WHERE id = v_existing_id;
    END IF;
  ELSE
    -- Insert new participant
    INSERT INTO public.party_participants (party_id, user_id, role, drinks)
    VALUES (v_party_id, v_user_id, 'member',
      '{"beer":0,"cubata":0,"shot":0,"wine":0,"cocktail":0,"other":0,"total":0}'::jsonb);
  END IF;

  -- Build full party response within the same transaction
  SELECT jsonb_build_object(
    'id', p.id,
    'code', p.code,
    'name', p.name,
    'status', p.status,
    'creator_id', p.creator_id,
    'created_at', p.created_at,
    'ended_at', p.ended_at,
    'party_participants', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'party_id', pp.party_id,
          'user_id', pp.user_id,
          'role', pp.role,
          'drinks', pp.drinks,
          'joined_at', pp.joined_at,
          'is_active', pp.is_active,
          'users', jsonb_build_object(
            'display_name', u.display_name,
            'avatar_url', u.avatar_url
          )
        )
      ),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM public.parties p
  LEFT JOIN public.party_participants pp ON pp.party_id = p.id
  LEFT JOIN public.users u ON u.id = pp.user_id
  WHERE p.id = v_party_id
  GROUP BY p.id;

  RETURN v_result;
END;
$$;

-- #####################################################################
-- ## migration_party_lifecycle.sql
-- #####################################################################

-- ============================================
-- Migration: Party lifecycle improvements
-- ============================================
-- Run this in the Supabase SQL Editor.
--
-- 1. Enable REPLICA IDENTITY FULL on party_participants so Supabase
--    Realtime delivers all columns for INSERT/UPDATE/DELETE events,
--    ensuring filtered subscriptions work reliably.
--
-- 2. Update join_party_by_code to reactivate participants who
--    previously left (is_active = false). Returns full party data
--    as JSONB to avoid a separate SELECT after the mutation.
--
-- 3. Add end_party_by_creator RPC that atomically ends a party
--    and deactivates all participants.

-- ============================================
-- 1. REPLICA IDENTITY FULL
-- ============================================

ALTER TABLE public.party_participants REPLICA IDENTITY FULL;

-- ============================================
-- 2. Update join_party_by_code
-- ============================================

CREATE OR REPLACE FUNCTION public.join_party_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_id UUID;
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_is_active BOOLEAN;
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the active party by code (bypasses RLS)
  SELECT id INTO v_party_id
  FROM public.parties
  WHERE code = upper(p_code) AND status = 'active';

  IF v_party_id IS NULL THEN
    RAISE EXCEPTION 'Party not found or already ended';
  END IF;

  -- Check if user already has a participant row
  SELECT id, is_active INTO v_existing_id, v_is_active
  FROM public.party_participants
  WHERE party_id = v_party_id AND user_id = v_user_id;

  IF v_existing_id IS NOT NULL THEN
    -- Reactivate if previously left
    IF NOT v_is_active THEN
      UPDATE public.party_participants
      SET is_active = true
      WHERE id = v_existing_id;
    END IF;
  ELSE
    -- Insert new participant
    INSERT INTO public.party_participants (party_id, user_id, role, drinks)
    VALUES (v_party_id, v_user_id, 'member',
      '{"beer":0,"cubata":0,"shot":0,"wine":0,"cocktail":0,"other":0,"total":0}'::jsonb);
  END IF;

  -- Build full party response within the same transaction
  SELECT jsonb_build_object(
    'id', p.id,
    'code', p.code,
    'name', p.name,
    'status', p.status,
    'creator_id', p.creator_id,
    'created_at', p.created_at,
    'ended_at', p.ended_at,
    'party_participants', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'party_id', pp.party_id,
          'user_id', pp.user_id,
          'role', pp.role,
          'drinks', pp.drinks,
          'joined_at', pp.joined_at,
          'is_active', pp.is_active,
          'users', jsonb_build_object(
            'display_name', u.display_name,
            'avatar_url', u.avatar_url
          )
        )
      ),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM public.parties p
  LEFT JOIN public.party_participants pp ON pp.party_id = p.id
  LEFT JOIN public.users u ON u.id = pp.user_id
  WHERE p.id = v_party_id
  GROUP BY p.id;

  RETURN v_result;
END;
$$;

-- ============================================
-- 3. end_party_by_creator
-- ============================================

CREATE OR REPLACE FUNCTION public.end_party_by_creator(p_party_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_creator_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the caller is the party creator
  SELECT creator_id INTO v_creator_id
  FROM public.parties
  WHERE id = p_party_id AND status = 'active';

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Party not found or already ended';
  END IF;

  IF v_creator_id != v_user_id THEN
    RAISE EXCEPTION 'Only the party creator can end the party';
  END IF;

  -- Atomically end party and deactivate all participants
  UPDATE public.parties
  SET status = 'ended', ended_at = now()
  WHERE id = p_party_id;

  UPDATE public.party_participants
  SET is_active = false
  WHERE party_id = p_party_id;
END;
$$;

-- #####################################################################
-- ## migration_add_username.sql
-- #####################################################################

-- ============================================
-- Migration: Add username column to users table
-- ============================================
-- Adds a unique, optional username field for display in party contexts.
-- Existing users will have NULL until they set one via the onboarding flow.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;

-- Unique constraint allows multiple NULLs (PostgreSQL standard behavior)
ALTER TABLE public.users ADD CONSTRAINT users_username_unique UNIQUE (username);

-- Index for fast lookups (uniqueness check, profile search)
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- RLS: users can already read/update own profile via existing policies.
-- The join_party_by_code RPC needs to include username in participant data.

-- ============================================
-- Update join_party_by_code RPC to include username
-- ============================================

CREATE OR REPLACE FUNCTION public.join_party_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_id UUID;
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_is_active BOOLEAN;
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_party_id
  FROM public.parties
  WHERE code = upper(p_code) AND status = 'active';

  IF v_party_id IS NULL THEN
    RAISE EXCEPTION 'Party not found or already ended';
  END IF;

  SELECT id, is_active INTO v_existing_id, v_is_active
  FROM public.party_participants
  WHERE party_id = v_party_id AND user_id = v_user_id;

  IF v_existing_id IS NOT NULL THEN
    IF NOT v_is_active THEN
      UPDATE public.party_participants
      SET is_active = true
      WHERE id = v_existing_id;
    END IF;
  ELSE
    INSERT INTO public.party_participants (party_id, user_id, role, drinks)
    VALUES (v_party_id, v_user_id, 'member',
      '{"beer":0,"cubata":0,"shot":0,"wine":0,"cocktail":0,"other":0,"total":0}'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'code', p.code,
    'name', p.name,
    'status', p.status,
    'creator_id', p.creator_id,
    'created_at', p.created_at,
    'ended_at', p.ended_at,
    'party_participants', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'party_id', pp.party_id,
          'user_id', pp.user_id,
          'role', pp.role,
          'drinks', pp.drinks,
          'joined_at', pp.joined_at,
          'is_active', pp.is_active,
          'users', jsonb_build_object(
            'display_name', u.display_name,
            'avatar_url', u.avatar_url,
            'username', u.username
          )
        )
      ),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM public.parties p
  LEFT JOIN public.party_participants pp ON pp.party_id = p.id
  LEFT JOIN public.users u ON u.id = pp.user_id
  WHERE p.id = v_party_id
  GROUP BY p.id;

  RETURN v_result;
END;
$$;

-- ============================================
-- Utility: Check username availability
-- ============================================
-- Public RPC so any authenticated user can check before submitting.

CREATE OR REPLACE FUNCTION public.is_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.users WHERE username = lower(p_username)
  );
$$;

-- #####################################################################
-- ## migration_push_tokens.sql
-- #####################################################################

-- ============================================
-- Migration: Push notification tokens
-- ============================================
-- Stores Expo push tokens for sending native notifications.
-- Each device registers its token; a user may have multiple devices.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tokens"
  ON public.push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON public.push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON public.push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON public.push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Notification trigger
-- ============================================
-- Push notifications are handled via a Supabase Database Webhook
-- configured in the dashboard (Database > Webhooks):
--   Name:   notify-party-join
--   Table:  party_participants
--   Events: INSERT, UPDATE
--   Type:   Supabase Edge Functions -> notify-party-join
--
-- The Edge Function filters UPDATE events to only process rejoins
-- (is_active changing from false to true). All other updates
-- (drinks, role changes) are ignored by the function.

-- #####################################################################
-- ## migration_delete_account.sql
-- #####################################################################

-- ============================================
-- Migration: Account deletion support
-- ============================================
-- Changes the FK from public.users to auth.users so that deleting
-- from auth.users does NOT cascade-delete the public.users row.
-- This allows the anonymized "tombstone" row to remain, preserving
-- referential integrity with party_participants, party_media, etc.
--
-- The actual deletion is handled by the delete-account Edge Function:
-- 1. Anonymizes the public.users row (removes all PII)
-- 2. Deletes from auth.users via admin API
-- 3. The public.users tombstone row stays with display_name = 'Deleted User'

-- Step 1: Drop the existing FK with CASCADE
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Step 2: Re-add the FK without CASCADE
-- The primary key constraint remains; we only change the FK behavior.
ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id)
  ON DELETE NO ACTION;

-- Step 3: RPC to anonymize user data (called by the Edge Function)
CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
  SET
    display_name = 'Deleted User',
    email = 'deleted-' || p_user_id::TEXT || '@removed.local',
    avatar_url = NULL,
    username = NULL,
    provider = NULL,
    is_premium = false,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- #####################################################################
-- ## migration_photo_reactions.sql
-- #####################################################################

-- ============================================
-- Migration: Photo Reactions (Stickers)
-- ============================================
-- Allows party participants to react to photos with stickers.
-- Each user can place one reaction per photo (upsert to change).
-- Reactions are anonymous in the UI but tracked by user_id for uniqueness.
-- Reactions are immutable once the party has ended.

-- Table
CREATE TABLE IF NOT EXISTS public.photo_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES public.party_media(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  sticker_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(media_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_photo_reactions_media ON public.photo_reactions(media_id);

-- Full replica identity for realtime
ALTER TABLE public.photo_reactions REPLICA IDENTITY FULL;

-- Enable RLS
ALTER TABLE public.photo_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Read: party participants can view reactions for photos in their parties
CREATE POLICY "Participants can view photo reactions"
  ON public.photo_reactions FOR SELECT
  USING (
    media_id IN (
      SELECT pm.id FROM public.party_media pm
      WHERE pm.party_id IN (SELECT public.user_party_ids())
    )
  );

-- Insert: authenticated users who are participants of an ACTIVE party
CREATE POLICY "Participants can react to photos in active parties"
  ON public.photo_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND media_id IN (
      SELECT pm.id FROM public.party_media pm
      JOIN public.parties p ON p.id = pm.party_id
      WHERE pm.party_id IN (SELECT public.user_party_ids())
        AND p.status = 'active'
    )
  );

-- Update: only own reactions in active parties
CREATE POLICY "Users can update own reactions in active parties"
  ON public.photo_reactions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND media_id IN (
      SELECT pm.id FROM public.party_media pm
      JOIN public.parties p ON p.id = pm.party_id
      WHERE p.status = 'active'
    )
  );

-- Delete: only own reactions in active parties
CREATE POLICY "Users can remove own reactions in active parties"
  ON public.photo_reactions FOR DELETE
  USING (
    auth.uid() = user_id
    AND media_id IN (
      SELECT pm.id FROM public.party_media pm
      JOIN public.parties p ON p.id = pm.party_id
      WHERE p.status = 'active'
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.photo_reactions;

-- #####################################################################
-- ## migration_one_active_party.sql
-- #####################################################################

-- ============================================
-- Migration: Enforce one active party per user
-- ============================================
-- Adds a partial unique index on party_participants so a user can never
-- have more than one row with is_active = true. Also updates the
-- join_party_by_code RPC to reject users who are already in another
-- active party, providing a clear error message before the constraint
-- would fire.

-- Step 1: Clean up any existing duplicates (keep the most recent one)
-- This is idempotent and safe to run even if no duplicates exist.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY joined_at DESC) AS rn
  FROM public.party_participants
  WHERE is_active = true
)
UPDATE public.party_participants
SET is_active = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 2: Create the partial unique index (the database-level barrier)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_party_per_user
ON public.party_participants (user_id)
WHERE is_active = true;

-- Step 3: Update join_party_by_code to check for existing active party
CREATE OR REPLACE FUNCTION public.join_party_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_id UUID;
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_is_active BOOLEAN;
  v_other_active_party UUID;
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the active party by code
  SELECT id INTO v_party_id
  FROM public.parties
  WHERE code = upper(p_code) AND status = 'active';

  IF v_party_id IS NULL THEN
    RAISE EXCEPTION 'Party not found or already ended';
  END IF;

  -- Check if user already has a participant row in THIS party
  SELECT id, is_active INTO v_existing_id, v_is_active
  FROM public.party_participants
  WHERE party_id = v_party_id AND user_id = v_user_id;

  -- If user is NOT already in this party, check for active participation elsewhere
  IF v_existing_id IS NULL OR NOT v_is_active THEN
    SELECT party_id INTO v_other_active_party
    FROM public.party_participants
    WHERE user_id = v_user_id
      AND is_active = true
      AND party_id != v_party_id;

    IF v_other_active_party IS NOT NULL THEN
      RAISE EXCEPTION 'You are already in an active party';
    END IF;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    -- Reactivate if previously left
    IF NOT v_is_active THEN
      UPDATE public.party_participants
      SET is_active = true
      WHERE id = v_existing_id;
    END IF;
  ELSE
    -- Insert new participant
    INSERT INTO public.party_participants (party_id, user_id, role, drinks)
    VALUES (v_party_id, v_user_id, 'member',
      '{"beer":0,"cubata":0,"shot":0,"wine":0,"cocktail":0,"other":0,"total":0}'::jsonb);
  END IF;

  -- Build full party response within the same transaction
  SELECT jsonb_build_object(
    'id', p.id,
    'code', p.code,
    'name', p.name,
    'status', p.status,
    'creator_id', p.creator_id,
    'creator_is_pro', p.creator_is_pro,
    'created_at', p.created_at,
    'ended_at', p.ended_at,
    'party_participants', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'party_id', pp.party_id,
          'user_id', pp.user_id,
          'role', pp.role,
          'drinks', pp.drinks,
          'joined_at', pp.joined_at,
          'is_active', pp.is_active,
          'users', jsonb_build_object(
            'display_name', u.display_name,
            'avatar_url', u.avatar_url
          )
        )
      ),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM public.parties p
  LEFT JOIN public.party_participants pp ON pp.party_id = p.id
  LEFT JOIN public.users u ON u.id = pp.user_id
  WHERE p.id = v_party_id
  GROUP BY p.id;

  RETURN v_result;
END;
$$;

-- #####################################################################
-- ## migration_party_ended_guards.sql
-- #####################################################################

-- ============================================
-- Migration: Reject drink operations on ended parties
-- ============================================
-- Updates increment_drink and decrement_drink RPCs to verify the party
-- is still active before allowing any modification. This prevents stale
-- clients (e.g. returning from background after party ended) from
-- mutating data on closed parties.

CREATE OR REPLACE FUNCTION public.increment_drink(
  p_party_id UUID,
  p_user_id UUID,
  p_drink_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_status TEXT;
  updated_drinks JSONB;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Verify the party is still active
  SELECT status INTO v_party_status
  FROM public.parties
  WHERE id = p_party_id;

  IF v_party_status IS NULL THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  IF v_party_status != 'active' THEN
    RAISE EXCEPTION 'Party has ended';
  END IF;

  UPDATE public.party_participants
  SET drinks = jsonb_set(
    jsonb_set(
      drinks,
      ARRAY[p_drink_type],
      to_jsonb(COALESCE((drinks->>p_drink_type)::int, 0) + 1)
    ),
    ARRAY['total'],
    to_jsonb(COALESCE((drinks->>'total')::int, 0) + 1)
  )
  WHERE party_id = p_party_id AND user_id = p_user_id
  RETURNING drinks INTO updated_drinks;

  INSERT INTO public.drink_events (party_id, user_id, drink_type)
  VALUES (p_party_id, p_user_id, p_drink_type);

  RETURN updated_drinks;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_drink(
  p_party_id UUID,
  p_user_id UUID,
  p_drink_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_status TEXT;
  current_count INT;
  updated_drinks JSONB;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Verify the party is still active
  SELECT status INTO v_party_status
  FROM public.parties
  WHERE id = p_party_id;

  IF v_party_status IS NULL THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  IF v_party_status != 'active' THEN
    RAISE EXCEPTION 'Party has ended';
  END IF;

  SELECT COALESCE((drinks->>p_drink_type)::int, 0)
  INTO current_count
  FROM public.party_participants
  WHERE party_id = p_party_id AND user_id = p_user_id;

  IF current_count <= 0 THEN
    SELECT drinks INTO updated_drinks
    FROM public.party_participants
    WHERE party_id = p_party_id AND user_id = p_user_id;
    RETURN updated_drinks;
  END IF;

  UPDATE public.party_participants
  SET drinks = jsonb_set(
    jsonb_set(
      drinks,
      ARRAY[p_drink_type],
      to_jsonb(GREATEST(COALESCE((drinks->>p_drink_type)::int, 0) - 1, 0))
    ),
    ARRAY['total'],
    to_jsonb(GREATEST(COALESCE((drinks->>'total')::int, 0) - 1, 0))
  )
  WHERE party_id = p_party_id AND user_id = p_user_id
  RETURNING drinks INTO updated_drinks;

  RETURN updated_drinks;
END;
$$;

-- #####################################################################
-- ## migration_party_member_limits.sql
-- #####################################################################

-- ============================================
-- Migration: Enforce party member limits
-- ============================================
-- Adds participant count validation to join_party_by_code.
-- Free parties: max 5 active members.
-- Pro parties (creator_is_pro): max 15 active members.
-- The check runs BEFORE inserting a new participant to avoid
-- exceeding the limit even under concurrent joins.

CREATE OR REPLACE FUNCTION public.join_party_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_id UUID;
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_is_active BOOLEAN;
  v_other_active_party UUID;
  v_creator_is_pro BOOLEAN;
  v_active_count INT;
  v_max_members INT;
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the active party by code
  SELECT id, creator_is_pro INTO v_party_id, v_creator_is_pro
  FROM public.parties
  WHERE code = upper(p_code) AND status = 'active';

  IF v_party_id IS NULL THEN
    RAISE EXCEPTION 'Party not found or already ended';
  END IF;

  -- Check if user already has a participant row in THIS party
  SELECT id, is_active INTO v_existing_id, v_is_active
  FROM public.party_participants
  WHERE party_id = v_party_id AND user_id = v_user_id;

  -- If user is NOT already in this party, check for active participation elsewhere
  IF v_existing_id IS NULL OR NOT v_is_active THEN
    SELECT party_id INTO v_other_active_party
    FROM public.party_participants
    WHERE user_id = v_user_id
      AND is_active = true
      AND party_id != v_party_id;

    IF v_other_active_party IS NOT NULL THEN
      RAISE EXCEPTION 'You are already in an active party';
    END IF;
  END IF;

  -- Enforce member limit (skip for users already active in this party)
  IF v_existing_id IS NULL OR NOT v_is_active THEN
    v_max_members := CASE WHEN v_creator_is_pro THEN 15 ELSE 5 END;

    SELECT COUNT(*) INTO v_active_count
    FROM public.party_participants
    WHERE party_id = v_party_id AND is_active = true;

    IF v_active_count >= v_max_members THEN
      RAISE EXCEPTION 'Party is full (% / % members)', v_active_count, v_max_members;
    END IF;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    -- Reactivate if previously left
    IF NOT v_is_active THEN
      UPDATE public.party_participants
      SET is_active = true
      WHERE id = v_existing_id;
    END IF;
  ELSE
    -- Insert new participant
    INSERT INTO public.party_participants (party_id, user_id, role, drinks)
    VALUES (v_party_id, v_user_id, 'member',
      '{"beer":0,"cubata":0,"shot":0,"wine":0,"cocktail":0,"other":0,"total":0}'::jsonb);
  END IF;

  -- Build full party response within the same transaction
  SELECT jsonb_build_object(
    'id', p.id,
    'code', p.code,
    'name', p.name,
    'status', p.status,
    'creator_id', p.creator_id,
    'creator_is_pro', p.creator_is_pro,
    'created_at', p.created_at,
    'ended_at', p.ended_at,
    'party_participants', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'party_id', pp.party_id,
          'user_id', pp.user_id,
          'role', pp.role,
          'drinks', pp.drinks,
          'joined_at', pp.joined_at,
          'is_active', pp.is_active,
          'users', jsonb_build_object(
            'display_name', u.display_name,
            'avatar_url', u.avatar_url
          )
        )
      ),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM public.parties p
  LEFT JOIN public.party_participants pp ON pp.party_id = p.id
  LEFT JOIN public.users u ON u.id = pp.user_id
  WHERE p.id = v_party_id
  GROUP BY p.id;

  RETURN v_result;
END;
$$;

-- #####################################################################
-- ## migration_challenges.sql
-- #####################################################################

-- ============================================
-- Migration: Party Challenges
-- ============================================
-- Adds challenge support to parties. Pro party creators can send
-- up to 3 challenges per party. Participants respond with images,
-- notes, or simple completions depending on the challenge type.

-- ============================================
-- TABLE: party_challenges
-- ============================================

CREATE TABLE IF NOT EXISTS public.party_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.users(id),
  type TEXT NOT NULL CHECK (type IN ('image', 'note', 'check')),
  question TEXT NOT NULL,
  order_number INTEGER NOT NULL CHECK (order_number BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(party_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_party_challenges_party ON public.party_challenges(party_id);

-- ============================================
-- TABLE: challenge_responses
-- ============================================

CREATE TABLE IF NOT EXISTS public.challenge_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.party_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  storage_path TEXT,
  image_url TEXT,
  note_content TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_responses_challenge ON public.challenge_responses(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_responses_user ON public.challenge_responses(user_id);

-- ============================================
-- RLS: party_challenges
-- ============================================

ALTER TABLE public.party_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view challenges"
  ON public.party_challenges FOR SELECT
  USING (party_id IN (SELECT public.user_party_ids()));

CREATE POLICY "Party creator can insert challenges"
  ON public.party_challenges FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id
    AND party_id IN (SELECT public.user_party_ids())
  );

-- ============================================
-- RLS: challenge_responses
-- ============================================

ALTER TABLE public.challenge_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view responses"
  ON public.challenge_responses FOR SELECT
  USING (
    challenge_id IN (
      SELECT pc.id FROM public.party_challenges pc
      WHERE pc.party_id IN (SELECT public.user_party_ids())
    )
  );

CREATE POLICY "Users can insert own responses"
  ON public.challenge_responses FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND challenge_id IN (
      SELECT pc.id FROM public.party_challenges pc
      WHERE pc.party_id IN (SELECT public.user_party_ids())
    )
  );

CREATE POLICY "Users can update own responses"
  ON public.challenge_responses FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- RPC: create_challenge
-- ============================================
-- Validates that:
--   1. The caller is the party creator
--   2. The party is active
--   3. The party is Pro (creator_is_pro = true)
--   4. The challenge count has not reached the maximum of 3

CREATE OR REPLACE FUNCTION public.create_challenge(
  p_party_id UUID,
  p_type TEXT,
  p_question TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_party RECORD;
  v_count INTEGER;
  v_order INTEGER;
  v_challenge RECORD;
BEGIN
  -- Fetch and lock the party row
  SELECT id, creator_id, status, creator_is_pro
    INTO v_party
    FROM public.parties
   WHERE id = p_party_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  IF v_party.status <> 'active' THEN
    RAISE EXCEPTION 'Party is not active';
  END IF;

  IF v_party.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the party creator can create challenges';
  END IF;

  IF NOT v_party.creator_is_pro THEN
    RAISE EXCEPTION 'Challenges require a Pro party';
  END IF;

  -- Count existing challenges
  SELECT COUNT(*) INTO v_count
    FROM public.party_challenges
   WHERE party_id = p_party_id;

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 challenges per party reached';
  END IF;

  v_order := v_count + 1;

  -- Insert the challenge
  INSERT INTO public.party_challenges (party_id, creator_id, type, question, order_number)
  VALUES (p_party_id, auth.uid(), p_type, p_question, v_order)
  RETURNING * INTO v_challenge;

  RETURN to_jsonb(v_challenge);
END;
$$;

-- ============================================
-- Storage: challenge images
-- ============================================
-- Challenge images are stored in the existing party-photos bucket
-- under the path: {partyId}/challenges/{challengeId}/{userId}.{ext}
-- The existing storage policies on party-photos already allow
-- participants to upload/read within their party folder. We add
-- an additional INSERT policy for the challenges subfolder.

CREATE POLICY "Participants can upload challenge images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'party-photos'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND (storage.foldername(name))[2] = 'challenges'
    AND EXISTS (
      SELECT 1 FROM public.party_participants pp
      WHERE pp.party_id = (storage.foldername(name))[1]::UUID
        AND pp.user_id = auth.uid()
        AND pp.is_active = true
    )
  );

-- ============================================
-- Realtime
-- ============================================
-- Enable realtime for both tables so the client can subscribe
-- to live updates for challenges and responses.

ALTER PUBLICATION supabase_realtime ADD TABLE public.party_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_responses;

-- ============================================
-- Notification trigger
-- ============================================
-- Push notifications for new challenges are handled via a Supabase
-- Database Webhook configured in the dashboard (Database > Webhooks):
--   Name:   notify-challenge-created
--   Table:  party_challenges
--   Events: INSERT
--   Type:   Supabase Edge Functions -> notify-challenge-created

-- #####################################################################
-- ## migration_challenge_expiry.sql
-- #####################################################################

-- ============================================
-- Migration: Challenge Expiry (Timer System)
-- ============================================
-- Adds server-side expiration processing for party challenges.
-- A pg_cron job runs every 30 seconds to detect expired challenges,
-- bulk-insert "not completed" responses for non-respondents, and
-- mark challenges as expired. Realtime subscriptions propagate
-- the state change to all connected clients automatically.

-- ============================================
-- NEW COLUMNS
-- ============================================

ALTER TABLE public.party_challenges
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  ADD COLUMN IF NOT EXISTS is_expired BOOLEAN NOT NULL DEFAULT false;

-- Partial index for the cron job: only scans unexpired challenges
CREATE INDEX IF NOT EXISTS idx_party_challenges_expiry
  ON public.party_challenges(expires_at)
  WHERE is_expired = false;

-- ============================================
-- UPDATE create_challenge RPC
-- ============================================
-- Replaces the existing function to include expires_at in the INSERT.

CREATE OR REPLACE FUNCTION public.create_challenge(
  p_party_id UUID,
  p_type TEXT,
  p_question TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_party RECORD;
  v_count INTEGER;
  v_order INTEGER;
  v_challenge RECORD;
BEGIN
  SELECT id, creator_id, status, creator_is_pro
    INTO v_party
    FROM public.parties
   WHERE id = p_party_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  IF v_party.status <> 'active' THEN
    RAISE EXCEPTION 'Party is not active';
  END IF;

  IF v_party.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the party creator can create challenges';
  END IF;

  IF NOT v_party.creator_is_pro THEN
    RAISE EXCEPTION 'Challenges require a Pro party';
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.party_challenges
   WHERE party_id = p_party_id;

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 challenges per party reached';
  END IF;

  v_order := v_count + 1;

  INSERT INTO public.party_challenges
    (party_id, creator_id, type, question, order_number, expires_at)
  VALUES
    (p_party_id, auth.uid(), p_type, p_question, v_order, now() + interval '15 minutes')
  RETURNING * INTO v_challenge;

  RETURN to_jsonb(v_challenge);
END;
$$;

-- ============================================
-- EXPIRY PROCESSING FUNCTION
-- ============================================
-- Called by pg_cron every 30 seconds. For each expired challenge:
--   1. Inserts completed=false for all participants without a response
--   2. Sets is_expired=true on the challenge
--
-- Design notes:
--   - FOR UPDATE SKIP LOCKED prevents race conditions between overlapping runs
--   - ON CONFLICT DO NOTHING makes the function idempotent
--   - INSERT/UPDATE trigger realtime subscriptions automatically

CREATE OR REPLACE FUNCTION public.process_expired_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  FOR v_challenge IN
    SELECT pc.id, pc.party_id
    FROM public.party_challenges pc
    WHERE pc.expires_at <= now()
      AND pc.is_expired = false
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Bulk insert "not completed" for active participants without a response
    INSERT INTO public.challenge_responses (challenge_id, user_id, completed)
    SELECT v_challenge.id, pp.user_id, false
    FROM public.party_participants pp
    WHERE pp.party_id = v_challenge.party_id
      AND pp.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.challenge_responses cr
        WHERE cr.challenge_id = v_challenge.id
          AND cr.user_id = pp.user_id
      )
    ON CONFLICT (challenge_id, user_id) DO NOTHING;

    -- Mark challenge as expired
    UPDATE public.party_challenges
    SET is_expired = true
    WHERE id = v_challenge.id;
  END LOOP;
END;
$$;

-- ============================================
-- CRON SCHEDULE (every 30 seconds)
-- ============================================
-- Requires pg_cron extension and Postgres >= 15.1.1.61 for sub-minute intervals.

SELECT cron.schedule(
  'process-expired-challenges',
  '30 seconds',
  $$SELECT public.process_expired_challenges()$$
);

-- #####################################################################
-- ## migration_challenge_photo_reactions.sql
-- #####################################################################

-- ============================================
-- Migration: Challenge Photo Reactions
-- ============================================
-- Mirrors the photo_reactions system for challenge response images.
-- Uses the same sticker-based reaction model with one reaction per user
-- per challenge response.

CREATE TABLE IF NOT EXISTS public.challenge_photo_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES public.challenge_responses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  sticker_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(response_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_photo_reactions_response
  ON public.challenge_photo_reactions(response_id);

-- Full replica identity for realtime
ALTER TABLE public.challenge_photo_reactions REPLICA IDENTITY FULL;

-- Enable RLS
ALTER TABLE public.challenge_photo_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Read: party participants can view reactions for challenge photos in their parties
CREATE POLICY "Participants can view challenge photo reactions"
  ON public.challenge_photo_reactions FOR SELECT
  USING (
    response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      WHERE pc.party_id IN (SELECT public.user_party_ids())
    )
  );

-- Insert: authenticated users can react to challenge photos in active parties
CREATE POLICY "Participants can add challenge photo reactions"
  ON public.challenge_photo_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      JOIN public.parties p ON p.id = pc.party_id
      WHERE p.status = 'active'
    )
  );

-- Update: users can change their own reaction
CREATE POLICY "Users can update own challenge photo reactions"
  ON public.challenge_photo_reactions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      JOIN public.parties p ON p.id = pc.party_id
      WHERE p.status = 'active'
    )
  );

-- Delete: users can remove their own reaction
CREATE POLICY "Users can delete own challenge photo reactions"
  ON public.challenge_photo_reactions FOR DELETE
  USING (
    auth.uid() = user_id
    AND response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      JOIN public.parties p ON p.id = pc.party_id
      WHERE p.status = 'active'
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_photo_reactions;

-- #####################################################################
-- ## migration_end_party_expire_challenges.sql
-- #####################################################################

-- ============================================
-- Migration: Expire challenges when party ends
-- ============================================
-- Updates end_party_by_creator to also expire all active challenges
-- for the party. This ensures challenge results are immediately
-- available when viewing the ended party, rather than waiting
-- up to 15 minutes for the cron job to process them.
--
-- The expiry logic runs BEFORE deactivating participants so that
-- the "not completed" response insertion (which checks is_active)
-- works correctly.

CREATE OR REPLACE FUNCTION public.end_party_by_creator(p_party_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_creator_id UUID;
  v_challenge RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the caller is the party creator
  SELECT creator_id INTO v_creator_id
  FROM public.parties
  WHERE id = p_party_id AND status = 'active';

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Party not found or already ended';
  END IF;

  IF v_creator_id != v_user_id THEN
    RAISE EXCEPTION 'Only the party creator can end the party';
  END IF;

  -- Expire all active challenges before deactivating participants
  FOR v_challenge IN
    SELECT pc.id
    FROM public.party_challenges pc
    WHERE pc.party_id = p_party_id
      AND pc.is_expired = false
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.challenge_responses (challenge_id, user_id, completed)
    SELECT v_challenge.id, pp.user_id, false
    FROM public.party_participants pp
    WHERE pp.party_id = p_party_id
      AND pp.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.challenge_responses cr
        WHERE cr.challenge_id = v_challenge.id
          AND cr.user_id = pp.user_id
      )
    ON CONFLICT (challenge_id, user_id) DO NOTHING;

    UPDATE public.party_challenges
    SET is_expired = true
    WHERE id = v_challenge.id;
  END LOOP;

  -- End the party
  UPDATE public.parties
  SET status = 'ended', ended_at = now()
  WHERE id = p_party_id;

  -- Deactivate all participants
  UPDATE public.party_participants
  SET is_active = false
  WHERE party_id = p_party_id;
END;
$$;

-- #####################################################################
-- ## migration_input_limits.sql
-- #####################################################################

-- ============================================
-- Migration: Input length limits
-- ============================================
-- Enforces maximum lengths at the database level:
--   - party_challenges.question: 50 characters
--   - challenge_responses.note_content: 1000 characters
--   - party_notes.content: 1000 characters
-- Also updates create_challenge RPC to validate question length.

-- ============================================
-- TABLE CONSTRAINTS
-- ============================================

ALTER TABLE public.party_challenges
  ADD CONSTRAINT chk_question_length CHECK (char_length(question) <= 50);

ALTER TABLE public.challenge_responses
  ADD CONSTRAINT chk_note_content_length CHECK (note_content IS NULL OR char_length(note_content) <= 1000);

ALTER TABLE public.party_notes
  ADD CONSTRAINT chk_party_note_length CHECK (char_length(content) <= 1000);

-- ============================================
-- UPDATE create_challenge RPC
-- ============================================
-- Adds question length validation before the insert.

CREATE OR REPLACE FUNCTION public.create_challenge(
  p_party_id UUID,
  p_type TEXT,
  p_question TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_party RECORD;
  v_count INTEGER;
  v_order INTEGER;
  v_challenge RECORD;
BEGIN
  IF char_length(p_question) > 50 THEN
    RAISE EXCEPTION 'Question exceeds maximum length of 50 characters';
  END IF;

  SELECT id, creator_id, status, creator_is_pro
    INTO v_party
    FROM public.parties
   WHERE id = p_party_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  IF v_party.status <> 'active' THEN
    RAISE EXCEPTION 'Party is not active';
  END IF;

  IF v_party.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the party creator can create challenges';
  END IF;

  IF NOT v_party.creator_is_pro THEN
    RAISE EXCEPTION 'Challenges require a Pro party';
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.party_challenges
   WHERE party_id = p_party_id;

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 challenges per party reached';
  END IF;

  v_order := v_count + 1;

  INSERT INTO public.party_challenges
    (party_id, creator_id, type, question, order_number, expires_at)
  VALUES
    (p_party_id, auth.uid(), p_type, p_question, v_order, now() + interval '15 minutes')
  RETURNING * INTO v_challenge;

  RETURN to_jsonb(v_challenge);
END;
$$;

-- #####################################################################
-- ## migration_drink_limit.sql
-- #####################################################################

-- ============================================
-- Migration: Enforce max 50 drinks per user per party
-- ============================================
-- Adds a server-side guard to the increment_drink RPC so that
-- no participant can exceed 50 drinks of any single type.
-- This prevents abuse even if the client-side guard is bypassed.

CREATE OR REPLACE FUNCTION public.increment_drink(
  p_party_id UUID,
  p_user_id UUID,
  p_drink_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_count INT;
  updated_drinks JSONB;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE((drinks->>p_drink_type)::int, 0)
  INTO current_count
  FROM public.party_participants
  WHERE party_id = p_party_id AND user_id = p_user_id;

  IF current_count >= 50 THEN
    RAISE EXCEPTION 'Drink limit reached (max 50 per type)';
  END IF;

  UPDATE public.party_participants
  SET drinks = jsonb_set(
    jsonb_set(
      drinks,
      ARRAY[p_drink_type],
      to_jsonb(COALESCE((drinks->>p_drink_type)::int, 0) + 1)
    ),
    ARRAY['total'],
    to_jsonb(COALESCE((drinks->>'total')::int, 0) + 1)
  )
  WHERE party_id = p_party_id AND user_id = p_user_id
  RETURNING drinks INTO updated_drinks;

  INSERT INTO public.drink_events (party_id, user_id, drink_type)
  VALUES (p_party_id, p_user_id, p_drink_type);

  RETURN updated_drinks;
END;
$$;

-- #####################################################################
-- ## migration_challenge_response_expiry_guard.sql
-- #####################################################################

-- ============================================
-- Migration: Challenge response expiry guard
-- ============================================
-- Updates RLS policies on challenge_responses to prevent users from
-- inserting or updating responses for expired challenges.
-- SECURITY DEFINER functions (cron job, end-party) bypass RLS,
-- so they are unaffected by these restrictions.

-- Replace INSERT policy to also check is_expired = false
DROP POLICY IF EXISTS "Users can insert own responses" ON public.challenge_responses;
CREATE POLICY "Users can insert own responses"
  ON public.challenge_responses FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND challenge_id IN (
      SELECT pc.id FROM public.party_challenges pc
      WHERE pc.party_id IN (SELECT public.user_party_ids())
        AND pc.is_expired = false
    )
  );

-- Replace UPDATE policy to also check is_expired = false
DROP POLICY IF EXISTS "Users can update own responses" ON public.challenge_responses;
CREATE POLICY "Users can update own responses"
  ON public.challenge_responses FOR UPDATE
  USING (
    auth.uid() = user_id
    AND challenge_id IN (
      SELECT pc.id FROM public.party_challenges pc
      WHERE pc.is_expired = false
    )
  );

-- #####################################################################
-- ## migration_user_avatars_bucket.sql
-- #####################################################################

-- ============================================
-- Migration: User Avatars Storage Bucket
-- ============================================
-- Creates a private storage bucket for user profile photos.
-- Path format: {userId}.{ext} (e.g., "abc-123-uuid.jpg")
-- Only the file owner can upload/update/delete their own avatar.
-- Any authenticated user can view avatars.

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (string_to_array(name, '.'))[1]
  );

-- Users can update (overwrite) their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (string_to_array(name, '.'))[1]
  );

-- Any authenticated user can view avatars
CREATE POLICY "Authenticated users can view avatars"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-avatars'
    AND auth.role() = 'authenticated'
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (string_to_array(name, '.'))[1]
  );

-- #####################################################################
-- ## migration_user_stats.sql
-- #####################################################################

-- ============================================
-- Migration: User Stats RPC
-- ============================================
-- Returns aggregated statistics for the authenticated user:
--   total_parties, total_drinks, total_challenges.
-- Used by the profile screen to display lifetime stats.

CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_total_parties INTEGER;
  v_total_drinks INTEGER;
  v_total_challenges INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Count ended parties the user participated in
  SELECT COUNT(DISTINCT pp.party_id) INTO v_total_parties
  FROM public.party_participants pp
  JOIN public.parties p ON p.id = pp.party_id
  WHERE pp.user_id = v_user_id
    AND p.status = 'ended';

  -- Sum total drinks across all parties
  SELECT COALESCE(SUM((pp.drinks->>'total')::integer), 0) INTO v_total_drinks
  FROM public.party_participants pp
  WHERE pp.user_id = v_user_id;

  -- Count challenge responses (both completed and not)
  SELECT COUNT(*) INTO v_total_challenges
  FROM public.challenge_responses cr
  WHERE cr.user_id = v_user_id;

  RETURN jsonb_build_object(
    'total_parties', v_total_parties,
    'total_drinks', v_total_drinks,
    'total_challenges', v_total_challenges
  );
END;
$$;

-- #####################################################################
-- ## migration_venues.sql
-- #####################################################################

-- ============================================
-- VENUES Migration
-- ============================================
-- Adds venue (nightclub/pub) support to PartyUp.
-- Requires PostGIS and pg_trgm extensions.

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- VENUES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  amenity TEXT,
  location geography(Point, 4326) NOT NULL,
  latitude FLOAT8 NOT NULL,
  longitude FLOAT8 NOT NULL,
  address_city TEXT,
  address_street TEXT,
  address_housenumber TEXT,
  address_postcode TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  opening_hours TEXT,
  wheelchair TEXT,
  outdoor_seating BOOLEAN,
  indoor_seating BOOLEAN,
  air_conditioning BOOLEAN,
  smoking TEXT,
  live_music BOOLEAN,
  min_age TEXT,
  cuisine TEXT,
  contact_facebook TEXT,
  contact_instagram TEXT,
  contact_twitter TEXT,
  contact_tiktok TEXT,
  contact_threads TEXT,
  image_url TEXT,
  logo_url TEXT,
  extra_properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Spatial index for proximity queries (ST_DWithin)
CREATE INDEX IF NOT EXISTS idx_venues_location ON public.venues USING GIST(location);

-- Trigram index for fast ILIKE name searches
CREATE INDEX IF NOT EXISTS idx_venues_name_trgm ON public.venues USING GIN(name gin_trgm_ops);

-- Amenity type filter
CREATE INDEX IF NOT EXISTS idx_venues_amenity ON public.venues(amenity);

-- ============================================
-- ADD venue_id TO PARTIES
-- ============================================

ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id);

CREATE INDEX IF NOT EXISTS idx_parties_venue_id ON public.parties(venue_id);
CREATE INDEX IF NOT EXISTS idx_parties_venue_created ON public.parties(venue_id, created_at)
  WHERE venue_id IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read venues"
  ON public.venues FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- RPC: get_nearby_venues
-- ============================================
-- Returns venues within a given radius sorted by party popularity.
-- Uses PostGIS ST_DWithin for efficient spatial filtering with GiST index.

CREATE OR REPLACE FUNCTION public.get_nearby_venues(
  p_lat FLOAT8,
  p_lng FLOAT8,
  p_radius_meters FLOAT8 DEFAULT 10000,
  p_limit INT DEFAULT 15,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  osm_id TEXT,
  name TEXT,
  amenity TEXT,
  latitude FLOAT8,
  longitude FLOAT8,
  address_city TEXT,
  address_street TEXT,
  address_housenumber TEXT,
  address_postcode TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  opening_hours TEXT,
  wheelchair TEXT,
  outdoor_seating BOOLEAN,
  indoor_seating BOOLEAN,
  air_conditioning BOOLEAN,
  smoking TEXT,
  live_music BOOLEAN,
  min_age TEXT,
  cuisine TEXT,
  contact_facebook TEXT,
  contact_instagram TEXT,
  contact_twitter TEXT,
  contact_tiktok TEXT,
  contact_threads TEXT,
  image_url TEXT,
  logo_url TEXT,
  extra_properties JSONB,
  parties_today BIGINT,
  parties_last_week BIGINT,
  distance_meters FLOAT8
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH nearby AS (
    SELECT
      v.*,
      ST_Distance(
        v.location,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) AS distance_meters
    FROM public.venues v
    WHERE ST_DWithin(
      v.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
    AND (p_search IS NULL OR v.name ILIKE '%' || p_search || '%')
  ),
  party_counts AS (
    SELECT
      p.venue_id,
      COUNT(*) FILTER (WHERE p.created_at >= CURRENT_DATE) AS parties_today,
      COUNT(*) FILTER (WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days') AS parties_last_week
    FROM public.parties p
    WHERE p.venue_id IS NOT NULL
      AND p.created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY p.venue_id
  )
  SELECT
    n.id,
    n.osm_id,
    n.name,
    n.amenity,
    n.latitude,
    n.longitude,
    n.address_city,
    n.address_street,
    n.address_housenumber,
    n.address_postcode,
    n.phone,
    n.email,
    n.website,
    n.opening_hours,
    n.wheelchair,
    n.outdoor_seating,
    n.indoor_seating,
    n.air_conditioning,
    n.smoking,
    n.live_music,
    n.min_age,
    n.cuisine,
    n.contact_facebook,
    n.contact_instagram,
    n.contact_twitter,
    n.contact_tiktok,
    n.contact_threads,
    n.image_url,
    n.logo_url,
    n.extra_properties,
    COALESCE(pc.parties_today, 0) AS parties_today,
    COALESCE(pc.parties_last_week, 0) AS parties_last_week,
    n.distance_meters
  FROM nearby n
  LEFT JOIN party_counts pc ON pc.venue_id = n.id
  ORDER BY
    (COALESCE(pc.parties_today, 0) + COALESCE(pc.parties_last_week, 0)) DESC,
    n.distance_meters ASC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- ============================================
-- REALTIME (not needed for venues — read-only reference data)
-- ============================================

-- #####################################################################
-- ## migration_security_hardening.sql
-- #####################################################################

-- ============================================
-- Migration: Security Hardening
-- ============================================
-- Comprehensive security fixes from full audit.
-- Addresses all critical, high, medium, and low severity issues.
--
-- BYPASS MECHANISM: SECURITY DEFINER RPCs call
--   set_config('app.bypass_rls_checks', 'true', true)
-- before modifying guarded tables. Triggers check this flag and
-- skip validation when set. The flag is transaction-local and
-- resets automatically after each PostgREST request.

-- ============================================
-- 1. TRIGGER GUARD FUNCTIONS
-- ============================================

-- 1a. Users: block changes to protected columns (C2)
CREATE OR REPLACE FUNCTION public.guard_users_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.bypass_rls_checks', true) = 'true' THEN
    RETURN NEW;
  END IF;

  NEW.is_premium := OLD.is_premium;
  NEW.email := OLD.email;
  NEW.provider := OLD.provider;

  RETURN NEW;
END;
$$;

-- 1b. Parties: block changes to protected columns (H2)
CREATE OR REPLACE FUNCTION public.guard_parties_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.bypass_rls_checks', true) = 'true' THEN
    RETURN NEW;
  END IF;

  NEW.creator_id := OLD.creator_id;
  NEW.creator_is_pro := OLD.creator_is_pro;
  NEW.code := OLD.code;
  NEW.status := OLD.status;
  NEW.ended_at := OLD.ended_at;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END;
$$;

-- 1c. Party participants: only allow is_active true->false (C4)
CREATE OR REPLACE FUNCTION public.guard_participants_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.bypass_rls_checks', true) = 'true' THEN
    RETURN NEW;
  END IF;

  NEW.party_id := OLD.party_id;
  NEW.user_id := OLD.user_id;
  NEW.role := OLD.role;
  NEW.drinks := OLD.drinks;
  NEW.joined_at := OLD.joined_at;

  IF NEW.is_active AND NOT OLD.is_active THEN
    NEW.is_active := OLD.is_active;
  END IF;

  RETURN NEW;
END;
$$;

-- 1d. Party participants INSERT: validate and force defaults (H1, M6)
CREATE OR REPLACE FUNCTION public.guard_participants_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_party_status TEXT;
  v_creator_is_pro BOOLEAN;
  v_active_count INT;
  v_max_members INT;
  v_is_creator BOOLEAN;
BEGIN
  IF current_setting('app.bypass_rls_checks', true) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT status, creator_is_pro, (creator_id = NEW.user_id)
  INTO v_party_status, v_creator_is_pro, v_is_creator
  FROM public.parties
  WHERE id = NEW.party_id;

  IF v_party_status IS NULL OR v_party_status != 'active' THEN
    RAISE EXCEPTION 'Cannot join: party is not active';
  END IF;

  IF NOT v_is_creator THEN
    NEW.role := 'member';
  END IF;

  NEW.drinks := '{"beer":0,"cubata":0,"shot":0,"wine":0,"cocktail":0,"other":0,"total":0}'::jsonb;
  NEW.is_active := true;

  v_max_members := CASE WHEN v_creator_is_pro THEN 15 ELSE 5 END;

  SELECT COUNT(*) INTO v_active_count
  FROM public.party_participants
  WHERE party_id = NEW.party_id AND is_active = true;

  IF v_active_count >= v_max_members THEN
    RAISE EXCEPTION 'Party is full';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 2. APPLY TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trg_guard_users_update ON public.users;
CREATE TRIGGER trg_guard_users_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_users_update();

DROP TRIGGER IF EXISTS trg_guard_parties_update ON public.parties;
CREATE TRIGGER trg_guard_parties_update
  BEFORE UPDATE ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.guard_parties_update();

DROP TRIGGER IF EXISTS trg_guard_participants_update ON public.party_participants;
CREATE TRIGGER trg_guard_participants_update
  BEFORE UPDATE ON public.party_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_participants_update();

DROP TRIGGER IF EXISTS trg_guard_participants_insert ON public.party_participants;
CREATE TRIGGER trg_guard_participants_insert
  BEFORE INSERT ON public.party_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_participants_insert();

-- ============================================
-- 3. UPDATED RLS POLICIES
-- ============================================

-- 3a. parties INSERT: enforce creator_id and derive creator_is_pro (C3)
DROP POLICY IF EXISTS "Authenticated users can create parties" ON public.parties;
CREATE POLICY "Authenticated users can create parties"
  ON public.parties FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id
    AND creator_is_pro = (SELECT is_premium FROM public.users WHERE id = auth.uid())
  );

-- 3b. party_media INSERT: add membership + active party check (H4, M5)
DROP POLICY IF EXISTS "Users can upload own media" ON public.party_media;
CREATE POLICY "Users can upload own media"
  ON public.party_media FOR INSERT
  WITH CHECK (
    auth.uid() = uploader_id
    AND party_id IN (SELECT public.user_party_ids())
    AND party_id IN (SELECT id FROM public.parties WHERE status = 'active')
  );

-- 3c. party_notes INSERT: add membership + active party check (H4, M5)
DROP POLICY IF EXISTS "Users can create own notes" ON public.party_notes;
CREATE POLICY "Users can create own notes"
  ON public.party_notes FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND party_id IN (SELECT public.user_party_ids())
    AND party_id IN (SELECT id FROM public.parties WHERE status = 'active')
  );

-- 3d. drink_events INSERT: add membership check (H5)
DROP POLICY IF EXISTS "Users can create own drink events" ON public.drink_events;
CREATE POLICY "Users can create own drink events"
  ON public.drink_events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND party_id IN (SELECT public.user_party_ids())
    AND party_id IN (SELECT id FROM public.parties WHERE status = 'active')
  );

-- 3e. party_challenges INSERT: restrict to party creator (H7)
DROP POLICY IF EXISTS "Party creator can insert challenges" ON public.party_challenges;
CREATE POLICY "Party creator can insert challenges"
  ON public.party_challenges FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id
    AND party_id IN (
      SELECT id FROM public.parties
      WHERE creator_id = auth.uid() AND status = 'active'
    )
  );

-- 3f. challenge_photo_reactions: add membership check (H8)
DROP POLICY IF EXISTS "Participants can add challenge photo reactions" ON public.challenge_photo_reactions;
CREATE POLICY "Participants can add challenge photo reactions"
  ON public.challenge_photo_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      JOIN public.parties p ON p.id = pc.party_id
      WHERE p.status = 'active'
        AND pc.party_id IN (SELECT public.user_party_ids())
    )
  );

DROP POLICY IF EXISTS "Users can update own challenge photo reactions" ON public.challenge_photo_reactions;
CREATE POLICY "Users can update own challenge photo reactions"
  ON public.challenge_photo_reactions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      JOIN public.parties p ON p.id = pc.party_id
      WHERE p.status = 'active'
        AND pc.party_id IN (SELECT public.user_party_ids())
    )
  );

DROP POLICY IF EXISTS "Users can delete own challenge photo reactions" ON public.challenge_photo_reactions;
CREATE POLICY "Users can delete own challenge photo reactions"
  ON public.challenge_photo_reactions FOR DELETE
  USING (
    auth.uid() = user_id
    AND response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      JOIN public.parties p ON p.id = pc.party_id
      WHERE p.status = 'active'
        AND pc.party_id IN (SELECT public.user_party_ids())
    )
  );

-- 3g. challenge_responses UPDATE: add WITH CHECK to prevent challenge_id change (M7)
DROP POLICY IF EXISTS "Users can update own responses" ON public.challenge_responses;
CREATE POLICY "Users can update own responses"
  ON public.challenge_responses FOR UPDATE
  USING (
    auth.uid() = user_id
    AND challenge_id IN (
      SELECT pc.id FROM public.party_challenges pc
      WHERE pc.is_expired = false
        AND pc.party_id IN (SELECT public.user_party_ids())
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND challenge_id IN (
      SELECT pc.id FROM public.party_challenges pc
      WHERE pc.is_expired = false
        AND pc.party_id IN (SELECT public.user_party_ids())
    )
  );

-- 3h. photo_reactions UPDATE/DELETE: add membership check (L5)
DROP POLICY IF EXISTS "Users can update own reactions in active parties" ON public.photo_reactions;
CREATE POLICY "Users can update own reactions in active parties"
  ON public.photo_reactions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND media_id IN (
      SELECT pm.id FROM public.party_media pm
      JOIN public.parties p ON p.id = pm.party_id
      WHERE pm.party_id IN (SELECT public.user_party_ids())
        AND p.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can remove own reactions in active parties" ON public.photo_reactions;
CREATE POLICY "Users can remove own reactions in active parties"
  ON public.photo_reactions FOR DELETE
  USING (
    auth.uid() = user_id
    AND media_id IN (
      SELECT pm.id FROM public.party_media pm
      JOIN public.parties p ON p.id = pm.party_id
      WHERE pm.party_id IN (SELECT public.user_party_ids())
        AND p.status = 'active'
    )
  );

-- ============================================
-- 4. UPDATED RPC FUNCTIONS
-- ============================================

-- 4a. anonymize_user: add auth check, keep REVOKE (C1)
CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  UPDATE public.users
  SET
    display_name = 'Deleted User',
    email = 'deleted-' || p_user_id::TEXT || '@removed.local',
    avatar_url = NULL,
    username = NULL,
    provider = NULL,
    is_premium = false,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- 4b. increment_drink: combined fixes (H3, M2, M8, L6)
CREATE OR REPLACE FUNCTION public.increment_drink(
  p_party_id UUID,
  p_user_id UUID,
  p_drink_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_status TEXT;
  current_count INT;
  updated_drinks JSONB;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_drink_type NOT IN ('beer', 'cubata', 'shot', 'wine', 'cocktail', 'other') THEN
    RAISE EXCEPTION 'Invalid drink type';
  END IF;

  SELECT status INTO v_party_status
  FROM public.parties
  WHERE id = p_party_id;

  IF v_party_status IS NULL THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  IF v_party_status != 'active' THEN
    RAISE EXCEPTION 'Party has ended';
  END IF;

  SELECT COALESCE((drinks->>p_drink_type)::int, 0)
  INTO current_count
  FROM public.party_participants
  WHERE party_id = p_party_id AND user_id = p_user_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not an active participant';
  END IF;

  IF current_count >= 50 THEN
    RAISE EXCEPTION 'Drink limit reached (max 50 per type)';
  END IF;

  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  UPDATE public.party_participants
  SET drinks = jsonb_set(
    jsonb_set(
      drinks,
      ARRAY[p_drink_type],
      to_jsonb(COALESCE((drinks->>p_drink_type)::int, 0) + 1)
    ),
    ARRAY['total'],
    to_jsonb(COALESCE((drinks->>'total')::int, 0) + 1)
  )
  WHERE party_id = p_party_id AND user_id = p_user_id
  RETURNING drinks INTO updated_drinks;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.drink_events (party_id, user_id, drink_type)
  VALUES (p_party_id, p_user_id, p_drink_type);

  RETURN updated_drinks;
END;
$$;

-- 4c. decrement_drink: add drink type validation, active check (M3)
CREATE OR REPLACE FUNCTION public.decrement_drink(
  p_party_id UUID,
  p_user_id UUID,
  p_drink_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_status TEXT;
  current_count INT;
  updated_drinks JSONB;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_drink_type NOT IN ('beer', 'cubata', 'shot', 'wine', 'cocktail', 'other') THEN
    RAISE EXCEPTION 'Invalid drink type';
  END IF;

  SELECT status INTO v_party_status
  FROM public.parties
  WHERE id = p_party_id;

  IF v_party_status IS NULL THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  IF v_party_status != 'active' THEN
    RAISE EXCEPTION 'Party has ended';
  END IF;

  SELECT COALESCE((drinks->>p_drink_type)::int, 0)
  INTO current_count
  FROM public.party_participants
  WHERE party_id = p_party_id AND user_id = p_user_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not an active participant';
  END IF;

  IF current_count <= 0 THEN
    SELECT drinks INTO updated_drinks
    FROM public.party_participants
    WHERE party_id = p_party_id AND user_id = p_user_id;
    RETURN updated_drinks;
  END IF;

  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  UPDATE public.party_participants
  SET drinks = jsonb_set(
    jsonb_set(
      drinks,
      ARRAY[p_drink_type],
      to_jsonb(GREATEST(COALESCE((drinks->>p_drink_type)::int, 0) - 1, 0))
    ),
    ARRAY['total'],
    to_jsonb(GREATEST(COALESCE((drinks->>'total')::int, 0) - 1, 0))
  )
  WHERE party_id = p_party_id AND user_id = p_user_id
  RETURNING drinks INTO updated_drinks;

  RETURN updated_drinks;
END;
$$;

-- 4d. join_party_by_code: FOR UPDATE + bypass flag (M1, L2)
CREATE OR REPLACE FUNCTION public.join_party_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_id UUID;
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_is_active BOOLEAN;
  v_other_active_party UUID;
  v_creator_is_pro BOOLEAN;
  v_active_count INT;
  v_max_members INT;
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unable to join party';
  END IF;

  SELECT id, creator_is_pro INTO v_party_id, v_creator_is_pro
  FROM public.parties
  WHERE code = upper(p_code) AND status = 'active'
  FOR UPDATE;

  IF v_party_id IS NULL THEN
    RAISE EXCEPTION 'Unable to join party';
  END IF;

  SELECT id, is_active INTO v_existing_id, v_is_active
  FROM public.party_participants
  WHERE party_id = v_party_id AND user_id = v_user_id;

  IF v_existing_id IS NULL OR NOT v_is_active THEN
    SELECT party_id INTO v_other_active_party
    FROM public.party_participants
    WHERE user_id = v_user_id
      AND is_active = true
      AND party_id != v_party_id;

    IF v_other_active_party IS NOT NULL THEN
      RAISE EXCEPTION 'You are already in an active party';
    END IF;
  END IF;

  IF v_existing_id IS NULL OR NOT v_is_active THEN
    v_max_members := CASE WHEN v_creator_is_pro THEN 15 ELSE 5 END;

    SELECT COUNT(*) INTO v_active_count
    FROM public.party_participants
    WHERE party_id = v_party_id AND is_active = true;

    IF v_active_count >= v_max_members THEN
      RAISE EXCEPTION 'Party is full';
    END IF;
  END IF;

  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  IF v_existing_id IS NOT NULL THEN
    IF NOT v_is_active THEN
      UPDATE public.party_participants
      SET is_active = true
      WHERE id = v_existing_id;
    END IF;
  ELSE
    INSERT INTO public.party_participants (party_id, user_id, role, drinks)
    VALUES (v_party_id, v_user_id, 'member',
      '{"beer":0,"cubata":0,"shot":0,"wine":0,"cocktail":0,"other":0,"total":0}'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'code', p.code,
    'name', p.name,
    'status', p.status,
    'creator_id', p.creator_id,
    'creator_is_pro', p.creator_is_pro,
    'created_at', p.created_at,
    'ended_at', p.ended_at,
    'party_participants', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'party_id', pp.party_id,
          'user_id', pp.user_id,
          'role', pp.role,
          'drinks', pp.drinks,
          'joined_at', pp.joined_at,
          'is_active', pp.is_active,
          'users', jsonb_build_object(
            'display_name', u.display_name,
            'avatar_url', u.avatar_url,
            'username', u.username
          )
        )
      ),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM public.parties p
  LEFT JOIN public.party_participants pp ON pp.party_id = p.id
  LEFT JOIN public.users u ON u.id = pp.user_id
  WHERE p.id = v_party_id
  GROUP BY p.id;

  RETURN v_result;
END;
$$;

-- 4e. end_party_by_creator: add bypass flag
CREATE OR REPLACE FUNCTION public.end_party_by_creator(p_party_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_creator_id UUID;
  v_challenge RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT creator_id INTO v_creator_id
  FROM public.parties
  WHERE id = p_party_id AND status = 'active';

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Party not found or already ended';
  END IF;

  IF v_creator_id != v_user_id THEN
    RAISE EXCEPTION 'Only the party creator can end the party';
  END IF;

  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  FOR v_challenge IN
    SELECT pc.id
    FROM public.party_challenges pc
    WHERE pc.party_id = p_party_id
      AND pc.is_expired = false
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.challenge_responses (challenge_id, user_id, completed)
    SELECT v_challenge.id, pp.user_id, false
    FROM public.party_participants pp
    WHERE pp.party_id = p_party_id
      AND pp.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.challenge_responses cr
        WHERE cr.challenge_id = v_challenge.id
          AND cr.user_id = pp.user_id
      )
    ON CONFLICT (challenge_id, user_id) DO NOTHING;

    UPDATE public.party_challenges
    SET is_expired = true
    WHERE id = v_challenge.id;
  END LOOP;

  UPDATE public.parties
  SET status = 'ended', ended_at = now()
  WHERE id = p_party_id;

  UPDATE public.party_participants
  SET is_active = false
  WHERE party_id = p_party_id;
END;
$$;

-- 4f. create_challenge: add SET search_path (H6)
CREATE OR REPLACE FUNCTION public.create_challenge(
  p_party_id UUID,
  p_type TEXT,
  p_question TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party RECORD;
  v_count INTEGER;
  v_order INTEGER;
  v_challenge RECORD;
BEGIN
  IF char_length(p_question) > 50 THEN
    RAISE EXCEPTION 'Question exceeds maximum length of 50 characters';
  END IF;

  SELECT id, creator_id, status, creator_is_pro
    INTO v_party
    FROM public.parties
   WHERE id = p_party_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  IF v_party.status <> 'active' THEN
    RAISE EXCEPTION 'Party is not active';
  END IF;

  IF v_party.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the party creator can create challenges';
  END IF;

  IF NOT v_party.creator_is_pro THEN
    RAISE EXCEPTION 'Challenges require a Pro party';
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.party_challenges
   WHERE party_id = p_party_id;

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 challenges per party reached';
  END IF;

  v_order := v_count + 1;

  INSERT INTO public.party_challenges
    (party_id, creator_id, type, question, order_number, expires_at)
  VALUES
    (p_party_id, auth.uid(), p_type, p_question, v_order, now() + interval '15 minutes')
  RETURNING * INTO v_challenge;

  RETURN to_jsonb(v_challenge);
END;
$$;

-- 4g. process_expired_challenges: add SET search_path (H6)
CREATE OR REPLACE FUNCTION public.process_expired_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  FOR v_challenge IN
    SELECT pc.id, pc.party_id
    FROM public.party_challenges pc
    WHERE pc.expires_at <= now()
      AND pc.is_expired = false
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.challenge_responses (challenge_id, user_id, completed)
    SELECT v_challenge.id, pp.user_id, false
    FROM public.party_participants pp
    WHERE pp.party_id = v_challenge.party_id
      AND pp.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.challenge_responses cr
        WHERE cr.challenge_id = v_challenge.id
          AND cr.user_id = pp.user_id
      )
    ON CONFLICT (challenge_id, user_id) DO NOTHING;

    UPDATE public.party_challenges
    SET is_expired = true
    WHERE id = v_challenge.id;
  END LOOP;
END;
$$;

-- 4h. get_nearby_venues: auth check + limit cap (M10, L4)
-- Keeps search_path = 'public' because PostGIS functions require it
CREATE OR REPLACE FUNCTION public.get_nearby_venues(
  p_lat FLOAT8,
  p_lng FLOAT8,
  p_radius_meters FLOAT8 DEFAULT 10000,
  p_limit INT DEFAULT 15,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  osm_id TEXT,
  name TEXT,
  amenity TEXT,
  latitude FLOAT8,
  longitude FLOAT8,
  address_city TEXT,
  address_street TEXT,
  address_housenumber TEXT,
  address_postcode TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  opening_hours TEXT,
  wheelchair TEXT,
  outdoor_seating BOOLEAN,
  indoor_seating BOOLEAN,
  air_conditioning BOOLEAN,
  smoking TEXT,
  live_music BOOLEAN,
  min_age TEXT,
  cuisine TEXT,
  contact_facebook TEXT,
  contact_instagram TEXT,
  contact_twitter TEXT,
  contact_tiktok TEXT,
  contact_threads TEXT,
  image_url TEXT,
  logo_url TEXT,
  extra_properties JSONB,
  parties_today BIGINT,
  parties_last_week BIGINT,
  distance_meters FLOAT8
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH nearby AS (
    SELECT
      v.*,
      ST_Distance(
        v.location,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) AS dist_meters
    FROM public.venues v
    WHERE ST_DWithin(
      v.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
    AND (p_search IS NULL OR v.name ILIKE '%' || p_search || '%')
  ),
  party_counts AS (
    SELECT
      p.venue_id,
      COUNT(*) FILTER (WHERE p.created_at >= CURRENT_DATE) AS pt,
      COUNT(*) FILTER (WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days') AS pw
    FROM public.parties p
    WHERE p.venue_id IS NOT NULL
      AND p.created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY p.venue_id
  )
  SELECT
    n.id,
    n.osm_id,
    n.name,
    n.amenity,
    n.latitude,
    n.longitude,
    n.address_city,
    n.address_street,
    n.address_housenumber,
    n.address_postcode,
    n.phone,
    n.email,
    n.website,
    n.opening_hours,
    n.wheelchair,
    n.outdoor_seating,
    n.indoor_seating,
    n.air_conditioning,
    n.smoking,
    n.live_music,
    n.min_age,
    n.cuisine,
    n.contact_facebook,
    n.contact_instagram,
    n.contact_twitter,
    n.contact_tiktok,
    n.contact_threads,
    n.image_url,
    n.logo_url,
    n.extra_properties,
    COALESCE(pc.pt, 0) AS parties_today,
    COALESCE(pc.pw, 0) AS parties_last_week,
    n.dist_meters AS distance_meters
  FROM nearby n
  LEFT JOIN party_counts pc ON pc.venue_id = n.id
  ORDER BY
    (COALESCE(pc.pt, 0) + COALESCE(pc.pw, 0)) DESC,
    n.dist_meters ASC
  LIMIT LEAST(p_limit, 50)
  OFFSET p_offset;
END;
$$;

-- 4i. is_username_available: require auth (L1)
CREATE OR REPLACE FUNCTION public.is_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1 FROM public.users WHERE username = lower(p_username)
  );
END;
$$;

-- 4j. extract_party_id_from_path: add SET search_path (M4)
CREATE OR REPLACE FUNCTION public.extract_party_id_from_path(path TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT (string_to_array(path, '/'))[1]::UUID;
$$;

-- 4k. Admin cleanup for account deletion (replaces manual steps in edge function)
-- Handles challenge expiry (M12) and bypasses triggers safely.
CREATE OR REPLACE FUNCTION public.admin_cleanup_for_deletion(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party RECORD;
  v_challenge RECORD;
BEGIN
  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  FOR v_party IN
    SELECT id FROM public.parties
    WHERE creator_id = p_user_id AND status = 'active'
    FOR UPDATE
  LOOP
    FOR v_challenge IN
      SELECT pc.id FROM public.party_challenges pc
      WHERE pc.party_id = v_party.id AND pc.is_expired = false
      FOR UPDATE SKIP LOCKED
    LOOP
      INSERT INTO public.challenge_responses (challenge_id, user_id, completed)
      SELECT v_challenge.id, pp.user_id, false
      FROM public.party_participants pp
      WHERE pp.party_id = v_party.id
        AND pp.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM public.challenge_responses cr
          WHERE cr.challenge_id = v_challenge.id AND cr.user_id = pp.user_id
        )
      ON CONFLICT (challenge_id, user_id) DO NOTHING;

      UPDATE public.party_challenges SET is_expired = true WHERE id = v_challenge.id;
    END LOOP;

    UPDATE public.parties SET status = 'ended', ended_at = now() WHERE id = v_party.id;

    UPDATE public.party_participants SET is_active = false WHERE party_id = v_party.id;
  END LOOP;

  UPDATE public.party_participants SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;

  DELETE FROM public.push_tokens WHERE user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_cleanup_for_deletion(UUID) FROM authenticated, anon;

-- ============================================
-- 5. UPDATED STORAGE POLICIES
-- ============================================

-- 5a. Challenge images: enforce filename contains uploader's user ID (M11)
DROP POLICY IF EXISTS "Participants can upload challenge images" ON storage.objects;
CREATE POLICY "Participants can upload challenge images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'party-photos'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND (storage.foldername(name))[2] = 'challenges'
    AND (string_to_array(storage.filename(name), '.'))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.party_participants pp
      WHERE pp.party_id = (storage.foldername(name))[1]::UUID
        AND pp.user_id = auth.uid()
        AND pp.is_active = true
    )
  );

-- 5b. User avatars: restrict file extensions (L7)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (string_to_array(name, '.'))[1]
    AND lower((string_to_array(name, '.'))[2]) IN ('jpg', 'jpeg', 'png', 'webp')
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (string_to_array(name, '.'))[1]
    AND lower((string_to_array(name, '.'))[2]) IN ('jpg', 'jpeg', 'png', 'webp')
  );

-- ============================================
-- 6. REVOKE STATEMENTS
-- ============================================

REVOKE EXECUTE ON FUNCTION public.anonymize_user(UUID) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.process_expired_challenges() FROM authenticated, anon;

-- #####################################################################
-- ## migration_verification.sql
-- #####################################################################

-- ============================================
-- Migration: Verification & Account Types
-- ============================================
-- Adds verification flags, linked venue accounts, and account types.
-- Updates the guard_users_update trigger to also protect new columns.

-- ============================================
-- 1. NEW COLUMNS
-- ============================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'user' CHECK (account_type IN ('user', 'venue'));

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES public.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_linked_user
  ON public.venues(linked_user_id) WHERE linked_user_id IS NOT NULL;

-- ============================================
-- 2. UPDATE GUARD TRIGGER TO PROTECT NEW COLUMNS
-- ============================================

CREATE OR REPLACE FUNCTION public.guard_users_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.bypass_rls_checks', true) = 'true' THEN
    RETURN NEW;
  END IF;

  NEW.is_premium := OLD.is_premium;
  NEW.email := OLD.email;
  NEW.provider := OLD.provider;
  NEW.is_verified := OLD.is_verified;
  NEW.account_type := OLD.account_type;

  RETURN NEW;
END;
$$;

-- #####################################################################
-- ## migration_venue_features.sql
-- #####################################################################

-- ============================================
-- Migration: Venue Challenges & Offers
-- ============================================
-- Adds venue-wide challenge creation and venue offers system.
-- Daily limits use a 7:30 AM boundary instead of midnight to align
-- with nightlife schedules. Challenges and offers target active
-- parties created within the last 3 days.

-- ============================================
-- 1. Venue Challenge RPC
-- ============================================
-- Creates a challenge on EVERY active party at a venue.
-- Only the linked venue user can call this.

CREATE OR REPLACE FUNCTION public.create_venue_challenge(
  p_venue_id UUID,
  p_type TEXT,
  p_question TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_linked_user UUID;
  v_party RECORD;
  v_count INT := 0;
  v_existing INT;
  v_order INT;
  v_daily_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF char_length(p_question) > 50 THEN
    RAISE EXCEPTION 'Question exceeds maximum length of 50 characters';
  END IF;

  SELECT linked_user_id INTO v_linked_user
  FROM public.venues WHERE id = p_venue_id;

  IF v_linked_user IS NULL OR v_linked_user != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COUNT(*) INTO v_daily_count
  FROM public.party_challenges pc
  INNER JOIN public.parties p ON p.id = pc.party_id
  WHERE p.venue_id = p_venue_id
    AND pc.creator_id = auth.uid()
    AND pc.created_at >= date_trunc('day', now() - interval '7 hours 30 minutes') + interval '7 hours 30 minutes';

  IF v_daily_count >= 5 THEN
    RAISE EXCEPTION 'Daily challenge limit reached (5 per day)';
  END IF;

  FOR v_party IN
    SELECT id FROM public.parties
    WHERE venue_id = p_venue_id
      AND status = 'active'
      AND created_at >= now() - interval '3 days'
    FOR UPDATE
  LOOP
    SELECT COUNT(*) INTO v_existing
    FROM public.party_challenges
    WHERE party_id = v_party.id;

    IF v_existing < 3 THEN
      v_order := v_existing + 1;

      INSERT INTO public.party_challenges
        (party_id, creator_id, type, question, order_number, expires_at)
      VALUES
        (v_party.id, auth.uid(), p_type, p_question, v_order, now() + interval '15 minutes');

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================
-- 2. Venue Offers Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.venue_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) NOT NULL,
  creator_id UUID REFERENCES public.users(id) NOT NULL,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('2x1', '3x2', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_offers_venue
  ON public.venue_offers(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_offers_active
  ON public.venue_offers(venue_id, is_active) WHERE is_active = true;

ALTER TABLE public.venue_offers ENABLE ROW LEVEL SECURITY;

-- Venue owner can manage their offers
DROP POLICY IF EXISTS "Venue owner can manage offers" ON public.venue_offers;
CREATE POLICY "Venue owner can manage offers"
  ON public.venue_offers FOR ALL
  USING (
    auth.uid() = creator_id
    AND venue_id IN (
      SELECT id FROM public.venues WHERE linked_user_id = auth.uid()
    )
  );

-- Party participants can read active offers for their venue
DROP POLICY IF EXISTS "Participants can read active venue offers" ON public.venue_offers;
CREATE POLICY "Participants can read active venue offers"
  ON public.venue_offers FOR SELECT
  USING (
    is_active = true
    AND venue_id IN (
      SELECT p.venue_id FROM public.parties p
      WHERE p.venue_id IS NOT NULL
        AND p.status = 'active'
        AND p.id IN (SELECT public.user_party_ids())
    )
  );

-- ============================================
-- 3. Create Venue Offer RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.create_venue_offer(
  p_venue_id UUID,
  p_offer_type TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_price DECIMAL DEFAULT NULL,
  p_currency TEXT DEFAULT 'EUR',
  p_duration_minutes INT DEFAULT 60
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_linked_user UUID;
  v_offer_id UUID;
  v_daily_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_offer_type NOT IN ('2x1', '3x2', 'custom') THEN
    RAISE EXCEPTION 'Invalid offer type';
  END IF;

  IF char_length(p_title) > 100 THEN
    RAISE EXCEPTION 'Title too long';
  END IF;

  IF p_duration_minutes < 5 OR p_duration_minutes > 480 THEN
    RAISE EXCEPTION 'Duration must be between 5 and 480 minutes';
  END IF;

  SELECT linked_user_id INTO v_linked_user
  FROM public.venues WHERE id = p_venue_id;

  IF v_linked_user IS NULL OR v_linked_user != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COUNT(*) INTO v_daily_count
  FROM public.venue_offers
  WHERE venue_id = p_venue_id
    AND creator_id = auth.uid()
    AND created_at >= date_trunc('day', now() - interval '7 hours 30 minutes') + interval '7 hours 30 minutes';

  IF v_daily_count >= 5 THEN
    RAISE EXCEPTION 'Daily offer limit reached (5 per day)';
  END IF;

  INSERT INTO public.venue_offers
    (venue_id, creator_id, offer_type, title, description, price, currency, expires_at)
  VALUES
    (p_venue_id, auth.uid(), p_offer_type, p_title, p_description, p_price, p_currency,
     now() + (p_duration_minutes || ' minutes')::interval)
  RETURNING id INTO v_offer_id;

  RETURN v_offer_id;
END;
$$;

-- ============================================
-- 4. Get Active Offers for a Party's Venue
-- ============================================

CREATE OR REPLACE FUNCTION public.get_venue_offers_for_party(p_party_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_venue_id UUID;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.party_participants
    WHERE party_id = p_party_id AND user_id = auth.uid() AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  SELECT venue_id INTO v_venue_id
  FROM public.parties
  WHERE id = p_party_id AND status = 'active';

  IF v_venue_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', vo.id,
      'offer_type', vo.offer_type,
      'title', vo.title,
      'description', vo.description,
      'price', vo.price,
      'currency', vo.currency,
      'expires_at', vo.expires_at,
      'created_at', vo.created_at
    ) ORDER BY vo.created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.venue_offers vo
  WHERE vo.venue_id = v_venue_id
    AND vo.is_active = true
    AND vo.expires_at > now();

  RETURN v_result;
END;
$$;

-- #####################################################################
-- ## migration_venue_dashboard.sql
-- #####################################################################

-- ============================================
-- Migration: Venue Dashboard RPCs
-- ============================================
-- RPCs for the venue dashboard: stats, daily counts, active parties.
-- All follow security guidelines: SECURITY DEFINER, search_path = '',
-- auth checks, and parameter validation.
-- "Today" boundaries use 7:30 AM to align with nightlife schedules.

-- ============================================
-- 1. Venue Dashboard Stats
-- ============================================

CREATE OR REPLACE FUNCTION public.get_venue_dashboard_stats(p_venue_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_linked_user UUID;
  v_today BIGINT;
  v_week BIGINT;
  v_month BIGINT;
  v_challenges_today BIGINT;
  v_offers_today BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT linked_user_id INTO v_linked_user
  FROM public.venues WHERE id = p_venue_id;

  IF v_linked_user IS NULL OR v_linked_user != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now() - interval '7 hours 30 minutes') + interval '7 hours 30 minutes'),
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')
  INTO v_today, v_week, v_month
  FROM public.parties
  WHERE venue_id = p_venue_id;

  SELECT COUNT(*) INTO v_challenges_today
  FROM public.party_challenges pc
  INNER JOIN public.parties p ON p.id = pc.party_id
  WHERE p.venue_id = p_venue_id
    AND pc.creator_id = auth.uid()
    AND pc.created_at >= date_trunc('day', now() - interval '7 hours 30 minutes') + interval '7 hours 30 minutes';

  SELECT COUNT(*) INTO v_offers_today
  FROM public.venue_offers
  WHERE venue_id = p_venue_id
    AND creator_id = auth.uid()
    AND created_at >= date_trunc('day', now() - interval '7 hours 30 minutes') + interval '7 hours 30 minutes';

  RETURN jsonb_build_object(
    'today', v_today,
    'week', v_week,
    'month', v_month,
    'challenges_today', v_challenges_today,
    'offers_today', v_offers_today
  );
END;
$$;

-- ============================================
-- 2. Venue Daily Party Counts (for charts)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_venue_daily_counts(
  p_venue_id UUID,
  p_days INT DEFAULT 30
)
RETURNS TABLE (day DATE, count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_linked_user UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT linked_user_id INTO v_linked_user
  FROM public.venues WHERE id = p_venue_id;

  IF v_linked_user IS NULL OR v_linked_user != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    d::date AS day,
    COALESCE(pc.cnt, 0) AS count
  FROM generate_series(
    CURRENT_DATE - (LEAST(p_days, 90) - 1) * INTERVAL '1 day',
    CURRENT_DATE,
    INTERVAL '1 day'
  ) AS d
  LEFT JOIN (
    SELECT created_at::date AS pday, COUNT(*) AS cnt
    FROM public.parties
    WHERE venue_id = p_venue_id
      AND created_at >= CURRENT_DATE - LEAST(p_days, 90) * INTERVAL '1 day'
    GROUP BY pday
  ) pc ON pc.pday = d::date
  ORDER BY d;
END;
$$;

-- ============================================
-- 3. Active Venue Parties
-- ============================================

CREATE OR REPLACE FUNCTION public.get_active_venue_parties(p_venue_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_linked_user UUID;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT linked_user_id INTO v_linked_user
  FROM public.venues WHERE id = p_venue_id;

  IF v_linked_user IS NULL OR v_linked_user != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'code', p.code,
      'created_at', p.created_at,
      'participant_count', (
        SELECT COUNT(*) FROM public.party_participants pp
        WHERE pp.party_id = p.id AND pp.is_active = true
      )
    ) ORDER BY p.created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.parties p
  WHERE p.venue_id = p_venue_id
    AND p.status = 'active'
    AND p.created_at >= now() - interval '3 days';

  RETURN v_result;
END;
$$;

-- ============================================
-- 4. Get Venue ID for Current User
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_venue_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_venue_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_venue_id
  FROM public.venues
  WHERE linked_user_id = auth.uid()
  LIMIT 1;

  RETURN v_venue_id;
END;
$$;

-- #####################################################################
-- ## migration_venue_amenity_filter.sql
-- #####################################################################

-- ============================================
-- VENUE AMENITY FILTER Migration
-- ============================================
-- Replaces get_nearby_venues with a version that supports an optional
-- amenity filter. When provided, only venues matching the given amenity
-- type are returned. When NULL (default), all venues are returned.
--
-- IMPORTANT: The old 6-param overload must be dropped first because
-- adding a parameter creates a new overload in PostgreSQL rather than
-- replacing the existing function.

-- Drop the old 6-param version to avoid overload ambiguity
DROP FUNCTION IF EXISTS public.get_nearby_venues(FLOAT8, FLOAT8, FLOAT8, INT, INT, TEXT);

CREATE OR REPLACE FUNCTION public.get_nearby_venues(
  p_lat FLOAT8,
  p_lng FLOAT8,
  p_radius_meters FLOAT8 DEFAULT 10000,
  p_limit INT DEFAULT 15,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_amenity TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  osm_id TEXT,
  name TEXT,
  amenity TEXT,
  latitude FLOAT8,
  longitude FLOAT8,
  address_city TEXT,
  address_street TEXT,
  address_housenumber TEXT,
  address_postcode TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  opening_hours TEXT,
  wheelchair TEXT,
  outdoor_seating BOOLEAN,
  indoor_seating BOOLEAN,
  air_conditioning BOOLEAN,
  smoking TEXT,
  live_music BOOLEAN,
  min_age TEXT,
  cuisine TEXT,
  contact_facebook TEXT,
  contact_instagram TEXT,
  contact_twitter TEXT,
  contact_tiktok TEXT,
  contact_threads TEXT,
  image_url TEXT,
  logo_url TEXT,
  extra_properties JSONB,
  parties_today BIGINT,
  parties_last_week BIGINT,
  distance_meters FLOAT8
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH nearby AS (
    SELECT
      v.*,
      ST_Distance(
        v.location,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) AS dist_meters
    FROM public.venues v
    WHERE ST_DWithin(
      v.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
    AND (p_search IS NULL OR v.name ILIKE '%' || p_search || '%')
    AND (p_amenity IS NULL OR v.amenity = p_amenity)
  ),
  party_counts AS (
    SELECT
      p.venue_id,
      COUNT(*) FILTER (
        WHERE p.created_at >= date_trunc('day', now() - interval '7 hours 30 minutes') + interval '7 hours 30 minutes'
      ) AS pt,
      COUNT(*) FILTER (
        WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days'
      ) AS pw
    FROM public.parties p
    WHERE p.venue_id IS NOT NULL
      AND p.created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY p.venue_id
  )
  SELECT
    n.id,
    n.osm_id,
    n.name,
    n.amenity,
    n.latitude,
    n.longitude,
    n.address_city,
    n.address_street,
    n.address_housenumber,
    n.address_postcode,
    n.phone,
    n.email,
    n.website,
    n.opening_hours,
    n.wheelchair,
    n.outdoor_seating,
    n.indoor_seating,
    n.air_conditioning,
    n.smoking,
    n.live_music,
    n.min_age,
    n.cuisine,
    n.contact_facebook,
    n.contact_instagram,
    n.contact_twitter,
    n.contact_tiktok,
    n.contact_threads,
    n.image_url,
    n.logo_url,
    n.extra_properties,
    COALESCE(pc.pt, 0) AS parties_today,
    COALESCE(pc.pw, 0) AS parties_last_week,
    n.dist_meters AS distance_meters
  FROM nearby n
  LEFT JOIN party_counts pc ON pc.venue_id = n.id
  ORDER BY
    (COALESCE(pc.pt, 0) + COALESCE(pc.pw, 0)) DESC,
    n.dist_meters ASC
  LIMIT LEAST(p_limit, 50)
  OFFSET p_offset;
END;
$$;

-- #####################################################################
-- ## migration_sync_premium.sql
-- #####################################################################

-- ============================================
-- Migration: Sync Premium Status (server-only RPC)
-- ============================================
-- Provides a SECURITY DEFINER function that only the service role
-- (Edge Functions, webhooks) can call. It bypasses the guarded
-- triggers on users and parties so the premium flag can be updated
-- from trusted server-side code without opening a client-side hole.

CREATE OR REPLACE FUNCTION public.admin_sync_premium_status(
  p_user_id UUID,
  p_is_premium BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow server-side calls (service_role_key has no JWT)
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Unauthorized: server-only function';
  END IF;

  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  UPDATE public.users
  SET is_premium = p_is_premium
  WHERE id = p_user_id;

  UPDATE public.parties
  SET creator_is_pro = p_is_premium
  WHERE creator_id = p_user_id
    AND status = 'active';
END;
$$;

-- #####################################################################
-- ## migration_fix_challenge_limits.sql
-- #####################################################################

-- ============================================
-- Migration: Fix challenge count limits
-- ============================================
-- Previously, both create_challenge and create_venue_challenge counted ALL
-- challenges in a party regardless of creator. This caused venue challenges
-- and user challenges to share the same limit pool.
--
-- Fix: each function now counts only challenges created by auth.uid(),
-- keeping user limit (3 per party) and venue limit (5 per day) independent.

-- ============================================
-- 1. Fix create_challenge (user challenges)
-- ============================================
-- Count only the caller's own challenges, not venue challenges.

CREATE OR REPLACE FUNCTION public.create_challenge(
  p_party_id UUID,
  p_type TEXT,
  p_question TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_party RECORD;
  v_count INTEGER;
  v_order INTEGER;
  v_challenge RECORD;
BEGIN
  SELECT id, creator_id, status, creator_is_pro
    INTO v_party
    FROM public.parties
   WHERE id = p_party_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  IF v_party.status <> 'active' THEN
    RAISE EXCEPTION 'Party is not active';
  END IF;

  IF v_party.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the party creator can create challenges';
  END IF;

  IF NOT v_party.creator_is_pro THEN
    RAISE EXCEPTION 'Challenges require a Pro party';
  END IF;

  -- Count only this user's challenges (excludes venue challenges)
  SELECT COUNT(*) INTO v_count
    FROM public.party_challenges
   WHERE party_id = p_party_id
     AND creator_id = auth.uid();

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 challenges per party reached';
  END IF;

  -- order_number accounts for all challenges in the party
  SELECT COUNT(*) INTO v_order
    FROM public.party_challenges
   WHERE party_id = p_party_id;
  v_order := v_order + 1;

  INSERT INTO public.party_challenges (party_id, creator_id, type, question, order_number)
  VALUES (p_party_id, auth.uid(), p_type, p_question, v_order)
  RETURNING * INTO v_challenge;

  RETURN to_jsonb(v_challenge);
END;
$$;

-- ============================================
-- 2. Fix create_venue_challenge (venue challenges)
-- ============================================
-- The per-party check now counts only venue challenges for that party,
-- so user challenges don't block the venue from sending challenges.

CREATE OR REPLACE FUNCTION public.create_venue_challenge(
  p_venue_id UUID,
  p_type TEXT,
  p_question TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_linked_user UUID;
  v_party RECORD;
  v_count INT := 0;
  v_order INT;
  v_daily_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF char_length(p_question) > 50 THEN
    RAISE EXCEPTION 'Question exceeds maximum length of 50 characters';
  END IF;

  SELECT linked_user_id INTO v_linked_user
  FROM public.venues WHERE id = p_venue_id;

  IF v_linked_user IS NULL OR v_linked_user != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Daily limit: count venue challenges across all parties at this venue today
  SELECT COUNT(*) INTO v_daily_count
  FROM public.party_challenges pc
  INNER JOIN public.parties p ON p.id = pc.party_id
  WHERE p.venue_id = p_venue_id
    AND pc.creator_id = auth.uid()
    AND pc.created_at >= date_trunc('day', now() - interval '7 hours 30 minutes') + interval '7 hours 30 minutes';

  IF v_daily_count >= 5 THEN
    RAISE EXCEPTION 'Daily challenge limit reached (5 per day)';
  END IF;

  FOR v_party IN
    SELECT id FROM public.parties
    WHERE venue_id = p_venue_id
      AND status = 'active'
      AND created_at >= now() - interval '3 days'
    FOR UPDATE
  LOOP
    -- order_number accounts for all challenges in the party
    SELECT COUNT(*) INTO v_order
    FROM public.party_challenges
    WHERE party_id = v_party.id;
    v_order := v_order + 1;

    INSERT INTO public.party_challenges
      (party_id, creator_id, type, question, order_number, expires_at)
    VALUES
      (v_party.id, auth.uid(), p_type, p_question, v_order, now() + interval '15 minutes');

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- #####################################################################
-- ## migration_fix_order_number_constraint.sql
-- #####################################################################

-- Fix order_number constraint to accommodate venue + user challenges
-- The original CHECK (order_number BETWEEN 1 AND 3) is too restrictive now that
-- venues can send challenges to parties. Limits are enforced in the RPCs:
--   create_challenge: max 3 per user per party
--   create_venue_challenge: max 5 per venue per day

ALTER TABLE public.party_challenges
  DROP CONSTRAINT IF EXISTS party_challenges_order_number_check;

ALTER TABLE public.party_challenges
  ADD CONSTRAINT party_challenges_order_number_check
  CHECK (order_number BETWEEN 1 AND 50);

-- #####################################################################
-- ## migration_offer_tickets.sql
-- #####################################################################

-- ============================================
-- Migration: Offer Tickets
-- ============================================
-- Per-user, per-offer tickets that are automatically created when a
-- venue publishes an offer. Tickets can be redeemed once (torn) and
-- are validated server-side to prevent fraud.

-- ============================================
-- 1. Offer Tickets Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.offer_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES public.venue_offers(id) ON DELETE CASCADE NOT NULL,
  party_id UUID REFERENCES public.parties(id) NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  is_redeemed BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(offer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_offer_tickets_party_user
  ON public.offer_tickets(party_id, user_id);
CREATE INDEX IF NOT EXISTS idx_offer_tickets_offer
  ON public.offer_tickets(offer_id);

ALTER TABLE public.offer_tickets ENABLE ROW LEVEL SECURITY;

-- Users can only read their own tickets
DROP POLICY IF EXISTS "Users can read own tickets" ON public.offer_tickets;
CREATE POLICY "Users can read own tickets"
  ON public.offer_tickets FOR SELECT
  USING (user_id = auth.uid());

-- Only the system (trigger / SECURITY DEFINER) inserts tickets
DROP POLICY IF EXISTS "System inserts tickets" ON public.offer_tickets;
CREATE POLICY "System inserts tickets"
  ON public.offer_tickets FOR INSERT
  WITH CHECK (false);

-- Direct updates are blocked; redemption goes through the RPC
DROP POLICY IF EXISTS "Block direct updates" ON public.offer_tickets;
CREATE POLICY "Block direct updates"
  ON public.offer_tickets FOR UPDATE
  USING (false);

-- ============================================
-- 2. Trigger: Auto-create tickets on new offer
-- ============================================
-- When a venue_offer is inserted, create one offer_ticket per active
-- participant in every active party at that venue (same 3-day window
-- used by notify-venue-offer).

CREATE OR REPLACE FUNCTION public.auto_create_offer_tickets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_venue_id UUID;
  v_party RECORD;
BEGIN
  SELECT venue_id INTO v_venue_id
  FROM public.venue_offers
  WHERE id = NEW.id;

  FOR v_party IN
    SELECT id FROM public.parties
    WHERE venue_id = v_venue_id
      AND status = 'active'
      AND created_at >= now() - interval '3 days'
  LOOP
    INSERT INTO public.offer_tickets (offer_id, party_id, user_id)
    SELECT NEW.id, v_party.id, pp.user_id
    FROM public.party_participants pp
    WHERE pp.party_id = v_party.id
      AND pp.is_active = true
    ON CONFLICT (offer_id, user_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_offer_tickets ON public.venue_offers;
CREATE TRIGGER trg_auto_create_offer_tickets
  AFTER INSERT ON public.venue_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_offer_tickets();

-- ============================================
-- 3. RPC: Redeem an offer ticket
-- ============================================
-- Atomic redemption with 5 validation checks:
--   1. Ticket belongs to caller
--   2. Not already redeemed
--   3. Offer has not expired
--   4. Party is still active
--   5. User is an active participant

CREATE OR REPLACE FUNCTION public.redeem_offer_ticket(p_ticket_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ticket RECORD;
  v_offer RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_ticket
  FROM public.offer_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  IF v_ticket.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_ticket.is_redeemed THEN
    RAISE EXCEPTION 'Ticket already redeemed';
  END IF;

  SELECT * INTO v_offer
  FROM public.venue_offers
  WHERE id = v_ticket.offer_id;

  IF v_offer.expires_at <= now() THEN
    RAISE EXCEPTION 'Offer has expired';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.parties
    WHERE id = v_ticket.party_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Party is no longer active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.party_participants
    WHERE party_id = v_ticket.party_id
      AND user_id = auth.uid()
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not an active participant';
  END IF;

  UPDATE public.offer_tickets
  SET is_redeemed = true, redeemed_at = now()
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object(
    'id', v_ticket.id,
    'offer_id', v_ticket.offer_id,
    'party_id', v_ticket.party_id,
    'user_id', v_ticket.user_id,
    'is_redeemed', true,
    'redeemed_at', now(),
    'created_at', v_ticket.created_at,
    'offer_type', v_offer.offer_type,
    'title', v_offer.title,
    'description', v_offer.description,
    'price', v_offer.price,
    'currency', v_offer.currency,
    'expires_at', v_offer.expires_at
  );
END;
$$;

-- ============================================
-- 4. RPC: Get tickets for a party
-- ============================================
-- Returns all of the caller's tickets in a party with offer details.

CREATE OR REPLACE FUNCTION public.get_offer_tickets_for_party(p_party_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.party_participants
    WHERE party_id = p_party_id AND user_id = auth.uid() AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ot.id,
      'offer_id', ot.offer_id,
      'party_id', ot.party_id,
      'user_id', ot.user_id,
      'is_redeemed', ot.is_redeemed,
      'redeemed_at', ot.redeemed_at,
      'created_at', ot.created_at,
      'offer_type', vo.offer_type,
      'title', vo.title,
      'description', vo.description,
      'price', vo.price,
      'currency', vo.currency,
      'expires_at', vo.expires_at
    ) ORDER BY ot.created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.offer_tickets ot
  INNER JOIN public.venue_offers vo ON vo.id = ot.offer_id
  WHERE ot.party_id = p_party_id
    AND ot.user_id = auth.uid();

  RETURN v_result;
END;
$$;

-- ============================================
-- 5. Update admin_cleanup_for_deletion
-- ============================================
-- Invalidate unredeemed tickets when a user deletes their account.

CREATE OR REPLACE FUNCTION public.admin_cleanup_for_deletion(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party RECORD;
  v_challenge RECORD;
BEGIN
  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  FOR v_party IN
    SELECT id FROM public.parties
    WHERE creator_id = p_user_id AND status = 'active'
    FOR UPDATE
  LOOP
    FOR v_challenge IN
      SELECT pc.id FROM public.party_challenges pc
      WHERE pc.party_id = v_party.id AND pc.is_expired = false
      FOR UPDATE SKIP LOCKED
    LOOP
      INSERT INTO public.challenge_responses (challenge_id, user_id, completed)
      SELECT v_challenge.id, pp.user_id, false
      FROM public.party_participants pp
      WHERE pp.party_id = v_party.id
        AND pp.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM public.challenge_responses cr
          WHERE cr.challenge_id = v_challenge.id AND cr.user_id = pp.user_id
        )
      ON CONFLICT (challenge_id, user_id) DO NOTHING;

      UPDATE public.party_challenges SET is_expired = true WHERE id = v_challenge.id;
    END LOOP;

    -- Invalidate unredeemed offer tickets for parties being ended
    UPDATE public.offer_tickets
    SET is_redeemed = true, redeemed_at = now()
    WHERE party_id = v_party.id AND is_redeemed = false;

    UPDATE public.parties SET status = 'ended', ended_at = now() WHERE id = v_party.id;

    UPDATE public.party_participants SET is_active = false WHERE party_id = v_party.id;
  END LOOP;

  UPDATE public.party_participants SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;

  -- Invalidate any remaining unredeemed tickets owned by the deleted user
  UPDATE public.offer_tickets
  SET is_redeemed = true, redeemed_at = now()
  WHERE user_id = p_user_id AND is_redeemed = false;

  DELETE FROM public.push_tokens WHERE user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_cleanup_for_deletion(UUID) FROM authenticated, anon;

-- ============================================
-- 6. Enable Realtime for offer_tickets
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.offer_tickets;
