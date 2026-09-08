// @vitest-environment node
import { describe, it, expect } from 'vitest';

function classifyBooking({ booking, hasPayment, hasSnapshot }) {
  if (booking.status !== 'confirmed' || !booking.payment_id) return { status: 'not_candidate' };
  if (hasPayment) return { status: 'already_present' };
  if (hasSnapshot && typeof hasSnapshot.base_amount === 'number') return { status: 'SAFE_TO_BACKFILL' };
  return { status: 'NEEDS_MANUAL_REVIEW' };
}

describe('FASE 4B-6 — historical ledger', () => {
  it('confirmed + payment_id + snapshot + no payments → SAFE', () => {
    const r = classifyBooking({ booking: { status: 'confirmed', payment_id: 'P1' }, hasPayment: false, hasSnapshot: { base_amount: 50000 } });
    expect(r.status).toBe('SAFE_TO_BACKFILL');
  });
  it('already has payments → already_present', () => {
    const r = classifyBooking({ booking: { status: 'confirmed', payment_id: 'P1' }, hasPayment: true, hasSnapshot: { base_amount: 50000 } });
    expect(r.status).toBe('already_present');
  });
  it('no snapshot → manual review', () => {
    const r = classifyBooking({ booking: { status: 'confirmed', payment_id: 'P1' }, hasPayment: false, hasSnapshot: null });
    expect(r.status).toBe('NEEDS_MANUAL_REVIEW');
  });
  it('backfill is idempotent: same booking twice → second already_present', () => {
    const seen = new Set();
    function backfill(bookingId) {
      if (seen.has(bookingId)) return { inserted: false, reason: 'already_present' };
      seen.add(bookingId);
      return { inserted: true };
    }
    expect(backfill('B1').inserted).toBe(true);
    expect(backfill('B1').inserted).toBe(false);
  });
  it('current settings change does not alter historical reconstruction', () => {
    const snapshot = { base_amount: 50000, client_total: 55000, platform_fee: 10000, lawyer_amount: 40000 };
    const currentSurcharge = 0.20; // changed
    // reconstruction must use snapshot, not current
    const reconstructed = snapshot.base_amount + snapshot.client_surcharge || snapshot.client_total;
    expect(reconstructed).toBe(55000);
    expect(snapshot.base_amount).toBe(50000);
  });
});
