import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderRelatedLawyers() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/blog/art-1']}>
        <RelatedLawyers category="Derecho Civil" articleId="art-1" />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const trackEventMock = vi.fn();
vi.mock('@/lib/track', () => ({ trackEvent: (...args: unknown[]) => trackEventMock(...args) }));
vi.mock('@/hooks/useBookingPricing', () => ({ useBookingPricing: () => ({ clientSurchargePercent: 0.1 }) }));

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

vi.mock('@/pages/api/search-lawyers', () => ({
  searchLawyers: vi.fn(async () => ({
    lawyers: [
      {
        id: 'L1',
        user_id: 'U1',
        first_name: 'Ana',
        last_name: 'Perez',
        specialties: ['Derecho Civil'],
        rating: 5,
        review_count: 0,
        location: 'Chile',
        bio: 'Bio',
        avatar_url: '',
        hourly_rate_clp: 40000,
        verified: true,
        pjud_verified: true,
        experience_years: 3,
        created_at: undefined,
      },
      {
        id: 'L2',
        user_id: 'U2',
        first_name: 'Luis',
        last_name: 'Gomez',
        specialties: ['Derecho Civil'],
        rating: 4,
        review_count: 2,
        location: 'Chile',
        bio: 'Bio',
        avatar_url: '',
        hourly_rate_clp: 50000,
        verified: true,
        pjud_verified: true,
        experience_years: 5,
        created_at: undefined,
      },
    ],
  })),
}));

const gtagMock = vi.fn();

import { RelatedLawyers } from './RelatedLawyers';

describe('RelatedLawyers shown attribution', () => {
  beforeEach(() => {
    trackEventMock.mockClear();
    gtagMock.mockClear();
    (window as any).gtag = gtagMock;
    try { sessionStorage.clear(); } catch {}
  });

  it('A. render emits shown once to GA4 and PostHog (aggregate + per-card)', async () => {
    renderRelatedLawyers();

    await waitFor(() => {
      expect(gtagMock).toHaveBeenCalledWith(
        'event',
        'related_lawyers_shown',
        expect.objectContaining({ article_slug: 'art-1' })
      );
    });

    // GA4: 1 aggregate + 2 per-card = 3 calls (verbatim behavior preserved)
    const gtagShownCalls = gtagMock.mock.calls.filter((c) => c[1] === 'related_lawyers_shown');
    expect(gtagShownCalls).toHaveLength(3);

    // PostHog via shared helper: same 1 aggregate + 2 per-card, exactly once (no StrictMode double-fire)
    const posthogShownCalls = trackEventMock.mock.calls.filter((c) => c[0] === 'related_lawyers_shown');
    expect(posthogShownCalls).toHaveLength(3);
    expect(trackEventMock).toHaveBeenCalledWith(
      'related_lawyers_shown',
      expect.objectContaining({ article_slug: 'art-1', source: 'related_lawyers', specialty: 'Derecho Civil' })
    );
    expect(trackEventMock).toHaveBeenCalledWith(
      'related_lawyers_shown',
      expect.objectContaining({ lawyer_id: 'L1', article_slug: 'art-1', card_position: 0, source: 'related_lawyers' })
    );
    // No click events from a mere render
    expect(trackEventMock).not.toHaveBeenCalledWith(
      'related_lawyer_profile_clicked',
      expect.anything()
    );
    expect(trackEventMock).not.toHaveBeenCalledWith(
      'related_lawyer_booking_clicked',
      expect.anything()
    );
  });

  it('F. card click: exactly one profile intent, no booking intent, legacy fires once', async () => {
    renderRelatedLawyers();

    await waitFor(() => {
      expect(trackEventMock).toHaveBeenCalledWith(
        'related_lawyers_shown',
        expect.objectContaining({ article_slug: 'art-1' })
      );
    });
    trackEventMock.mockClear();
    gtagMock.mockClear();

    const card = document.querySelector('[class*="bg-white rounded-2xl"]') as HTMLElement;
    expect(card).toBeTruthy();
    fireEvent.click(card);

    // Exactly one clean profile intent via shared helper (PostHog + GA4)
    const profileCalls = trackEventMock.mock.calls.filter((c) => c[0] === 'related_lawyer_profile_clicked');
    expect(profileCalls).toHaveLength(1);
    expect(profileCalls[0][1]).toEqual(
      expect.objectContaining({ lawyer_id: 'L1', article_slug: 'art-1', destination: 'profile', card_position: 0 })
    );
    // No booking intent from a card click
    expect(trackEventMock).not.toHaveBeenCalledWith(
      'related_lawyer_booking_clicked',
      expect.anything()
    );
    // Legacy event preserved (parent capture), exactly once
    const legacyCalls = gtagMock.mock.calls.filter((c) => c[1] === 'related_lawyer_clicked');
    expect(legacyCalls).toHaveLength(1);
  });

  it('F. booking button click: exactly one booking intent, no profile intent, no legacy click', async () => {
    renderRelatedLawyers();

    await waitFor(() => {
      expect(trackEventMock).toHaveBeenCalledWith(
        'related_lawyers_shown',
        expect.objectContaining({ article_slug: 'art-1' })
      );
    });
    trackEventMock.mockClear();
    gtagMock.mockClear();

    const buttons = screen.getAllByRole('button', { name: /Agenda consulta/i });
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);

    // Exactly one clean booking intent
    const bookingCalls = trackEventMock.mock.calls.filter((c) => c[0] === 'related_lawyer_booking_clicked');
    expect(bookingCalls).toHaveLength(1);
    expect(bookingCalls[0][1]).toEqual(
      expect.objectContaining({ article_slug: 'art-1', destination: 'booking' })
    );
    // No profile intent from the booking button (parent capture guard)
    expect(trackEventMock).not.toHaveBeenCalledWith(
      'related_lawyer_profile_clicked',
      expect.anything()
    );
    const legacyCalls = gtagMock.mock.calls.filter((c) => c[1] === 'related_lawyer_clicked');
    expect(legacyCalls).toHaveLength(0);
    // Legacy select_lawyer still fires
    expect(gtagMock).toHaveBeenCalledWith(
      'event',
      'select_lawyer',
      expect.objectContaining({ lawyer_id: 'U1' })
    );
  });
});
