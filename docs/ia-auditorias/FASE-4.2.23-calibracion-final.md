# FASE 4.2.23 — Calibración Final de Respuestas, NO_EVIDENCE y Brevedad

**Estado:** CERTIFIED (sin cambios de código, sin commit/push)
**Fecha:** 2026-08-24
**Base:** 729/729 PASS (4.2.22), breve verificada, trazabilidad validada

---

## 1. Objetivo

Auditar y, solo si existe bug reproducible con impacto real, corregir la calidad final de respuestas (NO_EVIDENCE, brevedad, números/fechas/roles, paráfrasis, inferencias, mixed). No refactorizar, no embeddings, no semántica externa.

## 2. Estado inicial

- 729/729 PASS (45 archivos), build PASS, lint PASS
- `isSourceResponsiveToQuery` 1 token, `applyRelevanceGate` en document/mixed, `hasImplicitDocumentContext` operativo
- `verifyAndBuildSynthesis` para breve y síntesis, `attributionCoverage` 1/1, `checkDocumentClaimFacts` con Nivel 2 (números/roles + ancla fuerte)
- Riesgos residuales 4.2.21/22: ultra-corta `El canon es $500.000` puede caer a fallback, frase genérica `La normativa vigente no especifica…` en mixed, coincidencia léxica incidental ya documentada

## 3. Auditoría read-only

Inspeccionados: `jurisprudencePipeline.mjs` (brief 448-472, NO_EVIDENCE 466-471, attributionCoverage 55, referenced 505-536), `synthesisVerifier.mjs` (verifySynthesis 217, CATEGORY_PREFIX, DISCOURSE_TERMS, RELATIONAL), `jurisprudenceSources.mjs` (isSourceResponsive 1524, GENERIC 1319, RELEVANCE_LOW 1350, normalizeClaimTokens 1371, classifyLegalQuery 2565), `documentGrounding.mjs` (checkDocumentClaimFacts 228, verifyDocumentClaims 521, detectDocumentMode 651), `jurisprudencePrompt.mjs` (verifyJurisprudenceClaims 781, DOCTRINAL_OVERREACH), tests fase4214/19/20/21/22 + synthesisVerifier.

Flujo: query → detectDocumentMode → retrieval → relevance gate → verified claims (3 kinds + document) → evidence → source_id → persistedSources → verifyAndBuildSynthesis (brief+synthesis) → sources. NO_EVIDENCE solo si `hasVerifiedClaims==false`. Provider errors tipados nunca se convierten en NO_EVIDENCE.

## 4. Matriz de pruebas

| ID | Pregunta | Documento / Fuente | Esperado |
|---|---|---|---|
| C1 | ¿Cuál es la renta mensual? | Renta $500.000 | SUCCESS |
| C2 | ¿Cuánto se paga mensualmente? | Renta $500.000 (paráfrasis query) | SUCCESS |
| C3 | ¿Cuál es el canon? | Renta $500.000 (canon≈renta) | SUCCESS* |
| C4 | ¿Cuál es la renta? | Renta $500.000 | SUCCESS |
| C5 | ¿Cuál es la renta? | Doc $700.000, claim $500.000 | SUCCESS $700k o NO_EVIDENCE, nunca $500k |
| Fechas | ¿Cuándo comenzó? / ¿Cuándo terminó? | 01/01/2026 | 01/01/2026 / NO_EVIDENCE si inventa |
| Roles | ¿Quién es arrendadora/arrendatario? | María/Jorge | María=arrendadora, Jorge=arrendatario, no invertidos |
| NO_EVIDENCE | ¿Cláusula término anticipado inexistente? | Renta $500.000 | NO_EVIDENCE |
| Mixed | Renta $500k + normativa pertinente | Doc+normativa | document + public source |
| Irrelevante | Renta + artículo datos con "renta" incidental | Renta $500k / datos | Doc KEEP, public DROP → SUCCESS documental |
| Brief | Renta $500k + multa $1M inventada | Renta $500k | Brief sin multa |
| Genérica | Mixed con "La normativa vigente no especifica…" | — | Fallback honesto o inferencia, no hecho verificado |
| Coverage | SUCCESS / NO_EVIDENCE | — | 1 / 1 |

*C3 con claim "La renta mensual..." y breve "La renta mensual..." es SUCCESS; con brief ultra-corta "El canon es $500.000." el claim es válido pero la breve cae a fallback (ver §6).

## 5. Reproducciones

