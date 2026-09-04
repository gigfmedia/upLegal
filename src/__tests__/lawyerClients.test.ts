import { describe, it, expect } from 'vitest';

// Fase 1A: normalización de email para lawyer_clients
// Reglas: trim + lower, '' / '   ' / null => null (ausencia)
// Deduplicación parcial: (lawyer_id, lower(trim(email))) WHERE email IS NOT NULL

export function normalizeEmail(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (trimmed === '') return null;
  return trimmed.toLowerCase();
}

describe('lawyer_clients.normalizeEmail — Fase 1A', () => {
  it('trim + lower: " Juan@Email.com " -> "juan@email.com"', () => {
    expect(normalizeEmail(' Juan@Email.com ')).toBe('juan@email.com');
  });

  it('case-insensitive: JUAN@EMAIL.COM == juan@email.com', () => {
    expect(normalizeEmail('JUAN@EMAIL.COM')).toBe('juan@email.com');
    expect(normalizeEmail('juan@email.com')).toBe('juan@email.com');
    expect(normalizeEmail(' Juan@Email.com ')).toBe(normalizeEmail('JUAN@EMAIL.COM'));
  });

  it('variantes con espacios: " JUAN@email.com" == "juan@email.com"', () => {
    expect(normalizeEmail(' JUAN@email.com')).toBe('juan@email.com');
    expect(normalizeEmail('juan@email.com   ')).toBe('juan@email.com');
  });

  it('email ausente: null -> null', () => {
    expect(normalizeEmail(null)).toBe(null);
  });

  it('email ausente: "" -> null', () => {
    expect(normalizeEmail('')).toBe(null);
  });

  it('email ausente: "   " -> null', () => {
    expect(normalizeEmail('   ')).toBe(null);
  });

  it('undefined -> null', () => {
    expect(normalizeEmail(undefined)).toBe(null);
  });

  it('no deduplica global: mismo email con distinto lawyer_id son distintos (lógica de índice parcial)', () => {
    // El índice es UNIQUE (lawyer_id, lower(trim(email))) WHERE email IS NOT NULL
    // Dos lawyers con mismo email son filas distintas — se prueba a nivel SQL
    // Aquí verificamos que normalización es determinista por lawyer+email
    const email = 'juan@email.com';
    const lawyerA = 'lawyer-a-id';
    const lawyerB = 'lawyer-b-id';
    const keyA = `${lawyerA}:${normalizeEmail(email)}`;
    const keyB = `${lawyerB}:${normalizeEmail(email)}`;
    expect(keyA).not.toBe(keyB);
    expect(normalizeEmail(email)).toBe('juan@email.com');
  });

  it('email válido con subdominio y plus', () => {
    expect(normalizeEmail('  Test+Alias@Sub.Domain.CL  ')).toBe('test+alias@sub.domain.cl');
  });
});
