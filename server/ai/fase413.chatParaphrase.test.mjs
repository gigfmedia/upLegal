import { describe, it, expect } from 'vitest';
import { resolveChatEvidenceFromVerifiedClaims } from './chatEvidenceResolver.mjs';

const claim = (text, sourceId='doc1') => ({
  afirmacion: text,
  fragmento: text,
  source_id: sourceId,
  fragment_id: `document::${sourceId}::0`,
  evidence: text,
  page_number: 1,
  source: { id: sourceId, kind: 'document' },
});

describe('4.13 resolveChatEvidenceFromVerifiedClaims', () => {
  it('A: renta parafraseada con mismo monto → PASS', () => {
    const verified = [claim('La renta mensual es de $500.000.')];
    const ans = 'El canon mensual pactado asciende a $500.000.';
    const res = resolveChatEvidenceFromVerifiedClaims({ answer: ans, verifiedClaims: verified });
    expect(res).not.toBeNull();
    expect(res.source_id).toBe('doc1');
  });
  it('B: monto incorrecto → FAIL', () => {
    const verified = [claim('La renta mensual es de $500.000.')];
    const ans = 'El canon mensual asciende a $600.000.';
    const res = resolveChatEvidenceFromVerifiedClaims({ answer: ans, verifiedClaims: verified });
    expect(res).toBeNull();
  });
  it('C: fecha correcta → PASS', () => {
    const verified = [claim('El contrato comenzó el 1 de enero de 2026.')];
    const ans = 'El contrato comenzó el 1 de enero de 2026.';
    const res = resolveChatEvidenceFromVerifiedClaims({ answer: ans, verifiedClaims: verified });
    expect(res).not.toBeNull();
  });
  it('D: fecha incorrecta → FAIL', () => {
    const verified = [claim('El contrato comenzó el 1 de enero de 2026.')];
    const ans = 'El contrato comenzó el 1 de febrero de 2026.';
    const res = resolveChatEvidenceFromVerifiedClaims({ answer: ans, verifiedClaims: verified });
    expect(res).toBeNull();
  });
  it('E: rol correcto → PASS', () => {
    const verified = [claim('Juan Pérez es el arrendatario.')];
    const ans = 'Juan Pérez actúa como arrendatario.';
    const res = resolveChatEvidenceFromVerifiedClaims({ answer: ans, verifiedClaims: verified });
    expect(res).not.toBeNull();
  });
  it('F: rol incorrecto → FAIL', () => {
    const verified = [claim('Juan Pérez es el arrendatario.')];
    const ans = 'Juan Pérez es el arrendador.';
    const res = resolveChatEvidenceFromVerifiedClaims({ answer: ans, verifiedClaims: verified });
    expect(res).toBeNull();
  });
  it('G: dos claims ambiguos → FAIL', () => {
    const verified = [claim('La renta es de $500.000.', 'doc1'), claim('La renta es de $500.000.', 'doc2')];
    const ans = 'La renta es de $500.000.';
    const res = resolveChatEvidenceFromVerifiedClaims({ answer: ans, verifiedClaims: verified });
    expect(res).toBeNull();
  });
  it('H: claim sin source_id → FAIL', () => {
    const verified = [{ afirmacion: 'Texto', fragmento: 'Texto', source_id: '', fragment_id: 'frag', evidence: 'Texto' }];
    const res = resolveChatEvidenceFromVerifiedClaims({ answer: 'Texto', verifiedClaims: verified });
    expect(res).toBeNull();
  });
  it('N: multi-document conflicto → no selección arbitraria', () => {
    const verified = [claim('La renta es de $500.000.', 'docA'), claim('La renta es de $700.000.', 'docB')];
    const ans = 'La renta es de $500.000.';
    const res = resolveChatEvidenceFromVerifiedClaims({ answer: ans, verifiedClaims: verified });
    expect(res?.source_id).toBe('docA');
    const ans2 = 'La renta es de $600.000.';
    const res2 = resolveChatEvidenceFromVerifiedClaims({ answer: ans2, verifiedClaims: verified });
    expect(res2).toBeNull();
  });
});
