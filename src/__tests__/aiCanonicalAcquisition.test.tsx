import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const state = vi.hoisted(() => ({
  access: false, subscription: null as null | { status: string },
  workspaces: [] as { id: string; name: string; created_at: string }[],
  cases: [] as { id: string; ai_workspace_id: string }[],
  create: vi.fn(), trial: vi.fn(), subscribe: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('@/hooks/useAIWorkspaces', () => ({
  useAIWorkspaces: () => ({ data: state.workspaces, isLoading: false }),
  useDeleteAIWorkspace: () => ({ mutateAsync: vi.fn() }),
  useCreateAIWorkspace: () => ({ mutateAsync: state.create }),
}));
vi.mock('@/hooks/useAISubscription', () => ({
  useAISubscription: () => ({ hasAccess: state.access, subscription: state.subscription }),
  useStartAITrial: () => ({ mutateAsync: state.trial }),
  useAISubscribe: () => ({ mutateAsync: state.subscribe }),
}));
vi.mock('@/hooks/useLawyerCases', () => ({ useLawyerCases: () => ({ cases: state.cases }) }));
vi.mock('@/components/legalup-ai/EditCaseModal', () => ({ EditCaseModal: () => null }));
vi.mock('@/components/legalup-ai/AISubscriptionBanner', () => ({ AISubscriptionBanner: () => null }));
vi.mock('@/components/legalup-ai/AIUsageMeter', () => ({ AIUsageMeter: () => null }));
vi.mock('@/components/legalup-ai/AICaseTimelinePreview', () => ({ AICaseTimelinePreview: () => null }));
vi.mock('@/components/legalup-ai/AIPricingModal', () => ({ AIPricingModal: ({ open }: { open: boolean }) => open ? <div>legacy-paywall</div> : null }));
vi.mock('@/components/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map();
  return {
    useInView: () => true,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy({}, { get: (_, tag: string) => {
      if (!cache.has(tag)) cache.set(tag, React.forwardRef(({ children, ...props }: Record<string, unknown>, ref) => {
        for (const key of ['initial', 'animate', 'exit', 'transition', 'viewport', 'whileInView', 'whileHover', 'whileTap', 'layout']) delete props[key];
        return React.createElement(tag, { ...props, ref }, children as React.ReactNode);
      }));
      return cache.get(tag);
    } }),
  };
});
import LegalUpAI from '@/pages/LegalUpAI';
import LegalUpAIWorkspace from '@/pages/lawyer/LegalUpAIWorkspace';

function Destination() { const loc = useLocation(); return <output data-testid="destination">{loc.pathname + loc.search}</output>; }
function mount(page: React.ReactNode, route = '/lawyer/ai') {
  return render(<HelmetProvider><MemoryRouter initialEntries={[route]}><Routes>
    <Route path={route.split('?')[0]} element={page} />
    <Route path="/pro" element={<Destination />} />
    <Route path="/lawyer/cases" element={<Destination />} />
    <Route path="/lawyer/cases/:id" element={<Destination />} />
    <Route path="/lawyer/ai/cases/:id" element={<Destination />} />
  </Routes></MemoryRouter></HelmetProvider>);
}
beforeEach(() => {
  vi.clearAllMocks(); state.access = false; state.subscription = null; state.workspaces = []; state.cases = [];
});
afterEach(cleanup);

describe('4.33D canonical acquisition and legacy compatibility', () => {
  it.each(['new', 'pro', 'pro-with-legacy', 'legacy-trial', 'legacy-active', 'legacy-expired'])('%s can only start a canonical case', profile => {
    state.access = !['new', 'legacy-expired'].includes(profile);
    state.subscription = profile.includes('legacy') ? { status: profile === 'legacy-expired' ? 'expired' : 'trialing' } : null;
    mount(<LegalUpAIWorkspace />);
    expect(screen.queryByRole('button', { name: /^Nuevo caso$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Crear mi primer caso/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear caso en LegalUp Pro' }));
    expect(screen.getByTestId('destination')).toHaveTextContent('/lawyer/cases');
    expect(state.create).not.toHaveBeenCalled(); expect(state.trial).not.toHaveBeenCalled();
  });
  it('empty-state CTA opens canonical Cases without creating anything', () => {
    mount(<LegalUpAIWorkspace />);
    expect(screen.getByText('LegalUp AI ahora trabaja dentro de tus casos de LegalUp Pro.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver mis casos' }));
    expect(screen.getByTestId('destination')).toHaveTextContent('/lawyer/cases');
    expect(state.create).not.toHaveBeenCalled();
  });
  it.each([false, true])('existing workspace stays accessible, linked=%s', linked => {
    state.access = true; state.subscription = { status: 'active' };
    state.workspaces = [{ id: 'W1', name: 'Existing legacy case', created_at: '2026-09-01T12:00:00Z' }];
    if (linked) state.cases = [{ id: 'C1', ai_workspace_id: 'W1' }];
    mount(<LegalUpAIWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir caso' }));
    expect(screen.getByTestId('destination')).toHaveTextContent(linked ? '/lawyer/cases/C1?tab=ai' : '/lawyer/ai/cases/W1');
    expect(state.create).not.toHaveBeenCalled();
  });
  it('expired legacy keeps the existing paywall instead of granting access', () => {
    state.subscription = { status: 'expired' }; state.workspaces = [{ id: 'W1', name: 'Existing', created_at: '2026-09-01T12:00:00Z' }];
    mount(<LegalUpAIWorkspace />); fireEvent.click(screen.getByRole('button', { name: 'Abrir caso' }));
    expect(screen.getByText('legacy-paywall')).toBeInTheDocument(); expect(state.create).not.toHaveBeenCalled();
  });
  it.each([0, 1, 2, 3, 4])('public CTA %s goes to Pro without a standalone offer', index => {
    const { container } = mount(<LegalUpAI />, '/ai');
    expect(container.textContent).not.toMatch(/5 días gratis|Prueba gratis durante 5 días|\$49\.900|LegalUp AI Essential/);
    expect(screen.getAllByText(/LegalUp AI está incluido en LegalUp Pro/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Activar LegalUp Pro/ }).length).toBe(5);
    fireEvent.click(screen.getAllByRole('button', { name: /Activar LegalUp Pro/ })[index]);
    expect(screen.getByTestId('destination')).toHaveTextContent('/pro');
    expect(state.trial).not.toHaveBeenCalled(); expect(state.subscribe).not.toHaveBeenCalled(); expect(state.create).not.toHaveBeenCalled();
  }, 15000);
  it('old pending trial does not start a trial and UTM attribution survives CTA', () => {
    localStorage.setItem('aiPendingTrial', '1');
    window.history.replaceState(null, '', '/ai?utm_source=ai_campaign&utm_campaign=launch&price=1');
    mount(<LegalUpAI />, '/ai');
    expect(localStorage.getItem('aiPendingTrial')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: /Activar LegalUp Pro/ })[0]);
    expect(screen.getByTestId('destination')).toHaveTextContent('/pro?utm_source=ai_campaign&utm_campaign=launch');
    expect(screen.getByTestId('destination')).not.toHaveTextContent('price=1');
    expect(state.trial).not.toHaveBeenCalled();
    window.history.replaceState(null, '', '/');
  });
});
