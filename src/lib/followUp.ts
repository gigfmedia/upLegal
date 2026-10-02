import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const COMM_CHANNELS = ['whatsapp', 'email', 'phone', 'meeting', 'other'] as const;
export type CommChannel = (typeof COMM_CHANNELS)[number];

export const COMM_CHANNEL_LABELS: Record<CommChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  phone: 'Teléfono',
  meeting: 'Reunión',
  other: 'Otro',
};

export function isValidChannel(value: string): value is CommChannel {
  return (COMM_CHANNELS as readonly string[]).includes(value);
}

export type CommLike = {
  id: string;
  client_id: string;
  case_id: string | null;
  channel: string;
  note: string | null;
  communicated_at: string;
};

/** Última comunicación de una lista (orden desc por communicated_at). */
export function latestComm(comms: CommLike[]): CommLike | null {
  if (comms.length === 0) return null;
  return comms.reduce((a, b) =>
    Date.parse(b.communicated_at) > Date.parse(a.communicated_at) ? b : a
  );
}

/** Última por caso / por cliente (para listas sin N+1). */
export function latestByCase(comms: CommLike[]): Map<string, CommLike> {
  const map = new Map<string, CommLike>();
  for (const c of comms) {
    if (!c.case_id) continue;
    const prev = map.get(c.case_id);
    if (!prev || Date.parse(c.communicated_at) > Date.parse(prev.communicated_at)) {
      map.set(c.case_id, c);
    }
  }
  return map;
}

export function latestByClient(comms: CommLike[]): Map<string, CommLike> {
  const map = new Map<string, CommLike>();
  for (const c of comms) {
    const prev = map.get(c.client_id);
    if (!prev || Date.parse(c.communicated_at) > Date.parse(prev.communicated_at)) {
      map.set(c.client_id, c);
    }
  }
  return map;
}

/** "Hace 3 días" / "Hoy" / "Ayer" para última actualización. */
export function formatLastContact(communicatedAt: string, nowMs = Date.now()): string {
  const d = parseISO(communicatedAt);
  if (Number.isNaN(d.getTime())) return '';
  const diff = differenceInCalendarDays(new Date(nowMs), d);
  if (diff <= 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return `Hace ${diff} días`;
}

/** "15 sep 2026 · WhatsApp" */
export function formatCommLine(comm: Pick<CommLike, 'communicated_at' | 'channel'>): string {
  const channel = COMM_CHANNEL_LABELS[comm.channel as CommChannel] ?? comm.channel;
  try {
    return `${format(parseISO(comm.communicated_at), 'd MMM yyyy', { locale: es })} · ${channel}`;
  } catch {
    return channel;
  }
}

/** "15 sep" corto para el drawer. */
export function formatCommShort(communicatedAt: string): string {
  try {
    return format(parseISO(communicatedAt), 'd MMM', { locale: es });
  } catch {
    return '';
  }
}
