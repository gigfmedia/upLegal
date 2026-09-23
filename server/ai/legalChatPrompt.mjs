// ---------------------------------------------------------------------------
// LegalUp AI — Fase 3: Chat contextual del caso.
// Prompt del sistema, construcción del contexto privado del caso y límites
// configurables. El contexto se construye únicamente con documentos y
// análisis del workspace (nunca con fuentes externas).
// ---------------------------------------------------------------------------

export const CHAT_LIMITS = {
  // Límite total de caracteres del contexto enviado al modelo (caso + docs + análisis).
  MAX_CHAT_CONTEXT_CHARS: 50000,
  // Caracteres del análisis IA por documento.
  MAX_ANALYSIS_CHARS: 4000,
  // Últimos N mensajes del historial que se envían al modelo.
  MAX_CHAT_HISTORY_MESSAGES: 20,
  // Longitud máxima permitida de la pregunta del abogado.
  MAX_CHAT_MESSAGE_LENGTH: 2000,
  // Chunking para documentos extensos: tamaño y solape de cada fragmento.
  CHUNK_SIZE: 3000,
  CHUNK_OVERLAP: 300,
  // Máximo de chunks considerados por documento.
  MAX_CHUNKS_PER_DOC: 30,
};

/** Tokeniza un texto a minúsculas (palabras alfanuméricas de ≥3 caracteres). */
export function tokenize(text) {
  return text
    .toLowerCase()
    .match(/[a-záéíóúüñ0-9]{3,}/g) || [];
}

/**
 * Recuperación por relevancia léxica (similaridad coseno sobre frecuencia de
 * términos). Permite que, en documentos extensos, solo se incluya el tramo
 * relevante a la pregunta en lugar de cortar ciegamente desde el inicio.
 */
export function scoreChunk(chunkText, questionTokens) {
  const chunkTokens = tokenize(chunkText);
  if (chunkTokens.length === 0) return 0;
  const counts = new Map();
  for (const t of chunkTokens) counts.set(t, (counts.get(t) || 0) + 1);
  let score = 0;
  for (const q of questionTokens) {
    if (counts.has(q)) score += counts.get(q);
  }
  // Normaliza por tamaño para no favorecer chunks gigantes sin sentido.
  return questionTokens.length > 0 ? score / Math.sqrt(chunkTokens.length) : 0;
}

/**
 * Divide el texto extraído en chunks con solape, limitado a maxChunks.
 * @param {string} text - Texto a fragmentar.
 * @param {{ chunkSize?: number, overlap?: number, maxChunks?: number }} [opts]
 *   - Si se omiten, usa los límites de CHAT_LIMITS (Fase 3).
 * @returns {string[]} Lista de chunks en orden de aparición.
 */
export function chunkText(text, opts = {}) {
  if (!text) return [];
  const size = opts.chunkSize ?? CHAT_LIMITS.CHUNK_SIZE;
  const overlap = opts.overlap ?? CHAT_LIMITS.CHUNK_OVERLAP;
  const max = opts.maxChunks ?? CHAT_LIMITS.MAX_CHUNKS_PER_DOC;
  const chunks = [];
  let start = 0;
  while (start < text.length && chunks.length < max) {
    let end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    // Retrocede hasta el último salto de línea o espacio dentro del solape.
    const next = start + size - overlap;
    const nl = text.lastIndexOf('\n', next);
    start = (nl > start ? nl : next) + 1;
  }
  return chunks;
}

/**
 * Selecciona los chunks más relevantes de un documento para la pregunta,
 * repartiéndolos dentro del presupuesto de caracteres que le queda al contexto.
 */
