import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LawyerCard, lawyerNameSlug } from '@/components/LawyerCard';

// ---------------------------------------------------------------------------
// FASE 5.18C — Agendar explícito en /search va a booking directo;
// card/nombre/foto van a perfil; sin doble navegación.
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useBookingPricing', () => ({
  useBookingPricing: () => ({ clientSurchargePercent: 0.1, pricingReady: true, pricingError: null }),
}));

vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/components/ratings/LawyerRatings', () => ({
  LawyerRatings: () => <div>ratings-mock</div>,
}));

const trackEventMock = vi.fn();
vi.mock('@/lib/track', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

const lawyer: any = {
  id: 'lawyer-123',
  user_id: 'user-456',
  first_name: 'María',
  last_name: 'López Prueba',
  name: 'María López Prueba',
  hourlyRate: 45000,
  hourly_rate_clp: 45000,
  consultationPrice: 45000,
  specialties: ['Derecho Civil'],
  review_count: 3,
  avatar_url: null,
  location: 'Santiago',
  bio: 'Abogada de prueba con bio suficiente.',
  blocked: false,
  verified: true,
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderCard(props: any = {}, user: any = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route
              path="/search"
              element={<LawyerCard lawyer={lawyer} user={user} {...props} />}
            />
            <Route path="/abogado/*" element={<div>PROFILE-PAGE</div>} />
            <Route path="/booking/*" element={<div>BOOKING-PAGE</div>} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function gtagEvents(name: string) {
  return ((window as any).gtag as any).mock.calls
    .map((c: any[]) => c[1])
    .filter((n: string) => n === name);
}

beforeEach(() => {
  trackEventMock.mockClear();
  (window as any).gtag = vi.fn();
});

afterEach(cleanup);

describe('FASE 5.18C slug canónico', () => {
  it('normaliza acentos y espacios igual que perfil/booking', () => {
    expect(lawyerNameSlug('María López Prueba')).toBe('maria-lopez-prueba');
    expect(lawyerNameSlug('')).toBe('abogado');
  });
});

describe('FASE 5.18E default: Agendar → booking canónico, guest y cliente idéntico', () => {
  it.each([{ label: 'guest', user: null }, { label: 'client', user: { id: 'client-1' } }])(
    'Agendar sin override ($label) → booking, un evento, sin perfil',
    async ({ user }) => {
      renderCard({}, user);
      const btn = await screen.findByText('Agenda consulta');
      fireEvent.click(btn);
      expect(await screen.findByText('BOOKING-PAGE')).toBeTruthy();
      expect(screen.queryByText('PROFILE-PAGE')).toBeNull();
      expect(
        screen.getByTestId('location').textContent
      ).toBe('/booking/maria-lopez-prueba-user-456');
      expect(gtagEvents('select_lawyer')).toHaveLength(1);
      expect(gtagEvents('lawyer_profile_viewed')).toHaveLength(0);
    }
  );

  it('override /search emite su evento y no el default', async () => {
    const override = vi.fn();
    renderCard({ onScheduleClick: override });
    const btn = await screen.findByText('Agenda consulta');
    fireEvent.click(btn);
    expect(override).toHaveBeenCalledTimes(1);
    expect(gtagEvents('select_lawyer')).toHaveLength(0);
    expect(screen.getByTestId('location').textContent).toBe('/search');
  });
});

describe('FASE 5.18C override /search', () => {
  it('Agendar con onScheduleClick → override una vez, sin navegar a perfil', async () => {
    const override = vi.fn();
    renderCard({ onScheduleClick: override });
    const btn = await screen.findByText('Agenda consulta');
    fireEvent.click(btn);
    expect(override).toHaveBeenCalledTimes(1);
    // Sin navegación: seguimos en /search, sin página de perfil ni booking
    expect(screen.getByTestId('location').textContent).toBe('/search');
    expect(screen.queryByText('PROFILE-PAGE')).toBeNull();
    expect(screen.queryByText('BOOKING-PAGE')).toBeNull();
  });

  it('click en la card → perfil (no booking)', async () => {
    const override = vi.fn();
    const { container } = renderCard({ onScheduleClick: override });
    // click en el contenedor de la card, fuera del botón Agendar
    const card = container.querySelector('[class*="cursor-pointer"]');
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    expect(await screen.findByText('PROFILE-PAGE')).toBeTruthy();
    expect(override).not.toHaveBeenCalled();
  });
});

describe('FASE 5.18C SearchResults wiring', () => {
  it('pasa onScheduleClick a cada LawyerCard', async () => {
    const src = await import('fs').then((fs) =>
      fs.readFileSync('src/pages/SearchResults.tsx', 'utf-8')
    );
    expect(src).toContain('onScheduleClick');
    expect(src).toContain('search_lawyer_booking_clicked');
    expect(src).toContain('/booking/${slug}-');
  });
});
