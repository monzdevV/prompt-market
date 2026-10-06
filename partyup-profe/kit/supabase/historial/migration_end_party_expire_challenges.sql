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
