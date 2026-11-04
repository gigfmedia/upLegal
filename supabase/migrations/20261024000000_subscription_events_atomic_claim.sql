-- FASE 4.59: atomic claim + effect outbox for subscription webhooks.
--
-- Problem: the previous model inserted a `pending` row and then decided from a
-- read whether to proceed. Two concurrent deliveries can both read the same
-- retryable row and both apply the mutation. `RETRY_LEASE_MS` was a heuristic,
-- not mutual exclusion, and a crash between the mutation and the "processed"
-- write left no way to tell whether external effects already ran.
--
-- This migration adds:
--   1. a real `processing` claim state with a lease,
--   2. a single-statement atomic claim RPC,
--   3. notification/resource/status/transition identity columns,
--   4. a `subscription_effects` outbox so external effects (email/analytics)
--      are enqueued atomically with "processed" and retried independently.
--
-- It is additive and safe to run over existing rows: legacy rows keep their
-- status (pending/processed/failed) and simply become claimable.

-- ---------------------------------------------------------------------------
-- 1. Event claim state
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscription_events
  DROP CONSTRAINT IF EXISTS subscription_events_status_check;
ALTER TABLE public.subscription_events
  ADD CONSTRAINT subscription_events_status_check
  CHECK (status IN ('pending','processing','processed','failed'));

ALTER TABLE public.subscription_events
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  -- Fencing token: identifies the winning claim. complete/fail require it, so a
  -- worker whose lease expired can never overwrite a newer worker's outcome.
  ADD COLUMN IF NOT EXISTS claim_token uuid,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  -- Notification identity (webhook delivery). provider_event_id remains the
  -- legacy/compat identity; notification_id is the provider's delivery id when
  -- the caller knows it. Never used to dedupe effects.
  ADD COLUMN IF NOT EXISTS notification_id text,
  -- Resource identity (the provider object that changed, e.g. the preapproval
  -- or payment id) and the resulting resource status.
  ADD COLUMN IF NOT EXISTS resource_id text,
  ADD COLUMN IF NOT EXISTS resource_status text,
  -- Transition identity used only to dedupe effects, never notifications.
  ADD COLUMN IF NOT EXISTS transition_key text,
  ADD COLUMN IF NOT EXISTS effects_at timestamptz;

-- One audit row per provider delivery when the delivery id is known. Partial so
-- legacy/existing rows with NULL notification_id are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_events_notification
  ON public.subscription_events(provider, product_type, notification_id)
  WHERE notification_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_events_claimable
  ON public.subscription_events(status, lease_expires_at);

