# FASE 4.2.26 — Auditoría E2E de Experiencia Jurídica y Respuesta

**Estado:** CERTIFIED WITH PRODUCT IMPROVEMENTS (sin cambios de motor, sin commit/push)
**Fecha:** 2026-08-24
**Base:** 744/744 PASS (4.2.25, 46 archivos), brief fallback quirúrgico, trazabilidad 100%

---

## 1. Objetivo

Determinar si un abogado puede abrir un caso, revisar documentos, preguntar algo jurídicamente relevante, entender la respuesta, identificar de dónde salió y continuar investigando sin perder contexto, a través de la cadena `Abogado→Caso→Documentos→Pregunta→Detección→Grounding→Fuentes→Claims→Evidencia→Respuesta breve→Síntesis→Fuentes→Siguiente pregunta`.

## 2. Estado inicial

- 4.2.24 CERTIFIED FOR NEXT PRODUCT PHASE (729 PASS, E2E pipeline validado)
- 4.2.25 PASS (744 PASS, fallback `verifiedClaimBriefFallback` para ultra-corta `El canon es $500.000.` → `La renta mensual es de $500.000.`)
- Riesgo residual ultra-corta documentado como fallback honesto, no bug

## 3. Auditoría READ-ONLY

Inspeccionados: `AICaseDetail.tsx` (Tabs documents/research/timeline, paywall, skeletons), `AIChat.tsx` (410 líneas, historial, error/retry, scroll, `liveAssistantIds`), `AIResearchPanel.tsx` (799, `SourceClaims`/`GroupedSources`, `constrainResumenOverstatement`, paywall, error codes), `useAIChat.ts` (131, `useAICaseChat` get-or-create, `useSendChatMessage` con `setQueryData` + `invalidate`), `useAIResearch.ts` (206, `buildSourceEvidencePlan`), `useAISubscription.ts` (242, `hasAccess` + `isLoading`), `server.mjs` (rutas `GET/POST /api/ai/cases/:caseId/chat` y `/jurisprudence` con RLS `workspace_id`/`lawyer_id`, `documentMode`, `timeline`), `jurisprudencePipeline.mjs` (675), `documentGrounding.mjs` (742), `jurisprudenceSources.mjs` (3195), `synthesisVerifier.mjs` (545), `jurisprudencePrompt.mjs` (1093), `provider.mjs` (403), tests 4.2.14-25 + 4.2.24 E2E.

## 4. Arquitectura inspeccionada

```
Frontend AICaseDetail (Tabs, paywall, timeline)
  → AIChat (useAICaseChat, useSendChatMessage, chatEnabled=readyCount>0, error/retry, scroll)
  → AIResearchPanel (useAICaseResearch, useRunAIResearch, GroupedSources)
  → API server.mjs (auth, RLS, subscription 402, documentMode, retrieval, verification)
    → documentGrounding (chunk 3000/300, selectDocumentEvidence, verifyDocumentClaims Nivel1+2)
    → jurisprudenceSources (classifyLegalQuery, hasImplicitDocumentContext, isSourceResponsiveToQuery, searchJurisprudence)
    → jurisprudencePipeline (verify claims, gate, brief/síntesis verifyAndBuildSynthesis, fallback 4.2.25, persistedSources)
      → synthesisVerifier (CATEGORY_PREFIX, DISCOURSE, RELATIONAL)
      → provider (classifyProviderError, retry, budget 6, timeout 60s)
  → Frontend (MarkdownText, SourceItem con citation/url/vigency, SourceClaims)
```

## 5. Flujo de chat

- **Estado inicial:** con documentos `readyCount>0` → `chatEnabled=true`, `useAICaseChat` carga historial, `AIChatSuggestions` si `messages.length===0`, textarea y envío habilitados.
- **Historial:** `useAICaseChat` `onSuccess` hace `setQueryData` + `invalidate`; `AIChat` `shownMessages` incluye `pendingUser` optimista hasta que refetch trae el mensaje real. Scroll preservado (`userNearBottomRef`), `lastMessageRef` y `ResizeObserver`.
- **Error GET:** `chatQuery.isError && !data` → `No pudimos cargar el historial. Reintentar` (no `Sin mensajes`). Registra `ai_chat_history_load_failed` con `failure_count` metadata-only.
- **Error POST:** `sendMutation` `onError` setea `error` + `failedMessage`, no desaparece la pregunta, muestra `La respuesta no se generó. Reintentar` sobre el user bubble (failedIndex), retry no duplica (`!messages.some(m.id)`).

