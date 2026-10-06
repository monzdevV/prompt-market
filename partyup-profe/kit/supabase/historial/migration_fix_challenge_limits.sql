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
