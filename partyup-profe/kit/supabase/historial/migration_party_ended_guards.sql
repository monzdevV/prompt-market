-- ============================================
-- Migration: Reject drink operations on ended parties
-- ============================================
-- Updates increment_drink and decrement_drink RPCs to verify the party
-- is still active before allowing any modification. This prevents stale
-- clients (e.g. returning from background after party ended) from
-- mutating data on closed parties.

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
  updated_drinks JSONB;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Verify the party is still active
  SELECT status INTO v_party_status
  FROM public.parties
  WHERE id = p_party_id;

  IF v_party_status IS NULL THEN
    RAISE EXCEPTION 'Party not found';
  END IF;

  IF v_party_status != 'active' THEN
    RAISE EXCEPTION 'Party has ended';
  END IF;

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

  INSERT INTO public.drink_events (party_id, user_id, drink_type)
  VALUES (p_party_id, p_user_id, p_drink_type);

  RETURN updated_drinks;
END;
$$;

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

  -- Verify the party is still active
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
  WHERE party_id = p_party_id AND user_id = p_user_id;

  IF current_count <= 0 THEN
    SELECT drinks INTO updated_drinks
    FROM public.party_participants
    WHERE party_id = p_party_id AND user_id = p_user_id;
    RETURN updated_drinks;
  END IF;

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
