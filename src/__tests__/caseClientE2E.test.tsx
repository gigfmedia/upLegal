import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Boundary mocks only: auth + supabase client. useLawyerClients is REAL.
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: { id: 'lawyer-7edb1767' } }),
}));

const sbMocks = {
  session: true,
  rows: [
    { id: 'client-a', lawyer_id: 'lawyer-7edb1767', name: 'Client A', email: 'a@test.invalid' },
    { id: 'client-b', lawyer_id: 'lawyer-7edb1767', name: 'Client B', email: null },
  ] as unknown[],
};

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: sbMocks.session ? { user: { id: 'lawyer-7edb1767' } } : null } }),
    },
    from: (table: string) => {
      if (table !== 'lawyer_clients') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: sbMocks.rows, error: null }),
          }),
        }),
      };
    },
  },
}));

vi.mock('@/lib/normalizeEmail', () => ({
  normalizeEmail: (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
}));
vi.mock('@/lib/activationAnalytics', () => ({
  trackFirstClientIfNeeded: vi.fn(),
  trackFirstCaseIfNeeded: vi.fn(),
}));

// CasesPage collaborators mocked; CasesPage + useLawyerClients are REAL.
const createCase = vi.fn().mockResolvedValue({ id: 'new-case' });
vi.mock('@/hooks/useLawyerCases', () => ({
  useLawyerCases: () => ({ cases: [], loading: false, error: null, createCase }),
}));
vi.mock('@/hooks/useProSubscription', () => ({
  useProSubscription: () => ({ hasProAccess: false }),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/components/legalup-pro/ProPricingModal', () => ({
  ProPricingModal: () => null,
}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import CasesPage from '@/pages/lawyer/CasesPage';

describe('4.31C.2 — E2E: real CasesPage + real useLawyerClients, Supabase boundary mocked', () => {
  beforeEach(() => {
    sbMocks.session = true;
    createCase.mockClear();
  });

  it('authenticated query returns two rows → dropdown renders Sin cliente + Client A + Client B', async () => {
    render(
      <MemoryRouter>
        <CasesPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getAllByRole('button', { name: /nuevo caso/i })[0]);
    fireEvent.click(await screen.findByRole('combobox'));
    await waitFor(() => expect(screen.getByRole('option', { name: 'Sin cliente' })).toBeInTheDocument());
    expect(screen.getByRole('option', { name: /Client A/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Client B/ })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('select Client B → submit persists client_id', async () => {
    render(
      <MemoryRouter>
        <CasesPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getAllByRole('button', { name: /nuevo caso/i })[0]);
    fireEvent.click(await screen.findByRole('combobox'));
    await waitFor(() => expect(screen.getByRole('option', { name: 'Sin cliente' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('option', { name: /Client B/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('option', { name: /Client B/ }));
    fireEvent.change(screen.getByPlaceholderText(/Divorcio Juan Pérez/i), { target: { value: 'Caso e2e' } });
    fireEvent.click(screen.getByRole('button', { name: /^crear$/i }));
    await waitFor(() => expect(createCase).toHaveBeenCalled());
    expect(createCase).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'client-b' }));
  });

  it('missing session → explicit error, not silent empty', async () => {
    sbMocks.session = false;
    render(
      <MemoryRouter>
        <CasesPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getAllByRole('button', { name: /nuevo caso/i })[0]);
    await waitFor(() =>
      expect(screen.getByText(/No se pudieron cargar los clientes/i)).toBeInTheDocument()
    );
  });
});
