-- ============================================
-- Migration: Account deletion support
-- ============================================
-- Changes the FK from public.users to auth.users so that deleting
-- from auth.users does NOT cascade-delete the public.users row.
-- This allows the anonymized "tombstone" row to remain, preserving
-- referential integrity with party_participants, party_media, etc.
--
-- The actual deletion is handled by the delete-account Edge Function:
-- 1. Anonymizes the public.users row (removes all PII)
-- 2. Deletes from auth.users via admin API
-- 3. The public.users tombstone row stays with display_name = 'Deleted User'

-- Step 1: Drop the existing FK with CASCADE
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Step 2: Re-add the FK without CASCADE
-- The primary key constraint remains; we only change the FK behavior.
ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id)
  ON DELETE NO ACTION;

-- Step 3: RPC to anonymize user data (called by the Edge Function)
CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
  SET
    display_name = 'Deleted User',
    email = 'deleted-' || p_user_id::TEXT || '@removed.local',
    avatar_url = NULL,
    username = NULL,
    provider = NULL,
    is_premium = false,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;
