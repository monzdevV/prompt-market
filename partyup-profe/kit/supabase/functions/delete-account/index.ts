/**
 * PARTYUP Edge Function: Delete Account
 * ======================================
 * Anonymizes the user's public profile, cleans up active party
 * participations, and soft-deletes the auth credentials.
 *
 * Flow:
 * 1. Verify JWT from the request
 * 2. Deactivate all active party participations
 * 3. End any active parties created by this user
 * 4. Remove push tokens
 * 5. Delete avatar from storage
 * 6. Anonymize the user's public profile (removes all PII)
 * 7. Anonymize the auth.users email
 * 8. Soft-delete from auth.users (sets deleted_at, invalidates sessions)
 *
 * The public.users row remains as a tombstone with display_name = "Deleted User"
 * so FK references from party_participants, party_media, etc. stay valid.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    console.error('[delete-account] Method not allowed:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Extract and verify the user's JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[delete-account] Missing or malformed authorization header');
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');

  // Create a client with the user's token to verify identity
  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) {
    console.error('[delete-account] Invalid token:', authError?.message ?? 'No user returned');
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create admin client with service role for privileged operations
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('[delete-account] Starting account deletion for user:', user.id);

    // Step 1: End parties, expire challenges, deactivate participations, remove push tokens
    const { error: cleanupError } = await adminClient.rpc('admin_cleanup_for_deletion', {
      p_user_id: user.id,
    });

    if (cleanupError) {
      console.error('[delete-account] Failed to clean up user data:', cleanupError);
      return new Response(JSON.stringify({ error: 'Failed to clean up account data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const avatarPaths = ['jpg', 'jpeg', 'png', 'webp'].map((ext) => `${user.id}.${ext}`);
    await adminClient.storage.from('user-avatars').remove(avatarPaths);

    // Step 3: Anonymize the user's public profile (removes all PII)
    const { error: anonymizeError } = await adminClient.rpc('anonymize_user', {
      p_user_id: user.id,
    });

    if (anonymizeError) {
      console.error('[delete-account] Failed to anonymize user:', anonymizeError);
      return new Response(JSON.stringify({ error: 'Failed to anonymize account' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 4: Anonymize the auth.users email to strip PII from the auth table
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(user.id, {
      email: `deleted-${user.id}@removed.local`,
    });

    if (updateAuthError) {
      console.error('[delete-account] Failed to anonymize auth email:', updateAuthError);
      // Non-fatal: continue with soft delete even if email anonymization fails
    }

    // Step 5: Soft-delete from auth.users (sets deleted_at, invalidates all sessions)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      user.id,
      true, // shouldSoftDelete
    );

    if (deleteError) {
      console.error('[delete-account] Failed to soft-delete auth user:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete auth credentials' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[delete-account] Account successfully deleted for user:', user.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[delete-account] Unexpected error during account deletion:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
