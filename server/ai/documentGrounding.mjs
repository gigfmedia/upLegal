// ---------------------------------------------------------------------------
// LegalUp AI — Fase 4.2.6: DOCUMENT GROUNDING (CASE INTELLIGENCE).
// Conecta la investigación jurídica con los documentos PRIVADOS del caso
// (Pipeline A, Fase 2/3). Reutiliza el chunking + scoring léxico de Fase 3
// (NO OCR, NO embeddings, NO pgvector): la evidencia documental es un fragmento
// TEXTUAL real del documento, seleccionado por relevancia a la consulta.
//
// Separación estricta (regla de oro de la fase):
//   - DOCUMENTO     → hechos del caso (lo que dice el documento privado).
//   - FUENTE JURÍDICA → norma / jurisprudencia / doctrina (fuentes públicas).
//   - INFERENCIA    → deducción razonable etiquetada, nunca presentada como hecho.
//
// Módulo puro (sin I/O): recibe los documentos ya filtrados por ownership y
// devuelve evidencia + verificación de claims, testeable sin levantar Express.
// ---------------------------------------------------------------------------

import { chunkText, scoreChunk, tokenize } from './legalChatPrompt.mjs';
import {
  resolveClaimFragment,
  fragmentSupportsClaim,
  DOCUMENT_SIGNAL_RE,
  GENERIC_LEGAL_SIGNAL_RE,
  hasCaseReferenceSignal,
} from './jurisprudenceSources.mjs';

// Límites del presupuesto documental (coherentes con el chunking de Fase 3).
export const DOCUMENT_GROUNDING_LIMITS = {
  // Tamaño/solape de fragmentos (mismos valores que CHAT_LIMITS de Fase 3).
  CHUNK_SIZE: 3000,
  CHUNK_OVERLAP: 300,
  // Máximo de chunks por documento: con tamaño 3000/solape 300 cubre el tope de
  // extracción (80.000 chars) con holgura.
  MAX_CHUNKS_PER_DOC: 40,
  // Presupuesto de caracteres de evidencia documental enviada al modelo. En modo
  // mixto la ruta lo reduce para reservar espacio a las fuentes públicas.
  MAX_DOCUMENT_CONTEXT_CHARS: 15000,
  // Margen para encabezados del bloque ("Documento:"/"fragment_id:"/…).
  HEADER_RESERVE_RATIO: 0.9,
  // Mínimo de caracteres del "fragmento" citado por el modelo para exigir que
  // aparezca LITERALMENTE en el documento. Citas cortas/generales se obvian para
  // no descartar afirmaciones por normalización, pero una cita larga inventada
  // (anti-alucinación) siempre se descarta.
  MIN_FRAGMENTO_CHECK_CHARS: 25,
};

/**
 * Normaliza texto para comparar PRESENCIA literal (no overlap): minúsculas,
 * sin diacríticos, espacios colapsados y puntuación final recortada. Permite
 * verificar que un fragmento citado por el modelo exista textualmente en el
 * documento, tolerando diferencias de mayúsculas/acentos/puntos finales.
 */
function normalizeForPresence(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?"'…]+\s*$/g, '')
    .trim();
}

/** Prefijo de los fragment_id deterministas de documentos. */
export const DOCUMENT_FRAGMENT_PREFIX = 'document';

/**
 * Fragmenta el texto extraído de un documento en chunks deterministas con id.
 * El id `document::<docId>::<index>` es estable: el mismo texto + opciones
 * produce siempre los mismos ids, lo que permite a verifyDocumentClaims
 * re-fragmentar y validar los fragment_id que cite el modelo.
 * @param {string} text - Texto extraído del documento.
 * @param {{ chunkSize?: number, overlap?: number, maxChunks?: number, documentId?: string }} [opts]
 * @returns {Array<{ id: string, index: number, text: string }>}
 */
