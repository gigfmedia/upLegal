import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./posthogLoader', () => ({
  posthog: { register: vi.fn() },
}));

import { setOwnerGaOptOut } from './owner';

const GA_ID = 'G-ZJCG1RNJT6';

beforeEach(() => {
  delete (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`];
});

describe('setOwnerGaOptOut', () => {
  it('activa el opt-out de GA4 para el propietario', () => {
    setOwnerGaOptOut(true);
    expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`]).toBe(true);
  });

  it('quita el opt-out cuando el contexto no es del propietario', () => {
    (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = true;
    setOwnerGaOptOut(false);
    expect((window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`]).toBeUndefined();
  });
});
