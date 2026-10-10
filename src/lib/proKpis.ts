/**
 * FASE 1.7 — Reglas del panel Pro desde Supabase (sin PostHog/GA4/cookies).
 *
 * Funciones puras sobre filas mínimas (ids + timestamps + enums). Nunca
 * reciben ni devuelven PII (sin emails, nombres, contenidos, títulos).
 * La agregación con privilegios vive SOLO en el endpoint server-side
 * `GET /api/admin/pro-kpis` (requireAdmin + service_role); este módulo
 * documenta y testea las mismas reglas sobre fixtures.
 *
 * Reglas:
 * - Semanas UTC iniciando lunes; etiqueta = YYYY-MM-DD del lunes.
 * - Ventana de activación: primer caso (o grant) ≤ registro + 7 días.
 *   Cohortes con <7 días se reportan como `pending`, no en el denominador.
 * - Cuentas de prueba/dueno se excluyen por id (el endpoint los resuelve
 *   por email + `@test.invalid`; aquí se reciben ya excluidos o por param).
 * - Casos eliminados (hard delete) son invisibles: `pro_free_case_grants`
 *   actúa como respaldo para el primer caso gratuito.
 * - "Próxima gestión" solo es observable como estado actual (sin historial):
 *   se reporta como proxy, no como evento.
 * - Retención: acción significativa en [activación+1d, activación+7d];
 *   `updated_at` de casos se excluye por ruidoso.
 */

export const ACTIVATION_WINDOW_DAYS = 7;
export const RETENTION_WINDOW_DAYS = 7;
export const DAY_MS = 24 * 60 * 60 * 1000;

export type LawyerRow = { id: string; created_at: string };
export type CaseRow = { lawyer_id: string; created_at: string };
export type GrantRow = { lawyer_id: string; consumed_at: string };
export type TaskRow = { lawyer_id: string; created_at: string; completed: boolean; completed_at: string | null };
export type NextActionState = { lawyer_id: string; has_next_action: boolean };
export type DocRow = { lawyer_id: string; created_at: string; ready: boolean };
export type AnalysisRow = { lawyer_id: string; created_at: string };
export type AssistantMessageRow = { lawyer_id: string; created_at: string };
export type UsageRow = { lawyer_id: string; created_at: string };
export type SubscriptionRow = { lawyer_id: string; status: string; current_period_end: string | null; amount_clp: number };
export type PaymentRow = { lawyer_id: string; status: string; provider_payment_id: string; provider_authorized_payment_id: string };

export type WeekBucket = { week_start: string; new_lawyers: number };

/** Lunes 00:00 UTC de la semana que contiene `d`. */
export function weekStartUtc(d: Date): Date {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = copy.getUTCDay(); // 0=domingo
  const diff = (day + 6) % 7; // días desde el lunes
  copy.setUTCDate(copy.getUTCDate() - diff);
  return copy;
}

export function toWeekLabel(d: Date): string {
  return weekStartUtc(d).toISOString().slice(0, 10);
}

