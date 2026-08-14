# FASE 4.2.8 — Auditoría READ-ONLY de calidad de la respuesta final

**Fecha:** 2026-08-14
**Régimen:** 100% read-only. Sin cambios de código, sin commits, sin push, sin analytics (solo QA local con metadata).
**Estado:** AUDITORÍA COMPLETADA. NO SE IMPLEMENTÓ NADA.

---

## 1. Objetivo

Auditar de extremo a extremo la calidad de la **respuesta final** del pipeline de investigación jurídica (retrieval → evidencia → contexto → LLM → post-LLM → respuesta → frontend), clasificando los fallos en A (retrieval) / B (evidencia) / C (contexto) / D (razonamiento LLM) / E (síntesis) / F (renderizado UX), con foco en D y E usando A/B/C como causas raíz. Entregar un SPEC propuesto para una fase futura.

## 2. Alcance y método

- **Módulos leídos:** `server.mjs` (endpoint /api/ai/cases/:caseId/jurisprudence), `server/ai/provider.mjs`, `jurisprudencePipeline.mjs` (`runJurisprudenceWithRetry`), `jurisprudencePrompt.mjs` (selectSourcesForContext, buildJurisprudenceUserPrompt, buildJurisprudenceCaseContext, buildJurisprudenceAnswer), `documentGrounding.mjs` (selectDocumentEvidence, detectDocumentMode), `jurisprudenceSources.mjs` (classifyLegalQuery, DOCUMENT_SIGNAL_RE), `synthesisVerifier.mjs`, `contradiction.mjs`, `hierarchy.mjs`, `dynamicContextBudget.mjs`.
- **Frontend leído:** `src/components/legalup-ai/AIResearchPanel.tsx`, `src/hooks/useAIResearch.ts`, `src/components/legalup-ai/resumenConstraint.ts`.
- **QA ejecutada:** harness en `/var/folders/.../opencode/fase428-qa.mjs` replicando el flujo completo del servidor con LLM REAL (`openai/gpt-oss-20b:free` vía OpenRouter, `AI_CHAT_MAX_TOKENS=2400`), documento sintético de arrendamiento, 29 consultas en 9 grupos (A–I). Resultados en `fase428-results.jsonl` (solo metadata + respuesta).
- **Base verificada:** `npm run test:run` → 539/539 PASS (34 archivos); `npm run build` → PASS.

## 3. Estado del repositorio

- Al inicio: `main` @ `7f409ac` (commit Fase 4.2.7), árbol con solo 1 archivo modificado pre-existente (`src/pages/blog/ley-devuelveme-mi-casa-chile-2026.tsx`), nunca commiteado.
- **Durante la auditoría el repo cambió por trabajo paralelo del usuario:** HEAD avanzó a `3412995 fix: blank` (GA/frontend/vite) y hay 15 archivos modificados (blogs SEO + componentes). **Ninguno toca `server/ai` ni `src/components/legalup-ai`** (verificado con `git diff --name-only`). Se reporta por transparencia; NO se commiteó ni modificó nada desde esta auditoría.

## 4. Matriz de resultados QA (29 consultas, metadata)

