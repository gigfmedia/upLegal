import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  PRO_FOUNDER_MAX,
  shouldAttemptFounderClaim,
  selectFounderCohort,
} from './proFounder.mjs';

const row = (lawyer_id, paid_at, ap_id, status = 'approved') => ({
  lawyer_id,
  paid_at,
  provider_authorized_payment_id: ap_id,
  status,
});

describe('4.32B.3 — founder claim gating', () => {
  it('only approved payments qualify', () => {
    expect(shouldAttemptFounderClaim('approved')).toBe(true);
    for (const s of ['pending', 'failed', 'rejected', 'cancelled', 'refunded', null, undefined, '']) {
      expect(shouldAttemptFounderClaim(s)).toBe(false);
    }
  });

  it('max slots is 15', () => {
    expect(PRO_FOUNDER_MAX).toBe(15);
  });
});

describe('4.32B.3 — cohort selection (deterministic)', () => {
  it('empty ledger → empty cohort', () => {
    expect(selectFounderCohort([])).toEqual({ founderIds: [], excludedIds: [] });
  });

  it('non-approved rows never count', () => {
    const rows = [row('A', '2026-01-01T00:00:00Z', 'ap-1', 'pending'), row('B', '2026-01-02T00:00:00Z', 'ap-2', 'rejected')];
    expect(selectFounderCohort(rows)).toEqual({ founderIds: [], excludedIds: [] });
  });

  it('webhook replay (same authorized_payment twice) counts once', () => {
    const rows = [row('A', '2026-01-01T00:00:00Z', 'ap-1'), row('A', '2026-01-01T00:00:00Z', 'ap-1')];
    const { founderIds } = selectFounderCohort(rows);
    expect(founderIds).toEqual(['A']);
  });

  it('same lawyer, many payments → one slot', () => {
    const rows = [1, 2, 3, 4].map((i) => row('A', `2026-0${i}-01T00:00:00Z`, `ap-${i}`));
    const { founderIds, excludedIds } = selectFounderCohort(rows);
    expect(founderIds).toEqual(['A']);
    expect(excludedIds).toEqual([]);
  });

  it('20 distinct payers → earliest 15 founders, 5 excluded', () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      row(`L${String(i + 1).padStart(2, '0')}`, `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`, `ap-${i + 1}`)
    );
    const { founderIds, excludedIds } = selectFounderCohort(rows);
    expect(founderIds).toHaveLength(15);
    expect(founderIds[0]).toBe('L01');
    expect(founderIds[14]).toBe('L15');
    expect(excludedIds).toEqual(['L16', 'L17', 'L18', 'L19', 'L20']);
  });

  it('tied timestamps resolve deterministically by provider id', () => {
    const rows = [row('B', '2026-01-01T00:00:00Z', 'ap-b'), row('A', '2026-01-01T00:00:00Z', 'ap-a')];
    const first = selectFounderCohort(rows, 1);
    const second = selectFounderCohort([...rows].reverse(), 1);
    expect(first.founderIds).toEqual(second.founderIds);
    expect(first.founderIds).toEqual(['A']);
  });

  it('unordered input still yields chronological cohort', () => {
    const rows = [row('C', '2026-03-01T00:00:00Z', 'ap-3'), row('A', '2026-01-01T00:00:00Z', 'ap-1'), row('B', '2026-02-01T00:00:00Z', 'ap-2')];
    expect(selectFounderCohort(rows).founderIds).toEqual(['A', 'B', 'C']);
  });

  it('$19.990 first payment does not imply founder (slot 16+ pays intro too)', () => {
    const rows = Array.from({ length: 16 }, (_, i) =>
      row(`L${i + 1}`, `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`, `ap-${i + 1}`)
    );
    const { founderIds, excludedIds } = selectFounderCohort(rows);
    expect(founderIds).not.toContain('L16');
    expect(excludedIds).toContain('L16');
  });
});

describe('4.32B.3 — webhook integration (source assertions)', () => {
  const server = readFileSync(resolve('server.mjs'), 'utf-8');

  it('approved branch attempts atomic founder claim after durable ledger', () => {
    // Anchor on the Pro claim call (the AI handler has its own approved branch).
    const claimIdx = server.indexOf('claim_pro_founder_slot');
    expect(claimIdx).toBeGreaterThan(-1);
    const before = server.slice(Math.max(0, claimIdx - 3000), claimIdx);
    expect(before).toContain('pro_subscription_payments');
    expect(before).toContain("if (payment.status === 'approved')");
  });

  it('founder claim is non-blocking (payment never fails on founder error)', () => {
    const idx = server.indexOf('claim_pro_founder_slot');
    const block = server.slice(Math.max(0, idx - 200), idx + 1200);
    expect(block).toContain('try');
    expect(block).toContain('catch');
  });

  it('no code path unsets profiles.is_founder (cancellation/reactivation preserve)', () => {
    expect(server).not.toMatch(/is_founder\s*=\s*false/);
    expect(server).not.toMatch(/is_founder:\s*false/);
  });

  it('claim RPC passes the subscription lawyer (never client input)', () => {
    expect(server).toContain('p_lawyer_id');
    expect(server).toContain('subscription.lawyer_id');
  });
});
