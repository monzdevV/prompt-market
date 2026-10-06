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
