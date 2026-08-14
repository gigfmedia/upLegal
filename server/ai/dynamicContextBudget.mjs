// ---------------------------------------------------------------------------
// LegalUp AI — Fase 4.2.7: Dynamic Context Budget para MIXED MODE.
//
// Reemplaza el reparto estático 75%/25% por una asignación dinámica basada en
// la evidencia realmente disponible y relevante en cada polo (documentos vs.
// fuentes jurídicas).
//
// Módulo puro y determinista: misma entrada → misma salida. Sin I/O, sin
// Supabase, sin Express. Reutiliza la lógica de chunking/scoring de Fase 3 y
// el ranking de Fase 4.2.5.
// ---------------------------------------------------------------------------

import { chunkText, scoreChunk, tokenize } from './legalChatPrompt.mjs';
import { chunkDocumentText, scoreDocumentChunks, selectDocumentChunks, DOCUMENT_GROUNDING_LIMITS } from './documentGrounding.mjs';
import { hasSubstantiveNormativeEvidence } from './jurisprudenceSources.mjs';

// ---------------------------------------------------------------------------
// Constantes de límites (coherentes con Fase 4.2.5 y 4.2.6)
// ---------------------------------------------------------------------------

export const DYNAMIC_CONTEXT_LIMITS = {
  // Límite global del contexto (Fase 4.2.5)
  MAX_CONTEXT_CHARS: 30000,
  // Límite absoluto documental (Fase 4.2.6)
  MAX_DOCUMENT_CONTEXT_CHARS: 15000,
  // Mínimo de ratio por polo cuando ambos tienen evidencia
  MIN_POLE_RATIO: 0.20,
  // Mínimo absoluto de presupuesto por polo cuando tiene evidencia
  MIN_DOCUMENT_BUDGET: 5000,
  MIN_LEGAL_BUDGET: 5000,
};

// ---------------------------------------------------------------------------
// calculateDocumentEvidenceWeight
//
// Calcula el peso de la evidencia documental basado en:
//   - Fragmentos relevantes (cantidad y score)
//   - Cobertura del query en el documento
//   - Evidencia útil (fragmentos con score > 0)
//   - Tamaño como factor secundario
//
// Reutiliza chunking, tokenize y scoreChunk de Fase 3/Document Grounding.
// NO crea un segundo algoritmo semántico.
// ---------------------------------------------------------------------------

/**
 * Calcula el peso de la evidencia documental disponible.
 * @param {object} input
 * @param {object[]} input.documents - Documentos del caso { id, extracted_text, original_filename }
 * @param {string} input.query - Consulta del abogado
 * @returns {number} Peso numérico (0 si no hay evidencia útil)
 */
export function calculateDocumentEvidenceWeight({ documents = [], query = '' }) {
  if (!Array.isArray(documents) || documents.length === 0) return 0;
  if (!query || typeof query !== 'string') return 0;

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  let totalRelevantFragments = 0;
  let totalScore = 0;
  let documentsWithEvidence = 0;

  for (const doc of documents) {
    if (!doc || typeof doc !== 'object') continue;
    const text = String(doc.extracted_text || '');
    if (!text.trim()) continue;

    // Chunking determinista (reutiliza lógica de Fase 3/4.2.6)
    const chunks = chunkDocumentText(text, { documentId: doc.id });
    
    // Scoring léxico (reutiliza lógica de Fase 3/4.2.6)
    const scored = scoreDocumentChunks(query, chunks);
    
    // Filtrar fragmentos relevantes (score > 0)
    const relevant = scored.filter((s) => s.score > 0);
    
    if (relevant.length === 0) continue;

    documentsWithEvidence += 1;
    totalRelevantFragments += relevant.length;
    totalScore += relevant.reduce((sum, s) => sum + s.score, 0);
  }

  // Si ningún documento tiene evidencia relevante, peso es 0
  if (documentsWithEvidence === 0) return 0;

  // Peso base: cantidad de fragmentos relevantes
  const fragmentWeight = totalRelevantFragments;

  // Peso de calidad: score medio de fragmentos relevantes
  const avgScore = totalScore / totalRelevantFragments;
  const qualityWeight = avgScore * 10; // Escalar para que tenga peso comparable

  // Peso de diversidad: documentos con evidencia (penaliza concentración en un solo doc)
  const diversityWeight = documentsWithEvidence * 2;

  // Peso total: suma de factores (sin normalización, se normaliza en allocation)
  return fragmentWeight + qualityWeight + diversityWeight;
}

