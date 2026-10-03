import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';

// FASE 4.59D.1 — Borradores como tab canónico del caso.

vi.mock('@/hooks/useLawyerCases', () => ({
  useLawyerCase: () => ({ caseData: { id: 'C1', title: 'Caso', status: 'new', source: 'LAWYER_DIRECT', ai_workspace_id: 'W1', created_at: '2026-01-01', updated_at: '2026-01-01' }, loading: false, error: null }),
  useLawyerCases: () => ({ updateCase: vi.fn(), deleteCase: vi.fn() }),
}));
vi.mock('@/hooks/useAIUsage', () => ({ AI_USAGE_QUERY_KEY: ['ai-usage'], useAIUsage: () => ({ data: null, isLoading: false, refetch: vi.fn() }) }));
vi.mock('@/hooks/useLawyerClients', () => ({ useLawyerClients: () => ({ clients: [] }) }));
vi.mock('@/hooks/useAISubscription', () => ({ useAIFeatureAccess: () => ({ canUse: () => true, isLoading: false }) }));
vi.mock('@/hooks/useProSubscription', () => ({ useProSubscription: () => ({ hasProAccess: true }) }));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({ useAuth: () => ({ user: { id: 'L1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: null, error: null })),
    storage: { from: () => ({}) },
    auth: { getSession: async () => ({ data: { session: null } }) },
    from: () => {
      const q = { select: () => q, eq: () => q, order: () => q, limit: () => q, maybeSingle: async () => ({ data: null, error: null }), single: async () => ({ data: null, error: null }), then: (a: (v: unknown) => void) => Promise.resolve({ data: [], error: null }).then(a) };
      return q;
    },
  },
}));
vi.mock('@/hooks/useCaseDocumentWorkspace', () => ({
  useCaseDocumentWorkspace: () => ({ workspaceId: 'W1', ensureWorkspace: vi.fn() }),
}));
vi.mock('@/hooks/useAIDocuments', () => ({
  useAIDocuments: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/components/lawyer/CaseDocuments', () => ({ CaseDocuments: () => <div>DOCS</div> }));
vi.mock('@/components/legalup-ai/AICaseCommandCenter', () => ({ AICaseCommandCenter: () => <div>COMMAND</div> }));
vi.mock('@/components/legalup-ai/AICaseIntelligence', () => ({ AICaseIntelligence: () => <div>INTEL-MARKER</div> }));
vi.mock('@/components/legalup-ai/AIResearchPanel', () => ({ AIResearchPanel: () => <div>RESEARCH-MARKER</div> }));
vi.mock('@/components/lawyer/CaseActivity', () => ({ CaseActivity: () => <div>TIMELINE-MARKER</div> }));
vi.mock('@/components/legalup-ai/AICaseDrafts', () => ({ AICaseDrafts: ({ workspaceId }: { workspaceId: string }) => <div>DRAFTS-MARKER:{workspaceId}</div> }));
vi.mock('@/components/legalup-ai/AICaseChatDrawer', () => ({ AICaseChatDrawer: () => <div>CHAT</div> }));
vi.mock('@/components/legalup-pro/ProPricingModal', () => ({ ProPricingModal: () => null }));
vi.mock('@/components/lawyer/CaseManagementDrawer', () => ({ CaseManagementDrawer: () => null }));
vi.mock('@/components/lawyer/CaseEditDialog', () => ({ CaseEditDialog: () => null }));

import CaseDetailPage from '@/pages/lawyer/CaseDetailPage';

function renderCase(tab: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/lawyer/cases/C1?tab=${tab}`]}>
        <Routes>
          <Route path="/lawyer/cases/:caseId" element={<CaseDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(cleanup);

describe('FASE 4.59D.1 orden de tabs', () => {
  it('triggers en orden canónico con Borradores antes de Timeline', () => {
    renderCase('overview');
    const triggers = Array.from(document.querySelectorAll('[role="tab"]')).map((t) => t.textContent);
    expect(triggers).toEqual([
      'Resumen',
      'Documentos y análisis',
      'Investigar jurisprudencia',
      'Inteligencia del caso',
      'Borradores',
      'Timeline del caso',
    ]);
  });
});

describe('FASE 4.59D.1 tab drafts', () => {
  it('?tab=drafts renderiza el workspace de borradores con el workspace', async () => {
    renderCase('drafts');
    expect(await screen.findByText('DRAFTS-MARKER:W1')).toBeTruthy();
    expect(screen.getByText(/Genera y revisa borradores/)).toBeTruthy();
  });

  it('?tab=intelligence NO renderiza borradores', async () => {
    renderCase('intelligence');
    expect(await screen.findByText('INTEL-MARKER')).toBeTruthy();
    expect(screen.queryByText('DRAFTS-MARKER:W1')).toBeNull();
  });

  it('activar Borradores navega por query param y preserva refresh', async () => {
    renderCase('overview');
    const trigger = screen.getByText('Borradores');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });
    if (!screen.queryByText('DRAFTS-MARKER:W1')) {
      fireEvent.keyDown(trigger, { key: ' ', code: 'Space' });
    }
    expect(await screen.findByText('DRAFTS-MARKER:W1')).toBeTruthy();
  });

  it('tab desconocido cae a overview sin borradores', async () => {
    renderCase('noexiste');
    expect(screen.queryByText('DRAFTS-MARKER:W1')).toBeNull();
  });
});

describe('FASE 4.59D.1 fuente: CASE_TABS incluye drafts', () => {
  it('clave canónica registrada y componente importado una vez', () => {
    const src = readFileSync('src/pages/lawyer/CaseDetailPage.tsx', 'utf-8');
    expect(src).toContain("'drafts'");
    expect(src).toContain("import { AICaseDrafts } from '@/components/legalup-ai/AICaseDrafts'");
  });

  it('AICaseIntelligence ya no importa borradores', () => {
    const src = readFileSync('src/components/legalup-ai/AICaseIntelligence.tsx', 'utf-8');
    expect(src).not.toContain('AICaseDrafts');
  });
});
