import { describe, it, expect } from 'vitest';
import { resolveChatEvidenceFromVerifiedClaims, resolveMultiClaimEvidence } from './chatEvidenceResolver.mjs';

const claim = (text, id, idx=0) => ({
  afirmacion: text,
  fragmento: text,
  source_id: id,
  fragment_id: `document::${id}::${idx}`,
  evidence: text,
  page_number: idx+1,
  source: { id, kind: 'document' },
});

describe('4.17 multi-claim with scoring and priority', () => {
  it('A single claim', () => {
    const v=[claim('La renta mensual es de $500.000.', 'doc1')];
    expect(resolveMultiClaimEvidence({answer:'La renta mensual es de $500.000.', verifiedClaims:v})).toHaveLength(1);
  });
  it('C three claims', () => {
    const v=[claim('La renta mensual es de $500.000.', 'doc1',0), claim('El contrato comenzó el 1 de enero de 2026.', 'doc1',1), claim('El contrato tiene una duración de 12 meses.', 'doc1',2)];
    const ans='La renta mensual es de $500.000. El contrato comenzó el 1 de enero de 2026. El contrato tiene una duración de 12 meses.';
    expect(resolveMultiClaimEvidence({answer:ans, verifiedClaims:v})).toHaveLength(3);
  });
  it('E five claims', () => {
    const v=[
      claim('La renta mensual es de $500.000.', 'doc1',0),
      claim('El contrato comenzó el 1 de enero de 2026.', 'doc1',1),
      claim('El contrato tiene una duración de 12 meses.', 'doc1',2),
      claim('El arrendatario debe pagar los gastos comunes.', 'doc2',0),
      claim('María López es arrendadora.', 'doc1',3),
    ];
    const ans='La renta mensual es de $500.000. El contrato comenzó el 1 de enero de 2026. El contrato tiene una duración de 12 meses. El arrendatario debe pagar los gastos comunes. María López es arrendadora.';
    expect(resolveMultiClaimEvidence({answer:ans, verifiedClaims:v})).toHaveLength(5);
  });
  it('G numbers correct', () => {
    const v=[claim('La renta mensual es de $500.000.', 'doc1')];
    expect(resolveChatEvidenceFromVerifiedClaims({answer:'La renta mensual asciende a $500.000.', verifiedClaims:v})).not.toBeNull();
  });
  it('H número incorrecto', () => {
    const v=[claim('La renta mensual es de $500.000.', 'doc1')];
    expect(resolveChatEvidenceFromVerifiedClaims({answer:'La renta mensual asciende a $600.000.', verifiedClaims:v})).toBeNull();
  });
  it('M frase genérica', () => {
    const v=[claim('La renta mensual es de $500.000.', 'doc1')];
    expect(resolveMultiClaimEvidence({answer:'Esto podría requerir revisión.', verifiedClaims:v})).toHaveLength(0);
  });
  it('Q duplicados', () => {
    const v=[claim('La renta mensual es de $500.000.', 'doc1',0)];
    expect(resolveMultiClaimEvidence({answer:'La renta es de $500.000. La renta es de $500.000.', verifiedClaims:v})).toHaveLength(1);
  });
  it('S orden', () => {
    const v=[claim('La renta es de $500.000.', 'doc1',0), claim('El contrato comenzó el 1 de enero de 2026.', 'doc1',1)];
    const ans='El contrato comenzó el 1 de enero de 2026. La renta es de $500.000.';
    const res=resolveMultiClaimEvidence({answer:ans, verifiedClaims:v});
    expect(res[0].afirmacion).toContain('1 de enero');
    expect(res[1].afirmacion).toContain('500.000');
  });
});
