# FASE 4.2.15 — Auditoría de calidad post-4.2.14 y gate de relevancia en la respuesta

## 1. Objetivo
Identificar el **siguiente cuello de botella real** del pipeline de investigación
jurídica después de la Fase 4.2.14 (commit `49c9eb2`), con enfoque **READ-ONLY-first**,
sin reimplementar problemas ya resueltos. Si se demuestra un bug real → fix mínimo
único + tests + suites + QA real. Si no → `4.2.15 AUDIT PASS — NO IMPLEMENTATION REQUIRED`.

## 2. Estado del repositorio
- Base: commit `49c9eb2` (fase 4.2.14), HEAD limpio salvo docs no versionados de
  4.2.11/4.2.13 (no tocados).
- Cambios de esta fase (los únicos en el working tree):
  - `server/ai/jurisprudencePipeline.mjs` — fix del gate de relevancia en el Markdown.
  - `server/ai/fase4214.documentContextRobustness.test.mjs` — test de regresión.

## 3. Archivos inspeccionados (lectura READ-ONLY)
- `server.mjs` — ruta `POST /api/ai/cases/:caseId/jurisprudence` (líneas 8035-8471),
  barrera `validateResearchQuery` (8050), armado HTTP, mapeo de status.
- `server/ai/jurisprudencePrompt.mjs` (1090 líneas) — `JURISPRUDENCE_LIMITS`,
  `buildJurisprudenceSystemPrompt`, selección greedy con floor, `DOCTRINAL_OVERREACH_RE`,
  `detectExcessiveConclusions`, `buildJurisprudenceAnswer`.
- `server/ai/jurisprudencePipeline.mjs` (620 líneas) — gate de relevancia 4.2.14,
  verifier, jerarquía, contradicciones, síntesis verificada, persistencia.
- `server/ai/jurisprudenceSources.mjs` — `isSourceResponsiveToQuery`,
  `hasSubstantiveNormativeEvidence`, builders BCN/LeyChile y doctrina (OpenAlex).
- Frontend — `src/components/legalup-ai/AIResearchPanel.tsx`,
  `src/hooks/useAIResearch.ts`, `src/components/legalup-ai/resumenConstraint.ts`.
- Docs previos — FASE-4.2.9, 4.2.12, 4.2.13, 4.2.14 (parcial). No auditadas a fondo:
  FASE-4.2.8 y FASE-4.2.11 (solo inventario).

## 4. Método
1. **Inspección estática** de las fases deterministas y del armado de la respuesta.
2. **Probes deterministas** (sin LLM) para confirmar cada hallazgo.
3. **Harness determinista** sin LLM (dataset A-K, 52 consultas) que ejecuta los módulos
   reales: validación → clasificación → modo documental → retrieval público (TC/BCN;
   OpenAlex documentado como 429) → gate H5 → presupuesto → selección → evidencia
   documental → pipeline con salida sintética del modelo.
4. **QA real (LLM)** — bloqueada: el proveedor devuelve `HTTP 429` confirmado por ping
   directo en esta sesión → se clasifica `INFRASTRUCTURE_BLOCKED` (coherente con las
   certificaciones 4.2.13/4.2.14), no `FAIL` funcional.

## 5. Hallazgos (con clasificación P0–P4)

### F1 (P1 — confirmado por probe) — El gate de relevancia NO filtra el Markdown de la respuesta
En `buildJurisprudenceOutcome` (jurisprudencePipeline.mjs) el gate 4.2.14 filtra
`allVerifiedClaims`, `referenced`, `persistedSources` y la síntesis con las listas
filtradas (`filteredJurisprudencia`/`filteredDoctrina`), **pero `buildJurisprudenceAnswer`
recibía las listas SIN filtrar** (`verifiedJurisprudencia.kept`/`verifiedDoctrina.kept`).
Escenario alcanzable: consulta documental/mixta sin claims documentales verificados
(el gate se activa) donde ≥1 claim público sobrevive (relevante) y ≥1 jurisprudencia/
doctrina es descartada. El claim descartado seguía apareciendo en el Markdown
"Jurisprudencia relevante"/"Doctrina (no vinculante)" mientras quedaba fuera de
claims/referenced/persistedSources → inconsistencia entre la respuesta y el panel
"Fuentes verificables", y la filtración que 4.2.14 cerró reaparecía por el texto.

