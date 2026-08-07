-- LegalUp AI — renombra el plan `pro` → `essential`.
--
-- El plan vigente (un solo nivel, trial + facturación) se llamaba `pro` en
-- código y en datos persistidos, pero en realidad es el plan base/estándar.
-- En el futuro existirá un plan `pro` aparte y más caro, por lo que se reserva
-- ese nombre. Este plan pasa a llamarse `essential`.
--
-- Partes:
--   1) Elimina el CHECK existente sobre `plan` (ai_subscriptions_plan_check)
--      que aún solo admite 'pro'/'base'; sin esto el UPDATE choca (23514).
--   2) Normaliza las filas existentes: `plan = 'pro'/'base'` → `plan = 'essential'`.
--   3) Actualiza el DEFAULT de la columna para concordar con el código
--      (AI_SUBSCRIPTION_PLAN = 'essential').
--   4) Recrea el CHECK admitiendo el catálogo vigente.

-- 1) Quitar el CHECK que restringe los valores de plan.
ALTER TABLE public.ai_subscriptions DROP CONSTRAINT IF EXISTS ai_subscriptions_plan_check;

-- 2) Migración de datos: 'pro'/'base' → 'essential'.
UPDATE public.ai_subscriptions
  SET plan = 'essential',
      updated_at = now()
  WHERE plan IN ('pro', 'base');

-- 3) DEFAULT coherente con el código.
ALTER TABLE public.ai_subscriptions
  ALTER COLUMN plan SET DEFAULT 'essential';

-- 4) Recrear el CHECK con el catálogo vigente ('free' histórico + 'essential').
ALTER TABLE public.ai_subscriptions
  ADD CONSTRAINT ai_subscriptions_plan_check
  CHECK (plan IN ('free', 'essential'));