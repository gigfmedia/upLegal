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

function emitGA4(event: string, params: Record<string, unknown>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, params);
  }
}

function emitPostHog(event: string, props: Record<string, unknown>) {
  try {
    posthog.capture(event, props);
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
