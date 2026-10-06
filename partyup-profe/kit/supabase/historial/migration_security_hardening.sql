-- ============================================
-- Migration: Security Hardening
-- ============================================
-- Comprehensive security fixes from full audit.
-- Addresses all critical, high, medium, and low severity issues.
--
-- BYPASS MECHANISM: SECURITY DEFINER RPCs call
--   set_config('app.bypass_rls_checks', 'true', true)
-- before modifying guarded tables. Triggers check this flag and
-- skip validation when set. The flag is transaction-local and
-- resets automatically after each PostgREST request.

-- ============================================
-- 1. TRIGGER GUARD FUNCTIONS
-- ============================================

-- 1a. Users: block changes to protected columns (C2)
CREATE OR REPLACE FUNCTION public.guard_users_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.bypass_rls_checks', true) = 'true' THEN
    RETURN NEW;
  END IF;

  NEW.is_premium := OLD.is_premium;
  NEW.email := OLD.email;
  NEW.provider := OLD.provider;

  RETURN NEW;
END;
$$;

-- 1b. Parties: block changes to protected columns (H2)
CREATE OR REPLACE FUNCTION public.guard_parties_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.bypass_rls_checks', true) = 'true' THEN
    RETURN NEW;
  END IF;

  NEW.creator_id := OLD.creator_id;
  NEW.creator_is_pro := OLD.creator_is_pro;
  NEW.code := OLD.code;
  NEW.status := OLD.status;
  NEW.ended_at := OLD.ended_at;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END;
$$;

-- 1c. Party participants: only allow is_active true->false (C4)
CREATE OR REPLACE FUNCTION public.guard_participants_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.bypass_rls_checks', true) = 'true' THEN
    RETURN NEW;
  END IF;

  NEW.party_id := OLD.party_id;
  NEW.user_id := OLD.user_id;
  NEW.role := OLD.role;
  NEW.drinks := OLD.drinks;
  NEW.joined_at := OLD.joined_at;

  IF NEW.is_active AND NOT OLD.is_active THEN
    NEW.is_active := OLD.is_active;
  END IF;

  RETURN NEW;
END;
$$;

-- 1d. Party participants INSERT: validate and force defaults (H1, M6)
CREATE OR REPLACE FUNCTION public.guard_participants_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_party_status TEXT;
  v_creator_is_pro BOOLEAN;
  v_active_count INT;
  v_max_members INT;
  v_is_creator BOOLEAN;
BEGIN
  IF current_setting('app.bypass_rls_checks', true) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT status, creator_is_pro, (creator_id = NEW.user_id)
  INTO v_party_status, v_creator_is_pro, v_is_creator
  FROM public.parties
  WHERE id = NEW.party_id;

  IF v_party_status IS NULL OR v_party_status != 'active' THEN
    RAISE EXCEPTION 'Cannot join: party is not active';
  END IF;

  IF NOT v_is_creator THEN
    NEW.role := 'member';
  END IF;

  NEW.drinks := '{"beer":0,"cubata":0,"shot":0,"wine":0,"cocktail":0,"other":0,"total":0}'::jsonb;
  NEW.is_active := true;

  v_max_members := CASE WHEN v_creator_is_pro THEN 15 ELSE 5 END;

  SELECT COUNT(*) INTO v_active_count
  FROM public.party_participants
  WHERE party_id = NEW.party_id AND is_active = true;

  IF v_active_count >= v_max_members THEN
    RAISE EXCEPTION 'Party is full';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 2. APPLY TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trg_guard_users_update ON public.users;
CREATE TRIGGER trg_guard_users_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_users_update();

DROP TRIGGER IF EXISTS trg_guard_parties_update ON public.parties;
CREATE TRIGGER trg_guard_parties_update
  BEFORE UPDATE ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.guard_parties_update();

DROP TRIGGER IF EXISTS trg_guard_participants_update ON public.party_participants;
CREATE TRIGGER trg_guard_participants_update
  BEFORE UPDATE ON public.party_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_participants_update();

