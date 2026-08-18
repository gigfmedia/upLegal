import { z } from 'zod';
import {
  verifyJurisprudenceClaims,
  detectExcessiveConclusions,
  buildJurisprudenceAnswer,
} from './jurisprudencePrompt.mjs';
import {
  resolveClaimFragment,
  isBcnNormaRelevantToQuery,
  isSourceResponsiveToQuery,
  hasSubstantiveNormativeEvidence,
  isSubstantiveNormativeEvidence,
  extractLawNumber,
  extractArticleNumbers,
} from './jurisprudenceSources.mjs';
import { verifyAndBuildSynthesis } from './synthesisVerifier.mjs';
import { orderNormativaByHierarchy, detectHierarchyMatices } from './hierarchy.mjs';
import { detectContradictions } from './contradiction.mjs';
import { verifyDocumentClaims } from './documentGrounding.mjs';

// ---------------------------------------------------------------------------
// Pipeline puro de investigación jurídica (Fase 4.1.11).
// Centraliza TODO el procesamiento POST-LLM que antes vivía embebido en la
// ruta de server.mjs, para que los estados canónicos (SUCCESS, NO_EVIDENCE,
// INVALID_RESPONSE) sean testeables sin levantar Express.
//
// La función recibe SOLO la respuesta cruda del modelo + las fuentes
// recuperadas y devuelve un resultado puro (sin I/O, sin Express, sin
// supabase). La ruta conserva: parsing de request, búsqueda, chatCompletion,
// persistencia y log/observabilidad.
// ---------------------------------------------------------------------------

