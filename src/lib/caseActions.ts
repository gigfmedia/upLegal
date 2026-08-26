// Shared helper for Case Action Layer (Fase 4.19) — deterministic, no LLM, no DB
export const CASE_ACTION_TYPES = {
  REVIEW_MISSING_INFORMATION: 'review_missing_information',
  REVIEW_CONTRADICTIONS: 'review_contradictions',
  REVIEW_RISKS: 'review_risks',
  REVIEW_DOCUMENTS: 'review_documents',
  ASK_CASE_QUESTION: 'ask_case_question',
} as const;

export type CaseAction = {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  question?: string;
};

export function deriveCaseActions(intelligence: {
  contradictions?: unknown[];
  missingInformation?: unknown[];
  risks?: unknown[];
  pending_count?: number;
  failed_count?: number;
  document_count?: number;
  total_documents?: number;
}): CaseAction[] {
  if (!intelligence || typeof intelligence !== 'object') return [];
  const actions: CaseAction[] = [];
  const hasContradictions = Array.isArray(intelligence.contradictions) && intelligence.contradictions.length > 0;
  const hasMissing = Array.isArray(intelligence.missingInformation) && intelligence.missingInformation.length > 0;
  const hasRisks = Array.isArray(intelligence.risks) && intelligence.risks.length > 0;
  const pendingCount = Number(intelligence.pending_count) || 0;
  const failedCount = Number(intelligence.failed_count) || 0;
  const readyCount = Number(intelligence.document_count) || 0;
  const totalDocs = Number(intelligence.total_documents) || readyCount;

  if (failedCount > 0) {
    actions.push({ id: 'review_documents_failed', type: CASE_ACTION_TYPES.REVIEW_DOCUMENTS, title: 'Revisar documentos con error', description: `${failedCount} documento(s) no pudieron procesarse.`, priority: 'high' });
  }
  if (hasContradictions) {
    actions.push({ id: 'review_contradictions', type: CASE_ACTION_TYPES.REVIEW_CONTRADICTIONS, title: 'Revisar contradicciones', description: 'Hay información contradictoria entre los documentos.', priority: 'high', question: '¿Qué información contradictoria existe en este caso y qué documentos presentan cada versión?' });
  }
  if (hasMissing) {
    actions.push({ id: 'review_missing', type: CASE_ACTION_TYPES.REVIEW_MISSING_INFORMATION, title: 'Completar información pendiente', description: 'Revisa qué antecedentes faltan para completar el análisis del caso.', priority: 'high', question: '¿Qué información falta para completar el análisis de este caso?' });
  }
  if (hasRisks) {
    actions.push({ id: 'review_risks', type: CASE_ACTION_TYPES.REVIEW_RISKS, title: 'Revisar riesgos identificados', description: 'Revisa los puntos del caso que requieren especial atención.', priority: 'medium', question: '¿Cuáles son los principales riesgos identificados en este caso y qué documentos los respaldan?' });
  }
  if (pendingCount > 0) {
    actions.push({ id: 'review_pending', type: CASE_ACTION_TYPES.REVIEW_DOCUMENTS, title: 'Revisar documentos pendientes', description: `${pendingCount} documento(s) todavía no están disponibles para el análisis.`, priority: 'low' });
  }
  if (actions.length === 0) {
    if (readyCount === 0 && totalDocs === 0) {
      actions.push({ id: 'add_documents', type: CASE_ACTION_TYPES.REVIEW_DOCUMENTS, title: 'Agregar documentos', description: 'Sube un documento para obtener acciones específicas sobre este caso.', priority: 'low' });
    } else {
      actions.push({ id: 'ask_case', type: CASE_ACTION_TYPES.ASK_CASE_QUESTION, title: 'Preguntar sobre este caso', description: 'Haz una pregunta sobre los documentos y antecedentes disponibles.', priority: 'low', question: '¿Qué debería revisar ahora en este caso?' });
    }
  }
  const order = { high: 0, medium: 1, low: 2 } as const;
  actions.sort((a, b) => order[a.priority] - order[b.priority]);
  const seen = new Set<string>();
  const deduped: CaseAction[] = [];
  for (const a of actions) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      deduped.push(a);
    }
  }
  return deduped.slice(0, 3);
}
