# FASE 4.2.9 — Corrección de la detección de señal documental

**Fecha:** 2026-08-15
**Régimen:** implementación de la fase propuesta por la auditoría 4.2.8. Sin commit, sin push, sin analytics.
**Estado:** IMPLEMENTADA. Suite 570/570 PASS, build PASS, lint PASS, QA determinista PASS.

---

## 1. Objetivo

Corregir los falsos negativos de `detectDocumentMode()` (causa raíz **P1** de la auditoría 4.2.8): consultas reales que refieren al documento del caso ("el contrato", "las partes del contrato", "hechos del caso") no disparaban `DOCUMENT_SIGNAL_RE` → `mode 'none'` → el documento privado se descartaba en silencio y el LLM producía **respuestas falsas** (D2, D4, G3). Adicionalmente se ataca **P2** (señal jurídica genérica ausente) para que consultas mixtas tipo "según la normativa aplicable" no caigan a modo `document` con presupuesto legal 0.

La detección sigue siendo **100% determinista, pura y testeable** (sin LLM). No se tocó: intents de `classifyLegalQuery` (solo se amplió el léxico de la señal), retrieval, evidencia, `verifyDocumentClaims`, `selectDocumentEvidence`, RLS/ownership, presupuesto dinámico, frontend ni PostHog.

## 2. Alcance y método

- **Módulos leídos:** `server/ai/jurisprudenceSources.mjs` (señales + `classifyLegalQuery`), `server/ai/documentGrounding.mjs` (`detectDocumentMode`, `selectDocumentEvidence`, `verifyDocumentClaims`), `server/ai/jurisprudencePipeline.mjs`, `server.mjs` (endpoint `/api/ai/cases/:caseId/jurisprudence`, líneas 8070-8109), `server/ai/dynamicContextBudget.mjs`, `docs/ia-auditorias/FASE-4.2.8-auditoria-calidad.md`, tests de las fases 4.2.6/4.2.7.
- **Diseño previo a código:** se verificó consulta a consulta (D2/D4/G3, §8 penal, §9 negativos, §10 mixto, invariante 4.2.6) que las señales nuevas y el fallback NO rompen los intents ni los gates existentes.
- **Base verificada:** `npm run test:run` → 570/570 PASS (35 archivos, +31 tests nuevos); `npm run build` → PASS; `npx eslint` → 0 errores.

## 3. Causa raíz (P1) y diseño

`DOCUMENT_SIGNAL_RE` (antiguo) exigía `[deíctico|verbo lector] + sustantivo_documento`. No matcheaban: "el contrato", "alguna cláusula", "las partes del contrato", "hechos del documento", "fecha de detención". Resultado: `detectDocumentMode` → `none`.

**Diseño de 4.2.9** (3 mecanismos independientes y complementarios):

1. **Ampliar la señal primaria** `DOCUMENT_SIGNAL_RE` a 6 familias (ver §4).
2. **Fallback documental** `hasCaseReferenceSignal()`: cuando hay documentos (`hasDocs`) y la consulta menciona una **estructura del expediente** sin disparar la señal primaria → subir a modo `document`/`mixed`. Se bloquea solo ante jurisprudencia sobre tópico abstracto ("¿Qué ha dicho el TC sobre la prisión preventiva?"). `"contrato"` a propósito NO está en la lista core para preservar el invariante 4.2.6 ("puedo terminar el contrato" → `none`).
3. **Señal jurídica genérica** `GENERIC_LEGAL_SIGNAL_RE` (P2): dota de polo legal (`hasLegal`) sin crear intent ni citación → convierte E2/E3/G2 en `mixed` con presupuesto legal > 0.

## 4. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `server/ai/jurisprudenceSources.mjs` | `DOCUMENT_NOUN_RE` ampliado (14 sustantivos). `DOCUMENT_SIGNAL_RE` reescrito con 6 familias. Nuevos export: `GENERIC_LEGAL_SIGNAL_RE`, `CASE_STRUCTURE_SIGNAL_RE`, `hasCaseReferenceSignal()`. `classifyLegalQuery` sin cambios de lógica de intents. |
| `server/ai/documentGrounding.mjs` | `detectDocumentMode()` integra el fallback (`hasCaseReferenceSignal`) y la señal genérica en `hasLegal`; expone `fallbackSignal` en el retorno. |
| `server/ai/fase429.documentSignal.test.mjs` | **Nuevo.** 31 tests: A (señal ampliada), B (señal genérica), C (fallback), D (críticos D2/D4/G3), E (expediente penal), F (negativos), G (mixto + regresión 4.2.6). |

