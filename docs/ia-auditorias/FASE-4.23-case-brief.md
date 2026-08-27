# FASE 4.23 — Case Brief & Decision Context

**Estado:** CERTIFIED (sin commit/push, capa derivada, 855/855 PASS)
**Fecha:** 2026-08-27
**Base:** 4.22 drawer contexto (`AICaseWorkflowActionDrawer` + `AICaseChatDrawer`), `caseWorkflow` + `useAICaseWorkflow` + `AICaseIntelligence` certificados

---

## 1. Objetivo

Orquestar `Intelligence + Workflow + Documents` en una vista ejecutiva que responda en 10s: qué sé, qué falta, qué riesgos/contradicciones existen y qué hacer ahora, sin nuevo LLM ni RAG.

## 2. Arquitectura

```
Document Intelligence → Document Analysis → Verified Claims → Case Intelligence → Case Action Layer → Case Workflow → Case Brief (derivada) → WorkflowActionDrawer → Chat/Documents/Evidence
```
`Case Brief` no es fuente de verdad, consume `intelligence` + `workflow` + `documents` existentes.

## 3. Fuentes utilizadas

- `GET /api/ai/cases/:caseId/intelligence` (`facts, risks, contradictions, missingInformation, documents, document_count`)
- `GET /api/ai/cases/:caseId/workflow` (`ai_case_workflow_items` con `status/priority`)
- `useAIDocuments` para conteo y metadata documentos

## 4. Derivación

Helper puro `src/lib/caseBrief.ts` + `server/ai/caseBrief.mjs` (`deriveCaseBrief(intelligence, workflowItems, documents) → {documentCount,factCount,riskCount,contradictionCount,missingInformationCount,status,highlights,nextActions}`), sin queries, sin Supabase, sin LLM, sin embeddings. Determinista (JSON.stringify estable).

## 5. Estados

- `loading` → Skeleton
- `empty` (documentCount 0) → `Aún no hay documentos...` + `Ver documentos`
- `ready` → métricas + estado + highlights + nextActions + documentos
- `error` (intelligence) → `No pudimos cargar el resumen` + `Reintentar` (no bloquea workflow/docs), workflow error → `No pudimos cargar las acciones` + `Reintentar`

## 6. Prioridad

Highlights `high (contradiction/missing) → medium (risk) → low (fact)` y dentro `high>medium>low` con `order` map; `nextActions` `in_progress → pending high→medium→low → created_at`.

## 7. Workflow integration

`AICaseBrief` → `Qué hacer ahora` lista `pending/in_progress` (max 3, excluye `completed/dismissed`) + `Revisar` → `onOpenWorkflowAction(action_id)` → `AICaseDetail` → `setBriefWorkflowActionId` → `AICaseIntelligence externalWorkflowActionId` → `WorkflowActionDrawer` (mismo `PATCH`/`transitions`/`analytics` de 4.22).

## 8. Chat integration

`WorkflowActionDrawer Preguntar` → `if pending→PATCH in_progress` → `onQuestionClick(questionMap[action_id])` → `AICaseDetail setChatQuestion → AICaseChatDrawer externalQuestion → AIChat POST /api/ai/chat` (reusa `conversationId`, `workspaceId`, `verified claims`).

## 9. Evidence integration

Highlights con `evidence` → `Ver evidencia` → `EvidenceNavigator surface:case_brief` con `sourceId/fragmentId/pageNumber/evidence` preservados desde `intelligence.facts/contradictions`; si `evidence null` no muestra CTA (no inventa).

## 10. Analytics

- `ai_case_brief_viewed {document_count, risk_count, contradiction_count, missing_information_count}` (useEffect, sin PII)
- `ai_case_brief_action_clicked {action: review_risks|review_contradictions|review_missing_information|review_documents|fact|risk...}` (solo `actionId`, sin texto jurídico)

Reversa: no duplica `ai_case_workflow_viewed/action_started` etc.

## 11. Seguridad

RLS/ownership sin cambios: `auth.uid()→lawyer_id→workspace_id` via `getAIWorkspaceOwned` en `intelligence/workflow`; `AICaseBrief` solo consume datos ya autorizados; `B→A` DENIED (intelligence 404 + workflow 404). Test `M` cubre `A puede ver A`.

## 12. Tests

`server/ai/fase423.caseBrief.test.mjs` 14 tests:
A sin docs 0, B facts, C risks, D contradictions, E missing, F prioridad high>medium, G completed no pendiente, H dismissed no pendiente, I in_progress antes pending, J evidence preservado, K no evidence no CTA, L multi-doc conteo, M ownership determinista, N no LLM/predictivo.

## 13. QA

- `/lawyer/ai/cases/:caseId` → Brief visible con métricas reales
- Con docs → `Documentos >0`, highlights
- Con riesgos → `Revisar riesgo` → `WorkflowActionDrawer`
- `Ver evidencia` → `EvidenceNavigator`
- `Preguntar` → `Chat Drawer` → respuesta → `Ver evidencia`
- `Completar` → `completed` desaparece de pendientes, `refresh` persiste
- `B → A` DENIED

## 14. Performance

Sin requests nuevas: reutiliza `useAICaseIntelligence` y `useAICaseWorkflow` cache (React Query). No polling, no LLM, no fetch duplicado. `deriveCaseBrief` puro O(n).

## 15. Decisiones

- No nuevo endpoint `GET /case-brief` (frontend deriva de APIs existentes, evita duplicar backend)
- Helper puro en `src/lib` + `server/ai` para testabilidad y reutilización, sin Supabase/LLM
- `AICaseBrief` integrado como primer bloque en `intelligence` TabsContent (prioridad visual `Brief → Siguiente → Inteligencia` sin nueva ruta, respeta `AICaseDetail` tabs)
- `Lo más importante` max 3, `Qué hacer ahora` max 3, evita sobrecarga

## 16. Riesgos residuales

- `AICaseBrief` y `AICaseIntelligence` hacen cada uno `useAICaseIntelligence`/`useAICaseWorkflow` → doble query idéntica pero cacheada (1 network request efectiva por queryKey, no 2)
- Drawer de Brief abre `WorkflowActionDrawer` dentro de `AICaseIntelligence` vía `externalWorkflowActionId` prop (acoplamiento leve, pero evita duplicar drawer)

