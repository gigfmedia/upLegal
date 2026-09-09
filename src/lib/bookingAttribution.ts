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

export async function getBookingAttribution(): Promise<BookingAttribution> {
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
    article_slug = params.get('article_slug') || (() => { try { return sessionStorage.getItem('legalup_article_slug'); } catch { return null; } })();
    utm_source = params.get('utm_source') || (() => { try { return sessionStorage.getItem('utm_source'); } catch { return null; } })();
    utm_medium = params.get('utm_medium') || (() => { try { return sessionStorage.getItem('utm_medium'); } catch { return null; } })();
    utm_campaign = params.get('utm_campaign') || (() => { try { return sessionStorage.getItem('utm_campaign'); } catch { return null; } })();
    // persist for refresh
    try {
      if (params.get('utm_source')) sessionStorage.setItem('utm_source', params.get('utm_source')!);
      if (params.get('utm_medium')) sessionStorage.setItem('utm_medium', params.get('utm_medium')!);
      if (params.get('utm_campaign')) sessionStorage.setItem('utm_campaign', params.get('utm_campaign')!);
      if (params.get('article_slug')) sessionStorage.setItem('legalup_article_slug', params.get('article_slug')!);
    } catch {}
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