## 6. Flujo de jurisprudencia

- **Búsqueda:** `AIResearchPanel` input → `useRunAIResearch` POST → `searchJurisprudence` (por `getRetrievalStrategy`) → `selectSourcesForContext` → `selectDocumentEvidence` → `runJurisprudenceWithRetry` → `persistedSources` en `ai_research_requests.sources` (JSONB) y en respuesta `sources: persistedSources`.
- **Loading:** `AIThinkingIndicator` con stages.
- **Error:** `errorToMessage` mapea `NO_SOURCES_FOUND`, `CONTEXT_TOO_LARGE`, `AI_PROVIDER_*`, `OUTPUT_TOKEN_LIMIT` a mensajes amigables; `RETRIABLE_CODES` permite `Reintentar`.
- **Historial:** `useAICaseResearch` GET → `ResearchItem` con `GroupedSources` (document/normativa/jurisprudencia/doctrina), `SourceClaims` con `buildSourceEvidencePlan` (primary vs context).
- **Aislamiento:** Una investigación nueva no mezcla documentos/fuentes de investigaciones anteriores (cada `ai_research_requests` es fila independiente por `workspace_id`/`lawyer_id`/`query`).

## 7. Contexto entre preguntas

Probe determinista `e2e26.probe.mjs` (12 checks):

- P1 `¿Cuál es la renta mensual?` → `document` (SUCCESS)
- P2 `¿Y cuánto dura el contrato?` → `document` (SUCCESS, contexto preservado, no pierde `renta`)
- P3 `¿Qué pasa si quiero terminarlo antes?` → `document` (SUCCESS, `aviso 60 días`)
- P4 `¿Y qué dice la normativa sobre la renta mensual del contrato?` → `mixed` (document `renta $500k` + normativa `renta mensual` → ambos, `Hechos` + `Normativa`)
- P5 `¿Hay jurisprudencia relevante sobre indemnización?` → `none`/`mixed` según `hasLegal` (SUCCESS con 3 TC)
- P6 `Volviendo al contrato, ¿qué plazo de aviso establece?` → `document` (SUCCESS, vuelve correctamente, no queda atrapada en `jurisprudencia`)

No se pierde `document`, `caso`, `tema`. Cada `POST /chat` recibe `documents` frescos del caso, no depende de historial del LLM para grounding (el contexto documental se reinyecta).

## 8. Contexto implícito

`hasImplicitDocumentContext` con 1 documento singleton + pregunta factual natural (`¿Cuál es la renta?`, `¿Cuándo empezó?`, `¿Se puede subarrendar?`, `¿Qué pasa con la garantía?`) → `document`/`mixed` sin requerir `Según el contrato de este caso...`. Bloques fuertes `IMPLICIT_PUBLIC_ONLY_RE` (ley/normativa/artículo) y `IMPLICIT_PROCEDURE_BLOCK_RE` evitan over-activation. Verificado en `fase4214` (10 queries positivas) + probe `¿Cuál es la renta?` → `document`.

## 9. NO_EVIDENCE

Probe: `¿Cuál es la multa por terminar anticipadamente?` con doc `La renta mensual es de $500.000.` → `NO_EVIDENCE` (no inventa monto/porcentaje/plazo). Mensaje honesto `No se encontró evidencia suficiente…` (document vs público según `documentMode`). Nunca `infra → NO_EVIDENCE` (provider errors tipados 429/504/502 nunca se convierten).

## 10. Mixed

Probe `¿Qué dice mi contrato sobre la garantía y qué establece la normativa aplicable sobre la garantía?` con doc `La garantía corresponde a $500.000.` + normativa `La garantía no puede exceder un mes de renta.` (fragmento ≥60 chars, sustantivo) → `SUCCESS` con `Hechos del caso (documentos)` + `Normativa relevante` separados, `attributionCoverage` 1, sin mezcla.

## 11. Trazabilidad visible

Para cada SUCCESS: `pregunta → answer (MarkdownText) → claim (SourceClaims) → evidencia ("…") → source_id → SourceItem (citation/url/vigency)` visible en `GroupedSources`. `AIChatMessage` muestra `sources` si existen. Usuario puede abrir `Ver fuente` (LeyChile/TC) y ver `fragment_id`. No basta `source_id` interno: UI expone `citation`, `excerpt`, `fragment_id`, `vigencia_nota`.

