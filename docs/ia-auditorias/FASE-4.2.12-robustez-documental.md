# FASE 4.2.12 — Robustez de referencias documentales (H3 / H4 / H5)

**Fecha:** 2026-08-16
**Régimen:** solo código IA (determinista) + tests + QA local. Sin commits, sin push, sin analytics (solo metadata y respuesta local).
**Estado:** IMPLEMENTADO Y VERIFICADO. NO COMMIT / NO PUSH.
**Base verificada:** suite completa → **37 archivos / 627 tests PASS**; `npm run build` → **PASS**; lint de archivos tocados → **0 errores**.
**Objetivo cumplido:** corregir los 3 hallazgos de la auditoría 4.2.11 — H3 (franja residual de falsos negativos documentales), H4 (no-determinismo FLAKY por paráfrasis en verificación de claims) y H5 (cortes NO_SOURCES_FOUND en consultas mixtas con documento suficiente).

---

## 1. Objetivo y método

La auditoría 4.2.11 dejó tres problemas abiertos (SPEC propuesto §16):

1. **H3 — falsos negativos documentales residuales:** consultas naturales sobre el *contenido* del documento ("¿Qué plazo establece…?", "¿Se permite subarrendar?", "¿Qué riesgos tiene la cláusula?") caían a `mode 'none'` porque `DOCUMENT_SIGNAL_RE` exige deíctico/verbo lector y `CASE_STRUCTURE_SIGNAL_RE` exige estructura de expediente → el documento del caso se descartaba en silencio.
2. **H4 — no-determinismo por paráfrasis:** `verifyDocumentClaims` (Nivel 1 = solape léxico) descartaba paráfrasis válidas de hechos EXISTENTES ("La vigencia contractual es de 12 meses" vs "una duración de doce meses") → D2/D4 alternaban SUCCESS / NO_EVIDENCE (clase FLAKY).
3. **H5 — cortes innecesarios:** consultas mixtas cuyo retrieval público devolvía 0 fuentes y con documento suficiente respondían `422 NO_SOURCES_FOUND` (M3 → PARTIAL).

Método: inspección + implementación determinista (sin LLM/embeddings) + **26 tests nuevos** en `fase4212.documentReferenceRobustness.test.mjs` + corrección de 4 regresiones detectadas + **QA real con LLM** (`openai/gpt-oss-20b:free`, `AI_CHAT_MAX_TOKENS=2400`, mismo documento sintético de 4.2.8/4.2.11) con solo metadata y respuesta local. Harness temporal fuera del repo (`/tmp/opencode/fase4212-qa.mjs` + `fase4212-qa.jsonl`).

## 2. Estado del repositorio y superficie del cambio

Working tree sobre `main` (`0295140`, Fase 4.2.9) con la Fase 4.2.10 sin commitear (por diseño de la cadena de fases). Cambios de esta fase:

| Archivo | Cambio |
|---------|--------|
| `server/ai/jurisprudenceSources.mjs` | **H3:** `hasCaseContentReference` (2 familias) + `CASE_FACT_NOUNS`, `CASE_REF_ANCHOR`, `PUBLIC_LAW_FRAME_RE` (ahora incluye `reglamento\|decreto`), `CASE_FACT_CONTENT_RE`, `CASE_DOCUMENT_PERMISSION_RE` (+60 líneas) |
| `server/ai/documentGrounding.mjs` | **H4:** `checkDocumentClaimFacts`, `extractNumericFacts`, `extractRoleWords`, `ROLE_CANONICAL_FORM`, `WEAK_ACCEPT_TERMS`, `hasWordTerm`; integración `claimSupportedByFragment` + fallback en `verifyDocumentClaims`. **H5:** `shouldAllowDocumentOnlyFallback` (+~240 líneas) |
| `server.mjs` | **H5 gate:** fallback doc-only ante `sources.length === 0` con `logDiagnostic('ai_research_document_only_fallback')` (solo metadata) |
| `server/ai/fase4212.documentReferenceRobustness.test.mjs` | Nuevo, **26 tests** (H3/H4/H5) |
| `docs/ia-auditorias/FASE-4.2.11-auditoria-post-4.2.10.md` | Doc de auditoría (sin commitear, de la fase previa) |

Sin cambios en: modelo/OpenRouter, embeddings/RAG/classifier, chunking, dynamic context budget, provider retry/timeout, evidence gates, ownership/RLS, frontend. Todas las decisiones nuevas son 100% deterministas.

## 3. Implementación — decisiones de diseño

### 3.1 H3 — señal de contenido factual del caso (`hasCaseContentReference`)

