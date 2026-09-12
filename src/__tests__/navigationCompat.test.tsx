import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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
