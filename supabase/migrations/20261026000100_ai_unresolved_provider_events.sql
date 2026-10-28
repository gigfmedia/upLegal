-- Durable inbox for LegalUp AI authorized payments that arrive before the
-- ai_subscriptions row has persisted its provider_subscription_id.
-- Deliberately separate from the Pro/Plus inbox: AI recovery may only resolve
-- ai_subscriptions and never enters Pro/Plus processing.
-- Service-role only: RLS is enabled with no client policies.
CREATE TABLE IF NOT EXISTS public.ai_unresolved_provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_event_id text NOT NULL,
  event_kind text NOT NULL CHECK (event_kind IN ('authorized_payment')),
  preapproval_id text NOT NULL,
  lawyer_id text,
  provider_status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','processed','invalid')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id, event_kind)
);

CREATE INDEX IF NOT EXISTS idx_ai_unresolved_provider_events_recovery
  ON public.ai_unresolved_provider_events (created_at)
  WHERE status IN ('pending', 'processing');

ALTER TABLE public.ai_unresolved_provider_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_unresolved_provider_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.ai_unresolved_provider_events TO service_role;

COMMENT ON TABLE public.ai_unresolved_provider_events IS
  'Durable LegalUp AI authorized-payment inbox for provider-link races; service-role only.';
