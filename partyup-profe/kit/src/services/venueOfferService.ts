/**
 * PARTYUP Venue Offer Service
 * ============================
 * Service layer for venue offers (2x1, 3x2, custom promotions)
 * and per-user offer tickets with realtime subscriptions.
 */

import { supabase } from '@/src/config/supabase';
import { OfferTicket, OfferType } from '@/src/types';

// ============================================
// TYPES
// ============================================

export interface VenueOffer {
  id: string;
  offerType: OfferType;
  title: string;
  description?: string;
  price?: number;
  currency: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreateOfferParams {
  venueId: string;
  offerType: OfferType;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  durationMinutes: number;
}

// ============================================
// HELPERS
// ============================================

function mapDbTicket(row: Record<string, unknown>): OfferTicket {
  return {
    id: row.id as string,
    offerId: row.offer_id as string,
    partyId: row.party_id as string,
    userId: row.user_id as string,
    isRedeemed: (row.is_redeemed as boolean) ?? false,
    redeemedAt: (row.redeemed_at as string) ?? undefined,
    createdAt: row.created_at as string,
    offer: {
      offerType: row.offer_type as OfferType,
      title: row.title as string,
      description: (row.description as string) ?? undefined,
      price: row.price != null ? Number(row.price) : undefined,
      currency: (row.currency as string) ?? 'EUR',
      expiresAt: row.expires_at as string,
    },
  };
}

// ============================================
// VENUE OFFERS
// ============================================

export async function createVenueOffer(params: CreateOfferParams): Promise<string> {
  const { data, error } = await supabase.rpc('create_venue_offer', {
    p_venue_id: params.venueId,
    p_offer_type: params.offerType,
    p_title: params.title,
    p_description: params.description ?? null,
    p_price: params.price ?? null,
    p_currency: params.currency ?? 'EUR',
    p_duration_minutes: params.durationMinutes,
  });

  if (error) throw error;
  return data as string;
}

export async function getOffersForParty(partyId: string): Promise<VenueOffer[]> {
  const { data, error } = await supabase.rpc('get_venue_offers_for_party', {
    p_party_id: partyId,
  });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    offerType: row.offer_type as OfferType,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    price: row.price != null ? Number(row.price) : undefined,
    currency: (row.currency as string) ?? 'EUR',
    expiresAt: row.expires_at as string,
    createdAt: row.created_at as string,
  }));
}

export async function createVenueChallenge(
  venueId: string,
  type: string,
  question: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('create_venue_challenge', {
    p_venue_id: venueId,
    p_type: type,
    p_question: question,
  });

  if (error) throw error;
  return data as number;
}

// ============================================
// OFFER TICKETS
// ============================================

/**
 * Gets all of the current user's offer tickets for a party,
 * including full offer details (type, title, expiry, etc.).
 */
export async function getOfferTicketsForParty(partyId: string): Promise<OfferTicket[]> {
  const { data, error } = await supabase.rpc('get_offer_tickets_for_party', {
    p_party_id: partyId,
  });

  if (error) throw error;
  return (data ?? []).map(mapDbTicket);
}

/**
 * Atomically redeems an offer ticket. The server validates ownership,
 * double-redemption, offer expiry, party status, and participant status.
 */
export async function redeemOfferTicket(ticketId: string): Promise<OfferTicket> {
  const { data, error } = await supabase.rpc('redeem_offer_ticket', {
    p_ticket_id: ticketId,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Failed to redeem ticket');

  return mapDbTicket(data as Record<string, unknown>);
}

// ============================================
// REALTIME
// ============================================

/**
 * Subscribes to offer ticket changes for a specific party and user.
 * On any change, refetches all tickets to keep state consistent.
 */
export function subscribeToOfferTickets(
  partyId: string,
  userId: string,
  callback: (tickets: OfferTicket[]) => void,
): () => void {
  const channel = supabase
    .channel(`offer-tickets:${partyId}:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'offer_tickets',
        filter: `party_id=eq.${partyId}`,
      },
      async () => {
        const tickets = await getOfferTicketsForParty(partyId);
        callback(tickets);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
