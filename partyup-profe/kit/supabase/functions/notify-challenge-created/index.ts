/**
 * PARTYUP Edge Function: Notify Challenge Created
 * =================================================
 * Sends a push notification to all active party members when a new
 * challenge is created by the party host. The notification is kept
 * generic (no type or question revealed) to preserve the surprise.
 *
 * Triggered by a Supabase Database Webhook on party_challenges:
 *   - INSERT: new challenge added
 *
 * Webhook payload format:
 *   { type, table, schema, record, old_record }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: 'default';
  priority: 'high';
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload: WebhookPayload = await req.json();

    console.log(
      `[notify-challenge-created] Received ${payload.type} event on ${payload.table}`,
    );

    if (payload.type !== 'INSERT' || !payload.record) {
      console.log('[notify-challenge-created] Event ignored (not an INSERT)');
      return jsonResponse({ sent: 0 });
    }

    const partyId = payload.record.party_id as string;
    const creatorId = payload.record.creator_id as string;

    console.log(
      `[notify-challenge-created] Processing: party=${partyId}, creator=${creatorId}`,
    );

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all OTHER active participants in this party (exclude creator)
    const { data: participants } = await supabase
      .from('party_participants')
      .select('user_id')
      .eq('party_id', partyId)
      .eq('is_active', true)
      .neq('user_id', creatorId);

    if (!participants?.length) {
      console.log('[notify-challenge-created] No other participants to notify');
      return jsonResponse({ sent: 0 });
    }

    const otherUserIds = participants.map((p) => p.user_id);

    // Fetch push tokens for those participants
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .in('user_id', otherUserIds);

    if (!tokens?.length) {
      console.log('[notify-challenge-created] No push tokens found for participants');
      return jsonResponse({ sent: 0 });
    }

    // Build push messages (generic to keep the surprise)
    const messages: PushMessage[] = tokens.map((t) => ({
      to: t.expo_push_token,
      title: 'PartyUp',
      body: '\u{1F525} A new challenge has been created! Check it out \u{1F525}',
      data: { partyId },
      sound: 'default' as const,
      priority: 'high' as const,
    }));

    // Send via Expo Push API (supports batching up to 100 per request)
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[notify-challenge-created] Expo Push API error:', errorBody);
    }

    console.log(`[notify-challenge-created] Sent ${messages.length} notification(s)`);

    return jsonResponse({ sent: messages.length });
  } catch (error) {
    console.error('[notify-challenge-created] Unexpected error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
