-- H4 hardening: safe recovery, audited requeue and cross-instance lease.
--
-- Fixes found in the H4 review:
--   C1. defer_subscription_event did not increment attempts, so backoff never
--       grew and an event could be deferred forever.
--   C2. recovery must only touch events created for recovery. Historical rows
--       are not automatically replayed, and resource_id is required (the
--       provider_event_id is a notification identity, not a resource id).
--   A4. the recovery tick needs a cross-instance lease so two app instances
--       never process the same batch.
--   A5. terminal `dead` events need an audited, service-role-only requeue path
--       instead of manual SQL.
--
-- Additive over 20261025000000_subscription_event_recovery.sql.

-- ---------------------------------------------------------------------------
-- 1. C2: explicit recovery eligibility
-- ---------------------------------------------------------------------------
-- Existing rows keep false (they predate the hardened recovery contract), so a
-- deploy cannot replay historical events. New rows default to true.
ALTER TABLE public.subscription_events
  ADD COLUMN IF NOT EXISTS recovery_eligible boolean NOT NULL DEFAULT false;

ALTER TABLE public.subscription_events
  ALTER COLUMN recovery_eligible SET DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_subscription_events_recovery_due
  ON public.subscription_events(status, next_attempt_at, lease_expires_at)
  WHERE recovery_eligible = true AND resource_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. C1: defer counts the attempt and backoff/exhaustion follow attempts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.defer_subscription_event(
  p_id uuid,
  p_expected_status text,
  p_expected_attempts integer,
  p_error text,
  p_max_attempts integer DEFAULT 8
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_max integer := GREATEST(COALESCE(p_max_attempts, 8), 1);
BEGIN
  -- A failed/pending row was not counted by claim_subscription_event, so this
  -- defer is the attempt. A processing row with an expired lease was already
  -- counted at claim time; do not double count it.
  WITH target AS (
    SELECT e.id,
           CASE
             WHEN e.status = 'processing' THEN e.attempts
             ELSE e.attempts + 1
           END AS next_attempts
      FROM public.subscription_events e
     WHERE e.id = p_id
       AND e.status = p_expected_status
       AND e.attempts = p_expected_attempts
       AND e.status IN ('pending', 'failed', 'processing')
       AND (
         e.status <> 'processing'
         OR e.lease_expires_at IS NULL
         OR e.lease_expires_at < now()
       )
     FOR UPDATE
  )
  UPDATE public.subscription_events e
     SET attempts = t.next_attempts,
         status = CASE WHEN t.next_attempts >= v_max THEN 'dead' ELSE 'failed' END,
         last_error = left(COALESCE(p_error, 'recovery_deferred'), 2000),
         next_attempt_at = CASE
           WHEN t.next_attempts >= v_max THEN NULL
           ELSE now() + make_interval(
             secs => LEAST(3600, (30 * power(2, GREATEST(t.next_attempts, 1) - 1))::int)
           )
         END,
         dead_at = CASE WHEN t.next_attempts >= v_max THEN now() ELSE NULL END,
         lease_expires_at = NULL,
         claim_token = NULL
    FROM target t
   WHERE e.id = t.id
  RETURNING e.id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. C2: only recovery-eligible rows with a real resource id are listed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recoverable_subscription_events(
  p_limit integer DEFAULT 10,
  p_max_attempts integer DEFAULT 8
)
RETURNS TABLE(
  event_id uuid,
  product_type text,
  subscription_id uuid,
  provider_event_id text,
  event_type text,
  provider_status text,
  resource_id text,
  resource_status text,
  status text,
  attempts integer,
  next_attempt_at timestamptz,
  lease_expires_at timestamptz,
  provider_event_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id,
         e.product_type,
         e.subscription_id,
         e.provider_event_id,
         e.event_type,
         e.provider_status,
         e.resource_id,
         e.resource_status,
         e.status,
         e.attempts,
         e.next_attempt_at,
         e.lease_expires_at,
         e.provider_event_at,
         e.created_at
    FROM public.subscription_events e
   WHERE e.product_type = 'pro'
     AND e.recovery_eligible = true
     AND e.resource_id IS NOT NULL
     AND btrim(e.resource_id) <> ''
     AND e.attempts < GREATEST(COALESCE(p_max_attempts, 8), 1)
     AND (
       (e.status IN ('pending', 'failed')
         AND (e.next_attempt_at IS NULL OR e.next_attempt_at <= now()))
       OR (e.status = 'processing'
         AND (e.lease_expires_at IS NULL OR e.lease_expires_at < now()))
     )
   ORDER BY COALESCE(e.next_attempt_at, e.lease_expires_at, e.created_at), e.created_at
   LIMIT GREATEST(COALESCE(p_limit, 10), 1);
$$;

-- ---------------------------------------------------------------------------
-- 4. A4: cross-instance recovery lease
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_recovery_leases (
  name text PRIMARY KEY,
  holder uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.acquire_subscription_recovery_lease(
  p_name text,
  p_holder uuid,
  p_lease_seconds integer DEFAULT 120
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acquired boolean := false;
BEGIN
  INSERT INTO public.subscription_recovery_leases AS l (name, holder, expires_at, updated_at)
  VALUES (
    p_name,
    p_holder,
    now() + make_interval(secs => GREATEST(COALESCE(p_lease_seconds, 120), 1)),
    now()
  )
  ON CONFLICT (name) DO UPDATE
     SET holder = EXCLUDED.holder,
         expires_at = EXCLUDED.expires_at,
         updated_at = now()
   WHERE l.expires_at < now() OR l.holder = EXCLUDED.holder
  RETURNING true INTO v_acquired;

  RETURN COALESCE(v_acquired, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_subscription_recovery_lease(
  p_name text,
  p_holder uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscription_recovery_leases
     SET expires_at = now(),
         updated_at = now()
   WHERE name = p_name
     AND holder = p_holder;
  RETURN FOUND;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. A5: audited requeue of a terminal dead Pro event
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_event_requeues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.subscription_events(id) ON DELETE CASCADE,
  operator text NOT NULL,
  reason text,
  previous_status text NOT NULL,
  previous_attempts integer NOT NULL,
  requeued_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_event_requeues_event
  ON public.subscription_event_requeues(event_id, requeued_at DESC);

CREATE OR REPLACE FUNCTION public.requeue_subscription_event(
  p_id uuid,
  p_operator text,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_status text;
  v_attempts integer;
  v_product_type text;
BEGIN
  IF p_operator IS NULL OR btrim(p_operator) = '' THEN
    RAISE EXCEPTION 'operator_required' USING ERRCODE = '22023';
  END IF;

  SELECT e.id, e.status, e.attempts, e.product_type
    INTO v_id, v_status, v_attempts, v_product_type
    FROM public.subscription_events e
   WHERE e.id = p_id
   FOR UPDATE;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  -- Requeue is deliberately narrow: only terminal Pro events. Reopening a
  -- live/processed event would break the claim contract.
  IF v_status <> 'dead' OR v_product_type <> 'pro' THEN
    RETURN false;
  END IF;

  UPDATE public.subscription_events
     SET status = 'failed',
         attempts = 0,
         next_attempt_at = now(),
         dead_at = NULL,
         last_error = NULL,
         lease_expires_at = NULL,
         claim_token = NULL,
         recovery_eligible = true
   WHERE id = p_id;

  INSERT INTO public.subscription_event_requeues (
    event_id, operator, reason, previous_status, previous_attempts
  ) VALUES (
    p_id, btrim(p_operator), left(COALESCE(p_reason, ''), 2000), v_status, v_attempts
  );

  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Privileges
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.defer_subscription_event(uuid, text, integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recoverable_subscription_events(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.acquire_subscription_recovery_lease(text, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_subscription_recovery_lease(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.requeue_subscription_event(uuid, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.defer_subscription_event(uuid, text, integer, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.recoverable_subscription_events(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.acquire_subscription_recovery_lease(text, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_subscription_recovery_lease(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.requeue_subscription_event(uuid, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
