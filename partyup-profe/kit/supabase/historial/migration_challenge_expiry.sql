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