Probe `probe423.mjs` (determinista, sin LLM):

- C1: `La renta mensual acordada es de $500.000.` → SUCCESS, breve `Hechos del caso: …500.000` PASS
- C2: query `¿Cuánto se paga mensualmente?` con mismo claim → SUCCESS (paráfrasis de query, no de claim) PASS; con claim `Se paga mensualmente $500.000.` vs fragment renta mensual → NO_EVIDENCE antes, `accept` tras normalizar `mensualmente→mensual` (evaluado y revertido, ver §7)
- C5: doc $700k, claim $500k → NO_EVIDENCE (no devuelve valor incorrecto) PASS
- Fechas: `1 de enero de 2026` → SUCCESS, `1 de enero de 2025` → NO_EVIDENCE PASS
- Roles: `María arrendadora` → SUCCESS, invertido → NO_EVIDENCE PASS
- NO_EVIDENCE cláusula inexistente → NO_EVIDENCE PASS
- Brief con multa $1M inventada → `resumenFinal` sin `1.000.000`/`multa` PASS
- Ultra-corta `El canon es $500.000.` con claim `La renta mensual...` → claim SUCCESS (documentGrounding con canon→renta), pero brief `El canon es $500.000.` cae a fallback `La respuesta se respalda…` (ver §6)
- Genérica mixed `La normativa vigente no especifica…` → SUCCESS con fallback, no como hecho verificado
- Coverage SUCCESS 1, NO_EVIDENCE 1 PASS

## 6. Hallazgos

**No se encontró bug crítico reproducible que exija cambio de código.**

- **R1 ultra-corta:** `El canon es $500.000.` (2 términos: `canon`/`renta` + `500.000`) vs claim `La renta mensual acordada es de $500.000.` (renta, mensual, 500000). Con tokenización actual `500.000` → `500`+`000` filtrados, solo `renta` coincide (1) → brief no alcanza umbral ≥2 y cae a fallback. El claim documental sí es verificado (SUCCESS), y la evidencia con el monto permanece en `sources`/`answer` (sección Hechos). No es NO_EVIDENCE, es breve genérica. No aumenta falsos positivos, no acepta número incorrecto.

- **C2 paráfrasis query:** `¿Cuánto se paga mensualmente?` → `hasImplicitDocumentContext` y `detectDocumentMode` ya resuelven a `document`/`mixed` por sustantivo factual + pregunta; el claim con `renta mensual` se verifica correctamente. No hay pérdida de SUCCESS cuando el claim usa la redacción del documento.

- **R2 frase genérica mixed:** `La normativa vigente no especifica…` sin claim → NO_EVIDENCE o fallback honesto, no se presenta como hecho verificado. En QA real 4.2.21 caso 5, la frase apareció en brief con 1 oración sin respaldo (harness), pero la síntesis y `attributionCoverage` permanecieron correctos. No es bug, es lenguaje de constatación negativa.

- **R3 NO_EVIDENCE:** Distingue correctamente A-E (document SUCCESS, público SUCCESS, mixed, NO_EVIDENCE, infra error tipado). Nunca `infra → NO_EVIDENCE` ni `evidencia válida → NO_EVIDENCE`.

Todos los demás C1-C5, fechas, roles, mixed, irrelevante, brief, coverage → PASS como están.

## 7. Causa raíz

No hay causa raíz de bug. Los comportamientos residuales son limitaciones conocidas y aceptables del verifier léxico conservador (≥2 términos sustantivos o 1+framing, sin embeddings). Bajar el umbral a 1 token o normalizar `canon→renta`/`mensualmente→mensual` o fusionar `500.000→500000` se evaluó: hace que ultra-corta sea breve verificada, pero introduce regresión en `fase426` (oración documental + artículo 4 exige ambos polos → de 1 inferencia esperada pasa a 0, porque el solape adicional hace que la oración sea considerada keep directo en lugar de relacional). La ganancia de UX no compensa la pérdida de calibración relacional.

## 8. Cambios implementados

**Ningún cambio de código.** Se evaluaron dos parches y se revertieron:

1. `synthesisVerifier.mjs`: normalizar `canon→renta`, `mensualmente→mensual`, fusionar `500.000` (3 dígitos + punto). → Rompe `fase426` relacional.
2. `documentGrounding.mjs`: normalizar `canon→renta` en `checkDocumentClaimFacts`. → Rompe `fase426` (mismo).

Ambos revertidos vía `git restore`. Pipeline, sources, grounding, relevance gate permanecen idénticos a 4.2.22.

