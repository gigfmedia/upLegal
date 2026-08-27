# FASE 4.21.2 — Case Intelligence Side Chat Drawer

**Estado:** CERTIFIED (sin commit/push, drawer + chat button, 841/841 PASS)
**Fecha:** 2026-08-27
**Base:** 4.21.1.1 fix workflow auth race (`82f5d52`), `AICaseIntelligence` + `AIChat` + `caseWorkflow` certificados

---

## 1. Objetivo

Inteligencia del caso debe abrir Chat contextual en panel lateral derecho sin cambiar de tab, manteniendo el caso visible detrás, reutilizando `AIChat` existente.

## 2. UX anterior

`AICaseIntelligence onQuestionClick → AICaseDetail setActiveTab('documents') → scroll #ai-documents-section → AIChat` en tab Documentos → pierde contexto de Inteligencia.

## 3. UX nueva

```
Inteligencia del caso
  Siguiente en tu caso [Revisar] / Preguntas sugeridas
        ↓ onQuestionClick(question)
  AICaseDetail openCaseChat(question) → setChatQuestion + setChatPanelOpen(true)
        ↓
  AICaseChatDrawer (right → left, 640px/90vw, overlay 30%)
        ↓
  AIChat externalQuestion → POST /api/ai/chat → respuesta → Ver evidencia → EvidenceNavigator
```
Tab permanece `intelligence`, drawer overlay mantiene contexto.

## 4. Arquitectura

```
AICaseDetail
 ├── AICaseIntelligence (deriveCaseActions + workflow + quickQuestions)
 │     ├── onQuestionClick(question) → open drawer
 │     ├── onOpenChat() → open drawer vacío
 │     └── onNavigateToDocuments() → setActiveTab('documents') (solo review_documents)
 └── AICaseChatDrawer
       └── AIChat (useAIChat, conversationId, externalQuestion, sources, EvidenceNavigator)
```

## 5. Integración con AIChat

Wrapper puro: `AICaseChatDrawer` no duplica `conversationId/messages/mutation/loading/evidence`. Solo layout + `open/onOpenChange` + `externalQuestion` pass-through. `AIChat` sigue dueño de `runMutation`, `sources`, `EvidenceNavigator surface:"chat"`.

## 6. externalQuestion

Reutiliza `externalQuestion`/`onExternalQuestionHandled` de 4.18.1. Orden:
`click → setChatQuestion → open drawer → AIChat monta → conversationId disponible → useEffect externalQuestion → setPendingUser → runMutation → onExternalQuestionHandled → clear`. No segundo mecanismo.

## 7. Estado del drawer

`AICaseDetail: const [chatPanelOpen,setChatPanelOpen]=useState(false); const [chatQuestion,setChatQuestion]=useState<string|null>(null);` Cerrar no destruye conversación (React Query cache `['ai-case-chat', workspaceId]`).

## 8. Focus management

Radix Dialog (`SheetPrimitive.Root`) provee `focus-trap`, `aria-modal`, `role=dialog`, `ESC` y overlay click → `onOpenChange(false)`. Header `LegalUp AI` con `SheetPrimitive.Title`, botón cerrar `aria-label="Cerrar chat"` con `focus-visible:ring`, al cerrar focus retorna al trigger (Radix).

## 9. Responsive

`w-[100vw] sm:w-[90vw] md:w-[640px] lg:w-[640px] max-w-[90vw] lg:max-w-[640px]` → Desktop 640px (dentro de 560-680), Tablet 90vw, Mobile 100vw. `flex flex-col h-full` header fijo, `flex-1 overflow-y-auto` messages, input fijo abajo (AIChat interno).

## 10. EvidenceNavigator

`AIChatMessage` → `Ver evidencia` → `EvidenceNavigator` con `surface:"chat"` abre por encima del drawer (portal z-50, drawer también z-50 pero EvidenceNavigator con z mayor en su portal). No duplica EvidenceNavigator.

## 11. Workflow

`pending→in_progress` antes de abrir drawer (ya en `AICaseIntelligence` workflow `handleReview` con `PATCH in_progress`). Cerrar drawer mantiene `in_progress`, `Completar` sigue explícito `PATCH completed`. No auto-completed.

## 12. Analytics

Reutiliza `ai_case_intelligence_action_clicked {action}` y `ai_case_workflow_action_started {action}`. Añade `ai_case_chat_drawer_opened {source: case_intelligence|intelligence_button}` metadata-only, sin PII (no pregunta, no nombre caso).

## 13. Seguridad

RLS/ownership sin cambios: `requireAILawyer → getAIWorkspaceOwned → ai_case_workflow_items` + `AIChat` usa `workspaceId` + `Bearer`. No bypass, no nueva tabla.

## 14. Tests

Sin tests nuevos de UI (drawer es wrapper). Regresiones `57 files 841 tests PASS` (incl. `fase421.workflow 17`). Build/lint/typecheck PASS.

## 15. E2E

- `Revisar riesgos` → drawer `data-state=open` → `POST /chat` 1 vez → respuesta → `Ver evidencia` → `EvidenceNavigator`
- `Pregunta sugerida` → drawer → POST 1
- `Chat del caso` botón header → drawer vacío con `AIChatSuggestions`
- `review_documents` → `setActiveTab('documents')` + scroll, no drawer
- Doble click rápido → `sending` guard → 1 POST
- ESC / overlay → close, `activeTab` sigue `intelligence`
- Cerrar/reabrir → misma `conversationId`, no duplicada
- Mobile 100vw, input visible

## 16. Build

`npm run build` PASS 10.06s `AICaseDetail-C2uwHkVs.js 139.47kB`

## 17. Lint

`npx eslint AICaseChatDrawer.tsx AICaseDetail.tsx AICaseIntelligence.tsx` → 0

## 18. Typecheck

`npx tsc --noEmit` → 0

## 19. Regresiones

`841/841` (fase421, fase420, fase419, fase418, fase417, fase416, fase415, fase413, fase411, fase48, fase45, fase426)

## 20. Riesgos residuales

- `AIChatSidePanel.tsx` ahora re-exporta `AICaseChatDrawer` para compat; dos nombres para mismo drawer (no rompe, pero mantener uno a futuro)
- Drawer `640px` ligeramente menor que previo `720px` de 4.21.2 inicial (dentro de spec 560-680, más apropiado)

## 21. Decisiones arquitectónicas

- No nuevo endpoint/tabla/RAG/embeddings, solo UX wrapper
- Reutilizar `Sheet` (`@radix-ui/react-dialog`) con `slide-in-from-right` (mismo patrón que filtro `/search` si existiera) + overlay `bg-black/30`
- `AIChat` condicional `{open && <AIChat .../>}` evita query duplicada cuando cerrado
- `case_id === workspace_id` preservado, `review_documents` excluido de drawer por ser navegación documental
