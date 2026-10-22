import {
  PRO_FOUNDER_MAX_SLOTS,
  PRO_INTRO_PRICE_CLP_DISPLAY,
  PRO_PRICE_CLP_DISPLAY,
} from './planDisplay';

/**
 * Display-only Founder availability resolver. Server/DB remain the
 * authority for slots and checkout price; this module only prevents the
 * UI from promising $19.990 while capacity is unknown or exhausted.
 */
export type FounderAvailability =
  | { state: 'loading' }
  | { state: 'unavailable' }
  | { state: 'available'; remaining: number; max: number; priceClp: number }
  | { state: 'sold_out'; remaining: 0; max: number; priceClp: number };

export function resolveFounderAvailability(input: {
  loading?: boolean;
  error?: boolean;
  remaining?: number | null;
  max?: number | null;
  /** Optional server preview price (modal). Falls back to catalog values. */
  priceClp?: number | null;
}): FounderAvailability {
  if (input.loading) return { state: 'loading' };

  const remaining = Number(input.remaining);
  if (input.error || input.remaining === null || input.remaining === undefined || !Number.isFinite(remaining)) {
    return { state: 'unavailable' };
  }

  const max = Number.isFinite(Number(input.max)) && Number(input.max) > 0
    ? Math.min(Number(input.max), PRO_FOUNDER_MAX_SLOTS)
    : PRO_FOUNDER_MAX_SLOTS;

  if (remaining <= 0) {
    return { state: 'sold_out', remaining: 0, max, priceClp: PRO_PRICE_CLP_DISPLAY };
  }

  const serverPrice = Number(input.priceClp);
  const priceClp = serverPrice === PRO_PRICE_CLP_DISPLAY
    ? PRO_PRICE_CLP_DISPLAY
    : PRO_INTRO_PRICE_CLP_DISPLAY;

  return { state: 'available', remaining: Math.min(remaining, max), max, priceClp };
}
