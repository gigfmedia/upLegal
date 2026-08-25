import { describe, it, expect } from 'vitest';
import { resolveMultiClaimEvidence } from './chatEvidenceResolver.mjs';

const claim = (text, id) => ({
  afirmacion: text,
  fragmento: text,
  source_id: id,
  fragment_id: `document::${id}::0`,
  evidence: text,
  page_number: 1,
  source: { id, kind: 'document' },
});

describe('4.16 clause-level', () => {
  it('A: una oración con dos claims y dos números → 2 evidencias', () => {
    const verified = [
      { afirmacion: 'La renta mensual es de $500.000.', fragmento: 'La renta mensual es de $500.000.', source_id: 'doc1', fragment_id: 'document::doc1::0', evidence: 'La renta mensual es de $500.000.', page_number: 1, source: { id: 'doc1', kind: 'document' } },
      { afirmacion: 'El contrato dura 12 meses.', fragmento: 'El contrato dura 12 meses.', source_id: 'doc1', fragment_id: 'document::doc1::1', evidence: 'El contrato dura 12 meses.', page_number: 2, source: { id: 'doc1', kind: 'document' } },
    ];
    const ans = 'La renta mensual es de $500.000 y el contrato dura 12 meses.';
    const res = resolveMultiClaimEvidence({ answer: ans, verifiedClaims: verified });
    expect(res).toHaveLength(2);
  });
  it('F: no dividir Juan Pérez y María González', () => {
    const verified = [claim('Juan Pérez y María González firmaron el contrato.', 'doc1')];
    const ans = 'Juan Pérez y María González firmaron el contrato.';
    const res = resolveMultiClaimEvidence({ answer: ans, verifiedClaims: verified });
    expect(res).toHaveLength(1);
  });
  it('G: y no separable sin verbo/número → no dividir', () => {
    const verified = [claim('La renta y los gastos comunes deben pagarse.', 'doc1')];
    const ans = 'La renta y los gastos comunes deben pagarse.';
    const res = resolveMultiClaimEvidence({ answer: ans, verifiedClaims: verified });
    expect(res).toHaveLength(1);
  });
  it('M: monto incorrecto → reject', () => {
    const verified = [claim('La renta mensual es de $500.000.', 'doc1')];
    const ans = 'La renta mensual es de $500.000 y el contrato dura 12 meses.';
    // ans tiene $500k (correcto) y 12 meses (sin claim para 12 meses) → solo 1 debe matchear, el otro no
    const res = resolveMultiClaimEvidence({ answer: ans, verifiedClaims: verified });
    expect(res).toHaveLength(1);
    expect(res[0].afirmacion).toContain('500.000');
  });
  it('preserva orden', () => {
    const v1 = { afirmacion: 'La renta es de $500.000.', fragmento: 'La renta es de $500.000.', source_id: 'doc1', fragment_id: 'document::doc1::0', evidence: 'La renta es de $500.000.', page_number: 1, source: { id: 'doc1', kind: 'document' } };
    const v2 = { afirmacion: 'El contrato comenzó el 1 de enero de 2026.', fragmento: 'El contrato comenzó el 1 de enero de 2026.', source_id: 'doc1', fragment_id: 'document::doc1::1', evidence: 'El contrato comenzó el 1 de enero de 2026.', page_number: 2, source: { id: 'doc1', kind: 'document' } };
    const ans = 'El contrato comenzó el 1 de enero de 2026. La renta es de $500.000.';
    const res = resolveMultiClaimEvidence({ answer: ans, verifiedClaims: [v1, v2] });
    expect(res[0].afirmacion).toContain('1 de enero');
    expect(res[1].afirmacion).toContain('500.000');
  });
});
