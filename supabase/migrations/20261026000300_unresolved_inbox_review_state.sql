-- Preserve approved payments that never resolve to a subscription instead of
-- retrying forever or invalidating them. Declined events keep their terminal
-- invalid state after the reconciliation window.
ALTER TABLE public.pro_unresolved_provider_events
  DROP CONSTRAINT IF EXISTS pro_unresolved_provider_events_status_check;
ALTER TABLE public.pro_unresolved_provider_events
  ADD CONSTRAINT pro_unresolved_provider_events_status_check
  CHECK (status IN ('pending','processing','processed','invalid','needs_review'));

ALTER TABLE public.ai_unresolved_provider_events
  DROP CONSTRAINT IF EXISTS ai_unresolved_provider_events_status_check;
ALTER TABLE public.ai_unresolved_provider_events
  ADD CONSTRAINT ai_unresolved_provider_events_status_check
  CHECK (status IN ('pending','processing','processed','invalid','needs_review'));

CREATE INDEX IF NOT EXISTS idx_pro_unresolved_provider_events_review
  ON public.pro_unresolved_provider_events (created_at)
  WHERE status = 'needs_review';

CREATE INDEX IF NOT EXISTS idx_ai_unresolved_provider_events_review
  ON public.ai_unresolved_provider_events (created_at)
  WHERE status = 'needs_review';

COMMENT ON TABLE public.pro_unresolved_provider_events IS
  'Durable Pro/Plus early-payment inbox; service-role only. approved rows move to needs_review when no link arrives.';
COMMENT ON TABLE public.ai_unresolved_provider_events IS
  'Durable LegalUp AI authorized-payment inbox for provider-link races; service-role only. approved rows move to needs_review when no link arrives.';