Wireada en `detectDocumentMode` como `contentSignal`, que requiere **hasDocs && !hasDocumentSignal && !fallbackSignal && hasCaseContentReference(...)**. Al exigir `hasDocs`, nunca produce `noEvidence`. Se bloquea internamente ante **jurisprudencia** (`hasJurisprudence`) y ante **marco de fuentes públicas** (`PUBLIC_LAW_FRAME_RE`).

- **Familia 1 — sustantivo de contenido + ancla del caso** (`CASE_FACT_CONTENT_RE`, lookahead doble): sustantivos factuales (plazo, renta, canon, riesgo, garantía, vigencia, duración, monto, obligaciones, hechos, antecedentes, cláusula, término, subarriendo, pago, valor, multa, penalidad…) **AND** ancla (contrato, documento, expediente, escritura, finiquito, demanda, acta, oficio, informe, solicitud, resolución, escrito, caso, causa, partes), en cualquier orden.
- **Familia 2 — permiso contractual explícito** (`CASE_DOCUMENT_PERMISSION_RE`): `se permite/prohíbe/autoriza/admite/impide/faculta` + (`subarrendar|subarriendar|subarrendarlo` **sueltos**) o (`terminar|prorrogar|renovar|modificar|traspasar|ceder` **+ objeto contractual** `contrato|documento|arriendo|arrendamiento|inmueble|cláusula`). Los verbos genéricos exigen objeto contractual para **no robar consultas laborales/públicas** ("se permite terminar la relación laboral" → NO).

**Decisión clave:** se eliminó la familia elíptica sin ancla ("qué plazo establece") que aparecía en el SPEC §16, por el FP documentado: "¿Qué plazo establece el reglamento…?" no debe activar modo documento. El ancla (contrato/cláusula/partes) garantiza que la consulta se refiere al documento del caso.

### 3.2 H4 — verificación Nivel 2 de claims (`checkDocumentClaimFacts`)

`verifyDocumentClaims` ahora decide por **dos niveles** (wrapper `claimSupportedByFragment`):

- Nivel 1 (`fragmentSupportsClaim`, solape léxico) **AND** `check !== 'reject'` → mantiene.
- Nivel 1 no alinea pero `check === 'accept'` → **RESCATA la paráfrasis** (antes → descarte → NO_EVIDENCE).
- Fallback adicional: si `resolveClaimFragment` no alinea ningún fragmento, se busca el primer fragmento real con `check === 'accept'`.
- El gate final (línea ~594) usa el mismo wrapper, de modo que un claim que el Nivel 1 acepta por solape parcial pero que **contradice hechos** del fragmento se descarta.

Verificables extraídos del claim:
- **Números/montos** (`extractNumericFacts`): dígitos (`500.000` → 500000, con grupos de 3) **y** palabras de número españolas compuestas ("quinientos mil" → 500000, "doce meses" → 12). Los artículos `un/uno/una` NO cuentan (evitan falsos rechazos). **Regla de composición:** palabras numéricas NO contiguas son hechos distintos ("doce meses" y "cinco días" → {12, 5}, no 17).
- **Roles de las partes** (`extractRoleWords` + `ROLE_CANONICAL_FORM`): normaliza el género ("arrendataria" → arrendatario; "propietaria" → propietario) manteniendo la distinción de rol.

Decisiones:
- **Reject por número/monto:** un número del claim ausente en el fragmento → cifra no soportada/contradicha (renta $700.000 vs $500.000) → descarte aunque el Nivel 1 acepte por solape.
- **Reject por rol:** el claim asigna un rol distinto al respaldado por el fragmento ("propietaria" cuando el documento dice "arrendadora") → descarte.
- **Accept** = hechos respaldados **+** al menos un término sustantivo FUERTE (no débil) co-ocurriendo en la **misma oración** con el número (si el claim tiene números) o con el rol (si solo tiene rol). El número gobierna sobre el rol para evitar que un número de cláusula o encabezado ("CLÁUSULA ADICIONAL 3") respalde un hecho ("tres propiedades") junto a un término de otra oración ("arrendatario").
- **Neutral** (sin hechos verificables) → decide solo el Nivel 1.

### 3.3 H5 — fallback solo-documental (`shouldAllowDocumentOnlyFallback`)

Gate en `server.mjs`: cuando `documentMode !== 'document' && sources.length === 0`, se pregunta `shouldAllowDocumentOnlyFallback({documentMode, intent, hasDocs})`:

