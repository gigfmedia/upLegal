# FASE 4.2.19 — RELEVANCIA SEMÁNTICA Y PROTECCIÓN CONTRA RESPUESTAS A LA PREGUNTA EQUIVOCADA

- **Fecha de auditoría:** 2026-08-20 (UTC 14:40; Chile 10:40, UTC-4)
- **Modo:** auditoría read-only + cambio mínimo en `server/ai` (sin embeddings, sin dependencias, sin infraestructura)
- **Alcance:** `server/ai/jurisprudenceSources.mjs`, `documentGrounding.mjs`, `jurisprudencePipeline.mjs`, `jurisprudencePrompt.mjs`, `synthesisVerifier.mjs`, `contradiction.mjs`, `hierarchy.mjs`, `server.mjs`
- **Estado final:** `git status --short` limpio salvo 3 archivos (2 modificados, 1 nuevo). **SIN commit/push** (per regla de fase).

---

## 1. Objetivo

Evitar que LegalUp AI responda a **la pregunta equivocada**: una fuente pública puede ser
VERIFICABLE (el claim tiene respaldo textual real en la fuente) y aun así NO responder la
intención de la pregunta del abogado (ej. jurisprudencia de protección de datos para
"¿Cuál es la renta mensual?"). La regla exigida:

> Una fuente no responsive a la intención de la pregunta NO debe aparecer ni en claims ni en
> fuentes ni en jurisprudencia/doctrina relevante ni en el Markdown final — aun cuando existan
> claims documentales verificados.

Restricciones cumplidas: sin embeddings / vector DB / pgvector / reranker; sin cambiar modelo
ni proveedor; sin tocar `AI_CHAT_MAX_TOKENS`, `MAX_CONTEXT_CHARS`, dynamic context budget
(4.2.7) ni retry budget (4.2.4/4.2.10); sin debilitar anti-alucinación (Ley 99.999, rol/artículo
inventado, hecho inexistente), doctrina overreach (4.2.15) ni regresiones D2/D4/G3/A1/A3/B5/C3.

## 2. Estado inicial

- Suite completa: **672/672 PASS** (42 archivos) → server 586 PASS (27 archivos) + frontend 86.
- Build PASS. Lint PASS en archivos de la fase. Typecheck con errores **pre-existentes** ajenos
  a la fase (`ratingService.ts`, `logger.ts`, `paymentLogger.ts` — sin archivos de la fase).
- Proveedor: `openai/gpt-oss-20b:free` configurado (`.env.local`, key `sk-or-` presente).
- Gate de relevancia 4.2.14 existente, cubierto por `fase4214.documentContextRobustness.test.mjs`
  (14 tests).

## 3. Auditoría read-only

### 3.1 Archivos y funciones inspeccionadas (implementaciones reales)

| Función | Archivo | Observación |
|---------|---------|-------------|
| `classifyLegalQuery` | `jurisprudenceSources.mjs` | intents: `GENERAL_LEGAL_QUERY`, `JURISPRUDENCE_LOOKUP`, `ARTICLE_LOOKUP`, `BARE_NORM_CITATION`, `normativa`… |
| `detectDocumentMode` | `documentGrounding.mjs:651` | modes `document`/`mixed`/`none`; señales 4.2.9 (`hasCaseReferenceSignal`), 4.2.12 (`hasCaseContentReference`), 4.2.14 (`hasImplicitDocumentContext` + `IMPLICIT_LEGAL_POLE_RE`) |
| `hasCaseReferenceSignal` | `documentGrounding.mjs` | señal P1 (nombre/rol del caso) |
| `hasCaseContentReference` | `documentGrounding.mjs` | señal H3 (hechos factuales naturales) |
| `hasImplicitDocumentContext` | `jurisprudenceSources.mjs` | señal factual con 1 documento |
| `selectDocumentEvidence` | `documentGrounding.mjs:421` | selección de fragmentos documentales |
| `verifyDocumentClaims` | `documentGrounding.mjs:521` | anti-alucinación documental (literal + N1 + N2 `checkDocumentClaimFacts`) |
| `isSourceResponsiveToQuery` | `jurisprudenceSources.mjs:1524` | señales: artículo citado, número de ley, solape de término sustantivo |
| `applyRelevanceGate` | `jurisprudencePipeline.mjs:53` | conserva solo fuentes responsive; genera warnings |
| `shouldAllowDocumentOnlyFallback` | `documentGrounding.mjs:292` | fallback documental 4.2.12 |
| `runJurisprudenceWithRetry` | `jurisprudencePipeline.mjs:510+` | `LLM_RETRY_MAX_ATTEMPTS=3`, retry solo JSON inválido |
| `buildJurisprudenceCaseContext` | `jurisprudencePrompt.mjs` | contexto del caso |
| `buildJurisprudenceUserPrompt` | `jurisprudencePrompt.mjs` | prompt del modelo |
| `buildJurisprudenceAnswer` | `jurisprudencePrompt.mjs` | Markdown final (usa listas ya filtradas, 4.2.15) |

