/**
 * PARTYUP Prefetch Service
 * ========================
 * Centralised data prefetching invoked after login or session restoration.
 * Loads ALL data the app needs before hiding the loading screen so every
 * tab renders instantly with no progressive loading.
 *
 * Every network call is wrapped with retry logic (exponential backoff).
 * If the critical user profile call fails after all retries, the result
 * includes `networkFailed: true` so the caller can show a connection error
 * screen instead of opening the app with incomplete data.
 *
 * Called from:
 *  - LoginScreen (fresh sign-in)
 *  - AuthGuard   (session restoration on cold start)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerInfo } from 'react-native-purchases';

import { getCurrentUser, refreshOwnAvatarUrl } from '@/src/services/authService';
import { getPartyPhotos } from '@/src/services/mediaService';
import { getPartyNotes } from '@/src/services/noteService';
import {
  getActiveParty,
  getEndedParties,
  getPartyById,
} from '@/src/services/partyService';
import { getReactionsByParty } from '@/src/services/reactionService';
import {
  hasProEntitlement,
  loginUser,
} from '@/src/services/subscriptionService';
import { Party, PartyMedia, PartyNote, PhotoReaction, User } from '@/src/types';

// ============================================
// CACHE KEYS (shared with CalendarScreen)
// ============================================

export const CACHE_KEY_PARTIES = '@beparty/ended-parties';

// ============================================
// RETRY UTILITY
// ============================================

const NETWORK_ERROR_PATTERNS = ['network', 'fetch', 'timeout', 'aborted', 'ECONNREFUSED'];

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return NETWORK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * Retries an async function with exponential backoff.
 * Only retries on network-level errors; logic/auth errors are thrown immediately.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isNetworkError(error) || attempt === maxAttempts - 1) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// ============================================
// RESULT TYPE
// ============================================

export interface PrefetchResult {
  user: User | null;
  isPremium: boolean;
  needsUsername: boolean;
  customerInfo: CustomerInfo | null;

  party: Party | null;
  partyPhotos: PartyMedia[];
  partyNotes: PartyNote[];
  partyReactions: PhotoReaction[];

  endedParties: Party[];

  /** True when the critical user profile call failed after all retries. */
  networkFailed: boolean;
}

// ============================================
// MAIN PREFETCH
// ============================================

/**
 * Loads every piece of data the app needs in parallel.
 * Each call uses retry with exponential backoff. If the user profile
 * cannot be loaded after all retries, `networkFailed` is set to `true`
 * so the AuthGuard can block the app from opening with incomplete data.
 */
export async function prefetchAppData(userId: string): Promise<PrefetchResult> {
  console.log('[Prefetch] Starting full data prefetch for user:', userId);
  const startTime = Date.now();
  let networkFailed = false;

  // Phase 1: core data in parallel
  const [user, party, customerInfo, endedParties] = await Promise.all([
    withRetry(() => getCurrentUser())
      .then((u) => (u ? refreshOwnAvatarUrl(u) : u))
      .catch((err) => {
        console.warn('[Prefetch] Failed to fetch user after retries:', err);
        if (isNetworkError(err)) networkFailed = true;
        return null;
      }),
    withRetry(() => getActiveParty()).catch((err) => {
      console.warn('[Prefetch] Failed to fetch active party:', err);
      return null;
    }),
    withRetry(() => loginUser(userId)).catch((err) => {
      console.warn('[Prefetch] Failed to login to RevenueCat:', err);
      return null;
    }),
    fetchEndedParties(),
  ]);

  console.log('[Prefetch] Phase 1 complete:', {
    user: !!user,
    party: !!party,
    customerInfo: !!customerInfo,
    endedParties: endedParties.length,
    networkFailed,
    elapsed: Date.now() - startTime,
  });

  if (networkFailed) {
    return emptyResult(networkFailed);
  }

  const revenueCatPro = customerInfo ? hasProEntitlement(customerInfo) : false;
  const isPremium = (user?.isPremium ?? false) || revenueCatPro;
  const needsUsername = user ? !user.username : true;

  // Phase 2: if an active party exists, load its room data in parallel
  let freshParty = party;
  let partyPhotos: PartyMedia[] = [];
  let partyNotes: PartyNote[] = [];
  let partyReactions: PhotoReaction[] = [];

  if (party) {
    const [photos, notes, reactions, refreshed] = await Promise.all([
      withRetry(() => getPartyPhotos(party.id)).catch((err) => {
        console.warn('[Prefetch] Failed to fetch party photos:', err);
        return [] as PartyMedia[];
      }),
      withRetry(() => getPartyNotes(party.id)).catch((err) => {
        console.warn('[Prefetch] Failed to fetch party notes:', err);
        return [] as PartyNote[];
      }),
      withRetry(() => getReactionsByParty(party.id)).catch((err) => {
        console.warn('[Prefetch] Failed to fetch reactions:', err);
        return [] as PhotoReaction[];
      }),
      withRetry(() => getPartyById(party.id)).catch((err) => {
        console.warn('[Prefetch] Failed to refresh party data:', err);
        return null;
      }),
    ]);

    partyPhotos = photos;
    partyNotes = notes;
    partyReactions = reactions;

    if (refreshed) {
      freshParty = refreshed;
    }

    console.log('[Prefetch] Phase 2 complete (party room):', {
      photos: photos.length,
      notes: notes.length,
      reactions: reactions.length,
      elapsed: Date.now() - startTime,
    });
  }

  console.log('[Prefetch] All data ready in', Date.now() - startTime, 'ms');

  return {
    user,
    isPremium,
    needsUsername,
    customerInfo,
    party: freshParty,
    partyPhotos,
    partyNotes,
    partyReactions,
    endedParties,
    networkFailed: false,
  };
}

// ============================================
// HELPERS
// ============================================

function emptyResult(networkFailed: boolean): PrefetchResult {
  return {
    user: null,
    isPremium: false,
    needsUsername: true,
    customerInfo: null,
    party: null,
    partyPhotos: [],
    partyNotes: [],
    partyReactions: [],
    endedParties: [],
    networkFailed,
  };
}

/**
 * Fetches ended parties for the last 12 months and persists them
 * to AsyncStorage so CalendarScreen renders instantly.
 */
async function fetchEndedParties(): Promise<Party[]> {
  try {
    const since = new Date();
    since.setMonth(since.getMonth() - 12);

    const parties = await withRetry(() =>
      getEndedParties({ limit: 50, since: since.toISOString() }),
    );

    AsyncStorage.setItem(CACHE_KEY_PARTIES, JSON.stringify(parties)).catch(() => {});

    return parties;
  } catch (err) {
    console.warn('[Prefetch] Failed to fetch ended parties:', err);
    return [];
  }
}
