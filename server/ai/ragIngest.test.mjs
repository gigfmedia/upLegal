import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestDocumentChunks, toPgVectorLiteral } from './ragIngest.mjs';
import { chunkDocumentText } from './ragChunking.mjs';
import { embedBatch, RAG_EMBEDDING_DIMS, RAG_EMBEDDING_MODEL } from './ragEmbeddings.mjs';

// Clave ficticia: los tests mockean fetch, nunca salen a red.
process.env.AI_PROVIDER_API_KEY = process.env.AI_PROVIDER_API_KEY || 'test-key';

const vec = (v = 0.1) => Array.from({ length: RAG_EMBEDDING_DIMS }, () => v);

function mockSupabase() {
  const calls = { upsert: [], del: [], ops: [], selects: 0 };
  const stored = new Map();
  return {
    calls,
    client: {
      from: (table) => {
        if (table === 'ai_document_chunks') {
          return {
            upsert: async (rows) => {
              calls.upsert.push(rows);
              for (const r of rows) {
                stored.set(`${r.document_id}:${r.chunk_index}`, r);
              }
              return { error: null };
            },
            delete: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    gte: async () => {
                      calls.del.push(true);
                      return { error: null };
                    },
                  }),
                }),
              }),
            }),
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({ count: stored.size, head: true }),
                }),
              }),
            }),
          };
        }
        if (table === 'ai_operations') {
          return { insert: async (row) => { calls.ops.push(row); return { error: null }; } };
        }
        throw new Error(`unexpected table ${table}`);
      },
    },
  };
}

// supabase-js real: .select(...).eq(...).eq(...).eq(...) devuelve builder y
// el await final resuelve {count}. Nuestro mock simplificado:
function mockSupabaseCount(n) {
  const base = mockSupabase();
  return {
    ...base,
    client: {
      ...base.client,
      from: (table) => {
        if (table === 'ai_document_chunks') {
          const inner = base.client.from(table);
          return {
            ...inner,
            select: () => ({ eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ count: n, error: null }) }) }) }),
          };
        }
        return base.client.from(table);
      },
    },
  };
}

const doc = (over = {}) => ({
  id: 'doc-1',
  original_filename: 'contrato.pdf',
  extracted_text: `Contrato\n\n${'Cláusula relevante. '.repeat(100)}`,
  ...over,
});

const mockFetchOk = (chunks) => async () => ({
  ok: true,
  json: async () => ({
    data: chunks.map((_, i) => ({ index: i, embedding: vec(0.01 * (i + 1)) })),
  }),
});

describe('4.61B ingesta idempotente y segura', () => {
  it('indexa documento con caso: upsert + verificación de conteo', async () => {
    const expectedChunks = chunkDocumentText(doc().extracted_text).length;
    expect(expectedChunks).toBeGreaterThan(0);
    const db = mockSupabaseCount(expectedChunks);
    const res = await ingestDocumentChunks({
      supabase: db.client,
      doc: doc(),
      lawyerId: 'law-1',
      workspaceId: 'ws-1',
      caseId: 'case-1',
      deps: { fetchFn: mockFetchOk(new Array(expectedChunks).fill(0)) },
    });
    expect(res.status).toBe('indexed');
    expect(res.chunks).toBe(expectedChunks);
    // Ownership server-side en cada fila.
    const rows = db.calls.upsert.flat();
    expect(rows.length).toBe(expectedChunks);
    for (const r of rows) {
      expect(r.lawyer_id).toBe('law-1');
      expect(r.lawyer_case_id).toBe('case-1');
      expect(r.workspace_id).toBe('ws-1');
      expect(r.document_id).toBe('doc-1');
      expect(r.embedding_model).toBe(RAG_EMBEDDING_MODEL);
    }
    // Observabilidad sin cuota.
    expect(db.calls.ops[0]).toMatchObject({ capability: 'document_embedding', quota_units: 0, status: 'succeeded' });
  });

  it('workspace huérfano: skip sin escribir', async () => {
    const db = mockSupabaseCount(0);
    const res = await ingestDocumentChunks({
      supabase: db.client, doc: doc(), lawyerId: 'law-1', workspaceId: 'ws-1', caseId: null,
      deps: { fetchFn: mockFetchOk([]) },
    });
    expect(res).toMatchObject({ status: 'skipped', reason: 'orphan-workspace' });
    expect(db.calls.upsert).toHaveLength(0);
  });

  it('texto vacío: skip', async () => {
    const db = mockSupabaseCount(0);
    const res = await ingestDocumentChunks({
      supabase: db.client, doc: doc({ extracted_text: '   ' }), lawyerId: 'law-1', workspaceId: 'ws-1', caseId: 'case-1',
      deps: { fetchFn: mockFetchOk([]) },
    });
    expect(res.status).toBe('skipped');
  });

  it('falla de embeddings: failed sin romper, reintentable', async () => {
    const db = mockSupabaseCount(0);
    const res = await ingestDocumentChunks({
      supabase: db.client, doc: doc(), lawyerId: 'law-1', workspaceId: 'ws-1', caseId: 'case-1',
      deps: { fetchFn: (async () => { throw new Error('provider down'); }) },
    });
    expect(res.status).toBe('failed');
    expect(db.calls.upsert).toHaveLength(0);
    expect(db.calls.ops[0]).toMatchObject({ status: 'failed' });
  });

  it('count mismatch: failed (nada medio-indexado como completo)', async () => {
    const n = chunkDocumentText(doc().extracted_text).length;
    const db = mockSupabaseCount(n + 100);
    const res = await ingestDocumentChunks({
      supabase: db.client, doc: doc(), lawyerId: 'law-1', workspaceId: 'ws-1', caseId: 'case-1',
      deps: { fetchFn: mockFetchOk(new Array(n).fill(0)) },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toBe('count-mismatch');
  });

  it('toPgVectorLiteral valida dimensiones', () => {
    expect(() => toPgVectorLiteral([1, 2])).toThrow(/DIMS/);
    const lit = toPgVectorLiteral(vec());
    expect(lit.startsWith('[')).toBe(true);
  });
});

describe('4.61B adapter de embeddings', () => {
  it('batch único, orden por índice, valida dims', async () => {
    const fetchFn = mockFetchOk([0, 0, 0]);
    const { embeddings, model } = await embedBatch(['a', 'b', 'c'], { fetchFn });
    expect(embeddings).toHaveLength(3);
    expect(model).toBe(RAG_EMBEDDING_MODEL);
    expect(embeddings[0][0]).toBeCloseTo(0.01);
  });
  it('sin API key: error explícito sin request', async () => {
    const savedA = process.env.AI_PROVIDER_API_KEY;
    const savedB = process.env.OPENAI_API_KEY;
    delete process.env.AI_PROVIDER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const spy = vi.fn();
      await expect(embedBatch(['a'], { fetchFn: spy })).rejects.toThrow('EMBEDDING_PROVIDER_NOT_CONFIGURED');
      expect(spy).not.toHaveBeenCalled();
    } finally {
      if (savedA !== undefined) process.env.AI_PROVIDER_API_KEY = savedA;
      else process.env.AI_PROVIDER_API_KEY = 'test-key';
      if (savedB !== undefined) process.env.OPENAI_API_KEY = savedB;
    }
  });
  it('mismatch de conteo/dims: error', async () => {
    const short = (async () => ({ ok: true, json: async () => ({ data: [] }) }));
    await expect(embedBatch(['a'], { fetchFn: short })).rejects.toThrow('COUNT_MISMATCH');
  });
});