| # | Grupo | Consulta (resumen) | Intención | Mode | Fuentes | Claims | Estado | Veredicto |
|---|-------|--------------------|-----------|------|---------|--------|--------|-----------|
| A1 | A | Derechos art. 4 Ley 21.719 | ARTICLE_LOOKUP | none | 1 | 1 | SUCCESS | **PASS** |
| A2 | A | Oposición art. 8 | ARTICLE_LOOKUP | none | 2 | 2 | SUCCESS→NO_EVIDENCE | **FLAKY** |
| A3 | A | Procedimiento derechos titulares | BARE_NORM_CITATION | none | 3 | 0 | OUTPUT_TOKEN_LIMIT→NO_EVIDENCE | **FAIL** |
| B1 | B | Criterios TC autodeterminación | JURISPRUDENCE_LOOKUP | none | 6 | 1 | SUCCESS | **PASS** |
| B2 | B | TC protección de datos | JURISPRUDENCE_LOOKUP | none | 8 | 0 | OUTPUT_TOKEN_LIMIT ×2 | **FAIL (infra)** |
| B3 | B | Importancia Rol 9666 | JURISPRUDENCE_LOOKUP | none | 7 | 3 | SUCCESS | **PASS** |
| C1 | C | Relación art.4 ↔ TC | RELATIONAL | none | 6 | 0 | QA_LLM_TIMEOUT | **FAIL (infra)** |
| C2 | C | Relación derechos ↔ jurisprudencia TC | RELATIONAL | none | 8 | 0 | Rate limited | **FAIL (infra)** |
| C3 | C | TC permite interpretar Ley 21.719 | NORMATIVE_APPLICATION | none | 6 | 5 | SUCCESS (3 contradicciones) | **PASS** |
| D1 | D | Obligaciones de "este contrato" | DOCUMENT_ANALYSIS | document | 0 | 0 | timeout→OUTPUT_TOKEN_LIMIT | **FAIL (infra)** |
| D2 | D | ¿Cláusula de término anticipado? | GENERAL | **none** | 5 | 1 | SUCCESS **RESPUESTA FALSA** | **FAIL CRÍTICO** |
| D3 | D | Riesgos de "esta cláusula" | DOCUMENT_ANALYSIS | document | 0 | 1 | SUCCESS→NO_EVIDENCE | **FLAKY** |
| D4 | D | ¿Quiénes son las partes del contrato? | GENERAL | **none** | 10 | 2 | SUCCESS **RESPUESTA FALSA** | **FAIL CRÍTICO** |
| E1 | E | Cláusula compatible con art. 1545 CC | BARE_NORM_CITATION | mixed | 2 | 2 | SUCCESS | **PASS** |
| E2 | E | Riesgos según normativa aplicable | DOCUMENT_ANALYSIS | document | 0 | 1 | SUCCESS→NO_EVIDENCE | **PARTIAL** |
| E3 | E | Plazo compatible con normativa | DOCUMENT_ANALYSIS | document | 0 | 1 | SUCCESS | **PARTIAL** |
| F1 | F | Cláusula ↔ criterios TC | RELATIONAL | mixed | 6 | 1 | SUCCESS | **PASS** |
| F2 | F | ¿Jurisprudencia para evaluar cláusula? | JURISPRUDENCE_LOOKUP | mixed | 10 | 1 | SUCCESS→rate limited | **PARTIAL** |
| G1 | G | Analiza cláusula (contrato+norma+TC) | JURISPRUDENCE_LOOKUP | mixed | 9 | 1 | NO_EVIDENCE→SUCCESS | **FLAKY** |
| G2 | G | Riesgos + fuentes que los respaldan | DOCUMENT_ANALYSIS | document | 0 | 3 | timeout→SUCCESS | **PARTIAL** |
| G3 | G | Hechos relevantes + normas/fallos | JURISPRUDENCE_LOOKUP | **none** | 10 | 0 | NO_EVIDENCE→OUTPUT_TOKEN_LIMIT | **FAIL CRÍTICO** |
| H1 | H | "Entonces, ¿puedo demandar?" | NORMATIVE_APPLICATION | none | 9 | 0 | NO_EVIDENCE | **PARTIAL** |
| H2 | H | "¿Esto demuestra que el contrato es ilegal?" | GENERAL | **none** | 7 | 3 | SUCCESS (doc no usado) | **PARTIAL** |
| H3 | H | ¿TC ya resolvió cláusula inválida? | JURISPRUDENCE_LOOKUP | mixed | 10 | 0 | NO_EVIDENCE | **PASS (calibración)** |
| H4 | H | Conclusión definitiva (fuentes divergentes) | GENERAL | none | 4 | 4 | SUCCESS (retry=1) | **PASS** |
| I1 | I | Cesión de garantía en contrato | DOCUMENT_ANALYSIS | document | 0 | 1 | SUCCESS | **PASS** |
| I2 | I | Art. 999 Ley 21.719 (inventado) | ARTICLE_LOOKUP | none | 4 | 0 | NO_EVIDENCE | **PASS (anti-alucinación)** |
| I3 | I | Ley 99.999 (inventada) | BARE_NORM_CITATION | none | 0 | 0 | NO_SOURCES_FOUND | **PASS (anti-alucinación)** |
| I4 | I | Ley 21.719 ↔ accidentes laborales | RELATIONAL | none | 4 | 0 | Rate limited | **FAIL (infra)** |

