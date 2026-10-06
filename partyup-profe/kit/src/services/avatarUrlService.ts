/**
 * Avatar URL refresh
 * ==================
 * Avatars live in the private `user-avatars` bucket and `users.avatar_url`
 * stores a signed URL that expires after 7 days. These helpers detect an
 * expired (or about to expire) signed URL and sign the same storage path
 * again on demand. External URLs (Google/Apple profile pictures) are
 * returned untouched.
 */

import { supabase } from '@/src/config/supabase';

export const AVATAR_BUCKET = 'user-avatars';
export const AVATAR_URL_EXPIRY = 604800; // 7 days, in seconds

/** Re-sign when less than this is left on the URL. */
const REFRESH_MARGIN_MS = 60 * 60 * 1000; // 1 hour

const SIGN_MARKER = `/storage/v1/object/sign/${AVATAR_BUCKET}/`;

// path -> { url, expiresAt } shared across the app session
const cache = new Map<string, { url: string; expiresAt: number }>();
const inflight = new Map<string, Promise<string | undefined>>();

/** Storage path inside `user-avatars` for a signed avatar URL, or null. */
export function getAvatarStoragePath(url: string | undefined | null): string | null {
  if (!url) return null;
  const idx = url.indexOf(SIGN_MARKER);
  if (idx === -1) return null;
  const rest = url.slice(idx + SIGN_MARKER.length).split('?')[0];
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

/** Expiry (ms since epoch) of a Supabase signed URL, from its JWT token. */
function getSignedUrlExpiry(url: string): number | null {
  const match = url.match(/[?&]token=([^&]+)/);
  if (!match) return null;
  const payload = match[1].split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = JSON.parse(globalThis.atob(padded)) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** True when the URL is not one of our signed avatar URLs or is still valid. */
export function isAvatarUrlFresh(url: string | undefined | null): boolean {
  if (!url || !getAvatarStoragePath(url)) return true;
  const exp = getSignedUrlExpiry(url);
  return exp !== null && exp - Date.now() > REFRESH_MARGIN_MS;
}

/** Signs `path` for 7 days (deduplicated and cached in memory). */
export async function signAvatarPath(path: string): Promise<string | undefined> {
  const hit = cache.get(path);
  if (hit && hit.expiresAt - Date.now() > REFRESH_MARGIN_MS) return hit.url;

  const pending = inflight.get(path);
  if (pending) return pending;

  const request = (async () => {
    try {
      const { data, error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(path, AVATAR_URL_EXPIRY);
      if (error || !data?.signedUrl) return undefined;
      cache.set(path, { url: data.signedUrl, expiresAt: Date.now() + AVATAR_URL_EXPIRY * 1000 });
      return data.signedUrl;
    } finally {
      inflight.delete(path);
    }
  })();
  inflight.set(path, request);
  return request;
}

/**
 * Returns a usable avatar URL: the same one if still valid, a freshly signed
 * one if it expired, or undefined if it can't be re-signed.
 */
export async function resolveAvatarUrl(url: string | undefined | null): Promise<string | undefined> {
  if (!url) return undefined;
  if (isAvatarUrlFresh(url)) return url;
  const path = getAvatarStoragePath(url);
  return path ? signAvatarPath(path) : url;
}
