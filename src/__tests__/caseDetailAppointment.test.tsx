import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 4.37D — Case Detail "Nueva cita para este caso" Pro gate.
// Root cause (4.37B gap): the button navigates to /lawyer/citas?caseId=
// without reading entitlement, and the preselected effect opened the form.
// Both points are now gated on hasProAccess (fail-closed while loading).

const state = vi.hoisted(() => ({
  hasProAccess: false,
  proLoading: false,
  caseData: null as Record<string, unknown> | null,
  capture: vi.fn(),
}));

vi.mock('@/hooks/useProSubscription', () => ({
  useProSubscription: () => ({
    hasProAccess: state.hasProAccess,
    isLoading: state.proLoading,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hooks/useLawyerCases', () => ({
  useLawyerCase: () => ({ caseData: state.caseData, loading: false, error: null }),
  useLawyerCases: () => ({ updateCase: vi.fn(), deleteCase: vi.fn() }),
  useProvisionAIWorkspace: () => ({ provision: vi.fn() }),
}));
vi.mock('@/hooks/useLawyerClients', () => ({
  useLawyerClients: () => ({ clients: [], findOrCreateClient: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: { id: 'L1' } }),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('posthog-js', () => ({ default: { capture: state.capture } }));
vi.mock('@/hooks/useAISubscription', () => ({
  useAIFeatureAccess: () => ({ canUse: () => true, isLoading: false }),
}));
vi.mock('@/hooks/useAIDocuments', () => ({
  useAIDocuments: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/hooks/useCaseDocumentWorkspace', () => ({
  useCaseDocumentWorkspace: () => ({ workspaceId: null, ensureWorkspace: vi.fn() }),
}));
vi.mock('@/components/legalup-ai/AICaseCommandCenter', () => ({ AICaseCommandCenter: () => null }));
vi.mock('@/components/legalup-ai/AICaseIntelligence', () => ({ AICaseIntelligence: () => null }));
vi.mock('@/components/legalup-ai/AIResearchPanel', () => ({ AIResearchPanel: () => null }));
vi.mock('@/components/legalup-ai/AICaseChatDrawer', () => ({ AICaseChatDrawer: () => null }));
vi.mock('@/components/lawyer/CaseActivity', () => ({ CaseActivity: () => null, CaseActivityPreview: () => null }));
vi.mock('@/components/lawyer/CaseDocuments', () => ({ CaseDocuments: () => null }));
vi.mock('@/components/lawyer/CaseEditDialog', () => ({ CaseEditDialog: () => null }));
vi.mock('@/components/legalup-ai/CaseDescriptionCard', () => ({ CaseDescriptionCard: () => null }));
vi.mock('@/components/legalup-pro/ProPricingModal', () => ({
  ProPricingModal: ({ open, triggerAction }: { open: boolean; triggerAction?: string }) =>
    open ? <div data-testid={`paywall-${triggerAction ?? 'none'}`}>paywall</div> : null,
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'L1' } } } }) },
    from: (_table: string) => {
      const q: Record<string, unknown> = {};
      const terminal = () => Promise.resolve({ data: [], error: null });
      q.then = (resolve: unknown) => (terminal() as Promise<unknown>).then(resolve as never);
      const proxy = new Proxy(q, {
        get(t, prop) {
          if (prop === 'then') return t.then;
          if (prop === 'single') return () => Promise.resolve({ data: null, error: null });
          return () => proxy;
        },
      });
      return proxy;
    },
  },
}));

import CaseDetailPage from '@/pages/lawyer/CaseDetailPage';

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}{loc.search}</div>;
}

