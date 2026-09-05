-- FASE 1C.1 — Case ↔ Booking 1:N
-- Permite que un caso tenga múltiples citas (bookings) via bookings.case_id
-- Mantiene lawyer_cases.booking_id (origen) para compatibilidad, añade bookings.case_id para operativa
-- Idempotente, no destruye datos

-- 1. Columna case_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='case_id'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN case_id UUID REFERENCES public.lawyer_cases(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Índice parcial
CREATE INDEX IF NOT EXISTS idx_bookings_case_id
  ON public.bookings(case_id)
  WHERE case_id IS NOT NULL;

-- 3. RLS: actualizar políticas para validar case_id pertenece al mismo lawyer
--    Drop existentes (creadas en 20260905000000) y recrear con case_id check

DROP POLICY IF EXISTS "Lawyers can insert own LAWYER_DIRECT bookings" ON public.bookings;
CREATE POLICY "Lawyers can insert own LAWYER_DIRECT bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = lawyer_id
    AND source = 'LAWYER_DIRECT'
    AND (client_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_clients WHERE id = client_id AND lawyer_id = auth.uid()))
    AND (case_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_cases WHERE id = case_id AND lawyer_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Lawyers can update own bookings" ON public.bookings;
CREATE POLICY "Lawyers can update own bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = lawyer_id)
  WITH CHECK (
    auth.uid() = lawyer_id
    AND (client_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_clients WHERE id = client_id AND lawyer_id = auth.uid()))
    AND (case_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_cases WHERE id = case_id AND lawyer_id = auth.uid()))
  );

COMMENT ON COLUMN public.bookings.case_id IS 'FASE 1C.1: citas operativas del caso (1:N), distinto de lawyer_cases.booking_id (origen). Permite Caso {Cita1, Cita2, Cita3}.';