### 4.1 Patrones de `DOCUMENT_SIGNAL_RE` (6 familias)

1. **Deíctico + sustantivo:** "esta cláusula", "dicho escrito" (regresión 4.2.6).
2. **Verbo lector + artículo:** "¿qué dice el contrato?", "¿qué establece la escritura?" (ampliado con `menciona`, `dispone`, `los/las`).
3. **"X del contrato/documento/expediente…" y "X de la causa":** "partes del contrato", "cláusula del contrato", "hechos de la causa".
4. **"Hechos/antecedentes (relevantes/más/principales) del caso".**
5. **Eventos procesales:** "se presentó/presentaron/presentado", "se envió", "se pidió", "se solicitó", "lo solicitado/presentado/enviado", "se acompañó", "se adjuntó".
6. **Fecha/tiempo/días/meses/semanas/años/período + de/en + detención/prisión preventiva/cautela:** "fecha de detención", "¿cuánto tiempo lleva en prisión preventiva?".

**Exclusiones deliberadas (conservador):** el patrón amplio `[el/la + contrato]` suelto NO está ("puedo terminar el contrato" sigue siendo `NORMATIVE_APPLICATION`); "prisión preventiva" sola como materia NO dispara señal primaria (requiere tiempo/fecha o estructura vía fallback).

### 4.2 Fallback `hasCaseReferenceSignal`

Estructuras core: `cláusula(s)`, `partes`, `hechos`, `antecedentes`, `oficio(s)`, `escrito`, `resolución`, `informe`, `audiencia`, `solicitud`, `presentación`, `detención`, `prisión preventiva`, `cautela(s)`.

Gatillos: (a) determinante/posesivo/cuantificador + sustantivo ("la cláusula", "las cautelas", "algún oficio"); (b) pregunta directa ("¿quiénes son las partes?", "¿qué contienen los hechos?"); (c) sustantivo + "del caso/expediente/causa/documento".

Reglas de bloqueo (orden):
1. Si `hasJurisprudence` **y** la consulta usa "sobre" (tópico abstracto) → `false` ("¿Qué ha dicho el TC sobre la prisión preventiva?" sigue siendo jurisprudencia).
2. El fallback **exige `hasDocs`** → jamás produce `noEvidence` ni bloquea por 422.

### 4.3 Señal jurídica genérica (P2)

`GENERIC_LEGAL_SIGNAL_RE` matchea "según la normativa aplicable", "normativa vigente", "legislación vigente", "fuentes jurídicas", "¿qué fuentes jurídicas?", "¿qué normativa aplica/rige?", "normas o fallos", "fallos o normas", "¿qué normas o fallos podrían ser aplicables?". No matchea consultas puramente documentales ("¿qué hechos del caso son relevantes?"). Solo alimenta `hasLegal` en `detectDocumentMode`; no altera intents.

## 5. Tests (server/ai/fase429.documentSignal.test.mjs, 31)

- **A · Señal ampliada:** 8 tests. "partes del contrato", "cláusula del contrato", "hechos relevantes del caso", eventos procesales, fecha/tiempo de detención/PP; regresión 4.2.6 ("dice el contrato", "esta cláusula", "escritura"); NO-matches: "puedo terminar el contrato", "terminación unilateral del contrato", "TC sobre la prisión preventiva".
- **B · Señal genérica:** 2 tests.
- **C · Fallback:** 5 tests, incluido el bloqueo por jurisprudencia abstracta.
- **D · Críticos (D2/D4/G3):** 3 tests con claims verificables contra el documento (QUINTA término anticipado; partes María López / Jorge Pérez; G3 con documento + fuentes).
- **E · Expediente penal (§8):** 5 tests (detención, prisión preventiva, cautela vía fallback, oficios, antecedentes).
- **F · Negativos (§9):** 4 tests (art. 1545, TC término anticipado, TC prisión preventiva, fallback sin documentos).
- **G · Mixto + regresión (§10):** 4 tests (cláusula + art. 1545 → mixed; E2 normativa aplicable → mixed; invariante 4.2.6 → none; gate `noEvidence` intacto).

