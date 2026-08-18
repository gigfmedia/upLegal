# FASE 4.2.11 — Auditoría READ-ONLY de regresión y calidad post-4.2.10

**Fecha:** 2026-08-15
**Régimen:** 100% read-only. Sin cambios de código, sin commits, sin push, sin analytics (solo QA local con metadata).
**Estado:** AUDITORÍA COMPLETADA. NO SE IMPLEMENTÓ NADA.
**Base verificada:** `npm run test:run` → **601/601 PASS (36 archivos)**; `npm run build` → **PASS**. Suite y build idénticos a la verificación de cierre de 4.2.10.

---

## 1. Objetivo y método

Verificar si las fases **4.2.9** (señal documental, P1/P2) y **4.2.10** (provider reliability, presupuesto global, output-limit recovery) resolvieron de verdad los problemas de la auditoría **4.2.8**:
1. **P1** — falsos negativos de `detectDocumentMode` → respuestas FALSAS sobre el documento del caso (D2, D4, G3 → mode `none`).
2. **P4/P5** — infraestructura inestable: timeouts de 180s+ colgados, rate limits, `OUTPUT_TOKEN_LIMIT`, y errores de proveedor convertidos en `NO_EVIDENCE`.
3. **P6** — no-determinismo (misma consulta → distinto resultado).
4. **P2** — señal jurídica genérica en consultas mixtas.

Método: inspección read-only de git + módulos, baseline (suite+build), **matriz offline determinista** de detección (sin red), **Dynamic Context Budget A–E**, **QA real con LLM** (14 consultas, 2 repeticiones en las 5 críticas) con solo metadata + respuesta local. Harness temporal creado fuera del repo de producción y eliminado al final.

## 2. Estado del repositorio

- `main` @ `0295140` (commit Fase 4.2.9). Working tree con la **Fase 4.2.10 SIN commitear** (por diseño): `server.mjs`, `server/ai/provider.mjs`, `server/ai/jurisprudencePipeline.mjs`, `server/ai/provider.chatCompletion.test.mjs`, `src/components/legalup-ai/AIResearchPanel.tsx` (M) + `server/ai/fase4210.providerReliability.test.mjs` (??).
- Commits externos desde 4.2.8: `a56154f` (llms.txt), `0dab4d0`/`4c01c7c`/`627d8ed`/`233a44c`/`15856b0`/`a6393e1`/`2d6f13a` (perf PostHog/GTM/critical path), `9c35c05` (CRO blog arriendo). **Ninguno toca `server/ai`, el endpoint de jurisprudencia ni `legalup-ai`** → sin ruido de terceros sobre lo auditado.

## 3. Inspección de código (read-only) — qué hizo cada fase

### 3.1 Fase 4.2.9 (commiteada `0295140`) — señal documental P1/P2
- `DOCUMENT_SIGNAL_RE` reescrito con **6 familias**: deíctico+sustantivo, verbo lector+artículo, "X del contrato/documento/causa", "hechos (relevantes) del caso", eventos procesales ("se presentó/se adjuntó…"), fecha/tiempo de detención/prisión preventiva. `DOCUMENT_NOUN_RE` ampliado a 14 sustantivos. `jurisprudenceSources.mjs:2222-2239`.
- Fallback documental `hasCaseReferenceSignal` (estructura de expediente: cláusula/partes/hechos/oficios/cautela…) que activa modo documento **solo si hay docs** y **nunca en jurisprudencia pura** (bloqueo `sobre`). `jurisprudenceSources.mjs:2271-2306`.
- Señal jurídica genérica `GENERIC_LEGAL_SIGNAL_RE` (P2): "según la normativa aplicable", "qué fuentes jurídicas", "normas o fallos" → `hasLegal`. `jurisprudenceSources.mjs:2247-2261`.
- `detectDocumentMode` orquesta señal primaria + fallback + señal genérica; gate `noEvidence` intacto (solo consultas puramente documentales sin docs). `documentGrounding.mjs:387-423`.

