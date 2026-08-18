import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AICaseDetail from '@/pages/lawyer/AICaseDetail';

// ---------------------------------------------------------------------------
// Fase 4.2.16 · Parte B — los lock cards del caso de LegalUp AI NO deben
// renderizarse mientras la suscripción carga (antes se mostraban de inmediato
// porque hasAccess parte en false). Esta regresión se protege aquí:
//   - loading  -> esqueleto, NO lock card
//   - acceso   -> chat + research renderizan
//   - sin acceso -> lock cards correctas
// ---------------------------------------------------------------------------

type AccessMock = {
  hasAccess: boolean;
  isLoading: boolean;
  canUse: (feature: string) => boolean;
};

const { accessMock, setAccess } = vi.hoisted(() => {
  const state: AccessMock = {
    hasAccess: false,
    isLoading: false,
    canUse: () => false,
  };
  return {
    accessMock: state,
    setAccess: (patch: Partial<AccessMock>) => Object.assign(state, patch),
  };
});

vi.mock('posthog-js', () => ({ default: { capture: vi.fn(), init: vi.fn() } }));

vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: { id: 'lawyer-1' } }),
}));

vi.mock('@/hooks/useAIWorkspaces', () => ({
  useAIWorkspace: () => ({
    data: {
      id: 'ws-1',
      name: 'Caso de prueba',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      description: null,
      practice_area: 'Civil',
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAIDocuments', () => ({
  useAIDocuments: () => ({ data: [], isLoading: false, isError: false, error: null }),
  useAIDocumentAnalysis: () => ({ data: null }),
  useProcessAIDocument: () => ({ isPending: false, mutate: vi.fn() }),
  useAnalyzeAIDocument: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock('@/hooks/useAICaseTimeline', () => ({
  useAICaseTimeline: () => ({ data: [] }),
  syncAICaseTimelineEvents: vi.fn().mockResolvedValue(undefined),
  AI_TIMELINE_QUERY_KEY: ['ai-case-timeline'],
}));

vi.mock('@/hooks/useAISubscription', () => ({
  useAIFeatureAccess: () => accessMock,
}));

vi.mock('@/components/legalup-ai/AIChat', () => ({
  AIChat: () => <div data-testid="chat-panel">Chat del caso</div>,
}));

vi.mock('@/components/legalup-ai/AIResearchPanel', () => ({
  AIResearchPanel: () => <div data-testid="research-panel">Investigar jurisprudencia</div>,
}));

vi.mock('@/components/legalup-ai/AIPricingModal', () => ({
  AIPricingModal: () => null,
}));

vi.mock('@/components/legalup-ai/AIDocumentUpload', () => ({
  AIDocumentUpload: () => <div data-testid="doc-upload" />,
}));

vi.mock('@/components/legalup-ai/AIDocumentList', () => ({
  AIDocumentList: () => <div data-testid="doc-list" />,
}));

vi.mock('@/components/legalup-ai/AIAnalysisView', () => ({
  AIAnalysisView: () => <div data-testid="analysis-view" />,
}));

vi.mock('@/components/legalup-ai/AICaseTimeline', () => ({
  AICaseTimeline: () => <div data-testid="timeline" />,
}));

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/lawyer/ai/cases/ws-1']}>
        <Routes>
          <Route path="/lawyer/ai/cases/:caseId" element={<AICaseDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AICaseDetail — gating por suscripción (Fase 4.2.16)', () => {
  beforeEach(() => {
    setAccess({ hasAccess: false, isLoading: false, canUse: () => false });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loading de la suscripción: NO muestra lock cards prematuramente (solo esqueleto)', () => {
    setAccess({ hasAccess: false, isLoading: true, canUse: () => false });
    renderDetail();

    expect(screen.getAllByText(/Cargando tu acceso a LegalUp AI/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Análisis de documentos no disponible')).toBeNull();
    expect(screen.queryByText('Investigación de jurisprudencia no disponible')).toBeNull();
    expect(screen.queryByTestId('chat-panel')).toBeNull();
  });

  it('suscripción activa (essential): el chat y la investigación renderizan', () => {
    setAccess({ hasAccess: true, isLoading: false, canUse: () => true });
    renderDetail();

    expect(screen.getByTestId('chat-panel')).toBeTruthy();
    expect(screen.getByTestId('research-panel')).toBeTruthy();
    expect(screen.queryByText('Análisis de documentos no disponible')).toBeNull();
    expect(screen.queryByText('Investigación de jurisprudencia no disponible')).toBeNull();
  });

  it('sin suscripción: ambas features quedan correctamente bloqueadas', () => {
    renderDetail();

    expect(screen.getByText('Análisis de documentos no disponible')).toBeTruthy();
    expect(screen.getByText('Investigación de jurisprudencia no disponible')).toBeTruthy();
    expect(screen.queryByTestId('chat-panel')).toBeNull();
    expect(screen.queryByTestId('research-panel')).toBeNull();
    // La lock card ofrece el pricing para destrabar el acceso.
    expect(screen.getAllByText('Ver planes').length).toBeGreaterThan(0);
  });
});
