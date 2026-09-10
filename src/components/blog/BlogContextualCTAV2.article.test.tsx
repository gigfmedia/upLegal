import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock PostHog feature flag to return contextual
vi.mock('@posthog/react', () => ({
  useFeatureFlagVariantKey: () => 'contextual',
}));

vi.mock('@/lib/track', () => ({
  track: {
    blogContextualCTAViewed: vi.fn(),
    blogContextualCTAClicked: vi.fn(),
    problemStarted: vi.fn(),
  },
  detectLegalCategory: (slug: string) => 'arriendo',
}));

describe('V2 article_slug persistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/blog/cese-de-convivencia-chile-2026', search: '', hostname: 'legalup.cl' },
      writable: true,
    });
  });

  it('V2 click persists legalup_article_slug for booking attribution', async () => {
    const { default: BlogContextualCTAV2 } = await import('./BlogContextualCTAV2');
    const { getByText } = render(
      <BrowserRouter>
        <BlogContextualCTAV2 articleSlug="cese-de-convivencia-chile-2026" />
      </BrowserRouter>
    );
    const button = getByText(/Ver abogados de familia disponibles/);
    fireEvent.click(button);
    expect(sessionStorage.getItem('legalup_article_slug')).toBe('cese-de-convivencia-chile-2026');
  });

  it('getBookingAttribution recovers persisted article_slug', async () => {
    sessionStorage.setItem('legalup_article_slug', 'me-quieren-desalojar-que-hago-chile-2026');
    Object.defineProperty(window, 'location', {
      value: { search: '', hostname: 'legalup.cl', pathname: '/booking/123' },
      writable: true,
    });
    const { getBookingAttribution } = await import('@/lib/bookingAttribution');
    const attr = await getBookingAttribution();
    expect(attr.article_slug).toBe('me-quieren-desalojar-que-hago-chile-2026');
  });

  it('article → CTA click → booking attribution chain', async () => {
    // Simulate full chain: V2 click then booking page reads
    sessionStorage.clear();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/blog/cuanto-demora-juicio-desalojo-chile-2026', search: '', hostname: 'legalup.cl' },
      writable: true,
    });
    const { default: BlogContextualCTAV2 } = await import('./BlogContextualCTAV2');
    const { getByText, unmount } = render(
      <BrowserRouter>
        <BlogContextualCTAV2 articleSlug="cuanto-demora-juicio-desalojo-chile-2026" />
      </BrowserRouter>
    );
    fireEvent.click(getByText(/Ver abogados de arriendos disponibles/));
    expect(sessionStorage.getItem('legalup_article_slug')).toBe('cuanto-demora-juicio-desalojo-chile-2026');
    unmount();

    // Simulate navigation to booking page
    Object.defineProperty(window, 'location', {
      value: { search: '', hostname: 'legalup.cl', pathname: '/booking/abc' },
      writable: true,
    });
    const { getBookingAttribution } = await import('@/lib/bookingAttribution');
    const attr = await getBookingAttribution();
    expect(attr.article_slug).toBe('cuanto-demora-juicio-desalojo-chile-2026');
  });
});