-- ---------------------------------------------------------------------------
-- 2. Atomic claim
-- ---------------------------------------------------------------------------
-- A single UPDATE is the claim. Concurrent callers cannot both win: after the
-- first commits, the row is `processing` with a fresh lease, so the second
-- UPDATE matches zero rows and reports `busy`.
DROP FUNCTION IF EXISTS public.claim_subscription_event(text, text, text, integer);
DROP FUNCTION IF EXISTS public.complete_subscription_event(text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.fail_subscription_event(text, text, text, text);
DROP FUNCTION IF EXISTS public.claim_subscription_effect(integer, integer);
DROP FUNCTION IF EXISTS public.complete_subscription_effect(uuid);
DROP FUNCTION IF EXISTS public.fail_subscription_effect(uuid, text, integer, integer);

CREATE OR REPLACE FUNCTION public.claim_subscription_event(
  p_provider text,
  p_event_id text,
  p_product_type text,
  p_lease_seconds integer DEFAULT 600
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
BEGIN
  UPDATE public.subscription_events e
     SET status = 'processing',
         claimed_at = now(),
         lease_expires_at = now() + make_interval(secs => GREATEST(p_lease_seconds, 1)),
         claim_token = gen_random_uuid(),
         attempts = e.attempts + 1,
         last_error = NULL
   WHERE e.provider = p_provider
     AND e.provider_event_id = p_event_id
     AND e.product_type = p_product_type
     AND (
       e.status IN ('pending', 'failed')
       OR (e.status = 'processing' AND (e.lease_expires_at IS NULL OR e.lease_expires_at < now()))
     )
  RETURNING e.id, e.claim_token, e.attempts INTO v_id, v_token, v_attempts;

  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT true, 'claimed'::text, v_id, v_token, v_attempts;
    RETURN;
  END IF;

  SELECT e.id, e.attempts INTO v_id, v_attempts
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
             WHEN e.status = 'processing' THEN 'busy'
             WHEN e.status = 'processed' THEN 'terminal'
             ELSE 'terminal'
           END::text,
           e.id,
           e.claim_token,
           e.attempts
      FROM public.subscription_events e
     WHERE e.id = v_id;
END;
$$;

-- Complete the event AND enqueue its external effects in one transaction.
-- Because "processed" and the effect rows commit together, a worker crash after
-- this point cannot re-run the orchestrator: the drainer owns retries.
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
         claim_token = NULL
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

CREATE OR REPLACE FUNCTION public.fail_subscription_event(
  p_provider text,
  p_event_id text,
  p_product_type text,
  p_claim_token uuid,
  p_error text
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
     SET status = 'failed',
         last_error = left(COALESCE(p_error, 'unknown'), 2000),
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
-- 3. Effect outbox
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL CHECK (product_type IN ('ai', 'pro')),
  subscription_id uuid NOT NULL,
  event_id uuid REFERENCES public.subscription_events(id) ON DELETE SET NULL,
  effect_type text NOT NULL,
  -- Deterministic transition identity, e.g. "<preapproval_id>:authorized" or
  -- "payment:<payment_id>". Deliberately NOT the notification identity: the
  -- same transition delivered twice must enqueue once, while a different
  -- transition (e.g. paused -> authorized) gets its own key.
  transition_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','sent','failed','dead')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  claim_token uuid,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_type, subscription_id, effect_type, transition_key)
);

CREATE INDEX IF NOT EXISTS idx_subscription_effects_due
  ON public.subscription_effects(status, next_attempt_at);

COMMENT ON TABLE public.subscription_effects IS
  'FASE 4.59: external effect outbox. Enqueued transactionally with the processed event; drained at-least-once';

-- Atomic claim of the next due effect (queue pattern: SKIP LOCKED).
CREATE OR REPLACE FUNCTION public.claim_subscription_effect(
  p_lease_seconds integer DEFAULT 120,
  p_max_attempts integer DEFAULT 8
)
RETURNS TABLE(
  effect_id uuid,
  product_type text,
  subscription_id uuid,
  effect_type text,
  transition_key text,
  payload jsonb,
  claim_token uuid,
  attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  WITH candidate AS (
    SELECT e.id
      FROM public.subscription_effects e
     WHERE (
             (e.status IN ('pending', 'failed') AND e.next_attempt_at <= now())
             OR (e.status = 'processing' AND (e.lease_expires_at IS NULL OR e.lease_expires_at < now()))
           )
       AND e.attempts < p_max_attempts
     ORDER BY e.next_attempt_at, e.created_at
     FOR UPDATE SKIP LOCKED
     LIMIT 1
  )
  UPDATE public.subscription_effects e
     SET status = 'processing',
         claimed_at = now(),
         lease_expires_at = now() + make_interval(secs => GREATEST(p_lease_seconds, 1)),
         claim_token = gen_random_uuid(),
         attempts = e.attempts + 1,
         last_error = NULL
    FROM candidate c
   WHERE e.id = c.id
  RETURNING e.id INTO v_id;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT e.id, e.product_type, e.subscription_id, e.effect_type,
           e.transition_key, e.payload, e.claim_token, e.attempts
      FROM public.subscription_effects e
     WHERE e.id = v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_subscription_effect(p_id uuid, p_claim_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE public.subscription_effects e
     SET status = 'sent', sent_at = now(), lease_expires_at = NULL, last_error = NULL, claim_token = NULL
   WHERE e.id = p_id AND e.status = 'processing' AND e.claim_token = p_claim_token
  RETURNING e.id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_subscription_effect(
  p_id uuid,
  p_claim_token uuid,
  p_error text,
  p_backoff_seconds integer DEFAULT 60,
  p_max_attempts integer DEFAULT 8
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE public.subscription_effects e
     SET status = CASE WHEN e.attempts >= p_max_attempts THEN 'dead' ELSE 'failed' END,
         last_error = left(COALESCE(p_error, 'unknown'), 2000),
         next_attempt_at = now() + make_interval(secs => GREATEST(p_backoff_seconds, 1)),
         lease_expires_at = NULL,
         claim_token = NULL
   WHERE e.id = p_id AND e.status = 'processing' AND e.claim_token = p_claim_token
  RETURNING e.id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;

-- Only the server (service role) needs these; they are SECURITY DEFINER and
-- must not be callable by anon/authenticated.
REVOKE ALL ON FUNCTION public.claim_subscription_event(text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_subscription_event(text, text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_subscription_event(text, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_subscription_effect(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_subscription_effect(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_subscription_effect(uuid, uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_subscription_event(text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_subscription_event(text, text, text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_subscription_event(text, text, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_subscription_effect(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_subscription_effect(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_subscription_effect(uuid, uuid, text, integer, integer) TO service_role;

-- The outbox holds ids/payloads only (no email address), but it still must not
-- be readable by anon/authenticated. RLS with no policies + service_role
-- (BYPASSRLS) keeps it server-only.
ALTER TABLE public.subscription_effects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_effects FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscription_effects TO service_role;
