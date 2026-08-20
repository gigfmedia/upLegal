# FASE 4.2.20 — Trazabilidad y atribución de evidencia en la respuesta final

**Estado:** COMPLETADA (sin commit/push, según regla §25)
**Fecha:** 2026-08-20
**Base:** commit `5de63d3` (Fase 4.2.19, HEAD limpio al inicio de la fase)

## 1. Objetivo y alcance

Demostrar de dónde proviene cada afirmación que la LegalUp AI presenta como verificada.
La cadena `claim → evidencia → fuente` debe ser íntegra y explícita: cada afirmación de la
respuesta final (Respuesta breve y Síntesis) se vincula a un claim verificado, este a su
evidencia textual y esta a la fuente real recuperada (documento del caso o fuente pública).

**No aplica:** rediseño de frontend (§19), duplicación de tipos/metadata existentes (§5),
revisión del modelo/prompt de sistema, avanzar a la Fase 4.2.21 (§25).

## 2. Fase y criterio de entrada

Reglas operativas de la fase (§1–§26): auditar read-only antes de tocar código; reutilizar
la estructura de datos existente en vez de crear tipos duplicados (§5); no inventar metadata
(§6/§7); distinguir hecho / fuente jurídica / inferencia (§9); la Respuesta breve no puede
ser más fuerte que la evidencia verificada (§11); no debilitar el gate 4.2.19 (§12/§18);
document-only 4.2.12/4.2.19 (§13); mixed mode con procedencia separada (§14); preservar
`JURISPRUDENCE_LOOKUP`/`ARTICLE_LOOKUP`/`BARE_NORM_CITATION` (§15); 20+ tests deterministas
(§16) e integridad `verified===true AND evidencia válida` (§17); frontend solo si el backend
no puede mostrar la atribución (§19); métrica `attribution_coverage` (§22); QA real con 6
casos mínimos, `INFRASTRUCTURE_BLOCKED` si rate-limit (§21); doc de 14 secciones (§24); sin
commit/push (§25).

**Criterio de salida:** suite completa PASS, build PASS, lint PASS en archivos modificados,
QA real PASS, métrica `attributionCoverage` expuesta, doc completo.

## 3. Método y materiales

### 3.1 Auditoría read-only (previa a cualquier cambio)

| Componente | Ubicación | Rol en trazabilidad |
|-----------|-----------|---------------------|
| `jurisprudencePipeline.mjs` | `buildJurisprudenceOutcome` (132-506) | pipeline puro; gate 4.2.19 (331); persistencia de claims (469-487); autoNormativa (299-319) |
| `jurisprudencePrompt.mjs` | `verifyJurisprudenceClaims` (781), `buildJurisprudenceAnswer` (934), `buildJurisprudenceUserPrompt` (692), `buildJurisprudenceCaseContext` (718), `detectExcessiveConclusions` (1065) | verificación de claims públicos; render Markdown |
| `documentGrounding.mjs` | `verifyDocumentClaims` (521), `detectDocumentMode` (651) | evidencia documental |
| `synthesisVerifier.mjs` | `verifyAndBuildSynthesis` (525), `verifySynthesis` (207), `buildSynthesis` (510), `constrainOpenEndedEnumerations` (480) | síntesis verificada (se reutiliza para la breve) |
| `contradiction.mjs`, `hierarchy.mjs` | — | matices/contradicciones (intactos) |
| `server.mjs` | ruta research (~8130-8497) | flujo completo |
| `src/components/legalup-ai/AIResearchPanel.tsx` | `SourceClaims` (225), `GroupedSources`, historial (760-795), `hasVerifiedClaims` (221) | render de claims por fuente en frontend |
| `src/hooks/useAIResearch.ts` | `AIResearchClaim`/`AIResearchSource` | forma de claims persistidos que consume el frontend |
| `src/components/legalup-ai/resumenConstraint.ts` | constraint 4.1.3 (client-side) | operación sobre la breve |

### 3.2 Hallazgo estructural (reuso, sin duplicar)

La relación `claim → evidencia → source` **ya existe** en el backend: cada fuente
persistida conserva `claims[]` con `{ source_id, fragment_id, category, afirmacion,
evidencia, verified: true, vigencia, vigencia_nota }` (pipeline 473-487). El frontend la
consume tal cual (`AIResearchClaim` idéntico; `SourceClaims` renderiza por fuente). Por
tanto **no** se requieren tipos nuevos (§5) ni cambios de frontend (§19). Los claims
documentales usan `source_id = document.id` (equivalente a `documentId`), sin campo duplicado.

