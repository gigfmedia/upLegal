# FASE 4.22 — Case Workflow Action Execution & Context

**Estado:** CERTIFIED (sin commit/push, drawer contexto + execution, 841/841 PASS)
**Fecha:** 2026-08-27
**Base:** 4.21.2 drawer lateral (`AICaseChatDrawer 640px`), `caseWorkflow` + `useAICaseWorkflow` + `AICaseIntelligence` workflow persistente

---

## 1. Objetivo

Convertir `Siguiente en tu caso` de lista estática a experiencia de trabajo contextual: click → drawer con contexto real (missing/risks/contradictions/documents) → `Preguntar a LegalUp AI` → `Chat` → `Evidencia` → `Completar`.

## 2. Problema

Antes `Revisar` abría directamente `Chat` sin mostrar qué detectó Inteligencia, ni permitir revisar evidencia previa, ni distinguir `review_documents` (navegación) de `review_risks` (pregunta).

## 3. Arquitectura antes

`Inteligencia → deriveCaseActions → ai_case_workflow_items → inline cards [Revisar|Completar|Descartar] → onQuestionClick → Chat`

## 4. Arquitectura después

`Inteligencia → deriveCaseActions → ai_case_workflow_items → inline cards (click → WorkflowActionDrawer) → contexto (intelligence.missing/risks/contradictions/documents) → [Preguntar|Ver documentos] → ChatDrawer (externalQuestion) → EvidenceNavigator`

## 5. Drawer

`src/components/legalup-ai/AICaseWorkflowActionDrawer.tsx` (Sheet `right`, `560-640px`, `90vw` mobile, `bg-black/30` overlay, `slide-in-from-right`, `role dialog aria-modal`, `ESC` + overlay click, focus trap via Radix, header `title + Alta/Media/Baja + Pendiente/En revisión` + `Detectado a partir de N documentos`)

## 6. Action execution

Card ahora `role=button` con `onClick` → `setSelectedWorkflowItem + setWorkflowDrawerOpen + capture ai_case_workflow_action_opened`. Botones `Revisar/Continuar` abren drawer (no POST directo), `Completar/Descartar/Reabrir` siguen `PATCH` directo con `isPending` + `aria-busy`.

## 7. Chat integration

Drawer `Preguntar a LegalUp AI` → `if pending → PATCH in_progress` → `onQuestionClick(questionMap[action_id])` → `AICaseDetail setChatQuestion → AICaseChatDrawer externalQuestion → AIChat POST /api/ai/chat` (reusa `conversationId`). `review_documents` no pregunta, hace `onViewDocuments → scroll #ai-documents-section`.

## 8. Evidence integration

`review_contradictions` lista `intelligence.contradictions` con `Fuente A/B` + `Ver evidencia` → `EvidenceNavigator` (`surface: case_workflow_drawer`). `review_risks/missing` no inventan evidencia; si `intelligence.risks.length===0` muestra `No se detectaron riesgos`.

## 9. Workflow lifecycle

`pending → in_progress (al Preguntar) → completed/dismissed (PATCH) → pending (Reabrir)` con `completed_at/dismissed_at` según `caseWorkflow.mjs` (`buildWorkflowTimestampUpdates`), `sortWorkflowItems` preservado, `UNIQUE(workspace_id,action_id)` y `status preservation` intactos. Summary `N pendientes·M en revisión·K completadas` se invalida vía `AI_WORKFLOW_QUERY_KEY`.

## 10. Seguridad

RLS/ownership sin cambios: `auth.uid()→lawyer_id→workspace_id→workflow` via `getAIWorkspaceOwned` en `GET/POST sync/PATCH`. `B→A` bloqueado (`404` + RLS `auth.uid()=lawyer_id`). No nueva tabla.

## 11. Analytics

Reusa `ai_case_workflow_viewed/action_started/completed/dismissed`; añade `ai_case_workflow_action_opened {action, status}` (metadata-only, sin PII) + `ai_case_chat_drawer_opened` existente.

## 12. Tests

Sin tests nuevos de drawer (wrapper). `57 files 841 tests PASS` (fase421 17, fase420 etc.). `npm run build` PASS 5.05s `AICaseDetail-CME4T_tQ.js 147.70kB`, `npx tsc --noEmit` 0, `eslint AICaseWorkflowActionDrawer, AICaseIntelligence` 0 tras fix `catch {void 0}`.

## 13. E2E

- `Siguiente en tu caso → Revisar riesgos` → drawer con `Riesgos detectados` + `Preguntar` → Chat con `¿Qué riesgos... evidencia...?` → respuesta → `Ver evidencia`
- `Completar información` → drawer → `missingInformation` lista → `Preguntar` → `in_progress`
- `Contradicciones` → drawer → `Fuente A/B` → `Ver evidencia` por separado
- `Documentos` → `Ver documentos` → scroll `#ai-documents-section`
- `Completar → refresh → completed`, `Descartar → dismissed`, `Reabrir → pending`
- Doble click `Revisar` → `openDrawer` 1 vez (no POST duplicado), `Preguntar` con `pending→in_progress` 1 PATCH
- Mobile drawer `100vw`, Chat y EvidenceNavigator stacking OK

## 14. Build

PASS 5.05s

## 15. Lint

0 (fix `no-empty` en `catch`)

## 16. Typecheck

0

## 17. Riesgos residuales

- Dos drawers (WorkflowActionDrawer + CaseChatDrawer) pueden estar abiertos simultáneamente si usuario abre acción y luego Preguntar (workflow se cierra al abrir chat via `onOpenChange(false)` — intencional para evitar stacking doble)
- Card `role=button` con `onKeyDown Enter/Space` accesible, pero `Revisar` y `Ver detalle` duplican acción (aceptable para descubrimiento)

## 18. Decisiones arquitectónicas

- Sin RAG/embeddings/OCR/tablas nuevas, solo `AICaseWorkflowActionDrawer` presentacional (70 líneas) + integración en `AICaseIntelligence` (card → drawer)
- Reutiliza `deriveCaseActions`, `intelligence.*`, `EvidenceNavigator`, `AIChat` + `externalQuestion`, `useAICaseWorkflow` (+ `updateWorkflow`), `Sheet` pattern de `AICaseChatDrawer`
- `Sin RAG, Sin embeddings, Sin OCR, Sin tablas nuevas, Sin nuevo motor de evidencia, Sin nuevo sistema de Chat`

