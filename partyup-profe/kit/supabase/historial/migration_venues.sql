-- ============================================
-- VENUES Migration
-- ============================================
-- Adds venue (nightclub/pub) support to PartyUp.
-- Requires PostGIS and pg_trgm extensions.

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- VENUES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  amenity TEXT,
  location geography(Point, 4326) NOT NULL,
  latitude FLOAT8 NOT NULL,
  longitude FLOAT8 NOT NULL,
  address_city TEXT,
  address_street TEXT,
  address_housenumber TEXT,
  address_postcode TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  opening_hours TEXT,
  wheelchair TEXT,
  outdoor_seating BOOLEAN,
  indoor_seating BOOLEAN,
  air_conditioning BOOLEAN,
  smoking TEXT,
  live_music BOOLEAN,
  min_age TEXT,
  cuisine TEXT,
  contact_facebook TEXT,
  contact_instagram TEXT,
  contact_twitter TEXT,
  contact_tiktok TEXT,
  contact_threads TEXT,
  image_url TEXT,
  logo_url TEXT,
  extra_properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Spatial index for proximity queries (ST_DWithin)
CREATE INDEX IF NOT EXISTS idx_venues_location ON public.venues USING GIST(location);

-- Trigram index for fast ILIKE name searches
CREATE INDEX IF NOT EXISTS idx_venues_name_trgm ON public.venues USING GIN(name gin_trgm_ops);

-- Amenity type filter
CREATE INDEX IF NOT EXISTS idx_venues_amenity ON public.venues(amenity);

-- ============================================
-- ADD venue_id TO PARTIES
-- ============================================

ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id);

CREATE INDEX IF NOT EXISTS idx_parties_venue_id ON public.parties(venue_id);
CREATE INDEX IF NOT EXISTS idx_parties_venue_created ON public.parties(venue_id, created_at)
  WHERE venue_id IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read venues"
  ON public.venues FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- RPC: get_nearby_venues
-- ============================================
-- Returns venues within a given radius sorted by party popularity.
-- Uses PostGIS ST_DWithin for efficient spatial filtering with GiST index.

CREATE OR REPLACE FUNCTION public.get_nearby_venues(
  p_lat FLOAT8,
  p_lng FLOAT8,
  p_radius_meters FLOAT8 DEFAULT 10000,
  p_limit INT DEFAULT 15,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  osm_id TEXT,
  name TEXT,
  amenity TEXT,
  latitude FLOAT8,
  longitude FLOAT8,
  address_city TEXT,
  address_street TEXT,
  address_housenumber TEXT,
  address_postcode TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  opening_hours TEXT,
  wheelchair TEXT,
  outdoor_seating BOOLEAN,
  indoor_seating BOOLEAN,
  air_conditioning BOOLEAN,
  smoking TEXT,
  live_music BOOLEAN,
  min_age TEXT,
  cuisine TEXT,
  contact_facebook TEXT,
  contact_instagram TEXT,
  contact_twitter TEXT,
  contact_tiktok TEXT,
  contact_threads TEXT,
  image_url TEXT,
  logo_url TEXT,
  extra_properties JSONB,
  parties_today BIGINT,
  parties_last_week BIGINT,
  distance_meters FLOAT8
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH nearby AS (
    SELECT
      v.*,
      ST_Distance(
        v.location,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) AS distance_meters
    FROM public.venues v
    WHERE ST_DWithin(
      v.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
    AND (p_search IS NULL OR v.name ILIKE '%' || p_search || '%')
  ),
  party_counts AS (
    SELECT
      p.venue_id,
      COUNT(*) FILTER (WHERE p.created_at >= CURRENT_DATE) AS parties_today,
      COUNT(*) FILTER (WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days') AS parties_last_week
    FROM public.parties p
    WHERE p.venue_id IS NOT NULL
      AND p.created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY p.venue_id
  )
  SELECT
    n.id,
    n.osm_id,
    n.name,
    n.amenity,
    n.latitude,
    n.longitude,
    n.address_city,
    n.address_street,
    n.address_housenumber,
    n.address_postcode,
    n.phone,
    n.email,
    n.website,
    n.opening_hours,
    n.wheelchair,
    n.outdoor_seating,
    n.indoor_seating,
    n.air_conditioning,
    n.smoking,
    n.live_music,
    n.min_age,
    n.cuisine,
    n.contact_facebook,
    n.contact_instagram,
    n.contact_twitter,
    n.contact_tiktok,
    n.contact_threads,
    n.image_url,
    n.logo_url,
    n.extra_properties,
    COALESCE(pc.parties_today, 0) AS parties_today,
    COALESCE(pc.parties_last_week, 0) AS parties_last_week,
    n.distance_meters
  FROM nearby n
  LEFT JOIN party_counts pc ON pc.venue_id = n.id
  ORDER BY
    (COALESCE(pc.parties_today, 0) + COALESCE(pc.parties_last_week, 0)) DESC,
    n.distance_meters ASC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- ============================================
-- REALTIME (not needed for venues — read-only reference data)
-- ============================================