function renderDetail() {
  render(
    <MemoryRouter initialEntries={['/lawyer/cases/C1']}>
      <Routes>
        <Route path="/lawyer/cases/:caseId" element={<CaseDetailPage />} />
        <Route path="/lawyer/citas" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

function baseCase(over: Record<string, unknown> = {}) {
  return {
    id: 'C1',
    title: 'Caso test',
    status: 'in_progress',
    source: 'LAWYER_DIRECT',
    client_id: 'CL1',
    client: { id: 'CL1', name: 'Cliente' },
    ai_workspace_id: null,
    created_at: '2026-08-02T10:00:00.000Z',
    updated_at: '2026-08-04T10:00:00.000Z',
    ...over,
  };
}

describe('4.37D — Case Detail appointment gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.hasProAccess = false;
    state.proLoading = false;
    state.caseData = baseCase();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('A. non-Pro → paywall (create_appointment), no navigation, zero mutations', async () => {
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: /nueva cita para este caso/i }));
    expect(state.capture).toHaveBeenCalledWith(
      'pro_paywall_opened',
      expect.objectContaining({ action: 'create_appointment' })
    );
    expect(state.capture.mock.calls.filter(([e]) => e === 'pro_paywall_opened')).toHaveLength(1);
    expect(await screen.findByTestId('paywall-create_appointment')).toBeInTheDocument();
    // Still on the case page: no navigation happened.
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Caso test');
  });

  it('B. active Pro → navigates to /lawyer/citas?caseId= with context', async () => {
    state.hasProAccess = true;
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: /nueva cita para este caso/i }));
    expect(await screen.findByTestId('location')).toHaveTextContent('/lawyer/citas?caseId=C1');
    expect(state.capture).not.toHaveBeenCalledWith(
      'pro_paywall_opened',
      expect.objectContaining({ action: 'create_appointment' })
    );
  });

  it('C. founder badge without active Pro → paywall (badge is not entitlement)', async () => {
    state.hasProAccess = false;
    state.caseData = baseCase();
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: /nueva cita para este caso/i }));
    expect(await screen.findByTestId('paywall-create_appointment')).toBeInTheDocument();
  });

  it('D. free first Case without Pro → paywall (case possession is not Pro)', async () => {
    state.hasProAccess = false;
    state.caseData = baseCase({ source: 'LAWYER_DIRECT', status: 'new' });
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: /nueva cita para este caso/i }));
    expect(await screen.findByTestId('paywall-create_appointment')).toBeInTheDocument();
  });

  it('E. marketplace-origin Case without Pro → paywall (appointment origin is manual)', async () => {
    state.hasProAccess = false;
    state.caseData = baseCase({ source: 'LEGALUP_MARKETPLACE' });
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: /nueva cita para este caso/i }));
    expect(await screen.findByTestId('paywall-create_appointment')).toBeInTheDocument();
  });

  it('F. marketplace-origin Case with Pro → navigates (form decides source)', async () => {
    state.hasProAccess = true;
    state.caseData = baseCase({ source: 'LEGALUP_MARKETPLACE' });
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: /nueva cita para este caso/i }));
    expect(await screen.findByTestId('location')).toHaveTextContent('/lawyer/citas?caseId=C1');
  });

  it('closed Case + Pro → still navigates (lifecycle preserved)', async () => {
    state.hasProAccess = true;
    state.caseData = baseCase({ status: 'closed' });
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: /nueva cita para este caso/i }));
    expect(await screen.findByTestId('location')).toHaveTextContent('/lawyer/citas?caseId=C1');
  });

  it('closed Case without Pro → paywall', async () => {
    state.hasProAccess = false;
    state.caseData = baseCase({ status: 'closed' });
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: /nueva cita para este caso/i }));
    expect(await screen.findByTestId('paywall-create_appointment')).toBeInTheDocument();
  });

  it('Pro without client → prerequisite toast, no navigation, no paywall', async () => {
    state.hasProAccess = true;
    state.caseData = baseCase({ client_id: null, client: null });
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: /nueva cita para este caso/i }));
    await waitFor(() => expect(screen.queryByTestId('location')).not.toBeInTheDocument());
    expect(state.capture).not.toHaveBeenCalledWith('pro_paywall_opened', expect.anything());
  });

  it('non-Pro without client → paywall first (no prerequisite leak)', async () => {
    state.hasProAccess = false;
    state.caseData = baseCase({ client_id: null, client: null });
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: /nueva cita para este caso/i }));
    expect(await screen.findByTestId('paywall-create_appointment')).toBeInTheDocument();
  });
});

describe('4.37D — gate wiring regression (§17 mechanism)', () => {
  const detail = readFileSync(resolve('src/pages/lawyer/CaseDetailPage.tsx'), 'utf-8');
  const citas = readFileSync(resolve('src/pages/lawyer/CitasPage.tsx'), 'utf-8');

  it('Case Detail appointment action reads Pro authority and paywalls', () => {
    expect(detail).toContain('useProSubscription');
    expect(detail).toContain('handleNewAppointmentForCase');
    expect(detail).toContain('triggerAction="create_appointment"');
  });

  it('CitasPage deep-link auto-open is entitlement-gated (no silent form)', () => {
    expect(citas).toContain('preselectedCaseId');
    // The auto-open effect must consult the gate; raw unconditional open is gone.
    const effectIdx = citas.indexOf('preselectedCaseId, hasProAccess');
    expect(effectIdx).toBeGreaterThan(-1);
    expect(citas).not.toMatch(/if \(preselectedCaseId\) \{\s*setSelectedCaseId/);
  });
});
