/**
 * FASE 4.61C — motor canónico de retrieval híbrido por caso.
 *
 * Entrada: lawyerId (autoridad de sesión/servidor, nunca browser),
 * caseId negocio, query, filtros opcionales. Salida: Evidence Pack interno.
 *
 * Invariantes:
 * - Scope lawyer+caso ANTES del ranking (RPC lo impone; acá se exige).
 * - 1 solo embedding por request; sin él → modo léxico degradado.
 * - Research = canal LEGAL_CONTEXT separado, nunca evidencia documental.
 * - Vecinos/dedup acotados; presupuesto de chars; sin reranker LLM.
 */
import { embedBatch } from './ragEmbeddings.mjs';
import { RAG_EMBEDDING_VERSION } from './ragEmbeddings.mjs';
import {
  RAG_CHUNKING_VERSION,
} from './ragChunking.mjs';
import { selectRelevantResearch } from './researchMemory.mjs';
export const RAG_VECTOR_CANDIDATES = 16;
export const RAG_LEXICAL_CANDIDATES = 16;
export const RAG_FINAL_EVIDENCE = 8;
export const RAG_MAX_DOCUMENT_EVIDENCE_CHARS = 12000;
export const RAG_RRF_K = 60;
export const RAG_MAX_CHUNKS_PER_DOC_FIRST_PASS = 3;
export const RAG_NEIGHBOR_CHARS = 500;

export function normalizeQuery(query) {
  return String(query ?? '').replace(/\s+/g, ' ').trim();
}

export function citationLabel({ filename = 'documento', pageStart = null, pageEnd = null } = {}) {
  if (pageStart == null) return `${filename}`;
  if (pageEnd == null || pageEnd === pageStart) return `${filename} · pág. ${pageStart}`;
  return `${filename} · págs. ${pageStart}–${pageEnd}`;
}

/** RRF determinista sobre candidatos con ranking por ruta. */
export function reciprocalRankFuse(vectorRanked, lexicalRanked, k = RAG_RRF_K) {
  const scores = new Map();
  const touch = (list, rankKey) => {
    list.forEach((c, i) => {
      const key = c.chunk_id || `${c.document_id}:${c.chunk_index}`;
      const entry = scores.get(key) || { candidate: c, vector_rank: null, lexical_rank: null, score: 0 };
      entry[rankKey] = i + 1;
      entry.score += 1 / (k + i + 1);
      if (!scores.has(key)) scores.set(key, entry);
      entry.candidate = entry.candidate || c;
    });
  };
  touch(vectorRanked, 'vector_rank');
  touch(lexicalRanked, 'lexical_rank');
  return [...scores.values()].sort((a, b) => b.score - a.score || (a.vector_rank ?? 999) - (b.vector_rank ?? 999));
}

/**
 * Recupera el Evidence Pack de un caso.
 * @returns {Promise<{pack, retrievalMode}>} retrievalMode: hybrid|vector|lexical
 */
