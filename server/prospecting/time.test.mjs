// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  dateKeyInTimezone,
  describeNextRun,
  isScheduleDue,
  isValidTimezone,
  manualRunKey,
  nextScheduledAt,
  normalizeScheduleTime,
  scheduledRunKey,
  startOfDayUtc,
} from './time.mjs';

describe('prospecting time', () => {
  it('valida timezone IANA', () => {
    expect(isValidTimezone('America/Santiago')).toBe(true);
    expect(isValidTimezone('Not/AZone')).toBe(false);
  });

  it('normaliza HH:mm a HH:mm:ss', () => {
    expect(normalizeScheduleTime('10:00')).toBe('10:00:00');
    expect(normalizeScheduleTime('09:05:30')).toBe('09:05:30');
    expect(normalizeScheduleTime('25:00')).toBe(null);
  });

  it('calcula fecha local y run key programada', () => {
    const now = new Date('2026-11-04T13:00:00.000Z');
    expect(dateKeyInTimezone(now, 'America/Santiago')).toBe('2026-11-04');
    expect(scheduledRunKey(now, 'America/Santiago')).toBe('scheduled:2026-11-04');
    expect(manualRunKey(now, 'admin')).toContain('manual:2026-11-04T13:00:00.000Z:admin:');
  });

  it('dispara a la hora local y no antes', () => {
    expect(isScheduleDue(new Date('2026-11-04T12:59:00.000Z'), '10:00', 'America/Santiago')).toBe(false);
    expect(isScheduleDue(new Date('2026-11-04T13:00:00.000Z'), '10:00', 'America/Santiago')).toBe(true);
  });

  it('calcula próxima ejecución respetando el calendario local', () => {
    const now = new Date('2026-11-04T12:00:00.000Z');
    const next = nextScheduledAt(now, '10:00', 'America/Santiago');
    expect(next.toISOString()).toBe('2026-11-04T13:00:00.000Z');
    expect(describeNextRun(now, { schedule_time: '10:00', timezone: 'America/Santiago' }))
      .toBe('2026-11-04T13:00:00.000Z');
  });

  it('inicio del día en UTC (Santiago UTC-3 en noviembre)', () => {
    const start = startOfDayUtc(new Date('2026-11-04T13:00:00.000Z'), 'America/Santiago');
    expect(start.toISOString()).toBe('2026-11-04T03:00:00.000Z');
  });
});
