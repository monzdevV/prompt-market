/**
 * PARTYUP Auth Service
 * ====================
 * Authentication via Supabase with Apple and Google providers.
 * Sign-in functions return a full AuthResult so the caller can
 * hydrate the entire app state in one shot (user, party, premium).
 */

import { supabase } from '@/src/config/supabase';
import {
  AVATAR_BUCKET,
  AVATAR_URL_EXPIRY,
  getAvatarStoragePath,
  isAvatarUrlFresh,
  signAvatarPath,
} from '@/src/services/avatarUrlService';
import { removePushTokens } from '@/src/services/notificationService';
import { Party, User } from '@/src/types';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';

// ============================================
// AUTH RESULT
// ============================================

/**
 * Complete result returned by sign-in functions. Contains every piece
 * of data the app needs to fully initialise after authentication.
 */
export interface AuthResult {
  user: User;
  activeParty: Party | null;
  customerInfo: CustomerInfo | null;
  needsUsername: boolean;
}

// ============================================
// LOGIN-IN-PROGRESS FLAG
// ============================================

/**
 * Module-level flag used to coordinate between LoginScreen and AuthGuard.
 * When true, the AuthGuard restoration effect skips its work because
 * LoginScreen is responsible for fetching all post-auth data.
 */
let _loginInProgress = false;

export function setLoginInProgress(value: boolean): void {
  _loginInProgress = value;
}

export function isLoginInProgress(): boolean {
  return _loginInProgress;
}

// ============================================
// APPLE SIGN IN (iOS only)
// ============================================

export async function signInWithApple(): Promise<AuthResult> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign In is only available on iOS');
  }

  console.log('[Auth] Starting Apple Sign In...');

  const response = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
  });

  if (!response.identityToken || !response.authorizationCode) {
    throw new Error('No identity token received from Apple');
  }

  console.log('[Auth] Apple credential received, exchanging with Supabase...');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: response.identityToken,
    nonce: response.nonce,
    access_token: response.authorizationCode,
  });

  if (error) {
    console.error('[Auth] Supabase signInWithIdToken failed:', error.message);
    throw error;
  }
  if (!data.user) throw new Error('No user returned from Supabase');

  console.log('[Auth] Supabase auth successful, user:', data.user.id);

  // Apple only provides the full name on first sign-in
  const fullName = response.fullName
    ? `${response.fullName.givenName ?? ''} ${response.fullName.familyName ?? ''}`.trim()
    : undefined;

  if (fullName) {
    await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        given_name: response.fullName?.givenName,
        family_name: response.fullName?.familyName,
      },
    });
  }

  // Upsert profile (non-blocking for auth result)
  try {
    await upsertUserProfile(data.user.id, {
      email: data.user.email ?? '',
      displayName: fullName || data.user.email?.split('@')[0] || 'User',
      avatarUrl: data.user.user_metadata?.avatar_url,
      provider: 'apple',
    });
  } catch (profileError) {
    console.warn('[Auth] Failed to upsert user profile:', profileError);
  }

  // Session is now established; fetch all post-auth data in parallel
  return fetchPostAuthData(data.user.id);
}

// ============================================
// GOOGLE SIGN IN
// ============================================

