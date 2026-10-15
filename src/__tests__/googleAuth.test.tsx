import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  sanitizePostAuthRedirect,
  storePostAuthRedirect,
  consumePostAuthRedirect,
  buildGoogleTermsSnapshot,
  beginGoogleSignIn,
} from '@/lib/googleAuth';
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  hasCurrentLegalConsent,
  storePendingConsent,
  consumePendingConsent,
} from '@/lib/legalConsent';

const oauthState = vi.hoisted(() => ({ calls: [] as unknown[] }));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOAuth: async (args: unknown) => {
        oauthState.calls.push(args);
        return { data: { url: 'https://accounts.google.com/x' }, error: null };
      },
    },
  },
}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

describe('FASE 4.60A — redirect seguro e inicio OAuth', () => {
  it('solo rutas internas', () => {
    expect(sanitizePostAuthRedirect('/lawyer/cases')).toBe('/lawyer/cases');
    expect(sanitizePostAuthRedirect('https://attacker/x')).toBeNull();
    expect(sanitizePostAuthRedirect('//attacker/x')).toBeNull();
    expect(sanitizePostAuthRedirect('javascript:alert(1)')).toBeNull();
    expect(sanitizePostAuthRedirect('')).toBeNull();
    expect(sanitizePostAuthRedirect(null)).toBeNull();
    expect(sanitizePostAuthRedirect('/lawyer/cases?x=%2F%2Fevil')).toBe('/lawyer/cases?x=//evil');
  });
  it('store/consume una sola vez', () => {
    storePostAuthRedirect('/lawyer/dashboard');
    expect(consumePostAuthRedirect()).toBe('/lawyer/dashboard');
    expect(consumePostAuthRedirect()).toBeNull();
  });
  it('role lawyer solo explícito; nunca admin ni query', async () => {
    await beginGoogleSignIn({ role: 'lawyer' });
    expect(oauthState.calls[0]).toMatchObject({
      provider: 'google',
      options: expect.objectContaining({ data: { role: 'lawyer' } }),
    });
    oauthState.calls.length = 0;
    await beginGoogleSignIn({});
    expect(oauthState.calls[0]).not.toMatchObject({ options: expect.objectContaining({ data: expect.anything() }) });
  });
  it('redirectTo canónico al callback (scopes por defecto del provider)', async () => {
    oauthState.calls.length = 0;
    await beginGoogleSignIn({});
    const opts = (oauthState.calls[0] as { options: Record<string, unknown> }).options;
    expect(String(opts.redirectTo)).toMatch(/\/auth\/callback$/);
    expect(opts).not.toHaveProperty('scopes');
  });
  it('termsAcceptance NO viaja en options.data (el SDK lo descarta): va al puente local', async () => {
    oauthState.calls.length = 0;
    window.localStorage.clear();
    await beginGoogleSignIn({
      termsAcceptance: buildGoogleTermsSnapshot('2026-10-15T12:00:00.000Z'),
    });
    const opts = (oauthState.calls[0] as { options: Record<string, unknown> }).options;
    expect(opts).not.toHaveProperty('data');
    const bridged = consumePendingConsent(new Date('2026-10-15T12:05:00.000Z').getTime());
    expect(bridged).toMatchObject({
      terms_version: CURRENT_TERMS_VERSION,
      privacy_version: CURRENT_PRIVACY_VERSION,
    });
    // Consumo único: segunda lectura vacía.
    expect(consumePendingConsent()).toBeNull();
  });
});

describe('Puente de consentimiento modal→OAuth (localStorage, un solo uso)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  it('marcado: guarda y consume el patch con versiones vigentes', () => {
    storePendingConsent(buildGoogleTermsSnapshot('2026-10-15T12:00:00.000Z'));
    const patch = consumePendingConsent(new Date('2026-10-15T12:05:00.000Z').getTime());
    expect(patch?.terms_accepted_at).toBe('2026-10-15T12:00:00.000Z');
    expect(patch?.terms_version).toBe(CURRENT_TERMS_VERSION);
  });
  it('no marcado (sin snapshot): null sin pedir nada', () => {
    expect(consumePendingConsent()).toBeNull();
  });
  it('expirado (>15min): null y limpia', () => {
    storePendingConsent(buildGoogleTermsSnapshot('2026-10-15T12:00:00.000Z'));
    expect(consumePendingConsent(new Date('2026-10-15T12:16:00.000Z').getTime())).toBeNull();
    expect(window.localStorage.getItem('legalup_pending_consent')).toBeNull();
  });
  it('versión obsoleta o forma rota: null', () => {
    window.localStorage.setItem(
      'legalup_pending_consent',
      JSON.stringify({ acceptedAt: new Date().toISOString(), termsVersion: '2024-01-01', privacyVersion: CURRENT_PRIVACY_VERSION }),
    );
    expect(consumePendingConsent()).toBeNull();
    window.localStorage.setItem('legalup_pending_consent', 'no-json{{{');
    expect(consumePendingConsent()).toBeNull();
  });
});

describe('Consentimiento vigente (timestamps + versiones)', () => {
  it('vigente solo con timestamps y versiones actuales', () => {
    const ts = '2026-10-15T12:00:00.000Z';
    expect(
      hasCurrentLegalConsent({
        terms_accepted_at: ts,
        terms_version: CURRENT_TERMS_VERSION,
        privacy_acknowledged_at: ts,
        privacy_version: CURRENT_PRIVACY_VERSION,
      }),
    ).toBe(true);
  });
  it('timestamps con versión obsoleta: no vigente', () => {
    const ts = '2026-10-15T12:00:00.000Z';
    expect(
      hasCurrentLegalConsent({
        terms_accepted_at: ts,
        terms_version: '2024-01-01',
        privacy_acknowledged_at: ts,
        privacy_version: CURRENT_PRIVACY_VERSION,
      }),
    ).toBe(false);
    expect(hasCurrentLegalConsent({ terms_accepted_at: ts })).toBe(false);
    expect(hasCurrentLegalConsent(null)).toBe(false);
  });
});

describe('FASE 4.60A — botón Continuar con Google', () => {
  beforeEach(() => {
    oauthState.calls.length = 0;
  });
  it('render prominente full-width con copy correcto', () => {
    render(<GoogleSignInButton />);
    const btn = screen.getByRole('button', { name: 'Continuar con Google' });
    expect(btn.className).toMatch(/w-full/);
    expect(screen.getByText('Usaremos tu cuenta de Google solo para iniciar sesión.')).toBeInTheDocument();
  });
  it('click inicia OAuth sin rol en contexto cliente', async () => {
    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));
    await waitFor(() => expect(oauthState.calls).toHaveLength(1));
  });
  it('contexto abogado propaga role lawyer', async () => {
    render(<GoogleSignInButton role="lawyer" />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));
    await waitFor(() => expect(oauthState.calls).toHaveLength(1));
    expect(oauthState.calls[0]).toMatchObject({
      options: expect.objectContaining({ data: { role: 'lawyer' } }),
    });
  });
});
