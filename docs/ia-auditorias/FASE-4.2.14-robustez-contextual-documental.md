# FASE 4.2.14 — Robustez contextual documental

**Fecha:** 2026-08-17 (QA completado 2026-08-18, cierre controlado)
**Régimen:** solo código IA (determinista) + tests + QA local. Sin commits, sin push, sin analytics (solo metadata y respuesta local).
**Estado:** IMPLEMENTACIÓN PASS (654 tests, build PASS, lint PASS, mode probe PASS) / **QA REAL PARCIALMENTE COMPLETADO — BLOQUEADO POR INFRAESTRUCTURA (rate limit persistente del proveedor LLM)**. NO COMMIT / NO PUSH.
**Base verificada:** suite completa → **38 archivos / 654 tests PASS** (627 previos + 27 nuevos); `npm run build` → **PASS**; lint de archivos tocados → **0 errores**.
**Objetivo cumplido:** eliminar el fallo crítico de la auditoría 4.2.13 — las consultas factuales naturales SIN ancla ("¿Cuál es la renta mensual?", "¿Cuándo termina?", "¿Cuánto pagó Jorge?", "¿Se puede subarrendar?") caían a `mode 'none'` y, con un ÚNICO documento disponible, se descartaba el documento del caso y se respondía con fuentes públicas irrelevantes (hallazgos A1/A3/B5/C3/D4).

---

## 1. Objetivo y método

La auditoría 4.2.13 (QA real con LLM, documento sintético de arriendo) mostró que 5 consultas críticas fallaban al sustituir silenciosamente el documento del caso por fuentes públicas:

| ID | Consulta | Comportamiento 4.2.13 (MAL) |
|----|----------|------------------------------|
| A1 | ¿Cuál es la renta mensual? | `mode none` → SUCCESS citando una **normativa** (irrelevante) |
| A3 | ¿Cuándo comenzó el contrato? | `mode none` → SUCCESS citando **jurisprudencia** (irrelevante) |
| B5 | ¿Qué pasa con la garantía? | `mode none` → SUCCESS citando **jurisprudencia + doctrina** (irrelevante) |
| C3 | ¿Qué fecha de inicio aparece? | `mode none` → SUCCESS citando **normativa** (irrelevante) |
| D4 | ¿Hubo daños? | `mode none` → SUCCESS citando **jurisprudencia + doctrina** (irrelevante) |

Causa raíz: los fallbacks documentales previos (4.2.9 `hasCaseReferenceSignal`, 4.2.12 `hasCaseContentReference`) exigen una señal visible (deíctico, "X del contrato", permiso explícito, sustantivo + ancla del expediente). Una pregunta factual natural ("¿Cuánto pagó Jorge?") no la dispara → `mode none` → se descarta el documento y se investiga en fuentes públicas.

Método: inspección formal + **implementación determinista (sin LLM/embeddings)** + **27 tests nuevos** en `fase4214.documentContextRobustness.test.mjs` + **QA real con LLM** (`openai/gpt-oss-20b:free`, `AI_CHAT_MAX_TOKENS=2400`, mismo documento sintético de 4.2.8/4.2.11/4.2.13) con solo metadata y respuesta local. Harness temporal fuera del repo (`/tmp/opencode/fase4214-qa.mjs` + `fase4214-qa.jsonl`).

## 2. Estado del repositorio y superficie del cambio

Working tree sobre la Fase 4.2.13 (sin commitear, por diseño de la cadena de fases). Cambios de esta fase:

