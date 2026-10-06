/**
 * PARTYUP Reaction Service
 * ========================
 * CRUD operations and realtime subscriptions for photo sticker reactions.
 * Backed by the `photo_reactions` and `challenge_photo_reactions` tables.
 */

import { supabase } from '@/src/config/supabase';
import { createPartyEventGuard } from '@/src/services/realtimeGuard';
import { ChallengePhotoReaction, PhotoReaction } from '@/src/types';

// ============================================
// HELPERS
// ============================================

function mapRow(row: Record<string, unknown>): PhotoReaction {
  return {
    id: row.id as string,
    mediaId: row.media_id as string,
    userId: row.user_id as string,
    stickerId: row.sticker_id as string,
    createdAt: row.created_at as string,
  };
}

function mapChallengeRow(row: Record<string, unknown>): ChallengePhotoReaction {
  return {
    id: row.id as string,
    mediaId: row.response_id as string,
    userId: row.user_id as string,
    stickerId: row.sticker_id as string,
    createdAt: row.created_at as string,
  };
}

// ============================================
// READ
// ============================================

/**
 * Fetches all reactions for every photo in a given party.
 */
export async function getReactionsByParty(partyId: string): Promise<PhotoReaction[]> {
  const { data, error } = await supabase
    .from('photo_reactions')
    .select('id, media_id, user_id, sticker_id, created_at, party_media!inner(party_id)')
    .eq('party_media.party_id', partyId);

  if (error) throw new Error(`Failed to fetch reactions: ${error.message}`);
  return (data ?? []).map(mapRow);
}

// ============================================
// WRITE
// ============================================

/**
 * Creates or updates a reaction on a photo. Each user gets exactly one
 * reaction per photo; calling again replaces the previous sticker.
 */
export async function upsertReaction(mediaId: string, stickerId: string): Promise<PhotoReaction> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('photo_reactions')
    .upsert(
      { media_id: mediaId, user_id: user.id, sticker_id: stickerId },
      { onConflict: 'media_id,user_id' },
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert reaction: ${error.message}`);
  return mapRow(data);
}

/**
 * Removes the current user's reaction from a photo.
 */
export async function removeReaction(mediaId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('photo_reactions')
    .delete()
    .eq('media_id', mediaId)
    .eq('user_id', user.id);

  if (error) throw new Error(`Failed to remove reaction: ${error.message}`);
}

// ============================================
// REALTIME
// ============================================

/**
 * Subscribes to reaction changes for a party's photos.
 * Calls `onUpdate` with the full refreshed list on every change.
 * Returns an unsubscribe function.
 */
export function subscribeToReactions(
  partyId: string,
  onUpdate: (reactions: PhotoReaction[]) => void,
): () => void {
  const isPartyEvent = createPartyEventGuard('media_id', async (mediaId) => {
    const { data, error } = await supabase
      .from('party_media')
      .select('id')
      .eq('id', mediaId)
      .eq('party_id', partyId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  });

  const channel = supabase
    .channel(`photo-reactions:${partyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'photo_reactions' },
      async (payload) => {
        // No party_id column on photo_reactions: filter on the client.
        if (!(await isPartyEvent(payload))) return;
        try {
          const reactions = await getReactionsByParty(partyId);
          onUpdate(reactions);
        } catch {
          // Silently ignore refetch errors; the next event will retry.
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================
// CHALLENGE PHOTO REACTIONS
// ============================================

/**
 * Fetches all reactions for challenge photos in a given party.
 */
export async function getChallengeReactionsByParty(partyId: string): Promise<ChallengePhotoReaction[]> {
  const { data, error } = await supabase
    .from('challenge_photo_reactions')
    .select('id, response_id, user_id, sticker_id, created_at, challenge_responses!inner(challenge_id, party_challenges!inner(party_id))')
    .eq('challenge_responses.party_challenges.party_id', partyId);

  if (error) throw new Error(`Failed to fetch challenge reactions: ${error.message}`);
  return (data ?? []).map(mapChallengeRow);
}

/**
 * Creates or updates a reaction on a challenge photo.
 */
export async function upsertChallengeReaction(responseId: string, stickerId: string): Promise<ChallengePhotoReaction> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('challenge_photo_reactions')
    .upsert(
      { response_id: responseId, user_id: user.id, sticker_id: stickerId },
      { onConflict: 'response_id,user_id' },
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert challenge reaction: ${error.message}`);
  return mapChallengeRow(data);
}

/**
 * Removes the current user's reaction from a challenge photo.
 */
export async function removeChallengeReaction(responseId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('challenge_photo_reactions')
    .delete()
    .eq('response_id', responseId)
    .eq('user_id', user.id);

  if (error) throw new Error(`Failed to remove challenge reaction: ${error.message}`);
}

/**
 * Subscribes to challenge photo reaction changes for a party.
 */
export function subscribeToChallengeReactions(
  partyId: string,
  onUpdate: (reactions: ChallengePhotoReaction[]) => void,
): () => void {
  const isPartyEvent = createPartyEventGuard('response_id', async (responseId) => {
    const { data, error } = await supabase
      .from('challenge_responses')
      .select('id, party_challenges!inner(party_id)')
      .eq('id', responseId)
      .eq('party_challenges.party_id', partyId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  });

  const channel = supabase
    .channel(`challenge-photo-reactions:${partyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'challenge_photo_reactions' },
      async (payload) => {
        // No party_id column on challenge_photo_reactions: filter on the client.
        if (!(await isPartyEvent(payload))) return;
        try {
          const reactions = await getChallengeReactionsByParty(partyId);
          onUpdate(reactions);
        } catch {
          // Silently ignore refetch errors; the next event will retry.
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