// Elimina matices duplicados en la sección "Matices y contradicciones": varios
// pares de fuentes pueden generar la MISMA nota genérica y se repetía la línea
// tal cual. Se deduplica por el texto renderizado (nota/notas/tipo).
function dedupeMatices(matices = []) {
  const seen = new Set();
  const out = [];
  for (const m of matices) {
    const key = String(m?.nota || m?.notas || m?.tipo || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

// Fase 4.2.14: gate de relevancia post-retrieval. En una consulta documental
// (mode document/mixed) sin claims documentales verificados, conserva solo las
// fuentes públicas que responden sustantivamente la consulta (coincidencia de
// ley/artículo citado o solape de término sustantivo con título/cita/afirmación).
// Determinístico, sin LLM. Expuesto para pruebas unitarias.
export function applyRelevanceGate(claims, { query = '' } = {}) {
  if (!Array.isArray(claims)) return { kept: [], droppedCount: 0, warnings: [] };
  const kept = [];
  const warnings = [];
  for (const claim of claims) {
    if (isSourceResponsiveToQuery({ query, source: claim.source, claims: [claim] })) {
      kept.push(claim);
    } else {
      warnings.push(
        `Se descartó la fuente pública "${claim.source?.citation || claim.source_id}" porque no responde la pregunta factual sobre el documento del caso.`,
      );
    }
  }
  return { kept, droppedCount: claims.length - kept.length, warnings };
}

// Esquema de respuesta del modelo para la investigación de jurisprudencia.
export const AIResearchResponseSchema = z
  .object({
    resumen: z.string().default(''),
    normativa: z
      .array(
        z.object({
          fuente_id: z.string().min(1),
          fragment_id: z.string().optional(),
          afirmacion: z.string().min(1),
          fragmento: z.string().optional(),
        }),
      )
      .default([]),
    jurisprudencia: z
      .array(
        z.object({
          fuente_id: z.string().min(1),
          fragment_id: z.string().optional(),
          afirmacion: z.string().min(1),
          fragmento: z.string().optional(),
        }),
      )
      .default([]),
    doctrina: z
      .array(
        z.object({
          fuente_id: z.string().min(1),
          fragment_id: z.string().optional(),
          afirmacion: z.string().min(1),
          fragmento: z.string().optional(),
        }),
      )
      .default([]),
    // Fase 4.2.6: claims documentales del caso (document grounding).
    documento: z
      .array(
        z.object({
          document_id: z.string().min(1),
          fragment_id: z.string().optional(),
          afirmacion: z.string().min(1),
          fragmento: z.string().optional(),
        }),
      )
      .default([]),
    conclusion: z.string().optional(),
    advertencias: z.array(z.string()).default([]),
  })
  .strict();

/**
 * Procesa la respuesta cruda del modelo contra las fuentes reales recuperadas.
 *
 * Estados posibles (sin lanzar errores en la capa de pipeline):
 *   - { status: 'invalid_response' }  → el modelo no devolvió un JSON/schema válido.
 *   - { status: 'ok', ... }           → pipeline completo; `outcome` es
 *                                       'SUCCESS' (hay claims verificados) o
 *                                       'NO_EVIDENCE' (ninguno sobrevivió).
 *
 * @param {{ data: object|null, sources: object[], intent: string, query: string,
 *   documents?: object[]|null, workspaceId?: string|null, lawyerId?: string|null,
 *   documentMode?: 'none'|'document'|'mixed' }} input
 */
export function buildJurisprudenceOutcome({
  data,
  sources,
  intent,
  query = '',
  documents = null,
  workspaceId = null,
  lawyerId = null,
  documentMode = 'none',
}) {
  // Solo se aceptan fuentes que correspondan a fuentes reales recuperadas.
  // Fase 4.1.16 (evidence gate): una norma IDENTIFICADA pero sin evidencia
  // sustantiva (solo título/idNorma/fecha/vigencia o texto de promulgación) NO
  // puede anclar claims: excluirla del mapa evita que el modelo la convierta
  // en afirmación jurídica ("La Ley X establece…") sin texto de disposición.
  const includedById = new Map(
    sources
      .filter((source) => source.kind !== 'normativa' || hasSubstantiveNormativeEvidence(source))
      .map((source) => [source.id, source]),
  );

  // Fase 4.2.6: mapa de documentos del caso para verificar claims documentales.
  const docsById =
    Array.isArray(documents) && documents.length > 0
      ? new Map(documents.filter((d) => d && d.id).map((d) => [d.id, d]))
      : new Map();

  let validated;
  if (data) {
    try {
      validated = AIResearchResponseSchema.parse(data);
    } catch {
      validated = null;
    }
  } else {
    validated = null;
  }

  // Una respuesta no estructurada (JSON/schema inválido) NUNCA se convierte en
  // una respuesta jurídica: error claro, sin afirmaciones fabricadas.
  if (!validated) {
    return { status: 'invalid_response' };
  }

  // Verifica que cada afirmación tenga respaldo textual real en su fuente.
  const verifiedNormativa = verifyJurisprudenceClaims(
    validated.normativa,
    includedById,
    'normativa',
  );
  const verifiedJurisprudencia = verifyJurisprudenceClaims(
    validated.jurisprudencia,
    includedById,
    'jurisprudencia',
  );
  const verifiedDoctrina = verifyJurisprudenceClaims(validated.doctrina, includedById, 'doctrina');

  // Fase 4.2.6: claims documentales verificados contra los documentos del caso
  // (los que cita el modelo deben existir, pertenecer al caso y tener respaldo
  // textual en el fragmento del documento; sin respaldo → se descartan).
  const verifiedDocumentos = verifyDocumentClaims(
    validated.documento,
    docsById,
    workspaceId,
    lawyerId,
  );

  const researchWarnings = [
    ...verifiedNormativa.warnings,
    ...verifiedJurisprudencia.warnings,
    ...verifiedDoctrina.warnings,
    ...verifiedDocumentos.warnings,
  ];

  // Fase 4.0.2 (fix): si la consulta busca normativa, el modelo no citó ninguna
  // norma y sí recuperamos BCN/LeyChile relevantes, PROMOVEMOS la ley más
  // relevante en lugar de afirmar que no existe normativa. La afirmación se
  // deriva del título oficial (rastreable al idNorma), sin inventar texto legal.
  // Fase 4.1.12 (fix): SOLO se promueve una norma con relevancia verificable a
  // la consulta (isBcnNormaRelevantToQuery). Si ninguna supera el umbral, NO se
  // promueve nada y el pipeline deriva en NO_EVIDENCE: un falso positivo de
  // fuente ("Ley X regula la materia") es más grave que la ausencia de evidencia.
  const autoNormativas = [];
  if (intent === 'normativa' && verifiedNormativa.kept.length === 0) {
    // Fase 4.1.16 (evidence gate): además de pasar el relevance gate (4.1.12/
    // 4.1.15), la norma debe exponer EVIDENCIA SUSTANTIVA (fragmentos reales o
    // extracto con disposiciones). Una norma identificada solo por título/
    // número/metadata no se promueve: cae a NO_EVIDENCE antes que afirmar
    // "regula la materia" sin texto que lo respalde.
    const relevant = (s) =>
      s.kind === 'normativa' &&
      isBcnNormaRelevantToQuery(query, s) &&
      hasSubstantiveNormativeEvidence(s);
    // Fase 4.1.14: si la consulta cita un número de ley ("Ley 21.719"), se
    // prefiere la norma que coincide por número oficial ANTES que una ley
    // distinta relevante solo por contenido compartido ("Ley 21.713" no debe
    // ganar a "Ley 21.719" por compartir palabras de la materia).
    // Fase 4.2.2 (§33): si la consulta cita un número de ley que NO corresponde
    // a ninguna norma recuperada ("Ley 99.999"), no se promueve una ley real
    // distinta aunque comparta términos de la materia (protección, datos,
    // derechos). La cita por número identifica la entidad; no autoriza a
    // sustituirla por otra.
    const citedNumber = extractLawNumber(query)[0];
    const matchesCitedNumber = (s) =>
      citedNumber &&
      s.kind === 'normativa' &&
      String(s.norm_number || '').replace(/[^0-9]/g, '') === citedNumber;
    const citedNumberMatched = citedNumber && sources.some(matchesCitedNumber);
    const candidate =
      sources.find((s) => relevant(s) && matchesCitedNumber(s)) ||
      (!citedNumber || citedNumberMatched
        ? sources.find((s) => relevant(s) && s.norm_type === 'ley') ||
          sources.find((s) => relevant(s))
        : undefined);
    if (candidate) {
      const typeLabel =
        candidate.norm_type === 'ley'
          ? 'Ley'
          : candidate.norm_type === 'decreto'
            ? 'Decreto'
            : candidate.norm_type === 'dfl'
              ? 'DFL'
              : candidate.norm_type === 'codigo'
                ? 'Código'
                : candidate.norm_type === 'decreto_ley'
                  ? 'Decreto Ley'
                  : 'Norma';
      const numeroPart =
        candidate.norm_number && /^\d[\d.,]*$/.test(candidate.norm_number)
          ? ` N° ${candidate.norm_number}`
          : '';
      const titleText = String(candidate.title || candidate.citation || '')
        .replace(/\s+/g, ' ')
        .trim();
      // Fase 4.1.17: la cita de una disposición ("artículo 4") es el ancla
      // principal de recuperación: se prefiere el fragmento del artículo citado
      // aunque otro fragmento coincida más por contenido lexical (la consulta
      // pide "artículo 4", no "artículo 1").
      const citedArticles = extractArticleNumbers(query);
      const fragments = candidate.metadata?.fragments || [];
      const byArticle =
        citedArticles.length > 0
          ? fragments.find((f) =>
              extractArticleNumbers(f.article || '').some((a) => citedArticles.includes(a)),
            )
          : null;
      const alignedFragment = byArticle || resolveClaimFragment(query, fragments);
      // Fase 4.1.16: si ningún fragmento se alinea por contenido, el claim se
      // ancla al primer fragmento SUSTANTIVO del articulado (evidencia real),
      // nunca a metadata/título.
      const substantiveFragment =
        alignedFragment ||
        (Array.isArray(fragments)
          ? fragments.find((f) => isSubstantiveNormativeEvidence(f))
          : null);

      // Fase 4.1.17 (fix, misma regla que verifyJurisprudenceClaims): si la
      // consulta cita un ARTÍCULO específico que no existe en la norma, NO se
      // promueve la norma anclada a otra disposición. "Artículo 99" no puede
      // sustituirse por "Artículo 4" solo porque el contenido coincida: se
      // prefiere NO_EVIDENCE antes que citar la disposición equivocada.
      const availableArticles = [
        ...new Set(fragments.flatMap((f) => extractArticleNumbers(f.article || ''))),
      ];
      const articleMismatch =
        citedArticles.length > 0 &&
        availableArticles.length > 0 &&
        !citedArticles.some((a) => availableArticles.includes(a));
      if (articleMismatch) {
        researchWarnings.push(
          `La consulta cita el artículo ${citedArticles.join(', ')} de "${titleText}" (${candidate.norm_number || candidate.id}), pero esa disposición no existe en la fuente recuperada; no se promueve la norma en su lugar.`,
        );
      } else {
        autoNormativas.push({
          source: candidate,
          source_id: candidate.id,
          fragment_id: substantiveFragment?.id || null,
          afirmacion: `La ${typeLabel}${numeroPart} "${titleText}" regula la materia consultada.`,
          fragmento: substantiveFragment ? String(substantiveFragment.text).trim() : '',
        });
        researchWarnings.push(
          `La normativa se identificó por su título oficial (idNorma ${candidate.metadata?.leychileCode || candidate.id}); revisa su texto completo en LeyChile.`,
        );
      }
    }
  }
  const effectiveNormativa = verifiedNormativa.kept.length > 0
    ? verifiedNormativa.kept
    : autoNormativas;

  // Fase 4.2.14: gate de relevancia post-retrieval. Cuando la consulta es
  // documental (mode document/mixed) y NINGÚN claim documental sobrevivió la
  // verificación, las fuentes públicas no deben sustituir en silencio al
  // documento del caso: "¿Cuál es la renta mensual?" no se responde con la renta
  // de funcionarios de una ley ni con jurisprudencia genérica de arrendamiento.
  // Se conservan solo las fuentes con señal sustantiva de responder la consulta
  // (coincidencia de ley/artículo citado o solape de término sustantivo). Si
  // nada pasa el gate, el resultado es NO_EVIDENCE honesto, nunca una fuente
  // pública irrelevante. Determinístico, sin LLM.
  const gateShouldFilter = documentMode !== 'none' && verifiedDocumentos.kept.length === 0;
  const gateNormativa = gateShouldFilter
    ? applyRelevanceGate(effectiveNormativa, { query })
    : { kept: effectiveNormativa, droppedCount: 0, warnings: [] };
  const gateJurisprudencia = gateShouldFilter
    ? applyRelevanceGate(verifiedJurisprudencia.kept, { query })
    : { kept: verifiedJurisprudencia.kept, droppedCount: 0, warnings: [] };
  const gateDoctrina = gateShouldFilter
    ? applyRelevanceGate(verifiedDoctrina.kept, { query })
    : { kept: verifiedDoctrina.kept, droppedCount: 0, warnings: [] };
  const filteredNormativa = gateNormativa.kept;
  const filteredJurisprudencia = gateJurisprudencia.kept;
  const filteredDoctrina = gateDoctrina.kept;
  researchWarnings.push(
    ...gateNormativa.warnings,
    ...gateJurisprudencia.warnings,
    ...gateDoctrina.warnings,
  );

  if (intent === 'normativa' && filteredNormativa.length === 0) {
    researchWarnings.push(
      'No se encontró normativa específica que responda la consulta en las fuentes públicas consultadas (BCN/LeyChile). Verifica la vigencia en el portal oficial.',
    );
  }
  const modelAdvertencias = Array.isArray(validated.advertencias)
    ? validated.advertencias
        .filter(Boolean)
        .filter(
          (adv) =>
            // Cuando promovimos una norma, descartamos avisos del modelo que
            // afirmen la ausencia de normativa (contradicen la norma promovida).
            // Sin `\b` tras `[oó]`: en regex JS (modo no-unicode) los acentos no
            // son word-chars, así que ese límite impedía el match de "encontró".
            !(autoNormativas.length > 0 && /\bno se encontr[oó].{0,40}\b(normativa|norma|legislaci[oó]n|disposiciones)\b|\bsin (normativa|normas|disposiciones)\b/i.test(adv)),
        )
    : [];

  // Fase 4.0.2: suaviza conclusiones categóricas que las fuentes no respaldan
  // ("la ley establece…", "la jurisprudencia confirma…") y genera avisos.
  const excessive = detectExcessiveConclusions({
    resumen: validated.resumen,
    conclusion: validated.conclusion || '',
    normativa: filteredNormativa,
    jurisprudencia: filteredJurisprudencia,
  });

  // Cuando la normativa fue promovida automáticamente (el modelo no la citó),
  // refuerza la coherencia del resumen con un puntero factual a la norma.
  if (autoNormativas.length > 0 && filteredNormativa[0]?.source) {
    excessive.resumen = (
      `${(excessive.resumen || '').trim()} Se identificó la normativa aplicable: ${
        filteredNormativa[0].source.citation
      }.`
    ).trim();
  }

  // Fase 4.1 (Etapa 3): jerarquía normativa — solo ordena la presentación;
  // no decide cuál norma prevalece. Los matices de jerarquía se agregan a la
  // sección "Matices y contradicciones" (no se resuelven automáticamente).
  const ordenNormativa = orderNormativaByHierarchy(filteredNormativa);
  const { matices: maticesJerarquia } = detectHierarchyMatices(filteredNormativa);

  // Fase 4.1 (Etapa 4): contradicciones/matices entre fuentes. Conserva ambas
  // fuentes y NO resuelve el conflicto (regla conservadora).
  const { contradicciones, warnings: warningsContradicciones } = detectContradictions({
    normativa: filteredNormativa,
    jurisprudencia: filteredJurisprudencia,
    doctrina: filteredDoctrina,
  });

  // Fase 4.1 (Etapa 2): síntesis VERIFICADA. Cada oración se vincula a un
  // claim verificado; las oraciones sin respaldo se eliminan o se marcan como
  // inferencia del sistema (preferencia: ELIMINAR antes que inventar).
  const allVerifiedClaims = [
    ...filteredNormativa,
    ...filteredJurisprudencia,
    ...filteredDoctrina,
    ...verifiedDocumentos.kept,
  ];
  const hasVerifiedClaims = allVerifiedClaims.length > 0;
  const synthesisResult = verifyAndBuildSynthesis(
    hasVerifiedClaims ? excessive.conclusion : '',
    allVerifiedClaims,
  );
  const síntesisText = hasVerifiedClaims ? synthesisResult.síntesis || '' : '';
  const maticesFinales = hasVerifiedClaims
    ? dedupeMatices([...maticesJerarquia, ...contradicciones])
    : [];

  // Fase 4.1.10: estado NO_EVIDENCE. El pipeline funcionó por completo (search
  // OK, LLM OK, schema OK, verifier OK), pero no quedó ningún claim verificado.
  // El resumen no verificado del modelo NO se exhibe como afirmación jurídica
  // respaldada; se reemplaza por un mensaje explícito de ausencia de evidencia.
  // Fase 4.2.6: en modo documental el mensaje apunta a los documentos del caso.
  const resumenFinal = hasVerifiedClaims
    ? excessive.resumen
    : documentMode === 'document'
      ? 'No se encontró evidencia suficiente en los documentos del caso para responder esta pregunta de manera verificable.'
      : 'No se encontró evidencia suficiente en las fuentes públicas consultadas para responder esta pregunta de manera verificable.';
  const advertenciasFinales = hasVerifiedClaims
    ? [
        ...modelAdvertencias,
        ...researchWarnings,
        ...excessive.warnings,
        ...synthesisResult.warnings,
        ...warningsContradicciones,
      ]
    : researchWarnings;

  const answer = buildJurisprudenceAnswer({
    resumen: resumenFinal,
    normativa: hasVerifiedClaims ? ordenNormativa : [],
    jurisprudencia: hasVerifiedClaims ? verifiedJurisprudencia.kept : [],
    doctrina: hasVerifiedClaims ? verifiedDoctrina.kept : [],
    documento: hasVerifiedClaims ? verifiedDocumentos.kept : [],
    sintesis: síntesisText,
    matices: maticesFinales,
    advertencias: advertenciasFinales,
  });

  // Referencia (para persistir) solo las fuentes que sobrevivieron la verificación.
  const referenced = [
    ...ordenNormativa.map((c) => c.source),
    ...filteredJurisprudencia.map((c) => c.source),
    ...filteredDoctrina.map((c) => c.source),
    ...verifiedDocumentos.kept.map((c) => c.source),
  ];
  const referencedById = new Map(referenced.map((source) => [source.id, source]));
  const referencedIds = [...referencedById.values()];

  // Fase 4.1 (Etapa 7): persistir claims estructurados. Se reutiliza el JSONB
  // existente "sources": cada fuente conserva sus claims verificados (sin
  // migración y sin romper la compatibilidad con investigaciones previas).
  const claimsBySource = new Map();
  for (const c of allVerifiedClaims) {
    if (!c.source_id) continue;
    if (!claimsBySource.has(c.source_id)) claimsBySource.set(c.source_id, []);
    claimsBySource.get(c.source_id).push({
      source_id: c.source_id,
      fragment_id: c.fragment_id || null,
      category: c.category || c.source?.kind || null,
      afirmacion: c.afirmacion,
      evidencia: c.fragmento,
      verified: true,
      vigencia: c.vigencia || null,
      vigencia_nota: c.vigencia_nota || null,
    });
  }
  const persistedSources = referencedIds.map((source) => ({
    ...source,
    claims: claimsBySource.get(source.id) || [],
  }));

  return {
    status: 'ok',
    outcome: hasVerifiedClaims ? 'SUCCESS' : 'NO_EVIDENCE',
    answer,
    resumenFinal,
    advertenciasFinales,
    allVerifiedClaims,
    persistedSources,
    referencedIds,
    maticesFinales,
    síntesisText,
    researchWarnings,
    contradicciones,
    documentClaimsDropped: verifiedDocumentos.warnings.length,
    relevanceDroppedSources:
      gateNormativa.droppedCount + gateJurisprudencia.droppedCount + gateDoctrina.droppedCount,
  };
}

// ---------------------------------------------------------------------------
// Fase 4.2.4 — retry controlado por JSON/schema inválido.
// El modelo free (gpt-oss-20b) ocasionalmente devuelve JSON sintácticamente o
// estructuralmente inválido (~1/6 en QA). Al repetir la llamada puede producir
// JSON válido. Este helper reintenta SOLO ese caso (formato/schema), con máximo
// LLM_RETRY_MAX_ATTEMPTS intentos y SIN incluir la salida inválida en el prompt
// de reintento. NO reintenta NO_EVIDENCE (respuesta válida), ni errores de
// provider (su retry temporal ya vive en chatCompletion), ni CONTEXT_TOO_LARGE
// (se detecta antes de llamar al LLM). No duplica el sistema de retry existente:
// lo complementa únicamente para el fallo de formato que él no cubre.
// ---------------------------------------------------------------------------
export const LLM_RETRY_MAX_ATTEMPTS = 3;
export const LLM_RETRY_PROMPT =
  'La respuesta anterior no cumplió el formato requerido. Responde nuevamente utilizando exclusivamente el JSON solicitado. No agregues markdown, explicaciones ni texto fuera del JSON.';

// Fase 4.2.10: recuperación controlada por OUTPUT_TOKEN_LIMIT. El modelo free
// (gpt-oss-20b) a veces agota el presupuesto de salida en el razonamiento
// interno. Se reintenta UNA vez con una instrucción de salida compacta (sin
// tocar AI_CHAT_MAX_TOKENS ni el presupuesto documental de 4.2.7). Las
// afirmaciones siguen pasando por el verifier: no se debilita la evidencia.
export const OUTPUT_TOKEN_LIMIT_RETRY_PROMPT =
  'La respuesta anterior excedió el límite de tokens de salida. Responde nuevamente SOLO con el JSON solicitado en su forma mínima: resumen breve, la afirmación verificada más relevante por categoría y conclusiones concisas. Omite fragmentos extensos y advertencias redundantes. No agregues texto fuera del JSON.';

function mergeUsage(usages = []) {
  return usages.reduce(
    (acc, u) => ({
      provider: acc.provider || u.provider,
      model: acc.model || u.model,
      input_tokens: acc.input_tokens + (u.input_tokens || 0),
      output_tokens: acc.output_tokens + (u.output_tokens || 0),
      total_tokens: acc.total_tokens + (u.total_tokens || 0),
      estimated_cost_usd: acc.estimated_cost_usd + (u.estimated_cost_usd || 0),
    }),
    {
      provider: '',
      model: '',
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
    },
  );
}

/**
 * Ejecuta la investigación jurídica con reintentos limitados ante JSON/schema
 * inválido. `llmCall` recibe la instrucción de reintento (null en el primer
 * intento) y debe devolver { data, raw, usage } o lanzar un error tipado de
 * provider (que NO se reintenta aquí).
 *
 * @param {object} input
 * @param {(retryInstruction: string|null) => Promise<{data: object|null, raw: string, usage: object}>} input.llmCall
 * @param {object[]} input.sources
 * @param {string} input.intent
 * @param {string} input.query
 * @param {object[]|null} [input.documents]
 * @param {string|null} [input.workspaceId]
 * @param {string|null} [input.lawyerId]
 * @param {'none'|'document'|'mixed'} [input.documentMode]
 * @returns {Promise<{outcome: object, attempts: number, retryCount: number, usage: object}>}
 */
export async function runJurisprudenceWithRetry({
  llmCall,
  sources,
  intent,
  query,
  documents = null,
  workspaceId = null,
  lawyerId = null,
  documentMode = 'none',
}) {
  const usages = [];
  let outcome = null;
  let attempts = 0;
  let outputLimitRecovered = false;

  for (let attempt = 1; attempt <= LLM_RETRY_MAX_ATTEMPTS; attempt += 1) {
    attempts = attempt;
    const retryInstruction = attempt === 1 ? null : LLM_RETRY_PROMPT;

    let result;
    try {
      result = await llmCall(retryInstruction);
    } catch (error) {
      // Fase 4.2.10: recuperación controlada por OUTPUT_TOKEN_LIMIT, una sola
      // vez por request y sin tocar el presupuesto de tokens ni el de contexto.
      // Cualquier otro error de provider se propaga (no es un fallo de formato:
      // el retry de schema no aplica a fallos de infraestructura).
      if (!outputLimitRecovered && error?.code === 'OUTPUT_TOKEN_LIMIT') {
        outputLimitRecovered = true;
        result = await llmCall(OUTPUT_TOKEN_LIMIT_RETRY_PROMPT);
      } else {
        throw error;
      }
    }
    if (result?.usage) usages.push(result.usage);

    outcome = buildJurisprudenceOutcome({
      data: result?.data ?? null,
      sources,
      intent,
      query,
      documents,
      workspaceId,
      lawyerId,
      documentMode,
    });
    if (outcome.status !== 'invalid_response') break;
  }

  return {
    outcome,
    attempts,
    retryCount: attempts - 1,
    usage: mergeUsage(usages),
    outputLimitRecovered,
  };
}
