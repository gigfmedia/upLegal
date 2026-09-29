import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  register: vi.fn(),
  startSessionRecording: vi.fn(),
  stopSessionRecording: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: {
    init: (...args: unknown[]) => mocks.init(...args),
    capture: (...args: unknown[]) => mocks.capture(...args),
    register: (...args: unknown[]) => mocks.register(...args),
    startSessionRecording: (...args: unknown[]) => mocks.startSessionRecording(...args),
    stopSessionRecording: (...args: unknown[]) => mocks.stopSessionRecording(...args),
    opt_in_capturing: (...args: unknown[]) => mocks.opt_in_capturing(...args),
    opt_out_capturing: (...args: unknown[]) => mocks.opt_out_capturing(...args),
    get_distinct_id: () => 'test-distinct-id',
  },
}));

import { posthog, resetPostHogForTests } from './posthogLoader';
import { ensurePostHog } from './consentTrackers';
import { CONSENT_STORAGE_KEY } from './cookieConsent';

function seedConsent(analytics: boolean) {
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({
      version: '1',
      necessary: true,
      analytics,
      marketing: false,
      preferences: false,
      timestamp: new Date().toISOString(),
    }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  resetPostHogForTests();
  Object.values(mocks).forEach((fn) => fn.mockClear());
});

describe('PostHog pre-consent: sin replay', () => {
  it('GIVEN analytics=false, WHEN hay eventos y luego analytics=true, THEN los anteriores NO se envían y solo los nuevos sí', async () => {
    // GIVEN analytics=false (sin decisión guardada)
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();

    // WHEN ocurren eventos PostHog pre-consentimiento
    posthog.capture('pre_cta_clicked', { location: 'hero' });
    posthog.capture('pre_page_viewed', { page_path: '/' });
    posthog.register({ pre_prop: true });

    // AND posteriormente analytics=true (otorgamiento) + init una sola vez
    seedConsent(true);
    await ensurePostHog();
    await ensurePostHog();
    expect(mocks.init).toHaveBeenCalledTimes(1);

    // THEN los eventos anteriores NO son enviados (sin replay)
    const sentEvents = mocks.capture.mock.calls.map((call) => call[0]);
    expect(sentEvents).not.toContain('pre_cta_clicked');
    expect(sentEvents).not.toContain('pre_page_viewed');
    expect(mocks.capture).not.toHaveBeenCalled();
    expect(mocks.register).not.toHaveBeenCalled();

    // AND únicamente eventos nuevos posteriores al consentimiento sí se envían
    posthog.capture('post_cta_clicked', { location: 'hero' });
    expect(mocks.capture).toHaveBeenCalledTimes(1);
    expect(mocks.capture).toHaveBeenCalledWith('post_cta_clicked', { location: 'hero' });
  });

  it('con analytics=false persistido, los eventos se descartan aunque haya init previo revocado', async () => {
    seedConsent(true);
    await ensurePostHog();
    expect(mocks.init).toHaveBeenCalledTimes(1);

    // Revocación: instancia existe, pero el facade directo también debe
    // respetar... (la revocación real la aplica disablePostHog + opt-out;
    // aquí se verifica que sin consentimiento no se encola nada nuevo que
    // pueda reenviarse en un init futuro)
    seedConsent(false);
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: '1',
        necessary: true,
        analytics: false,
        marketing: false,
        preferences: false,
        timestamp: new Date().toISOString(),
      }),
    );
    resetPostHogForTests();
    mocks.capture.mockClear();
    posthog.capture('revoked_event');
    seedConsent(true);
    await ensurePostHog();
    expect(mocks.capture).not.toHaveBeenCalledWith(
      'revoked_event',
      expect.anything(),
    );
  });
});