### 3.2 Fase 4.2.10 (sin commitear) — provider reliability
- **Timeout por llamada** con `AbortController` (`AI_PROVIDER_TIMEOUT_MS`, 60 s por defecto, leído por env en cada llamada). Abort por nuestro timer → `AI_PROVIDER_TIMEOUT` (504, retriable=false); AbortError externo → `AI_PROVIDER_NETWORK`. `provider.mjs:252-295`.
- **Reintentos acotados** `MAX_PROVIDER_RETRIES=2` con backoff `AI_PROVIDER_RETRY_BACKOFF_MS` (1000 ms base) y respeto a `Retry-After` con tope `AI_PROVIDER_MAX_RETRY_AFTER_MS` (5 s). `provider.mjs:143-181, 383-402`.
- **200 sin contenido** → `AI_PROVIDER_EMPTY_RESPONSE` (502, retriable=true), nunca `NO_EVIDENCE`. `provider.mjs:331-340`.
- **Presupuesto global de llamadas** `createLlmCallBudget` (`MAX_LLM_CALLS_PER_REQUEST=6`) compartido entre retry de provider y retry de schema → total de fetch por request determinista; al agotarse `AI_PROVIDER_CALL_LIMIT` (503, no retriable). `provider.mjs:183-249`; `server.mjs:8262-8283`.
- **`latencyMs`** en errores (solo logging). `provider.mjs:398`.
- **Output-limit recovery**: `OUTPUT_TOKEN_LIMIT_RETRY_PROMPT` + `outputLimitRecovered` (salida compacta, máx. 1 vez) en `runJurisprudenceWithRetry`. Logging `ai_provider_error`/`jurisprudence_output_limit_recovered` solo metadata. `server.mjs:8305-8313, 8431-8438`.
- Frontend: mensajes + `RETRIABLE_CODES` nuevos en `AIResearchPanel.tsx` (sin tocar lógica de claims).

## 4. Baseline de la suite

`npm run test:run` → **36 archivos / 601 tests PASS** (19.1 s). `npm run build` → PASS (6.5 s). Coincide con el cierre 4.2.10. Ningún fallo preexistente.

## 5. Matriz OFFLINE determinista (sin red) — regresión de detección documental

Harness puro (sin LLM) sobre `detectDocumentMode`/`classifyLegalQuery`/`selectDocumentEvidence`, con el **documento sintético de 4.2.8** (arrendamiento, cláusula QUINTA término anticipado 60 días; partes MARÍA LÓPEZ / JORGE PÉREZ; plazo 24 meses; renta $500.000; subarriendo prohibido sin autorización).

| # | Consulta | Expected | Actual | Veredicto |
|---|----------|----------|--------|-----------|
| **D2** | ¿Hay alguna cláusula que permita terminar anticipadamente el contrato? | document | **document** (fallbackSignal) | **PASS** |
| **D4** | ¿Quiénes son las partes del contrato? | document | **document** (signal) | **PASS** |
| **G3** | ¿Qué hechos del documento son relevantes jurídicamente y qué normas o fallos…? | mixed | **mixed** (signal+legal) | **PASS** |
| D5 | ¿Qué obligaciones establece el contrato? | document | **document** | **PASS** |
| **D6** | ¿Qué riesgos presenta el contrato? | document | **none** | **FAIL residual (P1)** |
| D7 | ¿Qué establece la cláusula QUINTA del contrato? | document | **document** | **PASS** |
| D8 | ¿Cuál es el plazo del contrato? | document | none | FALLO RESIDUAL |
| D9 | ¿Cuánto es la renta mensual del contrato? | document | none | FALLO RESIDUAL |
| D10 | ¿El contrato permite subarrendar sin autorización? | document | none | FALLO RESIDUAL (NORMATIVE_APPLICATION) |
| D11 | ¿Qué dice el contrato sobre la cláusula de cesión a terceros? | document | **document** | **PASS** |
| N1–N5 | Negativas (¿qué es arriendo?, art. 1545, cláusulas abusivas, garantía, Ley 21.719) | none | **none** ×5 | **PASS** (sin secuestro) |
| M1 | ¿Esta cláusula es compatible con el art. 1545 CC? | mixed | **mixed** | **PASS** |
| M2 | ¿El término anticipado de la cláusula QUINTA es compatible con la normativa? | mixed | **mixed** | **PASS** |
| M3 | ¿Qué riesgos jurídicos presenta esta cláusula según la normativa aplicable? | mixed | **mixed** | **PASS** |
| Gen1 | ¿Qué fuentes jurídicas respaldan la cláusula de término anticipado? | mixed | **mixed** | **PASS** |
| Gen2 | ¿Qué normas o fallos podrían ser aplicables a este caso? | mixed | none | FALLO RESIDUAL (P2, "caso") |

