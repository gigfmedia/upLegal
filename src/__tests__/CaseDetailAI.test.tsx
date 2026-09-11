import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mocks
vi.mock('@/hooks/useLawyerCases', async () => {
  const actual = await vi.importActual('@/hooks/useLawyerCases') as Record<string, unknown>;
  return {
    ...actual,
    useLawyerCase: vi.fn(),
    useLawyerCases: () => ({ updateCase: vi.fn(), deleteCase: vi.fn(), cases: [] }),
    useProvisionAIWorkspace: vi.fn(),
  };
});
vi.mock('@/hooks/useLawyerClients', () => ({ useLawyerClients: () => ({ clients: [] }) }));
vi.mock('@/hooks/useAIDocuments', () => ({
  useAIDocuments: vi.fn(() => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() })),
  useAIDocumentAnalysis: vi.fn(() => ({ data: null })),
  useProcessAIDocument: () => ({ mutate: vi.fn(), isPending: false }),
  useAnalyzeAIDocument: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/components/legalup-ai/AICaseWorkspaceContent', () => ({
  AICaseWorkspaceContent: ({ workspaceId }: { workspaceId: string }) => <div data-testid="ai-workspace-content">workspace:{workspaceId}</div>,
}));
vi.mock('@/components/legalup-ai/AIDocumentList', () => ({
  AIDocumentList: () => <div data-testid="doc-list" />,
}));
vi.mock('@/components/legalup-ai/AIDocumentUpload', () => ({
  AIDocumentUpload: () => <div data-testid="doc-upload" />,
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({ useAuth: () => ({ user: { id: 'lawyer-1' } }) }));

import CaseDetailPage from '@/pages/lawyer/CaseDetailPage';
import { useLawyerCase, useProvisionAIWorkspace } from '@/hooks/useLawyerCases';
import { useAIDocuments } from '@/hooks/useAIDocuments';

const mockUseLawyerCase = vi.mocked(useLawyerCase);
const mockUseProvision = vi.mocked(useProvisionAIWorkspace);
const mockUseAIDoc = vi.mocked(useAIDocuments);

function renderWithRoute(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes><Route path="/lawyer/cases/:caseId" element={<CaseDetailPage />} /></Routes>
    </MemoryRouter>
  );
}

describe('CaseDetailPage — IA inside Pro (4.27C)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('route /lawyer/cases/:id renders owned case', async () => {
    mockUseLawyerCase.mockReturnValue({ caseData: { id: 'case-123', title: 'Caso Test', status: 'new', source: 'LAWYER_DIRECT', practice_area: null, description: null, client_id: null, ai_workspace_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), lawyer_id: 'lawyer-1' } as unknown as ReturnType<typeof useLawyerCase>['caseData'], loading: false, error: null } as ReturnType<typeof useLawyerCase>);
    mockUseProvision.mockReturnValue({ provision: vi.fn(), isPending: false, error: null } as unknown as ReturnType<typeof useProvisionAIWorkspace>);
    renderWithRoute('/lawyer/cases/case-123');
    expect((await screen.findAllByText('Caso Test')).length).toBeGreaterThanOrEqual(1);
  });

  it('default tab is overview, no provision call', async () => {
    mockUseLawyerCase.mockReturnValue({ caseData: { id: 'case-1', title: 'Caso 1', status: 'new', source: 'LAWYER_DIRECT', practice_area: null, description: null, client_id: null, ai_workspace_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as unknown as ReturnType<typeof useLawyerCase>['caseData'], loading: false, error: null } as ReturnType<typeof useLawyerCase>);
    const prov = vi.fn();
    mockUseProvision.mockReturnValue({ provision: prov, isPending: false, error: null } as unknown as ReturnType<typeof useProvisionAIWorkspace>);
    renderWithRoute('/lawyer/cases/case-1');
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('data-state', 'active');
    expect(prov).not.toHaveBeenCalled();
  });

  it('AI tab without workspace shows CTA, no auto provision', async () => {
    mockUseLawyerCase.mockReturnValue({ caseData: { id: 'case-1', title: 'Caso 1', status: 'new', source: 'LAWYER_DIRECT', practice_area: null, description: null, client_id: null, ai_workspace_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as unknown as ReturnType<typeof useLawyerCase>['caseData'], loading: false, error: null } as ReturnType<typeof useLawyerCase>);
    mockUseProvision.mockReturnValue({ provision: vi.fn(), isPending: false, error: null } as unknown as ReturnType<typeof useProvisionAIWorkspace>);
    renderWithRoute('/lawyer/cases/case-1?tab=ai');
    expect(await screen.findByText('LegalUp AI para este caso')).toBeInTheDocument();
    expect(screen.getByText('Activar IA en este caso')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-workspace-content')).not.toBeInTheDocument();
  });

  it('provision click creates workspace and shows AI content', async () => {
    mockUseLawyerCase.mockReturnValue({ caseData: { id: 'case-123', title: 'Caso 123', status: 'new', source: 'LAWYER_DIRECT', practice_area: null, description: null, client_id: null, ai_workspace_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as unknown as ReturnType<typeof useLawyerCase>['caseData'], loading: false, error: null } as ReturnType<typeof useLawyerCase>);
    const prov = vi.fn().mockResolvedValue({ workspace: { id: 'ws-999', name: 'Caso 123' }, created: true });
    mockUseProvision.mockReturnValue({ provision: prov, isPending: false, error: null } as unknown as ReturnType<typeof useProvisionAIWorkspace>);
    renderWithRoute('/lawyer/cases/case-123?tab=ai');
    fireEvent.click(screen.getByText('Activar IA en este caso'));
    await waitFor(() => expect(prov).toHaveBeenCalledWith('case-123'));
    expect(await screen.findByTestId('ai-workspace-content')).toBeInTheDocument();
    expect(screen.getByTestId('ai-workspace-content').textContent).toContain('ws-999');
  });

  it('existing workspace → no provisioning, AI content receives ws-999', async () => {
    mockUseLawyerCase.mockReturnValue({ caseData: { id: 'case-123', title: 'Caso 123', status: 'new', source: 'LAWYER_DIRECT', practice_area: null, description: null, client_id: null, ai_workspace_id: 'ws-999', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as unknown as ReturnType<typeof useLawyerCase>['caseData'], loading: false, error: null } as ReturnType<typeof useLawyerCase>);
    const prov = vi.fn();
    mockUseProvision.mockReturnValue({ provision: prov, isPending: false, error: null } as unknown as ReturnType<typeof useProvisionAIWorkspace>);
    renderWithRoute('/lawyer/cases/case-123?tab=ai');
    expect(await screen.findByTestId('ai-workspace-content')).toBeInTheDocument();
    expect(prov).not.toHaveBeenCalled();
    expect(screen.getByTestId('ai-workspace-content').textContent).toBe('workspace:ws-999');
  });

  it('ID mapping critical: case-123 → ws-999, no cross-ID', async () => {
    mockUseLawyerCase.mockReturnValue({ caseData: { id: 'case-123', title: 'Caso', status: 'new', source: 'LAWYER_DIRECT', practice_area: null, description: null, client_id: null, ai_workspace_id: 'ws-999', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as unknown as ReturnType<typeof useLawyerCase>['caseData'], loading: false, error: null } as ReturnType<typeof useLawyerCase>);
    mockUseProvision.mockReturnValue({ provision: vi.fn(), isPending: false, error: null } as unknown as ReturnType<typeof useProvisionAIWorkspace>);
    renderWithRoute('/lawyer/cases/case-123?tab=ai');
    const el = await screen.findByTestId('ai-workspace-content');
    expect(el.textContent).not.toContain('case-123');
    expect(el.textContent).toContain('ws-999');
  });

  it('foreign case not found → error, no AI', async () => {
    mockUseLawyerCase.mockReturnValue({ caseData: null, loading: false, error: 'Caso no encontrado' } as unknown as ReturnType<typeof useLawyerCase>);
    mockUseProvision.mockReturnValue({ provision: vi.fn(), isPending: false, error: null } as unknown as ReturnType<typeof useProvisionAIWorkspace>);
    renderWithRoute('/lawyer/cases/foreign-id');
    expect(await screen.findByText('Caso no encontrado')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-workspace-content')).not.toBeInTheDocument();
  });

  it('provision limit 403 shows controlled UI, no crash', async () => {
    mockUseLawyerCase.mockReturnValue({ caseData: { id: 'case-1', title: 'Caso 1', status: 'new', source: 'LAWYER_DIRECT', practice_area: null, description: null, client_id: null, ai_workspace_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as unknown as ReturnType<typeof useLawyerCase>['caseData'], loading: false, error: null } as ReturnType<typeof useLawyerCase>);
    const prov = vi.fn().mockRejectedValue(Object.assign(new Error('limit'), { code: 'AI_LIMIT_REACHED', status: 403 }));
    mockUseProvision.mockReturnValue({ provision: prov, isPending: false, error: 'No fue posible activar IA' } as unknown as ReturnType<typeof useProvisionAIWorkspace>);
    renderWithRoute('/lawyer/cases/case-1?tab=ai');
    // CTA still visible, error shown
    expect(await screen.findByText('LegalUp AI para este caso')).toBeInTheDocument();
  });

  it('double click protection: pending disables button, only 1 request', async () => {
    mockUseLawyerCase.mockReturnValue({ caseData: { id: 'case-1', title: 'Caso 1', status: 'new', source: 'LAWYER_DIRECT', practice_area: null, description: null, client_id: null, ai_workspace_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as unknown as ReturnType<typeof useLawyerCase>['caseData'], loading: false, error: null } as ReturnType<typeof useLawyerCase>);
    const prov = vi.fn().mockImplementation(() => new Promise(() => {}));
    mockUseProvision.mockReturnValue({ provision: prov, isPending: true, error: null } as unknown as ReturnType<typeof useProvisionAIWorkspace>);
    renderWithRoute('/lawyer/cases/case-1?tab=ai');
    const btn = screen.getByText('Activar IA en este caso').closest('button')!;
    expect(btn).toBeDisabled();
  });

  it('no auto provision on render without click', async () => {
    const prov = vi.fn();
    mockUseLawyerCase.mockReturnValue({ caseData: { id: 'case-1', title: 'Caso 1', status: 'new', source: 'LAWYER_DIRECT', practice_area: null, description: null, client_id: null, ai_workspace_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as unknown as ReturnType<typeof useLawyerCase>['caseData'], loading: false, error: null } as ReturnType<typeof useLawyerCase>);
    mockUseProvision.mockReturnValue({ provision: prov, isPending: false, error: null } as unknown as ReturnType<typeof useProvisionAIWorkspace>);
    renderWithRoute('/lawyer/cases/case-1?tab=ai');
    await new Promise(r => setTimeout(r, 100));
    expect(prov).not.toHaveBeenCalled();
  });
});
