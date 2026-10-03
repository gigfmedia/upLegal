-- FASE 4.59C: snapshots versionados de Case Intelligence.
-- Persistencia aditiva: la agregación sigue siendo determinista y 0 LLM.
-- Escritura solo service_role (el frontend nunca lee la tabla directo;
-- la sirve GET /api/ai/cases/:caseId/intelligence con validación de ownership).
-- Sin backfill: los snapshots se crean lazy al visitar intelligence.

CREATE TABLE IF NOT EXISTS public.ai_case_intelligence_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  lawyer_case_id uuid NOT NULL REFERENCES public.lawyer_cases (id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.ai_workspaces (id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version >= 1),
  source_fingerprint text NOT NULL,
  source_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_case_intelligence_snapshots_case_version_unique UNIQUE (lawyer_case_id, version),
  CONSTRAINT ai_case_intelligence_snapshots_case_fingerprint_unique UNIQUE (lawyer_case_id, source_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_case_intelligence_snapshots_case_version
  ON public.ai_case_intelligence_snapshots (lawyer_case_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_case_intelligence_snapshots_lawyer
  ON public.ai_case_intelligence_snapshots (lawyer_id);

ALTER TABLE public.ai_case_intelligence_snapshots ENABLE ROW LEVEL SECURITY;

-- Sin políticas para anon/authenticated: solo service_role (bypass RLS).
-- DO con guarda de existencia de roles para no romper en Postgres vanilla.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.ai_case_intelligence_snapshots FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.ai_case_intelligence_snapshots FROM authenticated;
  END IF;
END
$$;
