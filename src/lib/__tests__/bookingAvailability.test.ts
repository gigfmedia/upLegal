import { describe, it, expect } from 'vitest';
import { filterSlotsByConfig, hasSurvivingSlotToday } from '@/lib/bookingAvailability';

const hourly = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({
    time: `${String(from + i).padStart(2, '0')}:00`,
  }));

// Config real de producción (abogado con semana completa).
const fullWeekday = Array(10).fill(true);

describe('booking availability — regresión grilla vacía', () => {
  it('día configurado y slot true → se conserva (10/10)', () => {
    expect(filterSlotsByConfig(hourly(9, 18), fullWeekday, true)).toHaveLength(10);
  });

  it('día configurado y slot false → se descarta', () => {
    const partial = [false, false, true, ...Array(7).fill(false)];
    const kept = filterSlotsByConfig(hourly(9, 18), partial, true);
    expect(kept.map((s) => s.time)).toEqual(['11:00']);
  });

  it('config existente pero día sin arreglo → se descarta todo', () => {
    expect(filterSlotsByConfig(hourly(9, 18), null, true)).toHaveLength(0);
    expect(filterSlotsByConfig(hourly(9, 18), undefined, true)).toHaveLength(0);
  });

  it('sin configuración → legacy conserva todo', () => {
    expect(filterSlotsByConfig(hourly(9, 18), null, false)).toHaveLength(10);
  });

  it('sábado parcial conserva solo la mañana configurada', () => {
    const sat = [true, true, true, true, true, true, false, false, false, false];
    const kept = filterSlotsByConfig(hourly(9, 18), sat, true);
    expect(kept.map((s) => s.time)).toEqual(['09:00', '10:00', '11:00', '12:00', '13:00', '14:00']);
  });

  it('corte de anticipación: 17:50 excluye hoy, 17:00 lo incluye', () => {
    expect(hasSurvivingSlotToday(fullWeekday, new Date(2026, 9, 13, 17, 50))).toBe(false);
    expect(hasSurvivingSlotToday(fullWeekday, new Date(2026, 9, 13, 17, 0))).toBe(true);
    expect(hasSurvivingSlotToday(null, new Date(2026, 9, 13, 10, 0))).toBe(false);
  });
});
