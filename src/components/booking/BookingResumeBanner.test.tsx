import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import BookingResumeBanner from './BookingResumeBanner';
import {
  BOOKING_INTENT_STORAGE_KEY,
  saveBookingIntent,
  type BookingIntentInput,
} from '@/lib/bookingIntent';
import { CONSENT_STORAGE_KEY } from '@/lib/cookieConsent';

const rpcMock = vi.fn();
const trackEventMock = vi.fn();
const toastMock = vi.fn();

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));
vi.mock('@/lib/track', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
  toast: (...args: unknown[]) => toastMock(...args),
}));

const baseInput: BookingIntentInput = {
  lawyerId: 'lawyer-1',
  lawyerName: 'María González',
  lawyerSlug: 'maria-gonzalez-lawyer-1',
  lawyerPhoto: null,
  specialty: 'Derecho de Familia',
  appointmentDate: '2099-10-16',
  appointmentTime: '09:00',
  appointmentStart: null,
  durationMinutes: 60,
  appointmentType: 'appointment',
  serviceId: null,
  bookingUrl: '/booking/maria-gonzalez-lawyer-1?date=2099-10-16&time=09:00&duration=60',
};

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
}

function setup(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BookingResumeBanner />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function seedConsent(analytics: boolean) {
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({
      version: '1',
      necessary: true,
      analytics,
      marketing: false,
      preferences: false,
      timestamp: new Date().toISOString(),
    }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  rpcMock.mockResolvedValue({ data: [], error: null });
});

describe('BookingResumeBanner — G. visible con intent válido', () => {
  it('muestra abogado, especialidad, fecha/hora y acciones', () => {
    saveBookingIntent(baseInput);
    setup();
    expect(screen.getByText('¿Quieres continuar tu reserva?')).toBeTruthy();
    expect(screen.getByText('María González')).toBeTruthy();
    expect(screen.getByText(/Derecho de Familia/)).toBeTruthy();
    expect(screen.getByText(/09:00/)).toBeTruthy();
    expect(screen.getByText(/60 min/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Descartar reserva pendiente' }),
    ).toBeTruthy();
  });
});

describe('BookingResumeBanner — H. oculto sin intent o en checkout', () => {
  it('sin intent no renderiza', () => {
    setup();
    expect(screen.queryByRole('dialog', { name: 'Continuar tu reserva' })).toBeNull();
  });

  it('en ruta de booking no se muestra aunque haya intent', () => {
    saveBookingIntent(baseInput);
    setup('/booking/maria-gonzalez-lawyer-1?date=2099-10-16&time=09:00&duration=60');
    expect(screen.queryByText('¿Quieres continuar tu reserva?')).toBeNull();
  });
});

describe('BookingResumeBanner — I. X descarta', () => {
  it('limpia el intent y oculta inmediatamente', async () => {
    seedConsent(true);
    saveBookingIntent(baseInput);
    setup();
    expect(screen.getByText('¿Quieres continuar tu reserva?')).toBeTruthy();
    await act(async () => {
      screen
        .getByRole('button', { name: 'Descartar reserva pendiente' })
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(window.localStorage.getItem(BOOKING_INTENT_STORAGE_KEY)).toBeNull();
    expect(screen.queryByText('¿Quieres continuar tu reserva?')).toBeNull();
    expect(trackEventMock).toHaveBeenCalledWith(
      'booking_resume_dismissed',
      expect.objectContaining({ lawyer_id: 'lawyer-1' }),
      expect.anything(),
    );
  });
});

describe('BookingResumeBanner — J. continuar con slot disponible', () => {
  it('navega al bookingUrl', async () => {
    saveBookingIntent(baseInput);
    setup();
    await act(async () => {
      screen
        .getByRole('button', { name: 'Continuar' })
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(rpcMock).toHaveBeenCalledWith('get_lawyer_busy_slots', {
      query_lawyer_id: 'lawyer-1',
      query_date: '2099-10-16',
    });
    expect(screen.getByTestId('location').textContent).toBe(
      '/booking/maria-gonzalez-lawyer-1?date=2099-10-16&time=09:00&duration=60',
    );
    // el intent se mantiene hasta confirmar el pago
    expect(window.localStorage.getItem(BOOKING_INTENT_STORAGE_KEY)).not.toBeNull();
  });
});

describe('BookingResumeBanner — K. slot no disponible', () => {
  it('avisa, limpia y lleva al perfil del abogado', async () => {
    rpcMock.mockResolvedValue({
      data: [{ scheduled_time: '09:00:00', duration: 60 }],
      error: null,
    });
    saveBookingIntent(baseInput);
    setup();
    await act(async () => {
      screen
        .getByRole('button', { name: 'Continuar' })
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Horario no disponible' }),
    );
    expect(window.localStorage.getItem(BOOKING_INTENT_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('location').textContent).toBe('/abogado/maria-gonzalez-lawyer-1');
  });
});

describe('BookingResumeBanner — M/N. analytics y consentimiento', () => {
  it('M: sin consentimiento no emite eventos aunque el banner funcione', () => {
    saveBookingIntent(baseInput);
    setup();
    expect(screen.getByText('¿Quieres continuar tu reserva?')).toBeTruthy();
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it('N: con consentimiento emite banner_shown una vez', () => {
    seedConsent(true);
    saveBookingIntent(baseInput);
    const { rerender } = setup();
    expect(trackEventMock).toHaveBeenCalledWith(
      'booking_resume_banner_shown',
      expect.objectContaining({ lawyer_id: 'lawyer-1' }),
      expect.anything(),
    );
    const calls = trackEventMock.mock.calls.length;
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <BookingResumeBanner />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(trackEventMock.mock.calls.length).toBe(calls);
  });
});