| Archivo | Cambio |
|---------|--------|
| `server/ai/jurisprudenceSources.mjs` | **`hasImplicitDocumentContext`** (señal de contexto documental implícito) + regex sets (`IMPLICIT_DOC_FACTUAL_NOUNS/STRONG_VERBS/GENERIC_VERBS`, `IMPLICIT_QUESTION_RE`, `IMPLICIT_PUBLIC_ONLY_RE`, `IMPLICIT_PROCEDURE_BLOCK_RE`, `IMPLICIT_EXCLUDED_INTENTS`) + **`IMPLICIT_LEGAL_POLE_RE`** (exportado) + **`isSourceResponsiveToQuery`** (gate de relevancia post-verificación, ~110 líneas) |
| `server/ai/documentGrounding.mjs` | **`detectDocumentMode`**: integra `implicitContext` en la señal documental, OR de `IMPLICIT_LEGAL_POLE_RE` en `hasLegal`, expone `implicitContext` en el retorno. **`shouldAllowDocumentOnlyFallback`**: parámetro opcional `implicitDocumentContext` (defensa en profundidad §10) |
| `server/ai/jurisprudencePipeline.mjs` | **`applyRelevanceGate`** (helper exportado) + gate 4.2.14 en `buildJurisprudenceOutcome` (`filteredNormativa/filteredJurisprudencia/filteredDoctrina` propagados a síntesis/jerarquía/contradicciones/answer/referenced) + `relevanceDroppedSources` en el retorno |
| `server.mjs` | Gate H5 pasa `implicitDocumentContext: documentModeResult.implicitContext` |
| `server/ai/fase4214.documentContextRobustness.test.mjs` | Nuevo, **27 tests** |

Sin cambios en: modelo/OpenRouter, embeddings/RAG/classifier, chunking, dynamic context budget, provider retry/timeout, evidence gates, ownership/RLS, frontend, modelo LLM. Todas las decisiones nuevas son 100% deterministas.

## 3. Implementación — decisiones de diseño

### 3.1 Señal de contexto documental implícito (`hasImplicitDocumentContext`)

Activa `mode document/mixed` para consultas factuales naturales **solo** cuando:

1. `hasDocs === true` **y** `documentCount === 1` (singleton): con varios documentos no hay un "el documento" inequívoco → se conserva el flujo clásico.
2. Ningún otro signal clasificó (`existingSignals.documentSignal/fallbackSignal/contentSignal` falsos).
3. El intent no es de consulta pública pura (`JURISPRUDENCE_LOOKUP`, `ARTICLE_LOOKUP`, `BARE_NORM_CITATION`, `DOCTRINE_LOOKUP`, `RELATIONAL_LEGAL_QUERY`, `MIXED_NORM_JURISPRUDENCE`).
4. No hay marco de fuentes públicas (`IMPLICIT_PUBLIC_ONLY_RE` = marco 4.2.12 `PUBLIC_LAW_FRAME_RE` + "regulación" + "constitución").
5. No hay materia de procedimiento/trabajo/tributos/familia (`IMPLICIT_PROCEDURE_BLOCK_RE`: prescripción, notificación, apelación, recurso, juicio, audiencia, juzgado, embargo, cautelar, ejecución, impuesto, tributo, sanción, penal, laboral, trabajo, trabajador, empleador, empleado, despido, indemnización, previsión, isapre, afp, remuneración, "renta base", patrimonio, herencia, sucesión, divorcio, matrimonio, custodia, alimentos, mercado, declaración de renta).
6. Es una **pregunta** (`IMPLICIT_QUESTION_RE`: palabra interrogativa o `?`/`¿`).

Y luego activa por una de tres reglas (texto NFD):

- **`factualNoun && isQuestion`** → true. Sustantivos de contenido contractual/factual: renta, canon(es), arriendo(s), arrendamiento, garantía(s), cláusula(s), plazo(s), monto(s), pago(s), multa(s), penalidad(es), domicilio, gastos comunes, mantención, término(s), vencimiento, duración, vigencia, subarriendo(s), partes, obligación(es), prohibición, autorización, aviso, preaviso, fecha(s), inicio, estado, daños, reparaciones, entrega, devolución, objeto, y roles (arrendador(a)/arrendatario(a)/inquilino(a)/dueño(a)/propietario(a)/cesionario(a)/comodatario/comodante/fiador(a)). **NO** incluye "intereses", "comisión" ni "pena" genérica (consulta pública).
- **`strongVerb && isQuestion && ≤40 chars`** → true. Verbos fuertes: subarrendar, subarrienda(n), cede(n)/ceder, vence(n)/vencer, renueva(n), prorroga(n), se devuelve/se entrega/se restituye.
- **`genericVerb && questionWord && ≤40 chars`** → true. Verbos genéricos con límite de longitud para no robar consultas públicas: termina(n)/terminar, comienza(n)/comenzó, empieza, inicia(n), paga(n)/pagar/pago, devuelve(n)/devolver, deja(n)/dejar/dejó, se permite/prohíbe/autoriza/exige/admite/impide/faculta, entrega(n).

