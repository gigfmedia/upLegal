-- FASE 4.57B — multi-tier plan foundation (additive, non-breaking).
--
-- Permits future tier values in lawyer_subscriptions.plan WITHOUT changing
-- any current behavior: default stays 'saas_essential', existing rows are
-- untouched, and Plus remains commercially INACTIVE (fail-closed guards in
-- server/ai/plans.mjs reject it at checkout before any side effect).
--
-- Rollback: re-add the single-value CHECK (plan = 'saas_essential').

ALTER TABLE public.lawyer_subscriptions
  DROP CONSTRAINT IF EXISTS lawyer_subscriptions_plan_check;

ALTER TABLE public.lawyer_subscriptions
  ADD CONSTRAINT lawyer_subscriptions_plan_check
  CHECK (plan IN ('saas_essential', 'pro', 'plus'));