export function selectRelevantChunks(text, questionTokens, budgetChars) {
  const chunks = chunkText(text);
  if (chunks.length === 0) return '';
  if (chunks.length === 1) return chunks[0].slice(0, budgetChars);

  const budget = Math.max(1000, Math.min(budgetChars, CHAT_LIMITS.MAX_CHAT_CONTEXT_CHARS));
  const scored = chunks
    .map((c, idx) => ({ text: c, idx, score: scoreChunk(c, questionTokens) }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx);

  const selected = [];
  let used = 0;
  // Siempre incluye el inicio (contexto/encabezados) aunque no sume puntos.
  if (!selected.includes(0) && chunks[0] && chunks[0].length <= budget) {
    selected.push(0);
    used += chunks[0].length;
  }
  for (const s of scored) {
    if (s.text.length > budget) continue;
    if (used >= budget) break;
    if (selected.includes(s.idx)) continue;
    selected.push(s.idx);
    used += s.text.length;
  }
  selected.sort((a, b) => a - b);
  return selected.map((idx) => chunks[idx]).join('\n\n[...]\n\n').slice(0, budget);
}

export function buildChatSystemPrompt({ mode } = {}) {
  const base = `Eres un asistente de análisis jurídico para profesionales del derecho en Chile. Trabajas dentro de un caso concreto de LegalUp AI y tu única fuente de información son los documentos privados y los análisis de ese caso.

Reglas:
1. Utiliza únicamente la información proporcionada en el contexto del caso.
2. No inventes hechos.
3. No inventes jurisprudencia.
4. No inventes artículos de ley.
5. No afirmes que una norma existe si no aparece en el contexto.
6. Diferencia claramente los hechos de tus inferencias.
7. Si una pregunta no puede responderse con los documentos del caso, dilo claramente.
8. Indica qué documento sustenta una afirmación cuando sea posible, por ejemplo: "Según contrato.pdf...".
9. Mantén lenguaje profesional y en español de Chile.
10. Sé conciso pero útil.
11. No te presentes como abogado ni des asesoría legal profesional definitiva.
12. No sustituyas el criterio profesional del abogado; ofrece un análisis preliminar.
13. Señala información faltante cuando sea relevante para responder.

Rigor jurídico: hechos, inferencias y consecuencias:

14. Referencias normativas:
No conviertas una simple referencia a una ley, reglamento o norma en una conclusión de incumplimiento. Si el documento solamente menciona una norma, descríbela como un hecho: "Hecho: el documento menciona la norma X." No concluyas automáticamente "Riesgo: existe incumplimiento de la norma X". Solo identifica incumplimiento cuando el documento establece una obligación concreta y aplicable y existen antecedentes suficientes para evaluar el cumplimiento.

15. Hecho vs inferencia:
Distingue siempre:
- HECHO: información expresamente contenida en los documentos.
- INFERENCIA: conclusión razonable derivada de los hechos.
- CONSECUENCIA: resultado jurídico o contractual expresamente establecido en los documentos.
No presentes una inferencia como si fuera un hecho.

16. Consecuencias jurídicas:
Nunca inventes sanciones, multas, restituciones, terminaciones, rechazos, pérdida de beneficios, nulidades ni responsabilidades si no aparecen expresamente en el contexto proporcionado. Si la consecuencia no está disponible, indica: "El documento no permite determinar la consecuencia específica."

17. Nivel de certeza:
Cuando el usuario solicite certeza, clasifica según la afirmación realizada, no según la importancia del riesgo:
- Alta: información expresamente establecida en el documento.
- Media: inferencia razonable basada en información explícita.
- Baja: conclusión que requiere información adicional o interpretación significativa.

18. Información faltante:
La ausencia de información NO equivale a incumplimiento. Por ejemplo: "El documento establece que debe realizarse un aporte del 25%, pero no contiene antecedentes suficientes para determinar si el beneficiario efectivamente realizó ese aporte." No respondas "El beneficiario incumplió el aporte del 25%" salvo que el contexto lo demuestre.

19. Fuentes:
Cuando una respuesta dependa de un documento concreto, menciona el nombre del documento cuando esté disponible. Si existe una sección identificable, refiérela, por ejemplo: "Según la sección 5. PLAZO...". No inventes números de artículos, cláusulas o secciones.

20. Regla principal:
Responde distinguendo: lo que sabes porque está en el documento, lo que infieres a partir del documento, y lo que no puedes determinar con la información disponible. Nunca rellenes el tercer grupo inventando información.

Alcance:
- Los documentos y antecedentes proporcionados son información privada del abogado y de su caso. No reveles información de otros casos, otros usuarios ni contextos no proporcionados.
- Esta es una asistencia preliminar de IA y no constituye asesoría legal profesional.

Debes responder ÚNICAMENTE con un objeto JSON válido con esta forma exacta:
{
  "answer": string,
  "sources": [{ "document_id": string, "file_name": string, "fragment_id"?: string, "evidence"?: string }]
}

Donde:
- answer: tu respuesta, en Markdown básico (listas, negrita, encabezados pequeños).
- sources: los documentos que sustentan tu respuesta. Usa EXCLUSIVAMENTE los document_id y file_name que aparecen en el contexto del caso. Si dispones del fragmento exacto que respalda tu respuesta (ver CONTENIDO del documento), incluye también "fragment_id" (el ID del fragmento, ej. "document::xyz::0") y "evidence" (el texto literal del fragmento, copiado exactamente). Si ninguna afirmación se basa en un documento, devuelve un arreglo vacío.
- No agregues texto, comentarios ni bloques markdown fuera del JSON.`;
  // 4.39B: autoridad del documento seleccionado (solo Document Chat). El modo
  // caso (default) queda byte-idéntico para no alterar Case Chat.
  if (mode === 'document') {
    return `${base}

DOCUMENTO SELECCIONADO (autoridad primaria):
21. El contexto marca un bloque DOCUMENTO SELECCIONADO: es la autoridad primaria de la respuesta. Basa tu respuesta principalmente en él.
22. No sustituyas información de OTROS DOCUMENTOS DEL CASO (contexto secundario). Si la respuesta no está en el documento seleccionado, dilo claramente en lugar de responder con otro documento.
23. Usa los otros documentos solo como contexto secundario o cuando el usuario pida explícitamente una comparación.`;
  }
  return base;
}

/** Formatea un análisis IA a texto breve para el contexto. */
function formatAnalysis(analysis) {
  if (!analysis) return '';
  const lines = [];
  if (analysis.summary) lines.push(`Resumen: ${analysis.summary}`);
  if (analysis.document_type) lines.push(`Tipo de documento: ${analysis.document_type}`);
  const join = (label, value) => {
    const items = Array.isArray(value) ? value.filter((x) => typeof x === 'string') : [];
    if (items.length) lines.push(`${label}: ${items.join(' | ')}`);
  };
  join('Partes', analysis.parties);
  join('Puntos clave', analysis.key_points);
  join('Obligaciones', analysis.obligations);
  join('Riesgos', analysis.risks);
  join('Recomendaciones', analysis.recommendations);
  if (Array.isArray(analysis.deadlines) && analysis.deadlines.length) {
    const deadlines = analysis.deadlines
      .map((d) => {
        const obj = typeof d === 'string' ? { date: '', description: d } : d;
        const desc = typeof obj?.description === 'string' ? obj.description : '';
        const date = typeof obj?.date === 'string' && obj.date ? ` (${obj.date})` : '';
        return `${desc}${date}`;
      })
      .filter(Boolean);
    if (deadlines.length) lines.push(`Plazos: ${deadlines.join(' | ')}`);
  }
  return lines.join('\n');
}

/**
 * Construye el contexto privado del caso.
 * @param {{ workspace: object, documents: Array<{id, original_filename, extracted_text}>, analyses: Record<string, object>, question?: string, proCase?: object|null, selectedDocumentId?: string|null }} params
 *  - question: texto de la pregunta del abogado. Si se provee, en documentos
 *    extensos se recupera el tramo más relevante (chunking) en lugar de cortar
 *    el inicio; si no, se usa el inicio del documento.
 *  - proCase: header normalizado en vivo del caso Pro (getProCaseHeader). Cuando
 *    está presente sus valores ganan a la copia de provisioning del workspace.
 *  - selectedDocumentId: 4.39B autoridad del documento seleccionado (Document
 *    Chat). El documento seleccionado va PRIMERO con presupuesto reservado y
 *    etiqueta explícita; los demás son contexto secundario y se truncan antes.
 *    Sin seleccionado (Case Chat) el comportamiento es el histórico.
 * @returns {{ context: string, tooLarge: boolean }}
 *  - context: texto separado por documento (CASO / DOCUMENTO N / CONTENIDO / ANÁLISIS),
 *    acotado a MAX_CHAT_CONTEXT_CHARS mediante recuperación por relevancia.
 *  - tooLarge: siempre false (el chunking garantiza contexto que cabe en la consulta).
 */
export function buildChatContext({ workspace, documents = [], analyses = {}, question = '', proCase = null, selectedDocumentId = null }) {
  // FASE 4.33B: datos en vivo del caso Pro ganan a la copia de provisioning.
  const live = proCase && typeof proCase === 'object' ? proCase : null;
  const caseLines = [`Nombre: ${(live && live.title) || workspace.name || 'Sin nombre'}`];
  if ((live && live.clientName)) caseLines.push(`Cliente: ${live.clientName}`);
  const liveArea = live && live.practiceArea;
  if (liveArea || workspace.practice_area) caseLines.push(`Área: ${liveArea || workspace.practice_area}`);
  const liveDesc = live && live.description;
  if (liveDesc || workspace.description) caseLines.push(`Descripción: ${liveDesc || workspace.description}`);
  if (live && live.status) caseLines.push(`Estado: ${live.status}`);
  const caseBlock = caseLines.join('\n');

  const questionTokens = tokenize(question);

  // 4.39B: partición seleccionado/secundarios. Sin seleccionado el flujo es el
  // histórico (mismo orden de entrada, mismos encabezados, mismo reparto).
  const selected =
    selectedDocumentId ? documents.find((d) => d.id === selectedDocumentId) || null : null;
  const secondary = selected ? documents.filter((d) => d.id !== selectedDocumentId) : documents;

  // Presupuesto: el seleccionado reserva primero (60% del resto tras el caso);
  // los secundarios comparten el 40% y se truncan/descartan antes.
  const remaining = CHAT_LIMITS.MAX_CHAT_CONTEXT_CHARS - caseBlock.length;
  const selectedBudget = selected ? Math.max(2000, Math.floor(remaining * 0.6)) : 0;
  const secondaryTotal = selected
    ? Math.max(0, remaining - selectedBudget)
    : remaining;
  const secondaryBudget = secondary.length
    ? Math.max(1000, Math.floor(secondaryTotal / secondary.length))
    : 0;

  const buildDocBlock = (doc, budget, { selectedBlock }) => {
    const rawText = doc.extracted_text || '';
    const analysisText = formatAnalysis(analyses[doc.id] || null).slice(
      0,
      CHAT_LIMITS.MAX_ANALYSIS_CHARS
    );

    // Encabezados del bloque (DOCUMENTO / CONTENIDO / ANÁLISIS) y separadores.
    const headerChars = 90 + doc.original_filename.length + analysisText.length;

    // Presupuesto de ESTE bloque = reparto del límite global menos
    // lo usado por el bloque del caso (o la partición 60/40 en modo documento).
    // Cubre contenido + análisis + encabezados.
    const blockBudget = Math.max(2000, budget - headerChars);

    // Recuperación relevante si hay pregunta y el documento es extenso.
    const docText =
      questionTokens.length > 0
        ? selectRelevantChunks(rawText, questionTokens, blockBudget)
        : rawText.slice(0, blockBudget);

    if (selectedBlock) {
      return [
        `DOCUMENTO SELECCIONADO: ${doc.original_filename}`,
        `INSTRUCCIÓN: El usuario pregunta sobre este documento seleccionado. Responde basándote principalmente en él. No sustituyas información de otros documentos del caso. Si la respuesta no está en este documento, dilo claramente.`,
        `CONTENIDO:\n${docText}`,
        analysisText ? `ANÁLISIS:\n${analysisText}` : '',
      ].join('\n\n');
    }
    const label = selected
      ? `OTRO DOCUMENTO DEL CASO (contexto secundario): ${doc.original_filename}`
      : `DOCUMENTO: ${doc.original_filename}`;
    return [
      label,
      `CONTENIDO:\n${docText}`,
      analysisText ? `ANÁLISIS:\n${analysisText}` : '',
    ].join('\n\n');
  };

  const blocks = [caseBlock];
  if (selected) blocks.push(buildDocBlock(selected, selectedBudget, { selectedBlock: true }));
  for (const doc of secondary) {
    blocks.push(
      buildDocBlock(
        doc,
        // Modo caso: reparto histórico exacto por documento.
        selected ? secondaryBudget : Math.max(
          2000,
          Math.floor(
            (CHAT_LIMITS.MAX_CHAT_CONTEXT_CHARS - caseBlock.length) / documents.length
          )
        ),
        { selectedBlock: false }
      )
    );
  }

  let context = blocks.join('\n\n');
  // Truncado de seguridad: nunca debe superar el límite.
  if (context.length > CHAT_LIMITS.MAX_CHAT_CONTEXT_CHARS) {
    context = context.slice(0, CHAT_LIMITS.MAX_CHAT_CONTEXT_CHARS);
  }

  return {
    context,
    // tooLarge siempre false: la recuperación por relevancia garantiza un
    // contexto acotado que cabe en la consulta.
    tooLarge: false,
  };
}

/**
 * Construye el mensaje de usuario enviado al modelo.
 * El contexto del caso SIEMPRE va primero; el historial es adicional.
 */
export function buildChatUserPrompt({ question, context, history = [] }) {
  const historyText = history
    .map((m) => `${m.role === 'user' ? 'ABOGADO' : 'ASISTENTE'}: ${m.content}`)
    .join('\n\n');

  const parts = [
    'CONTEXTO PRIVADO DEL CASO',
    context,
    historyText ? `HISTORIAL RECIENTE DE LA CONVERSACIÓN:\n${historyText}` : '',
    `PREGUNTA DEL ABOGADO:\n${question}`,
  ];

  return parts.filter(Boolean).join('\n\n');
}
