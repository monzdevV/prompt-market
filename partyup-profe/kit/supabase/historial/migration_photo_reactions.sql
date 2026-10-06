-- ============================================
-- Migration: Photo Reactions (Stickers)
-- ============================================
-- Allows party participants to react to photos with stickers.
-- Each user can place one reaction per photo (upsert to change).
-- Reactions are anonymous in the UI but tracked by user_id for uniqueness.
-- Reactions are immutable once the party has ended.

-- Table
CREATE TABLE IF NOT EXISTS public.photo_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES public.party_media(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  sticker_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(media_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_photo_reactions_media ON public.photo_reactions(media_id);

-- Full replica identity for realtime
ALTER TABLE public.photo_reactions REPLICA IDENTITY FULL;

-- Enable RLS
ALTER TABLE public.photo_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Read: party participants can view reactions for photos in their parties
CREATE POLICY "Participants can view photo reactions"
  ON public.photo_reactions FOR SELECT
  USING (
    media_id IN (
      SELECT pm.id FROM public.party_media pm
      WHERE pm.party_id IN (SELECT public.user_party_ids())
    )
  );

-- Insert: authenticated users who are participants of an ACTIVE party
CREATE POLICY "Participants can react to photos in active parties"
  ON public.photo_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND media_id IN (
      SELECT pm.id FROM public.party_media pm
      JOIN public.parties p ON p.id = pm.party_id
      WHERE pm.party_id IN (SELECT public.user_party_ids())
        AND p.status = 'active'
    )
  );

-- Update: only own reactions in active parties
CREATE POLICY "Users can update own reactions in active parties"
  ON public.photo_reactions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND media_id IN (
      SELECT pm.id FROM public.party_media pm
      JOIN public.parties p ON p.id = pm.party_id
      WHERE p.status = 'active'
    )
  );

-- Delete: only own reactions in active parties
CREATE POLICY "Users can remove own reactions in active parties"
  ON public.photo_reactions FOR DELETE
  USING (
    auth.uid() = user_id
    AND media_id IN (
      SELECT pm.id FROM public.party_media pm
      JOIN public.parties p ON p.id = pm.party_id
      WHERE p.status = 'active'
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.photo_reactions;
