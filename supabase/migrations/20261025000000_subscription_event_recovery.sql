-- H4: recover stuck subscription events and terminalize exhausted work.
--
-- FASE 4.59 made event claims atomic and moved external effects to an outbox,
-- but recovery still depended on MercadoPago redelivering the same webhook.
-- This migration adds:
--   1. a terminal `dead` event state plus `next_attempt_at`/`dead_at`,
--   2. bounded attempts and exponential backoff for events,
--   3. a read-only list of due recoverable Pro events,
--   4. guarded defer/supersede RPCs for the recovery worker,
--   5. terminalization of events/effects that exhausted their attempts,
--   6. a small status snapshot for operational logs.
--
-- It is additive over 20261024000000_subscription_events_atomic_claim.sql.

-- ---------------------------------------------------------------------------
-- 1. Event recovery state
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscription_events
  DROP CONSTRAINT IF EXISTS subscription_events_status_check;
ALTER TABLE public.subscription_events
  ADD CONSTRAINT subscription_events_status_check
  CHECK (status IN ('pending','processing','processed','failed','dead'));

ALTER TABLE public.subscription_events
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS dead_at timestamptz;

ALTER TABLE public.subscription_events
  ALTER COLUMN next_attempt_at DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_events_recoverable
  ON public.subscription_events(status, next_attempt_at, lease_expires_at)
  WHERE status IN ('pending','failed','processing');

-- ---------------------------------------------------------------------------
-- 2. Claim: bounded attempts, backoff, terminal exhaustion
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.claim_subscription_event(text, text, text, integer);

