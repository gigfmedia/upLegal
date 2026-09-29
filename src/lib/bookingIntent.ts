/**
 * Booking Intent — recuperación de intención de reserva (estado local).
 *
 * Guarda temporalmente abogado + fecha + hora seleccionados para que el
 * usuario (anónimo o autenticado) pueda retomar el booking tras navegar.
 *
 * - Solo estado local del navegador (localStorage `legalup_booking_intent`).
 * - NO bloquea slots, NO crea bookings/payments/preferences/emails.
 * - NO depende del consentimiento analytics para funcionar.
 * - NO guarda datos sensibles: sin RUT, teléfono, email, payment ids,
 *   notas ni descripción del caso.
 * - TTL 24h, versionado "1" (versión distinta se elimina sin migrar).
 *
 * Browser-safe: guards de window/localStorage, tolerante a JSON inválido,
 * nunca lanza.
 */
import { getStoredConsent } from './cookieConsent';
import { trackEvent } from './track';
import { supabase } from './supabaseClient';

export const BOOKING_INTENT_STORAGE_KEY = 'legalup_booking_intent' as const;
export const BOOKING_INTENT_VERSION = '1' as const;
export const BOOKING_INTENT_TTL_HOURS = 24 as const;

export type BookingIntent = {
  version: typeof BOOKING_INTENT_VERSION;
  lawyerId: string;
  lawyerName: string;
  lawyerSlug?: string | null;
  lawyerPhoto?: string | null;
  specialty?: string | null;
  /** YYYY-MM-DD */
  appointmentDate: string;
  /** HH:mm */
  appointmentTime: string;
  /** ISO si ya se conoce */
  appointmentStart?: string | null;
  durationMinutes?: number | null;
  appointmentType?: string | null;
  serviceId?: string | null;
  bookingUrl: string;
  createdAt: string;
  expiresAt: string;
};

export type BookingIntentInput = Omit<BookingIntent, 'version' | 'createdAt' | 'expiresAt'>;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function safeStorage(): Storage | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidShape(value: unknown): value is BookingIntent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === BOOKING_INTENT_VERSION &&
    typeof v.lawyerId === 'string' &&
    v.lawyerId.length > 0 &&
    typeof v.lawyerName === 'string' &&
    v.lawyerName.length > 0 &&
    typeof v.appointmentDate === 'string' &&
    typeof v.appointmentTime === 'string' &&
    typeof v.bookingUrl === 'string' &&
    v.bookingUrl.length > 0 &&
    typeof v.createdAt === 'string' &&
    typeof v.expiresAt === 'string'
  );
}

/** Parsea sin chequear expiración (para detectar expirados y emitir evento). */
export function parseStoredIntent(raw: string | null): BookingIntent | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidShape(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isBookingIntentExpired(
  intent: Pick<BookingIntent, 'expiresAt'>,
  now: number = Date.now(),
): boolean {
  const expires = Date.parse(intent.expiresAt);
  if (Number.isNaN(expires)) return true;
  return expires <= now;
}

export function saveBookingIntent(input: BookingIntentInput): BookingIntent | null {
  const now = new Date();
  const intent: BookingIntent = {
    ...input,
    version: BOOKING_INTENT_VERSION,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + BOOKING_INTENT_TTL_HOURS * 3600 * 1000).toISOString(),
  };
  const storage = safeStorage();
  if (storage) {
    try {
      storage.setItem(BOOKING_INTENT_STORAGE_KEY, JSON.stringify(intent));
    } catch {
      return null;
    }
  }
  notifyBookingIntentListeners(intent);
  return intent;
}

/**
 * Intent válido o null. Limpia automáticamente expirados, versiones
 * inválidas y JSON corrupto (sin emitir analytics aquí).
 */
export function getBookingIntent(): BookingIntent | null {
  const storage = safeStorage();
  if (!storage) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(BOOKING_INTENT_STORAGE_KEY);
  } catch {
    return null;
  }
  const intent = parseStoredIntent(raw);
  if (!intent) {
    if (raw !== null) {
      try {
        storage.removeItem(BOOKING_INTENT_STORAGE_KEY);
      } catch {
        // noop
      }
    }
    return null;
  }
  if (isBookingIntentExpired(intent)) {
    clearBookingIntent();
    return null;
  }
  return intent;
}

export function clearBookingIntent(): void {
  const storage = safeStorage();
  if (storage) {
    try {
      storage.removeItem(BOOKING_INTENT_STORAGE_KEY);
    } catch {
      // noop
    }
  }
  notifyBookingIntentListeners(null);
}

export function hoursSinceCreated(intent: Pick<BookingIntent, 'createdAt'>): number {
  const created = Date.parse(intent.createdAt);
  if (Number.isNaN(created)) return 0;
  return Math.max(0, (Date.now() - created) / 3600000);
}