export async function signInWithGoogle(): Promise<AuthResult> {
  // Dynamic import to avoid crashes on platforms where the module
  // may not be available at import time
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

  GoogleSignin.configure({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  if (!response.data?.idToken) {
    throw new Error('No ID token received from Google');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: response.data.idToken,
  });

  if (error) throw error;
  if (!data.user) throw new Error('No user returned from Supabase');

  // Upsert profile (non-blocking for auth result)
  try {
    await upsertUserProfile(data.user.id, {
      email: data.user.email ?? '',
      displayName: data.user.user_metadata?.full_name
        || data.user.user_metadata?.name
        || data.user.email?.split('@')[0]
        || 'User',
      avatarUrl: data.user.user_metadata?.avatar_url
        || data.user.user_metadata?.picture,
      provider: 'google',
    });
  } catch (profileError) {
    console.warn('[Auth] Failed to upsert user profile:', profileError);
  }

  // Session is now established; fetch all post-auth data in parallel
  return fetchPostAuthData(data.user.id);
}

// ============================================
// POST-AUTH DATA FETCHING
// ============================================

/**
 * Fetches all data the app needs after a successful sign-in: full user
 * profile, active party, and RevenueCat customer info. Runs in parallel
 * because the Supabase session is already established at this point.
 *
 * Imported lazily from partyService and subscriptionService to avoid
 * circular dependencies (those services also import from supabase config).
 */
async function fetchPostAuthData(userId: string): Promise<AuthResult> {
  const { getActiveParty } = await import('@/src/services/partyService');
  const { loginUser, hasProEntitlement } = await import('@/src/services/subscriptionService');

  const [fullUser, activeParty, customerInfo] = await Promise.all([
    getCurrentUser().catch((err) => {
      console.warn('[Auth] Failed to fetch full profile:', err);
      return null;
    }),
    getActiveParty().catch((err) => {
      console.warn('[Auth] Failed to fetch active party:', err);
      return null;
    }),
    loginUser(userId).catch((err) => {
      console.warn('[Auth] Failed to login to RevenueCat:', err);
      return null;
    }),
  ]);

  const user = fullUser ?? {
    id: userId,
    email: '',
    displayName: 'User',
    isPremium: false,
    isVerified: false,
    accountType: 'user' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (customerInfo) {
    user.isPremium = user.isPremium || hasProEntitlement(customerInfo);
  }

  return {
    user,
    activeParty,
    customerInfo,
    needsUsername: !user.username,
  };
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export async function signOut(): Promise<void> {
  // Remove this device's push tokens while the session is still valid:
  // after signOut() RLS would reject the delete (auth.uid() is null).
  await removePushTokens().catch((err) => {
    console.warn('[Auth] Failed to remove push tokens before sign out:', err);
  });

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Try to get the profile from the users table
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    // Profile not found in DB - return a minimal user from auth metadata
    // This handles the case where the users table doesn't exist yet
    // or the profile hasn't been created
    console.warn('User profile not found in DB, using auth metadata:', error?.message);
    return {
      id: user.id,
      email: user.email ?? '',
      displayName:
        user.user_metadata?.full_name
        || user.user_metadata?.name
        || user.email?.split('@')[0]
        || 'User',
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      provider: (user.app_metadata?.provider as 'apple' | 'google') ?? undefined,
      isPremium: false,
      isVerified: false,
      accountType: 'user',
      createdAt: user.created_at,
      updatedAt: user.created_at,
    };
  }

  return mapDbUserToUser(data);
}

/**
 * Builds a minimal User object from the Supabase session without making
 * additional API calls. This is safe to call inside onAuthStateChange
 * where async Supabase calls would cause a deadlock.
 */
function userFromSession(session: { user: { id: string; email?: string; created_at: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } }): User {
  const { user } = session;
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? '',
    displayName:
      (meta.full_name as string)
      || (meta.name as string)
      || user.email?.split('@')[0]
      || 'User',
    avatarUrl: (meta.avatar_url as string) || (meta.picture as string) || undefined,
    provider: (user.app_metadata?.provider as 'apple' | 'google') ?? undefined,
    isPremium: false,
    isVerified: false,
    accountType: 'user',
    createdAt: user.created_at,
    updatedAt: user.created_at,
  };
}

/**
 * Subscribes to auth state changes. The callback receives a User built
 * directly from the session to avoid deadlocks caused by async Supabase
 * calls inside the handler. Profile enrichment should happen separately.
 *
 * TOKEN_REFRESHED events are intentionally ignored: they carry the same
 * user identity but would overwrite the enriched in-memory profile
 * (username, isPremium, etc.) with a minimal session-derived object.
 * The refreshed token is persisted in AsyncStorage automatically by
 * Supabase, so skipping the callback is safe.
 */
export function onAuthStateChange(
  callback: (user: User | null) => void,
): { unsubscribe: () => void } {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'TOKEN_REFRESHED') return;

      console.log('[Auth] State changed:', event, session?.user?.id);
      if (session?.user) {
        callback(userFromSession(session));
      } else {
        callback(null);
      }
    },
  );

  return { unsubscribe: () => subscription.unsubscribe() };
}

// ============================================
// USER PROFILE
// ============================================

