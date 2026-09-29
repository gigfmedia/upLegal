import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ACCEPT_ALL_CONSENT,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  DEFAULT_CONSENT,
  getStoredConsent,
  hasAnalyticsConsent,
  hasDecidedConsent,
  hasMarketingConsent,
  normalizePreferences,
  saveConsent,
  subscribeConsent,
} from './cookieConsent';

beforeEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('cookieConsent — defaults', () => {
  it('sin decisión: defaults opcionales en false y necessary true', () => {
    expect(DEFAULT_CONSENT).toEqual({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
    expect(getStoredConsent()).toBeNull();
    expect(hasDecidedConsent()).toBe(false);
    expect(hasAnalyticsConsent()).toBe(false);
    expect(hasMarketingConsent()).toBe(false);
  });
});

describe('cookieConsent — aceptar todas', () => {
  it('persiste todo en true con versión y timestamp', () => {
    const stored = saveConsent(ACCEPT_ALL_CONSENT);
    expect(stored.necessary).toBe(true);
    expect(stored.analytics).toBe(true);
    expect(stored.marketing).toBe(true);
    expect(stored.preferences).toBe(true);
    expect(stored.version).toBe(CONSENT_VERSION);
    expect(typeof stored.timestamp).toBe('string');
    expect(getStoredConsent()).toEqual(stored);
    expect(hasDecidedConsent()).toBe(true);
  });
});

describe('cookieConsent — rechazar opcionales', () => {
  it('persiste solo necessary en true', () => {
    saveConsent(DEFAULT_CONSENT);
    expect(getStoredConsent()).toMatchObject({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      version: CONSENT_VERSION,
    });
  });
});

describe('cookieConsent — preferencias custom', () => {
  it('guarda analytics ON y marketing OFF', () => {
    saveConsent({ analytics: true, marketing: false, preferences: true });
    expect(getStoredConsent()).toMatchObject({
      analytics: true,
      marketing: false,
      preferences: true,
    });
  });

  it('necessary no se puede desactivar aunque se intente', () => {
    expect(normalizePreferences({ necessary: false, analytics: true } as never)).toMatchObject({
      necessary: true,
      analytics: true,
    });
    const stored = saveConsent({ analytics: false } as never);
    expect(stored.necessary).toBe(true);
  });
});

describe('cookieConsent — versionado', () => {
  it('versión distinta se considera pendiente (banner de nuevo)', () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ version: '0', necessary: true, analytics: true, timestamp: 'x' }),
    );
    expect(getStoredConsent()).toBeNull();
    expect(hasDecidedConsent()).toBe(false);
  });

  it('JSON corrupto se considera sin decisión', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'no-json{{{');
    expect(getStoredConsent()).toBeNull();
  });
});

describe('cookieConsent — suscriptores', () => {
  it('notifica a listeners same-tab al guardar', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeConsent(listener);
    saveConsent(ACCEPT_ALL_CONSENT);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({ analytics: true });
    unsubscribe();
    saveConsent(DEFAULT_CONSENT);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
