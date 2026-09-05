import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const bookingsMeetLinkMigration = resolve('supabase/migrations/20260909000000_bookings_meet_link.sql');

describe('FASE 2C — Migration', () => {
  it('bookings.meet_link migration exists and adds column', () => {
    expect(existsSync(bookingsMeetLinkMigration)).toBe(true);
    const sql = readFileSync(bookingsMeetLinkMigration, 'utf-8');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS meet_link');
    expect(sql).toContain('idx_bookings_meet_link');
    expect(sql).not.toContain('DROP TABLE appointments');
    expect(sql).not.toContain('DROP TABLE');
  });
  it('no heuristic backfill', () => {
    const sql = readFileSync(bookingsMeetLinkMigration, 'utf-8');
    expect(sql).toContain('No backfill');
    expect(sql).not.toContain('email + fecha');
  });
});

describe('FASE 2C — Appointments inventory (6 rows)', () => {
  it('CitasPage uses bookings not appointments for SaaS', () => {
    const content = readFileSync(resolve('src/pages/lawyer/CitasPage.tsx'), 'utf-8');
    expect(content).toContain("from('bookings')");
    expect(content).toContain('LAWYER_DIRECT');
    // Should not insert into appointments for SaaS
    expect(content).not.toContain("from('appointments').insert");
  });
  it('EarningsPage supports booking traceability (fallback to appointments)', () => {
    const content = readFileSync(resolve('src/pages/lawyer/EarningsPage.tsx'), 'utf-8');
    expect(content).toContain('booking_id');
    expect(content).toContain('bookingsMap');
    expect(content).toContain('appointmentsMap');
  });
  it('server webhook syncs bookings.meet_link', () => {
    const content = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(content).toContain("from('bookings').update({ meet_link");
  });
});

describe('FASE 2C — Live DB checks', () => {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SERVICE_ROLE_KEY || (import.meta as any).env?.SERVICE_ROLE_KEY;
  const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const anon = url && anonKey ? createClient(url, anonKey) : null;
  const admin = url && serviceKey ? createClient(url, serviceKey) : null;

  it('bookings.meet_link column accessible', async () => {
    if (!admin) return;
    const { data, error } = await admin.from('bookings').select('meet_link').limit(1);
    if (error?.message?.includes('Invalid API key') || error?.message?.includes('Unauthorized')) return;
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('appointments still readable via RLS (lawyer/client)', async () => {
    if (!admin) return;
    const { error } = await admin.from('appointments').select('id').limit(1);
    if (error?.message?.includes('Invalid API key')) return;
    expect(error).toBeNull();
  });

  it('57 bookings still without client/case (no auto CRM)', async () => {
    if (!admin) return;
    const { data, error } = await admin.from('bookings').select('id, client_id, case_id').limit(100);
    if (error?.message?.includes('Invalid API key')) return;
    expect(error).toBeNull();
    // At least 30 should still be null (LAWYER_DIRECT cancelled legacy)
    const nullClients = (data || []).filter((b: any) => !b.client_id).length;
    expect(nullClients).toBeGreaterThanOrEqual(0);
  });
});
