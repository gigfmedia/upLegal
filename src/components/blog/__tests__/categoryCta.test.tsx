import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const ctaClickedMock = vi.fn();
vi.mock('@/lib/track', () => ({
  track: {
    commercialCTAClicked: (...args: unknown[]) => ctaClickedMock(...args),
  },
}));

import CategoryCTA from '@/components/blog/CategoryCTA';

const ARTICLE_PATH = '/blog/no-devuelven-garantia-arriendo-chile-2026';

function renderCta() {
  window.history.pushState({}, '', ARTICLE_PATH);
  return render(
    <MemoryRouter initialEntries={[ARTICLE_PATH]}>
      <CategoryCTA category="arriendo" topic="arriendo" />
    </MemoryRouter>
  );
}

describe('CategoryCTA — commercial_cta_clicked', () => {
  beforeEach(() => ctaClickedMock.mockClear());

  it('no emite eventos al renderizar y mantiene el destino del CTA', () => {
    renderCta();
    expect(ctaClickedMock).not.toHaveBeenCalled();
    const link = screen.getByRole('link', { name: /Revisar mi caso con un abogado/ });
    expect(link.getAttribute('href')).toBe('/abogado-arriendo');
  });

  it('emite un evento por clic con slug, destino y tipo correctos', () => {
    renderCta();
    const link = screen.getByRole('link', { name: /Revisar mi caso con un abogado/ });
    fireEvent.click(link);
    expect(ctaClickedMock).toHaveBeenCalledTimes(1);
    expect(ctaClickedMock.mock.calls[0][0]).toMatchObject({
      article_slug: 'no-devuelven-garantia-arriendo-chile-2026',
      destination: '/abogado-arriendo',
      cta_type: 'category',
      legal_category: 'arriendo',
      specialty: 'arriendo',
    });
  });

  it('no duplica el evento por clic', () => {
    renderCta();
    const link = screen.getByRole('link', { name: /Revisar mi caso con un abogado/ });
    fireEvent.click(link);
    fireEvent.click(link);
    fireEvent.click(link);
    expect(ctaClickedMock).toHaveBeenCalledTimes(3);
    const payloads = ctaClickedMock.mock.calls.map(([p]) => p as Record<string, unknown>);
    expect(new Set(payloads.map((p) => JSON.stringify(p))).size).toBe(1);
  });
});