- `false` (→ se mantiene el `422 NO_SOURCES_FOUND`) si `documentMode === 'none'`, si no hay docs, o si `intent ∈ {BARE_NORM_CITATION, ARTICLE_LOOKUP, NORMATIVE_APPLICATION, JURISPRUDENCE_LOOKUP, DOCTRINE_LOOKUP, RELATIONAL_LEGAL_QUERY, MIXED_NORM_JURISPRUDENCE}` — no se fabrica jurisprudencia/normativa desde el documento.
- `true` (→ responde SOLO con la evidencia documental) en consultas documental-compatibles (GENERAL_LEGAL_QUERY, DOCUMENT_ANALYSIS…) con documentos del caso. Registra `ai_research_document_only_fallback` (metadata).

## 4. Baseline y regresiones detectadas/corregidas durante la fase

`npm run test:run` → **37 archivos / 627 tests PASS** (601 baseline de 4.2.11 + 26 nuevos). Durante el desarrollo se detectaron y corrigieron **4 fallos** (todos en verde tras el fix):

| Fallo | Causa raíz | Fix |
|-------|------------|-----|
| fase4212 "no acepta un número de cláusula como hecho" + fase426 D4 "posee tres propiedades" | la aceptación OR-eaba número y rol; `hasRole` usaba los roles del fragmento entero → un dígito de "CLÁUSULA ADICIONAL 3" + "arrendatario" del encabezado aceptaban el FP | prioridad del número + rol co-ocurrente con la ancla en la MISMA oración |
| fase4212 "RESCATA paráfrasis" kept 0 | `extractNumericFacts` sumaba todas las palabras numéricas del documento en un solo valor ("doce"+"dos"+"cinco"=19) → "12" ∉ fragmento → reject | flush de la composición entre palabras no numéricas (12, 2 y 5 por separado) |
| fase429 D2 kept 0 | mismo bug de acumulación (2+5+12=19 → "dos" rechazado) | idem |
| fase4212 "género del rol" neutral | el split de oraciones `[.;!?\n]` partía "500.000" en "500" + "000" → el número no co-ocurría con la ancla | separador de punto que NO rompe entre dígitos: `/(?:\.(?!\d)|\n|[;!?])+/` |

## 5. Matriz OFFLINE determinista (sin red, `fase4212`)

| Caso | Entrada | Esperado | Resultado |
|------|---------|----------|-----------|
| H3 · 7 positivos | "¿Qué plazo establece el contrato…?", "¿Se permite subarrendar el inmueble?", "¿Cuáles son las obligaciones de las partes?", "¿Qué riesgos tiene la cláusula de término anticipado?" + variantes | `document` (contentSignal) | **PASS** |
| H3 · 8 negativos | N6 "¿Se permite terminar la relación laboral sin aviso previo?", N7 "¿Qué plazo establece el reglamento…?", "¿Qué ha dicho el TC sobre la prisión preventiva?", "…cláusulas de término anticipado?" (con jurisprudencia), etc. | `none` (sin robo documental) | **PASS** |
| H3 · bloqueo jurisprudencia | `hasJurisprudence: true` | `false` | **PASS** |
| H3 · invariantes | consulta con señal propia → `contentSignal=false`; consulta mixta → no noEvidence | según diseño | **PASS** |
| H4 · unit accept | paráfrasis de monto/plazo respaldada (incl. "arrendataria"/"arrendatario", "dos meses") | `accept` | **PASS** |
| H4 · unit reject | renta 700.000 vs 500.000; "propietaria" vs "arrendadora"; cifra ausente | `reject` | **PASS** |
| H4 · guard | "El arrendatario posee tres propiedades en la costa" vs "CLÁUSULA ADICIONAL 3" + "arrendatario" en distinta oración | `neutral` | **PASS** |
| H4 · integración | RESCATA (paráfrasis válida kept), descarta 700.000/rol/D4/contrato-garantiza-tres | kept/descartado correcto | **PASS** |
| H5 · unit | modo `document`/`mixed` + GENERAL_LEGAL_QUERY + hasDocs → `true`; modo `none`, sin docs, o intents públicos → `false` | según diseño | **PASS** |
| H5 · intents reales | E2 "…según la normativa aplicable" → GENERAL_LEGAL_QUERY (rescatable); "¿Qué ha dicho el TC…?" → JURISPRUDENCE_LOOKUP (no rescatable) | según diseño | **PASS** |

## 6. QA REAL (LLM `openai/gpt-oss-20b:free`, `AI_CHAT_MAX_TOKENS=2400`)

17 corridas; D2/D4 ×2 para medir no-determinismo. Mismo documento sintético de 4.2.8/4.2.11 (arriendo, MARÍA LÓPEZ/JORGE PÉREZ, 24 meses, $500.000, subarriendo prohibido, término anticipado 60 días, cláusula penal 2 meses, art. 1545).

