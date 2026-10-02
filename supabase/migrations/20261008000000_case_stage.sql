-- FASE 5.3 — Case stage (etapa jurídica opcional).
-- `status` es lifecycle operacional; `stage` es texto libre nullable para
-- cualquier área (litigación, familia, laboral, corporativo, in-house).
-- Sin CHECK de taxonomía: no encierra al producto en un área jurídica.
-- RLS: columnas nuevas heredan las policies owner existentes de lawyer_cases.

ALTER TABLE public.lawyer_cases
  ADD COLUMN IF NOT EXISTS stage text
    CHECK (stage IS NULL OR length(btrim(stage)) > 0 AND length(stage) <= 80);

COMMENT ON COLUMN public.lawyer_cases.stage IS 'FASE 5.3: etapa del asunto (ej: Embargo). Texto libre, NULL = sin etapa. Independiente de status operacional.';

CREATE INDEX IF NOT EXISTS idx_lawyer_cases_stage
  ON public.lawyer_cases (lawyer_id, stage)
  WHERE stage IS NOT NULL;
