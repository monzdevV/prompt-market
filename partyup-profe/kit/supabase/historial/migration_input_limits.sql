-- ============================================
-- Migration: Input length limits
-- ============================================
-- Enforces maximum lengths at the database level:
--   - party_challenges.question: 50 characters
--   - challenge_responses.note_content: 1000 characters
--   - party_notes.content: 1000 characters
-- Also updates create_challenge RPC to validate question length.

-- ============================================
-- TABLE CONSTRAINTS
-- ============================================

ALTER TABLE public.party_challenges
  ADD CONSTRAINT chk_question_length CHECK (char_length(question) <= 50);

ALTER TABLE public.challenge_responses
  ADD CONSTRAINT chk_note_content_length CHECK (note_content IS NULL OR char_length(note_content) <= 1000);

ALTER TABLE public.party_notes
  ADD CONSTRAINT chk_party_note_length CHECK (char_length(content) <= 1000);

-- ============================================
-- UPDATE create_challenge RPC
-- ============================================
-- Adds question length validation before the insert.

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
  IF char_length(p_question) > 50 THEN
    RAISE EXCEPTION 'Question exceeds maximum length of 50 characters';
  END IF;

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
