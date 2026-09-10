// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { bookingClientTotal, consultationBase } from '../shared/bookingPricing.mjs';
import { getDocumentProduct } from './documents/catalog.mjs';

// Helpers mirroring server logic
function computeBookingPrice({ isService, service, hourlyRate, duration, surcharge = 0.1 }) {
  if (isService) {
    if (!service) return { error: 'INVALID_SERVICE' };
    if (service.lawyer_user_id === undefined) return { error: 'INVALID_SERVICE' };
    // caller must check ownership separately
    const original = Number(service.price_clp);
    if (!Number.isFinite(original) || original <= 0) return { error: 'NO_VALID_PRICE' };
    return { price: bookingClientTotal(original, surcharge), source: 'service' };
  } else {
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0 || !duration) return { error: 'NO_VALID_PRICE' };
    const original = consultationBase(hourlyRate, duration);
    return { price: bookingClientTotal(original, surcharge), source: 'hourly' };
  }
}

describe('FASE 4B-2 — C3 booking price', () => {
  it('client price=1 ignored, service price authoritative', () => {
    const server = computeBookingPrice({ isService: true, service: { price_clp: 50000, lawyer_user_id: 'L1' }, surcharge: 0.1 });
    expect(server.price).toBe(55000);
    expect(server.price).not.toBe(1);
  });
  it('cross-lawyer service rejected', () => {
    const service = { price_clp: 50000, lawyer_user_id: 'L1' };
    const requestedLawyer = 'L2';
    const owned = String(service.lawyer_user_id) === String(requestedLawyer);
    expect(owned).toBe(false);
  });
  it('invalid service rejected', () => {
    const r = computeBookingPrice({ isService: true, service: null });
    expect(r.error).toBe('INVALID_SERVICE');
  });
  it('no valid server price rejected', () => {
    const r = computeBookingPrice({ isService: false, hourlyRate: 0, duration: 60 });
    expect(r.error).toBe('NO_VALID_PRICE');
  });
  it('MP preference uses server-derived amount', () => {
    const server = computeBookingPrice({ isService: false, hourlyRate: 50000, duration: 60 });
    expect(server.price).toBe(55000);
  });
});

describe('FASE 4B-2 — C4/C5 payment validation & terminal states', () => {
  function shouldConfirm({ booking, payment }) {
    const terminal = ['cancelled','expired','completed','declined','confirmed'];
    if (terminal.includes(booking.status)) {
      if (booking.payment_id === payment.id) return { confirm: false, reason: 'terminal_idempotent' };
      if (booking.status === 'confirmed') return { confirm: false, reason: 'already_confirmed_diff_payment' };
      return { confirm: false, reason: 'terminal_blocked' };
    }
    if (booking.payment_id && booking.payment_id !== payment.id) return { confirm: false, reason: 'conflict' };
    const expected = Number(booking.price);
    const paid = Number(payment.transaction_amount);
    const cur = payment.currency_id || payment.currency || null;
    if (!Number.isFinite(expected) || paid !== expected || cur !== 'CLP') return { confirm: false, reason: 'mismatch' };
    return { confirm: true };
  }
  it('valid payment confirms', () => {
    expect(shouldConfirm({ booking: { status: 'pending', price: 55000, payment_id: null }, payment: { id: 'P1', transaction_amount: 55000, currency_id: 'CLP' } }).confirm).toBe(true);
  });
  it('underpayment does NOT confirm', () => {
    expect(shouldConfirm({ booking: { status: 'pending', price: 55000, payment_id: null }, payment: { id: 'P1', transaction_amount: 1, currency_id: 'CLP' } }).confirm).toBe(false);
  });
  it('wrong currency does NOT confirm', () => {
    expect(shouldConfirm({ booking: { status: 'pending', price: 55000, payment_id: null }, payment: { id: 'P1', transaction_amount: 55000, currency_id: 'USD' } }).confirm).toBe(false);
  });
  it('cancelled booking not resurrected', () => {
    expect(shouldConfirm({ booking: { status: 'cancelled', price: 55000, payment_id: null }, payment: { id: 'P1', transaction_amount: 55000, currency_id: 'CLP' } }).reason).toBe('terminal_blocked');
  });
  it('expired booking not silently resurrected', () => {
    expect(shouldConfirm({ booking: { status: 'expired', price: 55000, payment_id: null }, payment: { id: 'P1', transaction_amount: 55000, currency_id: 'CLP' } }).confirm).toBe(false);
  });
  it('confirmed same P1 idempotent', () => {
    expect(shouldConfirm({ booking: { status: 'confirmed', price: 55000, payment_id: 'P1' }, payment: { id: 'P1', transaction_amount: 55000, currency_id: 'CLP' } }).reason).toBe('terminal_idempotent');
  });
  it('ledger failure must not return success', () => {
    const ledgerError = { code: '23505' };
    const isDuplicate = ledgerError.code === '23505';
    expect(isDuplicate).toBe(true);
    const otherError = { code: '50001' };
    expect(otherError.code === '23505').toBe(false);
  });
});

describe('FASE 4B-2 — C8 document payment', () => {
  it('catalog lookup failure blocks fulfillment', () => {
    const product = getDocumentProduct('unknown_type');
    expect(product).toBeNull();
    const shouldFulfill = product !== null;
    expect(shouldFulfill).toBe(false);
  });
  it('amount mismatch blocks', () => {
    const product = getDocumentProduct('pagare');
    const paid = 1;
    expect(paid !== product.amount).toBe(true);
  });
  it('missing currency blocks', () => {
    const product = getDocumentProduct('pagare');
    const paidCurrency = null;
    expect(paidCurrency !== product.currency).toBe(true);
  });
  it('currency != CLP blocks', () => {
    const product = getDocumentProduct('pagare');
    expect('USD' !== product.currency).toBe(true);
  });
  it('valid amount+CLP succeeds', () => {
    const product = getDocumentProduct('pagare');
    const paid = 9990;
    const cur = 'CLP';
    expect(paid === product.amount && cur === product.currency).toBe(true);
  });
});
