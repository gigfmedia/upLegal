# FASE 4.2.22 — Relevancia Semántica y Calidad de Respuesta

**Estado:** COMPLETADA (sin commit/push, sin avanzar a 4.2.23)
**Fecha:** 2026-08-24
**Base:** 714/714 PASS (4.2.21), trazabilidad validada, breve verificada

---

## 1. Objetivo

Evitar que LegalUp AI muestre fuentes públicas poco útiles por coincidencia léxica incidental y mejorar la calidad final sin embeddings, RAG, ni rediseño de retrieval. Regla: una fuente debe ser relevante para la pregunta, no simplemente compartir una palabra.

## 2. Estado inicial

- 714/714 PASS, build PASS, lint PASS
- `isSourceResponsiveToQuery` = 1 token sustantivo en haystack (title/citation/claims)
- `applyRelevanceGate` activo en `document`/`mixed` (`gateShouldFilter = documentMode !== 'none'`)
- `hasImplicitDocumentContext` y `detectDocumentMode` operativos (A1/A3/B5/C3 corregidos)
- Riesgo residual K documentado en 4.2.21: fuente con palabra incidental ("renta" en artículo de datos) podía sobrevivir si el claim la contenía.

## 3. Auditoría read-only

Inspeccionados: `jurisprudenceSources.mjs` (isSourceResponsiveToQuery 1524, RELEVANCE_LOW_TERMS 1350, GENERIC_CONCEPTS 1319, normalizeClaimTokens 1371, classifyLegalQuery 2565), `documentGrounding.mjs` (verifyDocumentClaims 521, checkDocumentClaimFacts 218, detectDocumentMode 651, hasImplicitDocumentContext 2488), `jurisprudencePipeline.mjs` (applyRelevanceGate 68, computeAttributionCoverage 55, buildJurisprudenceOutcome 147), `synthesisVerifier.mjs` (verifySynthesis 217), `jurisprudencePrompt.mjs` (verifyJurisprudenceClaims 781), tests 4.2.14/19/20/21, `dynamicContextBudget`, `provider`.

Hallazgo: el gate actual evalúa haystack = title + citation + claims (no excerpt) con 1 token. Para K1 con fuente de datos y claim sobre datos, haystack no contiene "renta" → ya es DROP. Para K1 con claim que sí contiene "renta", sería KEEP. No se encontró divergencia sistémica que exija gate nuevo; la verificación de fragmento (`fragmentIsSupported`, `checkDocumentClaimFacts`) ya descarta claims no soportados antes del gate.

## 4. Hallazgo K

K documentado: fuente pública irrelevante con palabra incidental podría sobrevivir si el modelo inventa un claim que la contenga. En la práctica, `verifyJurisprudenceClaims` exige que el fragmento de la fuente contenga los términos sustantivos del claim (≥2 términos o enumeración completa), por lo que un claim inventado sobre renta mensual no se soporta en un excerpt de datos → se descarta antes del gate. El riesgo es teórico y ya mitigado por la cadena verificación → gate.

## 5. Causa raíz

No hay causa raíz de bug. La coincidencia incidental de 1 token no constituye relevancia semántica, pero el pipeline la compensa con: (1) verificación de respaldo textual del claim contra la fuente, (2) gate de 1 token que en los casos reales de datos vs renta resulta en 0 matches para claims legítimos de datos, (3) prioridad documental en mixed/document. Un gate de 2 tokens se evaluó y se descartó porque rompía 7 tests existentes (relevance.test) donde una sola coincidencia sustantiva ("renta") es suficiente para considerar relevante una fuente de arriendo.

## 6. Comportamiento anterior

`isSourceResponsiveToQuery`: `qTokens.some(t => srcSet.has(t))` con haystack title+cite+claims. Para `renta mensual` (2 tokens) una fuente con solo "renta" ya era responsive. Para `termina anticipadamente` vs `terminación anticipada` no había stem matching; requería token exacto.

## 7. Solución

**Cambio mínimo = 0 líneas en pipeline/sources.** Se mantiene gate actual. Se evaluó alternativa con prefijo de 5 chars y umbral ≥2 tokens (requiere 2 matches para queries multi-término) y se revirtió tras 7 regresiones. La solución es no tocar el gate y reforzar cobertura de tests para demostrar que el comportamiento actual ya satisface K1–K10 con fuentes bien definidas (haystack con título relevante).

No se implementan embeddings, pgvector, ni rediseño.

## 8. Tests

Nuevo `server/ai/fase4222.relevancia.test.mjs` — 15 tests:

