import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const spy = vi.hoisted(() => ({ capture: vi.fn(), toast: vi.fn() }));

const dbMocks = {
  directCases: 0,
  freeConsumed: false,
  hasProAccess: false,
  proSub: null as unknown,
  bookingInsertError: null as unknown,
  bookingInserted: [] as unknown[],
};

function chainResult(count: number, data: unknown[] = []) {
  const filters: Array<[string, unknown]> = [];
  const builder: Record<string, unknown> = {};
  const terminal = () => {
    const isDirect = filters.some(([k, v]) => k === 'source' && v === 'LAWYER_DIRECT');
    return Promise.resolve({
      count: isDirect ? dbMocks.directCases : count,
      data,
      error: null,
    });
  };
  builder.then = (resolve: unknown, reject: unknown) =>
    (terminal() as Promise<unknown>).then(resolve as never, reject as never);
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop) {
      if (prop === 'then') return builder.then;
      return (...args: unknown[]) => {
        if (prop === 'eq' && typeof args[0] === 'string') filters.push([args[0], args[1]]);
        return proxy;
      };
    },
  };
  const proxy = new Proxy(builder, handler);
  return proxy;
}

vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: { id: 'lawyer-1' } }),
}));
vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: {}, services: [], completionPercentage: 80 }),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: spy.toast }),
}));
vi.mock('@/hooks/useAISubscription', () => ({
  useAISubscription: () => ({ status: 'none', subscription: null }),
}));
vi.mock('@/hooks/useProSubscription', () => ({
  useProSubscription: () => ({
    hasProAccess: dbMocks.hasProAccess,
    refetch: () => Promise.resolve({ data: dbMocks.proSub }),
    isFetching: false,
    status: null,
  }),
}));
// 4.36B — lifetime authority drives the dashboard CTA cards, not row counts.
vi.mock('@/hooks/useCaseEntitlement', () => ({
  useCaseEntitlement: () => ({
    entitlement: {
      hasProAccess: false,
      freeCaseConsumed: dbMocks.freeConsumed,
      canCreateDirectCase: !dbMocks.freeConsumed,
      activeCaseCount: dbMocks.freeConsumed ? 1 : 0,
      activeCaseLimit: 20,
    },
    loading: false,
    refetch: vi.fn(),
    canCreateDirectCase: !dbMocks.freeConsumed,
    activeCaseCount: dbMocks.freeConsumed ? 1 : 0,
    activeCaseLimit: 20,
    freeCaseConsumed: dbMocks.freeConsumed,
    hasProAccess: false,
  }),
  isFreeCaseEntitlementError: () => false,
  isActiveCapacityError: () => false,
}));
vi.mock('@/hooks/useLawyerClients', () => ({
  useLawyerClients: () => ({
    findOrCreateClient: () => Promise.resolve({ id: 'client-1' }),
  }),
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'lawyer-1' } } } }) },
    from: (_table: string) => ({
      select: (..._a: unknown[]) => chainResult(0, []),
      insert: (row: unknown) => {
        (dbMocks.bookingInserted as unknown[]).push(row);
        const result = dbMocks.bookingInsertError
          ? { data: null, error: dbMocks.bookingInsertError }
          : { data: { id: 'b-new' }, error: null };
        return {
          select: (..._a: unknown[]) => ({ single: () => Promise.resolve(result) }),
          then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
        };
      },
    }),
  },
}));
vi.mock('@/components/lawyer/OnboardingCard', () => ({
  OnboardingCard: () => null,
}));
vi.mock('@/lib/demoData', () => ({
  loadDemoData: vi.fn(),
}));
vi.mock('@/lib/activationAnalytics', () => ({
  trackOnboardingViewed: vi.fn(),
  trackFirstCaseIfNeeded: vi.fn(),
  trackBookingCreated: vi.fn(),
}));
vi.mock('@/components/legalup-pro/ProPricingModal', () => ({
  ProPricingModal: () => null,
}));
vi.mock('@/components/dashboard/GoogleCalendarConnect', () => ({
  GoogleCalendarConnect: () => null,
}));
vi.mock('@/components/dashboard/ProfileCompletion', () => ({
  ProfileCompletion: () => null,
}));
vi.mock('@/components/appointments/AppointmentForm', () => ({
  AppointmentForm: ({ onSubmit }: { onSubmit: (d: unknown) => void }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            clientName: 'Cliente Test',
            clientEmail: 'c@test.invalid',
            clientPhone: null,
            date: '2026-10-01',
            time: '10:00',
            duration: '60',
            type: 'video',
            service: 'Cita',
            notes: '',
          })
        }
      >
        dash-fake-submit
      </button>
    </div>
  ),
}));
vi.mock('posthog-js', () => ({ default: { capture: spy.capture } }));

