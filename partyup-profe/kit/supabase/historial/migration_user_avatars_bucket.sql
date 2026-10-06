-- ============================================
-- Migration: User Avatars Storage Bucket
-- ============================================
-- Creates a private storage bucket for user profile photos.
-- Path format: {userId}.{ext} (e.g., "abc-123-uuid.jpg")
-- Only the file owner can upload/update/delete their own avatar.
-- Any authenticated user can view avatars.

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (string_to_array(name, '.'))[1]
  );

-- Users can update (overwrite) their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (string_to_array(name, '.'))[1]
  );

-- Any authenticated user can view avatars
CREATE POLICY "Authenticated users can view avatars"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-avatars'
    AND auth.role() = 'authenticated'
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (string_to_array(name, '.'))[1]
  );
