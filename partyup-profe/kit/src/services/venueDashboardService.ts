/**
 * PARTYUP Venue Dashboard Service
 * ================================
 * Data layer for the venue dashboard: stats, daily counts, active parties.
 */

import { supabase } from '@/src/config/supabase';

// ============================================
// TYPES
// ============================================

export interface VenueStats {
  today: number;
  week: number;
  month: number;
  challengesToday: number;
  offersToday: number;
}

export interface DailyCount {
  day: string;
  count: number;
}

export interface ActiveVenueParty {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  participantCount: number;
}

// ============================================
// QUERIES
// ============================================

export async function getUserVenueId(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_user_venue_id');
  if (error) throw error;
  return data as string | null;
}

export async function getVenueStats(venueId: string): Promise<VenueStats> {
  const { data, error } = await supabase.rpc('get_venue_dashboard_stats', {
    p_venue_id: venueId,
  });
  if (error) throw error;

  const raw = data as Record<string, number>;
  return {
    today: raw.today ?? 0,
    week: raw.week ?? 0,
    month: raw.month ?? 0,
    challengesToday: raw.challenges_today ?? 0,
    offersToday: raw.offers_today ?? 0,
  };
}

export async function getVenueDailyCounts(
  venueId: string,
  days = 30,
): Promise<DailyCount[]> {
  const { data, error } = await supabase.rpc('get_venue_daily_counts', {
    p_venue_id: venueId,
    p_days: days,
  });
  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    day: row.day as string,
    count: Number(row.count ?? 0),
  }));
}

export async function getActiveVenueParties(
  venueId: string,
): Promise<ActiveVenueParty[]> {
  const { data, error } = await supabase.rpc('get_active_venue_parties', {
    p_venue_id: venueId,
  });
  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    code: row.code as string,
    createdAt: row.created_at as string,
    participantCount: Number(row.participant_count ?? 0),
  }));
}
