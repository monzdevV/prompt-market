-- ============================================
-- Migration: Offer Tickets
-- ============================================
-- Per-user, per-offer tickets that are automatically created when a
-- venue publishes an offer. Tickets can be redeemed once (torn) and
-- are validated server-side to prevent fraud.

-- ============================================
-- 1. Offer Tickets Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.offer_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES public.venue_offers(id) ON DELETE CASCADE NOT NULL,
  party_id UUID REFERENCES public.parties(id) NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  is_redeemed BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(offer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_offer_tickets_party_user
  ON public.offer_tickets(party_id, user_id);
CREATE INDEX IF NOT EXISTS idx_offer_tickets_offer
  ON public.offer_tickets(offer_id);

ALTER TABLE public.offer_tickets ENABLE ROW LEVEL SECURITY;

-- Users can only read their own tickets
DROP POLICY IF EXISTS "Users can read own tickets" ON public.offer_tickets;
CREATE POLICY "Users can read own tickets"
  ON public.offer_tickets FOR SELECT
  USING (user_id = auth.uid());

-- Only the system (trigger / SECURITY DEFINER) inserts tickets
DROP POLICY IF EXISTS "System inserts tickets" ON public.offer_tickets;
CREATE POLICY "System inserts tickets"
  ON public.offer_tickets FOR INSERT
  WITH CHECK (false);

-- Direct updates are blocked; redemption goes through the RPC
DROP POLICY IF EXISTS "Block direct updates" ON public.offer_tickets;
CREATE POLICY "Block direct updates"
  ON public.offer_tickets FOR UPDATE
  USING (false);

-- ============================================
-- 2. Trigger: Auto-create tickets on new offer
-- ============================================
-- When a venue_offer is inserted, create one offer_ticket per active
-- participant in every active party at that venue (same 3-day window
-- used by notify-venue-offer).

CREATE OR REPLACE FUNCTION public.auto_create_offer_tickets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_venue_id UUID;
  v_party RECORD;
BEGIN
  SELECT venue_id INTO v_venue_id
  FROM public.venue_offers
  WHERE id = NEW.id;

  FOR v_party IN
    SELECT id FROM public.parties
    WHERE venue_id = v_venue_id
      AND status = 'active'
      AND created_at >= now() - interval '3 days'
  LOOP
    INSERT INTO public.offer_tickets (offer_id, party_id, user_id)
    SELECT NEW.id, v_party.id, pp.user_id
    FROM public.party_participants pp
    WHERE pp.party_id = v_party.id
      AND pp.is_active = true
    ON CONFLICT (offer_id, user_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_offer_tickets ON public.venue_offers;
CREATE TRIGGER trg_auto_create_offer_tickets
  AFTER INSERT ON public.venue_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_offer_tickets();

-- ============================================
-- 3. RPC: Redeem an offer ticket
-- ============================================
-- Atomic redemption with 5 validation checks:
--   1. Ticket belongs to caller
--   2. Not already redeemed
--   3. Offer has not expired
--   4. Party is still active
--   5. User is an active participant

CREATE OR REPLACE FUNCTION public.redeem_offer_ticket(p_ticket_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ticket RECORD;
  v_offer RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_ticket
  FROM public.offer_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  IF v_ticket.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_ticket.is_redeemed THEN
    RAISE EXCEPTION 'Ticket already redeemed';
  END IF;

  SELECT * INTO v_offer
  FROM public.venue_offers
  WHERE id = v_ticket.offer_id;

  IF v_offer.expires_at <= now() THEN
    RAISE EXCEPTION 'Offer has expired';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.parties
    WHERE id = v_ticket.party_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Party is no longer active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.party_participants
    WHERE party_id = v_ticket.party_id
      AND user_id = auth.uid()
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not an active participant';
  END IF;

  UPDATE public.offer_tickets
  SET is_redeemed = true, redeemed_at = now()
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object(
    'id', v_ticket.id,
    'offer_id', v_ticket.offer_id,
    'party_id', v_ticket.party_id,
    'user_id', v_ticket.user_id,
    'is_redeemed', true,
    'redeemed_at', now(),
    'created_at', v_ticket.created_at,
    'offer_type', v_offer.offer_type,
    'title', v_offer.title,
    'description', v_offer.description,
    'price', v_offer.price,
    'currency', v_offer.currency,
    'expires_at', v_offer.expires_at
  );
END;
$$;

-- ============================================
-- 4. RPC: Get tickets for a party
-- ============================================
-- Returns all of the caller's tickets in a party with offer details.

CREATE OR REPLACE FUNCTION public.get_offer_tickets_for_party(p_party_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
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

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ot.id,
      'offer_id', ot.offer_id,
      'party_id', ot.party_id,
      'user_id', ot.user_id,
      'is_redeemed', ot.is_redeemed,
      'redeemed_at', ot.redeemed_at,
      'created_at', ot.created_at,
      'offer_type', vo.offer_type,
      'title', vo.title,
      'description', vo.description,
      'price', vo.price,
      'currency', vo.currency,
      'expires_at', vo.expires_at
    ) ORDER BY ot.created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.offer_tickets ot
  INNER JOIN public.venue_offers vo ON vo.id = ot.offer_id
  WHERE ot.party_id = p_party_id
    AND ot.user_id = auth.uid();

  RETURN v_result;
END;
$$;

-- ============================================
-- 5. Update admin_cleanup_for_deletion
-- ============================================
-- Invalidate unredeemed tickets when a user deletes their account.

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

    -- Invalidate unredeemed offer tickets for parties being ended
    UPDATE public.offer_tickets
    SET is_redeemed = true, redeemed_at = now()
    WHERE party_id = v_party.id AND is_redeemed = false;

    UPDATE public.parties SET status = 'ended', ended_at = now() WHERE id = v_party.id;

    UPDATE public.party_participants SET is_active = false WHERE party_id = v_party.id;
  END LOOP;

  UPDATE public.party_participants SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;

  -- Invalidate any remaining unredeemed tickets owned by the deleted user
  UPDATE public.offer_tickets
  SET is_redeemed = true, redeemed_at = now()
  WHERE user_id = p_user_id AND is_redeemed = false;

  DELETE FROM public.push_tokens WHERE user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_cleanup_for_deletion(UUID) FROM authenticated, anon;

-- ============================================
-- 6. Enable Realtime for offer_tickets
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.offer_tickets;
