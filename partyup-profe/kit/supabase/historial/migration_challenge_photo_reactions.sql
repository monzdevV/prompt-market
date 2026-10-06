-- ============================================
-- Migration: Challenge Photo Reactions
-- ============================================
-- Mirrors the photo_reactions system for challenge response images.
-- Uses the same sticker-based reaction model with one reaction per user
-- per challenge response.

CREATE TABLE IF NOT EXISTS public.challenge_photo_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES public.challenge_responses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  sticker_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(response_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_photo_reactions_response
  ON public.challenge_photo_reactions(response_id);

-- Full replica identity for realtime
ALTER TABLE public.challenge_photo_reactions REPLICA IDENTITY FULL;

-- Enable RLS
ALTER TABLE public.challenge_photo_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Read: party participants can view reactions for challenge photos in their parties
CREATE POLICY "Participants can view challenge photo reactions"
  ON public.challenge_photo_reactions FOR SELECT
  USING (
    response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      WHERE pc.party_id IN (SELECT public.user_party_ids())
    )
  );

-- Insert: authenticated users can react to challenge photos in active parties
CREATE POLICY "Participants can add challenge photo reactions"
  ON public.challenge_photo_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      JOIN public.parties p ON p.id = pc.party_id
      WHERE p.status = 'active'
    )
  );

-- Update: users can change their own reaction
CREATE POLICY "Users can update own challenge photo reactions"
  ON public.challenge_photo_reactions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      JOIN public.parties p ON p.id = pc.party_id
      WHERE p.status = 'active'
    )
  );

-- Delete: users can remove their own reaction
CREATE POLICY "Users can delete own challenge photo reactions"
  ON public.challenge_photo_reactions FOR DELETE
  USING (
    auth.uid() = user_id
    AND response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      JOIN public.parties p ON p.id = pc.party_id
      WHERE p.status = 'active'
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_photo_reactions;
