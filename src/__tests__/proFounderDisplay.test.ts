import { describe, it, expect } from 'vitest';
import { resolveFounderAvailability } from '@/lib/proFounderDisplay';

describe('Founder availability display (server is authority)', () => {
  it('loading is neutral (never a price)', () => {
    expect(resolveFounderAvailability({ loading: true, remaining: 7 })).toEqual({ state: 'loading' });
  });

  it('error is neutral', () => {
    expect(resolveFounderAvailability({ error: true, remaining: 7 })).toEqual({ state: 'unavailable' });
  });

  it('missing/unknown remaining is neutral', () => {
    for (const remaining of [undefined, null, NaN, Infinity]) {
      expect(resolveFounderAvailability({ remaining }).state).toBe('unavailable');
    }
  });

  it('remaining 0 → standard price, sold out', () => {
    expect(resolveFounderAvailability({ remaining: 0, max: 15 })).toEqual({
      state: 'sold_out',
      remaining: 0,
      max: 15,
      priceClp: 49990,
    });
  });

  it('remaining > 0 → intro price and capped remaining', () => {
    expect(resolveFounderAvailability({ remaining: 7, max: 15 })).toEqual({
      state: 'available',
      remaining: 7,
      max: 15,
      priceClp: 19990,
    });
  });

  it('server preview standard overrides intro even with slots left (post-3 founder)', () => {
    expect(resolveFounderAvailability({ remaining: 5, max: 15, priceClp: 49990 })).toEqual({
      state: 'available',
      remaining: 5,
      max: 15,
      priceClp: 49990,
    });
  });

  it('caps remaining at the 15-slot commercial maximum', () => {
    expect(resolveFounderAvailability({ remaining: 40, max: 40 }).remaining).toBe(15);
  });
});
