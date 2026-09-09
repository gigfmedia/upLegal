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
    if (article) try { sessionStorage.setItem('legalup_article_slug', article); } catch {}
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
    article_slug = params.get('article_slug') || (() => { try { return sessionStorage.getItem('legalup_article_slug'); } catch { return null; } })();
    if (params.get('article_slug')) {
      try { sessionStorage.setItem('legalup_article_slug', params.get('article_slug')!); } catch {}
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
