import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CasesPage from '@/pages/lawyer/CasesPage';
import posthog from 'posthog-js';

vi.mock('@/hooks/useCaseEntitlement', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useCaseEntitlement')>();
  return { ...actual, useCaseEntitlement: vi.fn() };
});
vi.mock('@/hooks/useLawyerCases');
vi.mock('@/hooks/useLawyerClients');
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({ useAuth: () => ({ user: { id: 'lawyer-1' } }) }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/components/legalup-pro/ProPricingModal', () => ({
  ProPricingModal: ({ open }: { open: boolean }) => (open ? <div data-testid="pro-modal" /> : null),
}));
vi.mock('@/components/legalup-pro/ActiveCapacityModal', () => ({
  ActiveCapacityModal: ({ open }: { open: boolean }) => (open ? <div data-testid="capacity-modal" /> : null),
}));
vi.mock('@/components/legalup-ai/SharedCaseCard', () => ({
  SharedCaseCard: ({ title }: { title: string }) => <div data-testid="case-row">{title}</div>,
}));
vi.mock('@/components/lawyer/CaseEditDialog', () => ({
  CaseEditDialog: () => null,
}));

import { useCaseEntitlement } from '@/hooks/useCaseEntitlement';
import { useLawyerCases } from '@/hooks/useLawyerCases';
import { useLawyerClients } from '@/hooks/useLawyerClients';
import { normalize } from '@/hooks/useCaseEntitlement';

const mockedEntitlement = vi.mocked(useCaseEntitlement);
const mockedCases = vi.mocked(useLawyerCases);
const mockedClients = vi.mocked(useLawyerClients);

const PRODUCTION_ENTITLEMENT = {
  hasProAccess: false,
  activeCaseCount: 0,
  activeCaseLimit: 20,
  freeCaseConsumed: false,
  canCreateDirectCase: true,
};

