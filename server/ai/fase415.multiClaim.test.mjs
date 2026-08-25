import { describe, it, expect } from 'vitest';
import { resolveMultiClaimEvidence, resolveChatEvidenceFromVerifiedClaims } from './chatEvidenceResolver.mjs';

const claim = (text, sourceId='doc1') => ({
  afirmacion: text,
  fragmento: text,
  source_id: sourceId,
  fragment_id: `document::${sourceId}::0`,
  evidence: text,
  page_number: 1,
  source: { id: sourceId, kind: 'document' },
});

describe('4.15 multi-claim', () => {
  it('A single sentence', () => {
    const verified = [claim('La renta mensual es de $500.000.', 'doc1')];
    const ans = 'La renta mensual es de $500.000.';
    const res = resolveMultiClaimEvidence({ answer: ans, verifiedClaims: verified });
    expect(res).toHaveLength(1);
    expect(res[0].source_id).toBe('doc1');
  });
  it('B two sentences two claims', () => {
    const verified = [
      { afirmacion: 'La renta mensual es de $500.000.', fragmento: 'La renta mensual es de $500.000.', source_id: 'doc1', fragment_id: 'document::doc1::0', evidence: 'La renta mensual es de $500.000.', page_number: 1, source: { id: 'doc1', kind: 'document' } },
      { afirmacion: 'El contrato comenzó el 1 de enero de 2026.', fragmento: 'El contrato comenzó el 1 de enero de 2026.', source_id: 'doc1', fragment_id: 'document::doc1::1', evidence: 'El contrato comenzó el 1 de enero de 2026.', page_number: 2, source: { id: 'doc1', kind: 'document' } },
    ];
    const ans = 'La renta mensual es de $500.000. El contrato comenzó el 1 de enero de 2026.';
    const res = resolveMultiClaimEvidence({ answer: ans, verifiedClaims: verified });
    expect(res).toHaveLength(2);
  });
  it('C three sentences', () => {
    const verified = [
      { afirmacion: 'La renta es de $500.000.', fragmento: 'La renta es de $500.000.', source_id: 'doc1', fragment_id: 'document::doc1::0', evidence: 'La renta es de $500.000.', page_number: 1, source: { id: 'doc1', kind: 'document' } },
      { afirmacion: 'El contrato comenzó el 1 de enero de 2026.', fragmento: 'El contrato comenzó el 1 de enero de 2026.', source_id: 'doc1', fragment_id: 'document::doc1::1', evidence: 'El contrato comenzó el 1 de enero de 2026.', page_number: 2, source: { id: 'doc1', kind: 'document' } },
      { afirmacion: 'El arrendatario debe pagar los gastos comunes.', fragmento: 'El arrendatario debe pagar los gastos comunes.', source_id: 'doc2', fragment_id: 'document::doc2::0', evidence: 'El arrendatario debe pagar los gastos comunes.', page_number: 1, source: { id: 'doc2', kind: 'document' } },
    ];
    const ans = 'La renta es de $500.000. El contrato comenzó el 1 de enero de 2026. El arrendatario debe pagar los gastos comunes.';
    const res = resolveMultiClaimEvidence({ answer: ans, verifiedClaims: verified });
    expect(res).toHaveLength(3);
  });
  it('E two claims same doc', () => {
    const verified = [claim('La renta es de $500.000.', 'doc1'), claim('El contrato comenzó el 1 de enero de 2026.', 'doc1')];
    const ans = 'La renta es de $500.000. El contrato comenzó el 1 de enero de 2026.';
    const res = resolveMultiClaimEvidence({ answer: ans, verifiedClaims: verified });
    expect(res.every(c => c.source_id === 'doc1')).toBe(true);
  });
  it('F one sentence no match', () => {
    const verified = [claim('La renta es de $500.000.', 'doc1')];
    const ans = 'Existe una cláusula inexistente.';
    const res = resolveMultiClaimEvidence({ answer: ans, verifiedClaims: verified });
    expect(res).toHaveLength(0);
  });
  it('H monto incorrecto', () => {
    const verified = [claim('La renta es de $500.000.', 'doc1')];
    const ans = 'La renta es de $600.000.';
    const res = resolveMultiClaimEvidence({ answer: ans, verifiedClaims: verified });
    expect(res).toHaveLength(0);
  });
  it('L deduplication', () => {
    const verified = [claim('La renta es de $500.000.', 'doc1')];
    const ans = 'La renta es de $500.000. La renta es de $500.000.';
    const res = resolveMultiClaimEvidence({ answer: ans, verifiedClaims: verified });
    expect(res).toHaveLength(1);
  });
  it('preserves order', () => {
    const verified = [claim('La renta es de $500.000.', 'doc1'), claim('El contrato comenzó el 1 de enero de 2026.', 'doc2')];
    const ans = 'El contrato comenzó el 1 de enero de 2026. La renta es de $500.000.';
    const res = resolveMultiClaimEvidence({ answer: ans, verifiedClaims: verified });
    expect(res[0].source_id).toBe('doc2');
    expect(res[1].source_id).toBe('doc1');
  });
});
