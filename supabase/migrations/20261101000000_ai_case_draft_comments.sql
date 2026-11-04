-- UA-5.2: comentarios anclados a fragmentos del borrador (aditivo, sin DML).
-- 1) Tabla sidecar ai_case_draft_comments: el comentario NUNCA forma parte del
--    HTML del borrador, de sus versiones ni de `document_settings`.
-- 2) `anchor` guarda la selección textual exacta (quote + contexto + hints).
--    La resolución/anclaje es responsabilidad de la aplicación; el servidor
--    valida forma y ownership, y no reescribe el ancla en segundo plano.
-- 3) RLS: el abogado solo puede leer sus propios comentarios. Las escrituras
--    ocurren exclusivamente desde el servidor (service_role).
-- 4) V1 usa last-write-wins para mutaciones de comentarios: no hay OCC ni
--    columna de revisión en este sidecar.
-- 5) El máximo de 100 comentarios abiertos se garantiza de forma atómica con un
--    trigger BEFORE INSERT/UPDATE que toma un advisory lock transaccional por
--    borrador. El conteo previo del servidor se conserva como fast-path y para
--    devolver el mismo mensaje, pero ya no es la única protección.
--
-- No se aplica automáticamente: queda preparada para revisión y despliegue
-- autorizado por separado.

CREATE TABLE IF NOT EXISTS public.ai_case_draft_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.ai_case_drafts (id) ON DELETE CASCADE,
  lawyer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  lawyer_case_id uuid NOT NULL REFERENCES public.lawyer_cases (id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.ai_workspaces (id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  author text NOT NULL DEFAULT 'lawyer' CHECK (author IN ('lawyer', 'ai')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  anchor jsonb NOT NULL CHECK (jsonb_typeof(anchor) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_case_draft_comments_draft_created
  ON public.ai_case_draft_comments (draft_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_case_draft_comments_draft_status
  ON public.ai_case_draft_comments (draft_id, status);

CREATE INDEX IF NOT EXISTS idx_case_draft_comments_lawyer
  ON public.ai_case_draft_comments (lawyer_id);

ALTER TABLE public.ai_case_draft_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_case_draft_comments_owner_select" ON public.ai_case_draft_comments;
CREATE POLICY "ai_case_draft_comments_owner_select"
  ON public.ai_case_draft_comments
  FOR SELECT
  USING (auth.uid() = lawyer_id);

-- Escrituras solo service_role: toda mutación pasa por las rutas del servidor,
-- que validan que el borrador pertenezca al abogado y al workspace del caso.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.ai_case_draft_comments FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ai_case_draft_comments FROM authenticated;
  END IF;
END
$$;

COMMENT ON TABLE public.ai_case_draft_comments IS
  'UA-5.2: comentarios anclados a fragmentos del borrador. No modifican ai_case_drafts ni ai_case_draft_versions.';
COMMENT ON COLUMN public.ai_case_draft_comments.anchor IS
  'Forma: {"quote":string,"prefix":string,"suffix":string,"start_hint":number,"end_hint":number}. La app resuelve el ancla; nunca se reancla en silencio.';


-- Límite atómico por borrador: serializa INSERT de comentarios abiertos y
-- reaperturas con una advisory lock transaccional. El lock se libera al
-- terminar la transacción; el trigger solo bloquea mientras cuenta e inserta.
CREATE OR REPLACE FUNCTION public.enforce_ai_case_draft_comment_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  open_count integer;
BEGIN
  -- Los comentarios cerrados no consumen cupo ni necesitan el lock.
  IF NEW.status <> 'open' THEN
    RETURN NEW;
  END IF;

  -- Editar un comentario que ya estaba abierto no crea un cupo nuevo.
  IF TG_OP = 'UPDATE' AND OLD.status = 'open' THEN
    RETURN NEW;
  END IF;

  -- Una sola clave por borrador; colisiones de hash solo serializan de más.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.draft_id::text, 0));

  SELECT count(*) INTO open_count
  FROM public.ai_case_draft_comments c
  WHERE c.draft_id = NEW.draft_id
    AND c.lawyer_id = NEW.lawyer_id
    AND c.workspace_id = NEW.workspace_id
    AND c.status = 'open'
    AND (TG_OP = 'INSERT' OR c.id <> NEW.id);

  IF open_count >= 100 THEN
    RAISE EXCEPTION 'AI_DRAFT_COMMENT_LIMIT_REACHED'
      USING ERRCODE = 'P0001',
            DETAIL = 'Maximum 100 open comments per draft';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_ai_case_draft_comment_limit
  ON public.ai_case_draft_comments;
CREATE TRIGGER enforce_ai_case_draft_comment_limit
  BEFORE INSERT OR UPDATE OF status
  ON public.ai_case_draft_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_ai_case_draft_comment_limit();
