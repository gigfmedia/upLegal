import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookingSuccessPage from './BookingSuccessPage';
import {
  BOOKING_INTENT_STORAGE_KEY,
  saveBookingIntent,
} from '@/lib/bookingIntent';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: null }),
}));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

describe('BookingSuccessPage — L. limpia el intent al confirmar', () => {
  it('reserva confirmada borra legalup_booking_intent', async () => {
    saveBookingIntent({
      lawyerId: 'lawyer-1',
      lawyerName: 'María González',
      lawyerSlug: null,
      lawyerPhoto: null,
      specialty: null,
      appointmentDate: '2099-10-16',
      appointmentTime: '09:00',
      appointmentStart: null,
      durationMinutes: 60,
      appointmentType: 'appointment',
      serviceId: null,
      bookingUrl: '/booking/x',
    });
    expect(window.localStorage.getItem(BOOKING_INTENT_STORAGE_KEY)).not.toBeNull();

    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          booking: {
            id: 'b1',
            scheduled_date: '2099-10-16',
            scheduled_time: '09:00',
            duration: 60,
            price: 50000,
            user_name: 'Test',
            user_email: 'test@test.invalid',
            lawyer: { first_name: 'María', last_name: 'González' },
          },
        }),
    });

    render(
      <MemoryRouter initialEntries={['/booking/success?booking_id=b1']}>
        <BookingSuccessPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(window.localStorage.getItem(BOOKING_INTENT_STORAGE_KEY)).toBeNull();
    });
    expect(screen.getByText('María González')).toBeTruthy();
  });
});
