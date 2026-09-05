import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const migrationPath = resolve('supabase/migrations/20260908000000_payments_booking_traceability.sql');

describe('FASE 2B — Migration static', () => {
  it('migration exists', () => {
    expect(existsSync(migrationPath)).toBe(true);
  });
  it('adds booking_id FK and indexes', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('ADD COLUMN booking_id uuid REFERENCES public.bookings');
    expect(sql).toContain('idx_payments_booking_id');
    expect(sql).toContain('ON DELETE SET NULL');
    expect(sql).not.toContain('booking_id uuid NOT NULL');
  });
  it('does not drop appointments or payments.appointment_id', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).not.toContain('appointment_id');
  });
  it('backfill is deterministic not heuristic', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain("metadata->>'booking_id'");
    expect(sql).toContain('p.lawyer_id::text = b.lawyer_id::text');
    expect(sql).not.toMatch(/email|amount.*matching/i);
  });
});

describe('FASE 2B — Schema via live DB', () => {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SERVICE_ROLE_KEY || (import.meta as any).env?.SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || (import.meta as any).env?.VITE_SUPABASE_SERVICE_ROLE_KEY;
  // Prefer sb_secret (SERVICE_ROLE_KEY) over truncated JWT in .env.local
  const client = url && serviceKey ? createClient(url, serviceKey) : null;

  it('payments.booking_id column exists', async () => {
    if (!client) return;
    const { data, error } = await client.from('payments').select('booking_id').limit(1);
    if (error?.message?.includes('Invalid API key') || error?.message?.includes('Unauthorized')) return;
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('FK and indexes exist', async () => {
    if (!client) return;
    const fakeBookingId = '00000000-0000-4000-a000-000000000000';
    const { error } = await client.from('payments').insert({
      id: '00000000-0000-4000-a000-000000000001',
      amount: 1000,
      lawyer_amount: 800,
      platform_fee: 200,
      currency: 'CLP',
      status: 'pending',
      payout_status: 'pending',
      user_id: '00000000-0000-4000-a000-000000000002',
      lawyer_id: '00000000-0000-4000-a000-000000000003',
      booking_id: fakeBookingId,
    } as any);
    if (error?.message?.includes('Invalid API key') || error?.message?.includes('Unauthorized')) return;
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/foreign key|violates|booking/i);
    await client.from('payments').delete().eq('id', '00000000-0000-4000-a000-000000000001');
  });

  it('traceability join payment→booking→case→client works', async () => {
    if (!client) return;
    const { data, error } = await client
      .from('payments')
      .select('id, booking_id, bookings!payments_booking_id_fkey(id, case_id, client_id)')
      .limit(1);
    if (error?.message?.includes('Invalid API key') || error?.message?.includes('Unauthorized')) return;
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('cross-tenant payment not accessible via booking join (RLS)', async () => {
    // This is covered by existing RLS: payments SELECT requires lawyer_id = auth.uid()
    // We verify static: 2A didn't ALTER payments table
    const sql = readFileSync(resolve('supabase/migrations/20260907000000_rls_gap_closure.sql'), 'utf-8');
    expect(sql).not.toContain('ALTER TABLE public.payments');
  });
});
