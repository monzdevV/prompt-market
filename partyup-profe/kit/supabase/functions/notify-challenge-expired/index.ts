/**
 * PARTYUP Edge Function: Notify Challenge Expired
 * =================================================
 * Sends a push notification to all active party members when a
 * challenge timer expires. Triggered by a Supabase Database Webhook
 * on party_challenges UPDATE where is_expired changes to true.
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
      `[notify-challenge-expired] Received ${payload.type} event on ${payload.table}`,
    );

    // Only process UPDATE events where is_expired changed to true
    if (payload.type !== 'UPDATE' || !payload.record) {
      console.log('[notify-challenge-expired] Event ignored (not an UPDATE)');
      return jsonResponse({ sent: 0 });
    }

    const wasExpired = payload.old_record?.is_expired as boolean;
    const isNowExpired = payload.record.is_expired as boolean;

    if (wasExpired || !isNowExpired) {
      console.log('[notify-challenge-expired] Event ignored (is_expired did not change to true)');
      return jsonResponse({ sent: 0 });
    }

    const partyId = payload.record.party_id as string;

    console.log(
      `[notify-challenge-expired] Processing: party=${partyId}`,
    );

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all active participants in this party
    const { data: participants } = await supabase
      .from('party_participants')
      .select('user_id')
      .eq('party_id', partyId)
      .eq('is_active', true);

    if (!participants?.length) {
      console.log('[notify-challenge-expired] No participants to notify');
      return jsonResponse({ sent: 0 });
    }

    const userIds = participants.map((p) => p.user_id);

    // Fetch push tokens for participants
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .in('user_id', userIds);

    if (!tokens?.length) {
      console.log('[notify-challenge-expired] No push tokens found');
      return jsonResponse({ sent: 0 });
    }

    // Build push messages
    const messages: PushMessage[] = tokens.map((t) => ({
      to: t.expo_push_token,
      title: 'PartyUp',
      body: "\u{23F0} Time's up! Challenge results are in",
      data: { partyId },
      sound: 'default' as const,
      priority: 'high' as const,
    }));

    // Send via Expo Push API
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
      console.error('[notify-challenge-expired] Expo Push API error:', errorBody);
    }

    console.log(`[notify-challenge-expired] Sent ${messages.length} notification(s)`);

    return jsonResponse({ sent: messages.length });
  } catch (error) {
    console.error('[notify-challenge-expired] Unexpected error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