| # | Consulta | intent | mode | src | h5 | status | claims | Veredicto |
|---|----------|--------|------|-----|----|--------|--------|-----------|
| H3P1 | ¿Qué plazo establece el contrato para el pago de la renta? | DOCUMENT_ANALYSIS | document | 0 | — | **SUCCESS** | 1 | **PASS** |
| H3P2 | ¿Se permite subarrendar el inmueble? | NORMATIVE_APPLICATION | document | 0 | — | **SUCCESS** | 1 | **PASS** (contentSignal) |
| H3P3 | ¿Cuáles son las obligaciones de las partes del contrato? | DOCUMENT_ANALYSIS | document | 0 | — | **SUCCESS** | 1 | **PASS** |
| H3P4 | ¿Qué riesgos presenta la cláusula de término anticipado? | GENERAL_LEGAL_QUERY | document | 0 | — | **SUCCESS** | 1 | **PASS** |
| H3N1 | ¿Qué normativa regula el plazo de los contratos de arrendamiento? | GENERAL_LEGAL_QUERY | **none** | 13 | — | SUCCESS | 1 | **PASS** (sin robo) |
| H3N2 | ¿Se permite terminar la relación laboral sin aviso previo? | NORMATIVE_APPLICATION | **none** | 4 | — | NO_EVIDENCE | 0 | **PASS** (honesto) |
| H3N3 | ¿Qué plazo establece el reglamento para la notificación? | GENERAL_LEGAL_QUERY | **none** | 13 | — | NO_EVIDENCE | 0 | **PASS** (honesto) |
| H3N4 | ¿Qué ha dicho el TC sobre las cláusulas de término anticipado? | JURISPRUDENCE_LOOKUP | **none** | 2 | — | NO_EVIDENCE | 0 | **PASS** (bloqueo jurispr.) |
| **D2** | ¿Hay alguna cláusula que permita terminar anticipadamente el contrato? | GENERAL_LEGAL_QUERY | document | 0 | — | **SUCCESS** ×2 | 1/1 | **PASS DETERMINISTIC** |
| **D4** | ¿Quiénes son las partes del contrato? | DOCUMENT_ANALYSIS | document | 0 | — | **SUCCESS** ×2 | 1/1 | **PASS DETERMINISTIC** |
| **G3** | ¿Qué hechos del documento son relevantes jurídicamente y qué normas o fallos…? | JURISPRUDENCE_LOOKUP | mixed | 10 | — | **SUCCESS** | 6 | **PASS** |
| **E1** (M3 4.2.11) | ¿Cuáles son los riesgos jurídicos de esta cláusula según la normativa aplicable? | DOCUMENT_ANALYSIS | mixed | 0 | **doc-only** | **SUCCESS** | 4 | **PASS** (resuelto) |
| H5P1 | ¿Qué obligaciones impone este contrato y cómo se relacionan con la normativa general? | RELATIONAL_LEGAL_QUERY | document | 0 | — | **SUCCESS** | 7 | **PASS** |
| H5N1 | ¿Qué ha dicho el Tribunal Constitucional sobre la cláusula penal? | JURISPRUDENCE_LOOKUP | none | 10 | — | SUCCESS | 2 | **PASS** (busca TC, no roba doc) |
| I2 | ¿Qué establece el artículo 999 de la Ley 21.719 sobre acceso a datos? | ARTICLE_LOOKUP | none | 4 | — | NO_EVIDENCE | 0 | **PASS** (anti-alucinación) |

**Interpretación factual (respuestas crudas verificadas):**
- **H3**: H3P2 confirma la familia de permiso → responde "el contrato **prohíbe** al arrendatario subarrendar sin autorización escrita", con cita. H3P1/H3P3/H3P4 responden del documento con fragmento citado. **Antes (4.2.11):** todas caían a `none` → silencio/NO_EVIDENCE.
- **D2**: "cualquiera de las partes puede terminar anticipadamente con 60 días de aviso", claim verificado con cita, en **2/2 corridas**. **Antes (4.2.11):** SUCCESS / NO_EVIDENCE (FLAKY).
- **D4**: "las partes son doña MARÍA LÓPEZ (arrendadora) y don JORGE PÉREZ (arrendatario)" en **2/2 corridas**. **Antes (4.2.11):** SUCCESS / NO_EVIDENCE (FLAKY).
- **G3**: documenta hechos + jurisprudencia TC, con honestidad sobre el alcance. **Antes:** dependía de la búsqueda pública; ahora 6 claims (doc+TC).
- **E1 (H5)**: sin fuentes públicas → responde con 4 claims del contrato y calibra "sin normativa no se puede determinar la validez" — **calibración correcta**. **Antes (4.2.11):** `NO_SOURCES_FOUND` (PARTIAL).
- **Anti-alucinación intacta:** I2 rechaza (NO_EVIDENCE); H3N2/H3N3/H3N4 no roban el documento y no fabrican contenido.

