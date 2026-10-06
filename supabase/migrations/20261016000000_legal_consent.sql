-- FASE 5.6 — evidencia de aceptación de términos (nullable: usuarios
-- existentes sin historial no se bloquean; sin backfill inventado).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS privacy_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_version text;

COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'FASE 5.6: cuándo aceptó Términos. NULL = sin registro (usuarios previos).';
COMMENT ON COLUMN public.profiles.privacy_acknowledged_at IS 'FASE 5.6: cuándo declaró haber leído la Política de Privacidad.';
