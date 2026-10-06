-- ============================================
-- Migration: Venue Challenges & Offers
-- ============================================
-- Adds venue-wide challenge creation and venue offers system.
-- Daily limits use a 7:30 AM boundary instead of midnight to align
-- with nightlife schedules. Challenges and offers target active
-- parties created within the last 3 days.

-- ============================================
-- 1. Venue Challenge RPC
-- ============================================
-- Creates a challenge on EVERY active party at a venue.
-- Only the linked venue user can call this.

CREATE OR REPLACE FUNCTION public.create_venue_challenge(
  p_venue_id UUID,
  p_type TEXT,
  p_question TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_linked_user UUID;
  v_party RECORD;
  v_count INT := 0;
  v_existing INT;
  v_order INT;
  v_daily_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF char_length(p_question) > 50 THEN
    RAISE EXCEPTION 'Question exceeds maximum length of 50 characters';
  END IF;

  SELECT linked_user_id INTO v_linked_user
  FROM public.venues WHERE id = p_venue_id;

  IF v_linked_user IS NULL OR v_linked_user != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COUNT(*) INTO v_daily_count
  FROM public.party_challenges pc
  INNER JOIN public.parties p ON p.id = pc.party_id
  WHERE p.venue_id = p_venue_id
    AND pc.creator_id = auth.uid()
    AND pc.created_at >= date_trunc('day', now() - interval '7 hours 30 minutes') + interval '7 hours 30 minutes';

  IF v_daily_count >= 5 THEN
    RAISE EXCEPTION 'Daily challenge limit reached (5 per day)';
  END IF;

  FOR v_party IN
    SELECT id FROM public.parties
    WHERE venue_id = p_venue_id
      AND status = 'active'
      AND created_at >= now() - interval '3 days'
    FOR UPDATE
  LOOP
    SELECT COUNT(*) INTO v_existing
    FROM public.party_challenges
    WHERE party_id = v_party.id;

    IF v_existing < 3 THEN
      v_order := v_existing + 1;

      INSERT INTO public.party_challenges
        (party_id, creator_id, type, question, order_number, expires_at)
      VALUES
        (v_party.id, auth.uid(), p_type, p_question, v_order, now() + interval '15 minutes');

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================
-- 2. Venue Offers Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.venue_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) NOT NULL,
  creator_id UUID REFERENCES public.users(id) NOT NULL,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('2x1', '3x2', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_offers_venue
  ON public.venue_offers(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_offers_active
  ON public.venue_offers(venue_id, is_active) WHERE is_active = true;

ALTER TABLE public.venue_offers ENABLE ROW LEVEL SECURITY;

-- Venue owner can manage their offers
DROP POLICY IF EXISTS "Venue owner can manage offers" ON public.venue_offers;
CREATE POLICY "Venue owner can manage offers"
  ON public.venue_offers FOR ALL
  USING (
    auth.uid() = creator_id
    AND venue_id IN (
      SELECT id FROM public.venues WHERE linked_user_id = auth.uid()
    )
  );

-- Party participants can read active offers for their venue
DROP POLICY IF EXISTS "Participants can read active venue offers" ON public.venue_offers;
CREATE POLICY "Participants can read active venue offers"
  ON public.venue_offers FOR SELECT
  USING (
    is_active = true
    AND venue_id IN (
      SELECT p.venue_id FROM public.parties p
      WHERE p.venue_id IS NOT NULL
        AND p.status = 'active'
        AND p.id IN (SELECT public.user_party_ids())
    )
  );

-- ============================================
-- 3. Create Venue Offer RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.create_venue_offer(
  p_venue_id UUID,
  p_offer_type TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_price DECIMAL DEFAULT NULL,
  p_currency TEXT DEFAULT 'EUR',
  p_duration_minutes INT DEFAULT 60
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_linked_user UUID;
  v_offer_id UUID;
  v_daily_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_offer_type NOT IN ('2x1', '3x2', 'custom') THEN
    RAISE EXCEPTION 'Invalid offer type';
  END IF;

  IF char_length(p_title) > 100 THEN
    RAISE EXCEPTION 'Title too long';
  END IF;

  IF p_duration_minutes < 5 OR p_duration_minutes > 480 THEN
    RAISE EXCEPTION 'Duration must be between 5 and 480 minutes';
  END IF;

  SELECT linked_user_id INTO v_linked_user
  FROM public.venues WHERE id = p_venue_id;

  IF v_linked_user IS NULL OR v_linked_user != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COUNT(*) INTO v_daily_count
  FROM public.venue_offers
  WHERE venue_id = p_venue_id
    AND creator_id = auth.uid()
    AND created_at >= date_trunc('day', now() - interval '7 hours 30 minutes') + interval '7 hours 30 minutes';

  IF v_daily_count >= 5 THEN
    RAISE EXCEPTION 'Daily offer limit reached (5 per day)';
  END IF;

  INSERT INTO public.venue_offers
    (venue_id, creator_id, offer_type, title, description, price, currency, expires_at)
  VALUES
    (p_venue_id, auth.uid(), p_offer_type, p_title, p_description, p_price, p_currency,
     now() + (p_duration_minutes || ' minutes')::interval)
  RETURNING id INTO v_offer_id;

  RETURN v_offer_id;
END;
$$;

-- ============================================
-- 4. Get Active Offers for a Party's Venue
-- ============================================

CREATE OR REPLACE FUNCTION public.get_venue_offers_for_party(p_party_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_venue_id UUID;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.party_participants
    WHERE party_id = p_party_id AND user_id = auth.uid() AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  SELECT venue_id INTO v_venue_id
  FROM public.parties
  WHERE id = p_party_id AND status = 'active';

  IF v_venue_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', vo.id,
      'offer_type', vo.offer_type,
      'title', vo.title,
      'description', vo.description,
      'price', vo.price,
      'currency', vo.currency,
      'expires_at', vo.expires_at,
      'created_at', vo.created_at
    ) ORDER BY vo.created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.venue_offers vo
  WHERE vo.venue_id = v_venue_id
    AND vo.is_active = true
    AND vo.expires_at > now();

  RETURN v_result;
END;
$$;
