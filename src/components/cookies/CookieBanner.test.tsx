import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import CookieBanner from './CookieBanner';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import {
  StickyBottomBarProvider,
  useStickyBottomBar,
} from '@/contexts/StickyBottomBarContext';
import {
  FLOATING_BOTTOM_BASE,
  FLOATING_BOTTOM_RAISED,
  FLOATING_COOKIE_RAISED,
} from '@/lib/floatingOffsets';

/** Controla el sticky desde el test usando la misma fuente de verdad. */
function StickyProbe({ visible }: { visible: boolean }) {
  const { setIsVisible } = useStickyBottomBar();
  useEffect(() => {
    setIsVisible(visible);
  }, [visible, setIsVisible]);
  return null;
}

/** Réplica la expresión del botón WhatsApp para probar fuente compartida. */
function WhatsAppOffsetProbe() {
  const { isVisible } = useStickyBottomBar();
  return (
    <span data-testid="wa-offset">
      {isVisible ? FLOATING_BOTTOM_RAISED : FLOATING_BOTTOM_BASE}
    </span>
  );
}

function bannerClass() {
  return screen.getByRole('dialog', { name: 'Aviso de cookies' }).className;
}

function setup(stickyVisible: boolean, path = '/abogado/test-slug') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CookieConsentProvider>
        <StickyBottomBarProvider>
          <StickyProbe visible={stickyVisible} />
          <WhatsAppOffsetProbe />
          <CookieBanner />
        </StickyBottomBarProvider>
      </CookieConsentProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('CookieBanner offset dinámico', () => {
  it('1. perfil + sticky no visible: usa BASE', () => {
    setup(false);
    expect(bannerClass()).toContain('bottom-0');
    expect(bannerClass()).not.toContain('bottom-24');
  });

  it('2. perfil + sticky visible: usa RAISED de cookie (borde alineado con WhatsApp)', () => {
    setup(true);
    expect(bannerClass()).toContain('bottom-[72px]');
  });

  it('3. sticky se oculta: vuelve a BASE', () => {
    const utils = setup(true);
    expect(bannerClass()).toContain('bottom-[72px]');
    act(() => {
      utils.rerender(
        <MemoryRouter initialEntries={['/abogado/test-slug']}>
          <CookieConsentProvider>
            <StickyBottomBarProvider>
              <StickyProbe visible={false} />
              <WhatsAppOffsetProbe />
              <CookieBanner />
            </StickyBottomBarProvider>
          </CookieConsentProvider>
        </MemoryRouter>,
      );
    });
    // Nuevo provider parte en false; la fuente real actualiza vía observer.
    expect(bannerClass()).toContain('bottom-0');
  });

  it('4. ruta normal: siempre BASE', () => {
    setup(false, '/');
    expect(bannerClass()).toContain('bottom-0');
    expect(bannerClass()).not.toContain('bottom-24');
  });

  it('5. WhatsApp y cookie consumen la misma fuente de verdad', () => {
    setup(true);
    // Ambos reaccionan al mismo estado del contexto; la cookie compensa su
    // padding interno para alinear su borde con el botón.
    expect(screen.getByTestId('wa-offset').textContent).toBe(FLOATING_BOTTOM_RAISED);
    expect(bannerClass()).toContain(FLOATING_COOKIE_RAISED);
  });

  it('transición vertical suave sin animar opacity', () => {
    setup(false);
    const cls = bannerClass();
    expect(cls).toContain('transition-[bottom]');
    expect(cls).toContain('duration-200');
    expect(cls).toContain('motion-reduce:transition-none');
  });
});