// ---------------------------------------------------------------------------
// calculateLegalEvidenceWeight
//
// Calcula el peso de la evidencia jurídica basado en:
//   - Evidencia sustantiva (fragmentos reales, no metadata_only)
//   - Relevancia de las fuentes
//   - Diversidad de fuentes (no contar fragmentos casi idénticos)
//   - Tipo según intent (jurisprudencia/normativa/doctrina)
//   - metadata_only recibe peso bajo/0
//
// Reutiliza información ya calculada por selectSourcesForContext/rankSources.
// NO duplica el ranking jurídico.
// ---------------------------------------------------------------------------

/**
 * Calcula el peso de la evidencia jurídica disponible.
 * @param {object} input
 * @param {object[]} input.sources - Fuentes recuperadas { id, kind, metadata, excerpt }
 * @param {string} input.query - Consulta del abogado
 * @param {string} input.intentClass - Clasificación de intención (Fase 4.2.1)
 * @returns {number} Peso numérico (0 si no hay evidencia sustantiva)
 */
export function calculateLegalEvidenceWeight({ sources = [], query = '', intentClass = '' }) {
  if (!Array.isArray(sources) || sources.length === 0) return 0;

  let totalFragments = 0;
  let sourcesWithEvidence = 0;
  let kindWeight = 0;

  // Prioridad por tipo según intent (reutiliza lógica de Fase 4.2.3)
  const intentPriority = {
    ARTICLE_LOOKUP: { normativa: 1000, jurisprudencia: 120, doctrina: 60 },
    BARE_NORM_CITATION: { normativa: 1000, jurisprudencia: 120, doctrina: 60 },
    NORMATIVE_APPLICATION: { normativa: 800, jurisprudencia: 200, doctrina: 100 },
    JURISPRUDENCE_LOOKUP: { jurisprudencia: 1000, doctrina: 200, normativa: 80 },
    DOCTRINE_LOOKUP: { doctrina: 1000, jurisprudencia: 200, normativa: 80 },
    RELATIONAL_LEGAL_QUERY: { normativa: 600, jurisprudencia: 600, doctrina: 100 },
    MIXED_NORM_JURISPRUDENCE: { normativa: 600, jurisprudencia: 600, doctrina: 100 },
    DOCUMENT_ANALYSIS: { normativa: 0, jurisprudencia: 0, doctrina: 0 },
    GENERAL_LEGAL_QUERY: { normativa: 500, jurisprudencia: 480, doctrina: 260 },
  };

  const priority = intentPriority[intentClass] || intentPriority.GENERAL_LEGAL_QUERY;

  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;

    // Evidence gate: normas sin evidencia sustantiva NO cuentan (Fase 4.2.5)
    if (source.kind === 'normativa' && !hasSubstantiveNormativeEvidence(source)) {
      continue;
    }

    // metadata_only recibe peso bajo
    if (source.kind === 'normativa' && source.metadata_only === true) {
      kindWeight += (priority[source.kind] || 0) * 0.1;
      continue;
    }

    // Contar fragmentos reales
    const fragments = Array.isArray(source.metadata?.fragments) ? source.metadata.fragments : [];
    const fragmentCount = fragments.length;

    if (fragmentCount === 0) {
      // Fuente sin fragmentos: peso bajo
      kindWeight += (priority[source.kind] || 0) * 0.2;
      continue;
    }

    sourcesWithEvidence += 1;
    totalFragments += fragmentCount;
    kindWeight += priority[source.kind] || 0;
  }

  // Si ninguna fuente tiene evidencia sustantiva, peso es 0
  if (sourcesWithEvidence === 0 && kindWeight === 0) return 0;

  // Peso base: cantidad de fragmentos
  const fragmentWeight = totalFragments;

  // Peso de calidad: prioridad por tipo según intent
  const qualityWeight = kindWeight;

  // Peso de diversidad: fuentes con evidencia
  const diversityWeight = sourcesWithEvidence * 5;

  // Peso total
  return fragmentWeight + qualityWeight + diversityWeight;
}