function setup(entitlement: Record<string, unknown>, cases: unknown[] = []) {
  mockedEntitlement.mockReturnValue({
    entitlement: {
      hasProAccess: false,
      activeCaseCount: 0,
      activeCaseLimit: 0,
      freeCaseConsumed: true,
      canCreateDirectCase: false,
      ...entitlement,
    },
    loading: false,
    error: false,
    refetch: vi.fn(async () => ({})),
    canCreateDirectCase: !!entitlement.canCreateDirectCase,
    freeCaseConsumed: entitlement.freeCaseConsumed !== false,
    hasProAccess: !!entitlement.hasProAccess,
  } as never);
  mockedCases.mockReturnValue({
    cases,
    loading: false,
    error: null,
    refetch: vi.fn(),
    createCase: vi.fn(),
    updateCase: vi.fn(),
    deleteCase: vi.fn(),
  } as never);
  mockedClients.mockReturnValue({
    clients: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as never);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <CasesPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('4.43C CasesPage wired tree (production regression)', () => {
  it('A. 0 casos + fixture prod: empty-state abre formulario, modal 0', async () => {
    setup({ ...PRODUCTION_ENTITLEMENT });
    fireEvent.click(screen.getByRole('button', { name: /crear mi primer caso/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/divorcio juan pérez/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('pro-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('capacity-modal')).not.toBeInTheDocument();
  });

  it('B. 0 casos + denegado: paywall, sin formulario', async () => {
    setup({ has_pro_access: false, freeCaseConsumed: true, canCreateDirectCase: false });
    fireEvent.click(screen.getByRole('button', { name: /crear mi primer caso/i }));
    await waitFor(() => {
      expect(screen.getByTestId('pro-modal')).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText(/divorcio juan pérez/i)).not.toBeInTheDocument();
  });

  it('C. con casos + permitido: CTA superior abre formulario', async () => {
    setup({ ...PRODUCTION_ENTITLEMENT }, [
      { id: 'c1', title: 'Caso existente', status: 'in_progress', practice_area: null, description: null, created_at: '', updated_at: '', ai_workspace_id: null },
    ]);
    fireEvent.click(screen.getByRole('button', { name: /^nuevo caso$/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/divorcio juan pérez/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('pro-modal')).not.toBeInTheDocument();
  });

  it('D. loading: sin modal ni formulario prematuro', async () => {
    mockedEntitlement.mockReturnValue({
      entitlement: { ...PRODUCTION_ENTITLEMENT, canCreateDirectCase: false },
      loading: true,
      error: false,
      refetch: vi.fn(),
      canCreateDirectCase: false,
      freeCaseConsumed: false,
      hasProAccess: false,
    } as never);
    mockedCases.mockReturnValue({ cases: [], loading: true, error: null, refetch: vi.fn() } as never);
    mockedClients.mockReturnValue({ clients: [], loading: false, error: null, refetch: vi.fn() } as never);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <CasesPage />
        </QueryClientProvider>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('pro-modal')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/divorcio juan pérez/i)).not.toBeInTheDocument();
  });

  it('E. error de lectura: toast + refetch, sin modal', async () => {
    const refetch = vi.fn(async () => ({}));
    mockedEntitlement.mockReturnValue({
      entitlement: { ...PRODUCTION_ENTITLEMENT, canCreateDirectCase: false },
      loading: false,
      error: true,
      refetch,
      canCreateDirectCase: false,
      freeCaseConsumed: false,
      hasProAccess: false,
    } as never);
    mockedCases.mockReturnValue({ cases: [], loading: false, error: null, refetch: vi.fn() } as never);
    mockedClients.mockReturnValue({ clients: [], loading: false, error: null, refetch: vi.fn() } as never);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <CasesPage />
        </QueryClientProvider>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /crear mi primer caso/i }));
    await waitFor(() => {
      expect(refetch).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('pro-modal')).not.toBeInTheDocument();
  });

  it('F. Pro en 20/20: capacity UX, jamás price modal', async () => {
    setup({ hasProAccess: true, activeCaseCount: 20, activeCaseLimit: 20, freeCaseConsumed: true, canCreateDirectCase: false }, [
      { id: 'c1', title: 'Caso existente', status: 'in_progress', practice_area: null, description: null, created_at: '', updated_at: '', ai_workspace_id: null },
    ]);
    fireEvent.click(screen.getByRole('button', { name: /^nuevo caso$/i }));
    await waitFor(() => {
      expect(screen.getByTestId('capacity-modal')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('pro-modal')).not.toBeInTheDocument();
  });

  it('G. cambio de usuario: estado fresco decide (sin caché cruzada)', async () => {
    const view = setup({ has_pro_access: false, freeCaseConsumed: true, canCreateDirectCase: false });
    fireEvent.click(screen.getByRole('button', { name: /crear mi primer caso/i }));
    await waitFor(() => {
      expect(screen.getByTestId('pro-modal')).toBeInTheDocument();
    });
    view.unmount();
    setup({ ...PRODUCTION_ENTITLEMENT });
    fireEvent.click(screen.getByRole('button', { name: /crear mi primer caso/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/divorcio juan pérez/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('pro-modal')).not.toBeInTheDocument();
  });
});

describe('4.43D normalize mapea snake_case del RPC (causa raíz prod)', () => {
  // Payload EXACTO observado en red de producción (claves snake_case).
  const PROD_RPC_PAYLOAD = {
    has_pro_access: false,
    active_case_count: 0,
    active_case_limit: 20,
    free_case_consumed: false,
    can_create_direct_case: true,
  };

  it('payload snake_case de producción mapea a canCreate=true', () => {
    const out = normalize(PROD_RPC_PAYLOAD);
    expect(out).toEqual({
      hasProAccess: false,
      freeCaseConsumed: false,
      activeCaseCount: 0,
      activeCaseLimit: 20,
      canCreateDirectCase: true,
    });
  });

  it('payload camelCase legacy sigue funcionando', () => {
    const out = normalize({
      hasProAccess: true,
      freeCaseConsumed: false,
      activeCaseCount: 5,
      activeCaseLimit: 20,
      canCreateDirectCase: true,
    });
    expect(out.canCreateDirectCase).toBe(true);
    expect(out.hasProAccess).toBe(true);
    expect(out.activeCaseLimit).toBe(20);
  });

  it('payload ausente/malformado cae en fail-closed (sin autorizar)', () => {
    for (const bad of [null, undefined, {}, { has_pro_access: 'yes' }]) {
      const out = normalize(bad);
      expect(out.canCreateDirectCase).toBe(false);
      expect(out.hasProAccess).toBe(false);
    }
    // freeCaseConsumed fail-closed: ausente !== false → true.
    expect(normalize({}).freeCaseConsumed).toBe(true);
    expect(normalize(null).activeCaseLimit).toBe(0);
  });

  it('snake_case tiene prioridad y Pro mapea completo', () => {
    const out = normalize({
      has_pro_access: true,
      active_case_count: 19,
      active_case_limit: 20,
      free_case_consumed: true,
      can_create_direct_case: true,
    });
    expect(out).toEqual({
      hasProAccess: true,
      freeCaseConsumed: true,
      activeCaseCount: 19,
      activeCaseLimit: 20,
      canCreateDirectCase: true,
    });
  });
});
