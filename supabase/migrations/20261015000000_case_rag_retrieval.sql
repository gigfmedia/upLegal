-- FASE 4.61C — retrieval híbrido por caso (vectorial + léxico).
-- Seguridad: las funciones derivan el abogado de auth.uid() cuando hay
-- sesión; el server (service_role) pasa p_lawyer_id explícito y la función
-- valida ownership del caso en ambos caminos. Jamás ranking global.
-- 4.61B (20261014000000) debe aplicarse antes.

-- 1) Vectorial: similitud coseno, scope estricto, versiones vigentes.
CREATE OR REPLACE FUNCTION public.match_case_document_chunks(
  p_case_id uuid,
  p_query_embedding vector(1536),
  p_limit integer DEFAULT 16,
  p_lawyer_id uuid DEFAULT NULL,
  p_document_id uuid DEFAULT NULL,
  p_chunking_version text DEFAULT 'case-rag-chunk-v1',
  p_embedding_version text DEFAULT 'te3-small-v1'
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  page_start integer,
  page_end integer,
  heading text,
  content_hash text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Invariante: con sesión autenticada manda auth.uid() (p_lawyer_id
  -- ajeno nunca otorga acceso); service_role deriva de p_lawyer_id con
  -- validación de ownership del caso. Scope ANTES del ranking.
  WITH auth_lawyer AS (
    SELECT CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_lawyer_id END AS lawyer_id
  ),
  scope_case AS (
    SELECT c.id, c.lawyer_id
    FROM public.lawyer_cases c, auth_lawyer a
    WHERE c.id = p_case_id
      AND a.lawyer_id IS NOT NULL
      AND c.lawyer_id = a.lawyer_id
  )
  SELECT
    ch.id, ch.document_id, ch.chunk_index, ch.content,
    ch.page_start, ch.page_end, ch.heading, ch.content_hash,
    (1 - (ch.embedding <=> p_query_embedding))::float AS similarity
  FROM public.ai_document_chunks ch
  JOIN scope_case s
    ON s.id = ch.lawyer_case_id
   AND s.lawyer_id = ch.lawyer_id
  WHERE ch.chunking_version = p_chunking_version
    AND ch.embedding_version = p_embedding_version
    AND (p_document_id IS NULL OR ch.document_id = p_document_id)
  ORDER BY ch.embedding <=> p_query_embedding
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;

COMMENT ON FUNCTION public.match_case_document_chunks IS 'FASE 4.61C: top-N vectorial por caso. Scope lawyer+caso ANTES del ranking; versiones vigentes por params.';

REVOKE ALL ON FUNCTION public.match_case_document_chunks(uuid, vector, integer, uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_case_document_chunks(uuid, vector, integer, uuid, uuid, text, text) TO authenticated, service_role;

-- 2) Léxico: FTS español + fallback exacto ILIKE (RUT/RIT/fechas literales).
CREATE OR REPLACE FUNCTION public.search_case_document_chunks_fts(
  p_case_id uuid,
  p_query text,
  p_limit integer DEFAULT 16,
  p_lawyer_id uuid DEFAULT NULL,
  p_document_id uuid DEFAULT NULL,
  p_chunking_version text DEFAULT 'case-rag-chunk-v1'
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  page_start integer,
  page_end integer,
  heading text,
  content_hash text,
  fts_rank float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Invariante: con sesión autenticada manda auth.uid() (p_lawyer_id
  -- ajeno nunca otorga acceso); service_role deriva de p_lawyer_id con
  -- validación de ownership del caso. Scope ANTES del ranking.
  WITH auth_lawyer AS (
    SELECT CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_lawyer_id END AS lawyer_id
  ),
  scope_case AS (
    SELECT c.id, c.lawyer_id
    FROM public.lawyer_cases c, auth_lawyer a
    WHERE c.id = p_case_id
      AND a.lawyer_id IS NOT NULL
      AND c.lawyer_id = a.lawyer_id
  ),
  q AS (
    SELECT plainto_tsquery('spanish', p_query) AS tsq
  )
  SELECT
    ch.id, ch.document_id, ch.chunk_index, ch.content,
    ch.page_start, ch.page_end, ch.heading, ch.content_hash,
    GREATEST(
      ts_rank(ch.content_tsv, (SELECT tsq FROM q)),
      CASE WHEN ch.content ILIKE '%' || p_query || '%' THEN 0.05 ELSE 0 END
    )::float AS fts_rank
  FROM public.ai_document_chunks ch
  JOIN scope_case s
    ON s.id = ch.lawyer_case_id
   AND s.lawyer_id = ch.lawyer_id
  WHERE ch.chunking_version = p_chunking_version
    AND (p_document_id IS NULL OR ch.document_id = p_document_id)
    AND (
      ch.content_tsv @@ (SELECT tsq FROM q)
      OR ch.content ILIKE '%' || p_query || '%'
    )
  ORDER BY fts_rank DESC, ch.chunk_index ASC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;

COMMENT ON FUNCTION public.search_case_document_chunks_fts IS 'FASE 4.61C: top-N léxico por caso (spanish FTS + ILIKE exacto). Mismo scope estricto.';

REVOKE ALL ON FUNCTION public.search_case_document_chunks_fts(uuid, text, integer, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_case_document_chunks_fts(uuid, text, integer, uuid, uuid, text) TO authenticated, service_role;