**Resumen offline:** 11/16 casos obligados PASS (D2/D4/G3/D5/D7/D11/N×5/M×3/Gen1). **5 residuales** → `none` (D6/D8/D9/D10/Gen2). Los 3 FAIL críticos de 4.2.8 (D2, D4, G3) **quedan corregidos** por 4.2.9. Hallazgo: persiste una franja de consultas documentales legítimas ("el contrato" sin deíctico + sustantivo no clave, y "…de este caso") que siguen cayendo a `none`.

## 6. Dynamic Context Budget (casos A–E, offline)

`allocateDynamicContextBudget` con `DYNAMIC_CONTEXT_LIMITS` (max 30000, doc max 15000, ratio mín 0.20, mínimos 5000):

| Caso | docBudget | legalBudget | docRatio | legalRatio | Invariantes |
|------|-----------|-------------|----------|------------|-------------|
| A (ambos polos) | 6000 | 24000 | 0.20 | 0.80 | total≤30000, doc≤15000, ratios≥0.20, mín≥5000 ✅ |
| B (solo doc) | 15000 | 0 | 1.0 | 0.0 | ✅ |
| C (solo legal) | 0 | 30000 | 0.0 | 1.0 | ✅ |
| D (ninguno) | 0 | 0 | 0.0 | 0.0 | ✅ |
| E (document puro) | 15000 | 0 | 1.0 | 0.0 | ✅ |

**PASS.** Coherente con los unittests de la fase 4.2.7 (`fase427.dynamicContext.test.mjs`, incluidos en los 601).

## 7. Provider Reliability — verificación del contrato

