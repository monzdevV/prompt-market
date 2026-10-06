/**
 * PARTYUP Media Service
 * =====================
 * Photo upload/download powered by Supabase Storage
 */

import { supabase } from '@/src/config/supabase';
import { PartyMedia } from '@/src/types';
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const BUCKET_NAME = 'party-photos';
const SIGNED_URL_EXPIRY = 604800; // 7 days in seconds

// ============================================
// UPLOAD
// ============================================

/**
 * Uploads a photo to the party. One photo per user per party.
 */
export async function uploadPhoto(
  partyId: string,
  imageUri: string,
): Promise<PartyMedia> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Read file as ArrayBuffer using the modern File API
  const file = new File(imageUri);
  const arrayBuffer = await file.arrayBuffer();

  const fileExt = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;
  const storagePath = `${partyId}/${user.id}.${fileExt}`;

  // Upload to storage (upsert to allow replacing)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  // Generate signed URL for private bucket access
  const { data: signedData, error: signError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (signError || !signedData?.signedUrl) throw signError ?? new Error('Failed to create signed URL');

  // Upsert media record (one photo per user per party)
  const { data: mediaRow, error: dbError } = await supabase
    .from('party_media')
    .upsert(
      {
        party_id: partyId,
        uploader_id: user.id,
        storage_path: storagePath,
        url: signedData.signedUrl,
      },
      { onConflict: 'party_id,uploader_id' },
    )
    .select()
    .single();

  if (dbError) throw dbError;

  return mapDbMedia(mediaRow);
}

// ============================================
// READ
// ============================================

/**
 * Gets all photos for a party
 */
export async function getPartyPhotos(partyId: string): Promise<PartyMedia[]> {
  const { data, error } = await supabase
    .from('party_media')
    .select('*, users:uploader_id(display_name, username, avatar_url)')
    .eq('party_id', partyId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  const photos = (data ?? []).map(mapDbMedia);

  // Generate fresh signed URLs for all photos (stored URLs may have expired)
  const paths = photos.map(p => p.storagePath);
  if (paths.length === 0) return photos;

  const { data: signedUrls } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrls(paths, SIGNED_URL_EXPIRY);

  if (signedUrls) {
    for (const signed of signedUrls) {
      if (signed.signedUrl) {
        const match = photos.find(p => p.storagePath === signed.path);
        if (match) match.url = signed.signedUrl;
      }
    }
  }

  return photos;
}

// ============================================
// DELETE
// ============================================

/**
 * Deletes the current user's photo from a party
 */
export async function deleteMyPhoto(partyId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Find the media record
  const { data: mediaRow } = await supabase
    .from('party_media')
    .select('storage_path')
    .eq('party_id', partyId)
    .eq('uploader_id', user.id)
    .single();

  if (mediaRow?.storage_path) {
    await supabase.storage.from(BUCKET_NAME).remove([mediaRow.storage_path]);
  }

  await supabase
    .from('party_media')
    .delete()
    .eq('party_id', partyId)
    .eq('uploader_id', user.id);
}

// ============================================
// DOWNLOAD TO DEVICE
// ============================================

/**
 * Downloads photos to the device's media library
 */
export async function downloadPhotosToLibrary(
  photoUrls: string[],
): Promise<number> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Media library permission not granted');
  }

  // Create temp directory for downloads
  const tempDir = new Directory(Paths.cache, 'photo-downloads');
  if (!tempDir.exists) tempDir.create();

  let savedCount = 0;

  for (const url of photoUrls) {
    try {
      // Download to local temp file first (signed URLs require this)
      const downloaded = await File.downloadFileAsync(url, tempDir);
      const asset = await MediaLibrary.createAssetAsync(downloaded.uri);
      if (asset) savedCount++;
      downloaded.delete();
    } catch {
      // Skip individual failures, continue with the rest
      console.warn(`Failed to save photo: ${url}`);
    }
  }

  return savedCount;
}

// ============================================
// REALTIME
// ============================================

/**
 * Subscribes to photo changes in a party
 */
export function subscribeToPhotos(
  partyId: string,
  callback: (photos: PartyMedia[]) => void,
): () => void {
  const channel = supabase
    .channel(`party-media:${partyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'party_media',
        filter: `party_id=eq.${partyId}`,
      },
      async () => {
        const photos = await getPartyPhotos(partyId);
        callback(photos);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================
// HELPERS
// ============================================

function mapDbMedia(row: Record<string, unknown>): PartyMedia {
  const users = row.users as Record<string, unknown> | undefined;
  return {
    id: row.id as string,
    partyId: row.party_id as string,
    uploaderId: row.uploader_id as string,
    uploaderName: users?.display_name as string | undefined,
    uploaderUsername: (users?.username as string) ?? undefined,
    uploaderAvatarUrl: users?.avatar_url as string | undefined,
    storagePath: row.storage_path as string,
    url: row.url as string,
    createdAt: row.created_at as string,
  };
}
