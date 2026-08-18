# Fase 4.2.13 — Auditoría de calidad post-4.2.12 y robustez de la respuesta final

**Fecha:** 17 de agosto de 2026
**Modelo:** `openai/gpt-oss-20b:free` (OpenRouter) · `AI_CHAT_MAX_TOKENS` 2400 · temperatura 0.2
**Naturaleza:** Auditoría READ-ONLY. NO se modificó código, prompts, retrieval, verificación, presupuesto, modelo ni frontend. NO se hizo commit. El único artefacto creado dentro del repo es este reporte (untracked).

---

## 1. Estado del repositorio

- HEAD: `6d58ffc feat(ai): improve document grounding robustness` (Fase 4.2.12).
- Working tree: limpio salvo `?? docs/ia-auditorias/FASE-4.2.11-auditoria-post-4.2.10.md` (preexistente, no tocado) y este reporte (untracked).
- **Validación base:**
  - `npx vitest run` → **37 archivos / 627 tests PASS**.
  - `npm run build` → **PASS**.
  - `npx eslint .` → **294 problemas (242 errors, 52 warnings) en 122 archivos preexistentes** (funciones de Supabase, componentes admin/blog/dashboard, `tailwind.config.ts`, etc.). **0 errores de lint en `server/ai/`, `server.mjs` y `src/components/legalup-ai/`** (verificado por grep sobre la salida).

## 2. Archivos inspeccionados (lectura READ-ONLY)

- `server.mjs` — ruta `/api/ai/cases/:caseId/jurisprudence` (:8040-8460): barrera 1 (`validateResearchQuery`, :8050), modo documento (`detectDocumentMode`), gate H5 (`shouldAllowDocumentOnlyFallback`, :8164-8184), presupuesto dinámico (`allocateDynamicContextBudget`, :8193), selección de fuentes (:8204), evidencia documental (:8252), retry de schema (:8284), estados SUCCESS/NO_EVIDENCE/INVALID_RESPONSE (:8346-8357), armado de la respuesta HTTP (:8420-8434).
- `server/ai/jurisprudencePipeline.mjs` — schema zod `.strict()` (:48-95), parse (:140), verificación de claims (:155-175), suavizado de conclusiones excesivas (:320-335), jerarquía (:340), contradicciones (:345), síntesis verificada (:361-368), NO_EVIDENCE (:375-388), armado de `answer` (:390-399).
- `server/ai/jurisprudencePrompt.mjs` — `buildJurisprudenceAnswer` (:925-989): Respuesta breve → Hechos del caso → Normativa → Jurisprudencia → Doctrina → Síntesis/Conclusión → Matices → Avisos; `detectExcessiveConclusions` (:1062-1090).
- `server/ai/jurisprudenceSources.mjs` — `hasCaseContentReference` (:2356-2366), `CASE_FACT_CONTENT_RE`/`CASE_REF_ANCHOR` (:2333-2342), `classifyLegalQuery` (:2399+).
- `server/ai/documentGrounding.mjs` — `detectDocumentMode` (:643-690), `shouldAllowDocumentOnlyFallback` (:290-298), verificación documental (`verifyDocumentClaims` en :518-622), chunking (:309-320).
- `server/ai/provider.mjs` — `extractJson` (:55-67), `OUTPUT_TOKEN_LIMIT` (:320-330), `createLlmCallBudget` (:189).
- `server/ai/synthesisVerifier.mjs` — verificación de síntesis oración por oración (respaldada/eliminada/inferencia), `buildSynthesis` con prefijos por categoría (:497-519), enumeraciones cerradas (:422-495).
- `server/ai/contradiction.mjs` — norma vs reglamento, jurisprudencia vs jurisprudencia, norma vs jurisprudencia; conserva ambas fuentes, no resuelve.
- `server/ai/hierarchy.mjs` — orden de presentación por rango; matices de mismo rango y norma derivada.
- `src/components/legalup-ai/AIResearchPanel.tsx` — render del markdown (`item.answer`, :751), fuentes agrupadas (:755-756), claims con evidencia (:225-279), `errorToMessage` (:447-478), caja de avisos (:650-675).
- `src/components/legalup-ai/resumenConstraint.ts` — recorte de enumeraciones abiertas solo en "Respuesta breve" (:114-144).
- `src/hooks/useAIResearch.ts` — `buildSourceEvidencePlan` (:67-88).