import DashboardPage from '@/pages/lawyer/DashboardPage';

describe('4.32B — dashboard zero-data first-case CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.directCases = 0;
    dbMocks.freeConsumed = false;
  });

  it('zero-data lawyer with 0 direct cases sees first-case CTA, not Pro paywall', async () => {
    dbMocks.directCases = 0;
    dbMocks.freeConsumed = false;
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Crea tu primer caso')).toBeInTheDocument());
    expect(screen.getByText(/Tu primer caso directo no requiere Pro/i)).toBeInTheDocument();
  });

  it('lawyer with consumed direct case does not see misleading free-first-case CTA', async () => {
    dbMocks.directCases = 1;
    dbMocks.freeConsumed = true;
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Empieza a organizar tu práctica con LegalUp Pro')).toBeInTheDocument());
    expect(screen.queryByText(/Tu primer caso directo no requiere Pro/i)).not.toBeInTheDocument();
  });
});

describe('4.36D — dashboard active definition (delivered counts)', () => {
  it('active-cases KPI excludes only closed/cancelled (delivered is ACTIVE)', () => {
    const dash = readFileSync(resolve('src/pages/lawyer/DashboardPage.tsx'), 'utf-8');
    expect(dash).toContain(`.not('status', 'in', '("closed","cancelled")')`);
    expect(dash).not.toContain('delivered","closed","cancelled');
  });
});

describe('4.37B — dashboard manual appointment gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.hasProAccess = false;
    dbMocks.proSub = null;
    dbMocks.bookingInsertError = null;
    (dbMocks.bookingInserted as unknown[]).length = 0;
    Element.prototype.scrollIntoView = vi.fn();
  });

  function renderDash() {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
  }

  it('non-Pro "Crear una cita" → paywall, dialog never opens', async () => {
    dbMocks.hasProAccess = false;
    renderDash();
    fireEvent.click(await screen.findByRole('button', { name: /crear una cita/i }));
    await waitFor(() =>
      expect(spy.capture).toHaveBeenCalledWith(
        'pro_paywall_opened',
        expect.objectContaining({ action: 'create_appointment' })
      )
    );
    expect(screen.queryByText('dash-fake-submit')).not.toBeInTheDocument();
    expect(dbMocks.bookingInserted).toHaveLength(0);
  });

  it('active Pro → dialog opens and create succeeds', async () => {
    dbMocks.hasProAccess = true;
    renderDash();
    fireEvent.click(await screen.findByRole('button', { name: /crear una cita/i }));
    fireEvent.click(await screen.findByText('dash-fake-submit'));
    await waitFor(() => expect(dbMocks.bookingInserted).toHaveLength(1));
    const row = (dbMocks.bookingInserted as Record<string, unknown>[])[0];
    expect(row).toMatchObject({ source: 'LAWYER_DIRECT', booking_type: 'appointment' });
  });

  it('stale denial confirmed expired → paywall', async () => {
    dbMocks.hasProAccess = true;
    dbMocks.bookingInsertError = {
      code: '42501',
      message: 'new row violates row-level security policy for table "bookings"',
    };
    dbMocks.proSub = { status: 'expired', current_period_end: new Date(Date.now() - 1000).toISOString() };
    renderDash();
    fireEvent.click(await screen.findByRole('button', { name: /crear una cita/i }));
    fireEvent.click(await screen.findByText('dash-fake-submit'));
    await waitFor(() =>
      expect(spy.capture).toHaveBeenCalledWith(
        'pro_paywall_opened',
        expect.objectContaining({ action: 'create_appointment', reason: 'entitlement_rejected' })
      )
    );
  });

  it('unknown error → generic toast, no paywall', async () => {
    dbMocks.hasProAccess = true;
    dbMocks.bookingInsertError = new Error('boom');
    renderDash();
    fireEvent.click(await screen.findByRole('button', { name: /crear una cita/i }));
    fireEvent.click(await screen.findByText('dash-fake-submit'));
    await waitFor(() =>
      expect(spy.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error' }))
    );
    expect(spy.capture).not.toHaveBeenCalledWith(
      'pro_paywall_opened',
      expect.objectContaining({ reason: 'entitlement_rejected' })
    );
  });
});