Probe determinista: query documental `¿Cuál es la renta mensual del contrato?` con
fuente relevante (bcn-1) y fuente irrelevante (tc-1 "daños"). Resultado pre-fix:
`allVerifiedClaims=['bcn-1']`, `referencedIds=['bcn-1']`, pero `answer` CONTENÍA
"Tribunal Constitucional — Rol 1".

### F2 (P2 — confirmado por probe) — Guard de sobrealcance de doctrina es no-op con warning falso
En `verifyJurisprudenceClaims` (jurisprudencePrompt.mjs:813-817) el guard
`DOCTRINAL_OVERREACH_RE` (línea 758) solo hace `warnings.push('Se descartó una afirmación
de doctrina que usa lenguaje normativo categórico; la doctrina no es fuente normativa.')`
**sin `continue`**. El claim con lenguaje normativo categórico ("Es obligatorio…")
**se conserva** mientras el warning afirma que se descartó. Probe: claim doctrina
"Es obligatorio cumplir la ley…" → `kept: 1` + warning "Se descartó". Las guards vecinas
(fragmento no soportado, norma derogada presentada como vigente) sí hacen `continue`.

### F3 (infra, transitorio) — Doctrina (OpenAlex) devuelve HTTP 429 en todas las llamadas
`https://api.openalex.org/works` responde 429 en cada llamada durante la auditoría
(0 fuentes de doctrina en las 52 consultas del harness). Es infraestructura transitoria,
no defecto de código; en 4.2.13 el pilar doctrina sí operó.

### F4 (limitación conocida, aceptada) — ARTICLE_LOOKUP de códigos sin texto normativo
"¿Qué dice el artículo 1545 del Código Civil?" recupera 0 normativa (solo jurisprudencia
TC); el texto del artículo de un código no se recupera. Limitación ya documentada y
aceptada como PASS con nota en FASE 4.2.13 G1. No es regresión.

### No-real (revisados, descartados) — candidatos previos
- Over-trim por `tokenOverlap` en greedy: la poda usa el formateador real + factor de
  seguridad 1.15 y preserva el floor; comportamiento esperado, sin regresión.
- `estimateSourceChars` hardcodea `[Fuente 1]` (título, no cantidad): sobreestima el
  tamaño del formateador real; conservador, sin impacto en corrección.
- Fragmento con excerpt vacío re-anclado: el verifier lo descarta por soporte insuficiente
  (conservador, esperado).
- `NO_SOURCES_FOUND` en modo documental: `shouldAllowDocumentOnlyFallback` permite el
  fallback solo si corresponde; el harness confirma el bloqueo correcto en H1.

## 6. Elección del cuello de botella
**F1 (P1)**. Rompe la garantía de relevancia de 4.2.14 en la salida que ve el usuario
(respuesta Markdown inconsistente con claims/fuentes persistidas) para una clase de
consultas documentales/mixtas. F2 queda documentado como siguiente riesgo (no se
implementa: se respeta la regla de un único cambio mínimo por fase).

## 7. Implementación del fix mínimo (F1)
En `buildJurisprudenceOutcome` se pasa a `buildJurisprudenceAnswer` la lista YA filtrada
por el gate, en lugar de la sin filtrar:

- `jurisprudencia: hasVerifiedClaims ? filteredJurisprudencia : []` (línea 448)
- `doctrina: hasVerifiedClaims ? filteredDoctrina : []` (línea 449)

No cambia el esquema, la verificación, la síntesis ni la persistencia. `buildJurisprudenceAnswer`
consume los mismos campos (`source.citation`, `afirmacion`, `fragmento`, `vigencia_nota`),
por lo que el cambio es compatible con las listas filtradas (subconjuntos de los claims
verificados).

## 8. Tests de regresión
En `fase4214.documentContextRobustness.test.mjs` (describe `buildJurisprudenceOutcome · gate
4.2.14`): caso "4.2.15: la fuente pública descartada por el gate NO aparece en el Markdown
de la respuesta". Modo mixto, sin claims documentales, una fuente relevante (Rol 1111)
y una irrelevante (Rol 5174). Asserts:
- `relevanceDroppedSources === 1`,
- `allVerifiedClaims`/`referencedIds` contienen solo `j-arriendo`,
- la sección "Jurisprudencia relevante" del Markdown contiene Rol 1111 y NO contiene 5174,
- el Aviso "Se descartó la fuente pública … 5174" sí se conserva.

