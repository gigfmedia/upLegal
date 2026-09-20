import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 4.36B — lifetime free-case authority: migration contract + CasesPage UX gate.
// Frontend never infers consumption from visible rows; the server ledger does.

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  createCase: vi.fn(),
  refetchEnt: vi.fn(),
  toast: vi.fn(),
}));

const entState = vi.hoisted(() => ({
  entitlement: {
    hasProAccess: false,
    freeCaseConsumed: false,
    canCreateDirectCase: true,
  },
  loading: false,
}));

vi.mock('@/hooks/useLawyerCases', () => ({
  useLawyerCases: () => ({
    cases: [],
    loading: false,
    error: null,
    createCase: mocks.createCase,
    deleteCase: vi.fn(),
    refetch: vi.fn(),
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
  }),
  isFreeCaseEntitlementError: (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes('FREE_CASE_ALLOWANCE_CONSUMED');
  },
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock('@/components/legalup-pro/ProPricingModal', () => ({
  ProPricingModal: () => null,
}));
vi.mock('posthog-js', () => ({ default: { capture: mocks.capture } }));

import CasesPage from '@/pages/lawyer/CasesPage';

const UNUSED = { hasProAccess: false, freeCaseConsumed: false, canCreateDirectCase: true };
const CONSUMED = { hasProAccess: false, freeCaseConsumed: true, canCreateDirectCase: false };
const PRO = { hasProAccess: true, freeCaseConsumed: true, canCreateDirectCase: true };

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

describe('4.36B — migration contract (source of truth)', () => {
  const sql = readFileSync(
    resolve('supabase/migrations/20260924000000_pro_free_case_lifetime.sql'),
    'utf-8'
  );

  it('creates a narrow ledger keyed by lawyer with no case FK', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.pro_free_case_grants');
    expect(sql).toContain('lawyer_id uuid PRIMARY KEY');
    expect(sql).not.toMatch(/REFERENCES public\.lawyer_cases/i);
  });

  it('denies every direct client path to the ledger', () => {
    expect(sql).toContain('REVOKE ALL ON TABLE public.pro_free_case_grants FROM PUBLIC, anon, authenticated');
    expect(sql).not.toMatch(/GRANT (SELECT|INSERT|UPDATE|DELETE) ON TABLE public\.pro_free_case_grants TO (authenticated|anon|PUBLIC)/);
  });

  it('backfills exactly one row per lawyer with a live direct case', () => {
    expect(sql).toContain("WHERE c.source = 'LAWYER_DIRECT'");
    expect(sql).toContain('DISTINCT ON (c.lawyer_id)');
    expect(sql).toContain('ON CONFLICT (lawyer_id) DO NOTHING');
  });

  it('claims atomically in a BEFORE trigger with a stable error token', () => {
    expect(sql).toContain('BEFORE INSERT OR UPDATE OF source, lawyer_id ON public.lawyer_cases');
    expect(sql).toContain('ON CONFLICT (lawyer_id) DO NOTHING');
    expect(sql).toContain('FREE_CASE_ALLOWANCE_CONSUMED');
    expect(sql).toContain("USING ERRCODE = 'P0001'");
  });

  it('never lets marketplace sources claim the allowance', () => {
    expect(sql).toContain("IF NEW.source IS DISTINCT FROM 'LAWYER_DIRECT' THEN");
  });

  it('exposes a single fail-closed read RPC, authenticated-only', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.get_my_case_entitlement()');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.get_my_case_entitlement() TO authenticated');
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.get_my_case_entitlement() FROM PUBLIC, anon');
  });

  it('hardens SECURITY DEFINER posture (search_path, owner checks, tenant guard)', () => {
    expect(sql).toContain('SET search_path = public');
    expect(sql).toContain('auth.uid()');
    expect(sql).toContain('FREE_CASE_CROSS_TENANT');
  });
});

