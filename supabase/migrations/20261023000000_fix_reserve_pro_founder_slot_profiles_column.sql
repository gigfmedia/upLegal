-- FASE 4.32B.4-fix — reserve_pro_founder_slot referenced a non-existent column.
--
-- Root cause: the claimed-founders count did `SELECT lawyer_id FROM
-- public.profiles`, but `profiles` has no `lawyer_id` column (its key is
-- `id`; `pro_founder_reservations.lawyer_id` references `profiles(id)`).
-- Postgres raised 42703 "column \"lawyer_id\" does not exist" as soon as an
-- eligible (existing, non-founder) lawyer reached the capacity count, making
-- every real checkout fail with FOUNDER_RESERVATION_FAILED. The unknown /
-- non-lawyer path returned at the first SELECT and never hit the bug.
--
-- Idempotent (CREATE OR REPLACE). Behavior is otherwise byte-identical:
-- same max-15 cap, same advisory lock serialization, same expiry recycling,
-- same same-lawyer renewal, same ON CONFLICT upsert, same return values.
-- No data migration, no destructive change. ACL posture unchanged.
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
    SELECT id AS lawyer_id FROM public.profiles WHERE role = 'lawyer' AND is_founder = true
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

COMMENT ON FUNCTION public.reserve_pro_founder_slot(uuid, integer) IS
  'FASE 4.32B.4-fix: atomic Founder reservation (max 15 claimed+reserved). Counts claimed founders by profiles.id (was wrongly profiles.lawyer_id).';
