import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config();

import { chatCompletion, isAIProviderConfigured } from './provider.mjs';
import { searchJurisprudence } from './jurisprudenceSources.mjs';
import {
  buildJurisprudenceSystemPrompt,
  buildJurisprudenceContext,
  buildJurisprudenceUserPrompt,
  buildJurisprudenceCaseContext,
  buildJurisprudenceAnswer,
  verifyJurisprudenceClaims,
  detectExcessiveConclusions,
} from './jurisprudencePrompt.mjs';
import { resolveClaimFragment } from './jurisprudenceSources.mjs';
import { verifyAndBuildSynthesis } from './synthesisVerifier.mjs';
import { orderNormativaByHierarchy, detectHierarchyMatices } from './hierarchy.mjs';
import { detectContradictions } from './contradiction.mjs';

const AI_DEFAULT_MODEL = process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini';
const AI_CHAT_MAX_TOKENS = Number(process.env.AI_CHAT_MAX_TOKENS) || 2400;

const AIResearchResponseSchema = z
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

const fakeWorkspace = {
  id: 'e2e-workspace',
  focus_area: 'Derecho Civil',
  fact_pattern:
    'Caso abstracto de prueba E2E: consulta sobre derechos de los titulares de datos personales.',
};

async function runResearch(query, label) {
  console.log('\n' + '='.repeat(78));
  console.log(`E2E — ${label}`);
  console.log(`QUERY: ${query}`);
  console.log('='.repeat(78));

  const { sources, warnings, intent } = await searchJurisprudence(query, { limit: 8 });
  console.log(`\nINTENT: ${intent}`);
  console.log(`SOURCES (${sources.length}):`);
  for (const s of sources) {
    console.log(
      `  • [${s.kind}] ${s.id} — ${s.citation || s.title || s.url} | vigency=${s.vigency} | fragments=${s.metadata?.fragments?.length || 0}`,
    );
  }
  for (const w of warnings) console.log(`  ⚠ warning: ${w}`);

  const { context, tooLarge } = buildJurisprudenceContext(sources);
  if (tooLarge) {
    console.log('\n⚠ CONTEXT_TOO_LARGE');
    return;
  }
  const caseContext = buildJurisprudenceCaseContext(fakeWorkspace);

  const { data, raw, usage } = await chatCompletion({
    model: AI_DEFAULT_MODEL,
    system: buildJurisprudenceSystemPrompt(),
    messages: [
      { role: 'user', content: buildJurisprudenceUserPrompt({ question: query, context, caseContext }) },
    ],
    maxTokens: AI_CHAT_MAX_TOKENS,
    temperature: 0.2,
  });

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

  if (!validated) {
    console.log('\n⚠️ MODELO SIN JSON ESTRUCTURADO.');
    console.log(`USAGE: ${JSON.stringify(usage)}`);
    if (raw) console.log('RAW (primeros 400):', String(raw).slice(0, 400));
    return;
  }

  console.log(`\nMODEL USAGE: ${JSON.stringify(usage)}`);
  console.log(`\nRESUMEN: ${validated.resumen}`);
  console.log(
    `CLAIMS MODELO: normativa=${validated.normativa.length}, jurisprudencia=${validated.jurisprudencia.length}, doctrina=${validated.doctrina.length}`,
  );

  const includedById = new Map(sources.map((source) => [source.id, source]));

  const verifiedNormativa = verifyJurisprudenceClaims(validated.normativa, includedById, 'normativa');
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

  // autoNormativas (mismo logic que el POST).
  const autoNormativas = [];
  if (intent === 'normativa' && verifiedNormativa.kept.length === 0) {
    const candidate =
      sources.find((s) => s.kind === 'normativa' && s.norm_type === 'ley') ||
      sources.find((s) => s.kind === 'normativa');
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
      const alignedFragment = resolveClaimFragment(query, candidate.metadata?.fragments || []);
      autoNormativas.push({
        source: candidate,
        source_id: candidate.id,
        fragment_id: alignedFragment?.id || null,
        afirmacion: `La ${typeLabel}${numeroPart} "${titleText}" regula la materia consultada.`,
        fragmento: alignedFragment ? String(alignedFragment.text).trim() : '',
      });
      researchWarnings.push(
        `La normativa se identificó por su título oficial (idNorma ${candidate.metadata?.leychileCode || candidate.id}); revisa su texto completo en LeyChile.`,
      );
    }
  }
  const effectiveNormativa =
    verifiedNormativa.kept.length > 0 ? verifiedNormativa.kept : autoNormativas;

  if (intent === 'normativa' && effectiveNormativa.length === 0) {
    researchWarnings.push(
      'No se encontró normativa específica que responda la consulta en las fuentes públicas consultadas (BCN/LeyChile).',
    );
  }
  const modelAdvertencias = Array.isArray(validated.advertencias) ? validated.advertencias : [];

  const excessive = detectExcessiveConclusions({
    resumen: validated.resumen,
    conclusion: validated.conclusion || '',
    normativa: effectiveNormativa,
    jurisprudencia: verifiedJurisprudencia.kept,
  });

  if (autoNormativas.length > 0 && effectiveNormativa[0]?.source) {
    excessive.resumen = `${(excessive.resumen || '').trim()} Se identificó la normativa aplicable: ${effectiveNormativa[0].source.citation}.`;
  }

  const ordenNormativa = orderNormativaByHierarchy(effectiveNormativa);
  const { matices: maticesJerarquia } = detectHierarchyMatices(effectiveNormativa);
  const { contradicciones, warnings: warningsContradicciones } = detectContradictions({
    normativa: effectiveNormativa,
    jurisprudencia: verifiedJurisprudencia.kept,
    doctrina: verifiedDoctrina.kept,
  });

  const allVerifiedClaims = [
    ...effectiveNormativa,
    ...verifiedJurisprudencia.kept,
    ...verifiedDoctrina.kept,
  ];
  const synthesisResult = verifyAndBuildSynthesis(excessive.conclusion, allVerifiedClaims);
  const síntesisText = synthesisResult.síntesis || '';
  const maticesFinales = [...maticesJerarquia, ...contradicciones];

  console.log('\n--- CLAIMS VERIFICADOS ---');
  for (const c of [
    ...ordenNormativa.map((x) => ({ ...x, cat: 'normativa' })),
    ...verifiedJurisprudencia.kept.map((x) => ({ ...x, cat: 'jurisprudencia' })),
    ...verifiedDoctrina.kept.map((x) => ({ ...x, cat: 'doctrina' })),
  ]) {
    console.log(`\n  [${c.cat}] ${c.fuente_id || c.source_id} / frag=${c.fragment_id || '—'}`);
    console.log(`    AFIRMACIÓN: ${c.afirmacion}`);
    console.log(`    EVIDENCIA: ${(c.fragmento || '').slice(0, 160)}`);
    console.log(`    vigencia=${c.vigencia} vigencia_nota=${c.vigencia_nota || '—'}`);
  }

  console.log('\n===== MATICES / CONTRADICCIONES =====');
  for (const m of maticesFinales) console.log(`  • ${m}`);
  for (const w of warningsContradicciones) console.log(`  ⚠ ${w}`);

  console.log('\n===== SÍNTESIS VERIFICADA =====');
  console.log(síntesisText || '(vacía)');
  for (const w of synthesisResult.warnings) console.log(`  ⚠ síntesis: ${w}`);

  console.log('\n===== WARNINGS FINALES =====');
  const allWarnings = [
    ...modelAdvertencias,
    ...researchWarnings,
    ...excessive.warnings,
    ...synthesisResult.warnings,
    ...warningsContradicciones,
  ];
  for (const w of allWarnings) console.log(`  • ${w}`);

  const answer = buildJurisprudenceAnswer({
    resumen: excessive.resumen,
    normativa: ordenNormativa,
    jurisprudencia: verifiedJurisprudencia.kept,
    doctrina: verifiedDoctrina.kept,
    sintesis: síntesisText,
    matices: maticesFinales,
    advertencias: allWarnings,
  });

  console.log('\n===== RESPUESTA FINAL (markdown) =====');
  console.log(answer);

  return { verifiedNormativa, verifiedJurisprudencia, verifiedDoctrina, effectiveNormativa, maticesFinales, síntesisText, intent, sources };
}

