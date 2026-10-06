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
