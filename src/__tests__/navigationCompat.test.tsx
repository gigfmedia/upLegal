import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  shouldShowLegacyAI,
  resolveLinkedCase,
} from '@/hooks/useLegacyAICompat';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: { id: 'lawyer-1' } }),
}));
vi.mock('@/pages/lawyer/AICaseDetail', () => ({
  default: () => <div data-testid="legacy-detail">legacy</div>,
}));

import { supabase } from '@/lib/supabaseClient';
import LegacyAICaseRoute from '@/pages/lawyer/LegacyAICaseRoute';
import LegalUpAIWorkspace from '@/pages/lawyer/LegalUpAIWorkspace';

const mockedFrom = vi.mocked(supabase.from);

function mockCases(rows: { id: string }[]) {
  mockedFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
      }),
    }),
  } as unknown as ReturnType<typeof supabase.from>);
}

function renderRoute(workspaceId: string) {
  return render(
    <MemoryRouter initialEntries={[`/lawyer/ai/cases/${workspaceId}`]}>
      <Routes>
        <Route path="/lawyer/ai/cases/:caseId" element={<LegacyAICaseRoute />} />
        <Route path="/lawyer/cases/:caseId" element={<div data-testid="case-detail">case</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('4.30D navigation compatibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('policy: normal new user sees no legacy AI entry', () => {
    expect(
      shouldShowLegacyAI({ hasSubscriptionRow: false, hasUnlinkedWorkspaces: false })
    ).toBe(false);
  });

  it('policy: legacy subscription row shows compatibility entry', () => {
    expect(
      shouldShowLegacyAI({ hasSubscriptionRow: true, hasUnlinkedWorkspaces: false })
    ).toBe(true);
  });

  it('policy: unlinked workspaces show compatibility entry', () => {
    expect(
      shouldShowLegacyAI({ hasSubscriptionRow: false, hasUnlinkedWorkspaces: true })
    ).toBe(true);
  });

  it('resolveLinkedCase: exactly one owned case redirects', () => {
    expect(resolveLinkedCase(['case-1'])).toEqual({ type: 'redirect', caseId: 'case-1' });
  });

  it('resolveLinkedCase: zero matches stays legacy', () => {
    expect(resolveLinkedCase([])).toEqual({ type: 'legacy' });
  });

  it('resolveLinkedCase: multiple matches stays legacy (no arbitrary redirect)', () => {
    expect(resolveLinkedCase(['case-1', 'case-2'])).toEqual({ type: 'legacy' });
  });

  it('linked workspace old URL resolves to canonical case route', async () => {
    mockCases([{ id: 'case-9' }]);
    renderRoute('ws-9');
    await waitFor(() => expect(screen.getByTestId('case-detail')).toBeInTheDocument());
    expect(screen.queryByTestId('legacy-detail')).not.toBeInTheDocument();
  });

  it('unlinked workspace renders legacy detail', async () => {
    mockCases([]);
    renderRoute('ws-orphan');
    await waitFor(() => expect(screen.getByTestId('legacy-detail')).toBeInTheDocument());
  });

  it('cross-lawyer workspace never redirects (owner-scoped query returns nothing)', async () => {
    // The route always filters by the authenticated lawyer; a foreign
    // workspace yields zero rows → legacy detail (which itself denies).
    mockCases([]);
    renderRoute('ws-foreign');
    await waitFor(() => expect(screen.getByTestId('legacy-detail')).toBeInTheDocument());
    expect(mockedFrom).toHaveBeenCalledWith('lawyer_cases');
  });

  it('ambiguous reverse mapping falls back to legacy detail', async () => {
    mockCases([{ id: 'case-a' }, { id: 'case-b' }]);
    renderRoute('ws-ambiguous');
    await waitFor(() => expect(screen.getByTestId('legacy-detail')).toBeInTheDocument());
  });
});

