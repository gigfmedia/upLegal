import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const ctaClickedMock = vi.fn();
vi.mock('@/lib/track', () => ({
  track: {
    commercialCTAClicked: (...args: unknown[]) => ctaClickedMock(...args),
  },
}));
vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: false }),
}));

import InArticleCTA from '@/components/blog/InArticleCTA';

const ARTICLE_PATH = '/blog/impugnacion-paternidad-chile-2026';

function renderCta() {
  window.history.pushState({}, '', ARTICLE_PATH);
  return render(
    <MemoryRouter initialEntries={[ARTICLE_PATH]}>
      <InArticleCTA
        category="Derecho de Familia"
        title="¿Dudas de la paternidad de un hijo?"
        message="Un abogado de familia puede evaluar tu caso."
        buttonText="Ver abogados y disponibilidad"
        badges={['Abogados verificados', 'Consulta online', '60 minutos', 'Agenda según disponibilidad']}
        priceNote="Consulta desde $30.000 CLP. Precio final y disponibilidad se muestran al reservar."
      />
    </MemoryRouter>
  );
}

describe('InArticleCTA — oferta familiar', () => {
  beforeEach(() => {
    ctaClickedMock.mockClear();
    sessionStorage.clear();
  });

  it('resuelve familia a su landing y muestra precio/disponibilidad sin promesas', () => {
    renderCta();
    const link = screen.getByRole('link', { name: /Ver abogados y disponibilidad/ });
    expect(link.getAttribute('href')).toBe('/abogado-familia');
    expect(screen.getByText(/Consulta desde \$30\.000 CLP/)).toBeDefined();
    expect(screen.getByText('Agenda según disponibilidad')).toBeDefined();
    expect(screen.queryByText('Respuesta hoy')).toBeNull();
  });

  it('emite un solo clic comercial y conserva article_slug', () => {
    renderCta();
    fireEvent.click(screen.getByRole('link', { name: /Ver abogados y disponibilidad/ }));
    expect(ctaClickedMock).toHaveBeenCalledTimes(1);
    expect(ctaClickedMock.mock.calls[0][0]).toMatchObject({
      article_slug: 'impugnacion-paternidad-chile-2026',
      destination: '/abogado-familia',
      cta_location: 'in_article',
      cta_type: 'in_article',
      legal_category: 'Derecho de Familia',
    });
    expect(sessionStorage.getItem('legalup_article_slug')).toBe('impugnacion-paternidad-chile-2026');
  });
});
