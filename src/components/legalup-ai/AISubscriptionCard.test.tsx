import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const state = vi.hoisted(() => ({
  ai: { hasAccess: false, isActive: false, trialEndsAt: null as string | null, currentPeriodEnd: null as string | null },
  hasProAccess: false,
}));

vi.mock('@/hooks/useAISubscription', () => ({
  useAISubscription: () => ({
    status: 'none',
    isActive: state.ai.isActive,
    hasAccess: state.ai.hasAccess,
    trialEndsAt: state.ai.trialEndsAt,
    currentPeriodEnd: state.ai.currentPeriodEnd,
  }),
  useCancelAISubscription: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useProSubscription', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useProSubscription')>();
  return {
    ...actual,
    useProSubscription: () => ({ hasProAccess: state.hasProAccess }),
    useProSubscribe: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useProFounderStatus: () => ({ data: null }),
  };
});
vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import { AISubscriptionCard, isSentinelEndDate } from './AISubscriptionCard';

afterEach(() => {
  cleanup();
  state.ai = { hasAccess: false, isActive: false, trialEndsAt: null, currentPeriodEnd: null };
  state.hasProAccess = false;
});

function setup() {
  return render(
    <MemoryRouter>
      <AISubscriptionCard />
    </MemoryRouter>,
  );
}

describe('4.56F legacy AI notice matrix', () => {
  it('FREE: sin fila legacy no muestra tarjeta', () => {
    const { container } = setup();
    expect(container.textContent?.trim() ?? '').toBe('');
  });

  it('PRO: con plan vigente no muestra tarjeta aunque haya fila legacy', () => {
    state.ai = { hasAccess: true, isActive: false, trialEndsAt: '2099-12-31T23:59:59+00:00', currentPeriodEnd: null };
    state.hasProAccess = true;
    const { container } = setup();
    expect(container.textContent?.trim() ?? '').toBe('');
  });

  it('PLUS: con plan vigente no muestra tarjeta', () => {
    state.ai = { hasAccess: true, isActive: false, trialEndsAt: '2099-12-31T23:59:59+00:00', currentPeriodEnd: null };
    state.hasProAccess = true;
    setup();
    expect(screen.queryByText('Acceso histórico de LegalUp AI')).toBeNull();
  });

  it('REAL LEGACY ONLY: aviso compacto sin fecha sentinela literal ni duplicados', () => {
    state.ai = { hasAccess: true, isActive: false, trialEndsAt: '2099-12-31T23:59:59+00:00', currentPeriodEnd: null };
    const { container } = setup();
    // título + fila Origen comparten texto (diseño §13); el estado es único
    expect(screen.getAllByText('Acceso histórico de LegalUp AI')).toHaveLength(2);
    expect(
      screen.getByText('Tu cuenta conserva acceso proveniente de una modalidad anterior de LegalUp AI.'),
    ).toBeTruthy();
    expect(screen.getByText('Vigente')).toBeTruthy();
    // sin fecha sentinela literal ni palabra "temporal"
    expect(container.textContent).not.toMatch(/2099|31 de diciembre|temporal/i);
    // un único estado: "Vigente" aparece una sola vez
    expect(container.textContent?.match(/Vigente/g)?.length ?? 0).toBe(1);
    // sin framing comercial
    expect(container.textContent).not.toMatch(/Mi suscripción|trial|Essential|\$49\.900|5 días/i);
  });

  it('LEGACY + PRO: prima el plan actual, sin duplicar conceptos', () => {
    state.ai = { hasAccess: true, isActive: true, trialEndsAt: null, currentPeriodEnd: '2099-12-31T23:59:59+00:00' };
    state.hasProAccess = true;
    setup();
    expect(screen.queryByText('Acceso histórico de LegalUp AI')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar suscripción' })).toBeNull();
  });

  it('LEGACY + PLUS: prima el plan actual', () => {
    state.ai = { hasAccess: true, isActive: true, trialEndsAt: null, currentPeriodEnd: '2099-12-31T23:59:59+00:00' };
    state.hasProAccess = true;
    const { container } = setup();
    expect(container.textContent?.trim() ?? '').toBe('');
  });

  it('LEGACY activo pagado conserva cancelación y CTA canónico a casos', () => {
    state.ai = { hasAccess: true, isActive: true, trialEndsAt: null, currentPeriodEnd: '2027-06-30T23:59:59+00:00' };
    setup();
    expect(screen.getByRole('button', { name: 'Cancelar suscripción' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Usar LegalUp AI' }).getAttribute('href')).toBe(
      '/lawyer/cases',
    );
    expect(screen.getByText('30 de junio 2027')).toBeTruthy();
  });

  it('LEGACY con fecha real muestra fin del acceso', () => {
    state.ai = { hasAccess: true, isActive: false, trialEndsAt: '2026-11-15T23:59:59+00:00', currentPeriodEnd: null };
    setup();
    expect(screen.getByText('Fin del acceso')).toBeTruthy();
    expect(screen.getByText('15 de noviembre 2026')).toBeTruthy();
  });

  it('LEGACY expirado sin acceso no ofrece producto', () => {
    state.ai = { hasAccess: false, isActive: false, trialEndsAt: '2024-01-01T00:00:00+00:00', currentPeriodEnd: null };
    const { container } = setup();
    expect(container.textContent?.trim() ?? '').toBe('');
  });
});

describe('isSentinelEndDate', () => {
  it('detecta 2099 y fechas inválidas', () => {
    expect(isSentinelEndDate('2099-12-31T23:59:59+00:00')).toBe(true);
    expect(isSentinelEndDate('2099-01-01')).toBe(true);
    expect(isSentinelEndDate('2027-06-30')).toBe(false);
    expect(isSentinelEndDate(null)).toBe(false);
    expect(isSentinelEndDate('no-fecha')).toBe(false);
  });
});