## 3. Dataset sintético (contrato de arrendamiento)

Documento único del caso `contrato-arriendo-4213.pdf` (vivienda habitacional, Providencia):

| Hecho | Cláusula / valor |
|---|---|
| Arrendadora | María López |
| Arrendatario | Jorge Pérez |
| Inicio | 1 de enero de 2026, 12 meses |
| Renta | $500.000/mes (transferencia) |
| Garantía | $1.000.000 (devuelta al término, descontados adeudos) |
| Término anticipado | QUINTA: aviso previo por escrito de **60 días** |
| Subarriendo | SÉPTIMA: prohibido sin autorización previa y escrita |
| Vivienda | Habitacional |

**Ausente deliberadamente:** fecha exacta de entrega, reparaciones posteriores, estado del inmueble, daños, devolución efectiva de la garantía (para evaluar presente/ausente/inferido).

## 4. Matriz completa de consultas (47 consultas, 57 runs)

Leyenda: `pred` = modo que el gate determinístico **predice** (correcto según el SPEC); `real` = modo que corrió; `match` = ¿coinciden?; estado = SUCCESS / NO_EVIDENCE / NO_SOURCES_FOUND / ERROR. Nota: los ítems E2 y E4 corrieron en modo `document` (no `mixed` como predije en el SPEC) y sus respuestas fueron correctas y ancladas al documento, por lo que esa diferencia se cuenta como aceptable, no como falla.

