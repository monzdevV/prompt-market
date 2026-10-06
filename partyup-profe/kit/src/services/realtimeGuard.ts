/**
 * Realtime party guard
 * ====================
 * Supabase Realtime can only filter `postgres_changes` by a column of the
 * table itself. `photo_reactions`, `challenge_responses` and
 * `challenge_photo_reactions` have no `party_id` column (they hang from
 * party_media / party_challenges / challenge_responses), so their channels
 * cannot use `filter: party_id=eq.<id>`.
 *
 * Instead, each event is checked on the client: the row's parent id
 * (media_id, challenge_id or response_id) is resolved once against the
 * party and the answer is cached. Events from other parties are ignored,
 * so a change in one party no longer triggers refetches in another.
 */

import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Row = Record<string, unknown>;

/**
 * Returns an async predicate that tells whether a realtime payload belongs to
 * the party. `parentKey` is the foreign key column in the changed row and
 * `belongsToParty` resolves an unknown parent id (one query, then cached).
 */
export function createPartyEventGuard(
  parentKey: string,
  belongsToParty: (parentId: string) => Promise<boolean>,
): (payload: RealtimePostgresChangesPayload<Row>) => Promise<boolean> {
  const cache = new Map<string, boolean>();

  return async (payload) => {
    const newRow = payload.new as Row | undefined;
    const oldRow = payload.old as Row | undefined;
    const parentId = (newRow?.[parentKey] ?? oldRow?.[parentKey]) as string | undefined;

    // DELETE without REPLICA IDENTITY FULL only carries the primary key:
    // we can't tell the party, so refetch to stay correct.
    if (!parentId) return true;

    const cached = cache.get(parentId);
    if (cached !== undefined) return cached;

    try {
      const result = await belongsToParty(parentId);
      cache.set(parentId, result);
      return result;
    } catch {
      // On a lookup error, prefer an extra refetch over a missed update.
      return true;
    }
  };
}
