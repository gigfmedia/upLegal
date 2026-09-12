import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const hookMocks = {
  featureAccess: vi.fn(),
  intelligence: vi.fn(),
  workflow: vi.fn(),
  syncMutate: vi.fn(),
};

vi.mock('@/hooks/useAISubscription', () => ({
  useAIFeatureAccess: (...args: unknown[]) => hookMocks.featureAccess(...args),
  useAISubscription: () => ({ subscription: null, status: 'none', hasAccess: false }),
}));
vi.mock('@/hooks/useAIDocuments', () => ({
  useAICaseIntelligence: (...args: unknown[]) => hookMocks.intelligence(...args),
}));
vi.mock('@/hooks/useAICaseWorkflow', () => ({
  useAICaseWorkflow: (...args: unknown[]) => hookMocks.workflow(...args),
  useSyncAICaseWorkflow: () => ({ mutate: hookMocks.syncMutate, isPending: false }),
  useUpdateAICaseWorkflow: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/components/legalup-ai/EvidenceNavigator', () => ({
  EvidenceNavigator: () => null,
}));
vi.mock('@/components/legalup-ai/AICaseWorkflowActionDrawer', () => ({
  AICaseWorkflowActionDrawer: () => null,
}));
vi.mock('@/lib/caseActions', () => ({
  deriveCaseActions: () => [{ id: 'a1', type: 'review_deadlines', title: 'Revisar plazos' }],
}));

import { AICaseIntelligence } from '@/components/legalup-ai/AICaseIntelligence';

const intelData = {
  document_count: 1,
  contradictions: [],
  risks: [],
  missingInformation: [],
  facts: [],
  parties: [],
  obligations: [],
  deadlines: [],
  recommendations: [],
  documents: [],
};

function setupIntelligence(canGenerate: boolean) {
  hookMocks.featureAccess.mockReturnValue({
    canUse: (f: string) => (f === 'workflow_generation' ? canGenerate : true),
  });
  hookMocks.intelligence.mockReturnValue({ data: intelData, isLoading: false, isError: false, refetch: vi.fn() });
  hookMocks.workflow.mockReturnValue({ data: { items: [] }, isLoading: false, isError: null });
  render(
    <MemoryRouter>
      <AICaseIntelligence workspaceId="ws-1" />
    </MemoryRouter>
  );
}

describe('4.31B F1 — workflow auto-sync gated by workflow_generation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pro without workflow_generation does NOT call sync (no 403, no provider call)', async () => {
    setupIntelligence(false);
    await new Promise((r) => setTimeout(r, 50));
    expect(hookMocks.syncMutate).not.toHaveBeenCalled();
  });

  it('legacy with workflow_generation keeps existing auto-sync behavior', async () => {
    setupIntelligence(true);
    await waitFor(() => expect(hookMocks.syncMutate).toHaveBeenCalledTimes(1));
  });
});
