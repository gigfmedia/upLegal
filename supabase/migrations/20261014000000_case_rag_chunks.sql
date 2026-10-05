-- FASE 4.61B — sustrato persistente de retrieval privado por caso.
-- Solo evidencia documental cruda (nunca outputs generados). Sin backfill:
-- migración solo-schema; el backfill es operación controlada aparte.
-- Sin ANN index en V1 (corpus inicial pequeño; seq-scan es suficiente).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.ai_document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lawyer_case_id uuid NOT NULL REFERENCES public.lawyer_cases(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.ai_workspaces(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  content text NOT NULL CHECK (length(btrim(content)) > 0),
  content_hash text NOT NULL CHECK (length(content_hash) = 64),
  page_start integer CHECK (page_start IS NULL OR page_start >= 1),
  page_end integer CHECK (page_end IS NULL OR page_end >= 1),
  heading text,
  document_version integer NOT NULL DEFAULT 1 CHECK (document_version >= 1),
  extraction_version text NOT NULL,
  chunking_version text NOT NULL,
  embedding vector(1536) NOT NULL,
  embedding_model text NOT NULL,
  embedding_version text NOT NULL,
  content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('spanish', content)) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_document_chunks_unique_materialization UNIQUE (document_id, document_version, chunking_version, chunk_index)
);

COMMENT ON TABLE public.ai_document_chunks IS 'FASE 4.61B: chunks persistentes de evidencia documental cruda por caso. page_start/end NULL cuando la extracción no delimita páginas (nunca inventar).';

CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_case
  ON public.ai_document_chunks (lawyer_id, lawyer_case_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_doc
  ON public.ai_document_chunks (document_id, document_version, chunking_version);
CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_tsv
  ON public.ai_document_chunks USING gin (content_tsv);

ALTER TABLE public.ai_document_chunks ENABLE ROW LEVEL SECURITY;

-- Lectura owner (futura; V1 recupera por service_role). Sin INSERT/UPDATE/
-- DELETE autenticado: solo service_role escribe (default-deny).
DROP POLICY IF EXISTS "ai_document_chunks_owner_select" ON public.ai_document_chunks;
CREATE POLICY "ai_document_chunks_owner_select"
  ON public.ai_document_chunks FOR SELECT
  USING (auth.uid() = lawyer_id);

-- Observabilidad: permitir capability document_embedding en ai_operations
-- (cuota 0: costo interno, sin consumo de quotas de usuario).
-- Patrón 4.59D: DROP + lista explícita completa (incluye case_drafting
-- que ya existe en prod; un reemplazo parcial violaría filas existentes).
ALTER TABLE public.ai_operations DROP CONSTRAINT IF EXISTS ai_operations_capability_check;
ALTER TABLE public.ai_operations
  ADD CONSTRAINT ai_operations_capability_check
  CHECK (capability IN ('case_chat', 'document_chat', 'document_analysis', 'research', 'case_drafting', 'document_embedding'));