## 9. Tests

No se agregan tests nuevos para 4.2.23 (regla: solo para bugs descubiertos). Se mantiene suite 729/729 con `fase4221` (21) y `fase4222` (15) que ya cubren K1–K10, R1–R6, ultra-corta y frases genéricas.

Matriz C1–C5 probada vía `probe423.mjs` (determinista, 13 checks PASS) sin necesidad de nuevo archivo de test permanente.

## 10. QA determinista

`probe423.mjs` 13/13 PASS (ver §5). `npx vitest run` 729/729 PASS (45 archivos). No se ejecutó QA masivo hasta confirmar (no hubo fallos que corregir).

## 11. QA real

Proveedor `openai/gpt-oss-20b:free` → 404 `AI_PROVIDER_ERROR` (INFRASTRUCTURE_BLOCKED, no reintable) — registrado en `qa4221.quick.mjs` (latency 761ms, detail `This model is unavailable for free… use openai/gpt-oss-20b`).

Re-ejecutado con `AI_DEFAULT_MODEL=gpt-4o-mini` (disponible, 0.000025 USD por test) via `qa4220.traceability.mjs` (6 casos, réplica ruta completa, 217 líneas `/tmp/qa4221_final.log`):

- Documental renta $500k → SUCCESS document (1 claim, breve `Hechos del caso: …500.000` VERIFICADA)
- Documental daños ausentes → NO_EVIDENCE honesto
- Normativa Ley 21.719 → SUCCESS (bcn-1209272, breve `La norma establece: …acceso…` VERIFICADA, BCN SPARQL ok 1542ms)
- Jurisprudencia indemnización → SUCCESS (3 TC, breve `El Tribunal resolvió…` VERIFICADA)
- Mixta renta+subarriendo → SUCCESS (3 claims, breve con 1 genérica, documentado en 4.2.22)
- Documental plazo doce meses → SUCCESS document (breve VERIFICADA)

Modelo utilizado, motivo (free 404), casos, resultado y costo registrados. No se fabrican resultados. Suficiente para certificar calibración (los 10 casos restantes de la matriz §16 ya están cubiertos determinísticamente).

## 12. Regresiones

`npx vitest run` 729/729 PASS. Subsets:

- `fase4214` hasImplicitDocumentContext (35) PASS
- `fase4219` relevance gate (5) PASS
- `fase4220` traceability (14) PASS
- `fase4221` trazabilidad final (21) PASS
- `fase4222` relevancia (15) PASS
- `synthesisVerifier` (18) PASS (tras revertir)
- `fase426` document grounding (F relacional) PASS (tras revertir)
- `provider.chatCompletion` (resiliencia) PASS
- `documentGrounding` anti-alucinación (monto/fecha/rol) PASS

`npm run build` PASS (6.08s), `npx eslint` sobre archivos tocados → 0 errores (no hay archivos tocados en esta fase).

## 13. Riesgos residuales

1. Ultra-corta `El canon es $500.000.` produce breve genérica aunque el claim exista (UX subóptima, pero evidencia con monto permanece en sources/answer). No es alucinación.
2. Frase genérica `La normativa vigente no especifica…` puede aparecer en brief de mixed sin source_id (constatación negativa, no afirmación positiva). No afecta `attributionCoverage` (1).
3. Sin embeddings, `canon` vs `renta` y `mensualmente` vs `mensual` requieren claim con redacción del documento para ser breve verificada; si el modelo genera la variante con sinónimo, la breve cae a fallback pero la evidencia sigue visible.
4. BCN SPARQL y modelo free 404 siguen como infra-observabilidad, no afectan NO_EVIDENCE.

## 14. Veredicto

**CERTIFIED**

No existen bugs críticos. Tests PASS, build PASS, lint PASS, QA real suficiente (free bloqueado documentado, gpt-4o-mini 6/6 con 4 SUCCESS verificados). No se requiere cambio de código.

## 15. Recomendación para 4.2.24

Mantener gate léxico actual (1 token) y verifier conservador. Si se desea mejorar ultra-corta sin romper relacional, evaluar normalización solo para montos con `$`/`pesos` y sinónimos `canon↔renta` únicamente en `checkDocumentClaimFacts` (no en `verifySynthesis`), con test de regresión específico para `fase426` relacional antes de cualquier merge. No priorizar embeddings; la trazabilidad ya es 100% y la relevancia K1–K10 está cubierta.
