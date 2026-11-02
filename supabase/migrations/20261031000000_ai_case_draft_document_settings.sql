-- UA-4 Fase 3: configuración de documento por borrador (aditivo, sin DML).
-- `document_settings` nace vacío ('{}') para todos los borradores existentes;
-- la aplicación interpreta la ausencia de `margins_cm` como los márgenes
-- iniciales de 2,5 cm. Solo se persisten los cuatro márgenes en centímetros.
--
-- No se aplica automáticamente: esta migración queda preparada para revisión
-- y despliegue autorizado por separado.

ALTER TABLE public.ai_case_drafts
  ADD COLUMN IF NOT EXISTS document_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- La constraint se agrega solo si no existe; la migración nunca elimina
-- constraints ni datos preexistentes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_case_drafts_document_settings_object_check'
      AND conrelid = 'public.ai_case_drafts'::regclass
  ) THEN
    ALTER TABLE public.ai_case_drafts
      ADD CONSTRAINT ai_case_drafts_document_settings_object_check
      CHECK (jsonb_typeof(document_settings) = 'object');
  END IF;
END $$;

COMMENT ON COLUMN public.ai_case_drafts.document_settings IS
  'UA-4 Fase 3: configuración de página del borrador. Forma: {"margins_cm":{"top":number,"right":number,"bottom":number,"left":number}} con valores de 1 a 5 cm.';