export function chunkDocumentText(text, opts = {}) {
  const documentId = opts.documentId ?? 'doc';
  const chunkSize = opts.chunkSize ?? DOCUMENT_GROUNDING_LIMITS.CHUNK_SIZE;
  const overlap = opts.overlap ?? DOCUMENT_GROUNDING_LIMITS.CHUNK_OVERLAP;
  const maxChunks = opts.maxChunks ?? DOCUMENT_GROUNDING_LIMITS.MAX_CHUNKS_PER_DOC;
  const parts = chunkText(text, { chunkSize, overlap, maxChunks });
  return parts.map((chunk, index) => ({
    id: `${DOCUMENT_FRAGMENT_PREFIX}::${documentId}::${index}`,
    index,
    text: chunk,
  }));
}

/**
 * Puntúa los chunks de un documento contra la consulta (coseno léxico de Fase 3).
 * @param {string} query
 * @param {Array<{ id: string, index: number, text: string }>} chunks
 * @returns {Array<{ chunk: object, score: number }>}
 */
export function scoreDocumentChunks(query, chunks) {
  const tokens = tokenize(query);
  return chunks.map((c) => ({ chunk: c, score: scoreChunk(c.text, tokens) }));
}

/**
 * Selecciona los chunks relevantes de un documento dentro de un presupuesto de
 * caracteres estricto. Reglas:
 *   - El chunk 0 (inicio del documento: encabezados, partes) SIEMPRE se incluye
 *     si cabe, aunque no sume puntos (mismo criterio que Fase 3).
 *   - El resto se ordena por relevancia y solo entran chunks con score > 0.
 *   - El total NUNCA supera maxChars.
 * @param {string} query
 * @param {Array<{ id: string, index: number, text: string }>} chunks
 * @param {number} maxChars
 * @returns {{ selected: object[], totalChars: number, droppedFragments: number, tooLarge: boolean }}
 */
export function selectDocumentChunks(query, chunks, maxChars) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return { selected: [], totalChars: 0, droppedFragments: 0, tooLarge: false };
  }
  const budget = Math.max(0, Number(maxChars) || 0);
  const tokens = tokenize(query);
  const scored = chunks
    .map((chunk, idx) => ({ chunk, idx, score: scoreChunk(chunk.text, tokens) }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx);

  const selected = new Map();
  let used = 0;
  if (chunks[0] && chunks[0].text.length <= budget) {
    selected.set(0, chunks[0]);
    used += chunks[0].text.length;
  }
  for (const s of scored) {
    if (s.score <= 0) continue;
    if (selected.has(s.idx)) continue;
    if (s.chunk.text.length > budget - used) continue;
    selected.set(s.idx, s.chunk);
    used += s.chunk.text.length;
  }
  const ordered = [...selected.entries()].sort((a, b) => a[0] - b[0]).map(([, chunk]) => chunk);
  return {
    selected: ordered,
    totalChars: used,
    droppedFragments: chunks.length - ordered.length,
    tooLarge: false,
  };
}

/**
 * Formatea la evidencia documental seleccionada como bloque del prompt del
 * modelo. Cada fragmento es autodescriptivo (document_id + fragment_id + texto)
 * para que el modelo copie ids exactos y la trazabilidad claim→documento se
 * pueda verificar aguas abajo.
 * @param {Array<{ document_id: string, original_filename: string, fragments: object[] }>} groups
 * @returns {string}
 */
export function buildDocumentEvidenceBlock(groups = []) {
  const lines = ['=== EVIDENCIA DOCUMENTAL DEL CASO ==='];
  for (const group of groups) {
    for (const frag of group.fragments || []) {
      lines.push(`Documento: ${group.original_filename || group.document_id}`);
      lines.push(`document_id: ${group.document_id}`);
      lines.push(`fragment_id: ${frag.id}`);
      lines.push('Fragmento:');
      lines.push(frag.text);
    }
  }
  lines.push('=== FIN EVIDENCIA DOCUMENTAL ===');
  return lines.join('\n');
}