### 3.2 Flujo real reconstruido (server.mjs ruta research, ~8130–8497)

```
classifyLegalQuery(query)
→ detectDocumentMode(query, caseDocuments, classification)   // document/mixed/none
→ (documento → sin retrieval público; mixed → searchJurisprudence)
→ buildJurisprudenceContext(sources) + buildJurisprudenceCaseContext
→ chatCompletion (LLM real, model AI_DEFAULT_MODEL)
→ buildJurisprudenceOutcome({ data, sources, intent, query, documents, documentMode })
    ├─ verifyJurisprudenceClaims (normativa/jurisprudencia/doctrina)
    ├─ verifyDocumentClaims (documento)
    ├─ gate de relevancia: gateShouldFilter = documentMode !== 'none' && verifiedDocumentos.kept.length === 0   ← 4.2.19
    ├─ detectExcessiveConclusions / hierarchy / contradictions / synthesis
    └─ answer (Markdown), allVerifiedClaims, referencedIds, persistedSources
→ persist ai_research_requests + PostHog + response JSON (research_type = document/mixed/jurisprudence)
```

## 4. Problema

**Síntoma:** en modo `mixed` con claims documentales **verificados**, una fuente pública
VERIFICABLE pero de OTRA MATERIA sobrevive al gate y se exhibe como respaldo de la pregunta
factual. Documento responde "¿Cuál es la renta mensual?" y el sistema igual muestra
"Corte Suprema Rol 5174 — protección de datos personales" como jurisprudencia relevante.

**Demostración determinista (test que fallaba antes del fix):**

```js
// modo mixto, claim documental "El canon mensual es 500.000" VERIFICADO
// + fuente pública j-datos (protección de datos) VERIFICADA
expect(result.relevanceDroppedSources).toBe(1);   // era 0 → FALLA
expect(result.allVerifiedClaims.some(c => c.source_id === 'j-datos')).toBe(false); // era true
```

## 5. Causa raíz

`jurisprudencePipeline.mjs:331` (Fase 4.2.14):

```js
const gateShouldFilter = documentMode !== 'none' && verifiedDocumentos.kept.length === 0;
```

El gate de relevancia solo se activaba cuando **NINGÚN** claim documental sobrevivía la
verificación. La intención de 4.2.14 fue evitar que fuentes públicas sustituyeran en silencio a
un documento ausente; pero la condición `&& verifiedDocumentos.kept.length === 0` dejaba el gate
inactivo justo cuando había claims documentales vivos — el escenario donde el modelo mezcla
documento + fuentes públicas. En ese caso `VERIFICABLE=true, RELEVANTE=false` sobrevivía.
El test `fase4214:467` ("el gate NO filtra las fuentes públicas") codificaba este comportamiento.

## 6. Cambios implementados

### 6.1 `server/ai/jurisprudencePipeline.mjs` (mínimo)

```js
const gateShouldFilter = documentMode !== 'none';
```

- El gate ahora aplica en **todo** modo documental (`document` y `mixed`), con o sin claims
  documentales. Comentario actualizado (4.2.14 + 4.2.19).
- Modo `none` (lookups públicos: `JURISPRUDENCE_LOOKUP`, `ARTICLE_LOOKUP`, `BARE_NORM_CITATION`)
  **no** se toca: el gate no aplica y las consultas públicas puras funcionan igual.
- Los claims documentales **nunca** pasan por `applyRelevanceGate` (son evidencia del caso);
  el gate solo filtra fuentes públicas.