| id | Consulta | pred | real | match | estado | Veredicto |
|---|---|---|---|---|---|---|
| A1 | ¿Cuál es la renta mensual? | document | none | ✗ | SUCCESS | **FAIL CRÍTICO** (responde Ley 15.474 de funcionarios) |
| A2 | ¿Quiénes son las partes? | document | document | ✓ | SUCCESS | PASS (M. López / J. Pérez) |
| A3 | ¿Cuándo comenzó el contrato? | document | none | ✗ | SUCCESS | **FAIL CRÍTICO** (inventa contratos 2015/1965 de jurisprudencia) |
| A4 | ¿Cuánto se entregó como garantía? | document | none | ✗ | NO_EVIDENCE | FAIL (no usa el doc; el doc tiene el dato) |
| A5 | ¿Existe cláusula de término anticipado? | document | document | ✓ | SUCCESS ×2 | PASS (QUINTA, 60 días) |
| A6 | ¿Se puede subarrendar? | document | none | ✗ | NO_SOURCES_FOUND | FAIL (no usa el doc) |
| A7 | ¿Qué dice la cláusula QUINTA? | document | document | ✓ | SUCCESS | PASS |
| B1 | ¿Qué riesgos tiene el contrato? | document | document | ✓ | SUCCESS | PASS (5 claims doc) |
| B2 | ¿Hay cláusula que permita terminarlo antes? | document | document | ✓ | SUCCESS ×2 | PASS |
| B3 | ¿Qué obligaciones tiene el arrendatario? | document | none | ✗ | NO_EVIDENCE | FAIL |
| B4 | ¿Qué plazo establece el contrato? | document | document | ✓ | SUCCESS | PASS (12 meses desde 1/1/2026) |
| B5 | ¿Qué pasa con la garantía? | document | none | ✗ | SUCCESS | **FAIL CRÍTICO** (responde "garantías constitucionales" de libertad de trabajo) |
| B6 | ¿Las partes pueden poner término anticipado? | document | document | ✓ | SUCCESS ×2 | PASS |
| B7 | ¿El arrendatario puede subarrendar? | document | none | ✗ | NO_SOURCES_FOUND | FAIL |
| C1 | ¿Cuánto paga Jorge? | document | none | ✗ | NO_EVIDENCE | FAIL |
| C2 | ¿Cuánto tendría que devolver María? | document | none | ✗ | NO_SOURCES_FOUND | FAIL |
| C3 | ¿Qué fecha de inicio aparece? | document | none | ✗ | SUCCESS | **FAIL CRÍTICO** (responde "préstamos de excepción 2014 / permiso edificación 2021") |
| C4 | ¿Quién tiene obligación de avisar? | document | none | ✗ | NO_EVIDENCE | FAIL |
| C5 | ¿Qué condiciones existen para terminar? | document | none | ✗ | SUCCESS ×2 | PARTIAL (doctrina de buena fe, no el contrato) |
| C6 | ¿Hay autorización para subarrendar? | document | none | ✗ | NO_EVIDENCE | FAIL |
| D1 | ¿En qué estado estaba el depto. al entregar? | document | none | ✗ | NO_EVIDENCE ×2 | PARTIAL (no inventa, pero mensaje "fuentes públicas") |
| D2 | ¿Cuánto gastó en reparaciones? | document | none | ✗ | NO_SOURCES_FOUND | FAIL |
| D3 | ¿Por qué Jorge dejó el depto.? | document | none | ✗ | NO_EVIDENCE | PARTIAL (honesto) |
| D4 | ¿Hubo daños? | document | none | ✗ | SUCCESS | **FAIL CRÍTICO** (responde daños patrimoniales/morales del TC) |
| D5 | ¿Se devolvió la garantía? | document | none | ✗ | NO_EVIDENCE | PARTIAL (honesto) |
| E1 | ¿QUINTA compatible con art. 1545 CC? | mixed | mixed | ✓ | SUCCESS → NO_EVIDENCE | PARTIAL (calibrado, no-determinista) |
| E2 | ¿Riesgos jurídicos de la cláusula? | mixed | document | ◐ | SUCCESS | PASS (análisis doc + aviso de ausencia de norma) |
| E3 | ¿Plazo de aviso de 60 días es válido? | document | none | ✗ | SUCCESS | PARTIAL (TC cita DFL N° 205 art. 41, no el contrato) |
| E4 | ¿Qué normativa es relevante? | mixed | document | ◐ | SUCCESS | PASS (8 claims doc) |
| F1 | ¿TC sobre libertad contractual? | none | none | ✓ | SUCCESS | PASS (TC, contrato de salud) |
| F2 | ¿Jurisprudencia sobre término anticipado de arriendo? | none | none | ✓ | NO_EVIDENCE | FAIL (retrieval público sin evidencia) |
| F3 | ¿Fallos sobre incumplimiento de arriendo? | none | none | ✓ | NO_EVIDENCE | FAIL (retrieval público sin evidencia) |
| G1 | ¿Qué dice el artículo 1545? | none | none | ✓ | SUCCESS ×2 | PASS ("ley del contrato" + aviso de texto no disponible) |
| G2 | ¿Cuál es el artículo aplicable? | none | none | ✓ | NO_SOURCES_FOUND | PARTIAL (vaga) |
| G3 | ¿Qué establece la Ley 18.101? | none | none | ✓ | SUCCESS | PASS (procedimiento monitorio de rentas) |
| H1 | ¿Puedo terminarlo? | none | none | ✓ | NO_SOURCES_FOUND | PARTIAL (no alucina; 422 honesto) |
| H2 | ¿Es válido? | none | none | ✓ | NO_EVIDENCE | PARTIAL (honesto) |
| H3 | ¿Esto me sirve? | none | none | ✓ | SUCCESS | PASS (calibrado: "no se relaciona con la problemática") |
| H4 | ¿Puedo demandar? | none | none | ✓ | SUCCESS | PARTIAL (off-topic: patentes Ley 19.039, hedged) |
| H5 | ¿Qué hago? | none | none | ✓ | SUCCESS | PARTIAL (off-topic: renta atribuida TC, hedged) |
| H6 | ¿Hay algún problema? | none | none | ✓ | SUCCESS | PARTIAL (off-topic: TC misceláneo, hedged) |
| I1 | ¿El contrato dice que la multa es de $3.000.000? | document | mixed | ✗ | NO_EVIDENCE ×2 | PASS (anti-alucinación: claim descartado, drop=1) |
| I2 | ¿Existe una cláusula OCTAVA? | document | document | ✓ | NO_EVIDENCE | PASS (anti-alucinación, drop=1) |
| I3 | ¿El contrato establece 90 días de aviso? | document | none | ✗ | NO_SOURCES_FOUND | PARTIAL (no alucina, pero no usa el doc) |
| I4 | ¿Jorge tiene autorización escrita para subarrendar? | document | none | ✗ | NO_SOURCES_FOUND | PARTIAL (no alucina, pero no usa el doc) |
| J1 | ¿La renta mensual es $700.000? | document | none | ✗ | NO_SOURCES_FOUND (+ 1 infra) | PARTIAL (no confirma la cifra falsa) |
| J2 | ¿La garantía es de $2.000.000? | document | none | ✗ | NO_SOURCES_FOUND | PARTIAL (no confirma la cifra falsa) |

