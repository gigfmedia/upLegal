import { posthog } from '@/lib/posthogLoader';
import { supabase } from '@/lib/supabaseClient';
import { getStoredConsent } from '@/lib/cookieConsent';

const FIRST_KEYS = {
  client: 'lawyer_first_client_created',
  case: 'lawyer_first_case_created',
  booking: 'lawyer_first_booking_created',
  secondBooking: 'lawyer_second_booking_created',
  onboardingViewed: 'lawyer_onboarding_viewed',
};

function hasFired(key: string, lawyerId: string): boolean {
  try {
    return localStorage.getItem(`${key}:${lawyerId}`) === '1';
  } catch {
    return false;
  }
}

function markFired(key: string, lawyerId: string) {
  try {
    localStorage.setItem(`${key}:${lawyerId}`, '1');
  } catch {}
}

/**
 * FASE 1C: las marcas de "primera vez" solo se escriben cuando el evento
 * puede viajar (consentimiento vigente). Sin consentimiento NO se marca:
 * el evento se reintentará cuando haya consentimiento y el conteo siga en 1.
 * (Antes, un primer caso sin consent marcaba y el evento se perdía para
 * siempre.) Si el conteo ya superó 1, se marca igual: ya no es "primero".
 */
function hasAnalyticsConsent(): boolean {
  try {
    return getStoredConsent()?.analytics === true;
  } catch {
    return false;
  }
}

export function trackOnboardingViewed(lawyerId: string) {
  if (!lawyerId || hasFired(FIRST_KEYS.onboardingViewed, lawyerId)) return;
  if (!hasAnalyticsConsent()) return; // no marcar sin consentimiento
  markFired(FIRST_KEYS.onboardingViewed, lawyerId);
  posthog.capture('lawyer_onboarding_viewed', { lawyer_id: lawyerId });
}

export async function trackFirstClientIfNeeded(lawyerId: string, source: string) {
  if (!lawyerId || hasFired(FIRST_KEYS.client, lawyerId)) return;
  // verify via count
  const { count } = await supabase.from('lawyer_clients').select('id', { count: 'exact', head: true }).eq('lawyer_id', lawyerId);
  if ((count ?? 0) === 1) {
    if (!hasAnalyticsConsent()) return; // reintentar con consentimiento
    markFired(FIRST_KEYS.client, lawyerId);
    posthog.capture('first_client_created', { source: source?.toLowerCase() || 'unknown' });
    posthog.capture('lawyer_first_client_created', { source: source?.toLowerCase() || 'unknown' });
  } else if ((count ?? 0) > 1) {
    markFired(FIRST_KEYS.client, lawyerId);
  }
}

export async function trackFirstCaseIfNeeded(lawyerId: string, source: string) {
  if (!lawyerId || hasFired(FIRST_KEYS.case, lawyerId)) return;
  const { count } = await supabase.from('lawyer_cases').select('id', { count: 'exact', head: true }).eq('lawyer_id', lawyerId);
  if ((count ?? 0) === 1) {
    if (!hasAnalyticsConsent()) return; // reintentar con consentimiento
    markFired(FIRST_KEYS.case, lawyerId);
    posthog.capture('first_case_created', { source: source?.toLowerCase() || 'unknown' });
    posthog.capture('lawyer_first_case_created', { source: source?.toLowerCase() || 'unknown' });
  } else if ((count ?? 0) > 1) {
    markFired(FIRST_KEYS.case, lawyerId);
  }
}

export async function trackBookingCreated(lawyerId: string, source: string, hasCase: boolean) {
  if (!lawyerId) return;
  // check if first or second
  const { count } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('lawyer_id', lawyerId).eq('source', 'LAWYER_DIRECT');
  const c = count ?? 0;
  if (c === 1 && !hasFired(FIRST_KEYS.booking, lawyerId)) {
    markFired(FIRST_KEYS.booking, lawyerId);
    posthog.capture('first_booking_created', { source: source?.toLowerCase() || 'unknown', has_case: hasCase });
    posthog.capture('lawyer_first_booking_created', { source: source?.toLowerCase() || 'unknown', has_case: hasCase });
  } else if (c === 2 && !hasFired(FIRST_KEYS.secondBooking, lawyerId)) {
    markFired(FIRST_KEYS.secondBooking, lawyerId);
    posthog.capture('second_booking_created', { source: source?.toLowerCase() || 'unknown', has_case: hasCase });
    posthog.capture('lawyer_second_booking_created', { source: source?.toLowerCase() || 'unknown', has_case: hasCase });
  } else if (c > 2) {
    if (!hasFired(FIRST_KEYS.booking, lawyerId)) markFired(FIRST_KEYS.booking, lawyerId);
    if (!hasFired(FIRST_KEYS.secondBooking, lawyerId)) markFired(FIRST_KEYS.secondBooking, lawyerId);
  }
  // always capture generic
  posthog.capture('booking_created', { source: source?.toLowerCase() || 'unknown', has_case: hasCase });
}

export function trackRequestProcessed(source: string) {
  posthog.capture('request_processed', { source: source?.toLowerCase() || 'unknown' });
}
