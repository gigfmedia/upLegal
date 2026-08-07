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
  | 'case_analysis';

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

/** Features disponibles según el plan de la suscripción AI. */
const PLAN_FEATURES: Record<string, AIFeatureKey[]> = {
  free: [],
  essential: AI_FEATURES.map(f => f.key),
};

/**
 * Indica si el abogado tiene la feature habilitada según su plan.
 * Sin suscripción (free) no hay features disponibles en Fase 3.5.
 */
export function canUseAIFeature(feature: AIFeatureKey, plan: string = 'free'): boolean {
  const allowed = PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;
  return allowed.includes(feature);
}
