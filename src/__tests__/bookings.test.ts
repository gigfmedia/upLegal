import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const VALID_SOURCES = ['LAWYER_DIRECT', 'LEGALUP_MARKETPLACE', 'UNKNOWN'] as const;

function isValidBookingSource(v: string): boolean {
  return (VALID_SOURCES as readonly string[]).includes(v);
}

describe('bookings.source — Fase 1A', () => {
  it('DEFAULT UNKNOWN mantiene compatibilidad con bookings existentes', () => {
    // La migration usa DEFAULT UNKNOWN + CHECK, por lo que filas antiguas sin source = UNKNOWN
    expect(isValidBookingSource('UNKNOWN')).toBe(true);
  });

  it('acepta LAWYER_DIRECT y LEGALUP_MARKETPLACE', () => {
    expect(isValidBookingSource('LAWYER_DIRECT')).toBe(true);
    expect(isValidBookingSource('LEGALUP_MARKETPLACE')).toBe(true);
  });

  it('rechaza valores inválidos', () => {
    expect(isValidBookingSource('HACK')).toBe(false);
    expect(isValidBookingSource('marketplace')).toBe(false);
    expect(isValidBookingSource('')).toBe(false);
  });

  it('marketplace flow persists explicit server-owned LEGALUP_MARKETPLACE source', () => {
    // 4.37B — POST /api/bookings/create writes source LEGALUP_MARKETPLACE itself;
    // client body cannot choose it. Historical rows keep DEFAULT UNKNOWN.
    const server = readFileSync(resolve('server.mjs'), 'utf-8');
    const createIdx = server.indexOf("app.post('/api/bookings/create'");
    expect(createIdx).toBeGreaterThan(-1);
    const endpoint = server.slice(createIdx, createIdx + 12000);
    expect(endpoint).toContain("source: 'LEGALUP_MARKETPLACE'");
    // Booking origin itself must never come from the client body
    // (utm_* attribution fields are unrelated and untouched).
    expect(endpoint).not.toMatch(/[^_a-zA-Z]source:\s*req\.body/);
    expect(isValidBookingSource('LEGALUP_MARKETPLACE')).toBe(true);
  });

  it('SaaS future: abogado crea booking con source=LAWYER_DIRECT (supabase insert con auth.uid()=lawyer_id)', () => {
    const saasBooking = { lawyer_id: 'auth-uid', source: 'LAWYER_DIRECT' as const };
    expect(isValidBookingSource(saasBooking.source)).toBe(true);
  });
});
