import { describe, it, expect } from 'vitest';
import { resolveBlogCtaDestination } from '@/components/blog/blogCtaDestinations';

describe('blogCtaDestinations', () => {
  it('target explícito siempre gana', () => {
    expect(
      resolveBlogCtaDestination({
        slug: 'no-devuelven-garantia-arriendo-chile-2026',
        category: 'Derecho Civil',
        targetUrl: '/abogado-arriendo',
      })
    ).toBe('/abogado-arriendo');
  });

  it('resuelve por categoría del artículo (no del prop)', () => {
    // Aunque el CTA declare Derecho Civil, el artículo es Inmobiliario.
    expect(
      resolveBlogCtaDestination({
        slug: 'no-devuelven-garantia-arriendo-chile-2026',
        category: 'Derecho Civil',
      })
    ).toBe('/abogado-arriendo');
    expect(
      resolveBlogCtaDestination({
        slug: 'divorcio-de-mutuo-acuerdo-chile-2026',
        category: 'Derecho de Familia',
      })
    ).toBe('/abogado-familia');
    expect(
      resolveBlogCtaDestination({
        slug: 'despido-injustificado-chile-2026',
        category: 'Derecho Laboral',
      })
    ).toBe('/abogados-laborales');
  });

  it('categoría sin landing dedicada cae a búsqueda genérica', () => {
    expect(
      resolveBlogCtaDestination({ slug: 'inexistente-xyz', category: 'Derecho Civil' })
    ).toBe('/search?specialty=Derecho%20Civil');
  });

  it('sin slug usa la categoría del componente', () => {
    expect(resolveBlogCtaDestination({ category: 'Derecho Penal' })).toBe('/abogado-penal');
  });
});
