/**
 * PARTYUP Venue Service
 * =====================
 * Venue discovery and search powered by Supabase + PostGIS.
 */

import { supabase } from '@/src/config/supabase';
import { Venue } from '@/src/types';

// ============================================
// CONSTANTS
// ============================================

export const DEFAULT_RADIUS_METERS = 10_000;
export const DEFAULT_VENUE_PAGE_SIZE = 15;

// ============================================
// HELPERS
// ============================================

function mapDbVenue(row: Record<string, unknown>): Venue {
  return {
    id: row.id as string,
    osmId: row.osm_id as string,
    name: row.name as string,
    amenity: (row.amenity as string) ?? 'pub',
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    isVerified: (row.is_verified as boolean) ?? false,
    linkedUserId: (row.linked_user_id as string) ?? undefined,
    addressCity: row.address_city as string | undefined,
    addressStreet: row.address_street as string | undefined,
    addressHousenumber: row.address_housenumber as string | undefined,
    addressPostcode: row.address_postcode as string | undefined,
    phone: row.phone as string | undefined,
    email: row.email as string | undefined,
    website: row.website as string | undefined,
    openingHours: row.opening_hours as string | undefined,
    wheelchair: row.wheelchair as string | undefined,
    outdoorSeating: row.outdoor_seating as boolean | undefined,
    indoorSeating: row.indoor_seating as boolean | undefined,
    airConditioning: row.air_conditioning as boolean | undefined,
    smoking: row.smoking as string | undefined,
    liveMusic: row.live_music as boolean | undefined,
    minAge: row.min_age as string | undefined,
    cuisine: row.cuisine as string | undefined,
    contactFacebook: row.contact_facebook as string | undefined,
    contactInstagram: row.contact_instagram as string | undefined,
    contactTwitter: row.contact_twitter as string | undefined,
    contactTiktok: row.contact_tiktok as string | undefined,
    contactThreads: row.contact_threads as string | undefined,
    imageUrl: row.image_url as string | undefined,
    logoUrl: row.logo_url as string | undefined,
    extraProperties: (row.extra_properties as Record<string, unknown>) ?? {},
    partiesToday: row.parties_today != null ? Number(row.parties_today) : undefined,
    partiesLastWeek: row.parties_last_week != null ? Number(row.parties_last_week) : undefined,
    distanceMeters: row.distance_meters != null ? Number(row.distance_meters) : undefined,
  };
}

// ============================================
// QUERIES
// ============================================

export interface GetNearbyVenuesOptions {
  radiusMeters?: number;
  limit?: number;
  offset?: number;
  search?: string;
  amenity?: string;
}

/**
 * Fetches venues near a given location, sorted by party popularity.
 * Uses the PostGIS-powered `get_nearby_venues` RPC for efficient spatial queries.
 */
export async function getNearbyVenues(
  latitude: number,
  longitude: number,
  options: GetNearbyVenuesOptions = {},
): Promise<Venue[]> {
  const {
    radiusMeters = DEFAULT_RADIUS_METERS,
    limit = DEFAULT_VENUE_PAGE_SIZE,
    offset = 0,
    search,
    amenity,
  } = options;

  const { data, error } = await supabase.rpc('get_nearby_venues', {
    p_lat: latitude,
    p_lng: longitude,
    p_radius_meters: radiusMeters,
    p_limit: limit,
    p_offset: offset,
    p_search: search || null,
    p_amenity: amenity || null,
  });

  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => mapDbVenue(row));
}

/**
 * Fetches a single venue by its ID with current party counts.
 * Falls back to a direct table query if the venue is not in the RPC result.
 */
export async function getVenueById(venueId: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single();

  if (error || !data) return null;

  // Fetch party counts separately
  const now = new Date();
  const shifted = new Date(now.getTime() - 7.5 * 60 * 60 * 1000);
  const todayStart = new Date(
    shifted.getFullYear(), shifted.getMonth(), shifted.getDate(), 7, 30, 0,
  ).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [todayResult, weekResult] = await Promise.all([
    supabase
      .from('parties')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .gte('created_at', todayStart),
    supabase
      .from('parties')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .gte('created_at', weekAgo),
  ]);

  const venue = mapDbVenue(data as Record<string, unknown>);
  venue.partiesToday = todayResult.count ?? 0;
  venue.partiesLastWeek = weekResult.count ?? 0;

  return venue;
}