async function upsertUserProfile(
  id: string,
  profile: {
    email: string;
    displayName: string;
    avatarUrl?: string;
    provider: 'apple' | 'google';
  },
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id,
        email: profile.email,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl ?? null,
        provider: profile.provider,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (error) throw error;
  return mapDbUserToUser(data);
}

// ============================================
// HELPERS
// ============================================

function mapDbUserToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    displayName: row.display_name as string,
    username: (row.username as string) ?? undefined,
    avatarUrl: row.avatar_url as string | undefined,
    provider: row.provider as 'apple' | 'google' | undefined,
    isPremium: (row.is_premium as boolean) ?? false,
    isVerified: (row.is_verified as boolean) ?? false,
    accountType: (row.account_type as 'user' | 'venue') ?? 'user',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ============================================
// USERNAME MANAGEMENT
// ============================================

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Validates username format: 3-20 characters, alphanumeric and underscores only.
 */
export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

/**
 * Checks if a username is available via server-side RPC.
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_available', {
    p_username: username.toLowerCase(),
  });

  if (error) throw error;
  return data as boolean;
}

/**
 * Updates the current user's username.
 * Validates format locally and uniqueness server-side.
 */
export async function updateUsername(username: string): Promise<User> {
  if (!isValidUsername(username)) {
    throw new Error('Username must be 3-20 characters, letters, numbers and underscores only');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const normalized = username.toLowerCase();

  const { data, error } = await supabase
    .from('users')
    .update({ username: normalized, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      throw new Error('This username is already taken');
    }
    throw error;
  }

  return mapDbUserToUser(data);
}

// ============================================
// STATS
// ============================================

export interface UserStats {
  totalParties: number;
  totalDrinks: number;
  totalChallenges: number;
}

/**
 * Fetches aggregated lifetime statistics for the current user.
 */
export async function getUserStats(): Promise<UserStats> {
  const { data, error } = await supabase.rpc('get_user_stats');
  if (error) throw error;

  const raw = data as Record<string, number>;
  return {
    totalParties: raw.total_parties ?? 0,
    totalDrinks: raw.total_drinks ?? 0,
    totalChallenges: raw.total_challenges ?? 0,
  };
}

// ============================================
// AVATAR
// ============================================


/**
 * Uploads a profile avatar and updates the user record.
 * Path format: {userId}.{ext} — only the owner can upload.
 */
export async function updateAvatar(imageUri: string): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { File } = await import('expo-file-system');
  const file = new File(imageUri);
  const arrayBuffer = await file.arrayBuffer();

  const fileExt = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;
  const storagePath = `${user.id}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, arrayBuffer, { contentType, upsert: true });

  if (uploadError) throw uploadError;

  const { data: signedData, error: signError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(storagePath, AVATAR_URL_EXPIRY);

  if (signError || !signedData?.signedUrl) {
    throw signError ?? new Error('Failed to create signed URL');
  }

  const { data, error } = await supabase
    .from('users')
    .update({ avatar_url: signedData.signedUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return mapDbUserToUser(data);
}

/**
 * Signed avatar URLs expire after 7 days. If the current user's stored URL is
 * expired (or about to), sign the same storage path again and save it, so
 * other participants also get a working URL. Returns the (possibly updated)
 * user; never throws.
 */
export async function refreshOwnAvatarUrl(user: User): Promise<User> {
  if (isAvatarUrlFresh(user.avatarUrl)) return user;
  const path = getAvatarStoragePath(user.avatarUrl);
  if (!path) return user;

  try {
    const signedUrl = await signAvatarPath(path);
    if (!signedUrl) return user;

    const { error } = await supabase
      .from('users')
      .update({ avatar_url: signedUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) console.warn('[Auth] Failed to save refreshed avatar URL:', error.message);

    return { ...user, avatarUrl: signedUrl };
  } catch (err) {
    console.warn('[Auth] Failed to refresh avatar URL:', err);
    return user;
  }
}

/**
 * Deletes the current user's account.
 * Calls the Edge Function which anonymizes data and removes auth credentials.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });

  if (error) {
    console.error('[Auth] delete-account failed:', error.message);
    throw new Error(error.message || 'Failed to delete account');
  }

  await supabase.auth.signOut();
}
