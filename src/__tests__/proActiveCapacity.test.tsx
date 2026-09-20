import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 4.36D — Pro active capacity (20) + lifecycle: migration contract,
// CasesPage gates (free modal vs capacity UX), card lifecycle, filters.

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  createCase: vi.fn(),
  updateCase: vi.fn(),
  refetchEnt: vi.fn(),
  refetchCases: vi.fn(),
  toast: vi.fn(),
}));

const entState = vi.hoisted(() => ({
  entitlement: {
    hasProAccess: true,
    freeCaseConsumed: true,
    activeCaseCount: 19,
    activeCaseLimit: 20,
    canCreateDirectCase: true,
  },
  loading: false,
}));

const casesState = vi.hoisted(() => ({ cases: [] as unknown[] }));

vi.mock('@/hooks/useLawyerCases', () => ({
  useLawyerCases: () => ({
    cases: casesState.cases,
    loading: false,
    error: null,
    createCase: mocks.createCase,
    updateCase: mocks.updateCase,
    deleteCase: vi.fn(),
    refetch: mocks.refetchCases,
  }),
}));
vi.mock('@/hooks/useLawyerClients', () => ({
  useLawyerClients: () => ({ clients: [], loading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useCaseEntitlement', () => ({
  useCaseEntitlement: () => ({
    entitlement: entState.entitlement,
    loading: entState.loading,
    refetch: mocks.refetchEnt,
    canCreateDirectCase: entState.entitlement.canCreateDirectCase,
    freeCaseConsumed: entState.entitlement.freeCaseConsumed,
    hasProAccess: entState.entitlement.hasProAccess,
    activeCaseCount: entState.entitlement.activeCaseCount,
    activeCaseLimit: entState.entitlement.activeCaseLimit,
  }),
  isFreeCaseEntitlementError: (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes('FREE_CASE_ALLOWANCE_CONSUMED');
  },
  isActiveCapacityError: (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes('ACTIVE_CASE_LIMIT_REACHED');
  },
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock('@/components/legalup-pro/ProPricingModal', () => ({
  ProPricingModal: () => null,
}));
vi.mock('@/components/legalup-pro/ActiveCapacityModal', () => ({
  ActiveCapacityModal: () => null,
}));
vi.mock('posthog-js', () => ({ default: { capture: mocks.capture } }));

import CasesPage from '@/pages/lawyer/CasesPage';
import { SharedCaseCard } from '@/components/legalup-ai/SharedCaseCard';
import { isActiveCaseStatus, ACTIVE_CASE_STATUSES } from '@/lib/caseStatus';

const PRO_19 = { hasProAccess: true, freeCaseConsumed: true, activeCaseCount: 19, activeCaseLimit: 20, canCreateDirectCase: true };
const PRO_20 = { hasProAccess: true, freeCaseConsumed: true, activeCaseCount: 20, activeCaseLimit: 20, canCreateDirectCase: false };
const FREE_UNUSED = { hasProAccess: false, freeCaseConsumed: false, activeCaseCount: 0, activeCaseLimit: 20, canCreateDirectCase: true };
const FREE_USED = { hasProAccess: false, freeCaseConsumed: true, activeCaseCount: 1, activeCaseLimit: 20, canCreateDirectCase: false };

function renderPage() {
  render(
    <MemoryRouter>
      <CasesPage />
    </MemoryRouter>
  );
}

function headerNewCaseButton() {
  return screen.getAllByRole('button', { name: /nuevo caso/i })[0];
}

function mkCase(id: string, status: string, title = `Caso ${id}`) {
  return {
    id, title, status, source: 'LAWYER_DIRECT',
    created_at: '2026-08-02T10:00:00.000Z', updated_at: '2026-08-04T10:00:00.000Z',
    client: null, ai_workspace_id: null,
  };
}

describe('4.36D — migration contract (source of truth)', () => {
  const sql = readFileSync(
    resolve('supabase/migrations/20260925000000_pro_active_case_capacity.sql'),
    'utf-8'
  );

  it('declares one canonical limit with no scattered literal', () => {
    expect(sql).toContain('pro_active_case_limit');
    expect(sql).toContain('AS $$ SELECT 20 $$');
    // Strip SQL comments: exactly one standalone 20 may remain in code.
    const code = sql
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('--'))
      .join('\n');
    const occurrences = code.match(/(?<![A-Za-z_0-9])20(?![0-9])/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });

  it('uses explicit ACTIVE/HISTORICAL status sets', () => {
    expect(sql).toContain("'new', 'quoted', 'paid', 'in_progress', 'delivered'");
    expect(sql).not.toMatch(/status\s*<>\s*'closed'/);
    expect(sql).not.toMatch(/status\s*!=\s*'closed'/);
  });

  it('enforces admission in a deferrable commit-time trigger', () => {
    expect(sql).toContain('CREATE CONSTRAINT TRIGGER trg_case_write_admission');
    expect(sql).toContain('DEFERRABLE INITIALLY DEFERRED');
    expect(sql).toContain('ACTIVE_CASE_LIMIT_REACHED');
    expect(sql).toContain("USING ERRCODE = 'P0001'");
  });

  it('preserves the free ledger token and never reads founder status', () => {
    expect(sql).toContain('FREE_CASE_ALLOWANCE_CONSUMED');
    // Founder may be mentioned in comments (same-capacity rule), but code
    // must never read the badge.
    const code = sql
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('--'))
      .join('\n');
    expect(code).not.toContain('is_founder');
  });

  it('documents Ultra/billing exclusion and contains no billing identifiers', () => {
    expect(sql).toContain('No Ultra');
    expect(sql).not.toContain('mercadopago');
    expect(sql).not.toContain('49990');
    expect(sql).not.toContain('19990');
    expect(sql).not.toContain('provider_subscription');
  });

  it('extends the read RPC without touching the free grant table', () => {
    expect(sql).toContain('active_case_count');
    expect(sql).toContain('active_case_limit');
    expect(sql).toContain('can_create_direct_case');
    expect(sql).not.toMatch(/ALTER TABLE public\.pro_free_case_grants/i);
    expect(sql).not.toMatch(/DROP TABLE public\.pro_free_case_grants/i);
  });
});

describe('4.36D — status semantics helper', () => {
  it('ACTIVE set matches the product contract', () => {
    expect([...ACTIVE_CASE_STATUSES]).toEqual(['new', 'quoted', 'paid', 'in_progress', 'delivered']);
    for (const s of ['new', 'quoted', 'paid', 'in_progress', 'delivered']) {
      expect(isActiveCaseStatus(s)).toBe(true);
    }
    expect(isActiveCaseStatus('closed')).toBe(false);
    expect(isActiveCaseStatus('cancelled')).toBe(false);
    expect(isActiveCaseStatus(null)).toBe(false);
  });
});

describe('4.36D — CasesPage capacity gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    entState.entitlement = { ...PRO_19 };
    entState.loading = false;
    casesState.cases = [];
    mocks.createCase.mockResolvedValue({ id: 'new-case' });
    mocks.updateCase.mockImplementation(async (id: string, patch: Record<string, unknown>) => ({ id, ...patch }));
    mocks.refetchEnt.mockImplementation(async () => entState.entitlement);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('Pro 19/20 → New Case opens the dialog + capacity indicator visible', async () => {
    renderPage();
    fireEvent.click(headerNewCaseButton());
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /nuevo caso/i })).toBeInTheDocument()
    );
    expect(screen.getByText('19 de 20 casos activos')).toBeInTheDocument();
  });

  it('Pro 20/20 → capacity UX, never the subscription modal', () => {
    entState.entitlement = { ...PRO_20 };
    renderPage();
    expect(screen.getByText('20 de 20 casos activos')).toBeInTheDocument();
    fireEvent.click(headerNewCaseButton());
    expect(mocks.capture).toHaveBeenCalledWith(
      'case_capacity_reached',
      expect.objectContaining({ action: 'create_case' })
    );
    expect(mocks.capture).not.toHaveBeenCalledWith(
      'pro_paywall_opened',
      expect.objectContaining({ action: 'create_case' })
    );
  });

  it('free unused → dialog, no capacity indicator', async () => {
    entState.entitlement = { ...FREE_UNUSED };
    renderPage();
    fireEvent.click(headerNewCaseButton());
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /nuevo caso/i })).toBeInTheDocument()
    );
    expect(screen.queryByText(/casos activos/)).not.toBeInTheDocument();
  });

  it('free consumed → subscription modal, not capacity UX', () => {
    entState.entitlement = { ...FREE_USED };
    renderPage();
    fireEvent.click(headerNewCaseButton());
    expect(mocks.capture).toHaveBeenCalledWith(
      'pro_paywall_opened',
      expect.objectContaining({ action: 'create_case' })
    );
    expect(mocks.capture).not.toHaveBeenCalledWith(
      'case_capacity_reached',
      expect.anything()
    );
  });

  it('stale ACTIVE_CASE_LIMIT_REACHED on submit → capacity UX', async () => {
    mocks.createCase.mockRejectedValueOnce(new Error('... [ACTIVE_CASE_LIMIT_REACHED]'));
    renderPage();
    fireEvent.click(headerNewCaseButton());
    fireEvent.change(screen.getByPlaceholderText(/Divorcio Juan Pérez/i), {
      target: { value: 'Caso 21' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^crear$/i }));
    await waitFor(() =>
      expect(mocks.capture).toHaveBeenCalledWith(
        'case_capacity_reached',
        expect.objectContaining({ action: 'create_case' })
      )
    );
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Error' }));
  });

  it('closing an active case emits case_closed and refreshes', async () => {
    casesState.cases = [mkCase('c1', 'in_progress')];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /cerrar caso/i }));
    await waitFor(() => expect(mocks.updateCase).toHaveBeenCalledWith('c1', { status: 'closed' }));
    expect(mocks.capture).toHaveBeenCalledWith(
      'case_closed',
      expect.objectContaining({ previous_status: 'in_progress', new_status: 'closed' })
    );
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Caso cerrado' }));
  });

  it('reopening a historical case emits case_reopened', async () => {
    casesState.cases = [mkCase('c9', 'closed')];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /reabrir caso/i }));
    await waitFor(() => expect(mocks.updateCase).toHaveBeenCalledWith('c9', { status: 'in_progress' }));
    expect(mocks.capture).toHaveBeenCalledWith(
      'case_reopened',
      expect.objectContaining({ previous_status: 'closed', new_status: 'in_progress' })
    );
  });

  it('stale reopen at full capacity → capacity UX', async () => {
    entState.entitlement = { ...PRO_20 };
    mocks.updateCase.mockRejectedValueOnce(new Error('... [ACTIVE_CASE_LIMIT_REACHED]'));
    casesState.cases = [mkCase('c9', 'closed')];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /reabrir caso/i }));
    await waitFor(() =>
      expect(mocks.capture).toHaveBeenCalledWith(
        'case_capacity_reached',
        expect.objectContaining({ action: 'reopen_case' })
      )
    );
  });
});

