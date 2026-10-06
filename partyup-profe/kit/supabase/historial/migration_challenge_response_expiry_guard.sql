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
