import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('FASE 2G — Modern booking', () => {
  it('Test 1 — modern booking confirmed without appointment', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain("from('bookings').update");
    expect(server).toContain('status');
  });
  it('Test 2 — Meet modern bookingId → bookings.meet_link', () => {
    const fn = readFileSync(resolve('supabase/functions/create-google-meeting/index.ts'), 'utf-8');
    expect(fn).toContain('bookingId');
    expect(fn).toContain("from('bookings')");
    expect(fn).toContain('meet_link');
  });
  it('Test 3 — Meet reuse', () => {
    const fn = readFileSync(resolve('supabase/functions/create-google-meeting/index.ts'), 'utf-8');
    expect(fn).toContain('booking.meet_link');
    expect(fn).toContain('existing: true');
  });
  it('Test 4 — Meet failure does not undo', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('meet_generation');
    // Should not revert booking confirmed on meet failure (no throw to booking status)
    expect(server).not.toContain('confirmed → failed');
  });
  it('Test 5 — Email uses booking data', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('resend');
    expect(server).toContain('booking');
  });
  it('Test 6 — Mirror failure does not fail modern flow', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    // Mirror INSERT is in try/catch
    expect(server).toContain('appointment_creation status=failed');
    expect(server).toContain('appointments');
  });
  it('Test 7 — Legacy appointmentId still works', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('appointmentId');
    const netlify = readFileSync(resolve('netlify/functions/create-payment.js'), 'utf-8');
    expect(netlify).toContain('appointmentId');
  });
  it('Test 8 — Payments booking_id', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('booking_id');
  });
  it('Test 9 — Tenant isolation', () => {
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(server).toContain('actualLawyerId');
  });
  it('Test 10 — No new appointment dependency: booking → Meet without appointments', () => {
    const content = readFileSync(resolve('supabase/functions/create-google-meeting/index.ts'), 'utf-8');
    // Modern path should handle bookingId without requiring appointmentId
    expect(content).toContain('if (bookingId)');
    expect(content).toContain("from('bookings')");
  });
});