describe('4.36D — SharedCaseCard lifecycle (no card delete)', () => {
  const base = {
    title: 'Caso QA',
    createdAt: '2026-08-02T10:00:00.000Z',
    updatedAt: '2026-08-04T10:00:00.000Z',
    workspaceId: null,
    onOpen: vi.fn(),
    onTimeline: vi.fn(),
    onEdit: vi.fn(),
  };

  it('renders no trash icon without onDelete', () => {
    render(
      <MemoryRouter>
        <SharedCaseCard {...base} onCloseCase={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('button', { name: /eliminar caso/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cerrar caso/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reabrir caso/i })).not.toBeInTheDocument();
  });

  it('renders reopen (and no close) when onReopenCase is passed', () => {
    render(
      <MemoryRouter>
        <SharedCaseCard {...base} onReopenCase={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /reabrir caso/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cerrar caso/i })).not.toBeInTheDocument();
  });

  it('close/reopen invoke their handlers', () => {
    const onClose = vi.fn();
    const onReopen = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <SharedCaseCard {...base} onCloseCase={onClose} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /cerrar caso/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <MemoryRouter>
        <SharedCaseCard {...base} onReopenCase={onReopen} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /reabrir caso/i }));
    expect(onReopen).toHaveBeenCalledTimes(1);
  });
});

