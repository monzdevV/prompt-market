/**
 * PARTYUP Edge Function: Notify Venue Offer
 * ==========================================
 * Sends push notifications to all participants in active parties
 * at a venue when a new offer is created.
 *
 * Triggered by a Supabase Database Webhook on venue_offers INSERT.
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
      `[notify-venue-offer] Received ${payload.type} event on ${payload.table}`,
    );

    if (payload.type !== 'INSERT' || !payload.record) {
      return jsonResponse({ sent: 0 });
    }

    const venueId = payload.record.venue_id as string;
    const offerTitle = payload.record.title as string;
    const offerType = payload.record.offer_type as string;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeParties } = await supabase
      .from('parties')
      .select('id')
      .eq('venue_id', venueId)
      .eq('status', 'active')
      .gte('created_at', threeDaysAgo);

    if (!activeParties?.length) {
      console.log('[notify-venue-offer] No active parties at this venue');
      return jsonResponse({ sent: 0 });
    }

    const partyIds = activeParties.map((p) => p.id);

    const { data: participants } = await supabase
      .from('party_participants')
      .select('user_id')
      .in('party_id', partyIds)
      .eq('is_active', true);

    if (!participants?.length) {
      console.log('[notify-venue-offer] No participants to notify');
      return jsonResponse({ sent: 0 });
    }

    const uniqueUserIds = [...new Set(participants.map((p) => p.user_id))];

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .in('user_id', uniqueUserIds);

    if (!tokens?.length) {
      console.log('[notify-venue-offer] No push tokens found');
      return jsonResponse({ sent: 0 });
    }

    const typeEmoji = offerType === '2x1' ? '2x1' : offerType === '3x2' ? '3x2' : '';
    const body = typeEmoji
      ? `${typeEmoji} ${offerTitle}`
      : offerTitle;

    const messages: PushMessage[] = tokens.map((t) => ({
      to: t.expo_push_token,
      title: 'PartyUp',
      body,
      data: { venueId },
      sound: 'default' as const,
      priority: 'high' as const,
    }));

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
      console.error('[notify-venue-offer] Expo Push API error:', errorBody);
    }

    console.log(`[notify-venue-offer] Sent ${messages.length} notification(s)`);
    return jsonResponse({ sent: messages.length });
  } catch (error) {
    console.error('[notify-venue-offer] Unexpected error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
