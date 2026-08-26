// Fase 4.19: Case Action Layer — derivación determinista de acciones desde Case Intelligence.
// No usa LLM, no hace queries, no crea tablas, no toca RLS.

export const CASE_ACTION_TYPES = {
  REVIEW_MISSING_INFORMATION: 'review_missing_information',
  REVIEW_CONTRADICTIONS: 'review_contradictions',
  REVIEW_RISKS: 'review_risks',
  REVIEW_DOCUMENTS: 'review_documents',
  ASK_CASE_QUESTION: 'ask_case_question',
};

/**
 * Deriva acciones accionables desde la inteligencia del caso.
 * @param {object} intelligence - AICaseIntelligence
 * @returns {Array<{id:string, type:string, title:string, description:string, priority:'high'|'medium'|'low', question?:string}>}
 */
export function deriveCaseActions(intelligence) {
  if (!intelligence || typeof intelligence !== 'object') return [];

  const actions = [];

  const hasContradictions = Array.isArray(intelligence.contradictions) && intelligence.contradictions.length > 0;
  const hasMissing = Array.isArray(intelligence.missingInformation) && intelligence.missingInformation.length > 0;
  const hasRisks = Array.isArray(intelligence.risks) && intelligence.risks.length > 0;
  const pendingCount = Number(intelligence.pending_count) || 0;
  const failedCount = Number(intelligence.failed_count) || 0;
  const readyCount = Number(intelligence.document_count) || 0;
  const totalDocs = Number(intelligence.total_documents) || readyCount;

  // HIGH: documentos fallidos
  if (failedCount > 0) {
    actions.push({
      id: 'review_documents_failed',
      type: CASE_ACTION_TYPES.REVIEW_DOCUMENTS,
      title: 'Revisar documentos con error',
      description: `${failedCount} documento(s) no pudieron procesarse.`,
      priority: 'high',
    });
  }
  // HIGH: contradicciones
  if (hasContradictions) {
    actions.push({
      id: 'review_contradictions',
      type: CASE_ACTION_TYPES.REVIEW_CONTRADICTIONS,
      title: 'Revisar contradicciones',
      description: 'Hay información contradictoria entre los documentos.',
      priority: 'high',
      question: '¿Qué información contradictoria existe en este caso y qué documentos presentan cada versión?',
    });
  }
  // HIGH: información faltante
  if (hasMissing) {
    actions.push({
      id: 'review_missing',
      type: CASE_ACTION_TYPES.REVIEW_MISSING_INFORMATION,
      title: 'Completar información pendiente',
      description: 'Revisa qué antecedentes faltan para completar el análisis del caso.',
      priority: 'high',
      question: '¿Qué información falta para completar el análisis de este caso?',
    });
  }
  // MEDIUM: riesgos
  if (hasRisks) {
    actions.push({
      id: 'review_risks',
      type: CASE_ACTION_TYPES.REVIEW_RISKS,
      title: 'Revisar riesgos identificados',
      description: 'Revisa los puntos del caso que requieren especial atención.',
      priority: 'medium',
      question: '¿Cuáles son los principales riesgos identificados en este caso y qué documentos los respaldan?',
    });
  }
  // LOW: documentos pendientes
  if (pendingCount > 0) {
    actions.push({
      id: 'review_pending',
      type: CASE_ACTION_TYPES.REVIEW_DOCUMENTS,
      title: 'Revisar documentos pendientes',
      description: `${pendingCount} documento(s) todavía no están disponibles para el análisis.`,
      priority: 'low',
    });
  }
  // LOW: explorar con chat (siempre disponible como fallback)
  if (actions.length === 0) {
    if (readyCount === 0 && totalDocs === 0) {
      actions.push({
        id: 'add_documents',
        type: CASE_ACTION_TYPES.REVIEW_DOCUMENTS,
        title: 'Agregar documentos',
        description: 'Sube un documento para obtener acciones específicas sobre este caso.',
        priority: 'low',
      });
    } else {
      actions.push({
        id: 'ask_case',
        type: CASE_ACTION_TYPES.ASK_CASE_QUESTION,
        title: 'Preguntar sobre este caso',
        description: 'Haz una pregunta sobre los documentos y antecedentes disponibles.',
        priority: 'low',
        question: '¿Qué debería revisar ahora en este caso?',
      });
    }
  }

  // Ordena por prioridad high > medium > low y limita a 3 principales
  const order = { high: 0, medium: 1, low: 2 };
  actions.sort((a, b) => order[a.priority] - order[b.priority]);

  // Deduplica por id
  const seen = new Set();
  const deduped = [];
  for (const a of actions) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      deduped.push(a);
    }
  }

  return deduped.slice(0, 3);
}