## 7. No-determinismo (clasificación A–G)

| ID | Mismo input | Resultado | Clase |
|----|-------------|-----------|-------|
| D2 | ×2 | SUCCESS / SUCCESS (equivalente, claim verificado) | **DETERMINISTIC** |
| D4 | ×2 | SUCCESS / SUCCESS (partes correctas) | **DETERMINISTIC** |

El **P6 de 4.2.11 (D2/D4 FLAKY)** queda resuelto: la causa era el descarte de paráfrasis en `verifyDocumentClaims`, ahora rescatada por H4. No se observó FLAKY por paráfrasis en esta corrida.

## 8. Seguridad (ownership/RLS)

Sin cambios de superficie de seguridad: `selectDocumentEvidence`/`verifyDocumentClaims` siguen exigiendo `workspaceId`/`lawyerId` (ownership). El gate H5 es puramente de respuesta (no modifica autorización). Supabase/RLS intactos.

## 9. Métricas 4.2.11 vs 4.2.12

| Métrica | 4.2.11 | 4.2.12 |
|---------|--------|--------|
| Suite | 601/601 (36 archivos) | **627/627 (37 archivos)** |
| Build | PASS | PASS |
| Consultas de contenido documental (H3) | `none` → sin evidencia | **`document` → SUCCESS con cita** |
| D2 (×2) | SUCCESS / NO_EVIDENCE (FLAKY) | **SUCCESS / SUCCESS** |
| D4 (×2) | SUCCESS / NO_EVIDENCE (FLAKY) | **SUCCESS / SUCCESS** |
| E1/M3 mixto sin fuentes públicas | NO_SOURCES_FOUND (PARTIAL) | **SUCCESS doc-only (4 claims)** |
| Anti-alucinación (I2, DocAbsent) | PASS | **PASS (intacta)** |
| Presupuesto LLM por request | ≤6 (máx. observado 3) | ≤6 (máx. observado 3) |

## 10. Criterios de éxito

- [x] **Offline matrix:** 26/26 tests nuevos PASS (H3 positivos/negativos/bloqueos, H4 accept/reject/guard/integración, H5 unit + intents reales).
- [x] **D2/D4 determinísticos en 2 corridas** (SUCCESS/SUCCESS, no FLAKY).
- [x] **Suite completa:** 627/627 PASS; build PASS; lint 0 errores.
- [x] **H5:** E1 (4.2.11 M3) pasa de NO_SOURCES_FOUND a SUCCESS doc-only con calibración honesta; intents públicos siguen bloqueados (unit + H5N1).

## 11. Límites y trade-offs conocidos

- **H3 familia elíptica eliminada:** "¿Qué plazo establece…?" **sin ancla** al documento NO activa modo documento (evita FPs de reglamento/normativa). La consulta se queda en búsqueda pública honesta.
- **H4 número-prioridad:** un claim con números exige que el número co-ocurra con el término fuerte en la misma oración; paráfrasis numéricas entre dígito y palabra ("1.500" vs "mil quinientos") no se componen en composiciones separadas (mil→1000, quinientos→500). Conservador y acotado a casos poco habituales.
- **H4 fallback por fragmento:** si ningún fragmento respalda los hechos, el claim se descarta con aviso (anti-alucinación intacta, puede costar utilidad en paráfrasis muy lejanas).
- **H5 solo responde con documento:** la respuesta doc-only avisa que no hay fuentes normativas; es un trade-off deliberado entre utilidad y honestidad (no se fabrica jurisprudencia).

## 12. Hallazgos residuales (no bloqueantes)

- `searchJurisprudence` en consultas tipo "normativa regula el plazo…" devuelve fuentes con solape parcial → el LLM a veces llega a NO_EVIDENCE honesto (H3N1 SUCCESS / H3N3 NO_EVIDENCE). No es un fallo de esta fase (búsqueda pública, no documento).
- No se reintrodujo la familia elíptica de H3; si el producto la requiere, debe evaluarse con más negativos antes de activarla.

---

FASE 4.2.12 — ROBUSTEZ DE REFERENCIAS DOCUMENTALES IMPLEMENTADA Y VERIFICADA.
NO SE HIZO COMMIT / PUSH.