CREATE OR REPLACE FUNCTION public.claim_subscription_event(
  p_provider text,
  p_event_id text,
  p_product_type text,
  p_lease_seconds integer DEFAULT 600,
  p_max_attempts integer DEFAULT 8
)
RETURNS TABLE(claimed boolean, reason text, event_id uuid, claim_token uuid, attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_token uuid;
  v_attempts integer;
  v_status text;
  v_next_attempt_at timestamptz;
  v_lease_expires_at timestamptz;
  v_max integer := GREATEST(COALESCE(p_max_attempts, 8), 1);
BEGIN
  -- A crashed worker can leave an expired processing row at the attempt limit.
  -- Terminalize it before deciding whether this delivery may claim.
  UPDATE public.subscription_events e
     SET status = 'dead',
         dead_at = now(),
         last_error = left(COALESCE(e.last_error, 'max_attempts_exhausted'), 2000),
         lease_expires_at = NULL,
         claim_token = NULL,
         next_attempt_at = NULL
   WHERE e.provider = p_provider
     AND e.provider_event_id = p_event_id
     AND e.product_type = p_product_type
     AND e.status IN ('pending', 'failed', 'processing')
     AND e.attempts >= v_max
     AND (
       e.status <> 'processing'
       OR e.lease_expires_at IS NULL
       OR e.lease_expires_at < now()
     );

  UPDATE public.subscription_events e
     SET status = 'processing',
         claimed_at = now(),
         lease_expires_at = now() + make_interval(secs => GREATEST(p_lease_seconds, 1)),
         claim_token = gen_random_uuid(),
         attempts = e.attempts + 1,
         last_error = NULL,
         next_attempt_at = NULL
   WHERE e.provider = p_provider
     AND e.provider_event_id = p_event_id
     AND e.product_type = p_product_type
     AND e.attempts < v_max
     AND (
       (e.status IN ('pending', 'failed')
         AND (e.next_attempt_at IS NULL OR e.next_attempt_at <= now()))
       OR (e.status = 'processing'
         AND (e.lease_expires_at IS NULL OR e.lease_expires_at < now()))
     )
  RETURNING e.id, e.claim_token, e.attempts INTO v_id, v_token, v_attempts;

  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT true, 'claimed'::text, v_id, v_token, v_attempts;
    RETURN;
  END IF;

  SELECT e.id, e.attempts, e.status, e.next_attempt_at, e.lease_expires_at
    INTO v_id, v_attempts, v_status, v_next_attempt_at, v_lease_expires_at
    FROM public.subscription_events e
   WHERE e.provider = p_provider
     AND e.provider_event_id = p_event_id
     AND e.product_type = p_product_type;

  IF v_id IS NULL THEN
    RETURN QUERY SELECT false, 'not_found'::text, NULL::uuid, NULL::uuid, 0;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT false,
           CASE
             WHEN v_status = 'processing'
               AND (v_lease_expires_at IS NULL OR v_lease_expires_at >= now())
               THEN 'busy'
             WHEN v_status IN ('pending', 'failed')
               AND v_next_attempt_at IS NOT NULL
               AND v_next_attempt_at > now()
               THEN 'backoff'
             ELSE 'terminal'
           END::text,
           v_id,
           NULL::uuid,
           v_attempts;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_subscription_event(
  p_provider text,
  p_event_id text,
  p_product_type text,
  p_claim_token uuid,
  p_effects jsonb DEFAULT '[]'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_inserted integer := 0;
BEGIN
  UPDATE public.subscription_events e
     SET status = 'processed',
         processed_at = now(),
         effects_at = now(),
         lease_expires_at = NULL,
         last_error = NULL,
         claim_token = NULL,
         next_attempt_at = NULL,
         dead_at = NULL
   WHERE e.provider = p_provider
     AND e.provider_event_id = p_event_id
     AND e.product_type = p_product_type
     AND e.status = 'processing'
     AND e.claim_token = p_claim_token
  RETURNING e.id INTO v_id;

  IF v_id IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.subscription_effects (
    product_type, subscription_id, event_id, effect_type, transition_key, payload
  )
  SELECT e.product_type, e.subscription_id, e.id, x.effect_type, x.transition_key, COALESCE(x.payload, '{}'::jsonb)
    FROM public.subscription_events e
    CROSS JOIN jsonb_to_recordset(COALESCE(p_effects, '[]'::jsonb))
      AS x(effect_type text, transition_key text, payload jsonb)
   WHERE e.id = v_id
  ON CONFLICT (product_type, subscription_id, effect_type, transition_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

DROP FUNCTION IF EXISTS public.fail_subscription_event(text, text, text, uuid, text);

CREATE OR REPLACE FUNCTION public.fail_subscription_event(
  p_provider text,
  p_event_id text,
  p_product_type text,
  p_claim_token uuid,
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
  UPDATE public.subscription_events e
     SET status = CASE WHEN e.attempts >= v_max THEN 'dead' ELSE 'failed' END,
         last_error = left(COALESCE(p_error, 'unknown'), 2000),
         next_attempt_at = CASE
           WHEN e.attempts >= v_max THEN NULL
           ELSE now() + make_interval(
             secs => LEAST(3600, (30 * power(2, GREATEST(e.attempts, 1) - 1))::int)
           )
         END,
         dead_at = CASE WHEN e.attempts >= v_max THEN now() ELSE NULL END,
         lease_expires_at = NULL,
         claim_token = NULL
   WHERE e.provider = p_provider
     AND e.provider_event_id = p_event_id
     AND e.product_type = p_product_type
     AND e.status = 'processing'
     AND e.claim_token = p_claim_token
  RETURNING e.id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Recovery worker primitives
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
  UPDATE public.subscription_events e
     SET status = CASE WHEN e.attempts >= v_max THEN 'dead' ELSE 'failed' END,
         last_error = left(COALESCE(p_error, 'recovery_deferred'), 2000),
         next_attempt_at = CASE
           WHEN e.attempts >= v_max THEN NULL
           ELSE now() + make_interval(
             secs => LEAST(3600, (30 * power(2, GREATEST(e.attempts, 1) - 1))::int)
           )
         END,
         dead_at = CASE WHEN e.attempts >= v_max THEN now() ELSE NULL END,
         lease_expires_at = NULL,
         claim_token = NULL
   WHERE e.id = p_id
     AND e.status = p_expected_status
     AND e.attempts = p_expected_attempts
     AND e.status IN ('pending', 'failed', 'processing')
     AND (
       e.status <> 'processing'
       OR e.lease_expires_at IS NULL
       OR e.lease_expires_at < now()
     )
  RETURNING e.id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.supersede_subscription_event(
  p_id uuid,
  p_expected_status text,
  p_expected_attempts integer,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE public.subscription_events e
     SET status = 'dead',
         last_error = left('superseded:' || COALESCE(p_reason, 'resolved'), 2000),
         dead_at = now(),
         next_attempt_at = NULL,
         lease_expires_at = NULL,
         claim_token = NULL
   WHERE e.id = p_id
     AND e.status = p_expected_status
     AND e.attempts = p_expected_attempts
     AND e.status IN ('pending', 'failed', 'processing')
     AND (
       e.status <> 'processing'
       OR e.lease_expires_at IS NULL
       OR e.lease_expires_at < now()
     )
  RETURNING e.id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_subscription_events(p_max_attempts integer DEFAULT 8)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.subscription_events e
     SET status = 'dead',
         dead_at = now(),
         last_error = left(COALESCE(e.last_error, 'max_attempts_exhausted'), 2000),
         next_attempt_at = NULL,
         lease_expires_at = NULL,
         claim_token = NULL
   WHERE e.status IN ('pending', 'failed', 'processing')
     AND e.attempts >= GREATEST(COALESCE(p_max_attempts, 8), 1)
     AND (
       e.status <> 'processing'
       OR e.lease_expires_at IS NULL
       OR e.lease_expires_at < now()
     );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_subscription_effects(p_max_attempts integer DEFAULT 8)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.subscription_effects e
     SET status = 'dead',
         last_error = left(COALESCE(e.last_error, 'max_attempts_exhausted'), 2000),
         next_attempt_at = now(),
         lease_expires_at = NULL,
         claim_token = NULL
   WHERE e.status IN ('pending', 'failed', 'processing')
     AND e.attempts >= GREATEST(COALESCE(p_max_attempts, 8), 1)
     AND (
       e.status <> 'processing'
       OR e.lease_expires_at IS NULL
       OR e.lease_expires_at < now()
     );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.subscription_recovery_status()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'events', jsonb_build_object(
      'pending', (SELECT count(*) FROM public.subscription_events WHERE status = 'pending'),
      'processing', (SELECT count(*) FROM public.subscription_events WHERE status = 'processing'),
      'processed', (SELECT count(*) FROM public.subscription_events WHERE status = 'processed'),
      'failed', (SELECT count(*) FROM public.subscription_events WHERE status = 'failed'),
      'dead', (SELECT count(*) FROM public.subscription_events WHERE status = 'dead'),
      'expired_leases', (
        SELECT count(*) FROM public.subscription_events
         WHERE status = 'processing'
           AND (lease_expires_at IS NULL OR lease_expires_at < now())
      ),
      'oldest_due_at', (
        SELECT min(COALESCE(next_attempt_at, created_at))
          FROM public.subscription_events
         WHERE status IN ('pending', 'failed')
           AND (next_attempt_at IS NULL OR next_attempt_at <= now())
      )
    ),
    'effects', jsonb_build_object(
      'pending', (SELECT count(*) FROM public.subscription_effects WHERE status = 'pending'),
      'processing', (SELECT count(*) FROM public.subscription_effects WHERE status = 'processing'),
      'sent', (SELECT count(*) FROM public.subscription_effects WHERE status = 'sent'),
      'failed', (SELECT count(*) FROM public.subscription_effects WHERE status = 'failed'),
      'dead', (SELECT count(*) FROM public.subscription_effects WHERE status = 'dead'),
      'expired_leases', (
        SELECT count(*) FROM public.subscription_effects
         WHERE status = 'processing'
           AND (lease_expires_at IS NULL OR lease_expires_at < now())
      ),
      'oldest_due_at', (
        SELECT min(COALESCE(next_attempt_at, created_at))
          FROM public.subscription_effects
         WHERE status IN ('pending', 'failed')
           AND (next_attempt_at IS NULL OR next_attempt_at <= now())
      )
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Privileges
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.claim_subscription_event(text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_subscription_event(text, text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_subscription_event(text, text, text, uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recoverable_subscription_events(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.defer_subscription_event(uuid, text, integer, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.supersede_subscription_event(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_subscription_events(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_subscription_effects(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subscription_recovery_status() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_subscription_event(text, text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_subscription_event(text, text, text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_subscription_event(text, text, text, uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.recoverable_subscription_events(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.defer_subscription_event(uuid, text, integer, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.supersede_subscription_event(uuid, text, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_subscription_events(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_subscription_effects(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.subscription_recovery_status() TO service_role;

NOTIFY pgrst, 'reload schema';
