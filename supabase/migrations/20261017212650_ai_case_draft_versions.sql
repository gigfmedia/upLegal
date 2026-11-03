-- FASE 4.62C: workspace documental (aditivo).
-- 1) ai_case_draft_versions: historial append-only por borrador. Cada guardado
--    lógico (generación, edición manual, autosave, restauración) inserta una
--    fila; nunca se muta ni borra una versión existente.
-- 2) ai_case_drafts.revision: número de revisión server-side autoritativo
--    para OCC entre pestañas client (nunca updated_at del navegador).
-- 3) ai_case_drafts.content_format: distingue markdown (generación/legacy) de
--    html (salidas del editor). Solo afecta render; escritura validada server.
-- Sin DML y compatible con borradores históricos: no backfill. El primer
-- guardado de un legacy draft inserta una baseline origin='legacy' con su
-- contenido previo antes de la versión nueva.

CREATE TABLE IF NOT EXISTS public.ai_case_draft_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.ai_case_drafts (id) ON DELETE CASCADE,
  lawyer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  lawyer_case_id uuid NOT NULL REFERENCES public.lawyer_cases (id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.ai_workspaces (id) ON DELETE CASCADE,
  version_no integer NOT NULL CHECK (version_no >= 0),
  origin text NOT NULL CHECK (origin IN ('generation', 'edit', 'autosave', 'restore', 'legacy')),
  content text NOT NULL,
  content_format text NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('markdown', 'html')),
  -- Copia de procedencia en el momento del guardado: la fuente siempre
  -- corresponde al texto de ESTA versión, nunca a uno posterior.
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  intelligence_snapshot_id uuid REFERENCES public.ai_case_intelligence_snapshots (id),
  model text,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (draft_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_case_draft_versions_draft
  ON public.ai_case_draft_versions (draft_id, version_no DESC);

CREATE INDEX IF NOT EXISTS idx_case_draft_versions_lawyer
  ON public.ai_case_draft_versions (lawyer_id);

ALTER TABLE public.ai_case_draft_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_case_draft_versions_owner_select" ON public.ai_case_draft_versions;
CREATE POLICY "ai_case_draft_versions_owner_select"
  ON public.ai_case_draft_versions
  FOR SELECT
  USING (auth.uid() = lawyer_id);

-- Escrituras y deletes solo service_role (el servidor valida ownership del
-- borrador por ruta). El navegador nunca escribe versiones directamente.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.ai_case_draft_versions FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ai_case_draft_versions FROM authenticated;
  END IF;
END
$$;

-- OCC: revisión entera autoritativa; updated_at sigue siendo marcador de
-- recencia pero nunca lo decisorio del guardado.
ALTER TABLE public.ai_case_drafts
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1
  CHECK (revision >= 1);

ALTER TABLE public.ai_case_drafts
  ADD COLUMN IF NOT EXISTS content_format text NOT NULL DEFAULT 'markdown'
  CHECK (content_format IN ('markdown', 'html'));
