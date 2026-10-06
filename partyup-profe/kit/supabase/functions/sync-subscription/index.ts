/**
 * PARTYUP Edge Function: Sync Subscription
 * ==========================================
 * Receives RevenueCat webhook events and updates the user's premium
 * status in the database. This is the ONLY path that can modify
 * is_premium — client-side updates are blocked by the guard trigger.
 *
 * Events that grant Pro access:
 *   INITIAL_PURCHASE, RENEWAL, UNCANCELLATION
 *
 * Events that revoke Pro access:
 *   EXPIRATION
 *
 * All other events are acknowledged but ignored.
 *
 * RevenueCat webhook docs:
 *   https://www.revenuecat.com/docs/integrations/webhooks
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')!;

const PRO_ENTITLEMENT = 'PartyUp Pro';

const GRANT_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
]);

const REVOKE_EVENTS = new Set([
  'EXPIRATION',
]);

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  entitlement_ids: string[] | null;
  product_id?: string;
  environment?: string;
}

interface WebhookBody {
  api_version: string;
  event: RevenueCatEvent;
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
  if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const body: WebhookBody = await req.json();
    const event = body.event;

    console.log(
      `[sync-subscription] Received ${event.type} for user=${event.app_user_id}`,
    );

    if (event.type === 'TEST') {
      console.log('[sync-subscription] Test event acknowledged');
      return jsonResponse({ ok: true });
    }

    const isGrant = GRANT_EVENTS.has(event.type);
    const isRevoke = REVOKE_EVENTS.has(event.type);

    if (!isGrant && !isRevoke) {
      console.log(`[sync-subscription] Event ${event.type} ignored (no status change)`);
      return jsonResponse({ ok: true });
    }

    const entitlements = event.entitlement_ids ?? [];
    if (isGrant && !entitlements.includes(PRO_ENTITLEMENT)) {
      console.log(
        `[sync-subscription] Event ${event.type} ignored (no ${PRO_ENTITLEMENT} entitlement)`,
      );
      return jsonResponse({ ok: true });
    }

    const userId = event.app_user_id;
    const isPremium = isGrant;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase.rpc('admin_sync_premium_status', {
      p_user_id: userId,
      p_is_premium: isPremium,
    });

    if (error) {
      console.error('[sync-subscription] RPC error:', error.message);
      return jsonResponse({ error: error.message }, 500);
    }

    console.log(
      `[sync-subscription] Updated user=${userId} is_premium=${isPremium}`,
    );

    return jsonResponse({ ok: true, userId, isPremium });
  } catch (error) {
    console.error('[sync-subscription] Unexpected error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
