-- ============================================
-- VENUE AMENITY FILTER Migration
-- ============================================
-- Replaces get_nearby_venues with a version that supports an optional
-- amenity filter. When provided, only venues matching the given amenity
-- type are returned. When NULL (default), all venues are returned.
--
-- IMPORTANT: The old 6-param overload must be dropped first because
-- adding a parameter creates a new overload in PostgreSQL rather than
-- replacing the existing function.

-- Drop the old 6-param version to avoid overload ambiguity
DROP FUNCTION IF EXISTS public.get_nearby_venues(FLOAT8, FLOAT8, FLOAT8, INT, INT, TEXT);

CREATE OR REPLACE FUNCTION public.get_nearby_venues(
  p_lat FLOAT8,
  p_lng FLOAT8,
  p_radius_meters FLOAT8 DEFAULT 10000,
  p_limit INT DEFAULT 15,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_amenity TEXT DEFAULT NULL
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH nearby AS (
    SELECT
      v.*,
      ST_Distance(
        v.location,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) AS dist_meters
    FROM public.venues v
    WHERE ST_DWithin(
      v.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
    AND (p_search IS NULL OR v.name ILIKE '%' || p_search || '%')
    AND (p_amenity IS NULL OR v.amenity = p_amenity)
  ),
  party_counts AS (
    SELECT
      p.venue_id,
      COUNT(*) FILTER (
        WHERE p.created_at >= date_trunc('day', now() - interval '7 hours 30 minutes') + interval '7 hours 30 minutes'
      ) AS pt,
      COUNT(*) FILTER (
        WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days'
      ) AS pw
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
    COALESCE(pc.pt, 0) AS parties_today,
    COALESCE(pc.pw, 0) AS parties_last_week,
    n.dist_meters AS distance_meters
  FROM nearby n
  LEFT JOIN party_counts pc ON pc.venue_id = n.id
  ORDER BY
    (COALESCE(pc.pt, 0) + COALESCE(pc.pw, 0)) DESC,
    n.dist_meters ASC
  LIMIT LEAST(p_limit, 50)
  OFFSET p_offset;
END;
$$;
