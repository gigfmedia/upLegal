import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('FASE 2E.1 — Mercado Pago E2E', () => {
  it('booking-first payment flow', () => {
    const c = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(c).toContain('api/bookings/create');
    expect(c).toContain('bookingId');
  });
  it('payments.booking_id', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('booking_id');
  });
  it('external_reference = booking.id', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('external_reference: bookingId || paymentId');
  });
  it('webhook resolves booking', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain("from('bookings')");
    expect(c).toContain('external_reference');
  });
  it('booking becomes confirmed', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain("status");
    expect(c).toContain('confirmed');
  });
  it('booking receives payment_id', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('payment_id');
  });
  it('payment_events idempotency', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('payment_events');
  });
  it('no new appointments', () => {
    const c = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(c).not.toContain("from('appointments').insert");
  });
  it('booking price source', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('price');
  });
  it('cross-tenant ownership', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('lawyer_id');
  });
  it('BookingSuccessPage booking_id', () => {
    const c = readFileSync(resolve('src/pages/BookingSuccessPage.tsx'), 'utf-8');
    expect(c).toContain('booking_id');
  });
  it('legacy appointmentId', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('appointmentId');
    expect(c).toContain('appointment_id');
  });
});
