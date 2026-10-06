/**
 * PARTYUP Party Service
 * =====================
 * Party management powered by Supabase
 */

import { supabase } from '@/src/config/supabase';
import {
  DEFAULT_DRINKS,
  DrinkCount,
  DrinkType,
  Party,
  PartyParticipant,
} from '@/src/types';

// ============================================
// CONSTANTS
// ============================================

export const FREE_PARTY_MEMBER_LIMIT = 5;
export const MAX_DRINKS_PER_USER = 50;
export const PRO_PARTY_MEMBER_LIMIT = 15;

// ============================================
// HELPERS
// ============================================

/**
 * Generates a unique 6-character party code
 */
export function generatePartyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function mapDbParticipant(row: Record<string, unknown>): PartyParticipant {
  const users = row.users as Record<string, unknown> | undefined;
  return {
    id: row.id as string,
    partyId: row.party_id as string,
    userId: row.user_id as string,
    displayName: (users?.display_name as string) ?? 'Guest',
    username: (users?.username as string) ?? undefined,
    avatarUrl: users?.avatar_url as string | undefined,
    role: row.role as 'host' | 'member',
    drinks: (row.drinks as DrinkCount) ?? { ...DEFAULT_DRINKS },
    joinedAt: row.joined_at as string,
    isActive: row.is_active as boolean,
  };
}

function mapDbParty(row: Record<string, unknown>): Party {
  const rawParticipants = row.party_participants as Record<string, unknown>[] | undefined;
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    status: row.status as Party['status'],
    creatorId: row.creator_id as string,
    creatorIsPro: (row.creator_is_pro as boolean) ?? false,
    venueId: row.venue_id as string | undefined,
    participants: rawParticipants?.map(mapDbParticipant) ?? [],
    createdAt: row.created_at as string,
    endedAt: row.ended_at as string | undefined,
  };
}

// ============================================
// PARTY CRUD
// ============================================

/**
 * Creates a new party and adds the creator as host.
 * Optionally associates the party with a venue (nightclub/pub).
 * Rejects if the user is already in an active party (defense in depth).
 */
export async function createParty(name: string, venueId?: string): Promise<Party> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Prevent creating a party while already in one
  const existingParty = await getActiveParty();
  if (existingParty) {
    throw new Error('You are already in an active party');
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('is_premium')
    .eq('id', user.id)
    .single();

  const creatorIsPro = (userRow?.is_premium as boolean) ?? false;
  const code = generatePartyCode();

  const { data: partyRow, error: partyError } = await supabase
    .from('parties')
    .insert({
      name,
      code,
      creator_id: user.id,
      status: 'active',
      creator_is_pro: creatorIsPro,
      ...(venueId ? { venue_id: venueId } : {}),
    })
    .select('*')
    .single();

  if (partyError) throw partyError;

  const { data: participantRow, error: partError } = await supabase
    .from('party_participants')
    .insert({
      party_id: partyRow.id,
      user_id: user.id,
      role: 'host',
      drinks: { ...DEFAULT_DRINKS },
    })
    .select('*, users:user_id(display_name, avatar_url, username)')
    .single();

  if (partError) throw partError;

  return {
    ...mapDbParty(partyRow),
    participants: [mapDbParticipant(participantRow)],
  };
}

/**
 * Joins a party by its 6-character code.
 * Uses a SECURITY DEFINER RPC to bypass RLS, since the user is not yet
 * a participant and therefore cannot read the party row directly.
 * The RPC returns the full party with participants as JSONB within the
 * same transaction, avoiding a separate SELECT that could hang due to
 * connection pool propagation delays.
 */
export async function joinPartyByCode(code: string): Promise<Party> {
  const { data, error } = await supabase.rpc('join_party_by_code', {
    p_code: code.toUpperCase(),
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Failed to load party data');

  return mapDbParty(data as Record<string, unknown>);
}

/**
 * Leaves a party (marks participant as inactive)
 */
export async function leaveParty(partyId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('party_participants')
    .update({ is_active: false })
    .eq('party_id', partyId)
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * Ends a party and deactivates all participants atomically.
 * Only the party creator can call this.
 */
export async function endParty(partyId: string): Promise<void> {
  const { error } = await supabase.rpc('end_party_by_creator', {
    p_party_id: partyId,
  });

  if (error) throw new Error(error.message);
}

/**
 * Gets the user's currently active party
 */
export async function getActiveParty(): Promise<Party | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: participantRows } = await supabase
    .from('party_participants')
    .select('party_id')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (!participantRows?.length) return null;

  const partyIds = participantRows.map(r => r.party_id);

  const { data: partyRow } = await supabase
    .from('parties')
    .select('*, party_participants(*, users:user_id(display_name, avatar_url, username))')
    .in('id', partyIds)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!partyRow) return null;
  return mapDbParty(partyRow);
}

/**
 * Gets a single party by ID with all participants
 */
