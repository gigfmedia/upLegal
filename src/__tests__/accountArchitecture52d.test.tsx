import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

const proState = vi.hoisted(() => ({
  pro: { hasProAccess: false, status: null as string | null, currentPeriodEnd: null as string | null, isLoading: false },
  ent: { entitlement: { hasProAccess: false, freeCaseConsumed: false, activeCaseCount: 0, activeCaseLimit: 20, canCreateDirectCase: true }, loading: false },
  googleConnected: false,
}));

vi.mock('@/hooks/useProSubscription', () => ({
  useProSubscription: () => ({ ...proState.pro }),
}));
vi.mock('@/hooks/useCaseEntitlement', () => ({
  useCaseEntitlement: () => ({ ...proState.ent }),
}));
vi.mock('@/components/legalup-pro/ProPricingModal', () => ({
  ProPricingModal: () => null,
}));
vi.mock('@/hooks/useProPaymentHistory', () => ({
  useProPaymentHistory: () => ({ payments: [], loading: false, error: null, initialLimit: 10 }),
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'L1' } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: proState.googleConnected ? { id: 'G1' } : null, error: null }) }) }),
    }),
  },
}));

import PlanPage from '@/pages/lawyer/PlanPage';
import IntegrationsPage from '@/pages/lawyer/IntegrationsPage';

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  proState.pro = { hasProAccess: false, status: null, currentPeriodEnd: null, isLoading: false };
  proState.ent = { entitlement: { hasProAccess: false, freeCaseConsumed: false, activeCaseCount: 0, activeCaseLimit: 20, canCreateDirectCase: true }, loading: false };
  proState.googleConnected = false;
});

describe('FASE 5.2D — rutas y sidebar', () => {
  it('1/5. /lawyer/integrations y /lawyer/plan anidadas bajo /lawyer (gated RequireLawyer)', () => {
    const app = read('src/App.tsx');
    const lawyerBlock = app.slice(app.indexOf('<Route path="/lawyer"'), app.indexOf('<Route path="/admin"'));
    expect(lawyerBlock).toContain('<Route path="plan"');
    expect(lawyerBlock).toContain('<Route path="integrations"');
  });
  it('13. sidebar CUENTA: Plan y facturación + Integraciones', () => {
    const layout = read('src/components/dashboard/DashboardLayout.tsx');
    expect(layout).toContain("label: 'Plan y facturación'");
    expect(layout).toContain("label: 'Integraciones'");
    expect(layout).toContain("'/lawyer/plan', '/lawyer/integrations', '/dashboard/payment-settings'");
  });
  it('4/11. dashboard sin Google ni promo de plan', () => {
    const dash = read('src/pages/lawyer/DashboardPage.tsx');
    expect(dash).not.toContain('GoogleCalendarConnect');
    expect(dash).not.toContain('aiBadgeText');
  });
});

describe('FASE 5.2D — integraciones', () => {
  it('2. Google Calendar muestra estado real (no conectado)', async () => {
    renderWithRouter(<IntegrationsPage />);
    expect(screen.getByText('Conecta las herramientas que utilizas en tu trabajo diario.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('No conectado')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Conectar Google Calendar' })).toBeInTheDocument();
  });
  it('2. Google Calendar muestra estado real (conectado + desconectar existente)', async () => {
    proState.googleConnected = true;
    renderWithRouter(<IntegrationsPage />);
    await waitFor(() => expect(screen.getByText('Conectado')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Desconectar' })).toBeInTheDocument();
  });
  it('3. CTA reutiliza el flujo OAuth existente (sin duplicar)', () => {
    const src = read('src/components/dashboard/GoogleCalendarConnect.tsx');
    expect(src).toContain('google-auth/init');
    expect(read('src/pages/lawyer/IntegrationsPage.tsx')).toContain('GoogleCalendarConnect');
  });
});

describe('FASE 5.2D — plan y facturación', () => {
  it('6/7. FREE: LegalUp Gratis + caso disponible + CTA Pro', () => {
    renderWithRouter(<PlanPage />);
    expect(screen.getByText(/Plan actual:/)).toBeInTheDocument();
    expect(screen.getByText(/LegalUp Gratis/)).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver LegalUp Pro' })).toBeInTheDocument();
  });
  it('7. FREE consumido muestra Consumo', () => {
    proState.ent.entitlement.freeCaseConsumed = true;
    renderWithRouter(<PlanPage />);
    expect(screen.getByText('Consumido')).toBeInTheDocument();
  });
  it('8/9. PRO: estado, casos X/20 y renovación real', () => {
    proState.pro = { hasProAccess: true, status: 'active', currentPeriodEnd: new Date(2026, 10, 15).toISOString(), isLoading: false };
    proState.ent.entitlement = { hasProAccess: true, freeCaseConsumed: true, activeCaseCount: 7, activeCaseLimit: 20, canCreateDirectCase: true };
    renderWithRouter(<PlanPage />);
    expect(screen.getByText(/Plan actual:/)).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('7 / 20')).toBeInTheDocument();
    expect(screen.getByText(/noviembre/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver LegalUp Pro' })).not.toBeInTheDocument();
  });
  it('10/5.2E. LegalUp AI fuera de Plan: sin sección, sin planes, sin explicaciones', () => {
    const src = read('src/pages/lawyer/PlanPage.tsx');
    expect(src).not.toMatch(/LegalUp AI/);
    expect(src).not.toMatch(/useAIFeatureAccess|useAISubscription/);
    expect(src).not.toMatch(/pro_limited|Pro limitado|Essential|Trial AI/i);
    expect(src).not.toMatch(/independiente de LegalUp Pro/i);
    expect(src).not.toMatch(/workspace/i);
    renderWithRouter(<PlanPage />);
    expect(screen.queryByText('LegalUp AI')).not.toBeInTheDocument();
  });
  it('14. pagos del abogado no se mezclan: Plan no enlaza flujos no operativos', () => {
    const src = read('src/pages/lawyer/PlanPage.tsx');
    expect(src).not.toContain('payment-settings');
    expect(src).not.toMatch(/Cómo recibes pagos/i);
    const layout = read('src/components/dashboard/DashboardLayout.tsx');
    expect(layout).toContain('/dashboard/payment-settings');
    expect(layout).toContain('/lawyer/plan');
  });
});

describe('FASE 5.2D — gates intactos', () => {
  it('12. paywalls contextuales siguen en su lugar', () => {
    const dash = read('src/pages/lawyer/DashboardPage.tsx');
    expect(dash).toContain('ProPricingModal');
    expect(dash).toContain('pro_paywall_opened');
    const cases = read('src/pages/lawyer/CasesPage.tsx');
    expect(cases).toContain('ProPricingModal');
  });
});
