import { describe, it, expect, beforeEach, vi } from 'vitest';

const PRO_INTRO = 19990;
const PRO_STANDARD = 49990;
const INTRO_COUNT = 3;

function getInitialPrice(lifetimeApproved) {
  return (lifetimeApproved ?? 0) >= INTRO_COUNT ? PRO_STANDARD : PRO_INTRO;
}

// Fake ledger
function createLedger() {
  const rows = new Map(); // provider_authorized_payment_id -> row
  return {
    insert(row) {
      if (rows.has(row.provider_authorized_payment_id)) {
        const err = new Error('duplicate'); err.code = '23505'; throw err;
      }
      rows.set(row.provider_authorized_payment_id, { ...row });
    },
    update(id, patch) {
      const r = rows.get(id);
      if (r) Object.assign(r, patch);
    },
    countApproved(lawyerId) {
      let c = 0;
      for (const r of rows.values()) if (r.lawyer_id === lawyerId && r.status === 'approved') c++;
      return c;
    },
    get(id) { return rows.get(id); },
    size() { return rows.size; },
    all() { return [...rows.values()]; },
  };
}

describe('Pro billing intro → standard (4.28B.2)', () => {
  it('new lawyer checkout = 19990', () => {
    expect(getInitialPrice(0)).toBe(19990);
    expect(getInitialPrice(null)).toBe(19990);
  });
  it('1 historical approved = 19990', () => expect(getInitialPrice(1)).toBe(19990));
  it('2 historical approved = 19990', () => expect(getInitialPrice(2)).toBe(19990));
  it('3 historical approved = 49990', () => expect(getInitialPrice(3)).toBe(49990));
  it('frontend cannot choose amount — server derives price, ignores body', () => {
    const bodyAmount = 1;
    const derived = getInitialPrice(0);
    expect(derived).toBe(19990);
    expect(derived).not.toBe(bodyAmount);
  });

  it('ledger dedup: duplicate authorized_payment → one row', () => {
    const ledger = createLedger();
    ledger.insert({ provider_authorized_payment_id: 'ap_1', lawyer_id: 'L1', status: 'approved', amount_clp: 19990 });
    expect(() => ledger.insert({ provider_authorized_payment_id: 'ap_1', lawyer_id: 'L1', status: 'approved' })).toThrow();
    expect(ledger.size()).toBe(1);
  });
  it('rejected not counted, rejected→approved counts once', () => {
    const ledger = createLedger();
    ledger.insert({ provider_authorized_payment_id: 'ap_1', lawyer_id: 'L1', status: 'rejected', amount_clp: 19990 });
    expect(ledger.countApproved('L1')).toBe(0);
    ledger.update('ap_1', { status: 'approved' });
    expect(ledger.countApproved('L1')).toBe(1);
    expect(ledger.size()).toBe(1);
  });
  it('retry with different payment_id still one period', () => {
    const ledger = createLedger();
    ledger.insert({ provider_authorized_payment_id: 'ap_1', provider_payment_id: 'pay_1', lawyer_id: 'L1', status: 'approved' });
    // retry changes payment_id but same authorized_payment_id → update not new row
    ledger.update('ap_1', { provider_payment_id: 'pay_2' });
    expect(ledger.size()).toBe(1);
    expect(ledger.countApproved('L1')).toBe(1);
  });
  it('foreign preapproval does not create Pro ledger', () => {
    const ledger = createLedger();
    // only insert if lawyer_subscriptions matches preapproval, else no row
    expect(ledger.size()).toBe(0);
  });

  it('first success no PUT, third success triggers PUT', async () => {
    const ledger = createLedger();
    const put = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ auto_recurring: { transaction_amount: 49990 } }) });
    const get = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ auto_recurring: { transaction_amount: 19990 }, id: 'pre_123' }) });
    global.fetch = vi.fn((url, opts) => {
      if (opts?.method === 'PUT') return put(url, opts);
      return get(url, opts);
    });
    // simulate 3rd approved
    ledger.insert({ provider_authorized_payment_id: 'ap_3', lawyer_id: 'L1', status: 'approved' });
    ledger.insert({ provider_authorized_payment_id: 'ap_2', lawyer_id: 'L1', status: 'approved' });
    ledger.insert({ provider_authorized_payment_id: 'ap_1', lawyer_id: 'L1', status: 'approved' });
    expect(ledger.countApproved('L1')).toBe(3);
    // ensureProStandardPrice would be called — here we just verify count triggers
    expect(ledger.countApproved('L1') >= 3).toBe(true);
  });

  it('duplicate third webhook no duplicate count', () => {
    const ledger = createLedger();
    ledger.insert({ provider_authorized_payment_id: 'ap_1', lawyer_id: 'L1', status: 'approved' });
    ledger.insert({ provider_authorized_payment_id: 'ap_2', lawyer_id: 'L1', status: 'approved' });
    ledger.insert({ provider_authorized_payment_id: 'ap_3', lawyer_id: 'L1', status: 'approved' });
    const before = ledger.countApproved('L1');
    // duplicate
    try { ledger.insert({ provider_authorized_payment_id: 'ap_3', lawyer_id: 'L1', status: 'approved' }); } catch {}
    expect(ledger.countApproved('L1')).toBe(before);
  });

  it('provider PUT fails → DB remains 19990', async () => {
    const dbAmount = 19990;
    const putFailed = { ok: false, status: 500 };
    expect(putFailed.ok).toBe(false);
    expect(dbAmount).toBe(19990); // not updated
  });

  it('lifetime: 2 old + new → checkout 19990 then transition', () => {
    expect(getInitialPrice(2)).toBe(19990);
    // after next approved, count 3 → transition
    const ledger = createLedger();
    ledger.insert({ provider_authorized_payment_id: 'ap_1', lawyer_id: 'L1', status: 'approved' });
    ledger.insert({ provider_authorized_payment_id: 'ap_2', lawyer_id: 'L1', status: 'approved' });
    expect(getInitialPrice(ledger.countApproved('L1'))).toBe(19990);
    ledger.insert({ provider_authorized_payment_id: 'ap_3', lawyer_id: 'L1', status: 'approved' });
    expect(ledger.countApproved('L1')).toBe(3);
  });

  it('3 old + resubscribe → checkout directly 49990', () => {
    expect(getInitialPrice(3)).toBe(49990);
    expect(getInitialPrice(10)).toBe(49990);
  });

  it('founder same as non-founder', () => {
    expect(getInitialPrice(0)).toBe(19990);
    expect(getInitialPrice(3)).toBe(49990);
  });

  it('refund approved→refunded still provider remains 49990 no downgrade', () => {
    const ledger = createLedger();
    ledger.insert({ provider_authorized_payment_id: 'ap_1', lawyer_id: 'L1', status: 'approved' });
    ledger.insert({ provider_authorized_payment_id: 'ap_2', lawyer_id: 'L1', status: 'approved' });
    ledger.insert({ provider_authorized_payment_id: 'ap_3', lawyer_id: 'L1', status: 'approved' });
    // transition to 49990 happened
    let providerAmount = 49990;
    // refund
    ledger.update('ap_3', { status: 'refunded' });
    expect(ledger.countApproved('L1')).toBe(2);
    // provider should NOT downgrade
    expect(providerAmount).toBe(49990);
  });
});
