import { describe, it, expect } from 'vitest';

// Fase 1A: lawyer_cases status + source constraints

const VALID_STATUSES = [
  'new',
  'quoted',
  'paid',
  'in_progress',
  'delivered',
  'closed',
  'cancelled',
] as const;

const VALID_SOURCES = [
  'LAWYER_DIRECT',
  'LEGALUP_MARKETPLACE',
  'UNKNOWN',
] as const;

export function isValidCaseStatus(value: string): boolean {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

export function isValidSource(value: string): boolean {
  return (VALID_SOURCES as readonly string[]).includes(value);
}

export function isValidSingleSource(
  bookingId: string | null,
  quoteRequestId: string | null
): boolean {
  const count = (bookingId ? 1 : 0) + (quoteRequestId ? 1 : 0);
  return count <= 1;
}

describe('lawyer_cases status — Fase 1A', () => {
  it('acepta 7 estados válidos', () => {
    for (const s of VALID_STATUSES) {
      expect(isValidCaseStatus(s)).toBe(true);
    }
  });

  it('rechaza "random" y otros', () => {
    expect(isValidCaseStatus('random')).toBe(false);
    expect(isValidCaseStatus('HACK')).toBe(false);
    expect(isValidCaseStatus('')).toBe(false);
    expect(isValidCaseStatus('New')).toBe(false); // case-sensitive
  });

  it('rechaza priority/due_date no existentes en Fase 1A (no confundir con status)', () => {
    expect(isValidCaseStatus('high')).toBe(false);
    expect(isValidCaseStatus('pending')).toBe(false);
  });
});

describe('lawyer_cases/bookings source — Fase 1A', () => {
  it('acepta 3 sources válidos', () => {
    for (const s of VALID_SOURCES) {
      expect(isValidSource(s)).toBe(true);
    }
  });

  it('rechaza HACK', () => {
    expect(isValidSource('HACK')).toBe(false);
    expect(isValidSource('marketplace')).toBe(false);
    expect(isValidSource('')).toBe(false);
  });
});

describe('lawyer_cases integridad single source', () => {
  it('permite booking_id solo, quote solo, o ninguno (manual)', () => {
    expect(isValidSingleSource('book-1', null)).toBe(true);
    expect(isValidSingleSource(null, 'quote-1')).toBe(true);
    expect(isValidSingleSource(null, null)).toBe(true);
  });

  it('rechaza ambos a la vez', () => {
    expect(isValidSingleSource('book-1', 'quote-1')).toBe(false);
  });
});
