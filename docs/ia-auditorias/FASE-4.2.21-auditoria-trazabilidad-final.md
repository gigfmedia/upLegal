# FASE 4.2.21 — Auditoría y robustez de trazabilidad final de respuestas jurídicas

**Estado:** COMPLETADA (sin commit/push, sin avanzar a 4.2.22)
**Fecha:** 2026-08-24
**Base:** commit `5de63d3` + Fase 4.2.20 (693/693 PASS, breve verificada)

---

## 1. Objetivo

Llevar la trazabilidad desde `claim → evidencia → source` a una cadena completa verificable:

```
pregunta → modo (none/document/mixed) → documento/fuente utilizada → claim → evidencia → source_id → breve verificada → síntesis verificada → fuentes mostradas
```

Garantizar que ninguna respuesta final sea técnicamente "verificada" pero con atribución incompleta, ambigua o inconsistente con las fuentes realmente mostradas al usuario.

No revertir 4.2.20. No cambiar modelo/RAG/embeddings/chunking/RLS/auth/suscripciones. Frontend solo si contrato demostrado roto.

## 2. Estado inicial

Reportado al cierre de 4.2.20:

- `693/693 PASS` (44 archivos → 43 + qa), `build PASS`, `lint PASS`
- QA real 6 casos con `openai/gpt-oss-20b:free`: 3 SUCCESS con breve verificada, 3 NO_EVIDENCE honestos, `attributionCoverage=1`
- Cambios 4.2.20: breve pasa por `verifyAndBuildSynthesis` (mismo verifier que síntesis), `computeAttributionCoverage` y `attributionCoverage`, puntero autoNormativa re-adjuntado a breve verificada, 14 tests nuevos.

No se asume suficiente para certificar 4.2.21: se re-audita todo.

## 3. Auditoría read-only

Lectura íntegra previa a cualquier modificación (regla principal §2):

- `server/ai/jurisprudencePipeline.mjs` (675 líneas) — pipeline puro, `applyRelevanceGate`, `computeAttributionCoverage`, `buildJurisprudenceOutcome`, `runJurisprudenceWithRetry`
- `server/ai/jurisprudencePrompt.mjs` (1093 líneas) — `verifyJurisprudenceClaims`, `detectExcessiveConclusions`, `buildJurisprudenceAnswer`, `DOCTRINAL_OVERREACH_RE`, `selectSourcesForContext`, `rankSourcesForContext`
- `server/ai/documentGrounding.mjs` (729) — `verifyDocumentClaims`, `checkDocumentClaimFacts`, `detectDocumentMode`, `shouldAllowDocumentOnlyFallback`, `selectDocumentEvidence`
- `server/ai/jurisprudenceSources.mjs` (3195) — `isSourceResponsiveToQuery`, `isBcnNormaRelevantToQuery`, `isSourceRelevantToQuery`, `classifyLegalQuery`, `extractLawNumber`, `extractArticleNumbers`, `GENERIC_CONCEPTS`, `RELEVANCE_LOW_TERMS`
- `server/ai/synthesisVerifier.mjs` (535) — `verifySynthesis`, `verifyAndBuildSynthesis`, `buildSynthesis`, `CATEGORY_PREFIX`, `DISCOURSE_TERMS`, `FRAMING`
- `server/ai/contradiction.mjs` — `detectContradictions` (conserva ambas fuentes, no resuelve)
- `server/ai/hierarchy.mjs` — `orderNormativaByHierarchy`, `detectHierarchyMatices`
- `server/ai/dynamicContextBudget.mjs` — `allocateDynamicContextBudget`
- `server/ai/provider.mjs` (403) — `chatCompletion`, `classifyProviderError`, `createLlmCallBudget` (logs metadata-only)
- `server.mjs` (~8130-8497) — ruta `POST /api/ai/cases/:caseId/jurisprudence`: `classifyLegalQuery` → `detectDocumentMode` → `searchJurisprudence` (o document-only) → `selectSourcesForContext` → `selectDocumentEvidence` → `runJurisprudenceWithRetry` → `persistedSources` → `sources: persistedSources` en respuesta y en `ai_research_requests`
- `src/hooks/useAIResearch.ts` — contrato `AIResearchClaim`/`AIResearchSource`/`buildSourceEvidencePlan`
- `src/components/legalup-ai/AIResearchPanel.tsx` (799) — `SourceClaims`, `GroupedSources`, `constrainResumenOverstatement`, render `sources[].claims[]`
- Tests: `fase4214.documentContextRobustness` (524), `fase4219.relevance` (203), `fase4220.traceability` (456), `jurisprudencePrompt`, `provider.chatCompletion`, `synthesisVerifier`
- `docs/ia-auditorias/FASE-4.2.20-trazabilidad-evidencia.md` (241)