export async function retrieveCaseEvidence({
  supabase,
  lawyerId,
  caseId,
  query,
  documentId = null,
  limits = {},
  deps = {},
} = {}) {
  const startedAt = Date.now();
  const q = normalizeQuery(query);
  if (!q) {
    return { pack: null, retrievalMode: 'invalid', error: 'EMPTY_QUERY' };
  }
  if (!lawyerId || !caseId) {
    return { pack: null, retrievalMode: 'invalid', error: 'MISSING_SCOPE' };
  }
  const fetchFn = deps.fetchFn || fetch;
  const now = new Date().toISOString();

  // 1) Autoridad del caso (server-side; valida pertenencia + workspace).
  const { data: caseRow, error: caseError } = await supabase
    .from('lawyer_cases')
    .select('id,title,description,practice_area,status,ai_workspace_id,next_action,next_action_due_at,client:lawyer_clients(name)')
    .eq('id', caseId)
    .eq('lawyer_id', lawyerId)
    .maybeSingle();
  if (caseError) throw caseError;
  if (!caseRow) {
    return {
      pack: {
        caseContext: { caseId, found: false },
        documentEvidence: [],
        researchEvidence: [],
        retrievalMetadata: { queryHash: hashQuery(q), mode: 'empty', reason: 'case-not-found' },
      },
      retrievalMode: 'empty',
    };
  }
  const workspaceId = caseRow.ai_workspace_id || null;

  const caseContext = {
    caseId: caseRow.id,
    title: caseRow.title || '',
    area: caseRow.practice_area || null,
    status: caseRow.status || null,
    clientName: caseRow.client?.name || null,
    nextAction: caseRow.next_action || null,
    nextActionDueAt: caseRow.next_action_due_at || null,
  };

  // 2) Cobertura (documentos elegibles vs indexados, misma versión vigente).
  const { data: docs } = await supabase
    .from('ai_documents')
    .select('id,original_filename')
    .eq('workspace_id', workspaceId || '__none__')
    .eq('lawyer_id', lawyerId)
    .eq('status', 'ready');
  const eligibleDocuments = (docs || []).map((d) => ({ id: d.id, filename: d.original_filename }));
  let indexedDocumentIds = [];
  if (eligibleDocuments.length > 0) {
    const { data: indexed } = await supabase
      .from('ai_document_chunks')
      .select('document_id')
      .eq('lawyer_case_id', caseId)
      .eq('lawyer_id', lawyerId);
    indexedDocumentIds = [...new Set((indexed || []).map((r) => r.document_id))];
  }
  const coverage = {
    eligibleDocuments: eligibleDocuments.length,
    indexedDocuments: indexedDocumentIds.filter((id) => eligibleDocuments.some((d) => d.id === id)).length,
    unindexedDocuments: eligibleDocuments.filter((d) => !indexedDocumentIds.includes(d.id)).map((d) => d.id),
    coverageRatio: eligibleDocuments.length === 0 ? 1 : indexedDocumentIds.filter((id) => eligibleDocuments.some((d) => d.id === id)).length / eligibleDocuments.length,
  };

  const filenames = new Map(eligibleDocuments.map((d) => [d.id, d.filename || 'documento']));

  // 3) Un embedding por request; sin provider → léxico degradado.
  let queryEmbedding = null;
  let embeddingFailed = false;
  try {
    const { embeddings } = await embedBatch([q], { fetchFn });
    queryEmbedding = embeddings[0] || null;
  } catch {
    embeddingFailed = true;
  }

  // 4) Candidatos vectoriales + léxicos en paralelo (scope en RPC).
  const vectorLimit = limits.vectorCandidates ?? RAG_VECTOR_CANDIDATES;
  const lexicalLimit = limits.lexicalCandidates ?? RAG_LEXICAL_CANDIDATES;
  const rpcParams = {
    p_case_id: caseId,
    p_lawyer_id: lawyerId,
    p_limit: vectorLimit,
    p_document_id: documentId,
    p_chunking_version: RAG_CHUNKING_VERSION,
    p_embedding_version: RAG_EMBEDDING_VERSION,
  };
  const [vectorRes, lexicalRes] = await Promise.all([
    queryEmbedding
      ? supabase.rpc('match_case_document_chunks', {
          ...rpcParams,
          p_query_embedding: `[${queryEmbedding.join(',')}]`,
        })
      : { data: null, error: new Error('no-embedding') },
    supabase.rpc('search_case_document_chunks_fts', {
      p_case_id: caseId,
      p_lawyer_id: lawyerId,
      p_query: q.slice(0, 500),
      p_limit: lexicalLimit,
      p_document_id: documentId,
      p_chunking_version: RAG_CHUNKING_VERSION,
    }),
  ]);
  const vectorRows = !vectorRes.error ? vectorRes.data || [] : [];
  const lexicalRows = !lexicalRes.error ? lexicalRes.data || [] : [];
  if (vectorRows.length === 0 && lexicalRows.length === 0 && vectorRes.error && vectorRes.error.message !== 'no-embedding' && lexicalRes.error) {
    return { pack: null, retrievalMode: 'error', error: 'RETRIEVAL_FAILED' };
  }
  const mode = !queryEmbedding || vectorRows.length === 0
    ? (lexicalRows.length > 0 ? 'lexical' : (queryEmbedding ? 'vector' : 'lexical'))
    : (lexicalRows.length > 0 ? 'hybrid' : 'vector');

  // 5) Fusión RRF + diversidad por documento (máx N/doc primera pasada).
  const fused = reciprocalRankFuse(vectorRows, lexicalRows);
  const perDoc = new Map();
  const diverse = [];
  const overflow = [];
  for (const f of fused) {
    const n = perDoc.get(f.candidate.document_id) || 0;
    if (n < RAG_MAX_CHUNKS_PER_DOC_FIRST_PASS) {
      perDoc.set(f.candidate.document_id, n + 1);
      diverse.push(f);
    } else {
      overflow.push(f);
    }
  }
  const ordered = [...diverse, ...overflow];

  // 6) Dedup de adyacentes solapados: fusiona índices contiguos del mismo doc.
  // Se itera `ordered` (orden de diversidad), NO re-ordenado por score.
  const finalLimit = limits.finalEvidence ?? RAG_FINAL_EVIDENCE;
  const charBudget = limits.maxChars ?? RAG_MAX_DOCUMENT_EVIDENCE_CHARS;
  const merged = [];
  const seen = new Set();
  for (const f of ordered) {
    const key = `${f.candidate.document_id}:${f.candidate.chunk_index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const group = [f];
    let next = f;
    for (;;) {
      const cont = ordered.find(
        (g) => g.candidate.document_id === next.candidate.document_id &&
          g.candidate.chunk_index === next.candidate.chunk_index + 1 &&
          !seen.has(`${g.candidate.document_id}:${g.candidate.chunk_index}`)
      );
      if (!cont) break;
      seen.add(`${cont.candidate.document_id}:${cont.candidate.chunk_index}`);
      group.push(cont);
      next = cont;
    }
    merged.push(group);
    if (merged.length >= finalLimit) break;
  }

  // 7) Vecinos acotados (mismo doc/versión) como contexto, no evidencia.
  let neighborTexts = new Map();
  if (merged.length > 0) {
    const wanted = [];
    for (const g of merged) {
      for (const f of g) {
        wanted.push({ document_id: f.candidate.document_id, chunk_index: f.candidate.chunk_index - 1 });
        wanted.push({ document_id: f.candidate.document_id, chunk_index: f.candidate.chunk_index + 1 });
      }
    }
    const { data: neighbors } = await supabase
      .from('ai_document_chunks')
      .select('document_id,chunk_index,content')
      .eq('lawyer_id', lawyerId)
      .eq('lawyer_case_id', caseId)
      .in('document_id', [...new Set(wanted.map((w) => w.document_id))]);
    neighborTexts = new Map(
      (neighbors || []).map((n) => [`${n.document_id}:${n.chunk_index}`, String(n.content || '').slice(0, RAG_NEIGHBOR_CHARS)])
    );
  }

  // 8) Evidence items con presupuesto por item y citación estable.
  const documentEvidence = [];
  let usedChars = 0;
  for (const group of merged) {
    const primary = group[0].candidate;
    const last = group[group.length - 1].candidate;
    const filename = filenames.get(primary.document_id) || 'documento';
    const texts = group.map((f) => f.candidate.content);
    // Contexto vecino acotado (mismo doc), marcado como contexto.
    const before = neighborTexts.get(`${primary.document_id}:${primary.chunk_index - 1}`);
    const after = neighborTexts.get(`${last.document_id}:${last.chunk_index + 1}`);
    let text = texts.join('\n\n[...]\n\n');
    if (before && !texts[0].includes(before.slice(-50))) text = `${before}\n\n[...]\n\n${text}`;
    if (after) text = `${text}\n\n[...]\n\n${after}`;
    if (usedChars + text.length > charBudget) break;
    usedChars += text.length;
    const g0 = group[0];
    documentEvidence.push({
      evidenceId: `doc:${primary.document_id}:${primary.chunk_index}`,
      chunkId: primary.chunk_id || null,
      sourceType: 'document',
      trust: 'source_document',
      documentId: primary.document_id,
      filename,
      chunkIndex: primary.chunk_index,
      pageStart: primary.page_start ?? null,
      pageEnd: last.page_end ?? primary.page_end ?? null,
      heading: primary.heading || null,
      contentHash: primary.content_hash || null,
      text,
      score: g0.score,
      vectorRank: g0.vector_rank,
      lexicalRank: g0.lexical_rank,
      citation: citationLabel({
        filename,
        pageStart: primary.page_start ?? null,
        pageEnd: last.page_end ?? primary.page_end ?? null,
      }),
    });
  }

  // 9) Research como canal separado (implementación actual, sin embeddings).
  let researchEvidence = [];
  if (workspaceId) {
    try {
      const { data: memRows } = await supabase
        .from('ai_research_requests')
        .select('id,query,answer,sources,created_at')
        .eq('workspace_id', workspaceId)
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false })
        .limit(10);
      const picked = selectRelevantResearch({ researchList: memRows || [], question: q });
      researchEvidence = picked.map((r, i) => ({
        evidenceId: `research:${r.id}`,
        sourceType: 'research',
        trust: 'legal_context',
        researchId: r.id,
        query: r.query,
        date: r.created_at,
        title: r.sources?.[0]?.title || null,
        kind: r.sources?.[0]?.kind || null,
        url: r.sources?.[0]?.url || null,
        text: String(r.answer || '').slice(0, 1500),
        rank: i + 1,
      }));
    } catch {
      researchEvidence = [];
    }
  }

  const durationMs = Date.now() - startedAt;
  const pack = {
    caseContext,
    documentEvidence,
    researchEvidence,
    retrievalMetadata: {
      queryHash: hashQuery(q),
      mode: embeddingFailed && lexicalRows.length > 0 ? 'lexical' : mode,
      embeddingFailed,
      vectorCandidates: vectorRows.length,
      lexicalCandidates: lexicalRows.length,
      finalCount: documentEvidence.length,
      documentCount: new Set(documentEvidence.map((e) => e.documentId)).size,
      coverageRatio: coverage.coverageRatio,
      indexedDocuments: coverage.indexedDocuments,
      eligibleDocuments: coverage.eligibleDocuments,
      topScore: documentEvidence[0]?.score ?? null,
      durationMs,
      generatedAt: now,
    },
  };

  // Observabilidad liviana: métricas, nunca texto crudo.
  try {
    console.log('[rag-retrieval]', JSON.stringify({
      caseId, mode: pack.retrievalMetadata.mode,
      vector: vectorRows.length, lexical: lexicalRows.length,
      final: documentEvidence.length, ms: durationMs,
      qhash: hashQuery(q),
    }));
  } catch { /* best-effort */ }

  return { pack, retrievalMode: pack.retrievalMetadata.mode };
}

export function hashQuery(q) {
  let h = 0;
  const s = String(q || '');
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return `q${(h >>> 0).toString(16)}`;
}

/**
 * Valida citas del modelo contra el Pack vigente (IDs estables).
 * @returns {{valid, invalid}}
 */
export function validatePackCitations(pack, evidenceIds) {
  const known = new Set((pack?.documentEvidence || []).map((e) => e.evidenceId));
  const valid = [];
  const invalid = [];
  for (const id of evidenceIds || []) {
    (known.has(id) ? valid : invalid).push(id);
  }
  return { valid, invalid };
}

/**
 * Cobertura del índice para un caso (decisión RAG vs fallback en 4.61D).
 */
export async function getCaseRagCoverage({ supabase, lawyerId, caseId, workspaceId }) {
  const { data: docs } = await supabase
    .from('ai_documents')
    .select('id')
    .eq('workspace_id', workspaceId || '__none__')
    .eq('lawyer_id', lawyerId)
    .eq('status', 'ready');
  const eligible = (docs || []).map((d) => d.id);
  let indexed = [];
  if (eligible.length > 0) {
    const { data } = await supabase
      .from('ai_document_chunks')
      .select('document_id')
      .eq('lawyer_case_id', caseId)
      .eq('lawyer_id', lawyerId);
    indexed = [...new Set((data || []).map((r) => r.document_id))].filter((id) => eligible.includes(id));
  }
  const unindexed = eligible.filter((id) => !indexed.includes(id));
  return {
    eligibleDocuments: eligible.length,
    indexedDocuments: indexed.length,
    unindexedDocuments: unindexed,
    coverageRatio: eligible.length === 0 ? 1 : indexed.length / eligible.length,
  };
}

/**
 * Serialización con frontera explícita: el contenido es SOURCE_DATA,
 * nunca instrucciones. El consumidor debe instruir al modelo en consecuencia.
 */
export function serializeEvidencePack(pack) {
  if (!pack) return '';
  const lines = ['<<<CASE_EVIDENCE_PACK_BEGIN>>>'];
  const cc = pack.caseContext || {};
  lines.push(`[CASE] ${cc.title || ''} | ${cc.area || ''} | ${cc.status || ''}`);
  for (const e of pack.documentEvidence || []) {
    lines.push(`--- SOURCE_DATA evidence=${e.evidenceId} citation="${e.citation}" ---`);
    lines.push(e.text);
    lines.push('--- END_SOURCE_DATA ---');
  }
  for (const r of pack.researchEvidence || []) {
    lines.push(`--- LEGAL_CONTEXT research=${r.evidenceId} query="${(r.query || '').slice(0, 200)}" ---`);
    lines.push(r.text);
    lines.push('--- END_LEGAL_CONTEXT ---');
  }
  lines.push('<<<CASE_EVIDENCE_PACK_END>>>');
  return lines.join('\n');
}
