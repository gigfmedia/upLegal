import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

/** Compact per-event timestamp, e.g. "30 ago, 13:15". Shared timeline grammar. */
export function timelineEventTime(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM, HH:mm', { locale: es });
  } catch {
    return '';
  }
}

/** Day group label: Hoy / Ayer / "30 agosto 2026". Shared timeline grammar. */
export function timelineGroupLabel(iso: string): string {
  try {
    const date = parseISO(iso);
    if (isToday(date)) return 'Hoy';
    if (isYesterday(date)) return 'Ayer';
    return format(date, 'd MMMM yyyy', { locale: es });
  } catch {
    return '';
  }
}