## 5. Resultados

- **47 consultas** → **15 PASS (32%) · 16 PARTIAL (34%) · 11 FAIL (23%) · 5 FAIL CRÍTICO (11%)**.
- 57 runs: **30 SUCCESS, 16 NO_EVIDENCE, 10 NO_SOURCES_FOUND, 1 ERROR (infraestructura)**.
- Modos ejecutados: **40 none, 13 document, 4 mixed**. Solo 17/47 queries detectaron el documento del caso.
- Claims verificados: 33 (13 document, 11 jurisprudencia, 5 doctrina, 4 normativa). En SUCCESS, promedio 2,0 claims; 27/30 SUCCESS llevan advertencias (promedio 2,9).
- **Cumplimiento de umbrales del SPEC:**
  - 0 FAIL críticos → **NO** (5).
  - 0 respuestas falsas sobre documentos → **NO** (5).
  - 0 alucinaciones factuales → **NO** (5 respuestas factualmente falsas respecto al caso).
  - ≥95% clasificación documental correcta → **NO** (22/47 = 47% de las consultas documentales previstas cayeron a `none`).
  - ≥95% claims documentales verificados → **SÍ** (13/13; 100% de los claims documentales que llegaron se verificaron y anclaron).
  - 100% anti-alucinación rechazada → **SÍ** (I1, I2, I3, I4, J1, J2: nunca se presentó la afirmación falsa del usuario; el verifier la descartó → NO_EVIDENCE/NO_SOURCES_FOUND).
  - 0 errores de infra → NO_EVIDENCE → **SÍ** (el único ERROR fue AI_PROVIDER_RATE_LIMITED, que se propagó como error retriable, nunca como NO_EVIDENCE).
  - 0 divergencias graves resumen/síntesis → **SÍ** (en todos los SUCCESS, síntesis y resumen fueron coherentes; no se detectó contradicción).
  - ≥90% atribución adecuada → **SÍ** en los SUCCESS (citas con fuente + fragmento); pero ver sección 10.
  - No-determinismo factual <5% → **NO** (1/9 pares críticos comparables = 11%): E1-1 SUCCESS vs E1-2 NO_EVIDENCE.

## 6. Fallas

**A. 5 FAIL CRÍTICOS (respuesta factualmente falsa respecto al caso):** todas comparten el mismo mecanismo: consulta documental sin ancla explícita → modo `none` → retrieval público → el LLM responde con contenido de fuentes públicas **irrelevantes** presentado con total confianza (claims verificados, síntesis, avisos):

- A1 "¿Cuál es la renta mensual?" → *"la Ley 15.474 define la renta mensual… de un funcionario"* (incluso con aviso de "vigencia diferida").
- A3 "¿Cuándo comenzó el contrato?" → *"dos contratos con fechas 1 de febrero de 2015 y 1 de septiembre de 1965"*.
- B5 "¿Qué pasa con la garantía?" → *"garantías constitucionales de libertad de trabajo y privacidad"*.
- C3 "¿Qué fecha de inicio aparece?" → *"préstamos de excepción (17/3/2014) y permiso de edificación N° 3 (13/7/2021)"*.
- D4 "¿Hubo daños?" → *"daños patrimoniales, morales y de salud… TC"*.

**B. 11 FAIL no críticos:** consultas documentales que cayeron a `none` y terminaron en NO_EVIDENCE (A4, B3, C1, C4, C6) o NO_SOURCES_FOUND (A6, B7, C2, D2, F2, F3). Honestas (nunca inventan), pero inútiles: el dato sí está en el documento del caso.

**C. 16 PARTIAL:** respuestas honestas pero incompletas o descontextualizadas (ver matriz).

## 7. No-determinismo (10 críticas × 2)

