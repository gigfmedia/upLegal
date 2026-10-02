/**
 * FASE 5.1 — Case Control helpers (pura lógica, sin I/O).
 * Regla única de vencimiento: due_at < now() AND completed = false.
 * Sin cron jobs: se calcula desde los datos actuales.
 */

export type CaseControlLike = {
  next_action?: string | null;
  next_action_due_at?: string | null;
  next_action_completed_at?: string | null;
};

export type CaseTaskLike = {
  id: string;
  title: string;
  due_at: string | null;
  completed: boolean;
  completed_at: string | null;
};

export function isOverdue(dueAt: string | null | undefined, completed: boolean, nowMs = Date.now()): boolean {
  if (!dueAt || completed) return false;
  const t = Date.parse(dueAt);
  if (Number.isNaN(t)) return false;
  return t < nowMs;
}

export function isNextActionOverdue(c: CaseControlLike, nowMs = Date.now()): boolean {
  const completed = !!c.next_action_completed_at;
  return isOverdue(c.next_action_due_at ?? null, completed, nowMs);
}

export function countPendingTasks(tasks: Pick<CaseTaskLike, 'completed'>[]): number {
  return tasks.filter((t) => !t.completed).length;
}

export function countOverdueTasks(tasks: CaseTaskLike[], nowMs = Date.now()): number {
  return tasks.filter((t) => isOverdue(t.due_at, t.completed, nowMs)).length;
}

/** El caso muestra su próxima acción solo si hay texto y no está completada. */
export function visibleNextAction(c: CaseControlLike): string | null {
  if (!c.next_action || !c.next_action.trim()) return null;
  if (c.next_action_completed_at) return null;
  return c.next_action;
}

/** ISO/string → Date (undefined si ausente o inválida). */
export function isoToDate(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : new Date(t);
}

/** Date → ISO a mediodía local (día calendario estable). Null si inválida. */
export function dateToNoonIso(d: Date): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  const c = new Date(d);
  c.setHours(12, 0, 0, 0);
  return c.toISOString();
}

/** Payload de completitud: marcar completada registra timestamp una sola vez. */
export function buildCompleteNextActionPatch(nowIso = new Date().toISOString()) {
  return { next_action_completed_at: nowIso };
}

export function buildCompleteTaskPatch(nowIso = new Date().toISOString()) {
  return { completed: true, completed_at: nowIso };
}

export function buildReopenTaskPatch() {
  return { completed: false, completed_at: null };
}
