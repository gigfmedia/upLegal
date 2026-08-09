-- Fase Timeline Jurídico: historial cronológico de eventos del caso.
-- Cada evento pertenece a un workspace (caso) y a un abogado.
-- Idempotente para cualquier entorno.

CREATE TABLE IF NOT EXISTS public.ai_case_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.ai_workspaces (id) ON DELETE CASCADE,
  lawyer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN (
      'case_created',
      'document_uploaded',
      'document_analyzed',
      'risk_identified',
      'deadline_detected',
      'note'
    )
  ),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  description text,
  event_date timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_case_timeline_events ENABLE ROW LEVEL SECURITY;

-- SELECT: el abogado solo lee eventos de sus propios workspaces.
DROP POLICY IF EXISTS "ai_case_timeline_events_select_own" ON public.ai_case_timeline_events;
CREATE POLICY "ai_case_timeline_events_select_own"
  ON public.ai_case_timeline_events
  FOR SELECT
  USING (auth.uid() = lawyer_id);

-- INSERT: solo en workspaces propios (valida también la pertenencia del workspace).
DROP POLICY IF EXISTS "ai_case_timeline_events_insert_own" ON public.ai_case_timeline_events;
CREATE POLICY "ai_case_timeline_events_insert_own"
  ON public.ai_case_timeline_events
  FOR INSERT
  WITH CHECK (
    auth.uid() = lawyer_id
    AND EXISTS (
      SELECT 1 FROM public.ai_workspaces w
      WHERE w.id = workspace_id AND w.lawyer_id = auth.uid()
    )
  );

-- UPDATE: solo eventos propios.
DROP POLICY IF EXISTS "ai_case_timeline_events_update_own" ON public.ai_case_timeline_events;
CREATE POLICY "ai_case_timeline_events_update_own"
  ON public.ai_case_timeline_events
  FOR UPDATE
  USING (auth.uid() = lawyer_id)
  WITH CHECK (auth.uid() = lawyer_id);

-- DELETE: solo eventos propios.
DROP POLICY IF EXISTS "ai_case_timeline_events_delete_own" ON public.ai_case_timeline_events;
CREATE POLICY "ai_case_timeline_events_delete_own"
  ON public.ai_case_timeline_events
  FOR DELETE
  USING (auth.uid() = lawyer_id);

-- Índice principal: lista del timeline por workspace ordenado por fecha.
CREATE INDEX IF NOT EXISTS idx_ai_case_timeline_events_workspace_date
  ON public.ai_case_timeline_events (workspace_id, event_date DESC);

-- Trigger para mantener updated_at (mismo patrón que set_ai_workspace_updated_at).
CREATE OR REPLACE FUNCTION public.set_ai_case_timeline_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_case_timeline_events_set_updated_at ON public.ai_case_timeline_events;
CREATE TRIGGER ai_case_timeline_events_set_updated_at
  BEFORE UPDATE ON public.ai_case_timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ai_case_timeline_event_updated_at();
