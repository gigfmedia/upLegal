import { z } from 'zod';
import {
  verifyJurisprudenceClaims,
  detectExcessiveConclusions,
  buildJurisprudenceAnswer,
} from './jurisprudencePrompt.mjs';
import {
  resolveClaimFragment,
  isBcnNormaRelevantToQuery,
  hasSubstantiveNormativeEvidence,
  isSubstantiveNormativeEvidence,
  extractLawNumber,
  extractArticleNumbers,
} from './jurisprudenceSources.mjs';
import { verifyAndBuildSynthesis } from './synthesisVerifier.mjs';
import { orderNormativaByHierarchy, detectHierarchyMatices } from './hierarchy.mjs';
import { detectContradictions } from './contradiction.mjs';

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
 * @param {{ data: object|null, sources: object[], intent: string, query: string }} input
 */
export function buildJurisprudenceOutcome({ data, sources, intent, query = '' }) {
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

  const researchWarnings = [
    ...verifiedNormativa.warnings,
    ...verifiedJurisprudencia.warnings,
    ...verifiedDoctrina.warnings,
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

  if (intent === 'normativa' && effectiveNormativa.length === 0) {
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
    normativa: effectiveNormativa,
    jurisprudencia: verifiedJurisprudencia.kept,
  });

  // Cuando la normativa fue promovida automáticamente (el modelo no la citó),
  // refuerza la coherencia del resumen con un puntero factual a la norma.
  if (autoNormativas.length > 0 && effectiveNormativa[0]?.source) {
    excessive.resumen = (
      `${(excessive.resumen || '').trim()} Se identificó la normativa aplicable: ${
        effectiveNormativa[0].source.citation
      }.`
    ).trim();
  }

  // Fase 4.1 (Etapa 3): jerarquía normativa — solo ordena la presentación;
  // no decide cuál norma prevalece. Los matices de jerarquía se agregan a la
  // sección "Matices y contradicciones" (no se resuelven automáticamente).
  const ordenNormativa = orderNormativaByHierarchy(effectiveNormativa);
  const { matices: maticesJerarquia } = detectHierarchyMatices(effectiveNormativa);

  // Fase 4.1 (Etapa 4): contradicciones/matices entre fuentes. Conserva ambas
  // fuentes y NO resuelve el conflicto (regla conservadora).
  const { contradicciones, warnings: warningsContradicciones } = detectContradictions({
    normativa: effectiveNormativa,
    jurisprudencia: verifiedJurisprudencia.kept,
    doctrina: verifiedDoctrina.kept,
  });

  // Fase 4.1 (Etapa 2): síntesis VERIFICADA. Cada oración se vincula a un
  // claim verificado; las oraciones sin respaldo se eliminan o se marcan como
  // inferencia del sistema (preferencia: ELIMINAR antes que inventar).
  const allVerifiedClaims = [
    ...effectiveNormativa,
    ...verifiedJurisprudencia.kept,
    ...verifiedDoctrina.kept,
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
  const resumenFinal = hasVerifiedClaims
    ? excessive.resumen
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
    sintesis: síntesisText,
    matices: maticesFinales,
    advertencias: advertenciasFinales,
  });

  // Referencia (para persistir) solo las fuentes que sobrevivieron la verificación.
  const referenced = [
    ...ordenNormativa.map((c) => c.source),
    ...verifiedJurisprudencia.kept.map((c) => c.source),
    ...verifiedDoctrina.kept.map((c) => c.source),
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
  };
}
