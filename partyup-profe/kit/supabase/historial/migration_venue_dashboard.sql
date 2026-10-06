-- ============================================
-- Migration: Venue Dashboard RPCs
-- ============================================
-- RPCs for the venue dashboard: stats, daily counts, active parties.
-- All follow security guidelines: SECURITY DEFINER, search_path = '',
-- auth checks, and parameter validation.
-- "Today" boundaries use 7:30 AM to align with nightlife schedules.

-- ============================================
-- 1. Venue Dashboard Stats
-- ============================================

CREATE OR REPLACE FUNCTION public.get_venue_dashboard_stats(p_venue_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_linked_user UUID;
  v_today BIGINT;
  v_week BIGINT;
  v_month BIGINT;
  v_challenges_today BIGINT;
  v_offers_today BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT linked_user_id INTO v_linked_user
  FROM public.venues WHERE id = p_venue_id;

  IF v_linked_user IS NULL OR v_linked_user != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now() - interval '7 hours 30 minutes') + interval '7 hours 30 minutes'),
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')
  INTO v_today, v_week, v_month
  FROM public.parties
  WHERE venue_id = p_venue_id;

  SELECT COUNT(*) INTO v_challenges_today
  FROM public.party_challenges pc
  INNER JOIN public.parties p ON p.id = pc.party_id
  WHERE p.venue_id = p_venue_id
    AND pc.creator_id = auth.uid()
    AND pc.created_at >= date_trunc('day', now() - interval '7 hours 30 minutes') + interval '7 hours 30 minutes';

  SELECT COUNT(*) INTO v_offers_today
  FROM public.venue_offers
  WHERE venue_id = p_venue_id
    AND creator_id = auth.uid()
    AND created_at >= date_trunc('day', now() - interval '7 hours 30 minutes') + interval '7 hours 30 minutes';

  RETURN jsonb_build_object(
    'today', v_today,
    'week', v_week,
    'month', v_month,
    'challenges_today', v_challenges_today,
    'offers_today', v_offers_today
  );
END;
$$;

-- ============================================
-- 2. Venue Daily Party Counts (for charts)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_venue_daily_counts(
  p_venue_id UUID,
  p_days INT DEFAULT 30
)
RETURNS TABLE (day DATE, count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_linked_user UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT linked_user_id INTO v_linked_user
  FROM public.venues WHERE id = p_venue_id;

  IF v_linked_user IS NULL OR v_linked_user != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    d::date AS day,
    COALESCE(pc.cnt, 0) AS count
  FROM generate_series(
    CURRENT_DATE - (LEAST(p_days, 90) - 1) * INTERVAL '1 day',
    CURRENT_DATE,
    INTERVAL '1 day'
  ) AS d
  LEFT JOIN (
    SELECT created_at::date AS pday, COUNT(*) AS cnt
    FROM public.parties
    WHERE venue_id = p_venue_id
      AND created_at >= CURRENT_DATE - LEAST(p_days, 90) * INTERVAL '1 day'
    GROUP BY pday
  ) pc ON pc.pday = d::date
  ORDER BY d;
END;
$$;

-- ============================================
-- 3. Active Venue Parties
-- ============================================

CREATE OR REPLACE FUNCTION public.get_active_venue_parties(p_venue_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_linked_user UUID;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT linked_user_id INTO v_linked_user
  FROM public.venues WHERE id = p_venue_id;

  IF v_linked_user IS NULL OR v_linked_user != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'code', p.code,
      'created_at', p.created_at,
      'participant_count', (
        SELECT COUNT(*) FROM public.party_participants pp
        WHERE pp.party_id = p.id AND pp.is_active = true
      )
    ) ORDER BY p.created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.parties p
  WHERE p.venue_id = p_venue_id
    AND p.status = 'active'
    AND p.created_at >= now() - interval '3 days';

  RETURN v_result;
END;
$$;

-- ============================================
-- 4. Get Venue ID for Current User
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_venue_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_venue_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_venue_id
  FROM public.venues
  WHERE linked_user_id = auth.uid()
  LIMIT 1;

  RETURN v_venue_id;
END;
$$;
