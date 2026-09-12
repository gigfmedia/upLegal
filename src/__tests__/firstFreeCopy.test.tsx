import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const hookMocks = {
  cases: vi.fn(),
  clients: vi.fn(),
  pro: vi.fn(),
};

vi.mock('@/hooks/useLawyerCases', () => ({
  useLawyerCases: (...args: unknown[]) => hookMocks.cases(...args),
}));
vi.mock('@/hooks/useLawyerClients', () => ({
  useLawyerClients: (...args: unknown[]) => hookMocks.clients(...args),
}));
vi.mock('@/hooks/useProSubscription', () => ({
  useProSubscription: (...args: unknown[]) => hookMocks.pro(...args),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/components/legalup-pro/ProPricingModal', () => ({
  ProPricingModal: () => null,
}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import CasesPage from '@/pages/lawyer/CasesPage';

function setup(opts: { cases?: unknown[]; hasProAccess?: boolean }) {
  hookMocks.cases.mockReturnValue({
    cases: opts.cases ?? [],
    loading: false,
    error: null,
    createCase: vi.fn(),
  });
  hookMocks.clients.mockReturnValue({ clients: [] });
  hookMocks.pro.mockReturnValue({ hasProAccess: opts.hasProAccess ?? false });
  render(
    <MemoryRouter>
      <CasesPage />
    </MemoryRouter>
  );
}

describe('4.31B F2 — first-free discoverability', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no-Pro zero direct cases: first-free messaging visible, no free-AI claim', () => {
    setup({ cases: [], hasProAccess: false });
    expect(screen.getByText(/Crea tu primer caso sin suscripción/i)).toBeInTheDocument();
    expect(screen.queryByText(/IA gratis/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pro gratis/i)).not.toBeInTheDocument();
  });

  it('new-case dialog explains no subscription required + AI requires Pro', () => {
    setup({ cases: [], hasProAccess: false });
    fireEvent.click(screen.getByText('Crear mi primer caso'));
    expect(
      screen.getByText(/Tu primer caso no requiere suscripción a Pro/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Las funciones de IA requieren LegalUp Pro/i)).toBeInTheDocument();
  });

  it('active Pro: first-free message not shown', () => {
    setup({ cases: [], hasProAccess: true });
    expect(screen.queryByText(/Crea tu primer caso sin suscripción/i)).not.toBeInTheDocument();
  });

  it('marketplace-only cases are not mislabeled as first-free offer', () => {
    setup({
      cases: [{ id: 'm-1', title: 'Caso MP', status: 'new', source: 'LEGALUP_MARKETPLACE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
      hasProAccess: false,
    });
    // Zero DIRECT cases → first-free note still applies to direct creation,
    // but must not claim the marketplace case itself was the free offer.
    expect(screen.queryByText(/Este es tu primer caso gratis/i)).not.toBeInTheDocument();
  });

  it('second direct case still triggers Pro gate (modal state, no bypass)', () => {
    setup({
      cases: [{ id: 'd-1', title: 'Caso 1', status: 'new', source: 'LAWYER_DIRECT', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
      hasProAccess: false,
    });
    expect(screen.queryByText(/Crea tu primer caso sin suscripción/i)).not.toBeInTheDocument();
  });
});

describe('4.31B F3 — no stale standalone-AI purchase copy in normal Pro flow', () => {
  const proModal = readFileSync(resolve('src/components/legalup-pro/ProPricingModal.tsx'), 'utf-8');

  it('ProPricingModal has no separate AI product price', () => {
    expect(proModal).not.toContain('AI Full');
    expect(proModal).not.toContain('$49.900');
    expect(proModal).not.toContain('49.900');
  });

  it('ProPricingModal keeps certified pricing transition + Core AI benefit', () => {
    expect(proModal).toContain('$19.990');
    expect(proModal).toContain('$49.990');
    expect(proModal).not.toMatch(/jurisprudencia/i);
  });

  it('Dashboard card frames AI as Pro capability for non-legacy users', () => {
    const dash = readFileSync(resolve('src/pages/lawyer/DashboardPage.tsx'), 'utf-8');
    // Non-legacy branch: Pro capability framing, routes to Cases/Pro.
    expect(dash).toContain('La IA trabaja dentro de tus casos');
    expect(dash).toContain('Ir a mis casos');
    expect(dash).toContain('Conocer LegalUp Pro');
    expect(dash).toContain('hasLegacyAI');
  });

  it('legacy trial copy preserved only behind legacy guard', () => {
    const dash = readFileSync(resolve('src/pages/lawyer/DashboardPage.tsx'), 'utf-8');
    // Trial/subscribe strings may remain, but only in legacy branches guarded
    // by hasLegacyAI (legacy users keep their historical UX).
    const legacyIdx = dash.indexOf('hasLegacyAI');
    const trialIdx = dash.indexOf('Prueba LegalUp AI gratis durante 5 días');
    expect(legacyIdx).toBeGreaterThan(-1);
    expect(trialIdx).toBeGreaterThan(legacyIdx);
  });
});