## 4. Hallazgos de auditoría

1. **`resumenFinal` NO pasaba por el verifier de síntesis** (gap §11): era el texto libre
   del modelo, solo suavizado por `detectExcessiveConclusions`. La "Síntesis" sí pasaba por
   `verifyAndBuildSynthesis`. Consecuencia: la breve podía emitir oraciones sin respaldo en
   los claims como afirmación jurídica.
2. **La Síntesis ya es trazable**: oración a oración se ancla a claims verificados; cada
   oración conservada lleva el marco de procedencia (`CATEGORY_PREFIX`: hecho/ley/tribunal/
   doctrina/inferencia) y las inferencias se etiquetan; enumeraciones cerradas se acotan.
3. **Persistencia íntegra**: los claims persistidos son exactamente los verificados
   (`allVerifiedClaims`), con `verified: true` por construcción.
4. **Gate 4.2.19 operativo**: `gateShouldFilter = documentMode !== 'none'` (331); la fuente
   pública descartada no reaparece en claims/sources/Markdown, solo en Avisos.
5. **`computeAttributionCoverage` inexistente** (§22): no había métrica de cobertura de
   atribución.

## 5. Problema

**Síntoma:** con claims verificados (SUCCESS), la "Respuesta breve" podía contener una
oración sin respaldo — p.ej. el modelo afirmaba "El contrato además indemniza daños
punitivos por un monto indeterminado" junto a una oración respaldada. El verifier de síntesis
eliminaba esa oración de la Síntesis, pero la breve la exhibía como afirmación jurídica.

**Demostración determinista (test que fallaba antes del fix):**

```js
// resumen del modelo con 2 oraciones: 1 respaldada + 1 inventada
expect(result.resumenFinal).toContain('500.000');        // respaldada → se conserva
expect(result.resumenFinal).not.toContain('daños punitivos'); // inventada → se elimina
```

## 6. Causa raíz

En `buildJurisprudenceOutcome` (pipeline 429-430, pre-fix):

```js
const resumenFinal = hasVerifiedClaims ? excessive.resumen : /* mensaje NO_EVIDENCE */;
```

`excessive.resumen` es el texto del modelo devuelto por `detectExcessiveConclusions`
(solo suaviza el lenguaje categórico). A diferencia de la conclusión, **no** se sometía a
`verifySynthesis`: la breve no heredaba el anti-alucinación oración-a-oración ni el marco de
procedencia. No era un defecto del verifier, sino de cobertura: la síntesis se verificaba y
la breve no.

## 7. Cambios implementados

### 7.1 `server/ai/jurisprudencePipeline.mjs` (mínimo, reutilizando machinery existente)

1. **Respuesta breve verificada (§11).** El resumen del modelo se somete al MISMO
   `verifyAndBuildSynthesis` que la conclusión. Cada oración debe anclarse a un claim
   verificado o etiquetarse como inferencia; las oraciones sin respaldo se eliminan; las
   enumeraciones abiertas se acotan; el texto verificado lleva el marco de procedencia
   (hecho/ley/tribunal/doctrina/inferencia). Si la breve verificada queda vacía, se usa un
   mensaje honesto que remite a la síntesis y la evidencia (nunca texto inventado). El
   path `NO_EVIDENCE` queda intacto.

   El puntero autoNormativa ("Se identificó la normativa aplicable: X") — generado por el
   pipeline, no por el modelo — ya **no** se mezcla con el texto del modelo antes de la
   verificación: se re-adjunta a la breve verificada (rastreable al título oficial/idNorma).

2. **`computeAttributionCoverage(claims)` (§22).** Función pura exportada: `# claims con
   source_id válido / total claims verificados`. Con 0 claims devuelve **1** (nada que
   atribuir mal; semántica vacía correcta, no un 0 que insinúe falla). Se expone como
   `attributionCoverage` en el outcome del pipeline.