describe('4.36B — CasesPage lifetime UX gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    entState.entitlement = { ...UNUSED };
    entState.loading = false;
    mocks.createCase.mockResolvedValue({ id: 'new-case' });
    mocks.refetchEnt.mockImplementation(async () => entState.entitlement);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('unused allowance → New Case opens the dialog (no paywall)', async () => {
    renderPage();
    fireEvent.click(headerNewCaseButton());
    await waitFor(() =>
      expect(screen.getByText(/Tu primer caso no requiere suscripción/i)).toBeInTheDocument()
    );
    expect(mocks.capture).not.toHaveBeenCalledWith(
      'pro_paywall_opened',
      expect.objectContaining({ action: 'create_case' })
    );
  });

  it('consumed allowance with zero visible rows → paywall (lifetime, not live-count)', () => {
    entState.entitlement = { ...CONSUMED };
    renderPage();
    fireEvent.click(headerNewCaseButton());
    expect(mocks.capture).toHaveBeenCalledWith(
      'pro_paywall_opened',
      expect.objectContaining({ action: 'create_case' })
    );
    expect(screen.queryByText(/Tu primer caso no requiere suscripción/i)).not.toBeInTheDocument();
  });

  it('active Pro → New Case opens normally', async () => {
    entState.entitlement = { ...PRO };
    renderPage();
    fireEvent.click(headerNewCaseButton());
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /nuevo caso/i })).toBeInTheDocument()
    );
  });

  it('known backend entitlement rejection maps to the Pro modal, not a bare error', async () => {
    // Gate reads stale allow (consumption landed after render); the submit
    // path still lands on the modal via the stable error token.
    mocks.createCase.mockRejectedValueOnce(
      new Error('LegalUp Pro required: free direct-case allowance already consumed. [FREE_CASE_ALLOWANCE_CONSUMED]')
    );
    renderPage();
    fireEvent.click(headerNewCaseButton());
    fireEvent.change(screen.getByPlaceholderText(/Divorcio Juan Pérez/i), {
      target: { value: 'Caso stale' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^crear$/i }));
    await waitFor(() =>
      expect(mocks.capture).toHaveBeenCalledWith(
        'pro_paywall_opened',
        expect.objectContaining({ action: 'create_case', reason: 'entitlement_rejected' })
      )
    );
    expect(mocks.toast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Error' })
    );
  });

  it('stale-client RLS denial confirmed consumed → Pro modal (multi-tab equivalent)', async () => {
    renderPage();
    fireEvent.click(headerNewCaseButton());
    fireEvent.change(screen.getByPlaceholderText(/Divorcio Juan Pérez/i), {
      target: { value: 'Caso tab B' },
    });
    mocks.createCase.mockRejectedValueOnce({
      code: '42501',
      message: 'new row violates row-level security policy for table "lawyer_cases"',
    });
    // Tab A committed first: the authoritative refetch now reports consumed.
    mocks.refetchEnt.mockResolvedValueOnce({ ...CONSUMED });
    fireEvent.click(screen.getByRole('button', { name: /^crear$/i }));
    await waitFor(() =>
      expect(mocks.capture).toHaveBeenCalledWith(
        'pro_paywall_opened',
        expect.objectContaining({ action: 'create_case', reason: 'entitlement_rejected' })
      )
    );
  });

  it('unknown creation errors keep the normal error toast', async () => {
    renderPage();
    fireEvent.click(headerNewCaseButton());
    fireEvent.change(screen.getByPlaceholderText(/Divorcio Juan Pérez/i), {
      target: { value: 'Caso boom' },
    });
    mocks.createCase.mockRejectedValueOnce(new Error('network down'));
    fireEvent.click(screen.getByRole('button', { name: /^crear$/i }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error' }))
    );
    expect(mocks.capture).not.toHaveBeenCalledWith(
      'pro_paywall_opened',
      expect.objectContaining({ reason: 'entitlement_rejected' })
    );
  });
});