| Par | Run 1 | Run 2 | ¿Divergente? |
|---|---|---|---|
| A1 | none · SUCCESS · falso | none · SUCCESS · falso | No (mismo tipo; redacción distinta) |
| A5 | document · SUCCESS · correcto | document · SUCCESS · correcto | No |
| B2 | document · SUCCESS · correcto | document · SUCCESS · correcto | No |
| B6 | document · SUCCESS · correcto | document · SUCCESS · correcto | No |
| C5 | none · SUCCESS · doctrina | none · SUCCESS · doctrina | No |
| D1 | none · NO_EVIDENCE | none · NO_EVIDENCE | No |
| **E1** | **mixed · SUCCESS (calibrado)** | **mixed · NO_EVIDENCE** | **SÍ (divergencia de estado)** |
| G1 | none · SUCCESS · correcto | none · SUCCESS · correcto | No |
| I1 | mixed · NO_EVIDENCE (drop=1) | mixed · NO_EVIDENCE (drop=1) | No |
| J1 | none · NO_SOURCES_FOUND | infra fail (no comparable) | — |

Único caso divergente: **E1** ("¿QUINTA es compatible con el art. 1545?"). E1-1 produjo un claim de documento + resumen calibrado ("no se puede determinar la compatibilidad sin el texto del 1545"); E1-2 quedó sin claims verificados → NO_EVIDENCE. Ninguno de los dos estados fabricó un hecho: la divergencia es de "respuesta calibrada" vs "sin evidencia". Aun así supera el umbral <5% (11% de los pares). El determinismo del *verifier* es el esperado; la variabilidad viene del JSON generado por el LLM.

## 8. Infraestructura

- **14 reintentos transitorios** observados en el run principal (todos AI_PROVIDER_RATE_LIMITED del modelo `:free`), absorbidos por el backoff de `chatCompletion`. Sobre 57 runs, solo **1 acabó en ERROR** después de agotar 4 intentos (J1-2).
- **0 errores de infraestructura convertidos en NO_EVIDENCE ni en respuestas falsas.** El error se propagó con su código (`AI_PROVIDER_RATE_LIMITED`), que el frontend mapea a un aviso con "Reintentar" (`RETRIABLE_CODES`).
- Conclusión: la capa de reintento funciona; la indisponibilidad de la capa gratuita del proveedor es un riesgo de disponibilidad operacional, no de integridad.

## 9. Síntesis (categoría K)

- La síntesis **solo se construye cuando hay claims verificados** (`verifyAndBuildSynthesis`, preferencia "eliminar antes que inventar"). En NO_EVIDENCE, `síntesisText` es `''` (verificado: 0/16 NO_EVIDENCE con síntesis).
- En todos los SUCCESS, la síntesis fue **coherente con el resumen y los claims**; los prefijos por categoría ("Hechos del caso", "La norma establece", "El Tribunal resolvió en el caso citado", "Sobre la base de las fuentes, puede inferirse") aparecen correctamente (ej. B1, A5, G1, H5).
- **Fortalaza verificada:** las oraciones sin respaldo se eliminaron con su aviso (apareció en A1, B1, E1, A5 y otros el aviso "Se eliminó de la síntesis una oración sin respaldo…").

## 10. Citas (categoría L)

- Formato de cita correcto en `answer`: `- **fuente**: afirmación ("fragmento")` con vigencia cuando aplica (A1 mostró "Vigencia diferida"). En modo documental, la fuente es `contrato-arriendo-4213.pdf` con su fragmento.
- **Nota de calidad:** el fragmento citado es a nivel de **chunk** (el chunk 0 suele incluir varias cláusulas), no la cláusula exacta. Ej. en A5/E1 el fragmento abarca desde el encabezado hasta la SÉPTIMA. La afirmación es precisa, pero el respaldo es más verboso de lo necesario. Menor, no bloqueante.
- Los claims con `afirmacion` + `fragmento` + `source.kind` se expusieron en la respuesta HTTP (`claims`), y el frontend los renderiza como "Evidencia del documento"/"Evidencia".

## 11. Frontend (categoría 26)