DROP TRIGGER IF EXISTS trg_guard_participants_insert ON public.party_participants;
CREATE TRIGGER trg_guard_participants_insert
  BEFORE INSERT ON public.party_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_participants_insert();

-- ============================================
-- 3. UPDATED RLS POLICIES
-- ============================================

-- 3a. parties INSERT: enforce creator_id and derive creator_is_pro (C3)
DROP POLICY IF EXISTS "Authenticated users can create parties" ON public.parties;
CREATE POLICY "Authenticated users can create parties"
  ON public.parties FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id
    AND creator_is_pro = (SELECT is_premium FROM public.users WHERE id = auth.uid())
  );

-- 3b. party_media INSERT: add membership + active party check (H4, M5)
DROP POLICY IF EXISTS "Users can upload own media" ON public.party_media;
CREATE POLICY "Users can upload own media"
  ON public.party_media FOR INSERT
  WITH CHECK (
    auth.uid() = uploader_id
    AND party_id IN (SELECT public.user_party_ids())
    AND party_id IN (SELECT id FROM public.parties WHERE status = 'active')
  );

-- 3c. party_notes INSERT: add membership + active party check (H4, M5)
DROP POLICY IF EXISTS "Users can create own notes" ON public.party_notes;
CREATE POLICY "Users can create own notes"
  ON public.party_notes FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND party_id IN (SELECT public.user_party_ids())
    AND party_id IN (SELECT id FROM public.parties WHERE status = 'active')
  );

-- 3d. drink_events INSERT: add membership check (H5)
DROP POLICY IF EXISTS "Users can create own drink events" ON public.drink_events;
CREATE POLICY "Users can create own drink events"
  ON public.drink_events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND party_id IN (SELECT public.user_party_ids())
    AND party_id IN (SELECT id FROM public.parties WHERE status = 'active')
  );

-- 3e. party_challenges INSERT: restrict to party creator (H7)
DROP POLICY IF EXISTS "Party creator can insert challenges" ON public.party_challenges;
CREATE POLICY "Party creator can insert challenges"
  ON public.party_challenges FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id
    AND party_id IN (
      SELECT id FROM public.parties
      WHERE creator_id = auth.uid() AND status = 'active'
    )
  );

-- 3f. challenge_photo_reactions: add membership check (H8)
DROP POLICY IF EXISTS "Participants can add challenge photo reactions" ON public.challenge_photo_reactions;
CREATE POLICY "Participants can add challenge photo reactions"
  ON public.challenge_photo_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      JOIN public.parties p ON p.id = pc.party_id
      WHERE p.status = 'active'
        AND pc.party_id IN (SELECT public.user_party_ids())
    )
  );

DROP POLICY IF EXISTS "Users can update own challenge photo reactions" ON public.challenge_photo_reactions;
CREATE POLICY "Users can update own challenge photo reactions"
  ON public.challenge_photo_reactions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      JOIN public.parties p ON p.id = pc.party_id
      WHERE p.status = 'active'
        AND pc.party_id IN (SELECT public.user_party_ids())
    )
  );

DROP POLICY IF EXISTS "Users can delete own challenge photo reactions" ON public.challenge_photo_reactions;
CREATE POLICY "Users can delete own challenge photo reactions"
  ON public.challenge_photo_reactions FOR DELETE
  USING (
    auth.uid() = user_id
    AND response_id IN (
      SELECT cr.id FROM public.challenge_responses cr
      JOIN public.party_challenges pc ON pc.id = cr.challenge_id
      JOIN public.parties p ON p.id = pc.party_id
      WHERE p.status = 'active'
        AND pc.party_id IN (SELECT public.user_party_ids())
    )
  );