**Invariantes preservadas (verificadas con probe):**

| Consulta | Resultado |
|----------|-----------|
| "¿Puedo terminar el contrato por incumplimiento?" | `none` (46 chars, sin palabra interrogativa, "puedo" no está en yes-no) |
| "¿Se permite terminar la relación laboral sin aviso previo?" | `none` (bloque "laboral") |
| "¿Cuál es el plazo de prescripción de las acciones?" | `none` (bloque "prescripción") |
| "¿Cuál es la renta base mensual?" | `none` (bloque "renta base") |
| "¿Cuál es el estado del mercado inmobiliario?" | `none` (bloque "mercado") |
| "¿Qué ha dicho la jurisprudencia sobre el subarriendo?" | `none` (intent JURISPRUDENCE_LOOKUP) |
| "¿La renta del contrato cumple con la normativa?" | `none` (bloque "normativa") |
| "¿Qué derechos reconoce la Ley 21.719…?" | `none` (bloque "ley") |

### 3.2 Polo jurídico de validez (`IMPLICIT_LEGAL_POLE_RE`)

"¿La cláusula de término anticipado es válida?" no pregunta por hechos sino por **validez jurídica** del documento → matriz §13 columna C exige `mixed`. `detectDocumentMode` hace `OR` de `IMPLICIT_LEGAL_POLE_RE` en `hasLegal`: `es/son válida(s)`, `validez jurídica/legal`, `es exigible`, `es procedente`, `es legal`, `es conforme (a|con)`, `cumple con (la ley|normativa|requisitos|exigencias|legislación)`, `se ajusta (a|con)`, `compatible con (la ley|normativa|código|legislación)`, `permite la ley`. Solo tiene efecto cuando ya hay señal documental (por sí mismo NO clasifica → no regresión en los `noEvidence` tests de fase426/fase429). "¿La cláusula … permite terminar el contrato?" (D2, fase429) NO lo dispara → sigue `document`.

### 3.3 Gate de relevancia post-retrieval (`applyRelevanceGate` + `isSourceResponsiveToQuery`)

Cuando la consulta es documental (`mode document/mixed`) y **ningún** claim documental sobrevivió la verificación, las fuentes públicas NO deben sustituir al documento: "¿Cuál es la renta mensual?" no se responde con la renta de funcionarios de una ley ni con jurisprudencia genérica de arrendamiento.

`isSourceResponsiveToQuery({ query, source, claims })` conserva una fuente pública solo si hay señal sustantiva:
- Coincidencia de **número de ley** citado (`extractLawNumber` vs `source.norm_number` normalizado, ≥4 dígitos) o de **artículo** citado vs articulado de la fuente, o
- **≥1 término sustantivo** de la consulta (vía `normalizeClaimTokens` filtrando `RELEVANCE_LOW_TERMS`) presente en título + cita + afirmación/fragmento que el modelo le atribuye.

No colisiona con `isSourceRelevantToQuery` (Fase 4.1.13, gate de RETRIEVAL que ya se aplica en `fetchRelevantSources`): esta opera **post-verificación** e incluye el texto atribuido por el modelo, la señal más fuerte de con qué pretende responder. En `buildJurisprudenceOutcome`, `gateShouldFilter = documentMode !== 'none' && verifiedDocumentos.kept.length === 0`; los arrays filtrados se propagan a la síntesis, jerarquía, contradicciones, `answer`, `referenced` y `allVerifiedClaims`. Si todo se filtra → `NO_EVIDENCE` honesto, nunca fuente pública irrelevante. Solo se activa con `mode ≠ none` y sin claims documentales → sin regresión en el flujo público clásico.

