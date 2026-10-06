-- ============================================
-- Migration: Sync Premium Status (server-only RPC)
-- ============================================
-- Provides a SECURITY DEFINER function that only the service role
-- (Edge Functions, webhooks) can call. It bypasses the guarded
-- triggers on users and parties so the premium flag can be updated
-- from trusted server-side code without opening a client-side hole.

CREATE OR REPLACE FUNCTION public.admin_sync_premium_status(
  p_user_id UUID,
  p_is_premium BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow server-side calls (service_role_key has no JWT)
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Unauthorized: server-only function';
  END IF;

  PERFORM set_config('app.bypass_rls_checks', 'true', true);

  UPDATE public.users
  SET is_premium = p_is_premium
  WHERE id = p_user_id;

  UPDATE public.parties
  SET creator_is_pro = p_is_premium
  WHERE creator_id = p_user_id
    AND status = 'active';
END;
$$;
