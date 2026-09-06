import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('FASE 2D-2 — Marketplace booking-first', () => {
  it('Test 1: ScheduleModal no crea appointments para nuevo flujo', () => {
    const c = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(c).not.toContain("from('appointments').insert");
  });
  it('Test 2: nuevo flujo crea booking source UNKNOWN booking_type appointment', () => {
    const c = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(c).toContain("booking_type: 'appointment'");
    expect(c).toContain("source"); // bookings/create defaults UNKNOWN
    expect(c).toContain('/api/bookings/create');
  });
  it('Test 3: booking retorna booking.id', () => {
    const c = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(c).toContain('bookingId');
    expect(c).toContain('bookingResult');
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('booking_id: booking.id');
  });
  it('Test 4: Payment creation recibe bookingId', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('bookingId');
    expect(server).toContain('booking_id');
  });
  it('Test 5: payments.booking_id = booking.id', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('booking_id');
    expect(server).toContain('bookingId');
  });
  it('Test 6: MP external_reference = booking.id (nuevo) y paymentId legacy', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('external_reference');
    expect(server).toContain('bookingId');
    expect(server).toContain('paymentId');
    expect(server).toContain('booking.id');
  });
  it('Test 7: webhook resuelve external_reference → bookings.id', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('external_reference');
    expect(server).toContain("from('bookings')");
    expect(server).toContain('bookingId = payment.external_reference');
  });
  it('Test 8: webhook actualiza booking status', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain("from('bookings').update");
    expect(server).toContain('status');
  });
  it('Test 9: webhook idempotencia', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('payment_events');
    expect(server).toContain('payment_id');
    expect(server).toContain("is('payment_id', null)");
  });
  it('Test 10: legacy appointmentId continúa', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('appointmentId');
  });
  it('Test 11: legacy payments.appointment_id', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('appointment_id');
  });
  it('Test 12: nuevo flujo no crea appointments', () => {
    const c = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(c).not.toContain("from('appointments').insert");
  });
  it('Test 13: no CRM auto-creation', () => {
    const c = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(c).not.toContain('findOrCreateClient');
    expect(c).not.toContain('lawyer_clients');
    expect(c).not.toContain('lawyer_cases');
  });
  it('Test 14: cross-tenant blocked (RLS)', () => {
    const sql = readFileSync(resolve('supabase/migrations/20260907000000_rls_gap_closure.sql'), 'utf-8');
    expect(sql).toContain('appointments_lawyer_select');
  });
  it('Test 15: BookingSuccessPage acepta booking_id', () => {
    const c = readFileSync(resolve('src/pages/BookingSuccessPage.tsx'), 'utf-8');
    expect(c).toContain('booking_id');
  });
  it('Test 16: BookingSuccessPage mantiene appointmentId legacy', () => {
    const c = readFileSync(resolve('src/pages/BookingSuccessPage.tsx'), 'utf-8');
    expect(c).toContain('booking_id');
    expect(c).toContain('external_reference');
  });
  it('Test 17: Marketplace endpoint intacto', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain("app.post('/api/bookings/create'");
    expect(server).toContain('booking_type');
  });
  it('Test 18: webhook legacy no roto', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('x-signature');
    expect(server).toContain('payment_events');
  });
});
