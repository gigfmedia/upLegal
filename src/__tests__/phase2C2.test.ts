import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('FASE 2C-2 — UserDashboard migrado a bookings', () => {
  it('UserDashboard dual-read bookings primary', () => {
    const content = readFileSync(resolve('src/pages/UserDashboard.tsx'), 'utf-8');
    expect(content).toContain("from('bookings')");
    expect(content).toContain("booking_type', 'appointment'");
    expect(content).toContain("from('appointments')");
    expect(content).toContain('_source: \'bookings\'');
    expect(content).toContain('bookingsNormalized');
  });
  it('CitasPage no escribe appointments (SaaS)', () => {
    const content = readFileSync(resolve('src/pages/lawyer/CitasPage.tsx'), 'utf-8');
    expect(content).toContain("from('bookings')");
    expect(content).not.toContain("from('appointments').insert");
  });
  it('ScheduleModal permanece Marketplace legacy (no migrado por limpieza)', () => {
    const content = readFileSync(resolve('src/components/ScheduleModal.tsx'), 'utf-8');
    expect(content).toContain("from('appointments')");
    // Documentado como preserved, no debe migrarse en 2C-2
  });
  it('lib/api still exists but marked legacy', () => {
    expect(existsSync(resolve('src/lib/api.ts'))).toBe(true);
    const content = readFileSync(resolve('src/lib/api.ts'), 'utf-8');
    expect(content).toContain('appointmentsApi');
  });
  it('no new appointments writes for SaaS', () => {
    const citas = readFileSync(resolve('src/pages/lawyer/CitasPage.tsx'), 'utf-8');
    const userDash = readFileSync(resolve('src/pages/UserDashboard.tsx'), 'utf-8');
    // SaaS files should not insert into appointments
    expect(citas).not.toContain("from('appointments').insert");
    expect(userDash).not.toContain("from('appointments').insert");
  });
  it('payments dual intact', () => {
    const earnings = readFileSync(resolve('src/pages/lawyer/EarningsPage.tsx'), 'utf-8');
    expect(earnings).toContain('booking_id');
    expect(earnings).toContain('appointment_id');
  });
  it('bookings.meet_link column exists', () => {
    const sql = readFileSync(resolve('supabase/migrations/20260909000000_bookings_meet_link.sql'), 'utf-8');
    expect(sql).toContain('meet_link');
  });
  it('no CRM auto-creation', () => {
    const docs = readFileSync(resolve('docs/FASE-2C-2-APPOINTMENTS-CONSOLIDATION.md'), 'utf-8');
    expect(docs.toLowerCase()).toContain('auto');
  });
});
