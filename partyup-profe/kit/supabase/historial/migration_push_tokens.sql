-- ============================================
-- Migration: Push notification tokens
-- ============================================
-- Stores Expo push tokens for sending native notifications.
-- Each device registers its token; a user may have multiple devices.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tokens"
  ON public.push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON public.push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON public.push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON public.push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Notification trigger
-- ============================================
-- Push notifications are handled via a Supabase Database Webhook
-- configured in the dashboard (Database > Webhooks):
--   Name:   notify-party-join
--   Table:  party_participants
--   Events: INSERT, UPDATE
--   Type:   Supabase Edge Functions -> notify-party-join
--
-- The Edge Function filters UPDATE events to only process rejoins
-- (is_active changing from false to true). All other updates
-- (drinks, role changes) are ignored by the function.