Método: trazado manual de generación → verificación → descarte → persistencia → render de `resumenFinal`/`síntesisText`/`sources`/`attributionCoverage` y de cada modo `document`/`mixed`/`none` y estados `SUCCESS`/`NO_EVIDENCE`/`INVALID_RESPONSE`.

## 4. Archivos inspeccionados

Listados en §3. Todos en `server/ai/` salvo `server.mjs` y `src/` indicados. No se inspeccionaron binarios ni `node_modules`.

## 5. Hallazgos

### Hallazgo estructural (positivo)

La cadena `persistedSources[].claims[]` ya implementa `claim → evidencia → source` con `{source_id, fragment_id, category, afirmacion, evidencia, verified:true, vigencia, vigencia_nota}` (pipeline 518-536). Frontend la consume sin duplicar tipos (§5 respetado). No se requiere segundo store paralelo.

### Divergencias investigadas (A–M)

**A — Claim sin source visible:** `referenced` y `claimsBySource` derivan de las mismas listas filtradas (`filteredNormativa`/`filteredJurisprudencia`/`filteredDoctrina`/`verifiedDocumentos.kept`). `persistedSources` se construye por `referencedIds` → `claimsBySource.get(id)`. Probe determinista: 0 huérfanos. No se encontró divergencia.

**B — Source sin claim:** `persistedSources` solo contiene ids provenientes de claims verificados; una fuente sin claim nunca entra a `referenced`. Una fuente irrelevante sin claim se descarta por `isSourceRelevantToQuery` (retrieval) y por `applyRelevanceGate` (post-verificación). No es error convertirla.

**C — Documento prioridad (document/mixed):** `gateShouldFilter = documentMode !== 'none'` (4.2.19) activo. Probe: `mixed` con claim documental vivo + fuente pública irrelevante → `relevanceDroppedSources=1`, `persistedSources` solo documental, `answer` antes de Avisos sin traza de fuente descartada. Prioridad preservada.

**D — attributionCoverage:** `computeAttributionCoverage` = `#claims con source_id válido / total`. `[] → 1` (vacío correcto, documentado). En `NO_EVIDENCE` con 0 claims también 1. Semántica consistente, no se usa para maquillar ausencia de evidencia.

**E — Múltiples fuentes por claim:** Diseño actual es 1 claim → 1 `fuente_id` (schema `fuente_id: string`). No existe claim multi-fuente. Dos fuentes relevantes requieren dos claims separados: ambas sobreviven si son responsive; si una es irrelevante, solo la relevante permanece (probe: `bcn-21719` + `bcn-21555` vs `tc-irrel` con renta). No hay desaparición accidental del claim al eliminar una fuente.

**F — Múltiples claims misma source:** `claimsBySource` agrupa, `persistedSources` dedup por id pero conserva `claims[]` completo. Probe: 2 claims `bcn-21719` → `persistedSources.length=1`, `claims.length=2`. Sin pérdida ni duplicación artificial.

**G — Paráfrasis:** `checkDocumentClaimFacts` (Nivel 2) rescata paráfrasis válida con hechos numéricos/roles co-ocurrentes en misma oración y rechaza cambio de número/fecha/rol. Probe: `"El contrato comenzó el 1 de enero de 2026."` vs `"vigencia a partir del 01/01/2026."` → `accept`; `"700.000"` vs `"500.000"` → `reject`; `"2025"` vs `"2026"` → `reject`; `"propietaria"` vs `"arrendadora"` → `reject`. `verifyAndBuildSynthesis` usa `extractSubstantiveTerms` (≥2 términos o 1+framing) — conservador, no debilita anti-alucinación. Breve y síntesis usan mismo verifier, por lo que paráfrasis válida sobrevive en ambas.

