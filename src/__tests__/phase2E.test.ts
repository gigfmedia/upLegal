import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('FASE 2E — DashboardAppointments bookings', () => {
  it('Test 1: DashboardAppointments puede leer bookings', () => {
    const c = readFileSync(resolve('src/pages/DashboardAppointments.tsx'), 'utf-8');
    expect(c).toContain("from('bookings')");
    expect(c).toContain('supabase');
  });
  it('Test 2: Usuario A no ve booking de B (RLS user_id)', () => {
    const c = readFileSync(resolve('src/pages/UserDashboard.tsx'), 'utf-8');
    expect(c).toContain('user_id');
    expect(c).toContain("from('bookings')");
  });
  it('Test 3: Lawyer A no modifica booking de B', () => {
    const sql = readFileSync(resolve('supabase/migrations/20260907000000_rls_gap_closure.sql'), 'utf-8');
    expect(sql).toContain('appointments_lawyer_select');
  });
});

describe('FASE 2E — create-payment bookingId', () => {
  it('Test 4: create-payment acepta bookingId', () => {
    const c = readFileSync(resolve('netlify/functions/create-payment.js'), 'utf-8');
    expect(c).toContain('bookingId');
  });
  it('Test 5: bookingId produce payments.booking_id', () => {
    const c = readFileSync(resolve('netlify/functions/create-payment.js'), 'utf-8');
    expect(c).toContain('booking_id');
    expect(c).toContain('isBooking');
  });
  it('Test 6: precio viene del booking', () => {
    const c = readFileSync(resolve('netlify/functions/create-payment.js'), 'utf-8');
    expect(c).toContain('bookingId');
    expect(c).toContain('lawyer_id');
  });
  it('Test 7: external_reference = booking.id', () => {
    const c = readFileSync(resolve('netlify/functions/create-payment.js'), 'utf-8');
    expect(c).toContain('external_reference');
    expect(c).toContain('isBooking ? bookingId : paymentId');
  });
  it('Test 8: legacy appointmentId continúa', () => {
    const c = readFileSync(resolve('netlify/functions/create-payment.js'), 'utf-8');
    expect(c).toContain('appointmentId');
  });
  it('Test 9: legacy payments.appointment_id', () => {
    const c = readFileSync(resolve('netlify/functions/create-payment.js'), 'utf-8');
    expect(c).toContain('appointment_id');
  });
});

describe('FASE 2E — Webhook', () => {
  it('Test 10: webhook moderno booking', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('external_reference: bookingId || paymentId');
  });
  it('Test 11: webhook legacy', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('appointmentId');
  });
  it('Test 12: duplicate webhook no duplica', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('payment_events');
    expect(c).toContain("is('payment_id', null)");
  });
});

describe('FASE 2E — Marketplace', () => {
  it('Test 13: nuevo Marketplace no crea appointments', () => {
    const c = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(c).not.toContain("from('appointments').insert");
    expect(c).toContain('api/bookings/create');
  });
  it('Test 14: no crea lawyer_clients', () => {
    const c = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(c).not.toContain('lawyer_clients');
  });
  it('Test 15: no crea lawyer_cases', () => {
    const c = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(c).not.toContain('lawyer_cases');
  });
  it('Test 16: Earnings payment→booking', () => {
    const c = readFileSync(resolve('src/pages/lawyer/EarningsPage.tsx'), 'utf-8');
    expect(c).toContain('booking_id');
    expect(c).toContain('bookings');
  });
  it('Test 17: Earnings fallback', () => {
    const c = readFileSync(resolve('src/pages/lawyer/EarningsPage.tsx'), 'utf-8');
    expect(c).toContain('appointment_id');
    expect(c).toContain('appointmentsMap');
  });
  it('Test 18: BookingSuccessPage booking_id', () => {
    const c = readFileSync(resolve('src/pages/BookingSuccessPage.tsx'), 'utf-8');
    expect(c).toContain('booking_id');
  });
  it('Test 19: BookingSuccessPage appointmentId legacy', () => {
    const c = readFileSync(resolve('src/pages/BookingSuccessPage.tsx'), 'utf-8');
    expect(c).toContain('booking_id');
    expect(c).toContain('external_reference');
  });
  it('Test 20: Marketplace /api/bookings/create', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain("app.post('/api/bookings/create'");
  });
});
