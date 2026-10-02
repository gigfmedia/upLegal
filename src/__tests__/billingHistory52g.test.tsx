import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  formatProPaymentAmount,
  formatProPaymentDate,
  formatProPaymentPlan,
  proPaymentStatusMeta,
} from '@/components/lawyer/ProPaymentHistory';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

const historyState = vi.hoisted(() => ({
  payments: [] as Record<string, unknown>[],
  loading: false,
  error: null as string | null,
}));

vi.mock('@/hooks/useProPaymentHistory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useProPaymentHistory')>();
  return {
    ...actual,
    useProPaymentHistory: () => ({
      payments: historyState.payments,
      loading: historyState.loading,
      error: historyState.error,
      initialLimit: 10,
    }),
  };
});
vi.mock('@/hooks/useProSubscription', () => ({
  useProSubscription: () => ({ hasProAccess: true, status: 'active', currentPeriodEnd: null, isLoading: false }),
}));
vi.mock('@/hooks/useCaseEntitlement', () => ({
  useCaseEntitlement: () => ({ entitlement: { activeCaseCount: 1, activeCaseLimit: 20, freeCaseConsumed: true }, loading: false }),
}));
vi.mock('@/components/legalup-pro/ProPricingModal', () => ({
  ProPricingModal: () => null,
}));

import { ProPaymentHistory } from '@/components/lawyer/ProPaymentHistory';
import PlanPage from '@/pages/lawyer/PlanPage';

const P = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  paid_at: new Date(2026, 8, 30, 12).toISOString(),
  amount_clp: 19990,
  currency: 'CLP',
  status: 'approved',
  provider_payment_id: 'PAY1',
  provider_authorized_payment_id: 'AUTH1',
  plan: 'pro',
  ...over,
});

describe('FASE 5.2G — mapeo de estados y formato', () => {
  it('1. approved → Pagado', () => {
    expect(proPaymentStatusMeta('approved')).toMatchObject({ label: 'Pagado' });
  });
  it('2. rejected/refused → Fallido', () => {
    expect(proPaymentStatusMeta('rejected').label).toBe('Fallido');
    expect(proPaymentStatusMeta('refused').label).toBe('Fallido');
  });
  it('3. pending → Pendiente', () => {
    expect(proPaymentStatusMeta('pending').label).toBe('Pendiente');
  });
  it('4. refunded → Reembolsado; desconocido no rompe', () => {
    expect(proPaymentStatusMeta('refunded').label).toBe('Reembolsado');
    expect(proPaymentStatusMeta('weird_status').label).toBe('Weird status');
  });
  it('5. monto CLP sin decimales; otra moneda segura', () => {
    expect(formatProPaymentAmount(19990, 'CLP')).toBe('$19.990');
    expect(formatProPaymentAmount(100, 'USD')).toContain('USD');
  });
  it('6. fecha en español', () => {
    expect(formatProPaymentDate(new Date(2026, 8, 30, 12).toISOString())).toBe('30 sep 2026');
  });
  it('8. plan NULL histórico → LegalUp Pro', () => {
    expect(formatProPaymentPlan(null)).toBe('LegalUp Pro');
    expect(formatProPaymentPlan('pro')).toBe('LegalUp Pro');
  });
});

describe('FASE 5.2G — componente', () => {
  it('rows con fecha, plan, monto y estado; ejemplo approved + failed', () => {
    historyState.payments = [P(), P({ id: 'p2', status: 'rejected', paid_at: new Date(2026, 10, 30, 12).toISOString() })];
    render(<ProPaymentHistory />);
    expect(screen.getByText('30 sep 2026')).toBeInTheDocument();
    expect(screen.getByText('30 nov 2026')).toBeInTheDocument();
    expect(screen.getAllByText('$19.990')).toHaveLength(2);
    expect(screen.getByText('Pagado')).toBeInTheDocument();
    expect(screen.getByText('Fallido')).toBeInTheDocument();
  });
  it('7. orden desc por paid_at (el hook ordena; acá se respeta el orden dado)', () => {
    historyState.payments = [
      P({ id: 'new', paid_at: new Date(2026, 9, 30, 12).toISOString() }),
      P({ id: 'old', paid_at: new Date(2026, 8, 30, 12).toISOString() }),
    ];
    const { container } = render(<ProPaymentHistory />);
    const items = Array.from(container.querySelectorAll('li')).map((li) => li.textContent);
    expect(items[0]).toContain('30 oct 2026');
    expect(items[1]).toContain('30 sep 2026');
  });
  it('9. empty state', () => {
    historyState.payments = [];
    render(<ProPaymentHistory />);
    expect(screen.getByText('Aún no tienes pagos registrados.')).toBeInTheDocument();
  });
  it('10. error no rompe y no se disfraza de empty', () => {
    historyState.error = 'boom';
    historyState.payments = [];
    render(<ProPaymentHistory />);
    expect(screen.getByText('No pudimos cargar tu historial de pagos.')).toBeInTheDocument();
    expect(screen.queryByText('Aún no tienes pagos registrados.')).not.toBeInTheDocument();
    historyState.error = null;
  });
  it('11. más de 10 muestra Ver historial completo y expande', () => {
    historyState.payments = Array.from({ length: 12 }, (_, i) => P({ id: `p${i}`, title: undefined }));
    render(<ProPaymentHistory />);
    expect(screen.getAllByText('$19.990')).toHaveLength(10);
    fireEvent.click(screen.getByText('Ver historial completo'));
    expect(screen.getAllByText('$19.990')).toHaveLength(12);
  });
  it('12. sin factura/comprobante/periodo', () => {
    historyState.payments = [P()];
    const { container } = render(<ProPaymentHistory />);
    const text = (container.textContent || '').toLowerCase();
    expect(text).not.toMatch(/comprobante|factura|boleta|descargar|periodo|período/);
    const src = read('src/components/lawyer/ProPaymentHistory.tsx');
    expect(src).not.toMatch(/receipt_url|invoice|factura|comprobante|period_start|period_end|boleta|descargar/i);
  });
});

describe('FASE 5.2G — seguridad y página', () => {
  it('13. RLS como autoridad: eq lawyer_id del usuario, sin service_role ni IDs arbitrarios', () => {
    const src = read('src/hooks/useProPaymentHistory.ts');
    expect(src).toContain(".eq('lawyer_id', user.id)");
    expect(src).toContain(".order('paid_at'");
    expect(src).not.toMatch(/service_role|serviceRole|SERVICE_ROLE/);
    expect(src).not.toMatch(/lawyer_id:\s*(?!user\.id)/);
  });
  it('Plan PRO muestra historial debajo del estado', () => {
    historyState.payments = [P()];
    render(<MemoryRouter><PlanPage /></MemoryRouter>);
    expect(screen.getByText('Historial de pagos')).toBeInTheDocument();
    expect(screen.getByText('Pagado')).toBeInTheDocument();
  });
});