## 6. QA determinista (11 consultas, replicando el flujo del endpoint)

Harness que reproduce `/api/ai/cases/:caseId/jurisprudence`: `classifyLegalQuery` → `detectDocumentMode` → `selectDocumentEvidence` → `verifyDocumentClaims`, con documentos de contrato y expediente penal reales (sin LLM ni red). Resultados:

| # | Consulta | Intent | Mode | fallback | docs_used | fragments | claims_kept | Veredicto |
|---|----------|--------|------|----------|-----------|-----------|-------------|-----------|
| D2 | ¿La cláusula de término anticipado permite terminar el contrato? | NORMATIVE_APPLICATION | **document** | true | 1 | 3 | 1 | PASS |
| D4 | ¿Quiénes son las partes del contrato? | DOCUMENT_ANALYSIS | **document** | false | 1 | 3 | 1 | PASS |
| G3 | …hechos relevantes del caso y qué normas o fallos podrían ser aplicables? | JURISPRUDENCE_LOOKUP | **mixed** | false | 1 | 3 | 1 | PASS |
| P1 | ¿Cuál es la fecha de detención de mi cliente? | DOCUMENT_ANALYSIS | **document** | false | 1 | 1 | 1 | PASS |
| P2 | ¿Cuánto tiempo lleva en prisión preventiva? | DOCUMENT_ANALYSIS | **document** | false | 1 | 1 | 1 | PASS |
| P3 | ¿Se pueden caer las cautelas de garantías? | NORMATIVE_APPLICATION | **document** | true | 1 | 1 | 1 | PASS |
| P4 | ¿Se presentaron los oficios de la audiencia? | DOCUMENT_ANALYSIS | **document** | false | 1 | 1 | 1 | PASS |
| P5 | ¿Qué antecedentes se presentaron para la audiencia? | DOCUMENT_ANALYSIS | **document** | false | 1 | 1 | 1 | PASS |
| N1 | ¿Qué ha dicho el TC sobre la prisión preventiva? | JURISPRUDENCE_LOOKUP | **none** | false | 0 | 0 | 0 | PASS |
| M1 | ¿La cláusula del contrato es compatible con el artículo 1545? | BARE_NORM_CITATION | **mixed** | false | 1 | 3 | 1 | PASS |
| INV | ¿Puedo terminar el contrato por incumplimiento? | NORMATIVE_APPLICATION | **none** | false | 0 | 0 | 0 | PASS |

- **0 respuestas falsas** sobre el documento (los 3 críticos de 4.2.8 ahora resuelven a `document`/`mixed` con el documento en contexto).
- **0 bloqueos 422** espurios (`noEvidence` solo se dispara en consultas puramente documentales sin documentos).
- Negativo N1 y el invariante 4.2.6 (INV) permanecen en `none`.

## 7. Resultados de la suite

- `npm run test:run` → **570/570 PASS** (35 archivos; 539 previos + 31 nuevos). Invariantes de 4.2.6 y tests de intents/budget de 4.2.1-4.2.7 intactos.
- `npm run build` → **PASS** (18.2s).
- `npx eslint server/ai/jurisprudenceSources.mjs server/ai/documentGrounding.mjs server/ai/fase429.documentSignal.test.mjs` → **0 errores**.

## 8. Problemas conocidos / límites

- **Tradeoff del fallback:** si el caso tiene documentos y la consulta menciona una estructura del expediente con determinante ("la audiencia", "el informe"), sube a `document` aunque la intención sea jurídica. Es una degradación suave (no bloquea; solo prioriza presupuesto documental sobre público). El bloqueo por `hasJurisprudence && "sobre"` cubre el caso más común (jurisprudencia de tópico).
- **QA determinista:** la parte de *retrieval público* (mode `mixed`) y el *razonamiento LLM* no se ejecutaron (sin proveedor): la matriz valida detección + evidencia + claims. La verificación con LLM real queda para una re-corrida QA completa (como la de 4.2.8) si se desea.
- **`GENERIC_LEGAL_SIGNAL_RE`** es léxico y acotado; frases legales no listadas siguen cayendo a `document` con presupuesto legal 0 (cobertura parcial de P2, por diseño).

## 9. No incluido

No se avanzó a la fase 4.2.10. No se hicieron commits ni push. El árbol solo contiene los 3 archivos de esta fase (2 modificados + 1 nuevo test).