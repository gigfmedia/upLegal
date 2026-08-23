# FASE 4.2.25 — Response UX / Brief Quality (Mejora Quirúrgica Ultra-corta)

**Estado:** PASS (sin regresiones, sin commit/push)
**Fecha:** 2026-08-24
**Base:** 729/729 PASS (4.2.24 CERTIFIED), 45 archivos, breve ya verificada

---

## 1. Objetivo

Mejorar la utilidad de la `brief` (Respuesta breve) cuando existe un claim documental verificado con `source_id` y evidencia válida, pero la brief generada por el LLM es demasiado corta, genérica o no pasa el verifier, sin aumentar el riesgo de alucinación. Prioridad: SEGURIDAD > TRAZABILIDAD > EVIDENCIA > CORRECCIÓN > UTILIDAD > BREVEDAD.

## 2. Estado inicial

- 729/729 PASS, build PASS, lint PASS, QA real gpt-4o-mini 6/6 (free 404 INFRASTRUCTURE_BLOCKED)
- Trazabilidad `pregunta→modo→document/source→claim→evidencia→source_id→brief→synthesis→sources` validada
- Riesgo residual 4.2.24: `El canon es $500.000.` con claim `La renta mensual es de $500.000.` cae a fallback genérico `La respuesta se respalda…` aunque el claim esté verificado y trazado (sources correctas). No es bug crítico, es limitación aceptada del verifier conservador (≥2 términos).

## 3. Auditoría

Inspeccionados: `jurisprudencePipeline.mjs` (brief 448-472, `verifiedDocumentos`, `persistedSources` 550, `attributionCoverage` 55/571, `verifyAndBuildSynthesis`), `synthesisVerifier.mjs` (verifySynthesis 217, CATEGORY_PREFIX, DISCOURSE_TERMS), `documentGrounding.mjs` (verifyDocumentClaims 521, checkDocumentClaimFacts 228), `jurisprudenceSources.mjs`, `jurisprudencePrompt.mjs`, tests fase4214/19/20/21/22 + synthesisVerifier, docs 4.2.23/24.

Confirmado: `brief` se genera vía `verifyAndBuildSynthesis(excessive.resumen, allVerifiedClaims)` con fallback a `verifiedBrief || normativaPromovidaPointer || 'La respuesta se respalda…'`. `verifiedDocumentos.kept` contiene claims con `source_id`/`fragmento` válidos. `persistedSources` enlaza claims a sources sin duplicar. `attributionCoverage` = `#source_id válido / total`.

## 4. Reproducción

`repro425.mjs` (determinista, sin LLM):

```js
doc: La renta mensual es de $500.000.
claim: La renta mensual es de $500.000. (verificado, source_id doc1, fragmento válido)
resumen LLM: El canon es $500.000.
→ brief antes: "La respuesta se respalda en las fuentes verificadas…" (genérico, no contiene 500.000)
→ esperado: "La renta mensual es de $500.000." (claim verificado)
```

Evidencia: `outcome SUCCESS`, `brief` sin monto, `persistedSources` correcto — UX pobre, no bug de grounding/retrieval/evidencia.

## 5. Causa raíz

El verifier `verifySynthesis` exige ≥2 términos sustantivos no discursivos o 1+framing para anclar una oración. `El canon es $500.000.` → tokens `canon` (→ `renta` tras normalizar? no, sin normalizar es `canon`) + `500.000` → `500`+`000` filtrados (<4) → solo `canon` (1) → no alcanza umbral y se elimina, aunque el claim `La renta mensual es de $500.000.` esté verificado. No es fallo de grounding (claim sí verificado), es conservadurismo del verifier para evitar falsos positivos. Solución global de sinonimia (`canon→renta`, `500.000→500000`) se evaluó y se descartó en 4.2.23 por romper `fase426` relacional (document+artículo 4).

## 6. Diseño

Capa `verifiedClaimBriefFallback` (nombre conceptual) ejecutada **después** de `verifyAndBuildSynthesis` y **antes** de decidir `resumenFinal`, solo si:

- `documentMode !== 'none'`
- `hasVerifiedClaims && verifiedDocumentos.kept.length >0`
- `!briefWithPointer` (breve verificada vacía y sin puntero normativo)
- `candidate` = primer `verifiedDocumentos.kept` con `afirmacion` + `source_id` + `fragmento` no vacío

Acción: `briefWithPointer = candidate.afirmacion` (reutiliza claim verificado tal cual, sin sinonimia, sin crear nuevo claim, sin duplicar fuente, sin reintroducir descartados). `briefFallbackUsed = true` para métrica. No se toca `synthesisVerifier` global, no se modifica `isSourceResponsiveToQuery`, `checkDocumentClaimFacts`, `computeAttributionCoverage`, RLS, chunking, budget.

## 7. Implementación

`server/ai/jurisprudencePipeline.mjs` (3 cambios, +18 líneas):

1. `const briefWithPointer` → `let` + bloque fallback 4.2.25 (líneas 455-475):

```js
let briefWithPointer = verifiedBrief && normativaPromovidaPointer ? ... : ...;
let briefFallbackUsed = false;
if (!briefWithPointer && hasVerifiedClaims && documentMode !== 'none') {
  const candidate = verifiedDocumentos.kept.find(c => c.afirmacion && c.source_id && c.fragmento?.trim());
  if (candidate) { briefWithPointer = candidate.afirmacion; briefFallbackUsed = true; }
}
```

2. `return { ..., briefFallbackUsed }` (línea 572) para observabilidad.

