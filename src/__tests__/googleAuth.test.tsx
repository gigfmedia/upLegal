import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  sanitizePostAuthRedirect,
  storePostAuthRedirect,
  consumePostAuthRedirect,
  beginGoogleSignIn,
} from '@/lib/googleAuth';

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
