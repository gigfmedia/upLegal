-- FASE 4B-4.1: durable subscription event store for idempotency & ordering
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL CHECK (product_type IN ('ai','pro')),
  subscription_id uuid NOT NULL REFERENCES public.ai_subscriptions(id) ON DELETE CASCADE,
  -- For Pro, subscription_id references lawyer_subscriptions; we use generic uuid + check via trigger not FK to keep single table
  -- Instead, store as text reference and enforce via application; use separate columns for each product
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_event_id text NOT NULL,
  provider_event_at timestamptz,
  event_type text NOT NULL,
  provider_status text,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Generic subscription_events for both AI and Pro with product-specific FKs via separate table is complex;
-- Simplify: create two tables, one per product, to keep FK integrity.

DROP TABLE IF EXISTS public.subscription_events;
CREATE TABLE public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL CHECK (product_type IN ('ai','pro')),
  subscription_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_event_id text NOT NULL,
  provider_event_at timestamptz,
  event_type text NOT NULL,
  provider_status text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_event_id, product_type)
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_product_subscription ON public.subscription_events(product_type, subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_provider_at ON public.subscription_events(provider_event_at);

COMMENT ON TABLE public.subscription_events IS 'FASE 4B-4.1: idempotent provider event log for AI/Pro entitlement';