No se modifica `synthesisVerifier.mjs`, `documentGrounding.mjs`, `jurisprudenceSources.mjs`, frontend, RLS, provider.

## 8. Tests

Nuevo `server/ai/fase4225.briefQuality.test.mjs` — 15 tests:

- **Brief:** A monto (`La renta mensual es de $500.000.` → breve útil), ultra-corta `El canon es $500.000.` → fallback a claim (`La renta mensual es de $500.000.`, `briefFallbackUsed=true`), B fecha (`1 de enero de 2026`), C duración (`doce meses`), D partes (`María López y Jorge Pérez`), E cláusula QUINTA, F ausencia → NO_EVIDENCE sin fallback
- **Evidencia:** source_id inválido → no fallback, claim descartado por monto incorrecto → no fallback
- **Mixed:** document+irrelevante → solo document, documentMode none → no fallback
- **NO_EVIDENCE:** sin claim → NO_EVIDENCE
- **Anti-alucinación:** `La renta es $500.000. Existe multa $2M` → breve sin `2.000.000`/`multa`
- **Ultra-corta regresión:** `La renta mensual del inmueble es de $500.000.` + `El canon es $500.000.` → `resumenFinal === claim`
- **Attribution:** coverage 1 con fallback, persisted claim verified:true

## 9. QA determinista

`npx vitest run server/ai/fase4225.briefQuality.test.mjs` → 15/15 PASS
`npx vitest run` → 744/744 PASS (46 archivos, +15)

Matriz: renta/monto/fecha/plazo/partes/cláusula → breve verificada; ausencia → NO_EVIDENCE; claim descartado/source inválido → fallback bloqueado; mixed irrelevante → no leak; claim+texto inventado → solo claim; ultra-corta → claim verificado.

Objetivo `0 claims sin evidencia, 0 source_id inválidos, 0 fuentes descartadas reintroducidas, 0 claims descartados reintroducidos, 0 regresiones` alcanzado.

## 10. QA real

Free `openai/gpt-oss-20b:free` → 404 `AI_PROVIDER_ERROR` (INFRASTRUCTURE_BLOCKED, detail `unavailable for free… use openai/gpt-oss-20b`) — no retry, no fabricado.

Determinista ya cubre el fallback (no requiere LLM). QA real 4.2.24 con `gpt-4o-mini` (6 casos, 217 líneas, ~0.005 USD) sigue válido como referencia E2E (4 SUCCESS con breve VERIFICADA, 1 NO_EVIDENCE, 1 mixta). Para 4.2.25, el caso ultra-corta es determinista y no depende del modelo; QA real adicional no aporta señal nueva más allá de 4.2.24.

## 11. Regresiones

`npx vitest run` 744/744 PASS. Subsets:

- fase4214 (35) PASS
- fase4219 (5) PASS
- fase4220 (14) PASS
- fase4221 (21) PASS
- fase4222 (15) PASS
- synthesisVerifier (18) PASS (no tocado)
- fase426 relacional (F document+artículo → inferencia) PASS (a diferencia de 4.2.23, no se tocó verifier, por eso no hay regresión)

## 12. Seguridad

- 0 claims descartados reintroducidos (filtro `verifiedDocumentos.kept` + `source_id`/`fragmento` válidos)
- 0 fuentes descartadas reintroducidas (no se toca `persistedSources`/`referencedSources`)
- 0 claims sin evidencia (solo `verifiedDocumentos.kept` con evidencia)
- 0 source_id inválidos
- 0 leaks (no se expone `query`/`document`/`claim` en logs; solo `briefFallbackUsed` boolean)

## 13. Métricas

- Tests: 729 → 744 (+15)
- Build: 7.21s PASS
- Lint: 0 errores en archivos tocados
- `briefFallbackUsed`: `true` solo en ultra-corta con claim documental y brief vacía; `false` en brief válida, NO_EVIDENCE, mixed con brief verificada, documentMode none
- `attributionCoverage`: 1 en SUCCESS con fallback (mismo claim), 1 en NO_EVIDENCE vacío

No se registra contenido jurídico; solo `{brief_fallback_used:true, reason:"verified_claim_fallback"}` si se añade logging (metadata-only).

## 14. Limitaciones

- Fallback solo para `documentMode !== 'none'` y claim documental (no para jurisprudencia pura sin documento, aunque podría extenderse si la infraestructura lo permite).
- Usa `afirmacion` tal cual del claim verificado; si el claim contiene múltiples hechos (`comenzó 01/01/2026 y dura doce meses`) y la pregunta es solo `¿Cuándo comenzó?`, se reutiliza el claim completo (preferible a inventar paráfrasis; no se introduce NLP).
- Ultra-corta con `El canon es $500.000.` sigue requiriendo que el claim verificado sea `La renta mensual es de $500.000.` (redacción del documento); si el claim fuese también ultra-corto y no verificado, no hay fallback.
- Frase genérica `La normativa vigente no especifica…` en mixed sin claim documental sigue siendo fallback honesto, no se convierte en hecho.

## 15. Veredicto

**PASS** — La respuesta ultracorta deja de producir fallback innecesario cuando existe un claim documental verificado, reutilizando el claim sin relajar verifier, sin sinonimia global, sin tocar relevance gate, sin aumentar falsos positivos, sin romper trazabilidad `claim→evidencia→source_id→brief→synthesis→sources`.

**Recomendación 4.2.26:** Mantener fallback documental; evaluar extender a claim jurisprudencial verificado con misma lógica si aparece caso real (mismo guard `source_id`+`evidencia`).
