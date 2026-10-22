import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mocks = {
  founderStatus: vi.fn(),
};

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
    }),
    useProSubscribe: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useProFounderStatus: (...args: unknown[]) => mocks.founderStatus(...args),
  };
});
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import { ProPricingModal } from '@/components/legalup-pro/ProPricingModal';

describe('4.32B.4 — modal reflects server-authoritative price track', () => {
  it('founder track shows 19.990 + slots remaining, no standard-only copy', () => {
    mocks.founderStatus.mockReturnValue({
      data: { isFounder: false, founderSlotsRemaining: 7, previewPriceClp: 19990, introPriceClp: 19990, standardPriceClp: 49990 },
    });
    render(<ProPricingModal open onOpenChange={() => {}} />);
    expect(screen.getAllByText(/\$19\.990/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Quedan 7 cupos Founder/)).toBeInTheDocument();
    expect(screen.queryByText(/Los cupos Founder ya fueron asignados/)).not.toBeInTheDocument();
  });

  it('standard track shows 49.990 and no intro promise', () => {
    mocks.founderStatus.mockReturnValue({
      data: { isFounder: false, founderSlotsRemaining: 0, previewPriceClp: 49990, introPriceClp: 19990, standardPriceClp: 49990 },
    });
    render(<ProPricingModal open onOpenChange={() => {}} />);
    expect(screen.getAllByText(/\$49\.990/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Los cupos Founder ya fueron asignados/)).toBeInTheDocument();
    expect(screen.queryByText(/Quedan \d+ cupos Founder/)).not.toBeInTheDocument();
  });

  it('loading state never promises 19.990', () => {
    mocks.founderStatus.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    render(<ProPricingModal open onOpenChange={() => {}} />);
    expect(screen.queryByText(/\$19\.990/)).not.toBeInTheDocument();
    expect(screen.getByText('Precio según disponibilidad')).toBeInTheDocument();
    expect(screen.queryByText(/Quedan \d+ cupos Founder/)).not.toBeInTheDocument();
  });

  it('error state never promises 19.990', () => {
    mocks.founderStatus.mockReturnValue({ isLoading: false, isError: true, data: undefined });
    render(<ProPricingModal open onOpenChange={() => {}} />);
    expect(screen.queryByText(/\$19\.990/)).not.toBeInTheDocument();
    expect(screen.getByText('Precio según disponibilidad')).toBeInTheDocument();
  });

  it('available slots + standard preview (post-intro founder) shows 49.990, not Founder 15', () => {
    mocks.founderStatus.mockReturnValue({
      data: { isFounder: true, founderSlotsRemaining: 5, previewPriceClp: 49990, introPriceClp: 19990, standardPriceClp: 49990 },
    });
    render(<ProPricingModal open onOpenChange={() => {}} />);
    expect(screen.queryByText(/\$19\.990/)).not.toBeInTheDocument();
    expect(screen.getByText(/Precio estándar aplicable a tu cuenta/)).toBeInTheDocument();
    expect(screen.queryByText(/Founder 15/)).not.toBeInTheDocument();
  });
});

describe('4.37C — modal benefits reflect current Pro product', () => {  beforeEach(() => {
    mocks.founderStatus.mockReturnValue({
      data: { isFounder: false, founderSlotsRemaining: 7, previewPriceClp: 19990, introPriceClp: 19990, standardPriceClp: 49990 },
    });
  });

  it('no unlimited-cases claim; explicit 20 active limit', () => {
    render(<ProPricingModal open onOpenChange={() => {}} />);
    expect(screen.queryByText(/casos ilimitados/i)).not.toBeInTheDocument();
    expect(screen.getByText('Hasta 20 casos activos')).toBeInTheDocument();
  });

  it('client, appointment, operation and integrated-AI claims', () => {
    render(<ProPricingModal open onOpenChange={() => {}} />);
    expect(screen.getByText('Clientes ilimitados')).toBeInTheDocument();
    expect(screen.getByText('Citas con tus clientes')).toBeInTheDocument();
    expect(screen.queryByText(/citas y pagos/i)).not.toBeInTheDocument();
    expect(screen.getByText('Gestión de tu operación')).toBeInTheDocument();
    expect(screen.getByText('LegalUp AI integrado')).toBeInTheDocument();
    expect(screen.queryByText(/AI limitado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/1 caso, 3 documentos/)).not.toBeInTheDocument();
  });

  it('founder price copy simplified without behavior change', () => {
    render(<ProPricingModal open onOpenChange={() => {}} />);
    expect(screen.getByText(/por tus primeros 3 cobros/)).toBeInTheDocument();
    expect(screen.getByText(/Desde el cuarto cobro, \$49\.990\/mes/)).toBeInTheDocument();
    expect(screen.getAllByText(/\$19\.990/).length).toBeGreaterThan(0);
  });
});

describe('4.37C — no unlimited-cases claim on current Pro surfaces', () => {
  it('ProPricingModal and Pro landing never advertise unlimited cases', () => {
    for (const p of [
      'src/components/legalup-pro/ProPricingModal.tsx',
      'src/pages/LegalUpPro.tsx',
    ]) {
      const c = readFileSync(resolve(p), 'utf-8');
      expect(c.toLowerCase()).not.toContain('casos ilimitados');
      expect(c.toLowerCase()).not.toContain('unlimited cases');
    }
  });

  it('no separate-AI-product framing remains on current Pro surfaces', () => {
    for (const p of [
      'src/components/legalup-pro/ProPricingModal.tsx',
      'src/pages/LegalUpPro.tsx',
    ]) {
      const c = readFileSync(resolve(p), 'utf-8');
      expect(c).not.toContain('AI Limited');
      expect(c).not.toContain('AI Full');
    }
  });
});
