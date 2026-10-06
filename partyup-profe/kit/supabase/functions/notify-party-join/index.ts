/**
 * PARTYUP Edge Function: Notify Party Join
 * ==========================================
 * Sends a push notification to all active party members when a new
 * participant joins or rejoins the party. Uses the Expo Push API for
 * delivery to both iOS (APNs) and Android (FCM).
 *
 * Triggered by a Supabase Database Webhook on party_participants:
 *   - INSERT: new participant added
 *   - UPDATE: participant reactivated (is_active false -> true)
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

/**
 * Determines whether the webhook event should trigger a notification.
 * Returns the party_id and user_id if the event is relevant, or null otherwise.
 */
function extractJoinEvent(
  payload: WebhookPayload,
): { partyId: string; userId: string } | null {
  const { type, record, old_record } = payload;

  if (type === 'INSERT' && record) {
    return {
      partyId: record.party_id as string,
      userId: record.user_id as string,
    };
  }

  if (type === 'UPDATE' && record && old_record) {
    const wasInactive = old_record.is_active === false;
    const isNowActive = record.is_active === true;

    if (wasInactive && isNowActive) {
      return {
        partyId: record.party_id as string,
        userId: record.user_id as string,
      };
    }
  }

  return null;
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
      `[notify-party-join] Received ${payload.type} event on ${payload.table}`,
    );

    const joinEvent = extractJoinEvent(payload);

    if (!joinEvent) {
      console.log('[notify-party-join] Event ignored (not a join/rejoin)');
      return jsonResponse({ sent: 0 });
    }

    const { partyId, userId } = joinEvent;

    console.log(
      `[notify-party-join] Processing: party=${partyId}, user=${userId}`,
    );

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the joiner's display info
    const { data: joiner } = await supabase
      .from('users')
      .select('username, display_name')
      .eq('id', userId)
      .single();

    const joinerName = joiner?.username
      ? `@${joiner.username}`
      : joiner?.display_name ?? 'Someone';

    // Fetch all OTHER active participants in this party
    const { data: participants } = await supabase
      .from('party_participants')
      .select('user_id')
      .eq('party_id', partyId)
      .eq('is_active', true)
      .neq('user_id', userId);

    if (!participants?.length) {
      console.log('[notify-party-join] No other participants to notify');
      return jsonResponse({ sent: 0 });
    }

    const otherUserIds = participants.map((p) => p.user_id);

    // Fetch push tokens for those participants
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .in('user_id', otherUserIds);

    if (!tokens?.length) {
      console.log('[notify-party-join] No push tokens found for participants');
      return jsonResponse({ sent: 0 });
    }

    // Build push messages
    const messages: PushMessage[] = tokens.map((t) => ({
      to: t.expo_push_token,
      title: 'PartyUp',
      body: `\u{1F525} ${joinerName} joined the party!`,
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
      console.error('[notify-party-join] Expo Push API error:', errorBody);
    }

    console.log(`[notify-party-join] Sent ${messages.length} notification(s)`);

    return jsonResponse({ sent: messages.length });
  } catch (error) {
    console.error('[notify-party-join] Unexpected error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