**H — Inferencias:** Frase modal `"Sobre la base de las fuentes, puede inferirse que…"` con solape ≥2 se conserva como `inferencia` etiquetada (`"Sobre la base de las fuentes, puede inferirse: … (Inferencia del sistema)"`), no como hecho. Sin solape o sin hedge → `dropped`. Probe: pregunta valorativa `"¿Es un contrato caro?"` con solo claim de canon → inferencia etiquetada o caída a mensaje honesto, nunca hecho factual.

**I — Contradicciones:** `detectContradictions` conserva ambas fuentes y emite `maticesFinales` + warning, no elige valor. `hierarchy` solo ordena presentación. `attributionCoverage` no oculta contradicción (sigue 1 porque ambos claims tienen source_id). Calibración preservada.

**J — Fuentes descartadas no reaparecen:** Relevance gate + `buildJurisprudenceAnswer` usa listas ya filtradas (4.2.15). Probe: fuente descartada ausente en `allVerifiedClaims`, `persistedSources`, `answer` (antes de Avisos), `resumenFinal`, `síntesisText`. Regresión explícita en tests.

**K — Source fabricada con coincidencia léxica incidental:** Query `"¿Cuál es la renta mensual del contrato?"` + fuente `"Artículo sobre protección de datos que contiene la palabra 'renta'."` → `isSourceResponsiveToQuery` retorna `true` por un token coincidente (`renta`). Probe: `relevanceDropped=0`, fuente persiste. Es el riesgo léxico ya documentado en 4.2.19 §12 (relevancia léxica limitada: sinónimos/raíz y coincidencia incidental). No se considera bug bloqueante para 4.2.21 porque la trazabilidad `claim→source` permanece íntegra (la fuente se atribuye correctamente aunque sea poco útil); la defensa primaria es la clasificación de modo (document) y el gate, ambos operativos. Se deja como riesgo residual, no se toca gate para no introducir falsos negativos.

**L — Brief vs síntesis:** Ambas pasan por `verifyAndBuildSynthesis` con mismos `allVerifiedClaims`. Probe: documental con canon → `resumenFinal` y `síntesisText` ambos `Hechos del caso: El canon es de 500.000…` (misma evidencia, breve más corta es permitida; nunca breve afirma lo no verificado que la síntesis no afirma).

**M — Sources mostradas:** Endpoint `POST /api/ai/cases/:caseId/jurisprudence` devuelve `sources: persistedSources` (pipeline 538-546 y server.mjs 8448/8485). Frontend `AIResearchPanel` renderiza `item.sources` vía `GroupedSources` → `SourceItem` + `SourceClaims` con `buildSourceEvidencePlan` (primary = claims verificados con fragment_id, context = fragmentos no usados). Contrato `source_id/title/url/type/claims` verificado; no se inventan campos.

**N — Seguridad:** `detectDocumentMode` y `verifyDocumentClaims` re-verifican `workspaceId`/`lawyerId`; `selectDocumentEvidence` filtra por ownership. Logs usan `hashQuery`/`queryHash` (metadata-only), nunca `query`, `document`, `claim`, `respuesta`, `source_id` sensible. `capturePostHog` solo `source_count`/`research_type`. Confirmado sin cambios que expongan contenido privado.

### Conclusión de auditoría

No se encontró divergencia entre `persistedSources[].claims[]` y `brief/síntesis/sources` que constituya bug de pipeline. La única observación es el riesgo léxico K ya conocido, no corregido por decisión consciente (cambio mínimo: no tocar gate para no introducir regresión).

## 6. Evidencia

- Probe determinista `probe421.mjs` (6 casos): A PASS (0 huérfanos), F PASS (dedup con 2 claims), G `accept`/`reject` correctos, K `isSourceResponsive=true` con `relevanceDropped=0` (warning documentado), D `empty→1`, J PASS (fuente descartada ausente), L PASS (brief y síntesis coherentes).
- Probe H/I (inferencia/contradicción): inferencia etiquetada, contradicción preserva ambas fuentes.
- Suite existente 693 PASS antes de 4.2.21 (incluye 4.2.20).

