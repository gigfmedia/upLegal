import { describe, it, expect } from 'vitest';
import { verifyDocumentClaims } from './documentGrounding.mjs';

const doc = (id, text) => ({ id, original_filename: `${id}.pdf`, extracted_text: text, workspace_id: 'ws-1', lawyer_id: 'lawyer-1' });

describe('4.8 EvidenceNavigator — document evidence', () => {
  it('claim con evidencia muestra page_number y evidence', () => {
    const d = doc('doc1', 'La renta mensual es de $500.000. El plazo es de 12 meses.');
    const r = verifyDocumentClaims([{ document_id: d.id, afirmacion: 'La renta mensual es de $500.000.', fragmento: 'La renta mensual es de $500.000.' }], new Map([[d.id, d]]), 'ws-1', 'lawyer-1');
    expect(r.kept[0].fragment_id).toBeDefined();
    expect(r.kept[0].fragmento).toContain('500.000');
  });
  it('claim sin source_id no muestra evidencia', () => {
    const d = doc('doc1', 'Texto');
    const r = verifyDocumentClaims([{ document_id: '', afirmacion: 'Hecho', fragmento: 'Hecho' }], new Map([[d.id, d]]), 'ws-1', 'lawyer-1');
    expect(r.kept).toHaveLength(0);
  });
  it('multi-document: claim A no cruza a doc B', () => {
    const dA = doc('docA', 'La renta del local A es de $300.000 pesos mensuales.');
    const dB = doc('docB', 'La renta del local B es de $700.000 pesos mensuales.');
    const rA = verifyDocumentClaims([{ document_id: 'docA', afirmacion: 'La renta del local A es de $300.000 pesos mensuales.', fragmento: 'La renta del local A es de $300.000 pesos mensuales.' }], new Map([[dA.id, dA], [dB.id, dB]]), 'ws-1', 'lawyer-1');
    expect(rA.kept[0].source_id).toBe('docA');
    const rB = verifyDocumentClaims([{ document_id: 'docB', afirmacion: 'La renta del local B es de $700.000 pesos mensuales.', fragmento: 'La renta del local B es de $700.000 pesos mensuales.' }], new Map([[dA.id, dA], [dB.id, dB]]), 'ws-1', 'lawyer-1');
    expect(rB.kept[0].source_id).toBe('docB');
  });
  it('ownership: B no accede a evidencia de A', () => {
    const d = doc('doc1', 'Texto');
    d.workspace_id = 'ws-A'; d.lawyer_id = 'lawyer-A';
    const r = verifyDocumentClaims([{ document_id: d.id, afirmacion: 'Hecho', fragmento: 'Hecho' }], new Map([[d.id, d]]), 'ws-B', 'lawyer-B');
    expect(r.kept).toHaveLength(0);
  });
});
