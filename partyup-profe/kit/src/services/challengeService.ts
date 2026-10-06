/**
 * PARTYUP Challenge Service
 * =========================
 * Party challenge management powered by Supabase.
 * Handles creation, responses (image/note/check), and realtime subscriptions.
 */

import { supabase } from '@/src/config/supabase';
import { createPartyEventGuard } from '@/src/services/realtimeGuard';
import {
  ChallengeResponse,
  ChallengeType,
  PartyChallenge,
} from '@/src/types';
import { File } from 'expo-file-system';
import { MAX_NOTE_LENGTH } from '@/src/services/noteService';

const BUCKET_NAME = 'party-photos';
const SIGNED_URL_EXPIRY = 604800; // 7 days

export const MAX_CHALLENGES_PER_PARTY = 3;
export const MAX_QUESTION_LENGTH = 50;

// ============================================
// HELPERS
// ============================================

function mapDbChallenge(row: Record<string, unknown>): PartyChallenge {
  return {
    id: row.id as string,
    partyId: row.party_id as string,
    creatorId: row.creator_id as string,
    type: row.type as ChallengeType,
    question: row.question as string,
    orderNumber: row.order_number as number,
    expiresAt: row.expires_at as string,
    isExpired: (row.is_expired as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

function mapDbResponse(row: Record<string, unknown>): ChallengeResponse {
  const users = row.users as Record<string, unknown> | undefined;
  return {
    id: row.id as string,
    challengeId: row.challenge_id as string,
    userId: row.user_id as string,
    userName: users?.display_name as string | undefined,
    userUsername: (users?.username as string) ?? undefined,
    userAvatarUrl: users?.avatar_url as string | undefined,
    storagePath: (row.storage_path as string) ?? undefined,
    imageUrl: (row.image_url as string) ?? undefined,
    noteContent: (row.note_content as string) ?? undefined,
    completed: (row.completed as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

// ============================================
// CREATE
// ============================================

/**
 * Creates a new challenge for a party via server-side RPC.
 * Validates Pro status, active party, and max 3 limit on the server.
 */
export async function createChallenge(
  partyId: string,
  type: ChallengeType,
  question: string,
): Promise<PartyChallenge> {
  if (question.length > MAX_QUESTION_LENGTH) {
    throw new Error(`Question exceeds maximum length of ${MAX_QUESTION_LENGTH} characters`);
  }

  const { data, error } = await supabase.rpc('create_challenge', {
    p_party_id: partyId,
    p_type: type,
    p_question: question,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Failed to create challenge');

  return mapDbChallenge(data as Record<string, unknown>);
}

// ============================================
// READ
// ============================================

/**
 * Gets all challenges for a party ordered by order_number
 */
export async function getChallengesByParty(
  partyId: string,
): Promise<PartyChallenge[]> {
  const { data, error } = await supabase
    .from('party_challenges')
    .select('*')
    .eq('party_id', partyId)
    .order('order_number', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapDbChallenge);
}

/**
 * Gets all responses for challenges in a party, including user info.
 * Refreshes signed URLs for image responses.
 */
export async function getResponsesByParty(
  partyId: string,
): Promise<ChallengeResponse[]> {
  const { data, error } = await supabase
    .from('challenge_responses')
    .select(`
      *,
      users:user_id(display_name, username, avatar_url),
      party_challenges!inner(party_id)
    `)
    .eq('party_challenges.party_id', partyId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const responses = (data ?? []).map(mapDbResponse);

  // Refresh signed URLs for image responses
  const imagePaths = responses
    .filter((r) => r.storagePath)
    .map((r) => r.storagePath!);

  if (imagePaths.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrls(imagePaths, SIGNED_URL_EXPIRY);

    if (signedUrls) {
      for (const signed of signedUrls) {
        if (signed.signedUrl) {
          const match = responses.find((r) => r.storagePath === signed.path);
          if (match) match.imageUrl = signed.signedUrl;
        }
      }
    }
  }

  return responses;
}

// ============================================
// SUBMIT RESPONSES
// ============================================

/**
 * Verifies a challenge has not expired before accepting a submission.
 * Throws if the challenge is already expired.
 */
async function assertChallengeNotExpired(challengeId: string): Promise<void> {
  const { data, error } = await supabase
    .from('party_challenges')
    .select('is_expired')
    .eq('id', challengeId)
    .single();

  if (error) throw new Error('Failed to verify challenge status');
  if (data?.is_expired) throw new Error('Challenge has expired');
}

/**
 * Submits an image response to a challenge.
 * Uploads the image to storage and creates the response record.
 */
export async function submitImageResponse(
  challengeId: string,
  partyId: string,
  imageUri: string,
): Promise<ChallengeResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await assertChallengeNotExpired(challengeId);

  const file = new File(imageUri);
  const arrayBuffer = await file.arrayBuffer();

  const fileExt = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;
  const storagePath = `${partyId}/challenges/${challengeId}/${user.id}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, arrayBuffer, { contentType, upsert: true });

  if (uploadError) throw uploadError;

  const { data: signedData, error: signError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (signError || !signedData?.signedUrl) {
    throw signError ?? new Error('Failed to create signed URL');
  }

  const { data: row, error: dbError } = await supabase
    .from('challenge_responses')
    .upsert(
      {
        challenge_id: challengeId,
        user_id: user.id,
        storage_path: storagePath,
        image_url: signedData.signedUrl,
        completed: true,
      },
      { onConflict: 'challenge_id,user_id' },
    )
    .select('*, users:user_id(display_name, username, avatar_url)')
    .single();

  if (dbError) throw dbError;
  return mapDbResponse(row);
}

/**
 * Submits a note response to a challenge.
 */
export async function submitNoteResponse(
  challengeId: string,
  content: string,
): Promise<ChallengeResponse> {
  if (content.length > MAX_NOTE_LENGTH) {
    throw new Error(`Note exceeds maximum length of ${MAX_NOTE_LENGTH} characters`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await assertChallengeNotExpired(challengeId);

  const { data: row, error } = await supabase
    .from('challenge_responses')
    .upsert(
      {
        challenge_id: challengeId,
        user_id: user.id,
        note_content: content,
        completed: true,
      },
      { onConflict: 'challenge_id,user_id' },
    )
    .select('*, users:user_id(display_name, username, avatar_url)')
    .single();

  if (error) throw error;
  return mapDbResponse(row);
}

/**
 * Submits a check (completion) response to a challenge.
 * Pass completed=false to mark as "not done".
 */
export async function submitCheckResponse(
  challengeId: string,
  completed: boolean = true,
): Promise<ChallengeResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await assertChallengeNotExpired(challengeId);

  const { data: row, error } = await supabase
    .from('challenge_responses')
    .upsert(
      {
        challenge_id: challengeId,
        user_id: user.id,
        completed,
      },
      { onConflict: 'challenge_id,user_id' },
    )
    .select('*, users:user_id(display_name, username, avatar_url)')
    .single();

  if (error) throw error;
  return mapDbResponse(row);
}

// ============================================
// REALTIME
// ============================================

/**
 * Subscribes to challenge changes in a party.
 * Refetches all challenges on any change event.
 */
export function subscribeToChallenges(
  partyId: string,
  callback: (challenges: PartyChallenge[]) => void,
): () => void {
  const channel = supabase
    .channel(`party-challenges:${partyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'party_challenges',
        filter: `party_id=eq.${partyId}`,
      },
      async () => {
        const challenges = await getChallengesByParty(partyId);
        callback(challenges);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to challenge response changes.
 * challenge_responses has no party_id column and Realtime cannot filter by
 * joined tables, so events are filtered on the client by challenge_id
 * (see realtimeGuard.ts) before refetching this party's responses.
 */
export function subscribeToChallengeResponses(
  partyId: string,
  callback: (responses: ChallengeResponse[]) => void,
): () => void {
  const isPartyEvent = createPartyEventGuard('challenge_id', async (challengeId) => {
    const { data, error } = await supabase
      .from('party_challenges')
      .select('id')
      .eq('id', challengeId)
      .eq('party_id', partyId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  });

  const channel = supabase
    .channel(`challenge-responses:${partyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'challenge_responses',
      },
      async (payload) => {
        if (!(await isPartyEvent(payload))) return;
        const responses = await getResponsesByParty(partyId);
        callback(responses);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