### 3.4 Defensa en profundidad (§10) — `shouldAllowDocumentOnlyFallback`

La ruta (gate H5) ahora pasa `implicitDocumentContext: documentModeResult.implicitContext`. Si el contexto implícito se activó pero el modo resultante fuera `none` (no ocurre en la práctica, ya que la señal implícita siempre produce `document`/`mixed`), el fallback doc-only puede responder con el documento del caso en vez de cortar con `422 NO_SOURCES_FOUND`. El gate previo (documentMode `none` → false) se conserva cuando NO hay contexto implícito.

## 4. Baseline y regresiones

`npm run test:run` → **38 archivos / 654 tests PASS** (627 baseline de 4.2.13 + 27 nuevos). Sin fallos durante el desarrollo de esta fase (los 258 tests de los 7 archivos de módulos tocados pasaron desde la primera corrida). Probes de comportamiento confirmaron el antes/después de los 5 críticos (todos `none`→`document`) y que E2/E4/I1/J2/C2/D3 conservan el mismo modo real que 4.2.13 (los ideales del dataset 4.2.13 que no se cumplían antes tampoco se cumplen ahora, pero NO son regresiones: A1/A3/B5/C3/D4/C1 fueron los hallazgos críticos y C2/D3 se mejoraron con los infinitivos `devolver`/`dejar`).

## 5. QA real (LLM, documento sintético)

**Datos:** documento sintético de 4.2.13 (§9): María López (arrendadora) / Jorge Pérez (arrendatario), inicio 1/1/2026, duración 12 meses, renta $500.000/mes, garantía $1.000.000 (CUARTA), QUINTA término anticipado con aviso de 60 días, SÉPTIMA prohíbe subarrendar/ceder. Ausentes a propósito: fecha de entrega, reparaciones, estado al entregar, daños, devolución efectiva de la garantía.

Harness: réplica fiel del endpoint (módulos reales + LLM real `openai/gpt-oss-20b:free`), solo metadata/respuesta local. Diseño resiliente al rate limit: las filas con error transitorio del proveedor NO se persisten (TRANSIENT_FINAL → se reintentan en la siguiente iteración) y NUNCA se convierten en NO_EVIDENCE; con esto un rate limit jamás se registra como abstinencia funcional. Se detuvo por cierre controlado después de que el proveedor permaneciera rate-limited de forma sostenida (~14 h, 12 iteraciones previstas, sin éxito en las filas restantes). No hubo loop infinito: el harness aplica su límite de reintentos (4 intentos/fila/iteración con backoff 45/90/135 s).

### 5.1 Resultados (49 de 62 filas ejecutadas; cobertura 79,0%)

| Métrica | Valor |
|---------|-------|
| Runs generados | **49 / 62** (cobertura **79,0%**) |
| PASS | **45** |
| PARTIAL | **4** (C1-1, C1-2, C4-1, J2-1) |
| FAIL funcional | **0** |
| FAIL CRÍTICO | **0** |
| INFRA / RATE_LIMITED | **13 filas no ejecutadas** (E1-1, E1-2, E2-1, E3-1, E4-1, F1-1, F2-1, F3-1, G1-1, G1-2, G3-1, H2-1, H3-1) — bloqueadas por rate limit persistente del proveedor, **no** por fallo funcional |
| Respuestas inventadas | **0** |

Distribución de modo en las 49 filas: `document` 41 (33 SUCCESS + 8 NO_EVIDENCE), `mixed` 2 (NO_EVIDENCE), `none` 6 (2 NO_SOURCES_FOUND + 3 SUCCESS públicas + 1 NO_EVIDENCE). Ninguna fila `expMode none` (pública exclusiva) se convirtió en `document` (0 leaks); la única desviación es la inversa y pre-existente (J2, clasificación `BARE_NORM_CITATION`).

