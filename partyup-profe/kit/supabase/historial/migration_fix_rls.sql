-- ============================================
-- Migration: Fix RLS recursion on party_participants
-- ============================================
-- Run this in the Supabase SQL Editor to fix the
-- "infinite recursion detected in policy for relation party_participants" error.

-- Step 1: Create helper function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_party_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT party_id FROM public.party_participants WHERE user_id = auth.uid();
$$;

-- Step 2: Drop the recursive policy
DROP POLICY IF EXISTS "Participants can read party members" ON public.party_participants;

-- Step 3: Recreate using the helper function
CREATE POLICY "Participants can read party members"
  ON public.party_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR party_id IN (SELECT public.user_party_ids())
  );

-- Step 4: Update other policies that had EXISTS subqueries on party_participants
DROP POLICY IF EXISTS "Participants can read their parties" ON public.parties;
CREATE POLICY "Participants can read their parties"
  ON public.parties FOR SELECT
  USING (
    creator_id = auth.uid()
    OR id IN (SELECT public.user_party_ids())
  );

DROP POLICY IF EXISTS "Participants can view party media" ON public.party_media;
CREATE POLICY "Participants can view party media"
  ON public.party_media FOR SELECT
  USING (party_id IN (SELECT public.user_party_ids()));

DROP POLICY IF EXISTS "Participants can view party notes" ON public.party_notes;
CREATE POLICY "Participants can view party notes"
  ON public.party_notes FOR SELECT
  USING (party_id IN (SELECT public.user_party_ids()));

DROP POLICY IF EXISTS "Participants can view drink events" ON public.drink_events;
CREATE POLICY "Participants can view drink events"
  ON public.drink_events FOR SELECT
  USING (party_id IN (SELECT public.user_party_ids()));
