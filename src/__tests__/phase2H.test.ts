import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('FASE 2H — Modern flow uses bookings', () => {
  it('1 modern flow uses bookings', () => {
    const c = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(c).toContain('api/bookings/create');
  });
  it('2 ScheduleModal does not insert appointments', () => {
    const c = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(c).not.toContain("from('appointments').insert");
  });
  it('3 external_reference uses booking.id', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('external_reference: bookingId || paymentId');
    expect(c).toContain('external_reference: booking.id');
  });
  it('4 booking price is server controlled', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('computedPrice');
    expect(c).toContain('hourly_rate_clp');
  });
  it('5 payment traceability booking_id', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('booking_id');
  });
  it('6 booking payment status transition', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain("from('bookings').update");
    expect(c).toContain('status');
  });
  it('7 webhook idempotency', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('payment_events');
    expect(c).toContain("is('payment_id', null)");
  });
  it('8 Meet bookingId path', () => {
    const c = readFileSync(resolve('supabase/functions/create-google-meeting/index.ts'), 'utf-8');
    expect(c).toContain('bookingId');
    expect(c).toContain("from('bookings')");
  });
  it('9 Meet reuse', () => {
    const c = readFileSync(resolve('supabase/functions/create-google-meeting/index.ts'), 'utf-8');
    expect(c).toContain('booking.meet_link');
  });
  it('10 BookingSuccess booking_id', () => {
    const c = readFileSync(resolve('src/pages/BookingSuccessPage.tsx'), 'utf-8');
    expect(c).toContain('booking_id');
  });
  it('11 email ordering', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('resend');
  });
  it('12 legacy appointmentId preserved', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('appointmentId');
  });
  it('13 compatibility mirror cannot block booking', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('appointment_creation status=failed');
  });
  it('14 cross-tenant isolation', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('actualLawyerId');
  });
  it('15 no CRM historical auto-backfill', () => {
    const c = readFileSync(resolve('docs/FASE-2H-30-DAY-OBSERVATION.md'), 'utf-8');
    expect(c.toLowerCase()).toContain('backfill');
  });
  it('16 appointments not source of truth', () => {
    const c = readFileSync(resolve('docs/FASE-2H-30-DAY-OBSERVATION.md'), 'utf-8');
    expect(c.toLowerCase()).toContain('appointments');
    expect(c.toLowerCase()).toContain('source');
  });
});