/**
 * Selecciona la evidencia documental del caso para una consulta, repartiendo el
 * presupuesto entre los documentos y aplicando una doble capa de ownership
 * (workspace_id + lawyer_id) defensiva cuando se pasan los ids.
 * @param {object} input
 * @param {object[]} input.documents - Documentos del caso (ya filtrados por
 *   workspace/lawyer en la ruta; aquí se re-verifica defensivamente).
 *   Cada documento: { id, original_filename, extracted_text, workspace_id?, lawyer_id? }.
 * @param {string} input.query
 * @param {number} [input.maxChars]
 * @param {string|null} [input.workspaceId]
 * @param {string|null} [input.lawyerId]
 * @returns {{ context: string, selected: object[], docsById: Map, stats: object }}
 *   - context: bloque formateado para el prompt (vacío si no hay evidencia).
 *   - selected: fragmentos aplanados { document_id, original_filename, id, index, text }.
 *   - docsById: mapa doc.id → documento mínimo (con extracted_text para verificar).
 *   - stats: { documents_considered, documents_used, fragments_selected, context_chars }.
 */
export function selectDocumentEvidence({
  documents = [],
  query = '',
  maxChars = DOCUMENT_GROUNDING_LIMITS.MAX_DOCUMENT_CONTEXT_CHARS,
  workspaceId = null,
  lawyerId = null,
} = {}) {
  const owned = documents.filter((doc) => {
    if (!doc || typeof doc !== 'object') return false;
    if (!doc.id || !doc.original_filename) return false;
    if (workspaceId != null && doc.workspace_id != null && doc.workspace_id !== workspaceId) return false;
    if (lawyerId != null && doc.lawyer_id != null && doc.lawyer_id !== lawyerId) return false;
    return true;
  });

  if (owned.length === 0) {
    return {
      context: '',
      selected: [],
      docsById: new Map(),
      stats: {
        documents_considered: documents.length,
        documents_used: 0,
        fragments_selected: 0,
        context_chars: 0,
      },
    };
  }

  // Presupuesto por documento: reparto proporcional con margen para encabezados.
  const perDocBudget = Math.max(
    0,
    Math.floor((maxChars * DOCUMENT_GROUNDING_LIMITS.HEADER_RESERVE_RATIO) / owned.length),
  );

  const groups = [];
  const selectedFlat = [];
  const docsById = new Map();

  for (const doc of owned) {
    const text = String(doc.extracted_text || '');
    const chunks = chunkDocumentText(text, { documentId: doc.id });
    const { selected, totalChars } = selectDocumentChunks(query, chunks, perDocBudget);
    if (selected.length === 0) continue;
    docsById.set(doc.id, {
      id: doc.id,
      workspace_id: doc.workspace_id ?? null,
      lawyer_id: doc.lawyer_id ?? null,
      original_filename: doc.original_filename,
      extracted_text: text,
    });
    groups.push({
      document_id: doc.id,
      original_filename: doc.original_filename,
      fragments: selected,
    });
    for (const frag of selected) {
      selectedFlat.push({
        document_id: doc.id,
        original_filename: doc.original_filename,
        id: frag.id,
        index: frag.index,
        text: frag.text,
      });
    }
  }

  let context = buildDocumentEvidenceBlock(groups);
  // Recorte de seguridad: el bloque nunca debe superar el presupuesto.
  if (context.length > maxChars) context = context.slice(0, maxChars);

  return {
    context,
    selected: selectedFlat,
    docsById,
    stats: {
      documents_considered: documents.length,
      documents_used: groups.length,
      fragments_selected: selectedFlat.length,
      context_chars: context.length,
    },
  };
}

