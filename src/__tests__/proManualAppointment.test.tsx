import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 4.37B — manual appointment entitlement: CitasPage gate, Dashboard gate,
// stale-denial mapping, marketplace source ownership.

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  toast: vi.fn(),
  proRefetch: vi.fn(),
  findOrCreateClient: vi.fn(),
  bookingsInsert: vi.fn(),
  bookingsUpdate: vi.fn(),
  hasProAccess: true,
}));

const FAKE_DATA = {
  clientName: 'Cliente Test',
  clientEmail: 'c@test.invalid',
  clientPhone: null,
  date: '2026-10-01',
  time: '10:00',
  duration: '60',
  type: 'video',
  service: 'Cita',
  notes: '',
};

function chainable(final: unknown): unknown {
  let proxy: unknown = null;
  proxy = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') return (resolve: (v: unknown) => unknown) => Promise.resolve(final).then(resolve);
        if (prop === 'single') return () => Promise.resolve(final);
        return (..._args: unknown[]) => proxy;
      },
    }
  );
  return proxy;
}

vi.mock('@/hooks/useProSubscription', () => ({
  useProSubscription: () => ({ hasProAccess: mocks.hasProAccess, refetch: mocks.proRefetch }),
}));
vi.mock('@/hooks/useLawyerClients', () => ({
  useLawyerClients: () => ({ findOrCreateClient: mocks.findOrCreateClient }),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock('@/components/legalup-pro/ProPricingModal', () => ({
  ProPricingModal: () => null,
}));
vi.mock('@/components/appointments/AppointmentForm', () => ({
  AppointmentForm: ({ onSubmit }: { onSubmit: (d: unknown) => void }) => (
    <div>
      <button type="button" onClick={() => onSubmit(FAKE_DATA)}>
        fake-submit
      </button>
    </div>
  ),
}));
vi.mock('@/lib/activationAnalytics', () => ({
  trackBookingCreated: vi.fn(),
  trackRequestProcessed: vi.fn(),
}));
vi.mock('@/lib/normalizeEmail', () => ({
  normalizeEmail: (v: unknown) => v,
}));
vi.mock('posthog-js', () => ({ default: { capture: mocks.capture } }));

const sbState = vi.hoisted(() => ({
  bookings: [] as unknown[],
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'lawyer-1' } } } }) },
    from: (table: string) => {
      if (table === 'bookings') {
        return {
          select: () => chainable({ data: sbState.bookings, error: null }),
          insert: (row: unknown) => {
            const r = mocks.bookingsInsert(row);
            if (r && (r as { error?: unknown }).error) {
              return { select: () => ({ single: () => Promise.resolve({ data: null, error: (r as { error: unknown }).error }) }) };
            }
            return { select: () => ({ single: () => Promise.resolve({ data: { id: 'b-new' }, error: null }) }) };
          },
          update: (row: unknown) => {
            mocks.bookingsUpdate(row);
            return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
          },
        };
      }
      if (table === 'lawyer_cases') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      return { select: () => chainable({ data: [], error: null }) };
    },
  },
}));

import CitasPage from '@/pages/lawyer/CitasPage';

function renderCitas() {
  render(
    <MemoryRouter>
      <CitasPage />
    </MemoryRouter>
  );
}

const EXPIRED_SUB = { status: 'expired', current_period_end: new Date(Date.now() - 1000).toISOString() };

