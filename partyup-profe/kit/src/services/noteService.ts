/**
 * PARTYUP Note Service
 * ====================
 * Party notes powered by Supabase (one note per user per party)
 */

import { supabase } from '@/src/config/supabase';
import { PartyNote } from '@/src/types';

// ============================================
// CONSTANTS
// ============================================

export const MAX_NOTE_LENGTH = 1000;

// ============================================
// SAVE / UPDATE
// ============================================

/**
 * Creates or updates the current user's note for a party.
 * Each user can have exactly one note per party.
 */
export async function saveNote(
  partyId: string,
  content: string,
): Promise<PartyNote> {
  if (content.length > MAX_NOTE_LENGTH) {
    throw new Error(`Note exceeds maximum length of ${MAX_NOTE_LENGTH} characters`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('party_notes')
    .upsert(
      {
        party_id: partyId,
        author_id: user.id,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'party_id,author_id' },
    )
    .select('*, users:author_id(display_name, username, avatar_url)')
    .single();

  if (error) throw error;
  return mapDbNote(data);
}

// ============================================
// READ
// ============================================

/**
 * Gets all notes for a party with author names
 */
export async function getPartyNotes(partyId: string): Promise<PartyNote[]> {
  const { data, error } = await supabase
    .from('party_notes')
    .select('*, users:author_id(display_name, username, avatar_url)')
    .eq('party_id', partyId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapDbNote);
}

/**
 * Gets the current user's note for a party
 */
export async function getMyNote(partyId: string): Promise<PartyNote | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('party_notes')
    .select('*, users:author_id(display_name, username, avatar_url)')
    .eq('party_id', partyId)
    .eq('author_id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapDbNote(data);
}

/**
 * Gets a single note by ID with author name
 */
export async function getNoteById(noteId: string): Promise<PartyNote | null> {
  const { data, error } = await supabase
    .from('party_notes')
    .select('*, users:author_id(display_name, username, avatar_url)')
    .eq('id', noteId)
    .single();

  if (error) throw error;
  if (!data) return null;
  return mapDbNote(data);
}

// ============================================
// DELETE
// ============================================

/**
 * Deletes the current user's note from a party
 */
export async function deleteMyNote(partyId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('party_notes')
    .delete()
    .eq('party_id', partyId)
    .eq('author_id', user.id);

  if (error) throw error;
}

// ============================================
// REALTIME
// ============================================

/**
 * Subscribes to note changes in a party
 */
export function subscribeToNotes(
  partyId: string,
  callback: (notes: PartyNote[]) => void,
): () => void {
  const channel = supabase
    .channel(`party-notes:${partyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'party_notes',
        filter: `party_id=eq.${partyId}`,
      },
      async () => {
        const notes = await getPartyNotes(partyId);
        callback(notes);
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

function mapDbNote(row: Record<string, unknown>): PartyNote {
  const users = row.users as Record<string, unknown> | undefined;
  return {
    id: row.id as string,
    partyId: row.party_id as string,
    authorId: row.author_id as string,
    authorName: users?.display_name as string | undefined,
    authorUsername: (users?.username as string) ?? undefined,
    authorAvatarUrl: users?.avatar_url as string | undefined,
    content: row.content as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
