# FASE 4.24 — Case Workspace Command Center

**Estado:** CERTIFIED (sin commit/push, capa orquestación, 855/855 PASS)
**Fecha:** 2026-08-27
**Base:** 4.23 Case Brief (`deriveCaseBrief` + `AICaseBrief`), `AICaseWorkflowActionDrawer` + `AICaseChatDrawer` + `EvidenceNavigator` certificados

---

## 1. Objetivo

Convertir `Brief + Workflow + Documents + Chat` dispersos en pestañas en un **Command Center** como vista inicial del caso que responde en 10s: qué sé, qué falta, qué riesgos/contradicciones existen y qué hacer ahora, sin RAG/embeddings/LLM nuevo.

## 2. Problema UX

Antes: Brief dentro de `Inteligencia` tab + Workflow inline + Documents en otro tab → sensación "aplicación por pestañas". Objetivo: `Caso → Command Center (Resumen + Estado + Lo más importante + Qué hacer ahora + Documentos + Acciones rápidas)` como vista de control.

## 3. Arquitectura

```
Documents → Case Intelligence → deriveCaseBrief → Case Workflow (ai_case_workflow_items) → Command Center (consume Intelligence + Workflow + Documents) → WorkflowActionDrawer → ChatDrawer → EvidenceNavigator
```
Command Center es capa derivada/presentacional, no fuente de verdad; reusa `deriveCaseBrief`, `useAICaseIntelligence`, `useAICaseWorkflow`, `useAIDocuments`, `AICaseWorkflowActionDrawer`, `EvidenceNavigator`, `AICaseChatDrawer`.

## 4. Componentes reutilizados

- `deriveCaseBrief` (`src/lib/caseBrief.ts` + `server/ai/caseBrief.mjs`)
- `useAICaseIntelligence` / `useAICaseWorkflow` / `useAIDocuments` (React Query, mismas `queryKey`)
- `AICaseWorkflowActionDrawer` (contexto, evidencia, `Ver evidencia`, `Preguntar`, `Completar/Descartar/Reabrir`)
- `EvidenceNavigator` (`surface: command_center`)
- `AICaseChatDrawer` (`externalQuestion` → `POST /api/ai/chat`)
- UI `Card, Badge, Button, Skeleton`, `Lucide`, `posthog`

## 5. Datos consumidos

- `intelligence.document_count, facts, risks, contradictions, missingInformation, documents`
- `workflowItems` (`status/priority/action_id`)
- `documents` metadata (`original_filename, status`)
Derivación pura, sin queries nuevas en helper, sin Supabase en `deriveCaseBrief`.

## 6. Derivaciones

`deriveCaseBrief` → `{documentCount,factCount,riskCount,contradictionCount,missingInformationCount,status,highlights[≤3],nextActions[≤3]}` con `high>medium>low` y `in_progress>pending`.

## 7. Estados

- `loading` → 3 Skeletons
- `intelligence.isError` → `No pudimos cargar la inteligencia` + `Reintentar` (no bloquea workflow)
- `workflow.isError` → `No pudimos cargar las tareas` + `Reintentar` (no bloquea Brief)
- `empty` (documentCount 0) → `Este caso todavía no tiene documentos. Agregar documento` + CTA
- `ready` → métricas + estado + highlights + nextActions + documentos

## 8. Acciones

`Lo más importante` (max 3: `risk/contradiction/missing/fact` con `Ver evidencia` + `Revisar → WorkflowActionDrawer`) y `Qué hacer ahora` (max 3 `pending/in_progress` orden `high>medium>low`) → `Revisar` → `WorkflowActionDrawer` (mismo `PATCH`/`transitions` de 4.22).

## 9. Integración Workflow

`CommandCenter openWorkflowByActionId(actionId) → find workflowItem → setSelected + setDrawerOpen → WorkflowActionDrawer` con `intelligence` para contexto (`missingInformation`, `risks`, `contradictions` con `Ver evidencia` por fuente, `documents`). `Completar/Descartar/Reabrir` via `useUpdateAICaseWorkflow` + `toast` + `invalidate`.

