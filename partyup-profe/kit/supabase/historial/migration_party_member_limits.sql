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
