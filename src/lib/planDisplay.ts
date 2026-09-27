import { normalizePlanCode, type PlanCode } from './aiFeatures';

/**
 * 4.57D — display-only plan presentation (LegalUp Plus v1).
 * Server/DB remain the authority for quotas, prices and access; this module
 * only mirrors certified values for copy, paywall targeting and analytics.
 * Never use these numbers to grant access or enforce limits.
 */

/** Display-only Plus price (checkout authority: POST /api/pro/subscribe). */
export const PLUS_PRICE_CLP_DISPLAY = 79990;
/** Display-only Pro standard price. */
export const PRO_PRICE_CLP_DISPLAY = 49990;

export type PlanQuotaDisplay = {
  cases: number;
  documents: number;
  chat: number;
  analysis: number;
  research: number;
};

export const PLAN_QUOTAS_DISPLAY: Record<'free' | 'pro' | 'plus', PlanQuotaDisplay> = {
  free: { cases: 1, documents: 2, chat: 3, analysis: 1, research: 1 },
  pro: { cases: 20, documents: 50, chat: 300, analysis: 40, research: 10 },
  plus: { cases: 40, documents: 150, chat: 750, analysis: 100, research: 25 },
};

export type UpgradeTarget = 'pro' | 'plus' | null;

/**
 * Paywall target for an exhausted plan (§47-50):
 * free exhaustion → Pro; Pro exhaustion → Plus; Plus exhaustion → none
 * (limit/reset explanation only, never another paid tier).
 */
export function upgradeTargetForPlan(plan: unknown): UpgradeTarget {
  const code = normalizePlanCode(plan);
  if (code === 'free_case' || code === null) return 'pro';
  if (code === 'pro') return 'plus';
  return null;
}

/** True when the resolved plan is the paid Plus tier. */
export function isPlusPlan(plan: unknown): boolean {
  return normalizePlanCode(plan) === 'plus';
}

/** Display tier bucket for copy selection (free/pro/plus). */
export function displayTier(plan: unknown): 'free' | 'pro' | 'plus' {
  const code: PlanCode | null = normalizePlanCode(plan);
  if (code === 'plus') return 'plus';
  if (code === 'pro') return 'pro';
  return 'free';
}

const fmt = (v: number) => v.toLocaleString('es-CL');

/** Plan-aware commercial-limit copy. `plan` = backend-resolved plan/allowance. */
export function chatLimitMessage(plan: unknown): string {
  const tier = displayTier(plan);
  if (tier === 'plus') {
    return `Alcanzaste las ${fmt(PLAN_QUOTAS_DISPLAY.plus.chat)} consultas IA incluidas este mes. Tu disponibilidad se renovará el próximo mes.`;
  }
  if (tier === 'pro') {
    return `Alcanzaste las ${fmt(PLAN_QUOTAS_DISPLAY.pro.chat)} consultas IA incluidas este mes. Con LegalUp Plus tienes ${fmt(PLAN_QUOTAS_DISPLAY.plus.chat)} al mes.`;
  }
  return 'Ya usaste las 3 consultas IA incluidas en tu primer caso. Pasa a Pro para seguir usando IA.';
}

export function analysisLimitMessage(plan: unknown): string {
  const tier = displayTier(plan);
  if (tier === 'plus') {
    return `Alcanzaste los ${fmt(PLAN_QUOTAS_DISPLAY.plus.analysis)} análisis incluidos este mes. Se renovarán el próximo mes.`;
  }
  if (tier === 'pro') {
    return `Alcanzaste los ${fmt(PLAN_QUOTAS_DISPLAY.pro.analysis)} análisis incluidos este mes. Con LegalUp Plus tienes ${fmt(PLAN_QUOTAS_DISPLAY.plus.analysis)} al mes.`;
  }
  return 'Ya usaste el análisis incluido en tu primer caso. Pasa a Pro para seguir analizando documentos.';
}

export function researchLimitMessage(plan: unknown): string {
  const tier = displayTier(plan);
  if (tier === 'plus') {
    return `Alcanzaste las ${fmt(PLAN_QUOTAS_DISPLAY.plus.research)} investigaciones incluidas este mes. Se renovarán el próximo mes.`;
  }
  if (tier === 'pro') {
    return `Alcanzaste las ${fmt(PLAN_QUOTAS_DISPLAY.pro.research)} investigaciones incluidas este mes. Con LegalUp Plus tienes ${fmt(PLAN_QUOTAS_DISPLAY.plus.research)} al mes.`;
  }
  return 'Ya usaste la investigación jurídica incluida en tu primer caso. Pasa a Pro para seguir investigando.';
}

export function documentLimitMessage(plan: unknown): string {
  const tier = displayTier(plan);
  if (tier === 'plus') {
    return `Alcanzaste los ${fmt(PLAN_QUOTAS_DISPLAY.plus.documents)} documentos almacenados de tu plan. Elimina documentos que ya no necesites para liberar espacio.`;
  }
  if (tier === 'pro') {
    return `Alcanzaste los ${fmt(PLAN_QUOTAS_DISPLAY.pro.documents)} documentos almacenados de tu plan. Con LegalUp Plus tienes ${fmt(PLAN_QUOTAS_DISPLAY.plus.documents)}.`;
  }
  return 'Alcanzaste los 2 documentos de tu primer caso. Pasa a Pro para almacenar más documentos.';
}