- `item.answer` se renderiza como markdown completo (`:751`); las secciones viajan dentro del markdown (incluido "**Respuesta breve**").
- "Fuentes verificables" agrupa por kind (Documentos del caso / Normativa / Jurisprudencia / Doctrina (no vinculante)) y cada claim muestra afirmación + evidencia + fragment_id; el badge teal "Documento privado del caso" aparece en modo documental.
- NO_EVIDENCE **no** se maneja con un string propio en el frontend: es un `outcome` del servidor que se convierte en advertencias y el resumen muestra el mensaje de ausencia de evidencia. OK.
- NO_DOCUMENT_EVIDENCE / NO_SOURCES_FOUND / AI_PROVIDER_* → `errorToMessage` + caja ámbar con "Reintentar" para códigos retriables. OK.
- **Observación:** el mensaje de NO_EVIDENCE en modo `mixed`/`document` (I1) dice *"en las fuentes públicas consultadas"*, mientras que I2 (document) dice *"en los documentos del caso"*. La redacción en mixed es confusa (debería referirse al documento). Menor.

## 12. Clasificación de fallos A–H

| Tipo | # | Descripción |
|---|---|---|
| **A. Retrieval** | 22 | Consultas documentales que corrieron en modo `none` (documento descartado, retrieval público irrelevante o vacío). Es la causa primaria de casi todo. |
| **B. Evidence** | 5 | Claims "verificados" sobre fuentes públicas irrelevantes se presentaron como respuesta (A1, A3, B5, C3, D4). El verifier confirma claim↔fuente, no relevancia↔intención del usuario. |
| **C. Context** | 0 | Ningún CONTEXT_TOO_LARGE (el presupuesto dinámico 4.2.7 funcionó). |
| **D. LLM** | 0 | El LLM no fue la causa raíz; produjo respuestas fieles a las fuentes que recibió. |
| **E. Synthesis** | 0 | La síntesis fue coherente y sin alucinaciones. |
| **F. Verification** | 0 | La verificación funcionó; descartó claims falsos del usuario (I1-I4, J1-J2). |
| **G. UX** | 2 | Mensaje de NO_EVIDENCE en mixed apunta a "fuentes públicas"; fragmentos a nivel chunk. |
| **H. Infra** | 1 | Rate-limit del modelo free (1 run fallido de 57, 14 reintentos absorbidos). |

## 13. Causa raíz

La causa raíz dominante es la **detección de modo documento (Fase 4.2.12 / H3) demasiado estricta**: `CASE_FACT_CONTENT_RE` exige un sustantivo de contenido **Y** un ancla de referencia (`contrato`, `documento`, `partes`, `caso`…), y `DOCUMENT_SIGNAL_RE` exige deíctico/verbo lector/"X del contrato". Toda consulta factual natural **sin ancla explícita** — "¿Cuál es la renta mensual?", "¿Qué fecha de inicio aparece?", "¿Se puede subarrendar?", "¿Hubo daños?" — cae a `mode: none`, y el documento del caso se descarta en silencio.

Las consecuencias son tres, en orden de gravedad:

1. **Retrieval irrelevante + verificación ciega a la relevancia** (FAIL críticos): el pipeline busca jurisprudencia/normativa pública, el LLM responde sobre la fuente recuperada con toda la maquinaria de verificación y citas funcionando — pero sobre la **pregunta equivocada**. El verifier certifica consistencia claim↔fuente y no puede detectar que la fuente no responde al usuario.
2. **NO_EVIDENCE / NO_SOURCES_FOUND** en consultas cuyos datos sí existen en el documento (FAIL no críticos): el gate H5 nunca aplica en `mode none` (`shouldAllowDocumentOnlyFallback` retorna false), así que no hay rescate documental.
3. **Anti-alucinación intacta**: cuando el usuario propone una premisa falsa (I1-I4, J1-J2), el verifier documental la descarta correctamente y no se fabrica nada — la red de seguridad funciona, pero su alcance se limita a los casos en los que el documento entra al contexto.

## 14. Comparación con Fase 4.2.8 (29 consultas)

| Métrica | 4.2.8 (29) | 4.2.13 (47) |
|---|---|---|
| PASS | 11 (38%) | 15 (32%) |
| Calibraciones correctas | 3 | — (parte de PASS/PARTIAL) |
| Flaky | 4 | 1 par divergente (E1) + 1 infra (J1) |
| Partial | 4 | 16 (34%) |
| FAIL críticos | **3** | **5** |
| Infraestructura | 4 | 1 (rate-limit) |
| Anti-alucinación (I/J) | no cubierto | **6/6 rechazos correctos** |
| Claims documentales verificados | n/a | 13/13 (100%) |
| Errores infra → NO_EVIDENCE | 0 | 0 |