vi.mock('@/hooks/useAIWorkspaces', () => ({
  useAIWorkspaces: () => (globalThis as Record<string, unknown>).__aiWs ?? { data: [], isLoading: false, isError: false, refetch: vi.fn() },
  useDeleteAIWorkspace: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/useLawyerCases', () => ({
  useLawyerCases: () => (globalThis as Record<string, unknown>).__proCases ?? { cases: [], loading: false },
}));
vi.mock('@/hooks/useAISubscription', () => ({
  useAISubscription: () => ({ hasAccess: false, subscription: null }),
}));
vi.mock('@/components/legalup-ai/EditCaseModal', () => ({ EditCaseModal: () => null }));
vi.mock('@/components/legalup-ai/AISubscriptionBanner', () => ({ AISubscriptionBanner: () => null }));
vi.mock('@/components/legalup-ai/AIPricingModal', () => ({ AIPricingModal: () => null }));
vi.mock('@/components/legalup-ai/AIUsageMeter', () => ({ AIUsageMeter: () => null }));
vi.mock('@/components/legalup-ai/AICaseTimelinePreview', () => ({ AICaseTimelinePreview: () => null }));
vi.mock('@/components/ui/confirm-dialog', () => ({ ConfirmDialog: () => null }));

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const G = globalThis as Record<string, unknown>;

function renderIndex() {
  return render(
    <MemoryRouter initialEntries={['/lawyer/ai']}>
      <Routes>
        <Route path="/lawyer/ai" element={<LegalUpAIWorkspace />} />
        <Route path="/lawyer/cases" element={<div data-testid="cases-list">cases</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('4.34H standalone shell retirement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete G.__aiWs;
    delete G.__proCases;
  });

  it('sidebar: no standalone entry without orphan data; narrow compat entry with orphans', () => {
    const c = read('src/components/dashboard/DashboardLayout.tsx');
    expect(c).toContain('hasUnlinkedWorkspaces');
    expect(c).toContain('Historial IA');
    expect(c).not.toContain("label: 'LegalUp'");
    expect(c).not.toContain('showLegacyAI');
  });

  it('/lawyer/ai with zero workspaces redirects to canonical Cases', async () => {
    G.__aiWs = { data: [], isLoading: false, isError: false, refetch: vi.fn() };
    G.__proCases = { cases: [], loading: false };
    renderIndex();
    await waitFor(() => expect(screen.getByTestId('cases-list')).toBeInTheDocument());
  });

  it('/lawyer/ai with only linked workspaces redirects to canonical Cases', async () => {
    G.__aiWs = { data: [{ id: 'ws-1', name: 'W' }], isLoading: false, isError: false, refetch: vi.fn() };
    G.__proCases = { cases: [{ id: 'case-1', ai_workspace_id: 'ws-1' }], loading: false };
    renderIndex();
    await waitFor(() => expect(screen.getByTestId('cases-list')).toBeInTheDocument());
  });

  it('/lawyer/ai with orphan workspace keeps compatibility listing', async () => {
    G.__aiWs = { data: [{ id: 'ws-orphan', name: 'W' }], isLoading: false, isError: false, refetch: vi.fn() };
    G.__proCases = { cases: [], loading: false };
    renderIndex();
    await waitFor(() => expect(screen.getByText('Casos anteriores')).toBeInTheDocument());
    expect(screen.queryByTestId('cases-list')).not.toBeInTheDocument();
  });

  it('no standalone creation UI on the index route', () => {
    const c = read('src/pages/lawyer/LegalUpAIWorkspace.tsx');
    expect(c).not.toContain('NewCaseModal');
    expect(c).not.toContain('useCreateAIWorkspace');
  });

  it('public /ai still routes CTA toward /pro with attribution', () => {
    const c = read('src/pages/LegalUpAI.tsx');
    expect(c).toContain("navigate(`/pro${attribution.size");
  });

  it('4.34K canonical Case exposes direct capability tabs (no generic IA bucket)', () => {
    const c = read('src/pages/lawyer/CaseDetailPage.tsx');
    expect(c).toContain("value=\"intelligence\"");
    expect(c).toContain("value=\"research\"");
    expect(c).toContain('AICaseIntelligence');
    expect(c).toContain('AIResearchPanel');
    expect(c).toContain('AICaseChatDrawer');
    expect(c).not.toContain('AICaseWorkspaceContent');
  });

  it('notification ai_document links preserved via compatibility route', () => {
    const c = read('src/lib/notifications/notificationTypes.ts');
    expect(c).toContain('/lawyer/ai/cases/${caseId}');
  });
});