// --- listeners (custom event same-tab + storage cross-tab) ---
type BookingIntentListener = (intent: BookingIntent | null) => void;
const listeners = new Set<BookingIntentListener>();

export function subscribeBookingIntent(listener: BookingIntentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyBookingIntentListeners(intent: BookingIntent | null): void {
  listeners.forEach((listener) => {
    try {
      listener(intent);
    } catch {
      // un listener nunca debe romper el guardado
    }
  });
}

if (isBrowser()) {
  try {
    window.addEventListener('storage', (event) => {
      if (event.key !== BOOKING_INTENT_STORAGE_KEY) return;
      notifyBookingIntentListeners(getBookingIntent());
    });
  } catch {
    // noop
  }
}

// --- visibilidad del banner por ruta (rutas reales de src/App.tsx) ---
const BOOKING_RESUME_HIDDEN_PREFIXES = [
  '/booking',
  '/checkout',
  '/payment',
  '/dashboard',
  '/lawyer',
  '/admin',
  '/empresa',
  '/auth',
  '/verify-email',
  '/reset-password',
];

/**
 * `false` en checkout/pagos/dashboards/auth y cuando ya se está retomando
 * esa misma intención (misma ruta completa).
 */
export function shouldShowBookingResumeBanner(
  pathname: string,
  bookingUrl?: string | null,
): boolean {
  if (BOOKING_RESUME_HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }
  if (bookingUrl) {
    try {
      const target = new URL(bookingUrl, 'http://local');
      if (target.pathname === pathname && target.search === windowLocationSearch()) {
        return false;
      }
    } catch {
      // URL inválida: no ocultar por esta regla
    }
  }
  return true;
}

function windowLocationSearch(): string {
  try {
    return typeof window !== 'undefined' ? window.location.search : '';
  } catch {
    return '';
  }
}

// --- analytics (solo con consentimiento; el flujo no depende de esto) ---
export type BookingIntentAnalyticsEvent =
  | 'booking_intent_saved'
  | 'booking_resume_banner_shown'
  | 'booking_resume_clicked'
  | 'booking_resume_dismissed'
  | 'booking_intent_expired'
  | 'booking_resume_slot_unavailable';

export function trackBookingIntentEvent(
  event: BookingIntentAnalyticsEvent,
  intent: Pick<
    BookingIntent,
    'lawyerId' | 'specialty' | 'durationMinutes' | 'appointmentType' | 'createdAt'
  >,
  extra: Record<string, unknown> = {},
): void {
  if (!isBrowser()) return;
  let consented = false;
  try {
    consented = getStoredConsent()?.analytics === true;
  } catch {
    consented = false;
  }
  if (!consented) return;
  try {
    trackEvent(
      event,
      {
        lawyer_id: intent.lawyerId,
        specialty: intent.specialty ?? undefined,
        duration_minutes: intent.durationMinutes ?? undefined,
        appointment_type: intent.appointmentType ?? undefined,
        source_path: window.location.pathname,
        hours_since_created: Math.round(hoursSinceCreated(intent) * 10) / 10,
        ...extra,
      },
      { allowInternal: true },
    );
  } catch {
    // analytics nunca debe romper el flujo
  }
}

// --- validación de disponibilidad (reutiliza RPC real, sin lógica paralela) ---
export type BookingIntentAvailability =
  | { status: 'available' }
  | { status: 'unavailable'; reason: 'slot_taken' | 'past' }
  | { status: 'unknown'; reason: 'validation_error' };

/**
 * Valida el slot contra `get_lawyer_busy_slots` (misma fuente que
 * BookingPage). `unknown` → navegar igual al booking (la página muestra
 * disponibilidad en vivo); nunca inventa disponibilidad.
 */
export async function validateBookingIntentAvailability(
  intent: Pick<BookingIntent, 'lawyerId' | 'appointmentDate' | 'appointmentTime'>,
): Promise<BookingIntentAvailability> {
  try {
    const start = new Date(`${intent.appointmentDate}T${intent.appointmentTime}:00`);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
      return { status: 'unavailable', reason: 'past' };
    }
    const { data, error } = await supabase.rpc('get_lawyer_busy_slots', {
      query_lawyer_id: intent.lawyerId,
      query_date: intent.appointmentDate,
    });
    if (error) return { status: 'unknown', reason: 'validation_error' };
    const busyTimes = new Set(
      ((data as Array<{ scheduled_time: string }> | null) ?? []).map((slot) =>
        String(slot.scheduled_time).slice(0, 5),
      ),
    );
    if (busyTimes.has(intent.appointmentTime)) {
      return { status: 'unavailable', reason: 'slot_taken' };
    }
    return { status: 'available' };
  } catch {
    return { status: 'unknown', reason: 'validation_error' };
  }
}
