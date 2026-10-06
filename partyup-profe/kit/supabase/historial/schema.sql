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