/**
 * Verifica los claims DOCUMENTALES del modelo contra los documentos reales del
 * caso. Mismo contrato que verifyJurisprudenceClaims ({ kept, warnings }).
 * Reglas:
 *   - El document_id debe existir y pertenecer al caso (workspace/lawyer).
 *   - El fragment_id citado debe existir (re-fragmentado de forma determinista);
 *     si el modelo citó un id inventado, se intenta re-anclar o se descarta.
 *   - La afirmación debe estar respaldada por el TEXTO del fragmento
 *     (fragmentSupportsClaim); sin respaldo → se descarta (no se inventa).
 * @param {object[]} claims - Arreglo de { document_id, fragment_id?, afirmacion, fragmento? }.
 * @param {Map<string, object>} docsById - Mapa de documentos mínimos (ver
 *   selectDocumentEvidence) con extracted_text.
 * @param {string|null} [workspaceId]
 * @param {string|null} [lawyerId]
 * @returns {{ kept: object[], warnings: string[] }}
 */
export function verifyDocumentClaims(claims, docsById, workspaceId = null, lawyerId = null) {
  if (!Array.isArray(claims)) return { kept: [], warnings: [] };
  const kept = [];
  const warnings = [];

  for (const claim of claims) {
    if (!claim || typeof claim !== 'object') continue;
    const { document_id: docId, fragment_id: modelFragmentId, afirmacion } = claim;
    if (!afirmacion || !String(afirmacion).trim()) continue;
    const afirmacionText = String(afirmacion).trim();

    const doc = docId ? docsById.get(docId) : undefined;
    if (!doc) {
      warnings.push(
        'Se descartó una afirmación documental que cita un documento no presente en el caso; no se presenta como evidencia.',
      );
      continue;
    }
    if (workspaceId != null && doc.workspace_id != null && doc.workspace_id !== workspaceId) {
      warnings.push('Se descartó una afirmación documental que cita un documento de otro caso.');
      continue;
    }
    if (lawyerId != null && doc.lawyer_id != null && doc.lawyer_id !== lawyerId) {
      warnings.push('Se descartó una afirmación documental que cita un documento de otro abogado.');
      continue;
    }

    // Fase 4.2.6 (anti-alucinación): el fragmento que el modelo cita como
    // TEXTO LITERAL debe aparecer en el documento. Si el modelo inventó una
    // cita, la afirmación se descarta aunque su contenido sea plausible, para
    // no presentar como evidencia un texto que no existe en el documento.
    const modelFragmentText = claim.fragmento ? String(claim.fragmento).trim() : '';
    if (
      modelFragmentText.length >= DOCUMENT_GROUNDING_LIMITS.MIN_FRAGMENTO_CHECK_CHARS &&
      !normalizeForPresence(doc.extracted_text).includes(normalizeForPresence(modelFragmentText))
    ) {
      warnings.push(
        `Se descartó una afirmación documental porque el fragmento citado no aparece literalmente en "${doc.original_filename}"; no se presenta como evidencia.`,
      );
      continue;
    }

    // Re-fragmentado determinista para validar el fragment_id citado.
    const chunks = chunkDocumentText(String(doc.extracted_text || ''), { documentId: doc.id });
    const fragmentById = new Map(chunks.map((f) => [f.id, f]));
    let aligned = null;
    if (modelFragmentId && fragmentById.has(modelFragmentId)) {
      const candidate = fragmentById.get(modelFragmentId);
      if (fragmentSupportsClaim(candidate, afirmacionText)) aligned = candidate;
    }
    if (!aligned) {
      aligned = resolveClaimFragment(afirmacionText, chunks);
    }
    if (!aligned) {
      warnings.push(
        `Se descartó una afirmación documental porque ningún fragmento de "${doc.original_filename}" respalda específicamente su contenido; no se presenta como evidencia.`,
      );
      continue;
    }

    const evidence = String(aligned.text).trim();
    if (!evidence) continue;
    if (!fragmentSupportsClaim(aligned, afirmacionText)) {
      warnings.push(
        `Se descartó una afirmación documental cuyo contenido no aparece en el documento "${doc.original_filename}".`,
      );
      continue;
    }

    kept.push({
      source: {
        id: doc.id,
        kind: 'document',
        citation: doc.original_filename || doc.id,
      },
      source_id: doc.id,
      fragment_id: aligned.id,
      article: [],
      category: 'document',
      afirmacion: afirmacionText,
      fragmento: evidence,
      vigencia: undefined,
      vigencia_nota: null,
    });
  }

  return { kept, warnings };
}

