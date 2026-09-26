/**
 * LegalUp AI — registro de features y gating por plan.
 *
 * Fase 3.5: el acceso a las features requiere una suscripción Essential
 * (activa o en trial). El backend es la autoridad real (402 AI_PLAN_REQUIRED);
 * esta capa solo guía la UI.
 */

export type AIFeatureKey =
  | 'document_analysis'
  | 'case_chat'
  | 'jurisprudence'
  | 'document_drafting'
  | 'case_analysis'
  | 'workflow_generation';

export type AIFeature = {
  key: AIFeatureKey;
  label: string;
};

export const AI_FEATURES: AIFeature[] = [
  { key: 'document_analysis', label: 'Analizar documento' },
  { key: 'case_chat', label: 'Chatear con mi caso' },
  { key: 'jurisprudence', label: 'Investigar jurisprudencia' },
  { key: 'document_drafting', label: 'Redactar documento' },
  { key: 'case_analysis', label: 'Analizar mi caso' },
  { key: 'workflow_generation', label: 'Generar workflow' },
];

export const AI_SUBSCRIPTION_PLAN = 'essential';
export const AI_SUBSCRIPTION_PRICE_CLP = 49900;
export const AI_SUBSCRIPTION_TRIAL_DAYS = 5;

export const AI_SUBSCRIPTION_PRICE_LABEL = '$49.900';

/** Límites de uso iniciales (trial y Essential). La autoridad operativa es el backend. */
export const AI_LIMITS = {
  trialMaxCases: 3,
  trialMaxDocuments: 10,
  maxDocumentSizeBytes: 20 * 1024 * 1024, // 20 MB
};

export const AI_PRO_LIMITS = {
  /** 4.38C: workspace is internal architecture, not a commercial quota. */
  maxCases: null as number | null,
  /** Total current stored AI documents per lawyer (deleting frees a slot). */
  maxDocuments: 50,
};

/** 4.38C canonical Pro monthly allowance (mirrors server/ai/proAllowance.mjs). */
export const AI_PRO_ALLOWANCE = {
  /** Successful AI questions/month, shared case_chat + document_chat pool. */
  chatPerMonth: 300,
  /** Successful document analyses/month. */
  analysisPerMonth: 40,
  /** Successful research/jurisprudence operations/month. */
  researchPerMonth: 10,
  /** Total current stored AI documents per lawyer. */
  storedDocuments: 50,
} as const;

/**
 * 4.44A free first-Case lifetime allowance (no monthly reset).
 * Attached to the lawyer's one free LAWYER_DIRECT Case (case-scoped).
 */
export const AI_FREE_CASE_ALLOWANCE = {
  /** Successful AI questions lifetime, shared case_chat + document_chat pool. */
  chatLifetime: 3,
  /** Successful document analyses lifetime. */
  analysisLifetime: 1,
  /** Current stored ai_documents rows in the free Case. */
  storedDocuments: 2,
} as const;

/** Features disponibles según el plan de la suscripción AI. */
const PLAN_FEATURES: Record<string, AIFeatureKey[]> = {
  free: [],
  essential: AI_FEATURES.map(f => f.key),
  // 4.38C: current Pro includes Research/Jurisprudence.
  pro_limited: ['document_analysis', 'case_chat', 'case_analysis', 'jurisprudence'],
  // 4.44A: free first Case (chat + analysis only; research stays blocked).
  free_case: ['document_analysis', 'case_chat'],
};

/**
 * Indica si el abogado tiene la feature habilitada según su plan.
 * Sin suscripción (free) no hay features disponibles en Fase 3.5.
 */
export function canUseAIFeature(feature: AIFeatureKey, plan: string = 'free'): boolean {
  const allowed = PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;
  return allowed.includes(feature);
}