**Evolución:** los 3 FAIL críticos de 4.2.8 eran de fabricación/alucinación y fueron resueltos por la verificación de 4.2.9-4.2.12 (hoy la anti-alucinación es 100% correcta y no hay síntesis fabricadas). Sin embargo, el endurecimiento progresivo de la detección documental (4.2.11/4.2.12) dejó un **falso negativo de modo**: 5 FAIL críticos nuevos por *descontextualización* (respuesta correctamente verificada sobre una fuente equivocada). El riesgo se desplazó de "inventar contenido" a "responder una pregunta distinta con fuentes públicas irrelevantes".

## 15. Veredicto

**La infraestructura de verificación, síntesis, anti-alucinación y no-fabricación de 4.2.9–4.2.12 es robusta y funciona (verificación documental 100%, anti-alucinación 100%, síntesis sin invenciones, infra sin envenenar resultados).** El cuello de botella ya no está en qué se verifica, sino en **qué se recupera**: la detección de modo documento deja fuera del contexto el documento del caso en ~47% de las consultas documentales naturales, y el pipeline responde entonces con fuentes públicas irrelevantes presentadas con autoridad (5 respuestas factualmente falsas respecto al caso).

Estado: **NO CERTIFICADO para producción** hasta resolver el falso negativo de detección documental. Es un problema de *recall* de `CASE_FACT_CONTENT_RE`/`CASE_REF_ANCHOR` (y de la política de no-aplicación del fallback H5 en `mode none`), no de la cadena de verificación.

## 16. SPEC Fase 4.2.14 (propuesto, solo si se prioriza)

**Objetivo:** cerrar el falso negativo de modo documento para consultas factuales naturales sin ancla explícita, sin reintroducir falsos positivos.

1. **Ampliar la señal de contenido** en `hasCaseContentReference` (jurisprudenceSources.mjs:2356):
   - Familia 3: sustantivo de contenido (renta, plazo, garantía, cláusula, subarriendo, fecha, partes…) en contexto de *singleton documental* (un solo documento READY en el workspace) + verbo/posesión de hecho ("paga", "comenzó", "entregó", "devolver") o pronombre de la vivienda/partes.
   - Evaluar un gatillo cuando `documents.length === 1` y la consulta contiene un sustantivo de contenido SIN marco público, relajando el requisito de ancla (con bloqueo por `PUBLIC_LAW_FRAME_RE` intacto).
2. **Habilitar rescate documental**: aplicar el fallback documental (H5) también desde `mode none` cuando hay documento único y la consulta es de contenido factual (reusar `shouldAllowDocumentOnlyFallback` con la nueva señal), en vez de cortar con NO_SOURCES_FOUND.
3. **Gate de relevancia post-retrieval**: antes de presentar claims de fuentes públicas en consultas documentales, verificar cobertura de términos sustantivos de la consulta en las afirmaciones (si la cobertura es ~0 y el documento existe, preferir NO_EVIDENCE o el modo documental, no una respuesta de fuente ajena). Esto ataca directamente los 5 FAIL críticos.
4. **Tests:** matrix offline ≥30 consultas nuevo SPEC (documentales naturales sin ancla como negativos de la familia 1 actual y positivos de la familia 3; mantener N1-N5 de 4.2.12 y los positivos de 4.2.9). Umbral: ≥90% clasificación correcta, 0 FAIL críticos, anti-alucinación intacta, no-determinismo factual <5%.
5. **QA real** con el mismo dataset 4.2.13 (47 consultas) y los 10 críticos ×2.
6. **No commit de este reporte**; la fase siguiente nace de este diagnóstico.

---
*Fin del reporte Fase 4.2.13. Sin cambios de código; solo QA read-only, harness y dataset en `/var/folders/0t/kvfnpv8s3hjfcq1_p8kn7blh0000gn/T/opencode/`. Evidencia cruda: `fase4213-qa.jsonl` (57 runs).*