describe('4.36D — active/history filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    entState.entitlement = { ...PRO_19 };
    entState.loading = false;
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  async function selectFilter(label: string) {
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: label }));
  }

  it('Historial shows only closed/cancelled; Activos hides them; Todos shows all', async () => {
    casesState.cases = [mkCase('a', 'in_progress', 'Caso Activo'), mkCase('b', 'delivered', 'Caso Entregado'), mkCase('c', 'closed', 'Caso Cerrado'), mkCase('d', 'cancelled', 'Caso Anulado')];
    renderPage();
    expect(screen.getByText('Caso Activo')).toBeInTheDocument();
    await selectFilter('Cerrados / Historial');
    await waitFor(() => expect(screen.queryByText('Caso Activo')).not.toBeInTheDocument());
    expect(screen.getByText('Caso Cerrado')).toBeInTheDocument();
    expect(screen.getByText('Caso Anulado')).toBeInTheDocument();
    await selectFilter('Activos');
    await waitFor(() => expect(screen.getByText('Caso Activo')).toBeInTheDocument());
    expect(screen.getByText('Caso Entregado')).toBeInTheDocument();
    expect(screen.queryByText('Caso Cerrado')).not.toBeInTheDocument();
    await selectFilter('Todos');
    await waitFor(() => expect(screen.getByText('Caso Cerrado')).toBeInTheDocument());
  });
});

describe('4.36D — capacity modal copy', () => {
  it('states the limit without subscription/Ultra language', async () => {
    // Same-file mock above nulls the modal for page tests; use the real one.
    const { ActiveCapacityModal: RealModal } = await vi.importActual<
      typeof import('@/components/legalup-pro/ActiveCapacityModal')
    >('@/components/legalup-pro/ActiveCapacityModal');
    render(
      <MemoryRouter>
        <RealModal open onOpenChange={vi.fn()} limit={20} />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Límite de casos activos alcanzado/)).toBeInTheDocument();
    expect(screen.getByText(/límite de 20 casos activos/)).toBeInTheDocument();
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/suscríbete|suscribirse|Ultra|precio|\$19\.990|\$49\.990/i);
  });
});
