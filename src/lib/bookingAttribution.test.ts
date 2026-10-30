import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getBookingAttribution,
  persistArticleSlug,
  validateArticleAttribution,
  clearArticleAttribution,
} from './bookingAttribution';

describe('bookingAttribution', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', { value: { search: '?utm_source=qa&utm_medium=e2e&utm_campaign=test&article_slug=test-article', hostname: 'legalup.cl', pathname: '/' }, writable: true });
    sessionStorage.clear();
  });

  it('captures UTMs and article_slug', async () => {
    const attr = await getBookingAttribution();
    expect(attr.utm_source).toBe('qa');
    expect(attr.article_slug).toBe('test-article');
  });

  it('landing UTM survives navigation without UTMs', async () => {
    // Simulate landing with UTMs
    Object.defineProperty(window, 'location', { value: { search: '?utm_source=qa&utm_medium=e2e&utm_campaign=final_marketplace_e2e', hostname: 'legalup.cl', pathname: '/' }, writable: true });
    const { persistUTMsFromURL } = await import('./bookingAttribution');
    persistUTMsFromURL();
    // Simulate navigation to booking page without UTMs
    Object.defineProperty(window, 'location', { value: { search: '', hostname: 'legalup.cl', pathname: '/booking/123' }, writable: true });
    const attr = await getBookingAttribution();
    expect(attr.utm_source).toBe('qa');
    expect(attr.utm_medium).toBe('e2e');
    expect(attr.utm_campaign).toBe('final_marketplace_e2e');
  });

  it('no UTM returns null', async () => {
    Object.defineProperty(window, 'location', { value: { search: '', hostname: 'legalup.cl', pathname: '/' }, writable: true });
    sessionStorage.clear();
    const attr = await getBookingAttribution();
    expect(attr.utm_source).toBeNull();
  });

  it('new explicit UTM overwrites stored', async () => {
    sessionStorage.setItem('utm_campaign', 'old_campaign');
    Object.defineProperty(window, 'location', { value: { search: '?utm_campaign=new_campaign', hostname: 'legalup.cl', pathname: '/' }, writable: true });
    const attr = await getBookingAttribution();
    expect(attr.utm_campaign).toBe('new_campaign');
    expect(sessionStorage.getItem('utm_campaign')).toBe('new_campaign');
  });

  it('captures ga_client_id when gtag available', async () => {
    (window as any).gtag = (cmd: string, id: string, type: string, cb: (id: string) => void) => {
      if (type === 'client_id') cb('123.456');
      if (type === 'session_id') cb('999');
    };
    (window as any).GA_MEASUREMENT_ID = 'G-TEST';
    (import.meta as any).env = { VITE_GA4_MEASUREMENT_ID: 'G-TEST' };
    const attr = await getBookingAttribution();
    expect(attr.ga_client_id).toBe('123.456');
    expect(attr.ga_session_id).toBe('999');
  });

  it('booking proceeds when GA fails', async () => {
    (window as any).gtag = () => { throw new Error('fail'); };
    const attr = await getBookingAttribution();
    expect(attr.ga_client_id).toBeNull();
    expect(attr.posthog_distinct_id).not.toBeUndefined();
  });

  it('ga_client_id != posthog_distinct_id', async () => {
    (window as any).gtag = (cmd: string, id: string, type: string, cb: (id: string) => void) => {
      if (type === 'client_id') cb('GA123');
    };
    const attr = await getBookingAttribution();
    expect(attr.ga_client_id).not.toBe(attr.posthog_distinct_id);
  });
});