- **Relevancia ≠ ausencia de evidencia:** si el claim documental responde, `hasVerifiedClaims=true`
  → `SUCCESS` documental con la fuente irrelevante descartada y warning. `NO_EVIDENCE` queda
  reservado para cuando **nada** responde la pregunta (regla §11 de la fase).

### 6.2 `server/ai/fase4214.documentContextRobustness.test.mjs`

Actualizado el test que codificaba el bug (`modo mixto CON claims documentales verificados`):
ahora espera `relevanceDroppedSources=1` y que `j-datos` NO esté en claims. No se eliminó ningún
test; el resto de los 14 de 4.2.14 queda intacto.

### 6.3 `server/ai/fase4219.relevance.test.mjs` (nuevo, 7 tests)

Ver sección 8.

## 7. Funciones afectadas

| Función | Tipo de cambio |
|---------|----------------|
| `applyRelevanceGate` | sin cambios (reutilizada) |
| `isSourceResponsiveToQuery` | sin cambios (reutilizada, regla §5 de la fase) |
| `buildJurisprudenceOutcome` | condición del gate (`gateShouldFilter`), única línea funcional |
| `buildJurisprudenceAnswer` | sin cambios (ya usaba listas filtradas, 4.2.15) |

No se creó ninguna función equivalente duplicada; se reutilizó `isSourceResponsiveToQuery`
conforme a la fase.

## 8. Tests

### 8.1 Nuevos (`fase4219.relevance.test.mjs`, 7 tests)

| Test | Verifica |
|------|----------|
| `isSourceResponsiveToQuery` — fuente de otra materia → `false` | jurisDatos no responde "renta mensual" |
| `isSourceResponsiveToQuery` — misma materia → `true` | jurisRenta responde |
| `applyRelevanceGate` — conserva relevante, descarta irrelevante | `kept=['j-arriendo']`, `droppedCount=1` |
| **Demostración:** mixto + claim doc vivo → fuente irrelevante descartada | `relevanceDroppedSources=1`, `j-datos` fuera de claims/sources/Markdown, `outcome=SUCCESS` |
| Mixto + claim doc vivo + fuente RELEVANTE → ambas se conservan | `relevanceDroppedSources=0`, doc + `j-arriendo` |
| Mixto todas irrelevantes + claim doc vivo → SUCCESS documental | `persistedSources=[doc]`, sin "No se encontró evidencia" |
| Modo `none` → gate NO aplica (lookup público intacto) | `relevanceDroppedSources=0`, `persistedSources=['j-datos']` |

### 8.2 Resultado

| Suficiencia | Resultado |
|-------------|-----------|
| Server (`npx vitest run server/ai`) | **28 files, 593 PASS** (586 previos + 7 nuevos) |
| Suite completa (`npx vitest run`) | **42 files, 679 PASS** (672 previos + 7 nuevos) |
| Build (`npm run build`) | **PASS** |
| Lint (archivos de la fase) | **PASS** (sin warnings) |

Regresiones de fases previas (D2/D4/G3/A1/A3/B5/C3 y 4.2.14): **todas PASS**.
Baseline exigido (654+): superado (679).

## 9. QA real (proveedor `openai/gpt-oss-20b:free`)

Flujo real replicado (classify → detectDocumentMode → searchJurisprudence → LLM real →
`buildJurisprudenceOutcome`). Proveedor disponible, sin rate-limit.

| # | Query | Intent | Mode | Fuentes públicas | Claims | Outcome | Dropped | Observación |
|---|-------|--------|------|------------------|--------|---------|---------|-------------|
| 1 | "¿Cuál es la renta mensual?" | GENERAL_LEGAL_QUERY | `document` (implicit=true) | 0 | 0 | **NO_EVIDENCE** | 0 | El modelo no citó el claim documental (la renta sí está en el contrato); resultado honesto, sin fuentes irrelevantes ni inventos. |
| 2 | "¿La cláusula de subarrendamiento es válida conforme a la normativa vigente?" | GENERAL_LEGAL_QUERY | `mixed` (doc+fallback) | 12 | 0 | **NO_EVIDENCE** | 0 | Retrieval público real (TC + BCN); modelo no produjo claims verificables; nada irrelevante se exhibió. |