Resultado pre-fix: FAIL (answer contenía 5174). Post-fix: PASS.

## 9. Harness determinista (sin LLM) — dataset A-K, 52 consultas
Réplica de las fases deterministas del endpoint con módulos reales y documento sintético
(contrato de arrendamiento; hechos: renta $500.000, garantía $1.000.000, QUINTA término
anticipado 60 días, SÉPTIMA sin subarriendo; ausentes: estado del inmueble, reparaciones,
daños, devolución). La etapa de pipeline usa **salida sintética** del modelo (sin llamar
al proveedor) y registra `llm: 'synthetic'`; la QA real quedó `INFRASTRUCTURE_BLOCKED`
(§11).

Resultados:
- 52 filas (A=10, B=7, C=5, D=5, E=4, F=4, G=4, H=5, I=4, J=2, K=2).
- 31 SUCCESS, 20 NO_EVIDENCE, 1 NO_SOURCES_FOUND.
- **LEAK (fix F1): 0 filas** — ninguna fuente descartada por el gate aparece en las
  secciones de contenido del Markdown.
- 5 filas con descarte por relevancia (E1, E3, K1, K2 + I1), incluida la inyección
  determinista de una fuente pública irrelevante fabricada (`Rol 5174 (sintética)`):
  el gate la descartó y el Markdown la excluyó; el aviso se conserva.
- Fuentes de doctrina recuperadas: 0 (OpenAlex 429 → F3).
- Comportamiento NO_EVIDENCE honesto en D (información ausente) e I (anti-alucinación):
  los claims falsos o sin soporte no se exhiben.
- H1 ("¿Puedo terminarlo?", sin contexto) → `NO_SOURCES_FOUND` correcto.

Artefactos en `/var/folders/0t/kvfnpv8s3hjfcq1_p8kn7blh0000gn/T/opencode/`:
`fase4215-qa.mjs`, `fase4215-qa.jsonl`, `fase4215-run.log`.

## 10. Suites
- `npx vitest run server/ai` → 27 archivos, **583 tests PASS**.
- `npx vitest run` (suite completa) → 38 archivos, **655 tests PASS**.
- `npm run build` → **built in 9.19s** (PASS).
- `npm run lint` → los archivos modificados (jurisprudencePipeline.mjs,
  fase4214.documentContextRobustness.test.mjs) lint **0 problemas**. El repositorio
  tiene 294 problemas preexistentes (frontend TS, supabase functions, tailwind.config)
  que **no** son de esta fase y no se tocan.

## 11. QA real (LLM)
Bloqueada por infraestructura. Ping directo a `openai/gpt-oss-20b:free` (vía
`chatCompletion` con dotenv y budget) → `AI_PROVIDER_RATE_LIMITED` (HTTP 429,
"El proveedor de IA está temporalmente limitado"). Clasificación: **INFRASTRUCTURE_BLOCKED**
(no es fallo funcional; coherente con 4.2.13/4.2.14). El fix de F1 es determinista y
queda cubierto por el test de regresión y el harness; no requiere LLM para su validación.

## 12. Limitaciones conocidas (residual aceptado)
- F3: pilar doctrina inoperante mientras OpenAlex responda 429 (infra, transitorio).
- F4: ARTICLE_LOOKUP de códigos sin texto normativo (aceptada desde 4.2.13).
- La QA real de esta fase no se pudo ejecutar; el comportamiento del LLM real frente al
  fix no se observó E2E (el cambio solo afecta el armado del Markdown, determinista).
- F2 (guard de doctrina no-op) documentado como próximo cuello de botella, no implementado.

## 13. Conclusión y estado de certificación
- Bug real demostrado (F1, P1) y **fix mínimo único implementado** con test de regresión.
- 655/655 tests PASS, build PASS, lint limpio en los archivos tocados.
- Harness determinista 52/52 sin leaks del gate en el Markdown.
- QA real: **INFRASTRUCTURE_BLOCKED** (proveedor 429), sin cambios de comportamiento
  no-deterministas por parte del fix.

Estado: **FASE 4.2.15 — CERTIFICADA (determinista). QA real pendiente por infraestructura
(proveedor rate-limited).**

Próximo cuello de botella recomendado (no implementado): F2 — hacer que el guard de
doctrina realmente descarte el claim categórico (`continue` en jurisprudencePrompt.mjs:813)
para alinear el warning con el comportamiento y la regla 5 del prompt.
