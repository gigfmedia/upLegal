import { describe, it, expect } from 'vitest';
import { verifyDocumentClaims } from './documentGrounding.mjs';

const doc = (id, text) => ({ id, original_filename: `${id}.pdf`, extracted_text: text, workspace_id: 'ws-1', lawyer_id: 'lawyer-1' });

// Simula la verificación de análisis: cada hecho debe estar respaldado
describe('4.5 análisis grounding', () => {
  it('hecho con monto correcto se mantiene', () => {
    const d = doc('doc1', 'La renta mensual es de $500.000.');
    const r = verifyDocumentClaims([{ document_id: d.id, afirmacion: 'La renta mensual es de $500.000.', fragmento: 'La renta mensual es de $500.000.' }], new Map([[d.id, d]]), 'ws-1', 'lawyer-1');
    expect(r.kept).toHaveLength(1);
  });
  it('monto incorrecto se descarta', () => {
    const d = doc('doc1', 'La renta mensual es de $500.000.');
    const r = verifyDocumentClaims([{ document_id: d.id, afirmacion: 'La renta es de $700.000.', fragmento: 'La renta es de $700.000.' }], new Map([[d.id, d]]), 'ws-1', 'lawyer-1');
    expect(r.kept).toHaveLength(0);
  });
  it('fecha incorrecta se descarta', () => {
    const d = doc('doc1', 'El contrato comenzó el 1 de enero de 2026.');
    const r = verifyDocumentClaims([{ document_id: d.id, afirmacion: 'El contrato comenzó el 1 de enero de 2025.', fragmento: 'El contrato comenzó el 1 de enero de 2025.' }], new Map([[d.id, d]]), 'ws-1', 'lawyer-1');
    expect(r.kept).toHaveLength(0);
  });
  it('paráfrasis válida se mantiene', () => {
    const d = doc('doc1', 'El contrato comenzó el 1 de enero de 2026.');
    const r = verifyDocumentClaims([{ document_id: d.id, afirmacion: 'El contrato comenzó el 1 de enero de 2026.', fragmento: 'El contrato comenzó el 1 de enero de 2026.' }], new Map([[d.id, d]]), 'ws-1', 'lawyer-1');
    expect(r.kept).toHaveLength(1);
  });
  it('hecho inexistente se descarta', () => {
    const d = doc('doc1', 'La renta mensual es de $500.000.');
    const r = verifyDocumentClaims([{ document_id: d.id, afirmacion: 'Existe una multa de $1.000.000.', fragmento: 'Existe una multa de $1.000.000.' }], new Map([[d.id, d]]), 'ws-1', 'lawyer-1');
    expect(r.kept).toHaveLength(0);
  });
});
