import { describe, it, expect } from 'vitest';
import {
  RAG_INSTRUCTIONS,
  PARTIAL_FALLBACK_CHARS,
  decideChatRagMode,
  buildRagContext,
  enrichSourcesWithPack,
  ragObservability,
} from './caseChatRag.mjs';
import { serializeEvidencePack } from './ragRetrieval.mjs';

const packFull = {
  caseContext: { title: 'Caso Pérez' },
  documentEvidence: [
    { evidenceId: 'doc:d1:0', filename: 'a.pdf', pageStart: 4, pageEnd: 4, text: 't' },
    { evidenceId: 'doc:d1:3', filename: 'a.pdf', pageStart: null, pageEnd: null, text: 'u' },
  ],
  researchEvidence: [
    { evidenceId: 'research:r1', researchId: 'r1', query: 'q', date: 'd', title: 'T', kind: 'k', url: 'https://x', text: 'a' },
  ],
  retrievalMetadata: { eligibleDocuments: 2, indexedDocuments: 2, coverageRatio: 1 },
};

describe('4.61D modos de contexto', () => {
  it('centraliza FULL/PARTIAL/LEGACY (cutover futuro aquí)', () => {
    expect(decideChatRagMode({ pack: packFull, retrievalMode: 'hybrid' })).toBe('rag-full');
    expect(decideChatRagMode({
      pack: { ...packFull, retrievalMetadata: { eligibleDocuments: 2, indexedDocuments: 1, coverageRatio: 0.5 } },
      retrievalMode: 'hybrid',
    })).toBe('rag-partial');
    expect(decideChatRagMode({
      pack: { ...packFull, retrievalMetadata: { eligibleDocuments: 2, indexedDocuments: 0, coverageRatio: 0 } },
      retrievalMode: 'lexical',
    })).toBe('legacy');
    expect(decideChatRagMode({ pack: null, retrievalMode: 'error' })).toBe('legacy');
    expect(decideChatRagMode({ pack: packFull, retrievalMode: 'invalid' })).toBe('legacy');
  });
  it('PARTIAL_FALLBACK_CHARS acotado (no vuelve al dump)', () => {
    expect(PARTIAL_FALLBACK_CHARS).toBeLessThanOrEqual(12000);
  });
});

describe('4.61D instrucciones del prompt', () => {
  it('contrato de citación + abstención + contradicciones + inyección', () => {
    expect(RAG_INSTRUCTIONS).toContain('evidence_id');
    expect(RAG_INSTRUCTIONS).toContain('RESEARCH:');
    expect(RAG_INSTRUCTIONS).toContain('NUNCA inventes un evidence_id');
    expect(RAG_INSTRUCTIONS).toContain('CONTRADICCIONES');
    expect(RAG_INSTRUCTIONS).toContain('ABSTENCI');
    expect(RAG_INSTRUCTIONS).toContain('NO CONFIABLE');
    expect(RAG_INSTRUCTIONS).toContain('RUT');
  });
  it('research mapeado al formato del validador existente', () => {
    const { contextBlock, researchSelected } = buildRagContext(packFull, serializeEvidencePack);
    expect(contextBlock).toContain('SOURCE_DATA');
    expect(contextBlock).toContain('LEGAL_CONTEXT');
    expect(researchSelected).toEqual([{ id: 'r1', query: 'q', created_at: 'd', sources: [{ url: 'https://x' }] }]);
  });
});

describe('4.61D validación de citas contra el Pack', () => {
  it('válida recibe página honesta; inválida se degrada sin romperse', () => {
    const { sources, validCitations, invalidCitations } = enrichSourcesWithPack([
      { document_id: 'd1', file_name: 'a.pdf', evidence_id: 'doc:d1:0' },
      { document_id: 'd1', file_name: 'a.pdf', evidence_id: 'doc:fake:9' },
      { document_id: 'd1', file_name: 'a.pdf' },
    ], packFull);
    expect(validCitations).toBe(1);
    expect(invalidCitations).toBe(1);
    expect(sources[0].page_number).toBe(4);
    expect(sources[1]).not.toHaveProperty('evidence_id');
    expect(sources[2].file_name).toBe('a.pdf');
  });
  it('página ausente no inventa número', () => {
    const { sources } = enrichSourcesWithPack(
      [{ document_id: 'd1', file_name: 'a.pdf', evidence_id: 'doc:d1:3' }],
      packFull
    );
    expect(sources[0].page_number).toBeUndefined();
  });
  it('observabilidad sin texto crudo', () => {
    const obs = ragObservability({ mode: 'rag-full', pack: packFull, validCitations: 2, invalidCitations: 1, retrievalMs: 120 });
    expect(obs).toMatchObject({ retrieval_mode: 'rag-full', coverage_ratio: 1, valid_citations: 2, invalid_citations: 1 });
    expect(JSON.stringify(obs)).not.toContain('Caso Pérez');
  });
});

describe('4.61D integración en ruta (estático)', () => {
  it('handlers usan retrieval una vez por operación (chat caso + drafting)', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(resolve(process.cwd(), 'server.mjs'), 'utf-8');
    expect(src).toContain('retrieveCaseEvidence');
    // Exactamente dos sitios canónicos: chat caso y generación de borrador.
    const calls = src.match(/retrieveCaseEvidence\(/g) || [];
    expect(calls.length).toBe(2);
    // Document Chat (prioritizedDocumentId) excluido del path RAG.
    expect(src).toContain('if (!prioritizedDocumentId)');
  });
});
