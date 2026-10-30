import { posthog } from './posthogLoader';
import { getGA4Attribution } from './ga4';

export type BookingAttribution = {
  posthog_distinct_id: string | null;
  ga_client_id: string | null;
  ga_session_id: string | null;
  article_slug: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  source?: string | null;
  cta_location?: string | null;
};

const ARTICLE_SLUG_KEY = 'legalup_article_slug';
const ARTICLE_TARGET_KEY = 'legalup_article_target';
const ARTICLE_SOURCE_KEY = 'legalup_article_source';
const ARTICLE_ENGAGED_KEY = 'legalup_article_engaged';

function normalizePath(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = String(value).split('#')[0].split('?')[0].trim();
  if (!trimmed) return null;
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, '') : withLeadingSlash;
}

function isProfilePath(pathname: string): boolean {
  return pathname.startsWith('/abogado/');
}

function isBookingPath(pathname: string): boolean {
  return pathname === '/booking' || pathname.startsWith('/booking/');
}

function hasExplicitArticleParam(search: string): boolean {
  try { return Boolean(new URLSearchParams(search || '').get('article_slug')); } catch { return false; }
}

/**
 * Registra la atribución de un clic comercial dentro de un artículo.
 * Guarda además el destino esperado y el artículo de origen para poder
 * validar el recorrido artículo → CTA → landing/perfil → reserva sin que la
 * atribución se herede en visitas independientes posteriores.
 */
export function persistArticleSlug(
  slug: string | null | undefined,
  destination?: string | null,
  sourcePath?: string | null,
) {
  if (!slug) return;
  try {
    sessionStorage.setItem(ARTICLE_SLUG_KEY, slug);
    const target = normalizePath(destination);
    if (target) sessionStorage.setItem(ARTICLE_TARGET_KEY, target);
    else sessionStorage.removeItem(ARTICLE_TARGET_KEY);
    const source = normalizePath(sourcePath);
    if (source) sessionStorage.setItem(ARTICLE_SOURCE_KEY, source);
    else sessionStorage.removeItem(ARTICLE_SOURCE_KEY);
    sessionStorage.removeItem(ARTICLE_ENGAGED_KEY);
  } catch { /* atribución best-effort */ }
}

export function clearArticleAttribution() {
  try {
    sessionStorage.removeItem(ARTICLE_SLUG_KEY);
    sessionStorage.removeItem(ARTICLE_TARGET_KEY);
    sessionStorage.removeItem(ARTICLE_SOURCE_KEY);
    sessionStorage.removeItem(ARTICLE_ENGAGED_KEY);
  } catch { /* atribución best-effort */ }
}

function readArticleState() {
  try {
    return {
      slug: sessionStorage.getItem(ARTICLE_SLUG_KEY),
      target: sessionStorage.getItem(ARTICLE_TARGET_KEY),
      source: sessionStorage.getItem(ARTICLE_SOURCE_KEY),
      engaged: sessionStorage.getItem(ARTICLE_ENGAGED_KEY) === '1',
    };
  } catch {
    return { slug: null, target: null, source: null, engaged: false };
  }
}

/**
 * Devuelve el article_slug solo si la atribución sigue vigente para la ruta
 * actual: parámetro explícito, destino del CTA, artículo de origen o
 * perfil/booking alcanzado después de pasar por el destino.
 */
export function resolveStoredArticleSlug(
  pathname = typeof window !== 'undefined' ? window.location.pathname : '',
  search = typeof window !== 'undefined' ? window.location.search : '',
): string | null {
  const { slug, target, source, engaged } = readArticleState();
  if (!slug) return null;
  if (hasExplicitArticleParam(search)) return slug;
  const path = normalizePath(pathname) || '/';
  if (target && path === target) return slug;
  if (source && path === source) return slug;
  if (engaged && (isProfilePath(path) || isBookingPath(path))) return slug;
  return null;
}

/**
 * Housekeeping de navegación: marca el recorrido como "enganchado" al llegar
 * al destino del CTA y limpia la atribución cuando el usuario sale del
 * corredor comercial (artículo → destino → perfil/booking).
 */
export function validateArticleAttribution(
  pathname = typeof window !== 'undefined' ? window.location.pathname : '',
  search = typeof window !== 'undefined' ? window.location.search : '',
) {
  try {
    const { slug, target, source, engaged } = readArticleState();
    if (!slug) return;
    if (hasExplicitArticleParam(search)) return;
    const path = normalizePath(pathname) || '/';
    if (target && path === target) {
      sessionStorage.setItem(ARTICLE_ENGAGED_KEY, '1');
      return;
    }
    if (source && path === source) return;
    if (engaged && (isProfilePath(path) || isBookingPath(path))) return;
    clearArticleAttribution();
  } catch { /* atribución best-effort */ }
}

export function persistUTMsFromURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
    for (const key of utmKeys) {
      const val = params.get(key);
      if (val) {
        try { sessionStorage.setItem(key, val); } catch {}
      }
    }
    const article = params.get('article_slug');
    if (article) persistArticleSlug(article);
    // Also capture from current URL on every call for SPA navigation
    if (params.get('utm_source') || params.get('utm_medium') || params.get('utm_campaign')) {
      // already handled above
    }
  } catch {}
}

export async function getBookingAttribution(): Promise<BookingAttribution> {
  // Ensure UTMs from current URL are persisted before reading
  persistUTMsFromURL();

  let ga = { ga_client_id: null as string | null, ga_session_id: null as string | null };
  try {
    ga = await Promise.race([
      getGA4Attribution(),
      new Promise<BookingAttribution>((resolve) => setTimeout(() => resolve({ ga_client_id: null, ga_session_id: null }), 400)),
    ]) as any;
  } catch {}

  let posthogId: string | null = null;
  try {
    posthogId = posthog.get_distinct_id() || null;
  } catch {}

  let article_slug: string | null = null;
  let utm_source: string | null = null;
  let utm_medium: string | null = null;
  let utm_campaign: string | null = null;
  try {
    const params = new URLSearchParams(window.location.search);
    // Precedence: current URL UTM if present, else session-persisted UTM
    const currentUtmSource = params.get('utm_source');
    const currentUtmMedium = params.get('utm_medium');
    const currentUtmCampaign = params.get('utm_campaign');
    if (currentUtmSource) {
      utm_source = currentUtmSource;
      try { sessionStorage.setItem('utm_source', currentUtmSource); } catch {}
    } else {
      try { utm_source = sessionStorage.getItem('utm_source'); } catch {}
    }
    if (currentUtmMedium) {
      utm_medium = currentUtmMedium;
      try { sessionStorage.setItem('utm_medium', currentUtmMedium); } catch {}
    } else {
      try { utm_medium = sessionStorage.getItem('utm_medium'); } catch {}
    }
    if (currentUtmCampaign) {
      utm_campaign = currentUtmCampaign;
      try { sessionStorage.setItem('utm_campaign', currentUtmCampaign); } catch {}
    } else {
      try { utm_campaign = sessionStorage.getItem('utm_campaign'); } catch {}
    }
    // Parámetro explícito siempre gana; el storage solo se usa si la
    // atribución sigue vigente para la ruta actual (evita heredar slugs viejos).
    article_slug = params.get('article_slug') || resolveStoredArticleSlug();
    if (params.get('article_slug')) {
      persistArticleSlug(params.get('article_slug')!);
    }
  } catch {}

  return {
    posthog_distinct_id: posthogId,
    ga_client_id: (ga as any).ga_client_id || null,
    ga_session_id: (ga as any).ga_session_id || null,
    article_slug,
    utm_source,
    utm_medium,
    utm_campaign,
  };
}