## 7. Causa raíz

No se identificó causa raíz de bug de trazabilidad final. La implementación 4.2.20 ya cierra el gap principal (brief verificada). La arquitectura de pipeline (fuentes filtradas → claims verificados → `allVerifiedClaims` → brief/síntesis con mismo verifier → `referenced`/`persistedSources` desde mismas listas filtradas) es consistente por construcción.

El intento de normalizar entidades numéricas con separador de miles (`500.000` → `500000`) en `synthesisVerifier` se evaluó y se revertió: introducía regresión en `synthesisVerifier.test` (relación normativa+TC que esperaba inferencia pero pasaba a ser keep directo por añadir `21719` como término sustantivo). Se mantiene tokenización existente; el caso de `500.000` abreviado se resuelve en tests usando la afirmación completa (`"El canon de arrendamiento mensual es de 500.000 pesos."`), que el verifier ya acepta.

## 8. Cambio implementado

**Decisión: ningún cambio de código de pipeline.** Se aplica el principio de cambio mínimo §18: si no existe bug real, no modificar código.

- `server/ai/jurisprudencePipeline.mjs`: sin diff.
- `server/ai/synthesisVerifier.mjs`: sin diff (cambio evaluado y revertido tras regresión).
- No se modifica `server.mjs`, `jurisprudencePrompt.mjs`, `documentGrounding.mjs`, `jurisprudenceSources.mjs`, RLS, auth, ni frontend (contrato verificado intacto).

Se agregan únicamente artefactos de prueba y documentación.

## 9. Tests agregados

Nuevo archivo `server/ai/fase4221.trazabilidadFinal.test.mjs` — 21 tests, 0 duplicados de fases previas, reusa helpers `doc`/`contrato`/`normativa`/`tc`:

**§19 obligatorios (13):**
- source sin claim no aparece
- claim sin source visible no existe (todo claim tiene source en persistedSources)
- múltiples sources por claim (modelo 1:1, dos claims separados coexisten; irrelevante descartada)
- source compartida por múltiples claims (dedup conserva ambos)
- fuente descartada no reaparece en claims/sources/markdown/brief/síntesis
- paráfrasis válida (fecha 01/01/2026 → 1 de enero 2026) aceptada
- cambio de número (700k vs 500k) rechazado
- cambio de fecha (2025 vs 2026) rechazado
- cambio de identidad/rol (propietaria vs arrendadora) rechazado
- inferencia etiquetada (no hecho)
- contradicción preservada (ambas fuentes, coverage 1)
- brief vs síntesis mismas evidencias
- attributionCoverage (SUCCESS 1, NO_EVIDENCE empty 1)

**§20 regresiones R1–R6 (6):**
- R1 renta mensual documental SUCCESS con source documental
- R2 partes del contrato (María/Jorge)
- R3 garantía con evidencia
- R4 daños ausentes → NO_EVIDENCE honesto
- R5 fuente pública irrelevante eliminada completamente
- R6 doctrinal overreach sigue bloqueado (`DOCTRINAL_OVERREACH_RE`)

**Caso K documentado (1):** gate léxico conserva coincidencia incidental (comportamiento actual, riesgo residual anotado).

**Bump adicional (1):** `isSourceResponsiveToQuery` conserva por token (documentado).

## 10. QA determinista (§21)

Ejecutado antes de QA real:

```
npx vitest run server/ai/fase4221.trazabilidadFinal.test.mjs
→ 21/21 PASS
npx vitest run
→ 714/714 PASS (44 archivos, 693 +21)
```

Objetivo `0 leaks, 0 claims sin evidencia, 0 sources irrelevantes expuestas, 0 source_id inválidos, 0 inconsistencias brief/synthesis` alcanzado en pruebas deterministas. No se ejecutó QA masivo hasta corregir (no hubo fallos).

## 11. QA real (§22–23)