// ---------------------------------------------------------------------------
// allocateDynamicContextBudget
//
// Asigna presupuesto de contexto dinámicamente basado en los pesos de evidencia.
//
// Algoritmo:
//   - Caso A: ambos polos tienen evidencia → reparto proporcional con mínimos
//   - Caso B: solo documentos → 100% documentos (capped at 15k)
//   - Caso C: solo fuentes → 100% fuentes
//   - Caso D: ninguno → 0 para ambos
//
// Aplica límites:
//   - MIN_POLE_RATIO = 20% cuando ambos tienen evidencia
//   - MIN_DOCUMENT_BUDGET = 5000 cuando tiene evidencia
//   - MIN_LEGAL_BUDGET = 5000 cuando tiene evidencia
//   - MAX_DOCUMENT_CONTEXT_CHARS = 15000 (cap absoluto)
//   - MAX_CONTEXT_CHARS = 30000 (global)
// ---------------------------------------------------------------------------

/**
 * Asigna presupuesto de contexto dinámicamente.
 * @param {object} input
 * @param {object[]} input.documents - Documentos del caso
 * @param {object[]} input.sources - Fuentes jurídicas
 * @param {string} input.query - Consulta del abogado
 * @param {string} input.intentClass - Clasificación de intención
 * @param {string} input.documentMode - 'document' | 'mixed' | 'none'
 * @returns {object} { documentBudget, legalBudget, documentRatio, legalRatio, documentWeight, legalWeight }
 */
