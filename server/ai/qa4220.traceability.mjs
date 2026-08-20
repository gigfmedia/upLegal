// QA real — Fase 4.2.20 · Trazabilidad y atribución de evidencia (§21).
//
// Replica el flujo de la ruta de research (server.mjs ~8148-8497) SIN Express:
//   classifyLegalQuery → detectDocumentMode → retrieval (document/mixed/none)
//   → buildJurisprudenceCaseContext + selectDocumentEvidence + selectSourcesForContext
//   → chatCompletion (LLM real) → runJurisprudenceWithRetry → buildJurisprudenceOutcome
//
// Seis casos mínimos (§21): documental, normativa, jurisprudencial, mixta,
// sin evidencia y fuente irrelevante. Para cada uno se reporta el outcome, la
// Respuesta breve (verificada o no), attributionCoverage y si alguna oración
// sin respaldo intentó colarse en la breve (observable 4.2.20 §11).
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config();

import { chatCompletion, isAIProviderConfigured, createLlmCallBudget } from './provider.mjs';
import { searchJurisprudence, classifyLegalQuery } from './jurisprudenceSources.mjs';
import { detectDocumentMode, selectDocumentEvidence } from './documentGrounding.mjs';
import { allocateDynamicContextBudget } from './dynamicContextBudget.mjs';
import {
  buildJurisprudenceSystemPrompt,
  buildJurisprudenceUserPrompt,
  buildJurisprudenceCaseContext,
  selectSourcesForContext,
} from './jurisprudencePrompt.mjs';
import {
  buildJurisprudenceOutcome,
  runJurisprudenceWithRetry,
} from './jurisprudencePipeline.mjs';
import { verifyAndBuildSynthesis } from './synthesisVerifier.mjs';

const AI_DEFAULT_MODEL = process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini';
const AI_CHAT_MAX_TOKENS = Number(process.env.AI_CHAT_MAX_TOKENS) || 2400;

// Documento sintético del caso para los escenarios documentales/mixtos.
const contratoDoc = {
  id: 'qa-4220-1111-aaaa-4bbb-8ccc-000000000001',
  original_filename: 'contrato-arriendo.pdf',
  workspace_id: 'qa-workspace',
  lawyer_id: 'qa-lawyer',
  status: 'ready',
  extracted_text:
    'PRIMERA: El canon de arrendamiento mensual es de 500.000 pesos. SEGUNDA: El plazo del contrato es de doce meses. TERCERA: Se prohíbe el subarriendo sin autorización por escrito del arrendador.',
};

const fakeWorkspace = {
  id: 'qa-workspace',
  focus_area: 'Derecho Civil',
  fact_pattern: 'Caso de prueba QA 4.2.20 sobre arrendamiento.',
};

const briefIssues = (briefText, claims) => {
  // Reusa el MISMO verifier del pipeline para medir si alguna oración de la
  // breve se descartaría por falta de respaldo (observable 4.2.20 §11).
  if (!briefText) return { unverifiedSentences: 0, verified: false, empty: true };
  const { sentences } = verifyAndBuildSynthesis(briefText, claims);
  const unverified = sentences.filter((s) => s.dropped).length;
  return { unverifiedSentences: unverified, verified: unverified === 0, empty: false };
};