### 5.2 Críticos 4.2.13 (A1 A3 B5 C3 D4) — validados ×2 con LLM real

| Crítico | Consulta | Resultado 4.2.14 (×2) | Mode | Señal implícita | Doc en contexto | Respuesta falsa | Bloqueado por infra |
|---------|----------|------------------------|------|-----------------|-----------------|-----------------|---------------------|
| A1 | ¿Cuál es la renta mensual? | **SUCCESS** (renta $500.000) | document | sí (`implicit=true`) | sí (docUsed=1, claims=1) | no | no |
| A3 | ¿Cuándo comenzó el contrato? | **SUCCESS** (1/1/2026) | document | sí | sí (claims=1) | no | no |
| B5 | ¿Qué pasa con la garantía? | **SUCCESS** (se devuelve al término, descontando adeudos) | document | sí | sí (claims=1) | no | no |
| C3 | ¿Qué fecha de inicio aparece? | **SUCCESS** (1/1/2026) | document | sí | sí (claims=1) | no | no |
| D4 | ¿Hubo daños? | **NO_EVIDENCE honesto** (el doc NO menciona daños) | document | sí | sí | no | no |

Los 5 críticos se ejecutaron con LLM real en 2 repeticiones deterministas (mismo mode/status/docUsed; respuestas consistentes). **Ninguno quedó bloqueado por infraestructura ni validado sin LLM.** Comparado con 4.2.13 (todos `none`, SUCCESS citando fuentes públicas irrelevantes o invención silenciosa), A1/A3/B5/C3 ahora responden EXCLUSIVAMENTE desde el documento y D4 abstiene honestamente en vez de sustituir el documento por jurisprudencia/doctrina.

### 5.3 Comparación global contra Fase 4.2.13 (filas compartidas)

- **Mejoras: 25** (todas `mode none` → `document/mixed` con mejor status, p.ej. A4/B3/D5 `NO_EVIDENCE`→`SUCCESS`, A6/B7/C2/I3/I4 `NO_SOURCES_FOUND`→`SUCCESS`, D4 `SUCCESS`-falso→`NO_EVIDENCE`-honesto).
- **Sin cambios: 18** (G2, H1, H4-H6, I1, I2, J2 y varios críticos documentales previos que ya eran `document`).
- **Regresiones: 0**.
- J2-1 cambió de etiqueta (`NO_SOURCES_FOUND`→`NO_EVIDENCE`) dentro del mismo `mode none` (ambos abstienen; sin cambio funcional).

### 5.4 Divergencias entre ejecuciones (determinismo)

Las 13 filas con repeticiones ×2 (A1, A3, B5, C3, D4, C1, C5, B2, B6, D1, I1, J1) son **deterministas**: idéntico mode, status, docUsed y señal implícita; contenido de respuesta consistente (redacción varia, hechos idénticos). 0 divergencias.

### 5.5 Verificaciones específicas solicitadas

- **Preguntas documentales naturales → document/mixed:** 30 filas con señal implícita, todas `document`. ✓
- **Preguntas públicas exclusivas → NO document-only:** 5 filas `expMode none` permanecieron `none`. ✓
- **Document-only cuando corresponde:** 41 filas `document` responden solo desde el documento (src pública = 0 en modo document). ✓
- **El documento tiene prioridad para hechos del caso:** todos los SUCCESS documentales citan fragmentos literales del contrato. ✓
- **Las fuentes públicas NO sustituyen al documento:** D4 (antes jurisprudencia+doctrina falsa) ahora NO_EVIDENCE honesto; ninguna fila documental citó fuente pública. ✓
- **Relevancia post-retrieval:** gate en su sitio; en modo `document` no hay retrieval público (src=0), por lo que el gate no registra drops (rel=0) — se ejercita en modo `mixed` con fuentes públicas. ✓
- **Anti-alucinación intacta:** 0 respuestas inventadas; fragmentos citados son literales del documento; claims sin fragmento literal se descartan (document_claims_dropped visibles en C1/C4/D2/D4/I1/I2). ✓
- **Sin respuestas falsas sobre el documento:** 0. Las preguntas con premisa falsa se refutan correctamente desde el documento (I3 "60 días, no 90"; J1 "500.000, no 700.000"). ✓
- **NO_EVIDENCE cuando el documento contiene la respuesta:** 4 PARTIAL (C1×2, C4, J2) son abstenciones donde el documento tiene contenido relacionado (ver §6); el resto de NO_EVIDENCE son legítimos (D2/D4/daños/reparaciones ausentes). ✓ (con matices §6)
- **Consultas sin documento → sin grounding documental:** filas `none` (G2, H1, H4-H6, J2) no usan documento. ✓
- **Críticos deterministas:** confirmado (§5.4). ✓

