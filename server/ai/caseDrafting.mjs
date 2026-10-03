/**
 * FASE 4.59D — Draft from Case V1.
 *
 * Generación de borradores jurídicos desde el contexto del caso. Estrecho y
 * confiable por diseño: sin plantillas procesales, sin DOCX/PDF, sin
 * investigación autónoma, sin nuevas fuentes. Reutiliza provider, metering,
 * idempotencia y selección de evidencia existentes.
 */
import { selectDocumentEvidence } from './documentGrounding.mjs';

export const DRAFT_TYPES = ['escrito', 'informe', 'carta', 'otro'];

export const DRAFT_TYPE_LABELS = {
  escrito: 'Escrito jurídico',
  informe: 'Informe / minuta',
  carta: 'Carta / comunicación formal',
  otro: 'Otro',
};

export const DRAFT_LIMITS = {
  // Presupuesto total de caracteres del contexto enviado al modelo.
  MAX_CONTEXT_CHARS: 40000,
  // Evidencia documental primaria (fragmentos seleccionados por relevancia).
  MAX_EVIDENCE_CHARS: 22000,
  // Síntesis de snapshot (hechos + contexto legal acotado).
  MAX_SNAPSHOT_CHARS: 6000,
  // Contexto de research crudo adicional (solo si no hay snapshot).
  MAX_RESEARCH_CHARS: 6000,
  // Salida.
  MAX_OUTPUT_TOKENS: 4000,
  // Instrucción del abogado.
  MAX_INSTRUCTION_CHARS: 2000,
  MIN_INSTRUCTION_CHARS: 10,
  // Marcador de información faltante (convención única).
  MISSING_MARKER: '[POR COMPLETAR: ',
};

const TYPE_GUIDANCE = {
  escrito:
    'Prepara un escrito jurídico en tono formal procesal chileno, con encabezado, hechos numerados, fundamentos y petitorio. No inventes número de rol, tribunal ni fechas de actuaciones.',
  informe:
    'Prepara un informe o minuta clara y estructurada para uso interno o del cliente, con resumen ejecutivo, análisis y conclusiones.',
  carta:
    'Prepara una carta o comunicación formal breve y cortés, con lugar y fecha entre corchetes si no se conocen, asunto, cuerpo y firma entre corchetes.',
  otro:
    'Prepara el documento solicitado con estructura clara y tono profesional.',
};

export function buildDraftSystemPrompt({ draftType } = {}) {
  const typeText = TYPE_GUIDANCE[draftType] || TYPE_GUIDANCE.otro;
  return `Eres un asistente de redacción jurídica para abogados en Chile. Preparas un BORRADOR para revisión profesional —nunca un documento final, aprobado ni listo para presentar— a partir EXCLUSIVAMENTE del contexto del caso que se te entrega.

${typeText}

Reglas inquebrantables:
1. Usa únicamente los HECHOS DEL CASO del contexto. No inventes fechas, nombres, montos, actuaciones procesales, evidencias ni eventos.
2. El CONTEXTO LEGAL (investigaciones previas) apoya el razonamiento jurídico, pero NUNCA crea hechos del caso. Si una afirmación factual no está en la evidencia, no la hagas.
3. Ante información faltante, usa el marcador ${DRAFT_LIMITS.MISSING_MARKER}descripción de lo que falta] —siempre con corchete de cierre—. Nunca rellenes creativamente.
4. Distingue evidencia primaria (documentos del caso) de contexto derivado (resumen de inteligencia, investigaciones). Ante conflicto, prima el documento y adviértelo.
5. No afirmes que una fuente dice algo que no está en el contexto entregado. No fabriques jurisprudencia, leyes, URLs, roles, páginas ni IDs de fragmentos.
6. Preserva la incertidumbre: si algo es discutible, dilo en el borrador o en advertencias, no lo presentes como cierto.
7. Lenguaje profesional, español de Chile. Sin asesoría definitiva: el abogado revisa y responde.

Debes responder ÚNICAMENTE con un objeto JSON válido con esta forma exacta:
{
  "title": string,
  "content": string,
  "sources": [
    { "kind": "document", "document_id": string, "file_name": string, "fragment_id"?: string, "evidence"?: string },
    { "kind": "research", "research_id": string, "research_query"?: string, "research_date"?: string, "title"?: string, "url"?: string }
  ],
  "missing_info": [string],
  "warnings": [string]
}

Donde:
- title: título del borrador.
- content: el borrador en Markdown básico. Incluye los marcadores [POR COMPLETAR: ...] donde corresponda.
- sources: SOLO fuentes presentes en el contexto, con IDs exactos. Si nada sustenta una parte, no inventes la cita: omítela y avisa en warnings.
- missing_info: lista de información faltante detectada.
- warnings: advertencias honestas (p. ej. "Revisa las referencias antes de utilizar el borrador.").
- Sin texto fuera del JSON.`;
}

/**
 * Contexto canónico de drafting. Orden: instrucción, caso, hechos snapshot,
 * evidencia primaria, research. Todo acotado; sin documentos completos.
 */