function toTime(value: string): number | null {
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/** KPI 1 — abogados nuevos por semana (ya excluidas cuentas de prueba). */
export function bucketNewLawyersByWeek(lawyers: LawyerRow[]): WeekBucket[] {
  const map = new Map<string, number>();
  for (const l of lawyers) {
    const t = toTime(l.created_at);
    if (t === null) continue;
    const label = toWeekLabel(new Date(t));
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([week_start, new_lawyers]) => ({ week_start, new_lawyers }))
    .sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
}

export type ActivationCohort = {
  week_start: string;
  registered: number;
  activated_7d: number;
  activation_rate_7d: number | null;
  pending: number;
};

/**
 * KPI 2 — activación a 7 días por cohorte semanal de registro.
 * `firstCaseAt`/`firstGrantAt`: mapas lawyer_id → primer timestamp observado
 * (casos Everett + grants como respaldo ante hard deletes).
 */
export function activationByCohort(
  lawyers: LawyerRow[],
  firstCaseAt: Map<string, number>,
  firstGrantAt: Map<string, number>,
  nowMs: number,
): ActivationCohort[] {
  const cohorts = new Map<string, { registered: LawyerRow[] }>();
  for (const l of lawyers) {
    const t = toTime(l.created_at);
    if (t === null) continue;
    const label = toWeekLabel(new Date(t));
    const entry = cohorts.get(label) ?? { registered: [] };
    entry.registered.push(l);
    cohorts.set(label, entry);
  }
  const out: ActivationCohort[] = [];
  for (const [week_start, { registered }] of cohorts) {
    let complete = 0;
    let activated = 0;
    let pending = 0;
    for (const l of registered) {
      const reg = toTime(l.created_at);
      if (reg === null) continue;
      if (nowMs - reg < ACTIVATION_WINDOW_DAYS * DAY_MS) {
        pending += 1;
        continue;
      }
      complete += 1;
      const firstActive = Math.min(
        firstCaseAt.get(l.id) ?? Number.POSITIVE_INFINITY,
        firstGrantAt.get(l.id) ?? Number.POSITIVE_INFINITY,
      );
      if (firstActive <= reg + ACTIVATION_WINDOW_DAYS * DAY_MS) activated += 1;
    }
    out.push({
      week_start,
      registered: registered.length,
      activated_7d: activated,
      activation_rate_7d: complete > 0 ? activated / complete : null,
      pending,
    });
  }
  return out.sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
}

export type ManagementAdoption = {
  activated_lawyers: number;
  with_task_ever: number;
  with_next_action_now: number;
  with_either: number;
  task_rate: number | null;
};

/** KPI 3 — adopción de gestión entre activados (tareas exacto + gestión proxy). */
export function managementAdoption(
  activatedIds: string[],
  tasks: TaskRow[],
  nextActions: NextActionState[],
): ManagementAdoption {
  const withTask = new Set(tasks.map((t) => t.lawyer_id));
  const withNext = new Set(nextActions.filter((n) => n.has_next_action).map((n) => n.lawyer_id));
  let withTaskCount = 0;
  let withNextCount = 0;
  let either = 0;
  for (const id of activatedIds) {
    const t = withTask.has(id);
    const n = withNext.has(id);
    if (t) withTaskCount += 1;
    if (n) withNextCount += 1;
    if (t || n) either += 1;
  }
  return {
    activated_lawyers: activatedIds.length,
    with_task_ever: withTaskCount,
    with_next_action_now: withNextCount,
    with_either: either,
    task_rate: activatedIds.length > 0 ? withTaskCount / activatedIds.length : null,
  };
}

/**
 * KPI 4 — abogados únicos con uso real de documentos o IA (éxito, no
 * aperturas): documento `ready`, análisis completado, respuesta de
 * asistente o operación de uso medida.
 */
export function docsAndAiUsers(
  docs: DocRow[],
  analyses: AnalysisRow[],
  assistantMessages: AssistantMessageRow[],
  usageOps: UsageRow[],
): { lawyers: number; lawyer_ids: string[] } {
  const ids = new Set<string>();
  for (const d of docs) if (d.ready) ids.add(d.lawyer_id);
  for (const a of analyses) ids.add(a.lawyer_id);
  for (const m of assistantMessages) ids.add(m.lawyer_id);
  for (const u of usageOps) ids.add(u.lawyer_id);
  return { lawyers: ids.size, lawyer_ids: [...ids].sort() };
}

export type RetentionCohort = {
  first_activation_week: string;
  activated: number;
  returned_week_after: number;
  retention_rate: number | null;
  pending: number;
};

export type SignificantAction = { lawyer_id: string; created_at: string };

/**
 * KPI 5 — retorno en la semana siguiente a la primera activación.
 * `firstActivationAt`: lawyer_id → ms de la primera activación (caso/grant).
 * Ventana (d+1d, d+7d]; cohortes con ventana incompleta van a `pending`.
 */
export function retentionAfterActivation(
  firstActivationAt: Map<string, number>,
  actions: SignificantAction[],
  nowMs: number,
): RetentionCohort[] {
  const byWeek = new Map<string, string[]>();
  for (const [id, at] of firstActivationAt) {
    const label = toWeekLabel(new Date(at));
    const list = byWeek.get(label) ?? [];
    list.push(id);
    byWeek.set(label, list);
  }
  const actionsByLawyer = new Map<string, number[]>();
  for (const a of actions) {
    const t = toTime(a.created_at);
    if (t === null) continue;
    const list = actionsByLawyer.get(a.lawyer_id) ?? [];
    list.push(t);
    actionsByLawyer.set(a.lawyer_id, list);
  }
  const out: RetentionCohort[] = [];
  for (const [first_activation_week, ids] of byWeek) {
    let complete = 0;
    let returned = 0;
    let pending = 0;
    for (const id of ids) {
      const at = firstActivationAt.get(id);
      if (at === undefined) continue;
      // Ventana (d+1, d+7] cerrada cuando now - at >= 7d.
      if (nowMs - at < RETENTION_WINDOW_DAYS * DAY_MS) {
        pending += 1;
        continue;
      }
      complete += 1;
      const windowStart = at + DAY_MS;
      const windowEnd = at + RETENTION_WINDOW_DAYS * DAY_MS;
      const acted = (actionsByLawyer.get(id) ?? []).some((t) => t > windowStart && t <= windowEnd);
      if (acted) returned += 1;
    }
    out.push({
      first_activation_week,
      activated: complete,
      returned_week_after: returned,
      retention_rate: complete > 0 ? returned / complete : null,
      pending,
    });
  }
  return out.sort((a, b) => (a.first_activation_week < b.first_activation_week ? -1 : 1));
}

export type ProConversion = {
  active_subscriptions: number;
  active_lawyers: number;
  paid_lawyers: number;
  /**
   * Monto comprometido del período vigente (NO MRR normalizado: amount_clp
   * mezcla intro/estándar/Plus e incluye canceladas vigentes).
   */
  active_amount_clp: number;
};

/**
 * KPI 6 — conversión a Pro. Suscripción activa = `active` o `cancelled`
 * con período vigente (mismo criterio que `has_pro_access`). Pago confirmado
 * = ledger con `status='approved'` (dedupe por abogado; el ledger ya es
 * idempotente por ids de provider).
 */
export function proConversion(
  subscriptions: SubscriptionRow[],
  payments: PaymentRow[],
  nowMs: number,
): ProConversion {
  const activeLawyers = new Set<string>();
  let activeAmount = 0;
  for (const s of subscriptions) {
    const end = s.current_period_end ? toTime(s.current_period_end) : null;
    const active = s.status === 'active' || (s.status === 'cancelled' && end !== null && end > nowMs);
    if (active) {
      activeLawyers.add(s.lawyer_id);
      activeAmount += Number.isFinite(s.amount_clp) ? s.amount_clp : 0;
    }
  }
  const paidLawyers = new Set(
    payments.filter((p) => p.status === 'approved').map((p) => p.lawyer_id),
  );
  return {
    active_subscriptions: activeLawyers.size,
    active_lawyers: activeLawyers.size,
    paid_lawyers: paidLawyers.size,
    active_amount_clp: activeAmount,
  };
}