export function allocateDynamicContextBudget({
  documents = [],
  sources = [],
  query = '',
  intentClass = '',
  documentMode = 'none',
}) {
  const { MAX_CONTEXT_CHARS, MAX_DOCUMENT_CONTEXT_CHARS, MIN_POLE_RATIO, MIN_DOCUMENT_BUDGET, MIN_LEGAL_BUDGET } = DYNAMIC_CONTEXT_LIMITS;

  // Solo aplicamos allocation dinámica en modo mixed
  if (documentMode !== 'mixed') {
    // Modo document: solo documentos (capped at 15k)
    if (documentMode === 'document') {
      return {
        documentBudget: Math.min(MAX_DOCUMENT_CONTEXT_CHARS, MAX_CONTEXT_CHARS),
        legalBudget: 0,
        documentRatio: 1.0,
        legalRatio: 0.0,
        documentWeight: 0, // No calculado en modo document
        legalWeight: 0,
      };
    }
    // Modo none: solo fuentes
    return {
      documentBudget: 0,
      legalBudget: MAX_CONTEXT_CHARS,
      documentRatio: 0.0,
      legalRatio: 1.0,
      documentWeight: 0,
      legalWeight: 0,
    };
  }

  // Calcular pesos de evidencia
  const documentWeight = calculateDocumentEvidenceWeight({ documents, query });
  const legalWeight = calculateLegalEvidenceWeight({ sources, query, intentClass });

  // Caso D: ninguno tiene evidencia
  if (documentWeight === 0 && legalWeight === 0) {
    return {
      documentBudget: 0,
      legalBudget: 0,
      documentRatio: 0.0,
      legalRatio: 0.0,
      documentWeight: 0,
      legalWeight: 0,
    };
  }

  // Caso B: solo documentos
  if (documentWeight > 0 && legalWeight === 0) {
    return {
      documentBudget: Math.min(MAX_DOCUMENT_CONTEXT_CHARS, MAX_CONTEXT_CHARS),
      legalBudget: 0,
      documentRatio: 1.0,
      legalRatio: 0.0,
      documentWeight,
      legalWeight: 0,
    };
  }

  // Caso C: solo fuentes
  if (documentWeight === 0 && legalWeight > 0) {
    return {
      documentBudget: 0,
      legalBudget: MAX_CONTEXT_CHARS,
      documentRatio: 0.0,
      legalRatio: 1.0,
      documentWeight: 0,
      legalWeight,
    };
  }

  // Caso A: ambos tienen evidencia → reparto proporcional con límites
  const totalWeight = documentWeight + legalWeight;
  const rawDocumentRatio = documentWeight / totalWeight;
  const rawLegalRatio = legalWeight / totalWeight;

  // Aplicar mínimo 20% por polo
  let documentRatio = rawDocumentRatio;
  let legalRatio = rawLegalRatio;

  if (documentRatio < MIN_POLE_RATIO) {
    documentRatio = MIN_POLE_RATIO;
    legalRatio = 1 - MIN_POLE_RATIO;
  }
  if (legalRatio < MIN_POLE_RATIO) {
    legalRatio = MIN_POLE_RATIO;
    documentRatio = 1 - MIN_POLE_RATIO;
  }

  // Calcular presupuesto inicial
  let documentBudget = Math.floor(MAX_CONTEXT_CHARS * documentRatio);
  let legalBudget = Math.floor(MAX_CONTEXT_CHARS * legalRatio);

  // Aplicar cap absoluto documental (15k)
  if (documentBudget > MAX_DOCUMENT_CONTEXT_CHARS) {
    documentBudget = MAX_DOCUMENT_CONTEXT_CHARS;
    legalBudget = MAX_CONTEXT_CHARS - documentBudget;
  }

  // Aplicar mínimos absolutos (5k) cuando el polo tiene evidencia
  if (documentWeight > 0 && documentBudget < MIN_DOCUMENT_BUDGET) {
    documentBudget = MIN_DOCUMENT_BUDGET;
    legalBudget = MAX_CONTEXT_CHARS - documentBudget;
  }
  if (legalWeight > 0 && legalBudget < MIN_LEGAL_BUDGET) {
    legalBudget = MIN_LEGAL_BUDGET;
    documentBudget = MAX_CONTEXT_CHARS - legalBudget;
  }

  // Aplicar cap documental nuevamente (por si el mínimo legal lo violó)
  if (documentBudget > MAX_DOCUMENT_CONTEXT_CHARS) {
    documentBudget = MAX_DOCUMENT_CONTEXT_CHARS;
    legalBudget = MAX_CONTEXT_CHARS - documentBudget;
  }

  // Garantizar que total no exceda MAX_CONTEXT_CHARS
  const totalBudget = documentBudget + legalBudget;
  if (totalBudget > MAX_CONTEXT_CHARS) {
    const excess = totalBudget - MAX_CONTEXT_CHARS;
    // Reducir proporcionalmente
    documentBudget = Math.floor(documentBudget - excess * (documentBudget / totalBudget));
    legalBudget = MAX_CONTEXT_CHARS - documentBudget;
  }

  // Recalcular ratios finales para telemetría
  const finalDocumentRatio = MAX_CONTEXT_CHARS > 0 ? documentBudget / MAX_CONTEXT_CHARS : 0;
  const finalLegalRatio = MAX_CONTEXT_CHARS > 0 ? legalBudget / MAX_CONTEXT_CHARS : 0;

  return {
    documentBudget,
    legalBudget,
    documentRatio: finalDocumentRatio,
    legalRatio: finalLegalRatio,
    documentWeight,
    legalWeight,
  };
}
