-- FASE 3B-1 — LegalUp Pro Entitlement
-- Tabla separada de ai_subscriptions, sin trial

CREATE TABLE IF NOT EXISTS public.lawyer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'saas_essential' CHECK (plan = 'saas_essential'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','cancelled','past_due','expired')),
  provider text NOT NULL DEFAULT 'mercadopago' CHECK (provider = 'mercadopago'),
  provider_subscription_id text,
  amount_clp integer NOT NULL DEFAULT 19990 CHECK (amount_clp >= 0),
  is_founder boolean NOT NULL DEFAULT false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lawyer_subscriptions_one_per_lawyer ON public.lawyer_subscriptions (lawyer_id);

CREATE INDEX IF NOT EXISTS idx_lawyer_subscriptions_status ON public.lawyer_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_lawyer_subscriptions_provider ON public.lawyer_subscriptions (provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;

-- RLS
ALTER TABLE public.lawyer_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lawyer_subscriptions_owner_select" ON public.lawyer_subscriptions;
CREATE POLICY "lawyer_subscriptions_owner_select"
ON public.lawyer_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = lawyer_id);

DROP POLICY IF EXISTS "lawyer_subscriptions_no_insert" ON public.lawyer_subscriptions;
-- No direct insert/update/delete for authenticated — only service_role via backend
-- This ensures status/amount cannot be self-activated

COMMENT ON TABLE public.lawyer_subscriptions IS 'LegalUp Pro entitlement — separate from ai_subscriptions, $19.990 Founder 15';
COMMENT ON COLUMN public.lawyer_subscriptions.is_founder IS 'True if within first 15 founder slots';