### Resumen numérico

| Resultado | Cantidad | % |
|-----------|----------|---|
| PASS (respuesta correcta y útil) | 11 | 38% |
| PASS (calibración correcta: rechazo honesto) | 3 | 10% |
| FLAKY / no determinista (misma consulta, distinto resultado) | 4 | 14% |
| PARTIAL (responde pero con lagunas de legalidad/documento) | 4 | 14% |
| FAIL CRÍTICO (respuesta FALSA sobre el documento del caso) | 3 | 10% |
| FAIL infraestructura (timeout / rate limit / tokens) | 4 | 14% |

## 5. Matriz de clases de fallo (A/B/C/D/E/F)

| Clase | Descripción | Evidencia | Gravedad |
|-------|-------------|-----------|----------|
| **A – Retrieval** | La señal documental no se activó; se ignoró el documento del caso | D2, D4, G3, H2 → mode `none` | **CRÍTICO** |
| **B – Evidencia** | Claims descartados sin reemplazo (verificación correcta pero respuesta vacía) | G1, D3, E2 (2ª corrida) | Media |
| **C – Contexto** | Consultas mixtas cayeron a `document`/`none` sin presupuesto legal; "normativa aplicable" no genera señal jurídica | E2, E3, G2 (hasLegal=false) | Alta |
| **D – Razonamiento LLM** | Modelo de razonamiento consume el presupuesto de tokens antes del contenido | B2, D1, A3: `OUTPUT_TOKEN_LIMIT` | Alta (infra) |
| **D – Robustez** | `fetch` sin timeout en provider.mjs → llamadas colgadas indefinidamente | C1, G2, D1: timeouts de 180s+ | Alta (infra) |
| **E – Síntesis** | "Respuesta breve" (resumen) sin verificación vs "Síntesis" verificada; divergencia de path | A1/A2 (resumen correcto), H4 (retry) | Media |
| **F – Renderizado** | AIResearchPanel renderiza `item.answer` markdown y aplica `constrainResumenOverstatement` solo a Respuesta breve; sin señal de que las fuentes consultadas fueron públicas y no el documento | F2, G2 (doc-only vs mixto) | Media |

## 6. Evaluación contra criterios de calidad

- **Precisión factual:** 3 respuestas FALSAS confirmadas (D2, D4, G3): el LLM afirmó cosas que contradicen el contrato del caso porque el documento nunca llegó al contexto.
- **Completitud:** consultas documentales legítimas sin respuesta útil en 1ª corrida (D1, G2); varias "NO_EVIDENCE" que sí eran respondibles.
- **Atribución:** correcta cuando hay claims (norma/jurisprudencia/documento con fragmento); pero la "Respuesta breve" es una aserción sin claim → atribución invisible al usuario.
- **Calibración:** sobresaliente en rechazos honestos (H3, I2, I3, H4) — no alucina ante normas inventadas.
- **Utilidad:** deteriorada por no-determinismo (misma pregunta → respuesta o vacío) e infraestructura (4 fallos de proveedor).
- **Síntesis:** verificación de claims (anti-alucinación) funciona; el eslabón débil es ANTES del LLM (qué contexto llega).

## 7. Patrones detectados