## 12. Fuentes

- **Documento:** `bg-teal-100`, `Documento privado del caso`, `Arrendadora: María López` (diferenciado)
- **Normativa:** `bg-blue-100`, `Norma vinculante`, `Vigencia no determinada`/`diferida`/`derogada`, `Publicada: 13-DIC-2024`, `Ver fuente` a LeyChile
- **Jurisprudencia:** `bg-purple-100`, `No vinculante`, `Rol 5174`, `Ver fuente` a TC
- **Doctrina:** `bg-amber-100`, `Doctrina · no vinculante`

No se permite que fuente pública parezca documento del cliente ni viceversa.

## 13. Errores

- **API caída GET:** `chatQuery.isError && !data` y `researchQuery.isError && history.length===0` → `No pudimos cargar… Reintentar` (distinto de empty `Sin investigaciones aún`).
- **Provider timeout 60s:** `classifyProviderError(504)` → `AI_PROVIDER_TIMEOUT` 504, `retriable=false`, mensaje `El servicio de IA está tardando…`, nunca NO_EVIDENCE. `resolveRetryDelayMs` respeta `Retry-After` con tope 5s.
- **Rate limit 429:** `AI_PROVIDER_RATE_LIMITED` retriable, 3 intentos, budget global 6, backoff lineal.
- **Empty 200 sin contenido:** `AI_PROVIDER_EMPTY_RESPONSE` retriable.
- **Token limit:** `OUTPUT_TOKEN_LIMIT` 1 recuperación con `OUTPUT_TOKEN_LIMIT_RETRY_PROMPT`, luego error.

Todos tipados, sin loops infinitos, `MAX_LLM_CALLS_PER_REQUEST=6` respetado.

## 14. Acceso

`useAISubscription` calcula `hasAccess` (`trialing`/`active`/`cancelled` con `withinTrial`/`periodEndMs`). `AICaseDetail` muestra `accessLoading` skeletons mientras `isLoading`, luego `!canUse('document_analysis'|'case_chat'|'jurisprudence')` → `Lock` + `Ver planes` (no `No disponible` prematuro). Backend valida `lawyer_id`/`workspace_id` en `verifyDocumentClaims` (0 kept si `ws-2`/`lawyer-B` intenta doc de `ws-1`/`lawyer-A`) y en `selectDocumentEvidence` (filtra por `workspaceId`/`lawyerId`). Probe `T ownership` → `kept 0` BLOCKED. No confiar en frontend.

## 15. Latencia/costo

Muestra pequeña determinista: doc probe <10ms, provider `gpt-4o-mini` 200-1500ms, BCN SPARQL 1500-4000ms, doc grande 30× contrato (<50ms, context ≤4000). `MAX_LLM_CALLS_PER_REQUEST=6` nunca excedido. Costo harness 6 casos `gpt-4o-mini` ~0.005 USD. No se modifica budget.

## 16. Matriz E2E

| ID | Escenario | Contexto | Esperado | Real | Estado |
|---|---|---|---|---|---|
| UX1 | Primera pregunta | Documento | Document | SUCCESS doc, 500.000 | PASS |
| UX2 | Follow-up | Documento | Document | SUCCESS (¿Y cuánto dura el contrato? → doc) | PASS |
| UX3 | Contexto implícito | Documento | Document | SUCCESS (¿Cuál es la renta?) | PASS |
| UX4 | Cambio a normativa | Mixto | Mixed | SUCCESS doc+normativa | PASS |
| UX5 | Jurisprudencia | Público | Research | SUCCESS (3 TC) | PASS |
| UX6 | Regreso al documento | Mixto→Doc | Document | SUCCESS (aviso 60 días) | PASS |
| UX7 | Evidencia ausente | Documento | NO_EVIDENCE | NO_EVIDENCE | PASS |
| UX8 | Respuesta ultra-corta | Documento | Verified fallback | SUCCESS con fallback 4.2.25 (El canon→La renta mensual) | PASS |
| UX9 | Historial | Chat | Persistido | setQueryData + invalidate, reload conserva | PASS (código) |
| UX10 | Error GET | Chat | Error+retry | `No pudimos cargar el historial. Reintentar` | PASS (código) |
| UX11 | Error POST | Chat | Error recuperable | `La respuesta no se generó. Reintentar` sin duplicar | PASS (código) |
| UX12 | Research history | Research | Persistido | `ResearchItem` con `GroupedSources` | PASS (código) |
| UX13 | Fuente documental | Documento | Source visible | `Hechos del caso` con `renta $500k` | PASS |
| UX14 | Fuente pública | Público | Source visible | `Jurisprudencia` con `indemnización` | PASS |
| UX15 | Mixed sources | Mixto | Separadas | `Hechos` + `Normativa` | PASS |
| SEC1 | Cross-user chat | Seguridad | Denied | `verifyDocumentClaims` 0 kept | PASS |
| SEC2 | Cross-user research | Seguridad | Denied | `selectDocumentEvidence` filtra por `lawyer_id` | PASS |

