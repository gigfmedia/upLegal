import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DRAFT_RAG_ADDENDUM,
  DRAFT_RAG_DOC_CHARS,
  attachPackProvenance,
  draftRagObservability,
  filterDraftSourcesByPack,
  decideChatRagMode,
} from './caseDraftRag.mjs';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf-8');

const pack = {
  documentEvidence: [
    { evidenceId: 'doc:d1:0', documentId: 'd1', filename: 'a.pdf', pageStart: 2, pageEnd: 2, contentHash: 'h1', text: 't' },
    { evidenceId: 'doc:d2:0', documentId: 'd2', filename: 'b.pdf', pageStart: null, pageEnd: null, contentHash: 'h2', text: 'u' },
  ],
  researchEvidence: [
    { evidenceId: 'research:r1', researchId: 'r1', query: 'q', date: 'd', title: 'T', kind: 'k', url: 'https://x', text: 'a' },
  ],
  retrievalMetadata: { eligibleDocuments: 2, indexedDocuments: 2, coverageRatio: 1 },
};

describe('4.61E adaptador RAG de drafting', () => {
  it('decide modos reutilizando la autoridad central', () => {
    expect(decideChatRagMode({ pack, retrievalMode: 'hybrid' })).toBe('rag-full');
    expect(decideChatRagMode({ pack: null, retrievalMode: 'error' })).toBe('legacy');
  });
  it('addendum: contradicciones, faltantes, inyección, research-vs-hecho', () => {
    expect(DRAFT_RAG_ADDENDUM).toContain('POR COMPLETAR');
    expect(DRAFT_RAG_ADDENDUM).toContain('discrepan');
    expect(DRAFT_RAG_ADDENDUM).toContain('no confiable como instrucci');
    expect(DRAFT_RAG_ADDENDUM).toContain('no crea hechos');
  });
  it('presupuesto documental acotado (no vuelve al dump)', () => {
    expect(DRAFT_RAG_DOC_CHARS).toBeLessThanOrEqual(16000);
  });
  it('69. fuente inexistente no persiste; research inventada tampoco', () => {
    const { sources, droppedPack } = filterDraftSourcesByPack([
      { document_id: 'd1', file_name: 'a.pdf' },
      { document_id: 'dx', file_name: 'x.pdf' },
      { research_id: 'r1' },
      { research_id: 'fake', url: 'https://evil/x' },
      null,
    ], { packDocIds: ['d1'], fallbackDocIds: [], packResearchIds: ['r1'], legacyResearchIds: [] });
    expect(sources).toHaveLength(2);
    expect(droppedPack).toBe(3);
  });
  it('fallback permitido conserva fuentes legacy válidas', () => {
    const { sources } = filterDraftSourcesByPack(
      [{ document_id: 'd9', file_name: 'n.pdf' }],
      { packDocIds: ['d1'], fallbackDocIds: ['d9'], packResearchIds: [], legacyResearchIds: [] }
    );
    expect(sources).toHaveLength(1);
  });
  it('71. provenance estable: evidence_id + páginas reales u omitidas', () => {
    const out = attachPackProvenance([
      { document_id: 'd1', file_name: 'a.pdf' },
      { document_id: 'd2', file_name: 'b.pdf' },
      { document_id: 'd9', file_name: 'n.pdf' },
    ], pack);
    expect(out[0]).toMatchObject({ evidence_id: 'doc:d1:0', page_start: 2, page_end: 2, content_hash: 'h1' });
    expect(out[1].page_start).toBeUndefined();
    expect(out[2]).not.toHaveProperty('evidence_id');
  });
  it('observabilidad sin texto crudo', () => {
    const obs = draftRagObservability({ mode: 'rag-full', pack, droppedPack: 1, validatedDoc: 2, validatedResearch: 1 });
    expect(obs).toMatchObject({ retrieval_mode: 'rag-full', coverage_ratio: 1, dropped_pack_sources: 1 });
    expect(JSON.stringify(obs)).not.toContain('a.pdf');
  });
});

describe('4.61E integración en ruta (estático)', () => {
  const src = () => read('server.mjs');
  it('retrieval una vez por generación con la instrucción como query', () => {
    const s = src();
    expect(s).toContain('retrieveCaseEvidence');
    expect(s).toContain('query: instruction');
    // Sin duplicar lógica vector/FTS en el handler.
    const handler = s.slice(s.indexOf('// FASE 4.61E — retrieval canónico'), s.indexOf('if (!isAIProviderConfigured())'));
    expect(handler).not.toMatch(/<=>|ts_rank|content_tsv/);
  });
  it('FULL omite legacy; PARTIAL acota a no-indexados; ZERO intacto', () => {
    const s = src();
    expect(s).toContain("draftRagMode === 'rag-full'");
    expect(s).toContain('unindexedIds.has(d.id)');
    expect(s).toContain('EVIDENCIA PRIMARIA DEL CASO (fragmentos relevantes)');
  });
  it('kill switch, planes y metering intactos', () => {
    const s = src();
    expect(s).toContain("AI_DRAFTING_ENABLED !== '1'");
    expect(s).toContain('DRAFTING_ALLOWED_PLANS');
    expect(s).toContain("capability: 'case_drafting'");
  });
  it('PUT/editar y GETs no tocan retrieval', () => {
    const s = src();
    const putIdx = s.indexOf("app.put('/api/ai/cases/:caseId/drafts/:draftId'");
    const seg = s.slice(putIdx, putIdx + 3000);
    expect(seg).not.toContain('retrieveCaseEvidence');
  });
});