## 6. Limitaciones conocidas (residual aceptado)

- **PARTIAL C1 ×2** ("¿Cuánto paga Jorge?"): el documento contiene la renta ($500.000) y Jorge es el arrendatario, pero el claim del modelo citó un fragmento no literal y el guard anti-alucinación lo descartó → NO_EVIDENCE. Abstinencia honesta y determinista (idéntica en 4.2.13), NO invención; la inferencia nombre→rol→obligación no se resuelve a nivel de fragmento literal.
- **PARTIAL C4** ("¿Quién tiene obligación de avisar?"): el documento regula el aviso (QUINTA, 60 días) pero el claim específico del modelo no encontró respaldo literal → NO_EVIDENCE. Abstinencia honesta.
- **PARTIAL J2** ("¿La garantía es de 2.000.000?"): se clasifica `BARE_NORM_CITATION` por el número con separadores de miles → `none` → sin grounding documental. Pre-existente (idéntico a 4.2.13), fuera de alcance de esta fase; el documento sí contiene la garantía ($1.000.000) pero el intent excluido impide la señal implícita.
- **Cobertura QA 79%:** 13 filas (E1-E4, F1-F3, G1, G3, H2, H3) no pudieron ejecutarse por rate limit persistente del proveedor; no certifican el QA completo de esas consultas con LLM real.
- Consultas con marco público explícito + ancla documental ("¿La renta del contrato cumple con la normativa?") quedan en `none`/público: el bloque público tiene prioridad sobre el contexto implícito.
- "¿Qué riesgos jurídicos tiene esta cláusula?" (E2) y "¿Qué normativa podría ser relevante para este contrato?" (E4) siguen en `document` (no `mixed`), igual que en 4.2.13 (E2/E4/E3 no ejecutadas en este QA por rate limit).

## 7. Conclusión y estado de certificación

- **IMPLEMENTACIÓN: PASS.** 654/654 tests (38 archivos), `npm run build` PASS, lint 0 errores en archivos tocados, mode probe PASS (críticos `none`→`document`, invariantes intactas, validez→`mixed`, regresión D2 preservada).
- **QA REAL: PARCIALMENTE COMPLETADO / BLOQUEADO POR INFRAESTRUCTURA.** 49/62 filas (79,0%): 45 PASS, 4 PARTIAL, 0 FAIL, 0 FAIL CRÍTICO, 13 filas no ejecutadas por rate limit persistente del proveedor LLM (`openai/gpt-oss-20b:free`). Los 5 críticos de 4.2.13 (A1/A3/B5/C3/D4) fueron **validados con LLM real ×2** (document, señal implícita, doc en contexto, sin respuestas falsas, sin bloqueo de infra) y D4 convierte el SUCCESS falso en NO_EVIDENCE honesto.
- **Certificación:** la fase NO se declara certificada al 100% hasta que el rate limit permita ejecutar las 13 filas restantes (E/F/G/H). Hasta entonces: **"IMPLEMENTACIÓN PASS / QA REAL BLOQUEADO POR INFRAESTRUCTURA (79% de cobertura)"**.