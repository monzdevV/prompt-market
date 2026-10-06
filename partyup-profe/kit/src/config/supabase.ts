/**
 * PARTYUP Supabase Client
 * ===========================
 * Configured client with AsyncStorage persistence, process-level locking
 * and auto-refresh for React Native.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase URL or Anon Key not set. ' +
    'Please add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
    'to your .env file.',
  );
}

/**
 * Process-level lock implementation for React Native.
 * Prevents the Web Locks API deadlock that causes the app to hang on cold start.
 * See: https://github.com/supabase/auth-js/issues/762
 */
const processLock: <R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>,
) => Promise<R> = async (_name, _acquireTimeout, fn) => {
  return await fn();
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

// Start auto-refresh immediately on cold start
supabase.auth.startAutoRefresh();

// Pause/resume auto-refresh based on app state transitions
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
