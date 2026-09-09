import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBookingAttribution } from './bookingAttribution';

describe('bookingAttribution', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', { value: { search: '?utm_source=qa&utm_medium=e2e&utm_campaign=test&article_slug=test-article', hostname: 'legalup.cl' }, writable: true });
    sessionStorage.clear();
  });

  it('captures UTMs and article_slug', async () => {
    const attr = await getBookingAttribution();
    expect(attr.utm_source).toBe('qa');
    expect(attr.article_slug).toBe('test-article');
  });

  it('captures ga_client_id when gtag available', async () => {
    (window as any).gtag = (cmd: string, id: string, type: string, cb: (id: string) => void) => {
      if (type === 'client_id') cb('123.456');
      if (type === 'session_id') cb('999');
    };
    (window as any).GA_MEASUREMENT_ID = 'G-TEST';
    (import.meta as any).env = { VITE_GA4_MEASUREMENT_ID: 'G-TEST' };
    const attr = await getBookingAttribution();
    expect(attr.ga_client_id).toBe('123.456');
    expect(attr.ga_session_id).toBe('999');
  });

  it('booking proceeds when GA fails', async () => {
    (window as any).gtag = () => { throw new Error('fail'); };
    const attr = await getBookingAttribution();
    expect(attr.ga_client_id).toBeNull();
    expect(attr.posthog_distinct_id).not.toBeUndefined();
  });

  it('ga_client_id != posthog_distinct_id', async () => {
    (window as any).gtag = (cmd: string, id: string, type: string, cb: (id: string) => void) => {
      if (type === 'client_id') cb('GA123');
    };
    const attr = await getBookingAttribution();
    expect(attr.ga_client_id).not.toBe(attr.posthog_distinct_id);
  });
});
