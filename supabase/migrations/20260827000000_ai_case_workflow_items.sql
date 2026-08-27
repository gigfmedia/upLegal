-- Fase 4.21: Case Workspace Workflow & Task State — workflow persistente derivado de Case Intelligence.
-- Decision arquitectónica: LegalUp no tiene entidad "case" separada; el caso ES el workspace (ai_workspaces.id).
-- Por compatibilidad con spec se persisten ambos: workspace_id y case_id (mismo valor = workspace.id), cada uno con FK a ai_workspaces.
-- Idempotente y safe para re-ejecución.

CREATE TABLE IF NOT EXISTS public.ai_case_workflow_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.ai_workspaces (id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.ai_workspaces (id) ON DELETE CASCADE,
  action_id text NOT NULL CHECK (length(btrim(action_id)) > 0),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','dismissed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  source_type text,
  source_document_id uuid REFERENCES public.ai_documents (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  dismissed_at timestamptz,
  CONSTRAINT ai_case_workflow_items_case_equals_workspace CHECK (case_id = workspace_id)
);

-- Deduplicación por workspace + action_id (un workflow item por acción derivada por caso).
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_case_workflow_workspace_action
  ON public.ai_case_workflow_items (workspace_id, action_id);

CREATE INDEX IF NOT EXISTS idx_ai_case_workflow_workspace_status_priority
  ON public.ai_case_workflow_items (workspace_id, status, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_case_workflow_lawyer
  ON public.ai_case_workflow_items (lawyer_id);

ALTER TABLE public.ai_case_workflow_items ENABLE ROW LEVEL SECURITY;

-- SELECT: solo propietario
DROP POLICY IF EXISTS "ai_case_workflow_select_own" ON public.ai_case_workflow_items;
CREATE POLICY "ai_case_workflow_select_own"
  ON public.ai_case_workflow_items
  FOR SELECT
  USING (auth.uid() = lawyer_id);

-- INSERT: solo propietario y verifica pertenencia del workspace
DROP POLICY IF EXISTS "ai_case_workflow_insert_own" ON public.ai_case_workflow_items;
CREATE POLICY "ai_case_workflow_insert_own"
  ON public.ai_case_workflow_items
  FOR INSERT
  WITH CHECK (
    auth.uid() = lawyer_id
    AND EXISTS (
      SELECT 1 FROM public.ai_workspaces w
      WHERE w.id = workspace_id AND w.lawyer_id = auth.uid()
    )
    AND case_id = workspace_id
  );

-- UPDATE: solo propietario
DROP POLICY IF EXISTS "ai_case_workflow_update_own" ON public.ai_case_workflow_items;
CREATE POLICY "ai_case_workflow_update_own"
  ON public.ai_case_workflow_items
  FOR UPDATE
  USING (auth.uid() = lawyer_id)
  WITH CHECK (auth.uid() = lawyer_id AND case_id = workspace_id);

-- DELETE: solo propietario
DROP POLICY IF EXISTS "ai_case_workflow_delete_own" ON public.ai_case_workflow_items;
CREATE POLICY "ai_case_workflow_delete_own"
  ON public.ai_case_workflow_items
  FOR DELETE
  USING (auth.uid() = lawyer_id);

-- Trigger updated_at (mismo patrón que ai_case_timeline_events)
CREATE OR REPLACE FUNCTION public.set_ai_case_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_case_workflow_set_updated_at ON public.ai_case_workflow_items;
CREATE TRIGGER ai_case_workflow_set_updated_at
  BEFORE UPDATE ON public.ai_case_workflow_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ai_case_workflow_updated_at();