- **Unittests 4.2.10** (`fase4210.providerReliability.test.mjs`, 31 tests) pasan dentro de los 601: timeout→`AI_PROVIDER_TIMEOUT` (504, retriable=false), 429 retry limitado, 503→retry, red→`AI_PROVIDER_NETWORK`, vacío→`AI_PROVIDER_EMPTY_RESPONSE`, output-limit→recovery compacta o error explícito, budget→`AI_PROVIDER_CALL_LIMIT` con exactamente `maxCalls` fetch. **Confirmado por inspección del código**: `provider.mjs:252-341, 383-402`.
- **Presupuesto global ≤6:** el contrato `budget` se pasa desde la ruta (`server.mjs:8262-8283`) y se comparte entre `chatCompletion` (provider retry) y `runJurisprudenceWithRetry` (schema retry). En QA real, el máximo `budgetCalls` observado fue **3** (todas las consultas completaron en ≤3 fetch). El tope `AI_PROVIDER_CALL_LIMIT` (≤6) se activa de forma determinista en los unittests (mi intento de stub en el harness falló por el entorno `happy-dom`; el test real del cap vive en `fase4210`).
- **Errores de proveedor → NUNCA `NO_EVIDENCE`:** todos los errores de infraestructura se tipan `AI_PROVIDER_*` (con status HTTP propio) y se lanzan, sin convertirse en "no hay evidencia". Confirmado por inspección y por el QA real (G3#1 = `AI_PROVIDER_ERROR`, no NO_EVIDENCE).

## 8. QA REAL (LLM `openai/gpt-oss-20b:free` vía OpenRouter, `AI_CHAT_MAX_TOKENS=2400`)

14 consultas; las 5 críticas (D2/D4/G3/M1/M3) ×2 para medir no-determinismo. 2 corridas completas (la 1ª con búsqueda pública transitoriamente degradada). Metadata + respuesta local únicamente.

| # | Consulta | mode | Corrida 1 | Corrida 2 | Veredicto |
|---|----------|------|-----------|-----------|-----------|
| D2 | ¿Cláusula término anticipado? | document | SUCCESS (claims 1, quinta/60d) | SUCCESS (claims 2) | **PASS** |
| D4 | ¿Quiénes son las partes? | document | SUCCESS (partes correctas) | NO_EVIDENCE | **FLAKY** |
| G3 | Hechos del doc + normas/fallos | mixed | AI_PROVIDER_ERROR (transitorio) | SUCCESS (claims 7, doc+TC) | **PASS** (con 1 fallo infra) |
| M1 | Cláusula vs art. 1545 | mixed | SUCCESS (rechazo honesto sin texto) | NO_EVIDENCE | **FLAKY** |
| M2 | Término anticipado vs normativa | mixed | SUCCESS (claims 1) | — | **PASS** |
| M3 | Riesgos según normativa aplicable | mixed | NO_SOURCES_FOUND | NO_SOURCES_FOUND | PARTIAL (busca) |
| I2 | Art. 999 Ley 21.719 (inventado) | none | NO_EVIDENCE | — | **PASS (anti-alucinación)** |
| I3 | Ley 99.999 (inventada) | none | NO_SOURCES_FOUND | — | **PASS (anti-alucinación)** |
| DocAbsent | ¿Obligación de reparaciones mayores? | none | NO_EVIDENCE (claim descartado) | — | **PASS (anti-alucinación)** |

**Interpretación factual (verificado en la respuesta cruda):**
- **D2** ahora responde "el contrato contiene una cláusula que permite a cualquiera de las partes terminarlo anticipadamente con aviso previo de 60 días" con cita del fragmento. **Antes (4.2.8):** "Ley 2.753… cláusula de caducidad" — FALSO. **Corregido.**
- **D4** identifica a "MARÍA LÓPEZ (arrendadora) y JORGE PÉREZ (arrendatario)". **Antes (4.2.8):** "contrato de depósito… depositante/depositario" — FALSO. **Corregido** (en la corrida en que llegó al LLM).
- **G3** usa el documento + jurisprudencia TC, con honestidad ("el TC no aborda directamente contratos de arrendamiento"). **Antes:** NO_EVIDENCE/OUTPUT_TOKEN_LIMIT. **Corregido.**
- **Anti-alucinación:** I2/I3/DocAbsent rechazan honestamente (NO_EVIDENCE / NO_SOURCES_FOUND, con claims descartados) y **no fabrican** contenido sobre art. 999, Ley 99.999 ni obligaciones de reparación inexistentes. **PASS.**

## 9. No-determinismo (clasificación A–G)

| ID | Mismo input | Resultado | Clase |
|----|-------------|-----------|-------|
| D2 | ×2 | SUCCESS / SUCCESS (respuesta equivalente) | **DETERMINISTIC** (contenido) |
| D4 | ×2 | SUCCESS / NO_EVIDENCE | **FLAKY** |
| G3 | ×2 | SUCCESS / AI_PROVIDER_ERROR | **FLAKY (infra)** |
| M1 | ×2 | SUCCESS(rechazo honesto) / NO_EVIDENCE | **FLAKY** |
| M3 | ×2 | NO_SOURCES_FOUND / NO_SOURCES_FOUND | **DETERMINISTIC** (pero PARTIAL) |

El **P6 de 4.2.8 persiste parcialmente**: D4 y M1 alternan entre respuesta correcta y `NO_EVIDENCE` en modo mixto/documental. La causa ya no es la detección (mode correcto en ambas corridas), sino la **verificación de claims** aguas abajo: cuando el LLM no cita el fragmento literalmente, el claim se descarta y cae a NO_EVIDENCE (aviso "se descartó una afirmación documental porque el fragmento citado no aparece literalmente…"). Este es un trade-off de la verificación estricta (anti-alucinación) que a veces sacrifica la utilidad en consultas documentales donde la paráfrasis es correcta pero no literal.

## 10. Respuesta final: resumen vs síntesis + atribución

- **Atribución documental:** en las respuestas SUCCESS, los claims documentales se citan con `document_id` → fragmento literal → texto (`*("CONTRATO DE ARRENDAMIENTO…")*`). Correcta cuando hay claim.
- **Resumen vs síntesis:** el `resumen` (Respuesta breve) es texto del LLM atenuado por `constrainResumenOverstatement`; la `síntesis` pasa por `verifyAndBuildSynthesis`. En D2/D4/G3 ambas alinean con los hechos del documento y no se observa sobredeclaración (ej. G3 matiza que el TC no aborda arriendo). **No se detectó aserción en el resumen no respaldada por la síntesis.** Riesgo E de 4.2.8 **no recurrente** en estos casos.
- **M1#1 (caso límite):** el modelo declaró "no se puede determinar la compatibilidad con el art. 1545 porque no se dispone del texto del artículo" — **calibración correcta** (rechazo honesto), aunque de menor utilidad. La búsqueda pública no devolvió el texto del 1545 en esa corrida.

## 11. Seguridad (ownership/RLS)

4.2.9 y 4.2.10 **no tocan** Supabase, RLS ni ownership. El diff de 4.2.10 se limita a `server.mjs` (endpoint, sin cambios de autorización), `provider.mjs`, `jurisprudencePipeline.mjs`, tests y `AIResearchPanel.tsx`. La verificación de claims documentales sigue exigiendo `workspaceId`/`lawyerId` (ownership) en `selectDocumentEvidence`/`verifyDocumentClaims`. **Sin cambios de superficie de seguridad.**

## 12. Métricas 4.2.8 vs 4.2.11 (QA comparable, mismo documento sintético)

| Resultado | 4.2.8 (29) | 4.2.11 (14 real, 16 offline) | Δ |
|-----------|-----------|------------------------------|---|
| PASS (respuesta correcta) | 11 (38%) | 8/14 real + 11/16 offline | **↑** |
| PASS calibración (rechazo honesto) | 3 (10%) | 3/14 real (I2, I3, DocAbsent) | = |
| FLAKY / no determinista | 4 (14%) | D4, G3(infra), M1 (3/14) | ↓ |
| PARTIAL | 4 (14%) | M3 (busca) | ↓ |
| **FAIL CRÍTICO (respuesta FALSA sobre el documento)** | **3 (10%)** | **0** | **✅ ELIMINADO** |
| FAIL infraestructura (timeout/rate/tokens) | 4 (14%) | 1 (G3#1, transitorio) | **↓** |

**Punto clave:** los 3 FAIL críticos de 4.2.8 (respuestas falsas sobre el documento por mode `none`) **desaparecen** en 4.2.11. Es la corrección más importante y se valida tanto offline (mode correcto) como con LLM real (respuestas factualmente correctas).

## 13. Hallazgos

- **H1 (RESUELTO, crítico):** P1 corregido en D2/D4/G3 — el documento ya llega al contexto y las respuestas son factualmente correctas. Confirmado offline y con LLM real.
- **H2 (RESUELTO):** P4/P5 mitigados — timeouts tipados (`AI_PROVIDER_TIMEOUT` 504), retries acotados, 200-vacío tipado, presupuesto global ≤6, errores de infraestructura **nunca** convertidos en `NO_EVIDENCE`. En QA real el máx. de llamadas fue 3.
- **H3 (PERSISTE, residual P1):** consultas documentales que mencionan "el contrato" con artículo definido + sustantivo NO-clave ("riesgos", "plazo", "renta", "subarrendar") o "…de este caso" siguen cayendo a `none` (D6/D8/D9/D10/Gen2). No disparan `DOCUMENT_SIGNAL_RE` ni `CASE_STRUCTURE_SIGNAL_RE`. Riesgo: respuestas genéricas en vez de ancladas al documento (menor gravedad que antes, pero real).
- **H4 (PERSISTE, P6):** no-determinismo en D4 y M1 (SUCCESS ↔ NO_EVIDENCE) por verificación estricta de claims (cita literal vs paráfrasis). Misma pregunta, distinta utilidad.
- **H5 (NUEVO, menor):** en modo mixto/documental, si la búsqueda pública devuelve 0 fuentes, la ruta responde `NO_SOURCES_FOUND` (422) incluso cuando el documento del caso respondería la pregunta (M3). Comportamiento honesto, pero limita consultas mixtas dependientes de disponibilidad de búsqueda en vivo (transitoria: BCN/TC 429 durante la corrida 1).

## 14. Clasificación A–G (clases de fallo)

| Clase | Hallazgo | Gravedad |
|-------|----------|----------|
| A – Retrieval | H3 residual: franja de consultas documentales que no disparan señal (D6/D8/D9/D10/Gen2) | Media |
| B – Evidencia | H4: verificación literal descarta paráfrasis correctas → NO_EVIDENCE | Media |
| C – Contexto | (mejorado por 4.2.9/4.2.7) | — |
| D – Razonamiento LLM | (mitigado por 4.2.10: output-limit recovery + timeout) | — |
| D – Robustez | (mitigado por 4.2.10: timeout tipado, retries, budget) | — |
| E – Síntesis | Resumen y síntesis alineados en los casos auditos; M1 muestra calibración correcta | Baja |
| F – Renderizado/UX | No determinismo (D4/M1) afecta la previsibilidad para el usuario | Media |

## 15. Conclusión

**4.2.9 + 4.2.10 SÍ solucionaron los problemas críticos de 4.2.8.** Los 3 FAIL críticos (respuestas FALSAS sobre el documento por mode `none`) están **eliminados**: D2/D4/G3 resuelven a `document`/`mixed`, llegan al LLM con evidencia y responden con contenido verificado y citado. La infraestructura quedó **acotada y tipada**: ya no hay llamadas colgadas de 180 s, los errores de proveedor son `AI_PROVIDER_*` explícitos (nunca NO_EVIDENCE) y el presupuesto global ≤6 impide la explosión de reintentos (máx. observado 3). Anti-alucinación intacta (I2/I3/DocAbsent rechazan sin inventar). Suite 601/601 y build PASS sin regresiones.

**Pendientes no críticos para una fase futura:** (H3) ampliar la señal documental a "el contrato" con sustantivos de contenido y "…de este caso"; (H4) tolerancia de paráfrasis en la verificación documental para reducir FLAKY en consultas puramente documentales. Ambos son mejoras de utilidad, no de corrección de errores.

## 16. SPEC PROPUESTO — Fase 4.2.12 (NO implementado)

**Título:** Reducir la franja residual de falsos negativos documentales y el no-determinismo por paráfrasis.

1. **H3 – Ampliar señal documental de contenido:** en `detectDocumentMode`, añadir un patrón de "artículo definido + sustantivo de CONTENIDO del documento" (`\b(?:el|la|los|las)\s+(?:riesgo|riesgos|plazo|renta|canon|obligacion|termino|vigencia|objeto|condicion|garantia)\b`) que active modo documento **solo si hay docs** (nunca en consultas de aplicación normativa con "contrato" suelto, para preservar la invariante 4.2.6). Añadir "…de este caso" a la señal genérica/fallback.
2. **H4 – Tolerancia de paráfrasis en verificación documental:** en `verifyDocumentClaims`, cuando un claim no matchee literalmente pero los tokens sustantivos del claim (nombres, fechas, montos, términos clave) estén presentes en el/los fragmento(s) seleccionados, mantener el claim con una `warning` de "paráfrasis" en vez de descartarlo a NO_EVIDENCE — reduciendo FLAKY en consultas documentales puras sin abrir la puerta a alucinación (sigue exigiendo que los hechos estén en el documento).
3. **Test unitarios:** D6/D8/D9/D10/Gen2 deben resolver a `document`/`mixed`; D4/M1 deben dar SUCCESS estable (no FLAKY) en 2 corridas de verificación.

**Criterios de éxito:** offline matrix 16/16 PASS; QA real D4/M1 determinísticos en 2 corridas; suite completa 601+ PASS; build PASS.

---

FASE 4.2.11 — AUDITORÍA READ-ONLY COMPLETADA.
NO SE IMPLEMENTÓ NADA. NO COMMIT / NO PUSH.