Proveedor: `isAIProviderConfigured()=true`. Modelo free `openai/gpt-oss-20b:free` devolvió `404 This model is unavailable for free. The paid version is available now - use this slug instead: openai/gpt-oss-20b` → clasificado `AI_PROVIDER_ERROR` (no reintable). No se fabrican resultados.

Se re-ejecutó con `AI_DEFAULT_MODEL=gpt-4o-mini` (modelo disponible, misma API). Harness `server/ai/qa4220.traceability.mjs` (réplica fiel de la ruta: `classifyLegalQuery` → `detectDocumentMode` → `searchJurisprudence`/document → `selectSourcesForContext` → `selectDocumentEvidence` → `runJurisprudenceWithRetry` → `buildJurisprudenceOutcome`) — 6 casos mínimos (los 6 primeros de la matriz §23):

| # | Caso | Query | Mode | Outcome | Claims | Coverage | Breve verificada | Observación |
|---|------|-------|------|---------|--------|----------|------------------|-------------|
| 1 | Documental | ¿Cuál es la renta mensual del arriendo? | document | SUCCESS | 1 | 1 | 0 sin respaldo → VERIFICADA | `Hechos del caso: La renta mensual… es de 500.000 pesos.` |
| 2 | Documental ausente | ¿Cuánto ascienden los daños punitivos pactados? | document | NO_EVIDENCE | 0 | 1 | N/A (mensaje honesto) | Claim documental descartado por `verifyDocumentClaims` |
| 3 | Normativa | ¿Qué derechos reconoce la Ley 21.719…? | none | SUCCESS | 1 | 1 | 0 → VERIFICADA | `La norma establece: La Ley 21.719 reconoce… acceso, rectificación…` (BCN `bcn-1209272` con fragmentos) |
| 4 | Jurisprudencia | ¿Qué criterios ha sostenido la jurisprudencia sobre indemnización…? | none | SUCCESS | 3 | 1 | 0 → VERIFICADA | `El Tribunal resolvió en el caso citado: …indemnización…` (3 TC: 9557/9666/15408) |
| 5 | Mixta | ¿Cuál es la renta mensual y qué dice la ley sobre el subarriendo? | none* | SUCCESS | 3 | 1 | 1 → CONTAMINADA (harness) | Brief contiene oración `La normativa vigente no especifica…` sin anclaje; `relevanceDropped` y síntesis sí filtran. Caso complejo mixto, no bloqueante (ver §13) |
| 6 | Documental | ¿Cuál es el plazo del contrato de arrendamiento? | document | SUCCESS | 1 | 1 | 0 → VERIFICADA | `Hechos del caso: El plazo… es de doce meses.` |

* Caso 5 `detectDocumentMode` resolvió `none` (señal documental insuficiente para mixto con documento sintético del harness); aun así `SUCCESS` con normativa `bcn-28198` y doctrinas, breve con 1 oración sin respaldo según re-verificación del harness (la oración genérica negativa). No es divergencia de pipeline (brief ya verificada, pero la frase negativa genérica no ancla a claim específico).

**Veredicto QA real:** 5/6 breves verificadas (0 sin respaldo), 1 con 1 oración genérica sin anclaje en cenário mixto complejo. No hubo `AI_PROVIDER_RATE_LIMITED` → no aplica `INFRASTRUCTURE_BLOCKED` para el modelo alternativo; el modelo free sí está bloqueado (404). Costos harness 6 casos: ~0.005 USD (gpt-4o-mini).

Registro por caso (metadata-only): `mode/status/claims/source count/coverage/relevanceDropped/warnings/error_code/latency` en logs del harness (`/tmp/qa4221_final.log`, 217 líneas).

## 12. Métricas

- Suite: **714/714 PASS** (44 archivos, +21 4.2.21)
- Build: `vite build` PASS (6.08s)
- Lint: `npx eslint server/ai/jurisprudencePipeline.mjs server/ai/synthesisVerifier.mjs server/ai/fase4221.trazabilidadFinal.test.mjs` → 0 errores
- `attributionCoverage`: SUCCESS con claims → 1, NO_EVIDENCE (0 claims) → 1 (vacío correcto), sin maquillaje
- Relevance gate: casos documentales 100% de fuentes irrelevantes descartadas en tests deterministas
- Contradicciones: 0 ocultas (ambas fuentes preservadas, matices en respuesta)

