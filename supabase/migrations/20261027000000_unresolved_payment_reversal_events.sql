-- Neutral durable review inbox for payment reversals that cannot be safely
-- assigned to AI, Pro/Plus or company state.
--
-- This table never grants or revokes access and never mutates the financial
-- ledger. It only preserves provider evidence for manual review when product
-- classification is missing or untrusted (preapproval 404, missing
-- preapproval_id, or an unclassified external_reference).
CREATE TABLE IF NOT EXISTS public.unresolved_payment_reversal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_event_id text NOT NULL,
  provider_payment_id text NOT NULL,
  preapproval_id text,
  external_reference text,
  provider_status text NOT NULL CHECK (provider_status IN ('cancelled', 'refunded', 'charged_back')),
  review_reason text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'reviewed', 'dismissed')),
  reviewed_at timestamptz,
  reviewed_by text,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_unresolved_payment_reversal_events_review
  ON public.unresolved_payment_reversal_events (created_at)
  WHERE status = 'needs_review';

CREATE INDEX IF NOT EXISTS idx_unresolved_payment_reversal_events_payment
  ON public.unresolved_payment_reversal_events (provider, provider_payment_id);

ALTER TABLE public.unresolved_payment_reversal_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.unresolved_payment_reversal_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.unresolved_payment_reversal_events TO service_role;

COMMENT ON TABLE public.unresolved_payment_reversal_events IS
  'Neutral service-role-only review inbox for refunds/chargebacks whose product route is missing or untrusted. No entitlement or ledger side effects.';
COMMENT ON COLUMN public.unresolved_payment_reversal_events.provider_event_id IS
  'Idempotency key: <provider_payment_id>:<provider_status>.';
COMMENT ON COLUMN public.unresolved_payment_reversal_events.review_reason IS
  'Why product-safe routing was impossible: preapproval_not_found, missing_preapproval_id or unclassified_product.';
