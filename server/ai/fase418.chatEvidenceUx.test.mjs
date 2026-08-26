import { describe, it, expect } from 'vitest';
import { resolveMultiClaimEvidence } from './chatEvidenceResolver.mjs';

const claim = (text, id, idx=0) => ({
  afirmacion: text,
  fragmento: text,
  source_id: id,
  fragment_id: `document::${id}::${idx}`,
  evidence: text,
  page_number: idx+1,
  source: { id, kind: 'document' },
});

describe('4.18 chat evidence UX - sentence-level', () => {
  it('A single claim → 1 source', () => {
    const v=[claim('La renta mensual es de $500.000.', 'doc1')];
    expect(resolveMultiClaimEvidence({answer:'La renta mensual es de $500.000.', verifiedClaims:v})).toHaveLength(1);
  });
  it('B three claims → 3 evidencias', () => {
    const v=[claim('La renta es de $500.000.', 'doc1',0), claim('El contrato comenzó el 1 de enero de 2026.', 'doc1',1), claim('El plazo es de 12 meses.', 'doc1',2)];
    const ans='La renta es de $500.000. El contrato comenzó el 1 de enero de 2026. El plazo es de 12 meses.';
    expect(resolveMultiClaimEvidence({answer:ans, verifiedClaims:v})).toHaveLength(3);
  });
  it('C five claims → 5', () => {
    const v=[
      claim('La renta es de $500.000.', 'doc1',0),
      claim('El contrato comenzó el 1 de enero de 2026.', 'doc1',1),
      claim('El plazo es de 12 meses.', 'doc1',2),
      claim('Gastos comunes al arrendatario.', 'doc2',0),
      claim('María López es arrendadora.', 'doc1',3),
    ];
    const ans='La renta es de $500.000. El contrato comenzó el 1 de enero de 2026. El plazo es de 12 meses. Gastos comunes al arrendatario. María López es arrendadora.';
    expect(resolveMultiClaimEvidence({answer:ans, verifiedClaims:v})).toHaveLength(5);
  });
  it('D dos claims mismo fragmento → no duplicar', () => {
    const v=[claim('La renta es de $500.000.', 'doc1',0)];
    const ans='La renta es de $500.000. La renta es de $500.000.';
    expect(resolveMultiClaimEvidence({answer:ans, verifiedClaims:v})).toHaveLength(1);
  });
  it('E dos documentos → sources independientes', () => {
    const v=[claim('Renta A $300.000', 'docA',0), claim('Renta B $700.000', 'docB',0)];
    const ans='Renta A $300.000. Renta B $700.000.';
    const res=resolveMultiClaimEvidence({answer:ans, verifiedClaims:v});
    expect(res.map(r=>r.source_id).sort()).toEqual(['docA','docB']);
  });
  it('F parcialmente respaldada → solo verificada', () => {
    const v=[claim('La renta es de $500.000.', 'doc1',0)];
    const ans='La renta es de $500.000. Existe una multa de $2.000.000.';
    const res=resolveMultiClaimEvidence({answer:ans, verifiedClaims:v});
    expect(res).toHaveLength(1);
    expect(res[0].afirmacion).toContain('500.000');
  });
  it('G NO_EVIDENCE → 0', () => {
    const v=[claim('La renta es de $500.000.', 'doc1',0)];
    expect(resolveMultiClaimEvidence({answer:'No hay antecedentes suficientes.', verifiedClaims:v})).toHaveLength(0);
  });
  it('H ambiguo → 0', () => {
    const v=[claim('La renta es de $500.000.', 'docA',0), claim('La renta es de $500.000.', 'docB',0)];
    expect(resolveMultiClaimEvidence({answer:'La renta es de $500.000.', verifiedClaims:v})).toHaveLength(0);
  });
  it('K contradicción → ambas', () => {
    const v=[claim('La renta es de $500.000.', 'docA',0), claim('La renta es de $600.000.', 'docB',0)];
    const ans='La renta es de $500.000. La renta es de $600.000.';
    const res=resolveMultiClaimEvidence({answer:ans, verifiedClaims:v});
    expect(res).toHaveLength(2);
  });
});
