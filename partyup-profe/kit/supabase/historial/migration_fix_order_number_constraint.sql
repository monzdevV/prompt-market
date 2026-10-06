-- Fix order_number constraint to accommodate venue + user challenges
-- The original CHECK (order_number BETWEEN 1 AND 3) is too restrictive now that
-- venues can send challenges to parties. Limits are enforced in the RPCs:
--   create_challenge: max 3 per user per party
--   create_venue_challenge: max 5 per venue per day

ALTER TABLE public.party_challenges
  DROP CONSTRAINT IF EXISTS party_challenges_order_number_check;

ALTER TABLE public.party_challenges
  ADD CONSTRAINT party_challenges_order_number_check
  CHECK (order_number BETWEEN 1 AND 50);
