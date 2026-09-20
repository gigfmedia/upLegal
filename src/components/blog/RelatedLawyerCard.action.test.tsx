import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const trackEventMock = vi.fn();
vi.mock('@/lib/track', () => ({ trackEvent: (...args: unknown[]) => trackEventMock(...args) }));
vi.mock('@/hooks/useBookingPricing', () => ({ useBookingPricing: () => ({ clientSurchargePercent: 0.1 }) }));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const gtagMock = vi.fn();

import { RelatedLawyerCard } from './RelatedLawyerCard';

const baseLawyer: any = {
  id: 'L1',
  user_id: 'U1',
  name: 'Ana Perez Gomez',
  specialties: ['Derecho Civil'],
  rating: 5,
  reviews: 0,
  hourlyRate: 40000,
  consultationPrice: 40000,
  image: '',
  bio: 'Bio',
  verified: true,
  experience_years: 3,
};

function renderCard() {
  return render(
    <MemoryRouter>
      <RelatedLawyerCard lawyer={baseLawyer} category="Derecho Civil" articleSlug="art-1" cardPosition={2} />
    </MemoryRouter>
  );
}

describe('RelatedLawyerCard action attribution', () => {
  beforeEach(() => {
    trackEventMock.mockClear();
    gtagMock.mockClear();
    (window as any).gtag = gtagMock;
    try { sessionStorage.clear(); } catch {}
  });

  it('A. profile click fires profile event only, navigates to profile', () => {
    renderCard();
    navigateMock.mockClear();
    const card = document.querySelector('[class*="bg-white rounded-2xl"]') as HTMLElement;
    expect(card).toBeTruthy();
    fireEvent.click(card);
    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledWith(
      'related_lawyer_profile_clicked',
      expect.objectContaining({ lawyer_id: 'L1', article_slug: 'art-1', destination: 'profile', card_position: 2 })
    );
    expect(navigateMock).toHaveBeenCalledWith(expect.stringContaining('/abogado/'));
  });

  it('B. booking button fires booking event only, navigates to booking', () => {
    renderCard();
    navigateMock.mockClear();
    const btn = screen.getByRole('button', { name: /Agenda consulta/i });
    fireEvent.click(btn);
    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledWith(
      'related_lawyer_booking_clicked',
      expect.objectContaining({ lawyer_id: 'L1', article_slug: 'art-1', destination: 'booking', card_position: 2 })
    );
    // legacy select_lawyer preserved
    expect(gtagMock).toHaveBeenCalledWith('event', 'select_lawyer', expect.objectContaining({ lawyer_id: 'U1' }));
    expect(navigateMock).toHaveBeenCalledWith(expect.stringContaining('/booking/'));
  });

  it('F. article_slug preserved via sessionStorage fallback', () => {
    renderCard();
    const btn = screen.getByRole('button', { name: /Agenda consulta/i });
    fireEvent.click(btn);
    expect(sessionStorage.getItem('legalup_article_slug')).toBe('art-1');
  });
});
