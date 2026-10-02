-- FASE 5.1 — Case Control & Next Action
-- Extiende lawyer_cases con próxima gestión + crea lawyer_case_tasks mínima.
-- NO toca monetización, NO multiusuario (solo columna preparatoria futura).
-- Idempotente y backward compatible.

-- ===================================================================
-- 1) lawyer_cases: next_action / priority
-- Reutiliza description como resumen operativo (NO se crea campo nuevo).
-- ===================================================================

ALTER TABLE public.lawyer_cases
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_action_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high','medium','low')),
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid;

COMMENT ON COLUMN public.lawyer_cases.next_action IS 'FASE 5.1: próxima gestión del caso (texto libre jurídico).';
COMMENT ON COLUMN public.lawyer_cases.next_action_due_at IS 'FASE 5.1: fecha comprometida de la próxima gestión. Vencida si < now() y no completada.';
COMMENT ON COLUMN public.lawyer_cases.next_action_completed_at IS 'FASE 5.1: marca de completitud de la próxima gestión. NULL = pendiente.';
COMMENT ON COLUMN public.lawyer_cases.priority IS 'FASE 5.1: prioridad simple high/medium/low. Default medium.';
COMMENT ON COLUMN public.lawyer_cases.responsible_user_id IS 'FASE 5.1: reservado futuro multiusuario. NO usar todavía (sin FK ni RLS).';

CREATE INDEX IF NOT EXISTS idx_lawyer_cases_next_due
  ON public.lawyer_cases (lawyer_id, next_action_due_at)
  WHERE next_action IS NOT NULL AND next_action_completed_at IS NULL;

-- ===================================================================
-- 2) TABLE lawyer_case_tasks — pendientes mínimos del caso
-- ai_case_workflow_items NO se reutiliza: está atado a ai_workspaces
-- (case_id = workspace_id FK) y a action_id AI-derivado con unique por
-- workspace. Los casos SaaS (incluido el gratuito) existen sin workspace.
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.lawyer_case_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.lawyer_cases(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  due_at timestamptz,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  responsible_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lawyer_case_tasks IS 'FASE 5.1: pendientes operativos por caso. responsible_user_id reservado futuro, sin FK ni lógica todavía.';

DROP TRIGGER IF EXISTS trg_lawyer_case_tasks_updated_at ON public.lawyer_case_tasks;
CREATE TRIGGER trg_lawyer_case_tasks_updated_at
  BEFORE UPDATE ON public.lawyer_case_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_lawyer_case_tasks_case
  ON public.lawyer_case_tasks (case_id, completed, due_at);

CREATE INDEX IF NOT EXISTS idx_lawyer_case_tasks_lawyer_due
  ON public.lawyer_case_tasks (lawyer_id, completed, due_at)
  WHERE completed = false AND due_at IS NOT NULL;

-- ===================================================================
-- 3) RLS — aislamiento por lawyer_id = auth.uid()
-- lawyer_cases ya tiene RLS; estas columnas heredan sus policies
-- existentes (SELECT/INSERT/UPDATE/DELETE owner). Solo se refuerza
-- que tasks valide pertenencia del caso al mismo lawyer.
-- ===================================================================

ALTER TABLE public.lawyer_case_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lawyer_case_tasks_owner_select" ON public.lawyer_case_tasks;
CREATE POLICY "lawyer_case_tasks_owner_select"
  ON public.lawyer_case_tasks FOR SELECT
  USING (auth.uid() = lawyer_id);

DROP POLICY IF EXISTS "lawyer_case_tasks_owner_insert" ON public.lawyer_case_tasks;
CREATE POLICY "lawyer_case_tasks_owner_insert"
  ON public.lawyer_case_tasks FOR INSERT
  WITH CHECK (
    auth.uid() = lawyer_id
    AND EXISTS (SELECT 1 FROM public.lawyer_cases c WHERE c.id = case_id AND c.lawyer_id = auth.uid())
  );

DROP POLICY IF EXISTS "lawyer_case_tasks_owner_update" ON public.lawyer_case_tasks;
CREATE POLICY "lawyer_case_tasks_owner_update"
  ON public.lawyer_case_tasks FOR UPDATE
  USING (auth.uid() = lawyer_id)
  WITH CHECK (
    auth.uid() = lawyer_id
    AND EXISTS (SELECT 1 FROM public.lawyer_cases c WHERE c.id = case_id AND c.lawyer_id = auth.uid())
  );

DROP POLICY IF EXISTS "lawyer_case_tasks_owner_delete" ON public.lawyer_case_tasks;
CREATE POLICY "lawyer_case_tasks_owner_delete"
  ON public.lawyer_case_tasks FOR DELETE
  USING (auth.uid() = lawyer_id);
