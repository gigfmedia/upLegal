import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { readFileSync } from 'node:fs';
const state = vi.hoisted(() => ({ price: 19990 }));
vi.mock('@/hooks/useAISubscription', () => ({
  useAISubscription: () => ({ status: 'none', isActive: false, hasAccess: false }),
  useCancelAISubscription: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/hooks/useProSubscription', () => ({
  useProSubscription: () => ({ hasProAccess: false }),
  useProSubscribe: () => ({ mutateAsync: vi.fn() }),
  useProFounderStatus: () => ({ data: { previewPriceClp: state.price, founderSlotsRemaining: state.price === 19990 ? 5 : 0 } }),
}));
vi.mock('@/components/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/pro/TestimonialsSection', () => ({ TestimonialsSection: () => null }));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map();
  return { useReducedMotion: () => true, motion: new Proxy({}, { get: (_, tag: string) => {
    if (!cache.has(tag)) cache.set(tag, React.forwardRef(({ children, ...props }: Record<string, unknown>, ref) => {
      for (const k of ['initial','animate','transition','viewport','whileInView','whileHover','whileTap']) delete props[k];
      return React.createElement(tag, { ...props, ref }, children as React.ReactNode);
    }));
    return cache.get(tag);
  } }) };
});
import LegalUpPro from '@/pages/LegalUpPro';
import { ProPricingModal } from '@/components/legalup-pro/ProPricingModal';
import { AISubscriptionBanner } from '@/components/legalup-ai/AISubscriptionBanner';
import { AIPricingModal } from '@/components/legalup-ai/AIPricingModal';
afterEach(cleanup);
const renderLanding = () => render(<HelmetProvider><MemoryRouter><LegalUpPro /></MemoryRouter></HelmetProvider>);
const prohibited = /sin IA|IA no incluida|\btrial\b|prueba gratis|Essential|\$49\.900|casos ilimitados/i;
describe('4.56B current commercial contract', () => {
  it('first case displays limited lifetime AI, stored capacity and truthful gates', () => {
    renderLanding();
    const card = screen.getByRole('heading', { name: 'Tu primer caso' }).parentElement!;
    expect(card.textContent).not.toMatch(prohibited);
    for (const label of ['Hasta 2 documentos actuales','3 consultas con LegalUp AI en total (caso y documentos)','1 análisis de documento en total','1 investigación jurídica en total','Crear clientes: requiere Pro','Command Center avanzado: requiere Pro']) expect(within(card).getByText(label)).toBeVisible();
    expect(within(card).getByRole('button', { name: 'Crear mi primer caso' })).toBeVisible();
    expect(card.textContent).toContain('no se renuevan cada mes');
  });
  it('Pro enumerates real monthly quotas and current stored capacity', () => {
    renderLanding();
    const pricing = document.querySelector('#pricing')!;
    for (const label of ['Hasta 20 casos activos','Hasta 50 documentos actuales','300 consultas IA / mes (caso y documentos)','40 análisis de documentos / mes','10 investigaciones jurídicas / mes']) expect(within(pricing as HTMLElement).getByText(label)).toBeVisible();
    // 4.57D: shared rows (unlimited clients) appear on Pro and Plus cards.
    expect(within(pricing as HTMLElement).getAllByText('Clientes ilimitados')).toHaveLength(2);
    expect(pricing.textContent).not.toMatch(prohibited);
    expect(pricing.textContent).toContain('Servicios e ingresos del marketplace no requieren Pro');
    expect(pricing.textContent).toContain('mismas capacidades');
  });
  it.each([19990,49990])('canonical and legacy modal share current offer, price %s', price => {
    state.price = price;
    const { unmount } = render(<AIPricingModal open onOpenChange={() => {}} />);
    expect(screen.getByRole('dialog').textContent).not.toMatch(prohibited);
    expect(screen.getByText('Hasta 50 documentos actuales')).toBeVisible();
    expect(screen.getByText('10 investigaciones jurídicas / mes')).toBeVisible();
    expect(screen.queryByText('Founder 15') !== null).toBe(price === 19990);
    unmount();
    render(<ProPricingModal open onOpenChange={() => {}} />);
    expect(screen.getByRole('dialog').textContent).not.toMatch(prohibited);
  });
  it('profile renders no standalone legacy AI subscription UI', () => {
    const profile = readFileSync('src/pages/lawyer/ProfilePage.tsx', 'utf8');
    for (const s of ['Mi suscripción de LegalUp AI', 'Suscripción histórica LegalUp AI', 'Acceso histórico temporal', 'Fin del acceso histórico', 'Ir a LegalUp AI', 'AISubscriptionCard', 'legacyAISubscription']) {
      expect(profile).not.toContain(s);
    }
  });
  it('banner offers Pro while acknowledging limited AI in first case', () => {
    render(<AISubscriptionBanner />);
    expect(screen.getByText(/Tu primer caso incluye usos limitados/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ver LegalUp Pro' })).toBeVisible();
  });
  it('admin has no legacy campaign UI or send action', () => {
    const source=readFileSync('src/pages/admin/lawyer-profiles.tsx','utf8');
    expect(source).not.toMatch(/legalup_ai_trial|send-lawyer-invite|showAIInviteDialog|49\.900|5 días gratis/);
    expect(source).toContain('/api/admin/invite-lawyer-magic-link');
  });
});