export async function getPartyById(partyId: string): Promise<Party | null> {
  const { data, error } = await supabase
    .from('parties')
    .select('*, party_participants(*, users:user_id(display_name, avatar_url, username))')
    .eq('id', partyId)
    .single();

  if (error || !data) return null;
  return mapDbParty(data);
}

/**
 * Options for paginated ended party queries
 */
export interface GetEndedPartiesOptions {
  limit?: number;
  offset?: number;
  /** ISO date string — only fetch parties created after this date */
  since?: string;
}

/**
 * Gets ended parties where the current user was a participant.
 * Supports pagination via limit/offset and date filtering via since.
 * Used by the calendar screen to display party history.
 */
export async function getEndedParties(
  options: GetEndedPartiesOptions = {},
): Promise<Party[]> {
  const { limit = 50, offset = 0, since } = options;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: participantRows } = await supabase
    .from('party_participants')
    .select('party_id')
    .eq('user_id', user.id);

  if (!participantRows?.length) return [];

  const partyIds = participantRows.map(r => r.party_id);

  let query = supabase
    .from('parties')
    .select('*, party_participants(*, users:user_id(display_name, avatar_url, username))')
    .in('id', partyIds)
    .eq('status', 'ended')
    .order('created_at', { ascending: false });

  if (since) {
    query = query.gte('created_at', since);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []).map(mapDbParty);
}

/**
 * Gets a random ended party from approximately one year ago (same week, +-3 days).
 * Used by the calendar grid to display an "On this Day" memory.
 * Returns null if no parties exist in that date range.
 */
export async function getMemoryParty(): Promise<Party | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const since = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() - 3);
  const until = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() + 4);

  const { data: participantRows } = await supabase
    .from('party_participants')
    .select('party_id')
    .eq('user_id', user.id);

  if (!participantRows?.length) return null;

  const partyIds = participantRows.map(r => r.party_id);

  const { data, error } = await supabase
    .from('parties')
    .select('*, party_participants(*, users:user_id(display_name, avatar_url, username))')
    .in('id', partyIds)
    .eq('status', 'ended')
    .gte('created_at', since.toISOString())
    .lte('created_at', until.toISOString())
    .order('created_at', { ascending: false });

  if (error || !data?.length) return null;

  const parties = data.map(mapDbParty);
  return parties[Math.floor(Math.random() * parties.length)];
}

// ============================================
// PRO PARTY HELPERS
// ============================================

/**
 * Determines whether the current user can upload photos to a party.
 * Photos are available when the party creator is Pro OR the user is Pro.
 */
export function canUploadPhotos(
  party: Party,
  currentUserIsPro: boolean,
): boolean {
  return party.creatorIsPro || currentUserIsPro;
}

// ============================================
// DRINKS
// ============================================

/**
 * Atomically increments a drink count via server-side RPC.
 * Returns the authoritative drink counts after the operation.
 */
export async function addDrink(
  partyId: string,
  drinkType: DrinkType,
): Promise<DrinkCount> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('increment_drink', {
    p_party_id: partyId,
    p_user_id: user.id,
    p_drink_type: drinkType,
  });

  if (error) throw error;
  return data as DrinkCount;
}

/**
 * Atomically decrements a drink count via server-side RPC.
 * Returns the authoritative drink counts after the operation.
 */
export async function removeDrink(
  partyId: string,
  drinkType: DrinkType,
): Promise<DrinkCount> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('decrement_drink', {
    p_party_id: partyId,
    p_user_id: user.id,
    p_drink_type: drinkType,
  });

  if (error) throw error;
  return data as DrinkCount;
}

// ============================================
// REALTIME
// ============================================

/**
 * Subscribes to real-time changes for a party.
 * Listens to participant INSERT/UPDATE/DELETE and party status changes.
 */
export function subscribeToParty(
  partyId: string,
  callbacks: {
    onParticipantChange?: (participants: PartyParticipant[]) => void;
    onPartyUpdate?: (party: Partial<Party>) => void;
  },
): () => void {
  const channel = supabase
    .channel(`party:${partyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'party_participants',
        filter: `party_id=eq.${partyId}`,
      },
      async (payload) => {
        if (__DEV__) {
          console.log('[Realtime] party_participants event:', payload.eventType);
        }
        if (callbacks.onParticipantChange) {
          const { data, error } = await supabase
            .from('party_participants')
            .select('*, users:user_id(display_name, avatar_url, username)')
            .eq('party_id', partyId);
          if (error) {
            console.warn('[Realtime] Failed to re-fetch participants:', error.message);
            return;
          }
          if (data) {
            callbacks.onParticipantChange(data.map(mapDbParticipant));
          }
        }
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'parties',
        filter: `id=eq.${partyId}`,
      },
      (payload) => {
        if (__DEV__) {
          console.log('[Realtime] parties event:', payload.eventType, payload.new);
        }
        if (callbacks.onPartyUpdate) {
          callbacks.onPartyUpdate({
            status: payload.new.status,
            endedAt: payload.new.ended_at,
          });
        }
      },
    )
    .subscribe((status) => {
      if (__DEV__) {
        console.log('[Realtime] Subscription status:', status);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