/**
 * Detecta el MODO de la investigación respecto a los documentos del caso:
 *   - 'document' → la consulta pregunta SOLO por contenido de un documento y el
 *     caso tiene documentos (no se consultan fuentes públicas).
 *   - 'mixed'    → la consulta mezcla documento del caso con materia jurídica
 *     (norma/jurisprudencia/doctrina): se usan fuentes públicas + evidencia.
 *   - 'none'     → sin señal documental: flujo clásico de investigación.
 * También expone flags para la ruta (noEvidence = señal documental sin documentos).
 * Fase 4.2.9: añade el fallback documental (hasCaseReferenceSignal) y la señal
 * jurídica genérica (GENERIC_LEGAL_SIGNAL_RE, P2) al polo legal.
 * @param {string} query
 * @param {object[]} documents - Documentos disponibles del caso.
 * @param {object|null} [classification] - Salida de classifyLegalQuery.
 * @returns {{ mode: 'document'|'mixed'|'none', documentSignal: boolean, fallbackSignal: boolean, hasDocs: boolean, hasLegal: boolean, noEvidence: boolean }}
 */
export function detectDocumentMode(query, documents = [], classification = null) {
  const cls = classification || {};
  const normQuery = String(query || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const hasDocumentSignal =
    Boolean(cls.documentSignal) || DOCUMENT_SIGNAL_RE.test(normQuery);
  const hasLegal =
    (Array.isArray(cls.normCitations) && cls.normCitations.length > 0) ||
    (Array.isArray(cls.articleCitations) && cls.articleCitations.length > 0) ||
    (Array.isArray(cls.jurisprudenceSignals) && cls.jurisprudenceSignals.length > 0) ||
    (Array.isArray(cls.doctrineSignals) && cls.doctrineSignals.length > 0) ||
    GENERIC_LEGAL_SIGNAL_RE.test(normQuery);
  const hasDocs = Array.isArray(documents) && documents.length > 0;
  // Fase 4.2.9 (P1): fallback documental. Si hay documentos del caso y la
  // consulta menciona una ESTRUCTURA del expediente (cláusula, partes, hechos,
  // oficios, prisión preventiva…) sin haber disparado la señal primaria, se
  // activa el modo documento para no descartar en silencio el expediente.
  // Nunca aplica a consultas puramente jurídicas (bloqueo por jurisprudencia
  // sobre tópico abstracto) y como exige hasDocs jamás produce noEvidence.
  const fallbackSignal =
    hasDocs &&
    !hasDocumentSignal &&
    hasCaseReferenceSignal(normQuery, {
      hasJurisprudence:
        Array.isArray(cls.jurisprudenceSignals) && cls.jurisprudenceSignals.length > 0,
    });
  const documentSignal = hasDocumentSignal || fallbackSignal;
  // Fase 4.2.6: la señal documental sin evidencia NO debe bloquear la consulta
  // cuando además hay polo jurídico (modo mixto): la ausencia de documentos NO
  // debe provocar errores artificiales ni cortar la investigación legal, que
  // sigue siendo respondible con fuentes públicas. El gate solo aplica a
  // consultas PURAMENTE documentales (sin polo jurídico al que recurrir).
  const noEvidence = documentSignal && !hasDocs && !hasLegal;
  const mode = !documentSignal ? 'none' : hasLegal ? 'mixed' : 'document';
  return { mode, documentSignal, fallbackSignal, hasDocs, hasLegal, noEvidence };
}