export function buildDraftContext({
  instruction,
  draftType,
  caseHeader = '',
  snapshot = null,
  documents = [],
  researchBlocks = '',
} = {}) {
  const parts = [];
  parts.push(`INSTRUCCIÓN DEL ABOGADO (objetivo y estilo del borrador):\n${String(instruction || '').slice(0, DRAFT_LIMITS.MAX_INSTRUCTION_CHARS)}`);
  if (caseHeader) parts.push(`CASO:\n${String(caseHeader).slice(0, 2000)}`);
  if (snapshot) {
    const facts = Array.isArray(snapshot.facts) ? snapshot.facts.slice(0, 30).map((f) => `- ${typeof f === 'string' ? f : f.text || ''}`) : [];
    const snap = [
      'RESUMEN DE INTELIGENCIA DEL CASO (memoria derivada; el documento primario prima ante conflicto):',
      snapshot.caseSummary ? `Resumen: ${String(snapshot.caseSummary).slice(0, 1500)}` : '',
      Array.isArray(snapshot.parties) && snapshot.parties.length ? `Partes: ${snapshot.parties.slice(0, 20).join(' | ')}` : '',
      facts.length ? `Hechos:\n${facts.join('\n')}` : '',
    ].filter(Boolean).join('\n\n');
    parts.push(snap);
    if (Array.isArray(snapshot.legalContext) && snapshot.legalContext.length) {
      const items = snapshot.legalContext.slice(0, 5).map((l, i) =>
        `Contexto legal ${i + 1} (investigación del ${l.created_at || 'fecha no registrada'}${l.query ? ` sobre: ${l.query}` : ''}): ${String(l.synthesis || l.summary || '').slice(0, 600)}`
      );
      parts.push(`CONTEXTO LEGAL (investigaciones previas; apoyan razonamiento, no crean hechos):\n${items.join('\n')}`);
    }
  }
  if (researchBlocks) parts.push(`INVESTIGACIONES DEL CASO:\n${String(researchBlocks).slice(0, DRAFT_LIMITS.MAX_RESEARCH_CHARS)}`);
  const joined = parts.join('\n\n');
  return joined.slice(0, DRAFT_LIMITS.MAX_CONTEXT_CHARS);
}

/**
 * Evidencia primaria acotada por relevancia (reutiliza document grounding).
 * Retorna { context, docMap } donde docMap: document_id → {file_name, text}.
 */
export function selectDraftEvidence({ documents = [], instruction = '', snapshotFacts = [], maxChars = DRAFT_LIMITS.MAX_EVIDENCE_CHARS, workspaceId = null, lawyerId = null } = {}) {
  const query = [String(instruction || ''), ...snapshotFacts.slice(0, 10).map((f) => (typeof f === 'string' ? f : f.text || ''))].join(' ').slice(0, 2000);
  const result = selectDocumentEvidence({ documents, query, maxChars, workspaceId, lawyerId });
  const docMap = new Map();
  for (const doc of documents || []) {
    if (doc && doc.id) docMap.set(doc.id, { file_name: doc.original_filename, text: doc.extracted_text || '' });
  }
  return { context: result && result.context ? result.context : '', docMap };
}

/**
 * Valida citas del borrador contra evidencia suministrada. Lo no validable
 * se descarta (nunca se persiste una cita inventada).
 * Retorna { sources: [...normalizadas], dropped: n, warnings: [...] }.
 */
export function validateDraftSources(sources, { docMap = new Map(), researchMap = new Map() } = {}) {
  const out = [];
  let dropped = 0;
  for (const s of Array.isArray(sources) ? sources : []) {
    if (!s || typeof s !== 'object') {
      dropped += 1;
      continue;
    }
    if (s.kind === 'research' || (!s.document_id && s.research_id)) {
      const entry = researchMap.get(String(s.research_id || ''));
      if (!entry) {
        dropped += 1;
        continue;
      }
      const norm = { kind: 'research', research_id: String(s.research_id) };
      if (entry.query) norm.research_query = entry.query;
      if (entry.created_at) norm.research_date = entry.created_at;
      if (typeof s.title === 'string' && s.title) norm.title = String(s.title).slice(0, 300);
      if (typeof s.url === 'string' && s.url && entry.urls.has(s.url)) norm.url = s.url;
      else if (typeof s.url === 'string' && s.url) {
        dropped += 1;
        continue;
      }
      out.push(norm);
      continue;
    }
    const doc = docMap.get(s.document_id);
    if (!doc || doc.file_name !== s.file_name) {
      dropped += 1;
      continue;
    }
    const norm = { kind: 'document', document_id: s.document_id, file_name: s.file_name };
    if (typeof s.fragment_id === 'string' && s.fragment_id.startsWith(`document::${s.document_id}::`)) {
      const normEv = typeof s.evidence === 'string'
        ? String(s.evidence).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
        : '';
      const normDoc = String(doc.text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normEv && normDoc.includes(normEv.slice(0, 30))) {
        norm.fragment_id = s.fragment_id;
        norm.evidence = s.evidence;
      }
    }
    out.push(norm);
  }
  const warnings = dropped > 0 ? ['Revisa las referencias antes de utilizar el borrador.'] : [];
  return { sources: out, dropped, warnings };
}
