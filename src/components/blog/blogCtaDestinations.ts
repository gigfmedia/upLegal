import { articles } from '@/data/blogArticles';

/**
 * Destino comercial canónico por categoría de artículo.
 * Solo categorías con landing dedicada y ruta de reserva verificada.
 * Sin landing dedicada → búsqueda genérica (comportamiento anterior).
 */
const CATEGORY_LANDING: Record<string, string> = {
  'Derecho Inmobiliario': '/abogado-arriendo',
  'Derecho de Familia': '/abogado-familia',
  'Derecho Penal': '/abogado-penal',
  'Derecho Laboral': '/abogados-laborales',
};

type ResolveInput = {
  /** Slug del artículo (de la ruta). Manda sobre `category`. */
  slug?: string;
  /** Categoría declarada en el componente (fallback). */
  category: string;
  /** Destino explícito: siempre gana. */
  targetUrl?: string;
};

function searchTarget(category: string): string {
  return `/search?specialty=${encodeURIComponent(category)}`;
}

/**
 * Resuelve a dónde debe llevar un CTA de blog cuando no trae destino explícito.
 * Prioridad: targetUrl explícito > categoría del artículo en el registro >
 * categoría del componente > búsqueda genérica.
 */
export function resolveBlogCtaDestination({ slug, category, targetUrl }: ResolveInput): string {
  if (targetUrl) return targetUrl;
  if (slug) {
    const entry = articles.find((a) => a.id === slug);
    if (entry?.category && CATEGORY_LANDING[entry.category]) {
      return CATEGORY_LANDING[entry.category];
    }
  }
  if (CATEGORY_LANDING[category]) return CATEGORY_LANDING[category];
  return searchTarget(category);
}