-- 3g. challenge_responses UPDATE: add WITH CHECK to prevent challenge_id change (M7)
DROP POLICY IF EXISTS "Users can update own responses" ON public.challenge_responses;
CREATE POLICY "Users can update own responses"
  ON public.challenge_responses FOR UPDATE
  USING (
    auth.uid() = user_id
    AND challenge_id IN (
      SELECT pc.id FROM public.party_challenges pc
      WHERE pc.is_expired = false
        AND pc.party_id IN (SELECT public.user_party_ids())
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND challenge_id IN (
      SELECT pc.id FROM public.party_challenges pc
      WHERE pc.is_expired = false
        AND pc.party_id IN (SELECT public.user_party_ids())
    )
  );

-- 3h. photo_reactions UPDATE/DELETE: add membership check (L5)
DROP POLICY IF EXISTS "Users can update own reactions in active parties" ON public.photo_reactions;
CREATE POLICY "Users can update own reactions in active parties"
  ON public.photo_reactions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND media_id IN (
      SELECT pm.id FROM public.party_media pm
      JOIN public.parties p ON p.id = pm.party_id
      WHERE pm.party_id IN (SELECT public.user_party_ids())
        AND p.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can remove own reactions in active parties" ON public.photo_reactions;
CREATE POLICY "Users can remove own reactions in active parties"
  ON public.photo_reactions FOR DELETE
  USING (
    auth.uid() = user_id
    AND media_id IN (
      SELECT pm.id FROM public.party_media pm
      JOIN public.parties p ON p.id = pm.party_id
      WHERE pm.party_id IN (SELECT public.user_party_ids())
        AND p.status = 'active'
    )
  );

-- ============================================
-- 4. UPDATED RPC FUNCTIONS
-- ============================================

-- 4a. anonymize_user: add auth check, keep REVOKE (C1)
CREATE OR REPLACE FUNCTION public.anonymize_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  UPDATE public.users
  SET
    display_name = 'Deleted User',
    email = 'deleted-' || p_user_id::TEXT || '@removed.local',
    avatar_url = NULL,
    username = NULL,
    provider = NULL,
    is_premium = false,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- 4b. increment_drink: combined fixes (H3, M2, M8, L6)
CREATE OR REPLACE FUNCTION public.increment_drink(
  p_party_id UUID,
  p_user_id UUID,
  p_drink_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_status TEXT;
  current_count INT;
  updated_drinks JSONB;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_drink_type NOT IN ('beer', 'cubata', 'shot', 'wine', 'cocktail', 'other') THEN
    RAISE EXCEPTION 'Invalid drink type';
  END IF;

  SELECT status INTO v_party_status
  FROM public.parties
  WHERE id = p_party_id;

  IF v_party_status IS NULL THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  IF v_party_status != 'active' THEN
    RAISE EXCEPTION 'Party has ended';
  END IF;

  SELECT COALESCE((drinks->>p_drink_type)::int, 0)
  INTO current_count
  FROM public.party_participants
  WHERE party_id = p_party_id AND user_id = p_user_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not an active participant';
  END IF;

  IF current_count >= 50 THEN
    RAISE EXCEPTION 'Drink limit reached (max 50 per type)';
  END IF;

  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  UPDATE public.party_participants
  SET drinks = jsonb_set(
    jsonb_set(
      drinks,
      ARRAY[p_drink_type],
      to_jsonb(COALESCE((drinks->>p_drink_type)::int, 0) + 1)
    ),
    ARRAY['total'],
    to_jsonb(COALESCE((drinks->>'total')::int, 0) + 1)
  )
  WHERE party_id = p_party_id AND user_id = p_user_id
  RETURNING drinks INTO updated_drinks;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.drink_events (party_id, user_id, drink_type)
  VALUES (p_party_id, p_user_id, p_drink_type);

  RETURN updated_drinks;
END;
$$;

-- 4c. decrement_drink: add drink type validation, active check (M3)
CREATE OR REPLACE FUNCTION public.decrement_drink(
  p_party_id UUID,
  p_user_id UUID,
  p_drink_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_status TEXT;
  current_count INT;
  updated_drinks JSONB;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_drink_type NOT IN ('beer', 'cubata', 'shot', 'wine', 'cocktail', 'other') THEN
    RAISE EXCEPTION 'Invalid drink type';
  END IF;

  SELECT status INTO v_party_status
  FROM public.parties
  WHERE id = p_party_id;

  IF v_party_status IS NULL THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  IF v_party_status != 'active' THEN
    RAISE EXCEPTION 'Party has ended';
  END IF;

  SELECT COALESCE((drinks->>p_drink_type)::int, 0)
  INTO current_count
  FROM public.party_participants
  WHERE party_id = p_party_id AND user_id = p_user_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not an active participant';
  END IF;

  IF current_count <= 0 THEN
    SELECT drinks INTO updated_drinks
    FROM public.party_participants
    WHERE party_id = p_party_id AND user_id = p_user_id;
    RETURN updated_drinks;
  END IF;

  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  UPDATE public.party_participants
  SET drinks = jsonb_set(
    jsonb_set(
      drinks,
      ARRAY[p_drink_type],
      to_jsonb(GREATEST(COALESCE((drinks->>p_drink_type)::int, 0) - 1, 0))
    ),
    ARRAY['total'],
    to_jsonb(GREATEST(COALESCE((drinks->>'total')::int, 0) - 1, 0))
  )
  WHERE party_id = p_party_id AND user_id = p_user_id
  RETURNING drinks INTO updated_drinks;

  RETURN updated_drinks;
END;
$$;

-- 4d. join_party_by_code: FOR UPDATE + bypass flag (M1, L2)
CREATE OR REPLACE FUNCTION public.join_party_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party_id UUID;
  v_user_id UUID := auth.uid();
  v_existing_id UUID;
  v_is_active BOOLEAN;
  v_other_active_party UUID;
  v_creator_is_pro BOOLEAN;
  v_active_count INT;
  v_max_members INT;
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unable to join party';
  END IF;

  SELECT id, creator_is_pro INTO v_party_id, v_creator_is_pro
  FROM public.parties
  WHERE code = upper(p_code) AND status = 'active'
  FOR UPDATE;

  IF v_party_id IS NULL THEN
    RAISE EXCEPTION 'Unable to join party';
  END IF;

  SELECT id, is_active INTO v_existing_id, v_is_active
  FROM public.party_participants
  WHERE party_id = v_party_id AND user_id = v_user_id;

  IF v_existing_id IS NULL OR NOT v_is_active THEN
    SELECT party_id INTO v_other_active_party
    FROM public.party_participants
    WHERE user_id = v_user_id
      AND is_active = true
      AND party_id != v_party_id;

    IF v_other_active_party IS NOT NULL THEN
      RAISE EXCEPTION 'You are already in an active party';
    END IF;
  END IF;

  IF v_existing_id IS NULL OR NOT v_is_active THEN
    v_max_members := CASE WHEN v_creator_is_pro THEN 15 ELSE 5 END;

    SELECT COUNT(*) INTO v_active_count
    FROM public.party_participants
    WHERE party_id = v_party_id AND is_active = true;

    IF v_active_count >= v_max_members THEN
      RAISE EXCEPTION 'Party is full';
    END IF;
  END IF;

  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  IF v_existing_id IS NOT NULL THEN
    IF NOT v_is_active THEN
      UPDATE public.party_participants
      SET is_active = true
      WHERE id = v_existing_id;
    END IF;
  ELSE
    INSERT INTO public.party_participants (party_id, user_id, role, drinks)
    VALUES (v_party_id, v_user_id, 'member',
      '{"beer":0,"cubata":0,"shot":0,"wine":0,"cocktail":0,"other":0,"total":0}'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'code', p.code,
    'name', p.name,
    'status', p.status,
    'creator_id', p.creator_id,
    'creator_is_pro', p.creator_is_pro,
    'created_at', p.created_at,
    'ended_at', p.ended_at,
    'party_participants', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'party_id', pp.party_id,
          'user_id', pp.user_id,
          'role', pp.role,
          'drinks', pp.drinks,
          'joined_at', pp.joined_at,
          'is_active', pp.is_active,
          'users', jsonb_build_object(
            'display_name', u.display_name,
            'avatar_url', u.avatar_url,
            'username', u.username
          )
        )
      ),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM public.parties p
  LEFT JOIN public.party_participants pp ON pp.party_id = p.id
  LEFT JOIN public.users u ON u.id = pp.user_id
  WHERE p.id = v_party_id
  GROUP BY p.id;

  RETURN v_result;
END;
$$;

-- 4e. end_party_by_creator: add bypass flag
CREATE OR REPLACE FUNCTION public.end_party_by_creator(p_party_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_creator_id UUID;
  v_challenge RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT creator_id INTO v_creator_id
  FROM public.parties
  WHERE id = p_party_id AND status = 'active';

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Party not found or already ended';
  END IF;

  IF v_creator_id != v_user_id THEN
    RAISE EXCEPTION 'Only the party creator can end the party';
  END IF;

  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  FOR v_challenge IN
    SELECT pc.id
    FROM public.party_challenges pc
    WHERE pc.party_id = p_party_id
      AND pc.is_expired = false
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.challenge_responses (challenge_id, user_id, completed)
    SELECT v_challenge.id, pp.user_id, false
    FROM public.party_participants pp
    WHERE pp.party_id = p_party_id
      AND pp.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.challenge_responses cr
        WHERE cr.challenge_id = v_challenge.id
          AND cr.user_id = pp.user_id
      )
    ON CONFLICT (challenge_id, user_id) DO NOTHING;

    UPDATE public.party_challenges
    SET is_expired = true
    WHERE id = v_challenge.id;
  END LOOP;

  UPDATE public.parties
  SET status = 'ended', ended_at = now()
  WHERE id = p_party_id;

  UPDATE public.party_participants
  SET is_active = false
  WHERE party_id = p_party_id;
END;
$$;

-- 4f. create_challenge: add SET search_path (H6)
CREATE OR REPLACE FUNCTION public.create_challenge(
  p_party_id UUID,
  p_type TEXT,
  p_question TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party RECORD;
  v_count INTEGER;
  v_order INTEGER;
  v_challenge RECORD;
BEGIN
  IF char_length(p_question) > 50 THEN
    RAISE EXCEPTION 'Question exceeds maximum length of 50 characters';
  END IF;

  SELECT id, creator_id, status, creator_is_pro
    INTO v_party
    FROM public.parties
   WHERE id = p_party_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  IF v_party.status <> 'active' THEN
    RAISE EXCEPTION 'Party is not active';
  END IF;

  IF v_party.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the party creator can create challenges';
  END IF;

  IF NOT v_party.creator_is_pro THEN
    RAISE EXCEPTION 'Challenges require a Pro party';
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.party_challenges
   WHERE party_id = p_party_id;

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 challenges per party reached';
  END IF;

  v_order := v_count + 1;

  INSERT INTO public.party_challenges
    (party_id, creator_id, type, question, order_number, expires_at)
  VALUES
    (p_party_id, auth.uid(), p_type, p_question, v_order, now() + interval '15 minutes')
  RETURNING * INTO v_challenge;

  RETURN to_jsonb(v_challenge);
END;
$$;

-- 4g. process_expired_challenges: add SET search_path (H6)
CREATE OR REPLACE FUNCTION public.process_expired_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  FOR v_challenge IN
    SELECT pc.id, pc.party_id
    FROM public.party_challenges pc
    WHERE pc.expires_at <= now()
      AND pc.is_expired = false
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.challenge_responses (challenge_id, user_id, completed)
    SELECT v_challenge.id, pp.user_id, false
    FROM public.party_participants pp
    WHERE pp.party_id = v_challenge.party_id
      AND pp.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.challenge_responses cr
        WHERE cr.challenge_id = v_challenge.id
          AND cr.user_id = pp.user_id
      )
    ON CONFLICT (challenge_id, user_id) DO NOTHING;

    UPDATE public.party_challenges
    SET is_expired = true
    WHERE id = v_challenge.id;
  END LOOP;
END;
$$;

-- 4h. get_nearby_venues: auth check + limit cap (M10, L4)
-- Keeps search_path = 'public' because PostGIS functions require it
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
  ),
  party_counts AS (
    SELECT
      p.venue_id,
      COUNT(*) FILTER (WHERE p.created_at >= CURRENT_DATE) AS pt,
      COUNT(*) FILTER (WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days') AS pw
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

-- 4i. is_username_available: require auth (L1)
CREATE OR REPLACE FUNCTION public.is_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1 FROM public.users WHERE username = lower(p_username)
  );
END;
$$;

-- 4j. extract_party_id_from_path: add SET search_path (M4)
CREATE OR REPLACE FUNCTION public.extract_party_id_from_path(path TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT (string_to_array(path, '/'))[1]::UUID;
$$;

-- 4k. Admin cleanup for account deletion (replaces manual steps in edge function)
-- Handles challenge expiry (M12) and bypasses triggers safely.
CREATE OR REPLACE FUNCTION public.admin_cleanup_for_deletion(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_party RECORD;
  v_challenge RECORD;
BEGIN
  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  FOR v_party IN
    SELECT id FROM public.parties
    WHERE creator_id = p_user_id AND status = 'active'
    FOR UPDATE
  LOOP
    FOR v_challenge IN
      SELECT pc.id FROM public.party_challenges pc
      WHERE pc.party_id = v_party.id AND pc.is_expired = false
      FOR UPDATE SKIP LOCKED
    LOOP
      INSERT INTO public.challenge_responses (challenge_id, user_id, completed)
      SELECT v_challenge.id, pp.user_id, false
      FROM public.party_participants pp
      WHERE pp.party_id = v_party.id
        AND pp.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM public.challenge_responses cr
          WHERE cr.challenge_id = v_challenge.id AND cr.user_id = pp.user_id
        )
      ON CONFLICT (challenge_id, user_id) DO NOTHING;

      UPDATE public.party_challenges SET is_expired = true WHERE id = v_challenge.id;
    END LOOP;

    UPDATE public.parties SET status = 'ended', ended_at = now() WHERE id = v_party.id;

    UPDATE public.party_participants SET is_active = false WHERE party_id = v_party.id;
  END LOOP;

  UPDATE public.party_participants SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;

  DELETE FROM public.push_tokens WHERE user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_cleanup_for_deletion(UUID) FROM authenticated, anon;

-- ============================================
-- 5. UPDATED STORAGE POLICIES
-- ============================================

-- 5a. Challenge images: enforce filename contains uploader's user ID (M11)
DROP POLICY IF EXISTS "Participants can upload challenge images" ON storage.objects;
CREATE POLICY "Participants can upload challenge images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'party-photos'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND (storage.foldername(name))[2] = 'challenges'
    AND (string_to_array(storage.filename(name), '.'))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.party_participants pp
      WHERE pp.party_id = (storage.foldername(name))[1]::UUID
        AND pp.user_id = auth.uid()
        AND pp.is_active = true
    )
  );

-- 5b. User avatars: restrict file extensions (L7)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (string_to_array(name, '.'))[1]
    AND lower((string_to_array(name, '.'))[2]) IN ('jpg', 'jpeg', 'png', 'webp')
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-avatars'
    AND auth.uid()::text = (string_to_array(name, '.'))[1]
    AND lower((string_to_array(name, '.'))[2]) IN ('jpg', 'jpeg', 'png', 'webp')
  );

-- ============================================
-- 6. REVOKE STATEMENTS
-- ============================================

REVOKE EXECUTE ON FUNCTION public.anonymize_user(UUID) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.process_expired_challenges() FROM authenticated, anon;