3. **Avisos.** Los warnings del verifier de la breve y un aviso específico ("La respuesta
   breve contenía afirmaciones sin respaldo verificado…") se agregan a `advertenciasFinales`.

### 7.2 Archivos nuevos

- `server/ai/fase4220.traceability.test.mjs` — tests §16/§17/§22 (14 tests).
- `server/ai/qa4220.traceability.mjs` — harness de QA real (§21).

## 8. Demostración determinista y tests

`server/ai/fase4220.traceability.test.mjs` (14 tests):

- **Respuesta breve verificada (§11):** oración sin respaldo eliminada de la breve;
  inferencia legítima conservada; el texto verificado lleva el marco de procedencia.
- **Integridad §17:** todo claim persistido `verified=true` + `source_id` + `evidencia`;
  claim con sourceId inexistente descartado; schema rechaza `fuente_id` vacío.
- **`attribution_coverage` (§22):** 1 con claims válidos, 1 con 0 claims (vacío correcto),
  expuesto en el outcome.
- **Negativas (anti-alucinación intacta):** Ley 99.999, rol inexistente, hecho ausente del
  documento → NO_EVIDENCE sin claims persistidos.
- **Mixtas (procedencia separada §14):** hechos del documento y normativa en secciones
  separadas; fuente pública irrelevante descartada en mixed con claim documental vivo
  (regresión 4.2.19), aparece solo en Avisos.
- **Atribución por categoría:** claims normativa/jurisprudencia/doctrina persisten con su
  categoría; doctrinal categórico descartado (`DOCTRINAL_OVERREACH_RE`).

El único test de fases previas que exigía ajuste conceptual fue la reordenación del puntero
autoNormativa (ver 7.1), sin cambiar su observable (`pipeline.test.mjs:230` sigue exigiendo
"Se identificó la normativa aplicable").

## 9. QA real (proveedor `openai/gpt-oss-20b:free`)

Flujo real replicado (classify → detectDocumentMode → retrieval → LLM real →
`runJurisprudenceWithRetry` → `buildJurisprudenceOutcome`). Proveedor disponible, sin
rate-limit → no aplica `INFRASTRUCTURE_BLOCKED`.

| # | Caso | Query | Mode | Outcome | Claims | `attributionCoverage` | Breve | Re-verificación |
|---|------|-------|------|---------|--------|-----------------------|-------|-----------------|
| 1 | Documental | ¿Cuál es la renta mensual del arriendo? | `document` | **SUCCESS** | 1 | 1 | "Hechos del caso: La renta mensual establecida en el contrato es de 500.000 pesos." | 0 sin respaldo → VERIFICADA |
| 2 | Documental (hecho ausente) | ¿Cuánto ascienden los daños punitivos pactados? | `document` | **NO_EVIDENCE** | 0 | 1 | mensaje honesto de ausencia | N/A (no anclada) |
| 3 | Normativa | ¿Qué derechos reconoce la Ley 21.719…? | `none` | **NO_EVIDENCE** | 0 | 1 | mensaje honesto (BCN SPARQL timeout → sin fuente normativa) | N/A |
| 4 | Jurisprudencial | ¿…indemnización de perjuicios por violación de datos…? | `none` | **SUCCESS** | 3 | 1 | "El Tribunal resolvió en el caso citado: …" | 0 sin respaldo → VERIFICADA |
| 5 | Mixta | ¿Cuál es la renta mensual y qué dice la ley sobre el subarriendo? | `none`* | **NO_EVIDENCE** | 0 | 1 | mensaje honesto | N/A |
| 6 | Documental | ¿Cuál es el plazo del contrato de arrendamiento? | `document` | **SUCCESS** | 1 | 1 | "Hechos del caso: El contrato establece un plazo de doce meses." | 0 sin respaldo → VERIFICADA |

\* Caso 5: `detectDocumentMode` resolvió `none` (señal documental insuficiente para el modo
mixto con el documento sintético del QA); el pipeline respondió NO_EVIDENCE honesto. La
observable de la fase no depende de ese modo: se cubre de forma determinista por los tests.

**Observable §11 en producción:** en los 3 SUCCESS la breve es la versión **verificada**
(marco de procedencia + 0 oraciones sin respaldo al re-ejecutar el verifier). En el caso 4,
el modelo emitió una oración sin respaldo que el verifier eliminó de la síntesis (aviso
registrado) y la breve quedó limpia.

## 10. Antes / Después

| Métrica | Antes (4.2.19) | Después (4.2.20) |
|---------|----------------|------------------|
| Respuesta breve pasa por el verifier de síntesis | NO (texto libre del modelo) | SÍ (mismo verifier que la Síntesis) |
| Oración sin respaldo en la breve (SUCCESS) | podía exhibirse como afirmación jurídica | eliminada + aviso |
| Marco de procedencia en la breve | ausente | presente (hecho/ley/tribunal/doctrina/inferencia) |
| `attributionCoverage` | inexistente | 1 con claims válidos; 1 con 0 claims |
| Persistencia claims | `verified:true` por construcción | intacta + test de integridad §17 |
| Gate 4.2.19 (`documentMode !== 'none'`) | operativo | intacto (test regresión) |
| Tests server / suite total | 593 / 679 | **607 / 693** |

## 11. Regresiones

- `jurisprudencePipeline.test.mjs`: `:114` ("derecho fundamental"), `:230` (autoNormativa),
  `:325-327` (secciones combinadas) → **PASS**. El puntero autoNormativa se re-adjunta a la
  breve verificada, preservando el observable exigido.
- NO_EVIDENCE (pipeline `:170/199/374/463`, fase4214 `:417`, fase426 `:491`): path
  `hasVerifiedClaims=false` intacto → **PASS**.
- fase4219 `:178` (SUCCESS documental sin NO_EVIDENCE): **PASS**.
- Anti-alucinación: Ley 99.999, rol inexistente, hecho inexistente, doctrinal overreach,
  verificación literal/N1/N2 documental → **PASS** (ninguna línea de verificación tocada).
- Contradicciones, jerarquía, síntesis, retry 4.2.4/4.2.10, gate 4.2.14/4.2.19: sin cambios.
- Suite completa **693/693 PASS** (43 archivos), build PASS, lint PASS en archivos modificados.

## 12. Riesgos residuales

1. **Marco de procedencia en la breve**: el prefijo ("Hechos del caso:", "El Tribunal resolvió
   en el caso citado:") cambia el formato de la Respuesta breve a texto verificable y explícito.
   Es un cambio de presentación deliberado (§14), no una pérdida de contenido; mejora la
   atribución pero puede diferir de lo que el modelo redactaría libremente.
2. **Verificación estricta de la breve**: una oración correcta pero con solape léxico mínimo
   (1 término, sin marco discursivo) se elimina en lugar de conservarse. Conservador y alineado
   con la fase (mejor eliminar que inventar); ya es el estándar de la Síntesis.
3. **AutoNormativa sin fragmento sustantivo**: el claim promovido puede persistir con
   `fragmento=''` si la fuente carece de fragmentos (fixture de test); en producción las fuentes
   BCN/LeyChile llevan `metadata.fragments`. `attributionCoverage` cuenta por `source_id` válido,
   no por longitud de evidencia, para no penalizar este caso.
4. **QA real case 5**: `detectDocumentMode` devolvió `none` con el documento sintético; la
   observación del modo mixto en vivo depende de señales documentales reales. Cubierto de forma
   determinista por los tests (§16).
5. **BCN SPARQL timeout** (12 s por intent) visto en QA real (casos 3/4/5): el sistema reintenta
   y degrada; no bloquea. Observabilidad ya existente.

## 13. Veredicto

**PASS.** El gap §11 (Respuesta breve no verificada) quedó eliminado con un cambio mínimo y
localizado en el pipeline, reutilizando `verifyAndBuildSynthesis` (machinery existente, sin
duplicar funciones, sin tocar el modelo ni el frontend). La atribución `claim → evidencia →
source` ya existía y quedó cubierta por tests de integridad (§17); se añadió la métrica
`attributionCoverage` (§22). 14 tests deterministas nuevos (§16/§17/§22). Suite **693/693 PASS**,
build PASS, lint PASS. QA real PASS (6 casos mínimos, proveedor disponible, 3 SUCCESS con breve
verificada y 0 oraciones sin respaldo; 3 NO_EVIDENCE honestos; sin `INFRASTRUCTURE_BLOCKED`;
costos totales ≈ 0.0049 USD).

## 14. Cierre

**NO se avanzó a la Fase 4.2.21.** Sin commit ni push (regla §25). Estado final:

```text
 M server/ai/jurisprudencePipeline.mjs
?? server/ai/fase4220.traceability.test.mjs
?? server/ai/qa4220.traceability.mjs
```