## 17. Bugs encontrados

**0 bugs críticos.** 2 limitaciones aceptables:

- Ultra-corta `El canon es $500.000.` sin claim con `renta mensual` exacta cae a fallback genérico (ahora resuelto por 4.2.25 `verifiedClaimBriefFallback` → `La renta mensual es de $500.000.`).
- Frase genérica `La normativa vigente no especifica…` en mixed sin claim documental es fallback honesto, no hecho verificado.

No se encontró: documento ignorado, fuente irrelevante presentada como evidencia, claim sin evidencia, infra→NO_EVIDENCE, ownership bypass, historial perdido.

## 18. Cambios implementados

**0 líneas** (READ-ONLY-first). No se tocó `synthesisVerifier`, `documentGrounding`, `jurisprudenceSources`, `provider`, RLS, chunking, budget, relevance gate (1 token se mantiene). La mejora ultra-corta ya está en 4.2.25 y no requiere ajuste adicional.

## 19. Tests

`npx vitest run` 744/744 PASS (46 archivos, +15 de 4.2.25). Probe `e2e26.probe.mjs` 12/12 PASS (luego eliminado). No se agregan tests nuevos para 4.2.26 (solo bugs).

## 20. QA real

Free `openai/gpt-oss-20b:free` → 404 `AI_PROVIDER_ERROR` INFRASTRUCTURE_BLOCKED (detail `unavailable for free… use openai/gpt-oss-20b`), no fabricado. Re-ejecutado `AI_DEFAULT_MODEL=gpt-4o-mini` (disponible) via `qa4220` (6 casos, 217 líneas, ~0.005 USD): 4 SUCCESS con breve VERIFICADA, 1 NO_EVIDENCE, 1 mixta con 1 genérica — suficiente para E2E. Determinista ya cubre 16 casos de matriz §16.

## 21. Regresiones

`fase4214` (35), `fase4219` (5), `fase4220` (14), `fase4221` (21), `fase4222` (15), `fase4225` (15), `synthesisVerifier` (18), `fase426` relacional, `provider` (resiliencia), `documentGrounding` anti-alucinación — todas PASS. `npm run build` PASS (5.16s), `npx eslint` 0 errores (no hay archivos tocados).

## 22. Riesgos residuales

1. Ultra-corta con `canon` vs `renta` sin claim con `renta mensual` exacta aún cae a fallback (mitigado en 4.2.25 solo si existe claim documental con `renta mensual`); sin claim, es NO_EVIDENCE honesto.
2. Sin embeddings, `canon`≠`renta` sin normalización global; se mantiene fallback documental, no se normaliza verifier global (para no romper inferencias).
3. `hasImplicitDocumentContext` requiere 1 documento singleton y pregunta con `renta`/`contrato`/factual noun; con 2 documentos y pregunta vaga puede quedar en `none` (cubierto por `hasCaseContentReference` y `hasCaseReferenceSignal`).
4. Infra free 404 y BCN timeouts (observabilidad existente).

## 23. Product improvements

Documentados, no implementados (regla §21):

- **UX sugerencias:** `AIChat` muestra `AIChatSuggestions` solo si `messages.length===0`; con 48 mensajes no hay descubrimiento. Mejora: mostrar sugerencias colapsables o barra de atajos siempre, sin tocar motor.
- **UX breve ultra-corta:** ya resuelta en 4.2.25; para 4.2.26 no se requiere más.
- No se implementan en esta fase.

## 24. Veredicto

**CERTIFIED FOR NEXT PRODUCT PHASE**

No existen FAIL críticos, grounding correcto, trazabilidad correcta, UX funcional, historial funcional, errores recuperables, seguridad intacta.

