-- Idempotency/ordering ledger hardening.
-- 1) Service-role only: this table is written exclusively by provider webhooks.
-- 2) Add atomic claim + review states used by the concurrent webhook paths.
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.subscription_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.subscription_events TO service_role;

ALTER TABLE public.subscription_events
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_reason text;

ALTER TABLE public.subscription_events
  DROP CONSTRAINT IF EXISTS subscription_events_status_check;
ALTER TABLE public.subscription_events
  ADD CONSTRAINT subscription_events_status_check
  CHECK (status IN ('pending','processing','processed','failed','needs_review'));

CREATE INDEX IF NOT EXISTS idx_subscription_events_claim_recovery
  ON public.subscription_events (created_at)
  WHERE status IN ('pending', 'processing');

COMMENT ON COLUMN public.subscription_events.claimed_at IS
  'Lease timestamp for the delivery currently processing this event.';
COMMENT ON COLUMN public.subscription_events.review_reason IS
  'Operational review reason for events whose financial/business policy is not automated.';