**Veredicto QA:** en ambos escenarios reales ninguna fuente pública irrelevante apareció en
claims/sources/markdown. El proveedor respondió dentro de latencia; costos: 0.000237 y 0.000878 USD.
No hubo `AI_PROVIDER_RATE_LIMITED` → no aplica `INFRASTRUCTURE_BLOCKED`. El modelo no emitió
claims en ninguno de los dos casos (NO_EVIDENCE honesto), lo que limita la observación del gate
"en vivo con claims", pero el comportamiento del gate está cubierto de forma determinista por los
7 tests de la sección 8.

## 10. Antes / Después

| Métrica | Antes (4.2.14) | Después (4.2.19) |
|---------|----------------|------------------|
| Gate de relevancia en `mixed` con claims documentales vivos | **INACTIVO** (`&& verifiedDocumentos.kept.length === 0`) | **ACTIVO** (`documentMode !== 'none'`) |
| Fuente pública verificable pero de otra materia en `mixed` | sobrevivía (claims + sources + Markdown) | descartada + warning |
| `relevanceDroppedSources` en el escenario demo | 0 | 1 |
| `NO_EVIDENCE` cuando el documento responde | no aplica (gate off) | solo si nada responde (doc claim vivo → SUCCESS) |
| Modo `none` (lookups públicos) | sin gate | sin gate (intacto) |
| Tests server / suite total | 586 / 672 | **593 / 679** |

## 11. Regresiones

- `fase4214.documentContextRobustness.test.mjs`: 14 tests → 13 intactos + 1 actualizado a la
  nueva regla (el que codificaba el bug). No eliminado.
- Anti-alucinación: verificación literal + N1/N2 documental (`verifyDocumentClaims`), Ley 99.999,
  rol/artículo inventado, hecho inexistente → **intactas** (ninguna línea tocada).
- Doctrinal overreach 4.2.15 (`DOCTRINAL_OVERREACH_RE`): intacto; el Markdown sigue usando listas
  filtradas.
- Contradicciones, jerarquía, síntesis verificada, retry 4.2.4/4.2.10: sin cambios.
- Suite completa 679/679 PASS, build PASS, lint PASS.

## 12. Riesgos residuales

1. **Relevancia léxica limitada** (`isSourceResponsiveToQuery`): requiere solape de término
   sustantivo o ley/artículo citado. Sinónimos (ej. "subarrendar" vs "subarriendo") pueden no
   matchear en modo `mixed` → fuente relevante podría descartarse. Conservador y alineado con la
   fase (mejor descartar que exhibir irrelevancia), pero un matcher de raíces léxicas podría
   reducirlo. Determinístico, sin LLM, si se decide ampliar.
2. **Retrieval público en modo `mixed` con consulta vaga** puede traer fuentes genéricas; el gate
   las descarta, pero el LLM igual paga tokens de contexto. Afecta costo, no calidad.
3. **Comportamiento del modelo** (QA real #1): el LLM no siempre cita claims documentales aunque
   el documento contenga el hecho → NO_EVIDENCE honesto. No es un defecto del gate; es calidad de
   extracción del modelo. Fuera de alcance de 4.2.19 (no tocar modelo/prompt del sistema).
4. **BCN SPARQL timeout** visto en QA real (12 s) en un intent; el sistema reintenta y degrada a
   título. No bloquea; observabilidad ya existente.

## 13. Veredicto

**PASS.** El defecto `VERIFICABLE=true, RELEVANTE=false` quedó eliminado en la capa de pipeline
con un cambio mínimo de una línea funcional (`gateShouldFilter = documentMode !== 'none'`),
reutilizando `isSourceResponsiveToQuery`/`applyRelevanceGate` (sin duplicar funciones, sin
embeddings). Se demostró el problema con un test determinista antes del fix, se actualizó el único
test que codificaba el comportamiento antiguo y se añadieron 7 tests nuevos. Suite **679/679
PASS**, build PASS, lint PASS. QA real PASS (2 flujos, proveedor disponible, sin
INFRASTRUCTURE_BLOCKED, sin costos relevantes). Sin commit/push; `git status --short`:

```text
 M server/ai/fase4214.documentContextRobustness.test.mjs
 M server/ai/jurisprudencePipeline.mjs
?? server/ai/fase4219.relevance.test.mjs
```

**NO se avanzó a Fase 4.2.20.**