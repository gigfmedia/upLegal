import { differenceInCalendarDays, endOfDay, format, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { isActiveCaseStatus } from '@/lib/caseStatus';
import { visibleNextAction } from '@/lib/caseControl';

export type ActionCaseLike = {
  id: string;
  title: string;
  status: string;
  next_action?: string | null;
  next_action_due_at?: string | null;
  next_action_completed_at?: string | null;
  updated_at: string;
};

export type ActionTaskLike = {
  id: string;
  case_id: string;
  title: string;
  due_at: string | null;
  completed: boolean;
};

export type ActionItem =
  | { kind: 'next_action'; key: string; caseId: string; caseTitle: string; title: string; dueAt: string }
  | { kind: 'task'; key: string; taskId: string; caseId: string; caseTitle: string; title: string; dueAt: string };

export type NoActionCase = { id: string; title: string; updatedAt: string };

export type ActionCenterData = {
  overdue: ActionItem[];
  today: ActionItem[];
  next7: ActionItem[];
  noNextAction: NoActionCase[];
};

function parseDue(iso: string): number {
  return Date.parse(iso);
}

/**
 * FASE 5.2 — única lógica temporal del Action Center.
 * Vencido: due < inicio de hoy. Hoy: dentro del día. Próximos 7: >
 * fin de hoy y <= fin del día +7. Todo contra el inicio/fin del día
 * local (NO due < now(): algo de hoy a las 9:00 no está vencido a las 8:00).
 * Excluye closed/cancelled, gestiones completadas y tareas completadas.
 */
export function buildActionCenter(
  cases: ActionCaseLike[],
  tasks: ActionTaskLike[],
  nowMs = Date.now()
): ActionCenterData {
  const now = new Date(nowMs);
  const startToday = startOfDay(now).getTime();
  const endToday = endOfDay(now).getTime();
  const endWeek = endOfDay(new Date(nowMs + 7 * 86400000)).getTime();

  const active = cases.filter((c) => isActiveCaseStatus(c.status));
  const titles = new Map(active.map((c) => [c.id, c.title]));

  const dated: ActionItem[] = [];

  for (const c of active) {
    if (visibleNextAction(c) && c.next_action_due_at) {
      const t = parseDue(c.next_action_due_at);
      if (!Number.isNaN(t)) {
        dated.push({
          kind: 'next_action',
          key: `na:${c.id}`,
          caseId: c.id,
          caseTitle: c.title,
          title: visibleNextAction(c) as string,
          dueAt: c.next_action_due_at,
        });
      }
    }
  }

  for (const t of tasks) {
    if (t.completed || !t.due_at) continue;
    const ts = parseDue(t.due_at);
    if (Number.isNaN(ts)) continue;
    const caseTitle = titles.get(t.case_id);
    if (!caseTitle) continue; // tarea de caso inactivo/eliminado: fuera del centro
    dated.push({
      kind: 'task',
      key: `task:${t.id}`,
      taskId: t.id,
      caseId: t.case_id,
      caseTitle,
      title: t.title,
      dueAt: t.due_at,
    });
  }

  const byDueAsc = (a: ActionItem, b: ActionItem) => parseDue(a.dueAt) - parseDue(b.dueAt);
  const overdue = dated.filter((i) => parseDue(i.dueAt) < startToday).sort(byDueAsc);
  const today = dated
    .filter((i) => { const t = parseDue(i.dueAt); return t >= startToday && t <= endToday; })
    .sort(byDueAsc);
  const next7 = dated
    .filter((i) => { const t = parseDue(i.dueAt); return t > endToday && t <= endWeek; })
    .sort(byDueAsc);

  const noNextAction = active
    .filter((c) => !visibleNextAction(c))
    .map((c) => ({ id: c.id, title: c.title, updatedAt: c.updated_at }))
    .sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));

  return { overdue, today, next7, noNextAction };
}

/** "Venció ayer" / "Venció 28 sep" / "Hoy" / "lun 12 oct" / "8 oct 2026". */
export function formatActionDate(iso: string, nowMs = Date.now()): string {
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = differenceInCalendarDays(d, new Date(nowMs));
  if (diff < 0) {
    return diff === -1 ? 'Venció ayer' : `Venció ${format(d, 'd MMM', { locale: es })}`;
  }
  if (diff === 0) return 'Hoy';
  if (diff <= 7) return format(d, "EEE d MMM", { locale: es });
  return format(d, 'd MMM yyyy', { locale: es });
}

/** "hace 6 días" / "ayer" / "hoy" para casos sin próxima gestión. */
export function formatStaleLabel(updatedAt: string, nowMs = Date.now()): string {
  const d = parseISO(updatedAt);
  if (Number.isNaN(d.getTime())) return '';
  const diff = differenceInCalendarDays(new Date(nowMs), d);
  if (diff <= 0) return 'Actualizado hoy';
  if (diff === 1) return 'Actualizado ayer';
  return `Actualizado hace ${diff} días`;
}
