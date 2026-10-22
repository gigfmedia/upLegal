import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  PRO_FOUNDER_MAX,
  PRO_INTRO_PRICE_CLP,
  PRO_STANDARD_PRICE_CLP,
  shouldAttemptFounderClaim,
  selectFounderCohort,
  decideCheckoutPrice,
  resolveProCheckoutPricing,
  validateReusableCheckout,
  PRO_RESERVATION_RESULTS,
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

describe('4.32B.4 — checkout price matrix (server-authoritative)', () => {
  it('Founder: 0/1/2 successful → 19990; 3/4+ → 49990', () => {
    for (const n of [0, 1, 2]) {
      expect(decideCheckoutPrice({ isFounder: true, lifetimeApproved: n, reservation: null })).toBe(19990);
    }
    for (const n of [3, 4, 10]) {
      expect(decideCheckoutPrice({ isFounder: true, lifetimeApproved: n, reservation: null })).toBe(49990);
    }
    expect(PRO_INTRO_PRICE_CLP).toBe(19990);
    expect(PRO_STANDARD_PRICE_CLP).toBe(49990);
  });

  it('Non-Founder: no slot → 49990; reserved slot follows the 3-payment intro rule', () => {
    for (const n of [0, 1, 2, 3, 10]) {
      expect(decideCheckoutPrice({ isFounder: false, lifetimeApproved: n, reservation: 'standard_no_slot' })).toBe(49990);
      expect(decideCheckoutPrice({ isFounder: false, lifetimeApproved: n, reservation: null })).toBe(49990);
    }
    for (const n of [0, 1, 2]) {
      expect(decideCheckoutPrice({ isFounder: false, lifetimeApproved: n, reservation: 'reserved' })).toBe(19990);
    }
    for (const n of [3, 4, 10]) {
      expect(decideCheckoutPrice({ isFounder: false, lifetimeApproved: n, reservation: 'reserved' })).toBe(49990);
    }
  });

  it('pure helper alone still falls back to standard for an unknown reservation', () => {
    // The route must never rely on this fallback: resolveProCheckoutPricing
    // turns a failed/unknown RPC into a controlled error (tested below).
    expect(decideCheckoutPrice({ isFounder: false, lifetimeApproved: 0, reservation: undefined })).toBe(49990);
  });
});

