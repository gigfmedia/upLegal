import { posthog } from './posthogLoader';

type FunnelProps = {
  lawyer_id?: string;
  service_id?: string;
  article_slug?: string | null;
  source?: string;
  booking_id?: string;
  value?: number;
  currency?: string;
};

function isLocalhost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.includes('localhost');
}

function isTestTraffic(props: Record<string, unknown>) {
  const email = (props as any).user_email || (props as any).email || '';
  if (typeof email === 'string' && email.includes('@test.invalid')) return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('is_test') === 'true') return true;
    if (sessionStorage.getItem('is_test') === 'true') return true;
  } catch {}
  return false;
}

function getAttributionContext() {
  try {
    const params = new URLSearchParams(window.location.search);
    const storedArticle = sessionStorage.getItem('legalup_article_slug');
    const storedCta = sessionStorage.getItem('legalup_cta_location');
    const utmSource = params.get('utm_source') || sessionStorage.getItem('utm_source');
    const utmMedium = params.get('utm_medium') || sessionStorage.getItem('utm_medium');
    const utmCampaign = params.get('utm_campaign') || sessionStorage.getItem('utm_campaign');
    if (params.get('utm_source')) sessionStorage.setItem('utm_source', params.get('utm_source')!);
    if (params.get('utm_medium')) sessionStorage.setItem('utm_medium', params.get('utm_medium')!);
    if (params.get('utm_campaign')) sessionStorage.setItem('utm_campaign', params.get('utm_campaign')!);
    return {
      article_slug: params.get('article_slug') || storedArticle || null,
      cta_location: params.get('cta_location') || storedCta || null,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
    };
  } catch {
    return { article_slug: null, cta_location: null, utm_source: null, utm_medium: null, utm_campaign: null };
  }
}

function emitGA4(event: string, params: Record<string, unknown>) {
  if (isLocalhost()) return;
  const isTest = isTestTraffic(params);
  const finalParams: any = { ...params };
  if (isTest) finalParams.is_test = true;
  // never send sensitive free text
  delete finalParams.user_email;
  delete finalParams.email;
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, finalParams);
  }
}

function emitPostHog(event: string, props: Record<string, unknown>) {
  if (isLocalhost()) return;
  try {
    const isTest = isTestTraffic(props);
    const finalProps: any = { ...props };
    if (isTest) finalProps.is_test = true;
    delete finalProps.user_email;
    delete finalProps.email;
    // add attribution context if missing
    const ctx = getAttributionContext();
    if (!finalProps.article_slug && ctx.article_slug) finalProps.article_slug = ctx.article_slug;
    if (!finalProps.cta_location && ctx.cta_location) finalProps.cta_location = ctx.cta_location;
    if (!finalProps.utm_source && ctx.utm_source) finalProps.utm_source = ctx.utm_source;
    if (!finalProps.utm_campaign && ctx.utm_campaign) finalProps.utm_campaign = ctx.utm_campaign;
    posthog.capture(event, finalProps);
  } catch {}
}

// F4: booking UI actually viewed
export function trackBookingPageViewed(props: FunnelProps) {
  emitGA4('booking_page_viewed', props);
  emitPostHog('booking_page_viewed', props);
}

// F5: user meaningfully begins configuring booking — once per page interaction
let bookingStartedFired = false;
export function trackBookingStarted(props: FunnelProps) {
  if (bookingStartedFired) return;
  bookingStartedFired = true;
  emitGA4('booking_started', props);
  emitPostHog('booking_started', props);
}
export function resetBookingStartedForTests() {
  bookingStartedFired = false;
}

// F6: server successfully created booking + MP checkout
export function trackBeginCheckout(props: FunnelProps & { booking_id: string; value: number; currency: string }) {
  const { booking_id, lawyer_id, value, currency, service_id, article_slug, source } = props;
  const gaParams: any = {
    booking_id,
    lawyer_id,
    value,
    currency,
    items: [{ item_id: booking_id, item_name: `booking ${booking_id}`, price: value, quantity: 1 }],
  };
  if (service_id) gaParams.service_id = service_id;
  if (article_slug) gaParams.article_slug = article_slug;
  if (source) gaParams.source = source;
  emitGA4('begin_checkout', gaParams);
  const phProps: any = { booking_id, lawyer_id, value, currency };
  if (service_id) phProps.service_id = service_id;
  if (article_slug) phProps.article_slug = article_slug;
  if (source) phProps.source = source;
  emitPostHog('begin_checkout', phProps);
}

// Legacy: continue_to_checkout is deprecated, kept for diagnostic but not canonical
export function trackContinueToCheckoutLegacy(props: FunnelProps) {
  // intentionally not emitting to canonical funnel; keep as diagnostic if needed
  // emitGA4('continue_to_checkout', props);
}
