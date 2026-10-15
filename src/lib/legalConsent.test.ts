import { describe, it, expect } from 'vitest';
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  getValidTranscribableAcceptance,
} from './legalConsent';

const VALID = {
  terms_acceptance: {
    acceptedAt: new Date().toISOString(),
    termsVersion: CURRENT_TERMS_VERSION,
    privacyVersion: CURRENT_PRIVACY_VERSION,
  },
};

describe('legalConsent — getValidTranscribableAcceptance', () => {
  it('aceptación vigente del modal: devuelve el patch transcribible', () => {
    const patch = getValidTranscribableAcceptance({ terms_acceptance: VALID.terms_acceptance });
    expect(patch).toMatchObject({
      terms_version: CURRENT_TERMS_VERSION,
      privacy_version: CURRENT_PRIVACY_VERSION,
    });
    expect(patch?.terms_accepted_at).toBe(VALID.terms_acceptance.acceptedAt);
    expect(patch?.privacy_acknowledged_at).toBe(VALID.terms_acceptance.acceptedAt);
  });

  it('sin metadata o sin clave: null (→ interstitial)', () => {
    expect(getValidTranscribableAcceptance(null)).toBeNull();
    expect(getValidTranscribableAcceptance({})).toBeNull();
    expect(getValidTranscribableAcceptance({ terms_acceptance: null })).toBeNull();
  });

  it('versiones antiguas: null (hay que re-aceptar los textos vigentes)', () => {
    expect(
      getValidTranscribableAcceptance({
        terms_acceptance: { ...VALID.terms_acceptance, termsVersion: '2024-01-01' },
      }),
    ).toBeNull();
    expect(
      getValidTranscribableAcceptance({
        terms_acceptance: { ...VALID.terms_acceptance, privacyVersion: '2024-01-01' },
      }),
    ).toBeNull();
  });

  it('fecha inválida o futura: null (nunca se inventa evidencia)', () => {
    expect(
      getValidTranscribableAcceptance({
        terms_acceptance: { ...VALID.terms_acceptance, acceptedAt: 'no-fecha' },
      }),
    ).toBeNull();
    expect(
      getValidTranscribableAcceptance({
        terms_acceptance: {
          ...VALID.terms_acceptance,
          acceptedAt: new Date(Date.now() + 3600_000).toISOString(),
        },
      }),
    ).toBeNull();
  });
});
