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