1. **P1 – Falsos negativos de señal documental (CRÍTICO, causa raíz de los 3 FAIL críticos):** `DOCUMENT_SIGNAL_RE` (jurisprudenceSources.mjs:2204) exige un deíctico ("este/esta/dicho…") o verbo ("dice/establece…") seguido del sustantivo. Consultas reales que usan **"el contrato"**, **"alguna cláusula"**, **"las partes del contrato"**, **"hechos del documento"** NO matchean → `detectDocumentMode` devuelve `none` → el documento se descarta en silencio y el LLM responde con jurisprudencia/doctrina pública no pertinente, produciendo afirmaciones falsas sobre el propio documento del cliente.
2. **P2 – Señal jurídica ausente en frases genéricas:** "según la normativa aplicable", "qué fuentes jurídicas" no generan `normCitations`/`hasLegal` → consultas mixtas (E2, E3, G2) caen a modo `document` con presupuesto legal 0.
3. **P3 – Modelo de razonamiento + max_tokens:** `gpt-oss-20b` gasta el razonamiento interno dentro de los 2400 tokens → `OUTPUT_TOKEN_LIMIT` (B2, D1, A3). Problema de config de modelo, no de prompt.
4. **P4 – Sin timeout en provider.mjs:** llamadas colgadas (C1, G2, D1; B2 32 min en la corrida previa).
5. **P5 – Proveedor free inestable:** rate limits frecuentes (C2, F2, I4), cierres prematuros de conexión (A1).
6. **P6 – No-determinismo:** A2, D3, G1, E2 dieron SUCCESS en una corrida y NO_EVIDENCE en otra → UX impredecible.
7. **P7 – Respuesta breve sin verificación:** `resumen` es texto libre del LLM atenuado por `constrainResumenOverstatement`; la `sintesis` sí pasa por verificación. Dos standards distintos para la misma consulta.

## 8. Cuello de botella elegido

**P1 – Falsos negativos de detección de señal documental** (`DOCUMENT_SIGNAL_RE` → mode `none` → documento del caso ignorado).

- **Impacto:** máximo. Produce respuestas FALSAS y confiadas sobre el documento privado del cliente (D2 negó la cláusula de término anticipado que sí existe; D4 habló de "contrato de depósito" ante un arriendo; G3 descartó el documento). Para un producto legal, el peor tipo de fallo.
- **Frecuencia real:** 3/29 críticos + 2 parciales por la misma causa (H2, y refuerza P2). No es raro: cualquier consulta sobre "el contrato" sin deíctico lo dispara.
- **Riesgo legal:** alto (asesoría incorrecta sobre el propio contrato).
- **Viabilidad:** alta. Es una función pura, determinista y testeable (`detectDocumentMode` es puro, sin I/O).
- **No resuelto por 4.1–4.2.7:** 4.2.6 introdujo el modo documento pero su *trigger* es demasiado estrecho; 4.2.7 tocó presupuesto de contexto, no detección.

---

## 9. SPEC PROPUESTO — Fase 4.2.9 (no implementado)

**Título:** Corregir detección de señal documental en consultas de caso.

**Causa raíz:** `DOCUMENT_SIGNAL_RE` (jurisprudenceSources.mjs:2204) solo matchea `[deíctico|verbo] + sustantivo_documento`. Las referencias al documento con artículo definido ("el contrato"), posesivos, sinónimos o construcciones "del documento" no disparan la señal → `detectDocumentMode` → `none` → el documento nunca llega al contexto.

**Cambios propuestos (para implementar en una fase futura):**

1. **Ampliar `DOCUMENT_SIGNAL_RE`:** añadir patrones de artículo definido/indefinido + sustantivo (`\b(?:el|la|los|las|un|una|unos|unas|del|al)\s+(?:contrato|cláusula|documento|…)\b`) y el patrón `\b(?:partes del|término del|obligaciones del|cláusula del)\s+(?:contrato|documento)\b`.
2. **Fallback cuando hay documentos:** en `detectDocumentMode`, si `hasDocs && !hasDocumentSignal`, evaluar si la consulta menciona cualquier sustantivo de la lista `DOCUMENT_NOUN_RE` (con o sin patrón) → subir a modo `document`/`mixed` con aviso `warning` (nunca `none`).
3. **Reforzar señal jurídica genérica (P2):** tratar frases "según la normativa", "fuentes jurídicas", "normativa aplicable" como señal legal débil en modo mixto (marcar `hasLegal` suave para no volcar todo el presupuesto legal pero sí asignar >0).
4. **Test unitarios:** consultas que hoy fallan (D2, D4, G3) deben resolver a `document`/`mixed` con claims verificables contra el documento.

**Criterios de éxito:** D2 responde "la cláusula QUINTA permite término anticipado"; D4 identifica a MARÍA LÓPEZ y JORGE PÉREZ; G3 usa el documento. Suite completa 539+ PASS, build PASS, QA real re-corrida con veredictos PASS.

---

FASE 4.2.8
SPEC PROPUESTO
NO IMPLEMENTADO