async function runCase(label, query, caseDocuments) {
  console.log('\n' + '='.repeat(80));
  console.log(`Caso: ${label}`);
  console.log(`QUERY: ${query}`);

  const classification = classifyLegalQuery(query);
  const documentModeResult = detectDocumentMode(query, caseDocuments, classification);
  const documentMode = documentModeResult.mode;
  console.log(`INTENT: ${classification.intent} | MODE: ${documentMode}`);

  if (documentModeResult.noEvidence) {
    console.log('→ NO_DOCUMENT_EVIDENCE (banner).');
    return { skipped: 'NO_DOCUMENT_EVIDENCE' };
  }

  const research =
    documentMode === 'document'
      ? { sources: [], warnings: [], intent: 'document' }
      : await searchJurisprudence(query, { limit: 8 });
  const { sources, warnings, intent } = research;
  console.log(`SOURCES (${sources.length}): ${sources.map((s) => s.id).join(', ')}`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);

  if (documentMode !== 'document' && sources.length === 0) {
    console.log('→ NO_SOURCES_FOUND (no document-only fallback en QA).');
    return { skipped: 'NO_SOURCES_FOUND' };
  }

  const allocation = allocateDynamicContextBudget({
    documents: caseDocuments,
    sources,
    query,
    documentMode,
  });
  const { context } = selectSourcesForContext({
    sources,
    query,
    intentClass: classification.intent,
    maxContextChars: allocation.legalBudget,
  });
  const documentEvidence =
    documentMode === 'none'
      ? { context: '', selected: [] }
      : selectDocumentEvidence({
          documents: caseDocuments,
          query,
          maxChars: allocation.documentBudget,
          workspaceId: fakeWorkspace.id,
          lawyerId: 'qa-lawyer',
        });

  const caseContext = buildJurisprudenceCaseContext(fakeWorkspace);
  const llmBudget = createLlmCallBudget();
  const { outcome, attempts, usage } = await runJurisprudenceWithRetry({
    llmCall: () =>
      chatCompletion({
        model: AI_DEFAULT_MODEL,
        system: buildJurisprudenceSystemPrompt({ documentMode }),
        messages: [
          {
            role: 'user',
            content: buildJurisprudenceUserPrompt({
              question: query,
              context,
              caseContext,
              intent: classification.intent,
              documentContext: documentEvidence.context,
            }),
          },
        ],
        maxTokens: AI_CHAT_MAX_TOKENS,
        temperature: 0.2,
        budget: llmBudget,
      }),
    sources,
    intent,
    query,
    documents: documentMode === 'none' ? null : caseDocuments,
    workspaceId: fakeWorkspace.id,
    lawyerId: 'qa-lawyer',
    documentMode,
  });

  console.log(`LLM attempts: ${attempts} | usage: ${usage ? JSON.stringify(usage) : '—'}`);

  if (outcome.status === 'invalid_response') {
    console.log('→ INVALID_RESPONSE (modelo sin JSON estructurado tras reintentos).');
    return { skipped: 'INVALID_RESPONSE' };
  }

  console.log(`OUTCOME: ${outcome.outcome}`);
  console.log(`attributionCoverage: ${outcome.attributionCoverage}`);
  console.log(`claims verificados: ${outcome.allVerifiedClaims.length}`);
  console.log(`persistedSources: ${outcome.persistedSources.map((s) => s.id).join(', ')}`);
  console.log('\n--- RESPONSE BREVE (resumenFinal) ---');
  console.log(outcome.resumenFinal);
  if (outcome.outcome === 'SUCCESS') {
    // La re-verificación SOLO aplica a la breve con claims: el mensaje honesto
    // de NO_EVIDENCE no es una oración anclada a claims (es ausencia explícita).
    const briefCheck = briefIssues(outcome.resumenFinal, outcome.allVerifiedClaims);
    console.log(
      `\nbrief re-verificación: oraciones sin respaldo=${briefCheck.unverifiedSentences} → ${briefCheck.verified ? 'VERIFICADA' : '¡CONTAMINADA!'}`,
    );
  } else {
    console.log('\nbrief re-verificación: N/A (mensaje honesto de NO_EVIDENCE, no anclado a claims)');
  }
  console.log('\n--- SÍNTESIS ---');
  console.log(outcome.síntesisText || '(vacía)');
  console.log('\n--- AVISOS ---');
  for (const w of outcome.advertenciasFinales) console.log(`  • ${w}`);

  return { outcome, usage, documentMode };
}

async function main() {
  console.log(`Proveedor IA configurado: ${isAIProviderConfigured()}`);
  console.log(`Modelo: ${AI_DEFAULT_MODEL}`);

  const cases = [
    {
      label: '1 · DOCUMENTAL — renta mensual en el contrato',
      query: '¿Cuál es la renta mensual del arriendo?',
      docs: [contratoDoc],
    },
    {
      label: '2 · DOCUMENTAL — hecho AUSENTE del contrato (daños)',
      query: '¿Cuánto ascienden los daños punitivos pactados?',
      docs: [contratoDoc],
    },
    {
      label: '3 · NORMATIVA — derechos de titulares Ley 21.719',
      query: '¿Qué derechos reconoce la Ley 21.719 a los titulares de datos personales?',
      docs: [],
    },
    {
      label: '4 · JURISPRUDENCIA — indemnización por violación de datos',
      query:
        '¿Qué criterios ha sostenido la jurisprudencia sobre la indemnización de perjuicios por violación de datos personales en Chile?',
      docs: [],
    },
    {
      label: '5 · MIXTA — renta del contrato + norma de arrendamiento',
      query: '¿Cuál es la renta mensual y qué dice la ley sobre el subarriendo?',
      docs: [contratoDoc],
    },
    {
      label: '6 · MIXTA — hecho del contrato + fuente pública irrelevante',
      query: '¿Cuál es el plazo del contrato de arrendamiento?',
      docs: [contratoDoc],
    },
  ];

  let idx = 0;
  for (const c of cases) {
    idx += 1;
    try {
      await runCase(c.label, c.query, c.docs);
    } catch (error) {
      console.log(`\n⚠️ [caso ${idx}] ERROR: ${error.message}`);
      if (error.stack) console.log(error.stack.split('\n')[1]);
    }
    console.log('\n' + '—'.repeat(80));
  }
}

main();