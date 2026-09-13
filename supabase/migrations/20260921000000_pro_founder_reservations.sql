-- FASE 4.32B.4 — Founder reservation model (intro pricing limited to founder cohort).
-- profiles.is_founder remains the permanent public badge (set only on approved payment).
-- Reservations are transient checkout-time capacity holds, never a badge.

CREATE TABLE IF NOT EXISTS public.pro_founder_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  provider_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pro_founder_reservations ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated: service_role (server) only. Frontend never
-- reads/writes this table; checkout responses carry the authoritative result.

-- Atomic reservation: max 15 CLAIMED founders + valid RESERVED distinct lawyers.
-- Returns 'already_founder' | 'reserved' | 'standard_no_slot'.
CREATE OR REPLACE FUNCTION public.reserve_pro_founder_slot(p_lawyer_id uuid, p_ttl_seconds integer DEFAULT 259200)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_founder boolean;
  v_taken integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('pro_founder_slots'));
  SELECT p.is_founder INTO v_is_founder
    FROM public.profiles p WHERE p.id = p_lawyer_id AND p.role = 'lawyer';
  IF v_is_founder IS NULL THEN
    RETURN 'standard_no_slot'; -- unknown / non-lawyer
  END IF;
  IF v_is_founder THEN
    RETURN 'already_founder';
  END IF;
  -- Recycle expired holds.
  DELETE FROM public.pro_founder_reservations WHERE expires_at <= now();
  -- Same lawyer retry: renew, no new slot.
  IF EXISTS (SELECT 1 FROM public.pro_founder_reservations WHERE lawyer_id = p_lawyer_id AND expires_at > now()) THEN
    UPDATE public.pro_founder_reservations
      SET expires_at = now() + make_interval(secs => GREATEST(p_ttl_seconds, 60))
      WHERE lawyer_id = p_lawyer_id;
    RETURN 'reserved';
  END IF;
  SELECT count(*) INTO v_taken FROM (
    SELECT lawyer_id FROM public.profiles WHERE role = 'lawyer' AND is_founder = true
    UNION
    SELECT lawyer_id FROM public.pro_founder_reservations WHERE expires_at > now()
  ) s;
  IF v_taken >= 15 THEN
    RETURN 'standard_no_slot';
  END IF;
  INSERT INTO public.pro_founder_reservations (lawyer_id, expires_at)
    VALUES (p_lawyer_id, now() + make_interval(secs => GREATEST(p_ttl_seconds, 60)))
    ON CONFLICT (lawyer_id) DO UPDATE
      SET expires_at = EXCLUDED.expires_at;
  RETURN 'reserved';
END;
$$;

-- Commercial capacity for display: claimed + valid reserved.
CREATE OR REPLACE FUNCTION public.pro_founder_capacity()
RETURNS TABLE (claimed integer, reserved integer, remaining integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT count(*)::integer AS n FROM public.profiles WHERE role = 'lawyer' AND is_founder = true
  ),
  r AS (
    SELECT count(*)::integer AS n FROM public.pro_founder_reservations WHERE expires_at > now()
  )
  SELECT c.n, r.n, GREATEST(0, 15 - c.n - r.n) FROM c, r;
$$;

-- SECURITY (§33/§34): profiles.is_founder is commercial authority.
-- Authenticated users can edit their own profile but must NEVER set the flag
-- themselves (INSERT or UPDATE). Service_role (server/webhooks/migrations)
-- and no-JWT contexts (migrations, postgres) are unaffected.
CREATE OR REPLACE FUNCTION public.protect_profiles_is_founder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() ->> 'role') IS NOT NULL
     AND (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_founder := false;
    ELSIF NEW.is_founder IS DISTINCT FROM OLD.is_founder THEN
      NEW.is_founder := OLD.is_founder;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_is_founder ON public.profiles;
CREATE TRIGGER trg_protect_profiles_is_founder
  BEFORE INSERT OR UPDATE OF is_founder ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profiles_is_founder();