## 10. Integración Chat

`WorkflowActionDrawer Preguntar` → `if pending→PATCH in_progress` → `onAskQuestion(questionMap[action_id])` → `AICaseDetail setChatQuestion → AICaseChatDrawer externalQuestion → AIChat POST /api/ai/chat` (reusa `conversationId`, no segundo chat).

## 11. Integración Evidence

`highlight.evidence` → `Ver evidencia` → `EvidenceNavigator` (`sourceId/fragmentId/pageNumber/evidence`) con `getAIDocumentOwned` + `chunkDocumentText` validación; si `evidence null` no muestra CTA (no inventa).

## 12. Integración Documents

`Documentos del caso` muestra `3 documentos` + lista `3 recientes` con `status` (`Procesando/Listo/Error`) + `Ver todos los documentos` → `setActiveTab('documents') + scroll #ai-documents-section`; `Agregar documento` cuando empty.

## 13. Analytics

- `ai_case_command_center_viewed {document_count, risk_count, contradiction_count, pending_count}` (metadata-only)
- `ai_case_command_center_action_clicked {action: review_risks|review_contradictions|review_missing_information|review_documents|ask_case_question|view_intelligence|view_documents}` (solo `actionId`)
No envía `case name, document content, evidence, question`.

## 14. Seguridad

RLS/ownership sin cambios: `auth.uid()→lawyer_id→workspace_id` via `getAIWorkspaceOwned` en `intelligence/workflow`; `CommandCenter` solo consume datos autorizados; `B→A` DENIED (intelligence 404 + workflow 404).

## 15. Responsive

`grid-cols-2 sm:grid-cols-5` métricas, `grid-cols-1 sm:grid-cols-3` highlights, `flex-col` mobile, no horizontal scroll, `Card` y `Button` táctil.

## 16. Accesibilidad

`h3` headings semánticos, `Button` reales, `focus-visible:ring`, `aria-busy` en `isPending`, `aria-label` en `Ver evidencia`, `role=dialog` en drawers, `ESC` y overlay en drawers.

## 17. Tests

`58 files 855 tests PASS` (14 nuevos `fase423` para `deriveCaseBrief`: sin docs, facts, risks, contradictions, missing, prioridad, completed/dismissed, in_progress, evidence, multi-doc, determinismo, no predictivo). `AICaseCommandCenter` no agrega tests nuevos (reusa lógica certificada).

## 18. QA

- `Mis casos → Abrir caso → Resumen` visible con métricas reales
- Con riesgos → `Revisar riesgo` → `WorkflowActionDrawer`
- `Ver evidencia` → `EvidenceNavigator`
- `Preguntar` → `Chat Drawer` → respuesta
- `Completar` → desaparece de pendientes, `refresh` persiste
- `B→A` DENIED

## 19. Regresiones

`855/855` (fase421, fase420, fase419, fase418, fase417, fase416, fase415, fase413, fase411, fase48, fase45, fase426, fase423)

## 20. Riesgos residuales

- `AICaseCommandCenter` y `AICaseIntelligence` hacen cada uno `useAICaseIntelligence/useAICaseWorkflow` → 2 hooks mismas keys, cache evita 2 network pero 2 subscriptions (aceptable)
- `Command Center` como `overview` tab es nueva vista inicial (`defaultTab || 'overview'`), deep links con `?tab=documents|intelligence` siguen funcionando (compatibilidad)

## 21. Decisiones arquitectónicas

- No nuevo endpoint `GET /case-brief` (frontend deriva de `intelligence` + `workflow` existentes)
- `deriveCaseBrief` puro sin Supabase/LLM para testabilidad y single source of truth (`deriveCaseActions`/`caseWorkflow` reutilizados)
- `AICaseCommandCenter` como primer `TabsContent value="overview"` en `AICaseDetail`, respeta `DashboardLayout`, `Tabs`, `Drawer`/`EvidenceNavigator` existentes
- `Sin RAG, Sin embeddings, Sin OCR, Sin tablas nuevas, Sin nuevo motor de evidencia, Sin nuevo sistema de Chat`
