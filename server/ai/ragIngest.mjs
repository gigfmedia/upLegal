/**
 * FASE 4.61B — orquestación de indexación RAG por documento.
 *
 * Punto canónico: tras extracción exitosa (NO depende del análisis).
 * - Requiere link caso real (documento→workspace→lawyer_case); huérfanos
 *   legacy se omiten (defer), nunca con ownership ambiguo.
 * - Todo server-side: lawyer/case/doc vienen de filas owned, no del browser.
 * - Idempotente: upsert por (document,versión,chunking,index) + limpieza
 *   de índices sobrantes. Reintento seguro.
 * - Falla de embeddings: el documento queda ready igual; se registra el
 *   fallo y un reintento posterior reconstruye (nada medio-indexado como
 *   completo: el conteo esperado se verifica al final).
 * - Observabilidad: fila ai_operations capability document_embedding,
 *   cuota 0 (costo interno, sin consumo de quotas de usuario).
 */
import {
  RAG_CHUNKING_VERSION,
  RAG_EXTRACTION_VERSION,
  chunkDocumentText,
} from './ragChunking.mjs';
import {
  RAG_EMBEDDING_DIMS,
  RAG_EMBEDDING_MODEL,
  RAG_EMBEDDING_VERSION,
  embedBatch,
  embeddingInputFor,
} from './ragEmbeddings.mjs';

const DOCUMENT_VERSION_V1 = 1;

export function toPgVectorLiteral(vector) {
  if (!Array.isArray(vector) || vector.length !== RAG_EMBEDDING_DIMS) {
    throw new Error(`INVALID_EMBEDDING_DIMS:${vector?.length}`);
  }
  return `[${vector.join(',')}]`;
}

/**
 * @returns {Promise<{status:'indexed'|'skipped'|'failed', chunks?:number, reason?:string}>}
 */
export async function ingestDocumentChunks({
  supabase,
  doc,
  lawyerId,
  workspaceId,
  caseId,
  deps = {},
}) {
  const fetchFn = deps.fetchFn || fetch;
  if (!doc?.id || !lawyerId || !workspaceId) {
    return { status: 'skipped', reason: 'missing-scope' };
  }
  if (!caseId) {
    // Workspace huérfano legacy: deferir, nunca indexar sin caso real.
    return { status: 'skipped', reason: 'orphan-workspace' };
  }
  const text = doc.extracted_text || '';
  if (text.trim().length === 0) {
    return { status: 'skipped', reason: 'empty-text' };
  }

  const logOp = async (status, extra = {}) => {
    try {
      await supabase.from('ai_operations').insert({
        lawyer_id: lawyerId,
        lawyer_case_id: caseId,
        workspace_id: workspaceId,
        capability: 'document_embedding',
        resource_id: doc.id,
        idempotency_key: crypto.randomUUID(),
        request_hash: '0'.repeat(64),
        status,
        quota_units: 0,
        period_start: new Date().toISOString().slice(0, 10),
        token_limit: Math.max(1, Math.ceil(text.length / 4)),
        response_status: extra.httpStatus ?? null,
        response_body: {
          chunks: extra.chunks ?? null,
          model: RAG_EMBEDDING_MODEL,
          reason: extra.reason ?? null,
        },
      });
    } catch {
      /* observabilidad best-effort; nunca rompe indexación */
    }
  };

  try {
    const chunks = chunkDocumentText(text);
    if (chunks.length === 0) {
      await logOp('failed', { reason: 'no-chunks' });
      return { status: 'failed', reason: 'no-chunks' };
    }
    const inputs = chunks.map((c) =>
      embeddingInputFor({ filename: doc.original_filename, heading: c.heading, content: c.content })
    );
    const { embeddings } = await embedBatch(inputs, { fetchFn });

    const rows = chunks.map((c, i) => ({
      lawyer_id: lawyerId,
      lawyer_case_id: caseId,
      workspace_id: workspaceId,
      document_id: doc.id,
      chunk_index: c.chunk_index,
      content: c.content,
      content_hash: c.content_hash,
      page_start: c.page_start,
      page_end: c.page_end,
      heading: c.heading,
      document_version: DOCUMENT_VERSION_V1,
      extraction_version: RAG_EXTRACTION_VERSION,
      chunking_version: RAG_CHUNKING_VERSION,
      embedding: toPgVectorLiteral(embeddings[i]),
      embedding_model: RAG_EMBEDDING_MODEL,
      embedding_version: RAG_EMBEDDING_VERSION,
      updated_at: new Date().toISOString(),
    }));

    // Upsert idempotente + limpieza de sobrantes (atomicidad práctica:
    // reintento reconstruye; verificación de conteo al final).
    const { error: upsertError } = await supabase
      .from('ai_document_chunks')
      .upsert(rows, { onConflict: 'document_id,document_version,chunking_version,chunk_index' });
    if (upsertError) throw upsertError;

    await supabase
      .from('ai_document_chunks')
      .delete()
      .eq('document_id', doc.id)
      .eq('document_version', DOCUMENT_VERSION_V1)
      .eq('chunking_version', RAG_CHUNKING_VERSION)
      .gte('chunk_index', rows.length);

    const { count } = await supabase
      .from('ai_document_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', doc.id)
      .eq('document_version', DOCUMENT_VERSION_V1)
      .eq('chunking_version', RAG_CHUNKING_VERSION);
    if ((count ?? -1) !== rows.length) {
      await logOp('failed', { reason: 'count-mismatch', chunks: rows.length });
      return { status: 'failed', reason: 'count-mismatch' };
    }

    await logOp('succeeded', { chunks: rows.length });
    return { status: 'indexed', chunks: rows.length };
  } catch (e) {
    await logOp('failed', { reason: e instanceof Error ? e.message.slice(0, 200) : 'unknown' });
    return { status: 'failed', reason: e instanceof Error ? e.message : 'unknown' };
  }
}
