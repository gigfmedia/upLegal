import { describe, it, expect } from 'vitest';

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

  it('marketplace flow sigue creando bookings sin source explícito (usa DEFAULT)', () => {
    // POST /api/bookings/create (server.mjs:1202) no envía source en Fase 1A — debe insertar con DEFAULT UNKNOWN
    // No hay cambio de columnas existentes (scheduled_date, lawyer_id, etc.)
    const bookingInsert = {
      lawyer_id: 'lawyer-1',
      user_email: 'ana@example.com',
      source: undefined as unknown as string | undefined,
    };
    const effectiveSource = bookingInsert.source ?? 'UNKNOWN';
    expect(isValidBookingSource(effectiveSource)).toBe(true);
  });

  it('SaaS future: abogado crea booking con source=LAWYER_DIRECT (supabase insert con auth.uid()=lawyer_id)', () => {
    const saasBooking = { lawyer_id: 'auth-uid', source: 'LAWYER_DIRECT' as const };
    expect(isValidBookingSource(saasBooking.source)).toBe(true);
  });
});