describe('article attribution lifecycle', () => {
  const setLocation = (pathname: string, search = '') =>
    Object.defineProperty(window, 'location', { value: { search, hostname: 'legalup.cl', pathname }, writable: true });

  beforeEach(() => {
    sessionStorage.clear();
    setLocation('/');
  });

  it('conserva el slug en el recorrido artículo → CTA → landing → perfil → reserva', async () => {
    setLocation('/blog/mi-articulo-2026');
    persistArticleSlug('mi-articulo-2026', '/abogado-arriendo', '/blog/mi-articulo-2026');
    validateArticleAttribution('/abogado-arriendo', '');
    setLocation('/abogado/juan-perez-123');
    validateArticleAttribution('/abogado/juan-perez-123', '');
    setLocation('/booking/juan-perez-123');
    validateArticleAttribution('/booking/juan-perez-123', '');
    const attr = await getBookingAttribution();
    expect(attr.article_slug).toBe('mi-articulo-2026');
  });

  it('no hereda el slug si el usuario abandona y visita una landing independiente', async () => {
    setLocation('/blog/mi-articulo-2026');
    persistArticleSlug('mi-articulo-2026', '/abogado-arriendo', '/blog/mi-articulo-2026');
    validateArticleAttribution('/abogado-arriendo', '');
    validateArticleAttribution('/search', '');
    setLocation('/abogado-arriendo');
    validateArticleAttribution('/abogado-arriendo', '');
    setLocation('/booking/juan-perez-123');
    validateArticleAttribution('/booking/juan-perez-123', '');
    const attr = await getBookingAttribution();
    expect(attr.article_slug).toBeNull();
  });

  it('no hereda el slug en un perfil visitado sin pasar por el destino del CTA', async () => {
    setLocation('/blog/mi-articulo-2026');
    persistArticleSlug('mi-articulo-2026', '/abogado-arriendo', '/blog/mi-articulo-2026');
    setLocation('/abogado/juan-perez-123');
    validateArticleAttribution('/abogado/juan-perez-123', '');
    setLocation('/booking/juan-perez-123');
    validateArticleAttribution('/booking/juan-perez-123', '');
    const attr = await getBookingAttribution();
    expect(attr.article_slug).toBeNull();
  });

  it('no inyecta el slug en una reserva directa si el CTA nunca llegó a su destino', async () => {
    setLocation('/blog/mi-articulo-2026');
    persistArticleSlug('mi-articulo-2026', '/abogado-arriendo', '/blog/mi-articulo-2026');
    setLocation('/booking/juan-perez-123');
    validateArticleAttribution('/booking/juan-perez-123', '');
    const attr = await getBookingAttribution();
    expect(attr.article_slug).toBeNull();
  });

  it('mantiene la atribución si la reserva falla', async () => {
    setLocation('/blog/mi-articulo-2026');
    persistArticleSlug('mi-articulo-2026', '/abogado-arriendo', '/blog/mi-articulo-2026');
    validateArticleAttribution('/abogado-arriendo', '');
    setLocation('/booking/juan-perez-123');
    validateArticleAttribution('/booking/juan-perez-123', '');
    // El envío falla: no hay limpieza, la atribución sigue disponible para reintentar.
    validateArticleAttribution('/booking/juan-perez-123', '');
    const attr = await getBookingAttribution();
    expect(attr.article_slug).toBe('mi-articulo-2026');
  });

  it('limpia la atribución tras una reserva confirmada', async () => {
    setLocation('/blog/mi-articulo-2026');
    persistArticleSlug('mi-articulo-2026', '/abogado-arriendo', '/blog/mi-articulo-2026');
    validateArticleAttribution('/abogado-arriendo', '');
    setLocation('/booking/juan-perez-123');
    validateArticleAttribution('/booking/juan-perez-123', '');
    clearArticleAttribution();
    const attr = await getBookingAttribution();
    expect(attr.article_slug).toBeNull();
  });

  it('navegación directa sin artículo no atribuye nada', async () => {
    setLocation('/booking/juan-perez-123');
    validateArticleAttribution('/booking/juan-perez-123', '');
    const attr = await getBookingAttribution();
    expect(attr.article_slug).toBeNull();
  });

  it('mantiene la atribución tras recargar dentro del corredor comercial', async () => {
    setLocation('/blog/mi-articulo-2026');
    persistArticleSlug('mi-articulo-2026', '/abogado-arriendo', '/blog/mi-articulo-2026');
    validateArticleAttribution('/abogado-arriendo', '');
    setLocation('/abogado/juan-perez-123');
    validateArticleAttribution('/abogado/juan-perez-123', '');
    // Recarga: mismo estado de sessionStorage, la ruta sigue siendo el perfil.
    validateArticleAttribution('/abogado/juan-perez-123', '');
    const attr = await getBookingAttribution();
    expect(attr.article_slug).toBe('mi-articulo-2026');
  });

  it('el parámetro explícito article_slug sigue mandando', async () => {
    setLocation('/booking/juan-perez-123', '?article_slug=explicito-2026');
    validateArticleAttribution('/booking/juan-perez-123', '?article_slug=explicito-2026');
    const attr = await getBookingAttribution();
    expect(attr.article_slug).toBe('explicito-2026');
  });

  it('no rompe si sessionStorage falla al persistir', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => persistArticleSlug('mi-articulo-2026', '/abogado-arriendo', '/blog/mi-articulo-2026')).not.toThrow();
    spy.mockRestore();
    const attr = await getBookingAttribution();
    expect(attr.article_slug).toBeNull();
  });
});
