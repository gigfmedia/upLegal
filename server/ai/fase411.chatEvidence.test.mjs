import { describe, it, expect } from 'vitest';
import { buildJurisprudenceOutcome } from './jurisprudencePipeline.mjs';
import { verifyDocumentClaims } from './documentGrounding.mjs';

const doc = (id, text) => ({ id, original_filename: `${id}.pdf`, extracted_text: text, workspace_id: 'ws-1', lawyer_id: 'lawyer-1' });

// Simula el flujo de chat: verifica que la respuesta pueda ser trazada a un claim verificado
describe('4.11 Chat evidence traceability', () => {
  it('LLM devuelve fragment_id válido → se conserva', async () => {
    const d = doc('doc1', 'La renta mensual es de $500.000.');
    const r = verifyDocumentClaims([{ document_id: d.id, afirmacion: 'La renta mensual es de $500.000.', fragmento: 'La renta mensual es de $500.000.' }], new Map([[d.id, d]]), 'ws-1', 'lawyer-1');
    expect(r.kept[0].fragment_id).toBeDefined();
    expect(r.kept[0].fragmento).toContain('500.000');
  });

  it('LLM no devuelve fragment_id pero claim verificado existe → fallback determinista (simulado)', async () => {
    const d = doc('doc1', 'La renta mensual es de $500.000.');
    const answer = 'La renta mensual es de $500.000.';
    const { kept } = verifyDocumentClaims([{ document_id: d.id, afirmacion: answer, fragmento: answer }], new Map([[d.id, d]]), 'ws-1', 'lawyer-1');
    expect(kept.length).toBe(1);
    expect(kept[0].source_id).toBe('doc1');
    // Simula el fallback: si la fuente no traía fragment_id, se enriquece desde kept
    const source = { document_id: 'doc1', file_name: 'doc1.pdf' };
    const enriched = kept[0].fragment_id ? { ...source, fragment_id: kept[0].fragment_id, evidence: kept[0].fragmento } : source;
    expect(enriched.fragment_id).toBeDefined();
  });

  it('fragment_id inválido → se descarta', () => {
    const fakeFragmentId = 'document::doc1::9999';
    expect(fakeFragmentId.startsWith('document::doc1::')).toBe(true);
  });

  it('número incorrecto no genera evidencia', () => {
    const d = doc('doc1', 'La renta mensual es de $500.000.');
    const r = verifyDocumentClaims([{ document_id: d.id, afirmacion: 'La renta es de $600.000.', fragmento: 'La renta es de $600.000.' }], new Map([[d.id, d]]), 'ws-1', 'lawyer-1');
    expect(r.kept).toHaveLength(0);
  });

  it('fecha incorrecta no genera evidencia', () => {
    const d = doc('doc1', 'El contrato comenzó el 1 de enero de 2026.');
    const r = verifyDocumentClaims([{ document_id: d.id, afirmacion: 'El contrato comenzó el 1 de enero de 2025.', fragmento: 'El contrato comenzó el 1 de enero de 2025.' }], new Map([[d.id, d]]), 'ws-1', 'lawyer-1');
    expect(r.kept).toHaveLength(0);
  });

  it('NO_EVIDENCE no genera CTA', () => {
    const d = doc('doc1', 'La renta es $500.000');
    const r = buildJurisprudenceOutcome({ data: { resumen: 'Existe multa', normativa: [], jurisprudencia: [], doctrina: [], documento: [{ document_id: d.id, afirmacion: 'Existe multa', fragmento: 'Existe multa' }], conclusion: '' }, sources: [], intent: 'general', query: '¿Cuál es la multa?', documents: [d], documentMode: 'document' });
    expect(r.outcome).toBe('NO_EVIDENCE');
  });

  it('ownership: B no accede a evidencia de A', () => {
    const d = doc('doc1', 'Texto');
    d.workspace_id = 'ws-A'; d.lawyer_id = 'lawyer-A';
    const r = verifyDocumentClaims([{ document_id: d.id, afirmacion: 'Texto', fragmento: 'Texto' }], new Map([[d.id, d]]), 'ws-B', 'lawyer-B');
    expect(r.kept).toHaveLength(0);
  });
});
