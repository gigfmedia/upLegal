import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('FASE 2D — ScheduleModal audit', () => {
  it('ScheduleModal now booking-first (Marketplace migrated in 2D-2)', () => {
    const content = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(content).toContain('api/bookings/create');
    expect(content).toContain('bookingId');
    expect(content).toContain('bookings');
    // New flow should not create appointments directly
    expect(content).not.toContain("from('appointments').insert");
  });
  it('CitasPage uses bookings LAWYER_DIRECT (SaaS)', () => {
    const content = readFileSync(resolve('src/pages/lawyer/CitasPage.tsx'), 'utf-8');
    expect(content).toContain("from('bookings')");
    expect(content).toContain('LAWYER_DIRECT');
  });
});

describe('FASE 2D — Payments', () => {
  it('payments dual intact', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('appointmentId');
    expect(server).toContain('bookingId');
    expect(server).toContain('booking_id');
  });
  it('external_reference both flows preserved', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('external_reference');
    expect(server).toContain('booking.id');
    expect(server).toContain('paymentId');
  });
});

describe('FASE 2D — Webhook/Meet', () => {
  it('webhook HMAC and idempotency preserved', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('x-signature');
    expect(server).toContain('payment_events');
  });
  it('meet sync to bookings', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain("from('bookings').update({ meet_link");
  });
});

describe('FASE 2D — RLS/Security', () => {
  it('no USING true in private', () => {
    const sql = readFileSync(resolve('supabase/migrations/20260907000000_rls_gap_closure.sql'), 'utf-8');
    // private tables should not have USING true for authenticated
    expect(sql).not.toMatch(/service_quote_requests.*USING \(true\)/);
  });
});

describe('FASE 2D — Historical', () => {
  it('57 bookings still without auto CRM', () => {
    const doc = readFileSync(resolve('docs/FASE-2D-MARKETPLACE-BOOKINGS-MIGRATION.md'), 'utf-8');
    expect(doc).toContain('57 bookings');
    expect(doc).toContain('no auto');
  });
});
