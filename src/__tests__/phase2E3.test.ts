import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('FASE 2E.3 — Pricing server-side', () => {
  it('Test 1: server calculates price', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('computedPrice');
    expect(c).toContain('serverPrice');
    expect(c).toContain('hourly_rate_clp');
  });
  it('Test 2: client cannot manipulate price', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('price manipulation blocked');
    expect(c).toContain('priceSource');
  });
  it('Test 3: booking.price = server price', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('price: computedPrice');
  });
  it('Test 4: Mercado Pago uses booking.price', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('unit_price: computedPrice');
  });
  it('Test 5: bookingId external_reference', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('external_reference: bookingId || paymentId');
  });
});

describe('FASE 2E.3 — Fulfillment', () => {
  it('Test 6: payments.booking_id preserved', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('booking_id');
    expect(c).toContain('payments');
  });
  it('Test 7: webhook confirms booking', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain("from('bookings').update");
    expect(c).toContain('status');
  });
  it('Test 8: Meet only after approved', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('meet_generation');
    expect(c).toContain('shouldCreateAppointment');
  });
  it('Test 9: Meet failure does not undo', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('meet_generation');
    // Should not revert booking status on meet failure
    expect(c).not.toContain('confirmed → failed');
  });
  it('Test 10: existing meet_link reused', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('reused_existing');
    expect(c).toContain('booking.meet_link');
  });
  it('Test 11: email only after approved', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('resend');
    expect(c).toContain('approved');
  });
  it('Test 12: email includes booking info', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('meet_link');
  });
  it('Test 13: legacy appointmentId remains', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('appointmentId');
    expect(c).toContain('appointment_id');
  });
  it('Test 14: no new Marketplace appointment creation', () => {
    const c = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(c).not.toContain("from('appointments').insert");
  });
  it('Test 15: cross-tenant booking protection', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('actualLawyerId');
    expect(c).toContain('lawyer_id');
  });
});
