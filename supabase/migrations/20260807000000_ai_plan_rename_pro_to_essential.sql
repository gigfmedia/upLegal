-- LegalUp AI — renombra el plan `pro` → `essential`.
--
-- El plan vigente (un solo nivel, trial + facturación) se llamaba `pro` en
-- código y en datos persistidos, pero en realidad es el plan base/estándar.
-- En el futuro existirá un plan `pro` aparte y más caro, por lo que se reserva
-- ese nombre. Este plan pasa a llamarse `essential`.
--
-- Partes:
--   1) Normaliza las filas existentes: `plan = 'pro'` → `plan = 'essential'`.
--   2) Actualiza el DEFAULT de la columna para concordar con el código
--      (AI_SUBSCRIPTION_PLAN = 'essential').

-- 1) Migración de datos: 'pro'/'base' → 'essential'.
UPDATE public.ai_subscriptions
  SET plan = 'essential',
      updated_at = now()
  WHERE plan IN ('pro', 'base');

-- 2) DEFAULT coherente con el código.
ALTER TABLE public.ai_subscriptions
  ALTER COLUMN plan SET DEFAULT 'essential';