async function main() {
  console.log(`Proveedor IA configurado: ${isAIProviderConfigured()}`);
  console.log(`Modelo: ${AI_DEFAULT_MODEL}`);

  const queries = [
    {
      label: 'NORMATIVA · Ley 21.719 derechos de titulares (debe anclar al Art. 4, no al 14 quinquies)',
      query: '¿Qué derechos reconoce la Ley 21.719 a los titulares de datos personales?',
    },
    {
      label: 'VIGENCIA DIFERIDA · Ley 21.719 (no presentarla como vigente)',
      query: '¿Qué establece la Ley 21.719 sobre protección de datos personales?',
    },
    {
      label: 'MIXTA · normativa + jurisprudencia + doctrina',
      query:
        '¿Qué obligaciones tienen las empresas que tratan datos personales de clientes en Chile y cómo ha resuelto la jurisprudencia y la doctrina el derecho de acceso?',
    },
    {
      label: 'CONTRADICCIÓN · criterios jurisprudenciales potencialmente distintos',
      query:
        '¿Qué criterios ha sostenido la jurisprudencia sobre la indemnización de perjuicios por violación de datos personales en Chile?',
    },
    {
      label: 'DOCTRINA · OpenAlex como fuente no vinculante',
      query: '¿Cuál es el régimen jurídico de la protección de datos personales en Chile?',
    },
  ];

  let idx = 0;
  for (const q of queries) {
    idx += 1;
    try {
      await runResearch(q.query, q.label);
    } catch (error) {
      console.log(`\n⚠️ [consulta ${idx}] ERROR: ${error.message}`);
      if (error.stack) console.log(error.stack.split('\n')[1]);
    }
    console.log('\n' + '—'.repeat(78));
  }
}

main();