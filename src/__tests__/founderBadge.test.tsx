import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));

import { LawyerCard } from '@/components/LawyerCard';
import { RelatedLawyerCard } from '@/components/blog/RelatedLawyerCard';

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const baseLawyer = {
  id: 'lawyer-1',
  name: 'María Test',
  display_name: 'María Test',
  specialties: ['Derecho Civil'],
  rating: 4.5,
  reviews: 3,
  location: 'Santiago',
  cases: 5,
  hourlyRate: 30000,
  consultationPrice: 30000,
  image: '',
  bio: 'Abogada con experiencia.',
  verified: true,
  availability: { availableToday: true, availableThisWeek: true, quickResponse: false, emergencyConsultations: false },
};

describe('4.32B.2 — Founder badge', () => {
  it('Founder LawyerCard shows badge', () => {
    render(
      <Providers>
        <LawyerCard lawyer={{ ...baseLawyer, is_founder: true }} />
      </Providers>
    );
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });

  it('Non-Founder LawyerCard shows no badge', () => {
    render(
      <Providers>
        <LawyerCard lawyer={{ ...baseLawyer, is_founder: false }} />
      </Providers>
    );
    expect(screen.queryByText('Founder')).not.toBeInTheDocument();
  });

  it('Undefined founder field shows no badge', () => {
    const { is_founder: _omit, ...rest } = { ...baseLawyer, is_founder: true as boolean };
    void _omit;
    render(
      <Providers>
        <LawyerCard lawyer={rest} />
      </Providers>
    );
    expect(screen.queryByText('Founder')).not.toBeInTheDocument();
  });

  it('Founder RelatedLawyerCard shows badge; non-founder does not', () => {
    const { unmount } = render(
      <Providers>
        <RelatedLawyerCard lawyer={{ ...baseLawyer, id: 'a', name: 'A B', is_founder: true } as never} />
      </Providers>
    );
    expect(screen.getByText('Founder')).toBeInTheDocument();
    unmount();
    render(
      <Providers>
        <RelatedLawyerCard lawyer={{ ...baseLawyer, id: 'b', name: 'C D', is_founder: false } as never} />
      </Providers>
    );
    expect(screen.queryByText('Founder')).not.toBeInTheDocument();
  });
});

describe('4.32B.2 — Founder billing safety (profiles.is_founder)', () => {
  const server = readFileSync(resolve('server.mjs'), 'utf-8');
  const gate = readFileSync(
    resolve('supabase/migrations/20260917000000_pro_first_case_free.sql'),
    'utf-8'
  );

  it('price selection has zero profiles.is_founder reads', () => {
    const idx = server.indexOf('let initialPrice = PRO_INTRO_PRICE_CLP');
    const block = server.slice(idx, idx + 600);
    expect(block).not.toContain('profiles');
    expect(block).not.toContain('is_founder');
  });

  it('first-case gate has zero is_founder reads', () => {
    expect(gate).not.toContain('is_founder');
    expect(gate).not.toContain('founder');
  });

  it('profiles.is_founder reads are limited to founder-track price decision', () => {
    // 4.32B.4: the only legitimate server read is the checkout price branch
    // (existing Founder → intro-count rule). No other billing/entitlement read.
    const reads = server.split('\n').filter((l) => l.includes('prof?.is_founder'));
    expect(reads.length).toBeGreaterThan(0);
    expect(reads.length).toBeLessThanOrEqual(2);
    for (const line of reads) {
      expect(line).toMatch(/isFounder|initialPrice|founderTrack/);
    }
  });

  it('server never writes profiles.is_founder (only claim/reconcile SQL do)', () => {
    expect(server).not.toMatch(/SET is_founder/i);
    expect(server).not.toMatch(/is_founder:\s*true/);
  });
});
