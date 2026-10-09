import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const trackEventMock = vi.fn();
vi.mock('@/lib/track', () => ({ trackEvent: (...args: unknown[]) => trackEventMock(...args) }));
vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

import { IpcReviewCTA } from '@/components/blog/IpcReviewCTA';

function renderBlock() {
  window.history.pushState({}, '', '/blog/reajuste-arriendo-ipc-chile-2026');
  return render(
    <MemoryRouter initialEntries={['/blog/reajuste-arriendo-ipc-chile-2026']}>
      <IpcReviewCTA />
    </MemoryRouter>
  );
}

describe('5.20B bloque revisión post-calculadora', () => {
  beforeEach(() => trackEventMock.mockClear());
  it('copy: propuesta concreta sin promesas ni urgencia', () => {
    renderBlock();
    expect(screen.getByText(/comprobar si el reajuste corresponde en tu contrato/)).toBeDefined();
    expect(screen.getByText(/La cláusula y la periodicidad acordada/)).toBeDefined();
    const link = screen.getByRole('link', { name: /Consultar por mi reajuste de arriendo/ });
    expect(link.getAttribute('href')).toBe('/abogado-arriendo');
  });

  it('shown una vez con source específico; click con destino', () => {
    renderBlock();
    const shown = trackEventMock.mock.calls.filter(([e]) => e === 'ipc_review_block_shown');
    expect(shown).toHaveLength(1);
    expect(shown[0][1]).toMatchObject({
      article_slug: 'reajuste-arriendo-ipc-chile-2026',
      source: 'ipc_review_block',
      destination: '/abogado-arriendo',
    });
    fireEvent.click(screen.getByRole('link', { name: /Consultar por mi reajuste de arriendo/ }));
    fireEvent.click(screen.getByRole('link', { name: /Consultar por mi reajuste de arriendo/ }));
    const clicked = trackEventMock.mock.calls.filter(([e]) => e === 'ipc_review_block_clicked');
    expect(clicked).toHaveLength(2);
    expect(clicked[0][1]).toMatchObject({ source: 'ipc_review_block' });
  });

  it('artículo: bloque tras calculadora y antes de ejemplos; resto intacto', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/pages/blog/reajuste-arriendo-ipc-chile-2026.tsx'),
      'utf8'
    );
    const calc = src.indexOf('Calculadora IPC arriendo 2026');
    const block = src.indexOf('<IpcReviewCTA />');
    const examples = src.indexOf('Ejemplos reales de reajuste');
    expect(calc).toBeGreaterThan(-1);
    expect(block).toBeGreaterThan(calc);
    expect(examples).toBeGreaterThan(block);
    // Alcance: sin tocar RelatedLawyers, calculadora, SEO.
    expect(src).toContain('<RelatedLawyers');
    expect(src).toContain('setRentValue');
    expect(src).toContain('<IpcReviewCTA />');
    expect(src.match(/<IpcReviewCTA \/>/g)).toHaveLength(1);
  });
});
