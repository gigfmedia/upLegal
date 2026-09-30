import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BOOKING_INTENT_STORAGE_KEY,
  BOOKING_INTENT_TTL_HOURS,
  BOOKING_INTENT_VERSION,
  clearBookingIntent,
  getBookingIntent,
  isBookingIntentExpired,
  isBookingIntentPast,
  parseStoredIntent,
  saveBookingIntent,
  shouldShowBookingResumeBanner,
  subscribeBookingIntent,
  type BookingIntentInput,
} from './bookingIntent';

const baseInput: BookingIntentInput = {
  lawyerId: 'lawyer-1',
  lawyerName: 'María González',
  lawyerSlug: null,
  lawyerPhoto: 'https://example.com/photo.jpg',
  specialty: 'Derecho de Familia',
  appointmentDate: '2099-10-16',
  appointmentTime: '09:00',
  appointmentStart: null,
  durationMinutes: 60,
  appointmentType: 'appointment',
  serviceId: null,
  bookingUrl: '/booking/maria-gonzalez-lawyer-1?date=2099-10-16&time=09:00&duration=60',
};

function rawStored(): string | null {
  return window.localStorage.getItem(BOOKING_INTENT_STORAGE_KEY);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('bookingIntent — A. save/get', () => {
  it('guarda y recupera la intención con versión y TTL 24h', () => {
    const stored = saveBookingIntent(baseInput);
    expect(stored).not.toBeNull();
    expect(stored?.version).toBe(BOOKING_INTENT_VERSION);
    const ttlMs =
      Date.parse(stored!.expiresAt) - Date.parse(stored!.createdAt);
    expect(ttlMs).toBe(BOOKING_INTENT_TTL_HOURS * 3600 * 1000);
    expect(getBookingIntent()).toEqual(stored);
  });
});

describe('bookingIntent — B. expiración', () => {
  it('isBookingIntentExpired detecta expirados y get los elimina', () => {
    const expired = {
      ...baseInput,
      version: BOOKING_INTENT_VERSION,
      createdAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    };
    expect(isBookingIntentExpired(expired)).toBe(true);
    window.localStorage.setItem(BOOKING_INTENT_STORAGE_KEY, JSON.stringify(expired));
    expect(getBookingIntent()).toBeNull();
    expect(rawStored()).toBeNull();
  });

  it('no expirado sigue visible', () => {
    saveBookingIntent(baseInput);
    expect(getBookingIntent()).not.toBeNull();
  });
});

describe('bookingIntent — C. JSON inválido', () => {
  it('retorna null y limpia sin lanzar', () => {
    window.localStorage.setItem(BOOKING_INTENT_STORAGE_KEY, 'no-json{{{');
    expect(getBookingIntent()).toBeNull();
    expect(rawStored()).toBeNull();
    expect(parseStoredIntent('no-json{{{')).toBeNull();
    expect(parseStoredIntent(null)).toBeNull();
  });
});

describe('bookingIntent — D. versión inválida', () => {
  it('versión distinta se elimina sin migrar', () => {
    window.localStorage.setItem(
      BOOKING_INTENT_STORAGE_KEY,
      JSON.stringify({ ...baseInput, version: '0' }),
    );
    expect(getBookingIntent()).toBeNull();
    expect(rawStored()).toBeNull();
  });

  it('shape incompleto se elimina', () => {
    window.localStorage.setItem(
      BOOKING_INTENT_STORAGE_KEY,
      JSON.stringify({ version: BOOKING_INTENT_VERSION }),
    );
    expect(getBookingIntent()).toBeNull();
  });
});

describe('bookingIntent — E. clear', () => {
  it('elimina y notifica a suscriptores', () => {
    saveBookingIntent(baseInput);
    const listener = vi.fn();
    const unsubscribe = subscribeBookingIntent(listener);
    clearBookingIntent();
    expect(rawStored()).toBeNull();
    expect(getBookingIntent()).toBeNull();
    expect(listener).toHaveBeenCalledWith(null);
    unsubscribe();
  });
});

describe('bookingIntent — F. reemplazo', () => {
  it('nueva intención reemplaza la anterior', () => {
    saveBookingIntent(baseInput);
    const second = saveBookingIntent({
      ...baseInput,
      lawyerId: 'lawyer-2',
      lawyerName: 'Juan Pérez',
      appointmentTime: '10:00',
    });
    expect(getBookingIntent()?.lawyerId).toBe('lawyer-2');
    expect(getBookingIntent()).toEqual(second);
  });
});

describe('bookingIntent — slot pasado invalida aunque el TTL siga vigente', () => {
  it('intent de hace 1h con appointmentStart pasado → null y storage limpio', () => {
    const now = Date.now();
    window.localStorage.setItem(
      BOOKING_INTENT_STORAGE_KEY,
      JSON.stringify({
        ...baseInput,
        version: BOOKING_INTENT_VERSION,
        createdAt: new Date(now - 3600 * 1000).toISOString(),
        expiresAt: new Date(now + 23 * 3600 * 1000).toISOString(),
        appointmentStart: new Date(now - 30 * 60 * 1000).toISOString(),
      }),
    );
    expect(isBookingIntentPast({
      appointmentStart: new Date(now - 30 * 60 * 1000).toISOString(),
      appointmentDate: baseInput.appointmentDate,
      appointmentTime: baseInput.appointmentTime,
    })).toBe(true);
    expect(getBookingIntent()).toBeNull();
    expect(rawStored()).toBeNull();
  });

  it('slot futuro con TTL vigente sigue válido', () => {
    const stored = saveBookingIntent({
      ...baseInput,
      appointmentStart: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
    expect(isBookingIntentPast(stored!)).toBe(false);
    expect(getBookingIntent()).toEqual(stored);
  });

  it('fecha/hora inválida se trata como pasada', () => {
    expect(
      isBookingIntentPast({ appointmentStart: null, appointmentDate: 'no-fecha', appointmentTime: 'xx' }),
    ).toBe(true);
  });
});

describe('bookingIntent — O. sin datos sensibles', () => {
  it('el JSON persistido no contiene PII ni ids de pago', () => {
    saveBookingIntent(baseInput);
    const raw = rawStored() ?? '';
    expect(raw).not.toMatch(/rut|phone|email|mercadopago|payment_id|preference/i);
    const parsed = JSON.parse(raw);
    expect(Object.keys(parsed).sort()).toEqual(
      [
        'appointmentDate',
        'appointmentStart',
        'appointmentTime',
        'appointmentType',
        'bookingUrl',
        'createdAt',
        'durationMinutes',
        'expiresAt',
        'lawyerId',
        'lawyerName',
        'lawyerPhoto',
        'lawyerSlug',
        'serviceId',
        'specialty',
        'version',
      ].sort(),
    );
  });
});

describe('bookingIntent — visibilidad por ruta', () => {
  it('muestra en home, blog, search y perfiles', () => {
    expect(shouldShowBookingResumeBanner('/', null)).toBe(true);
    expect(shouldShowBookingResumeBanner('/blog/x', null)).toBe(true);
    expect(shouldShowBookingResumeBanner('/search', null)).toBe(true);
    expect(shouldShowBookingResumeBanner('/abogado/x', null)).toBe(true);
  });

  it('oculta en checkout, pagos, dashboards y auth', () => {
    for (const path of [
      '/booking/abc',
      '/checkout/abc',
      '/payment/success',
      '/dashboard/appointments',
      '/lawyer/dashboard',
      '/admin',
      '/empresa/facturacion',
      '/auth/callback',
    ]) {
      expect(shouldShowBookingResumeBanner(path, null)).toBe(false);
    }
  });
});
