-- ============================================
-- Migration: Verification & Account Types
-- ============================================
-- Adds verification flags, linked venue accounts, and account types.
-- Updates the guard_users_update trigger to also protect new columns.

-- ============================================
-- 1. NEW COLUMNS
-- ============================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'user' CHECK (account_type IN ('user', 'venue'));

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES public.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_linked_user
  ON public.venues(linked_user_id) WHERE linked_user_id IS NOT NULL;

-- ============================================
-- 2. UPDATE GUARD TRIGGER TO PROTECT NEW COLUMNS
-- ============================================

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
  NEW.is_verified := OLD.is_verified;
  NEW.account_type := OLD.account_type;

  RETURN NEW;
END;
$$;