describe('4.37B — CitasPage manual gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasProAccess = true;
    mocks.findOrCreateClient.mockResolvedValue({ id: 'client-1' });
    mocks.bookingsInsert.mockImplementation(() => ({}));
    mocks.proRefetch.mockResolvedValue({ data: null });
    sbState.bookings = [];
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('non-Pro Nueva cita → paywall, form does not open', () => {
    mocks.hasProAccess = false;
    renderCitas();
    fireEvent.click(screen.getByRole('button', { name: /nueva cita/i }));
    expect(mocks.capture).toHaveBeenCalledWith(
      'pro_paywall_opened',
      expect.objectContaining({ action: 'create_appointment' })
    );
    expect(screen.queryByText('fake-submit')).not.toBeInTheDocument();
  });

  it('active Pro → form opens and successful create toasts', async () => {
    renderCitas();
    fireEvent.click(screen.getByRole('button', { name: /nueva cita/i }));
    fireEvent.click(await screen.findByText('fake-submit'));
    await waitFor(() => expect(mocks.bookingsInsert).toHaveBeenCalled());
    const row = mocks.bookingsInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(row).toMatchObject({ source: 'LAWYER_DIRECT', booking_type: 'appointment', status: 'confirmed' });
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cita creada' }))
    );
  });

  it('stale Pro rejected by DB → paywall after fresh read', async () => {
    mocks.bookingsInsert.mockImplementation(() => ({
      error: { code: '42501', message: 'new row violates row-level security policy for table "bookings"' },
    }));
    mocks.proRefetch.mockResolvedValue({ data: EXPIRED_SUB });
    renderCitas();
    fireEvent.click(screen.getByRole('button', { name: /nueva cita/i }));
    fireEvent.click(await screen.findByText('fake-submit'));
    await waitFor(() =>
      expect(mocks.capture).toHaveBeenCalledWith(
        'pro_paywall_opened',
        expect.objectContaining({ action: 'create_appointment', reason: 'entitlement_rejected' })
      )
    );
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Cita creada' }));
  });

  it('unknown create error → generic error, no paywall', async () => {
    mocks.bookingsInsert.mockImplementation(() => ({ error: new Error('network down') }));
    renderCitas();
    fireEvent.click(screen.getByRole('button', { name: /nueva cita/i }));
    fireEvent.click(await screen.findByText('fake-submit'));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error' }))
    );
    expect(mocks.capture).not.toHaveBeenCalledWith(
      'pro_paywall_opened',
      expect.objectContaining({ reason: 'entitlement_rejected' })
    );
  });

  it('denial-shaped error but fresh read still Pro → generic error, no paywall', async () => {
    mocks.bookingsInsert.mockImplementation(() => ({
      error: { code: '42501', message: 'new row violates row-level security policy' },
    }));
    mocks.proRefetch.mockResolvedValue({
      data: { status: 'active', current_period_end: new Date(Date.now() + 86400000).toISOString() },
    });
    renderCitas();
    fireEvent.click(screen.getByRole('button', { name: /nueva cita/i }));
    fireEvent.click(await screen.findByText('fake-submit'));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error' }))
    );
    expect(mocks.capture).not.toHaveBeenCalledWith(
      'pro_paywall_opened',
      expect.objectContaining({ reason: 'entitlement_rejected' })
    );
  });
});

describe('4.37B — marketplace source contract (source of truth)', () => {
  it('endpoint writes LEGALUP_MARKETPLACE and never reads client source', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    const idx = server.indexOf("app.post('/api/bookings/create'");
    expect(idx).toBeGreaterThan(-1);
    const endpoint = server.slice(idx, idx + 14000);
    expect(endpoint).toContain("source: 'LEGALUP_MARKETPLACE'");
    // Booking origin itself must never come from the client body
    // (utm_* attribution fields are unrelated and untouched).
    expect(endpoint).not.toMatch(/[^_a-zA-Z]source:\s*req\.body/);
    expect(endpoint).not.toMatch(/source\s*:\s*body\[/);
  });

  it('manual surfaces keep LAWYER_DIRECT; RLS keeps Pro-gated insert', () => {
    const citas = readFileSync(resolve('src/pages/lawyer/CitasPage.tsx'), 'utf-8');
    expect(citas).toContain("source: 'LAWYER_DIRECT'");
    const rls = readFileSync(resolve('supabase/migrations/20260911000000_pro_gates.sql'), 'utf-8');
    expect(rls).toContain('has_pro_access');
  });

  it('classifier only matches denial-shaped errors', async () => {
    const { isBookingDeniedError } = await import('@/lib/appointmentEntitlement');
    expect(isBookingDeniedError({ code: '42501', message: 'x' })).toBe(true);
    expect(isBookingDeniedError(new Error('new row violates row-level security policy'))).toBe(true);
    expect(isBookingDeniedError(new Error('network down'))).toBe(false);
    expect(isBookingDeniedError(null)).toBe(false);
    expect(isBookingDeniedError('RLS bypass')).toBe(false);
  });
});
