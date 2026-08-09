-- Cuentas de prueba de LegalUp AI: desactiva los límites de uso del trial.
-- flag "unlimited_trial" en ai_subscriptions; lo respeta checkAILimits (server.mjs).

ALTER TABLE public.ai_subscriptions
  ADD COLUMN IF NOT EXISTS unlimited_trial boolean NOT NULL DEFAULT false;