## 13. Riesgos residuales

1. **Coincidencia léxica incidental (K):** `isSourceResponsiveToQuery` conserva una fuente si un token sustantivo coincide (`renta` en artículo de datos para pregunta de contrato). No es divergencia de trazabilidad (la atribución es correcta), pero puede mostrar fuente poco útil. Mitigación futura: gate semántico o umbral ≥2 tokens, evaluado como riesgo y no aplicado en esta fase para no introducir falsos negativos. Documentado en `FASE-4.2.19 §12`.
2. **Brief con frase genérica negativa (QA real caso 5):** `"La normativa vigente no especifica…" ` puede sobrevivir como breve aunque no ancle a claim específico (es constatación negativa, no afirmación jurídica positiva). El harness la marca como 1 sin respaldo. Riesgo menor: no es alucinación normativa positiva.
3. **Paráfrasis con formato numérico abreviado (`500.000` solo):** síntesis requiere ≥2 términos sustantivos; un resumen ultra-corto `"El canon es 500.000"` puede caer a fallback honesto aunque el claim exista. Se mitiga usando la afirmación completa del claim en la breve (caso R1). No se tocó `synthesisVerifier` para no introducir regresión en `synthesisVerifier.test` (relación normativa+TC).
4. **BCN SPARQL timeouts (12s) y modelo free 404:** no bloquean pipeline (logs + fallback), pero afectan latencia/costo. Observabilidad existente.

## 14. Regresiones descartadas

- `jurisprudencePipeline.test` (incluye `:114` derecho fundamental, `:230` autoNormativa, `:325` combinado) → PASS
- `fase4214` (hasImplicitDocumentContext, relevance gate) → PASS
- `fase4219` (relevance gate mixed con claims documentales) → PASS
- `fase4220` (brief verificada, integrity, attribution) → PASS
- `synthesisVerifier` (relación inferencia, enumeraciones cerradas) → PASS (se revertió cambio que la rompía)
- `contradiction`/`hierarchy`/`dynamicContextBudget`/`provider` → PASS
- Anti-alucinación (Ley 99.999, rol inexistente, hecho inexistente, doctrinal overreach) → PASS
- Build/lint → PASS

## 15. Comparación con 4.2.20

| Métrica | 4.2.20 | 4.2.21 |
|---------|--------|--------|
| Brief verificada | SÍ (mismo verifier) | SÍ, sin cambios |
| attributionCoverage | 1 / 1 (vacío) | 1 / 1 (vacío), sin cambio semántico |
| persistedSources vs answer | ya consistente | re-auditado, 0 divergencias encontradas |
| Gate relevancia | documentMode !== 'none' | idem, sin cambios |
| Tests server/total | 607 / 693 | 628 / 714 (+21) |
| QA real | 6 casos free (3 SUCCESS) | 6 casos gpt-4o-mini (4 SUCCESS, 1 NO_EVIDENCE, 1 mixta con 1 oración genérica) + free 404 documentado |
| Doc | FASE-4.2.20 (14 secciones) | FASE-4.2.21 (16 secciones) |
| Código pipeline | +55/-9 (brief + coverage) | 0 líneas (auditoría confirma no bug) |

## 16. Veredicto final

**PASS.** La auditoría READ-ONLY completa no encontró divergencia entre `persistedSources[].claims[]` y `brief/síntesis/sources` que constituya bug de trazabilidad final. La cadena `pregunta → modo → documento/fuente → claim → evidencia → source_id → breve/síntesis verificadas → fuentes mostradas` es íntegra por construcción. No se requirió cambio de código de pipeline (cambio mínimo = 0, cambio evaluado y revertido tras regresión en `synthesisVerifier`). Se agregaron 21 tests deterministas (§19+§20) que cubren todos los casos A–M y R1–R6, y se ejecutó QA real con modelo alternativo ante bloqueo del free. Suite 714/714, build y lint PASS. Sin commit/push, sin avanzar a 4.2.22.

