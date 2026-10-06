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
