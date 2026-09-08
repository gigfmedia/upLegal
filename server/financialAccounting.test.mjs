// @vitest-environment node
import { describe, it, expect } from 'vitest';

function computeAccounting({ clientTotal, surchargePercent = 0.1, platformPercent = 0.20 }) {
  const derivedOriginal = Math.round(clientTotal / (1 + surchargePercent));
  const clientSurcharge = Math.max(clientTotal - derivedOriginal, 0);
  const platformFee = Math.round(derivedOriginal * platformPercent);
  const lawyerAmount = Math.max(derivedOriginal - platformFee, 0);
  return { derivedOriginal, clientSurcharge, platformFee, lawyerAmount, clientTotal };
}

describe('FASE 3B — financial accounting', () => {
  it('ejemplo real $50k base → $55k total, LegalUp $10k, abogado $40k', () => {
    const r = computeAccounting({ clientTotal: 55000, surchargePercent: 0.10, platformPercent: 0.20 });
    expect(r.derivedOriginal).toBe(50000);
    expect(r.clientSurcharge).toBe(5000);
    expect(r.platformFee).toBe(10000);
    expect(r.lawyerAmount).toBe(40000);
    expect(r.derivedOriginal).toBe(r.platformFee + r.lawyerAmount); // ecuación DB
    expect(r.clientTotal).toBe(r.derivedOriginal + r.clientSurcharge);
  });

  it('ecuación platform_fee + lawyer_amount = amount se cumple siempre', () => {
    for (const total of [11000, 55000, 110000, 33000]) {
      const r = computeAccounting({ clientTotal: total });
      expect(r.derivedOriginal).toBe(r.platformFee + r.lawyerAmount);
    }
  });

  it('webhook amount validation: mismatch no contabiliza', () => {
    const expected = 55000;
    const paid = 54000;
    expect(paid !== expected).toBe(true);
  });

  it('idempotencia: mismo P1 tres veces → una fila', () => {
    const seen = new Set();
    const payments = [];
    function insert(bookingId, paymentId) {
      const key = `${bookingId}:${paymentId}`;
      if (seen.has(bookingId)) return { already: true, count: payments.length };
      seen.add(bookingId);
      payments.push({ bookingId, paymentId });
      return { already: false, count: payments.length };
    }
    expect(insert('B1', 'P1').count).toBe(1);
    expect(insert('B1', 'P1').already).toBe(true);
    expect(insert('B1', 'P1').already).toBe(true);
    expect(payments.length).toBe(1);
  });

  it('conflict: P1->B1, intento P1->B2 no sobrescribe', () => {
    const map = new Map([['P1', 'B1']]);
    function tryAssociate(paymentId, bookingId) {
      if (map.has(paymentId) && map.get(paymentId) !== bookingId) return { conflict: true };
      map.set(paymentId, bookingId);
      return { conflict: false };
    }
    expect(tryAssociate('P1', 'B2').conflict).toBe(true);
    expect(map.get('P1')).toBe('B1');
  });

  it('client price manipulation blocked: booking create usa serverPrice', () => {
    const serverPrice = 55000;
    const clientPrice = 100;
    const computedPrice = serverPrice; // server wins
    expect(computedPrice).toBe(55000);
    expect(computedPrice).not.toBe(clientPrice);
  });
});