describe('checkout pricing resolution — RPC is authoritative', () => {
  it('exposes only the three known reservation results', () => {
    expect(PRO_RESERVATION_RESULTS).toEqual(['reserved', 'already_founder', 'standard_no_slot']);
  });

  it('RPC error → error with FOUNDER_RESERVATION_FAILED (never a price)', () => {
    const r = resolveProCheckoutPricing({
      isFounder: false,
      lifetimeApproved: 0,
      reservationResult: { data: null, error: { message: 'db down' } },
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('FOUNDER_RESERVATION_FAILED');
    expect(r.amountClp).toBeUndefined();
  });

  it('missing/unknown RPC result → FOUNDER_RESERVATION_INVALID (never a price)', () => {
    for (const data of [null, undefined, '', 'boom', 42]) {
      const r = resolveProCheckoutPricing({
        isFounder: false,
        lifetimeApproved: 0,
        reservationResult: { data, error: null },
      });
      expect(r.ok).toBe(false);
      expect(r.code).toBe('FOUNDER_RESERVATION_INVALID');
      expect(r.amountClp).toBeUndefined();
    }
  });

  it('reserved non-founder → intro price + Founder track', () => {
    const r = resolveProCheckoutPricing({
      isFounder: false,
      lifetimeApproved: 0,
      reservationResult: { data: 'reserved', error: null },
    });
    expect(r).toMatchObject({ ok: true, amountClp: 19990, isFounderSlot: true, founderTrack: true });
  });

  it('reserved non-founder with 3 approved payments → standard price but keeps Founder track', () => {
    const r = resolveProCheckoutPricing({
      isFounder: false,
      lifetimeApproved: 3,
      reservationResult: { data: 'reserved', error: null },
    });
    expect(r).toMatchObject({ ok: true, amountClp: 49990, isFounderSlot: true, founderTrack: true });
  });

  it('already_founder respects lifetime approved payments', () => {
    for (const [n, price] of [[0, 19990], [2, 19990], [3, 49990], [4, 49990]]) {
      const r = resolveProCheckoutPricing({
        isFounder: true,
        lifetimeApproved: n,
        reservationResult: { data: 'already_founder', error: null },
      });
      expect(r).toMatchObject({ ok: true, amountClp: price, isFounderSlot: true, founderTrack: true });
    }
  });

  it('standard_no_slot → standard price, no Founder track', () => {
    const r = resolveProCheckoutPricing({
      isFounder: false,
      lifetimeApproved: 0,
      reservationResult: { data: 'standard_no_slot', error: null },
    });
    expect(r).toMatchObject({ ok: true, amountClp: 49990, isFounderSlot: false, founderTrack: false });
  });

  it('invalid lifetime count is an error, never a default', () => {
    for (const n of [undefined, null, 'x', -1, NaN]) {
      const r = resolveProCheckoutPricing({
        isFounder: false,
        lifetimeApproved: n,
        reservationResult: { data: 'reserved', error: null },
      });
      expect(r.ok).toBe(false);
      expect(r.code).toBe('LIFETIME_COUNT_INVALID');
    }
  });
});

describe('pending checkout reuse coherence', () => {
  const proAmounts = [19990, 49990];

  it('accepts a coherent Pro Founder intro checkout', () => {
    expect(validateReusableCheckout({ amountClp: 19990, isFounder: true, providerAmount: 19990, allowedAmounts: proAmounts }))
      .toMatchObject({ ok: true, amountClp: 19990 });
  });

  it('accepts standard (non-founder) and post-intro founder checkouts', () => {
    expect(validateReusableCheckout({ amountClp: 49990, isFounder: false, providerAmount: 49990, allowedAmounts: proAmounts }).ok).toBe(true);
    expect(validateReusableCheckout({ amountClp: 49990, isFounder: true, providerAmount: 49990, allowedAmounts: proAmounts }).ok).toBe(true);
  });

  it('rejects intro amount without Founder state', () => {
    const r = validateReusableCheckout({ amountClp: 19990, isFounder: false, providerAmount: 19990, allowedAmounts: proAmounts });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('PENDING_FOUNDER_STATE_INVALID');
  });

  it('rejects provider/stored amount mismatch (never silently reprice)', () => {
    const r = validateReusableCheckout({ amountClp: 19990, isFounder: true, providerAmount: 49990, allowedAmounts: proAmounts });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('PENDING_PRICE_MISMATCH');
  });

  it('rejects missing provider amount', () => {
    for (const providerAmount of [undefined, null, '']) {
      const r = validateReusableCheckout({ amountClp: 19990, isFounder: true, providerAmount, allowedAmounts: proAmounts });
      expect(r.ok).toBe(false);
      expect(r.code).toBe('PROVIDER_AMOUNT_MISSING');
    }
  });

  it('rejects amounts outside the target plan catalog', () => {
    const r = validateReusableCheckout({ amountClp: 39990, isFounder: true, providerAmount: 39990, allowedAmounts: proAmounts });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('PENDING_AMOUNT_INVALID');
  });

  it('Plus only accepts 79.990 and is founder-blind', () => {
    expect(validateReusableCheckout({ amountClp: 79990, isFounder: false, providerAmount: 79990, allowedAmounts: [79990] }).ok).toBe(true);
    expect(validateReusableCheckout({ amountClp: 19990, isFounder: true, providerAmount: 19990, allowedAmounts: [79990] }).code).toBe('PENDING_AMOUNT_INVALID');
  });
});

describe('4.32B.4 — reservation SQL semantics (source assertions)', () => {
  const sql = readFileSync(resolve('supabase/migrations/20260921000000_pro_founder_reservations.sql'), 'utf-8');

  it('serializes concurrent claims (advisory lock)', () => {
    expect(sql).toContain('pg_advisory_xact_lock');
  });

  it('capacity counts claimed founders PLUS valid reservations (UNION)', () => {
    expect(sql).toContain('is_founder = true');
    expect(sql).toContain('expires_at > now()');
    expect(sql).toContain('UNION');
    expect(sql).toContain('>= 15');
  });

  it('same-lawyer retry renews instead of consuming a new slot', () => {
    expect(sql).toContain('ON CONFLICT (lawyer_id)');
  });

  it('expired reservations recycle (no permanent squat)', () => {
    expect(sql).toContain('DELETE FROM public.pro_founder_reservations WHERE expires_at <=');
  });

  it('unknown/non-lawyer profiles can never reserve', () => {
    expect(sql).toContain("p.role = 'lawyer'");
    expect(sql).toContain('standard_no_slot');
  });

  it('profiles.is_founder cannot be self-granted (trigger guard)', () => {
    expect(sql).toContain('protect_profiles_is_founder');
    expect(sql).toContain('service_role');
    expect(sql).toContain('BEFORE INSERT OR UPDATE');
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

  it('checkout never reads a client-supplied price', () => {
    const start = server.indexOf("app.post('/api/pro/subscribe'");
    const end = server.indexOf("app.post('/api/pro/subscription/cancel'");
    const block = server.slice(start, end);
    // 4.57B: the handler may read req.body.plan (tier selection, fail-closed
    // via resolveCheckoutPlanCode) but never any client-supplied price.
    expect(block).not.toContain('req.body.price');
    expect(block).not.toContain('req.body.amount');
    expect(block).not.toContain('req.body.transaction_amount');
    expect(block).toContain('resolveCheckoutPlanCode');
    expect(block).toContain('transaction_amount: initialPrice');
  });

  it('profiles.is_founder cannot be self-granted via RLS (trigger guard)', () => {
    const sql = readFileSync(
      resolve('supabase/migrations/20260921000000_pro_founder_reservations.sql'),
      'utf-8'
    );
    // Trigger fires on both INSERT and UPDATE of the flag...
    expect(sql).toContain('BEFORE INSERT OR UPDATE');
    // ...forces the flag for non-service JWTs...
    expect(sql).toContain("IS DISTINCT FROM 'service_role'");
    expect(sql).toContain('NEW.is_founder := false');
    expect(sql).toContain('NEW.is_founder := OLD.is_founder');
    // ...while service_role (server/webhooks) and migrations stay unaffected.
    expect(sql).toContain('pro_founder_reservations');
  });
});