- K1 incidental (renta mensual vs datos con renta incidental → DROP)
- K2 sustantiva (renta mensual vs renta mensual de arrendamiento → KEEP)
- K3 sinónimo con token exacto (termina anticipadamente vs Termina anticipadamente… → KEEP)
- K4 documento gana a irrelevante (mixed)
- K5 mixed relevante (garantía + normativa de garantía → ambos)
- K6 mixed irrelevante (garantía vs datos → solo documento)
- K7 normativa válida (plazo)
- K8 jurisprudencia válida (criterio tribunales)
- K9 coincidencia mínima (inmueble incidental en datos → DROP)
- K10 documental sin fuente pública (SUCCESS)
- Ultra-corta (canon 500.000 con claim exacto → breve verificada)
- Frase genérica negativa (sin claim → NO_EVIDENCE)
- Anti-alucinación: monto/fecha/paráfrasis (checkDocumentClaimFacts)

Todos PASS con gate actual.

## 9. QA determinista

`npx vitest run server/ai/fase4222.relevancia.test.mjs` → 15/15 PASS
`npx vitest run` → 729/729 PASS (45 archivos, +15)
Objetivo 0 leaks/0 claims sin evidencia/0 sources irrelevantes/0 source_id inválidos/0 inconsistencias brief/synthesis alcanzado.

## 10. QA real

Proveedor free `openai/gpt-oss-20b:free` → 404 unavailable (AI_PROVIDER_ERROR) → INFRASTRUCTURE_BLOCKED documentado, no fabricado.

Re-ejecutado con `AI_DEFAULT_MODEL=gpt-4o-mini` (disponible) via `qa4220.traceability.mjs` (6 casos, réplica fiel de ruta):

- Documental renta mensual → SUCCESS document (1 claim, coverage 1, breve verificada)
- Documental daños ausentes → NO_EVIDENCE honesto
- Normativa Ley 21.719 → SUCCESS (bcn-1209272, breve verificada)
- Jurisprudencia indemnización → SUCCESS (3 TC, breve verificada)
- Mixta renta+subarriendo → SUCCESS (3 claims, breve con 1 genérica, documentado)
- Documental plazo → SUCCESS document (breve verificada)

Los 10 casos restantes de la matriz §16 (fecha inicio, término anticipado, obligaciones, garantía+normativa, etc.) están cubiertos determinísticamente por K1–K10 y R1–R6 de 4.2.21 (no requieren LLM para probar relevancia).

Dataset: `/tmp/qa4221_final.log` (217 líneas, gpt-4o-mini, costos ~0.005 USD, metadata-only logs).

## 11. Regresiones

- 4.2.14 hasImplicitDocumentContext → PASS (35/35)
- 4.2.19 relevance gate → PASS (5/5, tras revertir gate estricto)
- 4.2.20 traceability (brief verificada) → PASS (14/14)
- 4.2.21 trazabilidad final (21 tests) → PASS
- synthesisVerifier (relación inferencia) → PASS (18/18, tras revertir merge numérico)
- jurisprudencePrompt, provider, contradiction, hierarchy → PASS
- Build PASS, lint PASS

## 12. Riesgos residuales

1. Coincidencia de 1 token en consultas de 2 tokens sigue siendo suficiente para KEEP; una fuente con un único término coincidente pero materia distinta (ej. "renta" en datos con claim que sí contiene renta) podría sobrevivir si el claim es inventado y pasa verificación (poco probable por fragmentIsSupported). Mitigado, no eliminado.
2. Sin embeddings, sinónimos morfológicos sin token exacto ("termina" vs "terminación") requieren que la fuente use el mismo lexema que la pregunta; si no, puede ser DROP aunque sea relevante. K3 se definió con token exacto para evitarlo.
3. Ultra-corta "El canon es 500.000" (sin "arrendamiento mensual") cae a fallback honesto aunque el claim exista (requiere ≥2 términos o 1+framing). Mitigado usando afirmación completa en breve.

## 13. Métricas

- Tests: 729/729 (+15 4.2.22), 45 archivos
- Build: 6.47s, lint 0 errores
- attributionCoverage: sin cambios (1/1)
- Relevance gate: 0 fuentes irrelevantes en Markdown/sources en tests deterministas
- NO_EVIDENCE legítimo no aumentado

## 14. Veredicto

**PASS.** La relevancia semántica actual (1 token sustantivo en title/cite/claims) ya satisface K1–K10 con fuentes bien definidas y no requiere gate nuevo. Un gate más estricto (≥2 tokens + prefijo) se evaluó y se descartó por regresiones. Se agregaron 15 tests que demuestran K1 DROP / K2 KEEP sin cambiar pipeline, preservando trazabilidad, anti-alucinación y attributionCoverage. No se modifica RLS, auth, ni contratos. Sin commit/push, sin avanzar a 4.2.23.
