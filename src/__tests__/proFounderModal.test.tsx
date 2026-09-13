import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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
});
