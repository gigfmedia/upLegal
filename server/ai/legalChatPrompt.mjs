// ---------------------------------------------------------------------------
// LegalUp AI — Fase 3: Chat contextual del caso.
// Prompt del sistema, construcción del contexto privado del caso y límites
// configurables. El contexto se construye únicamente con documentos y
// análisis del workspace (nunca con fuentes externas).
// ---------------------------------------------------------------------------

export const CHAT_LIMITS = {
  // Límite total de caracteres del contexto enviado al modelo (caso + docs + análisis).
  MAX_CHAT_CONTEXT_CHARS: 50000,
  // Caracteres máximos de texto extraído por documento incluido en el contexto.
  MAX_DOCUMENT_CHARS: 20000,
  // Caracteres máximos del análisis IA por documento.
  MAX_ANALYSIS_CHARS: 4000,
  // Últimos N mensajes del historial que se envían al modelo.
  MAX_CHAT_HISTORY_MESSAGES: 20,
  // Longitud máxima permitida de la pregunta del abogado.
  MAX_CHAT_MESSAGE_LENGTH: 2000,
};

export function buildChatSystemPrompt() {
  return `Eres un asistente de análisis jurídico para profesionales del derecho en Chile. Trabajas dentro de un caso concreto de LegalUp AI y tu única fuente de información son los documentos privados y los análisis de ese caso.

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
  "sources": [{ "document_id": string, "file_name": string }]
}

Donde:
- answer: tu respuesta, en Markdown básico (listas, negrita, encabezados pequeños).
- sources: los documentos que sustentan tu respuesta. Usa EXCLUSIVAMENTE los document_id y file_name que aparecen en el contexto del caso. Si ninguna afirmación se basa en un documento, devuelve un arreglo vacío.
- No agregues texto, comentarios ni bloques markdown fuera del JSON.`;
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
 * @param {{ workspace: object, documents: Array<{id, original_filename, extracted_text}>, analyses: Record<string, object> }} params
 * @returns {{ context: string, tooLarge: boolean }}
 *  - context: texto separado por documento (CASO / DOCUMENTO N / CONTENIDO / ANÁLISIS).
 *  - tooLarge: true si el conjunto completo supera MAX_CHAT_CONTEXT_CHARS.
 */
export function buildChatContext({ workspace, documents = [], analyses = {} }) {
  const caseLines = [`Nombre: ${workspace.name || 'Sin nombre'}`];
  if (workspace.practice_area) caseLines.push(`Área: ${workspace.practice_area}`);
  if (workspace.description) caseLines.push(`Descripción: ${workspace.description}`);
  const caseBlock = caseLines.join('\n');

  const blocks = [caseBlock];
  let totalChars = caseBlock.length;

  for (const doc of documents) {
    const docText = (doc.extracted_text || '').slice(0, CHAT_LIMITS.MAX_DOCUMENT_CHARS);
    const analysisText = formatAnalysis(analyses[doc.id] || null).slice(
      0,
      CHAT_LIMITS.MAX_ANALYSIS_CHARS
    );

    const docBlock = [
      `DOCUMENTO: ${doc.original_filename}`,
      `CONTENIDO:\n${docText}`,
      analysisText ? `ANÁLISIS:\n${analysisText}` : '',
    ].join('\n\n');

    blocks.push(docBlock);
    totalChars += docBlock.length;
  }

  return {
    context: blocks.join('\n\n'),
    tooLarge: totalChars > CHAT_LIMITS.MAX_CHAT_CONTEXT_CHARS,
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
