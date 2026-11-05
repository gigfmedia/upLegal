import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: String(timezone || '') }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeScheduleTime(value) {
  const raw = String(value || '').trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(raw);
  if (!match) return null;
  return `${match[1]}:${match[2]}:${match[3] || '00'}`;
}

export function dateKeyInTimezone(now, timezone) {
  return formatInTimeZone(now, timezone, 'yyyy-MM-dd');
}

export function timeKeyInTimezone(now, timezone) {
  return formatInTimeZone(now, timezone, 'HH:mm');
}

export function scheduledRunKey(now, timezone) {
  return `scheduled:${dateKeyInTimezone(now, timezone)}`;
}

export function manualRunKey(now, actorId) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `manual:${now.toISOString()}:${actorId || 'system'}:${suffix}`;
}

export function startOfDayUtc(now, timezone) {
  return fromZonedTime(`${dateKeyInTimezone(now, timezone)}T00:00:00`, timezone);
}

export function isScheduleDue(now, scheduleTime, timezone) {
  const normalized = normalizeScheduleTime(scheduleTime);
  if (!normalized) return false;
  return timeKeyInTimezone(now, timezone) >= normalized.slice(0, 5);
}

/**
 * Próxima ocurrencia de HH:mm en la zona indicada. Usa el calendario local
 * (IANA), por lo que los cambios de horario de Chile se respetan sin offsets
 * fijos.
 */
export function nextScheduledAt(now, scheduleTime, timezone) {
  const normalized = normalizeScheduleTime(scheduleTime);
  if (!normalized) return null;
  const hhmm = normalized.slice(0, 5);
  for (let dayOffset = 0; dayOffset <= 3; dayOffset += 1) {
    const probe = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const localDate = formatInTimeZone(probe, timezone, 'yyyy-MM-dd');
    const candidate = fromZonedTime(`${localDate}T${hhmm}:00`, timezone);
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  return null;
}

export function describeNextRun(now, settings) {
  const next = nextScheduledAt(now, settings?.schedule_time, settings?.timezone);
  return next ? next.toISOString() : null;
}
