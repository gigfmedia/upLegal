import { useCallback, useEffect, useState } from 'react';
import {
  BOOKING_INTENT_STORAGE_KEY,
  clearBookingIntent as clearStoredIntent,
  getBookingIntent,
  parseStoredIntent,
  isBookingIntentExpired,
  isBookingIntentPast,
  saveBookingIntent as saveStoredIntent,
  subscribeBookingIntent,
  trackBookingIntentEvent,
  type BookingIntent,
  type BookingIntentInput,
} from '@/lib/bookingIntent';

/**
 * useBookingIntent — estado del intent de reserva sin provider global.
 * - Carga el intent válido, maneja expiración (limpia + emite evento si hay
 *   consentimiento) y escucha cambios same-tab y cross-tab.
 * - Funciona sin login y sin consentimiento analytics.
 */
export function useBookingIntent() {
  const [intent, setIntent] = useState<BookingIntent | null>(null);

  const refresh = useCallback(() => {
    if (typeof window === 'undefined') return;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(BOOKING_INTENT_STORAGE_KEY);
    } catch {
      raw = null;
    }
    const parsed = parseStoredIntent(raw);
    if (parsed && isBookingIntentExpired(parsed)) {
      clearStoredIntent();
      trackBookingIntentEvent('booking_intent_expired', parsed, { reason: 'ttl_expired' });
      setIntent(null);
      return;
    }
    if (parsed && isBookingIntentPast(parsed)) {
      clearStoredIntent();
      trackBookingIntentEvent('booking_intent_expired', parsed, { reason: 'past_slot' });
      setIntent(null);
      return;
    }
    setIntent(getBookingIntent());
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeBookingIntent(() => refresh());
    return unsubscribe;
  }, [refresh]);

  const save = useCallback(
    (input: BookingIntentInput) => {
      const stored = saveStoredIntent(input);
      if (stored) {
        trackBookingIntentEvent('booking_intent_saved', stored);
        setIntent(stored);
      }
      return stored;
    },
    [],
  );

  const clear = useCallback(() => {
    clearStoredIntent();
    setIntent(null);
  }, []);

  return { intent, save, clear, refresh };
}
