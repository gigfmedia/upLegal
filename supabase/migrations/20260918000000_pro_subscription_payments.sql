-- FASE 4.28B.2 — Pro subscription payment ledger for intro → standard billing
-- Ledger preserves each recurring billing period, deduplicates via provider_authorized_payment_id,
-- and supports lifetime intro counting (first 3 successful payments = 19.990, 4th+ = 49.990).
CREATE TABLE IF NOT EXISTS public.pro_subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_subscription_id uuid REFERENCES public.lawyer_subscriptions(id) ON DELETE SET NULL,
  lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_authorized_payment_id text NOT NULL UNIQUE,
  provider_payment_id text,
  amount_clp integer NOT NULL CHECK (amount_clp > 0),
  currency text NOT NULL DEFAULT 'CLP',
  status text NOT NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_subscription_payments_lawyer ON public.pro_subscription_payments (lawyer_id, status, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_pro_subscription_payments_subscription ON public.pro_subscription_payments (lawyer_subscription_id);

ALTER TABLE public.pro_subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pro_subscription_payments_owner_select" ON public.pro_subscription_payments;
CREATE POLICY "pro_subscription_payments_owner_select"
ON public.pro_subscription_payments FOR SELECT TO authenticated
USING (auth.uid() = lawyer_id);

-- No INSERT/UPDATE/DELETE for authenticated — service_role only (server)
DROP POLICY IF EXISTS "pro_subscription_payments_no_insert" ON public.pro_subscription_payments;
-- No policy → authenticated cannot insert (default deny)
