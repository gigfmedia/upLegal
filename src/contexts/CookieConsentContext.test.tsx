import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CookieConsentProvider, useCookieConsent } from './CookieConsentContext';
import { CONSENT_STORAGE_KEY } from '@/lib/cookieConsent';

vi.mock('@/lib/consentTrackers', () => ({
  applyConsentToTrackers: vi.fn(),
  fireConsentUpdatedEvent: vi.fn(),
}));

function Probe() {
  const ctx = useCookieConsent();
  return (
    <div>
      <span data-testid="banner">{ctx.isBannerVisible ? 'visible' : 'hidden'}</span>
      <span data-testid="modal">{ctx.isPreferencesOpen ? 'open' : 'closed'}</span>
      <span data-testid="analytics">{ctx.consent?.analytics ? 'on' : 'off'}</span>
      <button data-testid="accept" onClick={ctx.acceptAll}>accept</button>
      <button data-testid="reject" onClick={ctx.rejectOptional}>reject</button>
      <button data-testid="open" onClick={ctx.openPreferences}>open</button>
      <button
        data-testid="custom"
        onClick={() => ctx.savePreferences({ analytics: true, marketing: false, preferences: true })}
      >
        custom
      </button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

function setup() {
  return render(
    <CookieConsentProvider>
      <Probe />
    </CookieConsentProvider>,
  );
}

describe('CookieConsentContext', () => {
  it('A. usuario nuevo: banner visible, todo off', () => {
    setup();
    expect(screen.getByTestId('banner')).toHaveTextContent('visible');
    expect(screen.getByTestId('analytics')).toHaveTextContent('off');
  });

  it('B. aceptar: banner desaparece y persiste todo on', () => {
    setup();
    act(() => {
      screen.getByTestId('accept').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(screen.getByTestId('banner')).toHaveTextContent('hidden');
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    expect(raw).toContain('"analytics":true');
    expect(raw).toContain('"marketing":true');
  });

  it('C. rechazar: banner desaparece y todo off', () => {
    setup();
    act(() => {
      screen.getByTestId('reject').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(screen.getByTestId('banner')).toHaveTextContent('hidden');
    expect(screen.getByTestId('analytics')).toHaveTextContent('off');
  });

  it('D. configurar: modal abre y guarda custom (analytics ON, marketing OFF)', () => {
    setup();
    act(() => {
      screen.getByTestId('open').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(screen.getByTestId('modal')).toHaveTextContent('open');
    act(() => {
      screen.getByTestId('custom').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(screen.getByTestId('modal')).toHaveTextContent('closed');
    expect(screen.getByTestId('analytics')).toHaveTextContent('on');
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? '';
    expect(raw).toContain('"analytics":true');
    expect(raw).toContain('"marketing":false');
  });

  it('E. recarga: con decisión guardada el banner no vuelve', () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ version: '1', necessary: true, analytics: true, marketing: false, preferences: false, timestamp: 'x' }),
    );
    setup();
    expect(screen.getByTestId('banner')).toHaveTextContent('hidden');
    expect(screen.getByTestId('analytics')).toHaveTextContent('on');
  });
});
