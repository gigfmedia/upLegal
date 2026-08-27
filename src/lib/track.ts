/**
 * LegalUp Tracking Contract — Single source of truth
 * Funnel oficial (FASE 1):
 * page_view → commercial_cta_viewed → commercial_cta_clicked → problem_started
 * → lawyer_match_shown → lawyer_profile_viewed → booking_started
 * → checkout_started → payment_initiated → booking_paid
 *
 * Evento canónico de revenue: booking_paid (source of truth = webhook backend)
 * NO usar `purchase` como evento principal de negocio (GA4 `purchase` se mantiene por compatibilidad)
 */
import { posthog } from './posthogLoader';

// Paths que NO deben contaminar análisis de adquisición CRO
const INTERNAL_PATH_PREFIXES = ['/lawyer', '/admin', '/dashboard', '/api'];
const INTERNAL_EMAILS = new Set([
  'gigfmedia@icloud.com',
  'juan.fercommerce@gmail.com',
]);

function isInternalPath(pathname = ''): boolean {
  return INTERNAL_PATH_PREFIXES.some(p => pathname.startsWith(p));
}

function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return INTERNAL_EMAILS.has(String(email).trim().toLowerCase());
}

function getDeviceCategory(): 'mobile' | 'desktop' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/Mobi|Android/i.test(ua)) return 'mobile';
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}

function getCommonProps(extra: Record<string, unknown> = {}) {
  const path = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
  return {
    page_path: path,
    device_category: getDeviceCategory(),
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

// Guard para no enviar analytics con PII
const PII_KEYS = new Set(['rut', 'phone', 'email', 'address', 'user_email', 'user_phone', 'description']);
function stripPII(props: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (PII_KEYS.has(k)) continue;
    // nunca enviar descripción completa del problema legal
    if (k === 'problem_description' || k === 'description') continue;
    out[k] = v;
  }
  return out;
}

/**
 * Deduplicación simple en memoria para booking_paid frontside
 * Backend ya tiene idempotencia por payment_id (payment_events_success_payment_once)
 * Frontend evita doble disparo por re-render
 */
const seenBookingPaid = new Set<string>();

export type TrackProps = Record<string, unknown> & {
  booking_id?: string;
  payment_id?: string;
  lawyer_id?: string;
  service_id?: string;
  article_slug?: string;
  legal_category?: string;
  cta_variant?: string;
  source?: string;
  value?: number;
  currency?: string;
};

// Opciones de tracking
type TrackOpts = {
  // si true, NO filtra tráfico interno — útil para observabilidad de producto interno
  allowInternal?: boolean;
  // dedup key para booking_paid
  dedupKey?: string;
};

export function shouldTrackForCRO(opts: TrackOpts = {}): boolean {
  if (opts.allowInternal) return true;
  if (typeof window === 'undefined') return true;
  // Filtrar path interno
  if (isInternalPath(window.location.pathname)) return false;
  // Filtrar owner por email en localStorage/session (si está disponible via posthog props)
  // No bloquea producto interno totalmente — solo adquisición CRO
  return true;
}

/**
 * trackEvent — helper único para PostHog + GA4
 * Envía a PostHog siempre (si no es interno para CRO, con flag)
 * y a GA4 via gtag si está disponible
 */
export function trackEvent(eventName: string, props: TrackProps = {}, opts: TrackOpts = {}) {
  if (!shouldTrackForCRO(opts)) {
    // Aún logueamos para debug pero no enviamos a GA4 CRO
    // PostHog se envía igual con prop is_internal para filtrar en análisis
    const isInternal = isInternalPath(typeof window !== 'undefined' ? window.location.pathname : '');
    if (isInternal) {
      props = { ...props, is_internal: true };
    } else {
      return;
    }
  }

  const common = getCommonProps();
  const cleanProps = stripPII(props);
  const finalProps = { ...common, ...cleanProps };

  // Idempotencia booking_paid
  if (eventName === 'booking_paid') {
    const key = opts.dedupKey || (finalProps.booking_id as string) || (finalProps.payment_id as string) || '';
    if (key && seenBookingPaid.has(key)) return;
    if (key) seenBookingPaid.add(key);
  }

  // PostHog
  try {
    posthog.capture(eventName, finalProps);
  } catch {}

  // GA4
  try {
    // @ts-ignore
    window.gtag?.('event', eventName, finalProps);
  } catch {}
}

// Helpers semánticos del funnel canónico
export const track = {
  commercialCTAViewed: (p: TrackProps, o?: TrackOpts) => trackEvent('commercial_cta_viewed', p, o),
  commercialCTAClicked: (p: TrackProps, o?: TrackOpts) => trackEvent('commercial_cta_clicked', p, o),
  blogContextualCTAViewed: (p: TrackProps, o?: TrackOpts) => trackEvent('blog_contextual_cta_viewed', { ...p, cta_variant: p.cta_variant || 'contextual' }, o),
  blogContextualCTAClicked: (p: TrackProps, o?: TrackOpts) => trackEvent('blog_contextual_cta_clicked', { ...p, cta_variant: p.cta_variant || 'contextual' }, o),
  problemStarted: (p: TrackProps, o?: TrackOpts) => trackEvent('problem_started', p, o),
  lawyerMatchShown: (p: TrackProps, o?: TrackOpts) => trackEvent('lawyer_match_shown', p, o),
  lawyerProfileViewed: (p: TrackProps, o?: TrackOpts) => trackEvent('lawyer_profile_viewed', p, o),
  bookingStarted: (p: TrackProps, o?: TrackOpts) => trackEvent('booking_started', p, o),
  checkoutStarted: (p: TrackProps, o?: TrackOpts) => trackEvent('checkout_started', p, o),
  paymentInitiated: (p: TrackProps, o?: TrackOpts) => trackEvent('payment_initiated', p, o),
  bookingPaid: (p: TrackProps, o?: TrackOpts) => trackEvent('booking_paid', p, o),
};

// Util para clasificar categoría legal por slug/palabras clave (FASE 14)
export function detectLegalCategory(slugOrText = ''): string {
  const s = slugOrText.toLowerCase();
  if (/(dicom|arriendo|deuda.*arriendo|garantia.*arriendo|reajuste.*ipc|tacita|desalojo|orden.*desalojo|lanzamiento|contrato.*arriendo)/.test(s)) return 'arriendo';
  if (/(despido|juicio.*laboral|finiquito|ley.*karin|acoso.*laboral|tutela.*laboral|aviso.*despido)/.test(s)) return 'laboral';
  if (/(pension.*alimentos|custodia|cuidado.*personal|divorcio|mediacion.*familiar|violencia.*intrafamiliar|alimentos)/.test(s)) return 'familia';
  if (/(penal|delito|hurto|robo|estafa|lesiones|amenaza|violacion.*morada|receptacion)/.test(s)) return 'penal';
  return 'general';
}
