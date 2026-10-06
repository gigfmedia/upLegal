import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  CONSENT_ERROR,
  TERMS_PATH,
  PRIVACY_PATH,
  buildConsentPatch,
  hasLegalConsent,
  sanitizeRedirectForConsent,
} from '@/lib/legalConsent';
import { TermsConsentCheckbox } from '@/components/auth/TermsConsentCheckbox';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('FASE 5.6 — constantes y helpers', () => {
  it('versiones estables y copy exacto', () => {
    expect(CURRENT_TERMS_VERSION).toBe('2026-10-06');
    expect(CURRENT_PRIVACY_VERSION).toBe('2026-10-06');
    expect(TERMS_PATH).toBe('/terminos');
    expect(PRIVACY_PATH).toBe('/privacidad');
    expect(CONSENT_ERROR).toContain('Debes aceptar');
  });
  it('6/7. patch con timestamps + versiones; detección de aceptación', () => {
    const patch = buildConsentPatch('2026-10-06T00:00:00.000Z');
    expect(patch).toMatchObject({
      terms_accepted_at: '2026-10-06T00:00:00.000Z',
      terms_version: '2026-10-06',
      privacy_acknowledged_at: '2026-10-06T00:00:00.000Z',
      privacy_version: '2026-10-06',
    });
    expect(hasLegalConsent(patch)).toBe(true);
    expect(hasLegalConsent(null)).toBe(false);
    expect(hasLegalConsent({ terms_accepted_at: 'x' })).toBe(false);
  });
  it('redirect post-consent solo interno', () => {
    expect(sanitizeRedirectForConsent('/lawyer/cases')).toBe('/lawyer/cases');
    expect(sanitizeRedirectForConsent('https://evil/x')).toBe('/');
    expect(sanitizeRedirectForConsent(null)).toBe('/');
  });
  it('migración: columnas nullable sin backfill', () => {
    const sql = read('supabase/migrations/20261016000000_legal_consent.sql');
    for (const col of ['terms_accepted_at', 'terms_version', 'privacy_acknowledged_at', 'privacy_version']) {
      expect(sql).toContain(col);
    }
    expect(sql).not.toMatch(/NOT NULL|UPDATE public.profiles SET/i);
  });
});

describe('FASE 5.6 — checkbox', () => {
  it('10. desmarcado por defecto; 9. links correctos en nueva pestaña', () => {
    render(
      <MemoryRouter>
        <TermsConsentCheckbox checked={false} onCheckedChange={() => {}} />
      </MemoryRouter>
    );
    const box = screen.getByRole('checkbox');
    expect(box).not.toBeChecked();
    const terms = screen.getByRole('link', { name: 'Términos y Condiciones' });
    expect(terms).toHaveAttribute('href', '/terminos');
    expect(terms).toHaveAttribute('target', '_blank');
    const privacy = screen.getByRole('link', { name: 'Política de Privacidad' });
    expect(privacy).toHaveAttribute('href', '/privacidad');
    expect(privacy).toHaveAttribute('target', '_blank');
    expect(screen.getByText(/Acepto los/)).toBeInTheDocument();
  });
  it('click alterna; 11. sin marketing', () => {
    const onChange = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <TermsConsentCheckbox checked={false} onCheckedChange={onChange} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(container.textContent).not.toMatch(/novedades|marketing|ofertas/i);
  });
  it('error accesible asociado', () => {
    render(
      <MemoryRouter>
        <TermsConsentCheckbox checked={false} onCheckedChange={() => {}} error="Requerido" />
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Requerido');
  });
});

describe('FASE 5.6 — wiring en flujos', () => {
  it('1/2. signup email exige aceptación; login no la muestra', () => {
    const modal = read('src/components/AuthModal.tsx');
    expect(modal).toContain('if (!termsAccepted)');
    expect(modal).toContain('CONSENT_ERROR');
    // Checkbox solo en signup (bloque condicional por mode).
    const signupBlock = modal.slice(modal.indexOf('requireConsent={mode'));
    expect(signupBlock).toContain('TermsConsentCheckbox');
  });
  it('3/8. login no bloquea: gate solo en handleSignup + callback tolerante', () => {
    const modal = read('src/components/AuthModal.tsx');
    expect(modal).not.toMatch(/handleLogin[\s\S]{0,400}termsAccepted/);
    const cb = read('src/pages/auth/AuthCallback.tsx');
    expect(cb).toContain('ante error de lectura no bloquear acceso');
  });
  it('4/5. Google signup exige pre-OAuth; existentes pasan post-callback', () => {
    const btn = read('src/components/auth/GoogleSignInButton.tsx');
    expect(btn).toContain('requireConsent');
    expect(btn).toContain('consentGiven');
    const cb = read('src/pages/auth/AuthCallback.tsx');
    expect(cb).toContain('/auth/consent');
    expect(cb).toContain('consentRow');
  });
  it('ruta /auth/consent existe y ConsentPage persiste timestamps', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('path="/auth/consent"');
    const page = read('src/pages/auth/ConsentPage.tsx');
    expect(page).toContain('buildConsentPatch');
    expect(page).toContain("from('profiles')");
  });
});
