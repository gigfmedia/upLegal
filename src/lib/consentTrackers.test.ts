import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./posthogLoader', () => ({
  loadPostHog: vi.fn(() => Promise.resolve({})),
  getPostHogInstance: vi.fn(() => null),
  posthog: { capture: vi.fn() },
}));

import { loadPostHog } from './posthogLoader';
import {
  disableGa4,
  disablePostHog,
  ensureGa4Loaded,
  ensureMarketingTrackers,
  ensurePostHog,
  resetTrackersForTests,
} from './consentTrackers';
import { CONSENT_STORAGE_KEY } from './cookieConsent';

const GA_ID = 'G-ZJCG1RNJT6';

function seedConsent(marketing: boolean, analytics = true) {
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({
      version: '1',
      necessary: true,
      analytics,
      marketing,
      preferences: false,
      timestamp: new Date().toISOString(),
    }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  delete (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`];
  (window as unknown as Record<string, unknown>).dataLayer = [];
  (window as unknown as Record<string, unknown>).gtag = function () {
    ((window as unknown as Record<string, unknown>).dataLayer as unknown[]).push(arguments);
  };
  delete (window as unknown as Record<string, unknown>).ttq;
  vi.clearAllMocks();
  resetTrackersForTests();
});

describe('gating GA4', () => {
  it('sin consentimiento: no inyecta gtag.js', () => {
    ensureGa4Loaded();
    const scripts = Array.from(document.querySelectorAll('script')).filter((s) =>
      (s.src || '').includes('gtag/js'),
    );
    expect(scripts).toHaveLength(0);
  });

  it('con analytics consent: inyecta gtag.js una sola vez', () => {
    seedConsent(false, true);
    ensureGa4Loaded();
    ensureGa4Loaded();
    const scripts = Array.from(document.querySelectorAll('script')).filter((s) =>
      (s.src || '').includes('gtag/js'),
    );
    expect(scripts).toHaveLength(1);
    expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`]).toBeUndefined();
  });

  it('revocar analytics: niega storage y marca opt-out', () => {
    seedConsent(false, true);
    ensureGa4Loaded();
    disableGa4();
    expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`]).toBe(true);
  });
});

describe('gating PostHog', () => {
  it('sin consentimiento: no llama posthog.init', () => {
    expect(ensurePostHog()).toBeNull();
    expect(loadPostHog).not.toHaveBeenCalled();
  });

  it('con analytics consent: inicializa', async () => {
    seedConsent(false, true);
    await ensurePostHog();
    expect(loadPostHog).toHaveBeenCalledTimes(1);
  });

  it('revocar: opt-out sin romper si nunca se inicializó', () => {
    expect(() => disablePostHog()).not.toThrow();
  });
});

describe('gating marketing (TikTok)', () => {
  it('sin marketing consent: no carga el pixel', () => {
    const load = vi.fn();
    (window as unknown as Record<string, unknown>).ttq = { load };
    seedConsent(false, true);
    ensureMarketingTrackers();
    expect(load).not.toHaveBeenCalled();
  });

  it('con marketing consent: carga el pixel', () => {
    const load = vi.fn();
    const page = vi.fn();
    (window as unknown as Record<string, unknown>).ttq = { load, page };
    seedConsent(true, true);
    ensureMarketingTrackers();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
