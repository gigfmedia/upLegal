import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackBookingStarted, resetBookingStartedForTests, trackBeginCheckout } from './bookingFunnel';

vi.mock('./posthogLoader', () => ({ posthog: { capture: vi.fn() } }));
const gtagMock = vi.fn();
(global as any).window = { gtag: gtagMock } as any;

describe('bookingFunnel canonical', () => {
  beforeEach(() => {
    resetBookingStartedForTests();
    gtagMock.mockClear();
    Object.defineProperty(window, 'location', { value: { hostname: 'legalup.cl', search: '', pathname: '/' }, writable: true });
    try { sessionStorage.clear(); } catch {}
  });

  it('booking_started fires once per interaction', async () => {
    const { posthog } = await import('./posthogLoader');
    trackBookingStarted({ lawyer_id: 'L1', source: 'booking_page' });
    trackBookingStarted({ lawyer_id: 'L1', source: 'booking_page' });
    expect(gtagMock).toHaveBeenCalledTimes(1);
    expect(posthog.capture).toHaveBeenCalledTimes(1);
    expect(gtagMock).toHaveBeenCalledWith('event', 'booking_started', expect.objectContaining({ lawyer_id: 'L1' }));
  });

  it('begin_checkout requires booking_id and valid checkout', () => {
    trackBeginCheckout({ booking_id: 'B1', lawyer_id: 'L1', value: 55000, currency: 'CLP' });
    expect(gtagMock).toHaveBeenCalledWith('event', 'begin_checkout', expect.objectContaining({ booking_id: 'B1', value: 55000 }));
  });

  it('booking_page_viewed not tested here, but helper exists', async () => {
    const { trackBookingPageViewed } = await import('./bookingFunnel');
    expect(typeof trackBookingPageViewed).toBe('function');
  });
});
