import { isActiveCaseStatus } from '@/lib/caseStatus';

export type PortfolioCaseLike = {
  id: string;
  status: string;
  stage?: string | null;
};

export type StageGroup = { stage: string | null; count: number; caseIds: string[] };
export type StatusGroup = { status: string; count: number; caseIds: string[] };

/** Normaliza etapa: trim, vacío → null (sin etapa). Máx 80 (par DB). */
export function normalizeStage(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim().replace(/\s+/g, ' ');
  if (!t) return null;
  return t.slice(0, 80);
}

export function activePortfolioCases<T extends PortfolioCaseLike>(cases: T[]): T[] {
  return cases.filter((c) => isActiveCaseStatus(c.status));
}

/**
 * FASE 5.3 — distribución por etapa sobre casos ACTIVOS.
 * Orden: mayor count primero (empate: alfabético, Sin etapa al final).
 */
export function groupByStage<T extends PortfolioCaseLike>(cases: T[]): StageGroup[] {
  const map = new Map<string | null, string[]>();
  for (const c of activePortfolioCases(cases)) {
    const key = normalizeStage(c.stage);
    const list = map.get(key);
    if (list) list.push(c.id);
    else map.set(key, [c.id]);
  }
  return Array.from(map.entries(), ([stage, caseIds]) => ({ stage, count: caseIds.length, caseIds }))
    .sort((a, b) =>
      b.count - a.count ||
      (a.stage === null ? 1 : b.stage === null ? -1 : a.stage.localeCompare(b.stage, 'es'))
    );
}

/** Distribución por estado operacional sobre TODOS (históricos incluidos). */
export function groupByStatus<T extends PortfolioCaseLike>(cases: T[]): StatusGroup[] {
  const map = new Map<string, string[]>();
  for (const c of cases) {
    const list = map.get(c.status);
    if (list) list.push(c.id);
    else map.set(c.status, [c.id]);
  }
  return Array.from(map.entries(), ([status, caseIds]) => ({ status, count: caseIds.length, caseIds }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
}

/** Etapas distintas (para filtros y sugerencias), alfabéticas. */
export function distinctStages<T extends PortfolioCaseLike>(cases: T[]): string[] {
  const set = new Set<string>();
  for (const c of cases) {
    const s = normalizeStage(c.stage);
    if (s) set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
}

export function stageLabel(stage: string | null): string {
  return stage ?? 'Sin etapa';
}
