-- ============================================
-- Migration: Fix storage bucket RLS policies
-- ============================================
-- Current policies only check auth.uid() IS NOT NULL,
-- allowing any authenticated user to access any party's photos.
-- This migration restricts access to party participants only.

-- Helper: extract party_id from storage path (format: "{partyId}/{userId}.{ext}")
CREATE OR REPLACE FUNCTION public.extract_party_id_from_path(path TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT (string_to_array(path, '/'))[1]::UUID;
$$;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Participants can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Participants can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

-- INSERT: only party participants can upload to their party's folder
CREATE POLICY "Participants can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'party-photos'
    AND auth.uid() IS NOT NULL
    AND public.extract_party_id_from_path(name) IN (SELECT public.user_party_ids())
  );

-- SELECT: only party participants can view their party's photos
CREATE POLICY "Participants can view photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'party-photos'
    AND auth.uid() IS NOT NULL
    AND public.extract_party_id_from_path(name) IN (SELECT public.user_party_ids())
  );

-- DELETE: only the uploader can delete their own photo
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'party-photos'
    AND auth.uid() IS NOT NULL
    AND public.extract_party_id_from_path(name) IN (SELECT public.user_party_ids())
    AND (string_to_array(name, '/'))[2] LIKE auth.uid()::TEXT || '.%'
  );
