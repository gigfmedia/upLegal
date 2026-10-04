import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mutatePro = vi.fn();
const mutatePlus = vi.fn();
let subState: Record<string, unknown> = {};

vi.mock('@/hooks/useProSubscription', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useProSubscription')>();
  return {
    ...actual,
    useProSubscription: () => ({
      status: null,
      hasProAccess: false,
      isActive: false,
      isPastDue: false,
      subscription: null,
      currentPeriodEnd: null,
      canonicalPlan: null,
      isPlus: false,
      ...subState,
    }),
    useProSubscribe: (plan: string) => ({
      mutateAsync: plan === 'plus' ? mutatePlus : mutatePro,
      isPending: false,
    }),
    useProFounderStatus: () => ({ data: null }),
  };
});
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import { ProPricingModal } from '@/components/legalup-pro/ProPricingModal';

function renderModal(props: Record<string, unknown> = {}) {
  return render(<ProPricingModal open onOpenChange={() => {}} {...props} />);
}

describe('4.61A selector Pro/Plus', () => {
  beforeEach(() => {
    subState = {};
    mutatePro.mockReset();
    mutatePlus.mockReset();
    mutatePro.mockResolvedValue({ initPoint: 'https://mp.example/pro' });
    mutatePlus.mockResolvedValue({ initPoint: 'https://mp.example/plus' });
  });

  it('renderiza ambos planes con precios correctos', () => {
    renderModal();
    expect(screen.getByText('LegalUp Pro')).toBeDefined();
    expect(screen.getByText('LegalUp Plus')).toBeDefined();
    const text = screen.getByRole('dialog').textContent ?? '';
    expect(text).toContain('$49.990');
    expect(text).toContain('$79.990');
  });

  it('límites comerciales exactos en cada tarjeta', () => {
    renderModal();
    for (const line of [
      'Hasta 20 casos activos',
      'Hasta 50 documentos actuales',
      '300 consultas IA / mes (caso y documentos)',
      '40 análisis de documentos / mes',
      '10 investigaciones jurídicas / mes',
      '30 redacciones asistidas / mes',
      'Hasta 40 casos activos',
      'Hasta 150 documentos actuales',
      '750 consultas IA / mes (caso y documentos)',
      '100 análisis de documentos / mes',
      '25 investigaciones jurídicas / mes',
      '75 redacciones asistidas / mes',
    ]) {
      expect(screen.getByText(line)).toBeDefined();
    }
    expect(screen.getByText(/Mismas herramientas que Pro, con mayor capacidad/)).toBeDefined();
  });

  it('default genérico: Pro seleccionado; targetPlan plus: Plus', () => {
    const { unmount } = renderModal();
    expect(screen.getByRole('button', { name: 'Activar LegalUp Pro' })).toBeDefined();
    unmount();
    renderModal({ targetPlan: 'plus' });
    expect(screen.getByRole('button', { name: 'Activar LegalUp Plus' })).toBeDefined();
  });

  it('switch Pro→Plus→Pro actualiza el CTA', () => {
    renderModal();
    fireEvent.click(screen.getByRole('radio', { name: 'LegalUp Plus' }));
    expect(screen.getByRole('button', { name: 'Activar LegalUp Plus' })).toBeDefined();
    fireEvent.click(screen.getByRole('radio', { name: 'LegalUp Pro' }));
    expect(screen.getByRole('button', { name: 'Activar LegalUp Pro' })).toBeDefined();
  });

  it('checkout Pro usa identificador canónico pro; Plus usa plus', async () => {
    const { unmount } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Activar LegalUp Pro' }));
    await screen.findByText('Procesando…');
    expect(mutatePro).toHaveBeenCalledTimes(1);
    expect(mutatePlus).not.toHaveBeenCalled();
    unmount();

    renderModal({ targetPlan: 'plus' });
    fireEvent.click(screen.getByRole('button', { name: 'Activar LegalUp Plus' }));
    await screen.findByText('Procesando…');
    expect(mutatePlus).toHaveBeenCalledTimes(1);
  });

  it('Pro actual: Plan actual + upgrade a Plus accionable', () => {
    subState = { canonicalPlan: 'pro', hasProAccess: true, isActive: true };
    renderModal();
    expect(screen.getByText('Plan actual')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cambiar a LegalUp Plus' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Activar LegalUp Pro' })).toBeNull();
  });

  it('Plus actual: Plus actual, sin downgrade accionable', () => {
    subState = { canonicalPlan: 'plus', hasProAccess: true, isActive: true, isPlus: true };
    renderModal();
    expect(screen.getByText('Plan actual')).toBeDefined();
    expect(screen.queryByRole('button', { name: /LegalUp (Pro|Plus)/ })).toBeNull();
  });
});
