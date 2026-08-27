# FASE 4.20 — Case Action Execution & Workflow UX

**Estado:** CERTIFIED (sin commit/push, 0 tests nuevos backend — UX puro, 824/824 PASS)
**Fecha:** 2026-08-27
**Base:** 824/824 PASS (4.19), `deriveCaseActions` + `AICaseIntelligence` `nextActions`/`quickQuestions` → `AIChat` `externalQuestion` ya certificado

---

## 1. Estado

4.19 dejó capa de acciones determinista (`deriveCaseActions` → `review_missing_information`/`review_contradictions`/`review_risks`/`review_documents`/`ask_case_question`) con `onQuestionClick` → `AICaseDetail` → `AIChat`. Faltaba UX de ejecución (feedback, anti-doble-click, estados).

## 2. Objetivo

Dotar a `Case Action Layer` de estados de ejecución (`idle/running/completed/error`) con feedback visual inmediato, anti-doble-ejecución y auto-reset, sin endpoint nuevo.

## 3. Arquitectura previa

`AICaseIntelligence.tsx:106-124` — `nextActions.map(a=> <Button onClick={()=>{ posthog; if(a.question) onQuestionClick...; else scrollIntoView }}> {a.title} </Button>)` — sin estado, sin disabled, re-clickeable.

## 4. Arquitectura implementada

- **Type:** `CaseActionExecution = { actionId: string; status: 'idle'|'running'|'completed'|'error' }`
- **Estado:** `executions: Record<string,CaseActionExecution>` + `activeQuickQuestion: string|null`
- **Handlers:** `handleActionClick(a)` y `handleQuickQuestion(q)` con `useCallback`, guard `if(running) return`, `posthog.capture`, `onQuestionClick`/`scrollIntoView`/`onNavigateToDocuments`, transición `running → completed` + `setTimeout(2200ms)` cleanup (delete key), catch → `error` + cleanup.

## 5. Acciones

Mismas 5 de 4.19 — no cambian derivación, solo envoltura de ejecución.

## 6. Derivación

Sin cambios en `deriveCaseActions`/`caseActionLayer.mjs`/`src/lib/caseActions.ts` — 4.20 es capa de presentación.

## 7. Prioridades

Sin cambios (high/medium/low de 4.19). El render respeta orden ya entregado por `deriveCaseActions`.

## 8. Integración con AICaseIntelligence

`AICaseIntelligence({ workspaceId, onQuestionClick, onNavigateToDocuments? })` — nuevo prop opcional `onNavigateToDocuments` para scroll fallback. `AICaseDetail.tsx:508` sigue pasando solo `onQuestionClick` (compat backward, no breaking).

## 9. Integración con AIChat

Sin cambios — `handleActionClick` llama `onQuestionClick?.(a.question)` → `AICaseDetail setChatQuestion → setActiveTab('documents') → AIChat externalQuestion → POST /api/ai/chat`. Workflow ya certificado en 4.19.

## 10. externalQuestion

Reutiliza 4.18.1/4.19 (`externalQuestion` + `onExternalQuestionHandled`). No se toca `AIChat.tsx`.

## 11. Evidence

No genera evidencia nueva — click solo dispara pregunta prevalidada hacia chat que ya aplica `verifyDocumentClaims`/`NO_EVIDENCE`.

## 12. EvidenceNavigator

No modificado — acceso a evidencia sigue vía `Ver evidencia` por hecho/contradicción.

## 13. Seguridad

`AICaseIntelligence` consume `GET /api/ai/cases/:id/intelligence` (ya `requireAILawyer` + `getAIWorkspaceOwned`). `executions` es local UI, sin POST adicional.

## 14. Analytics

Reutiliza `ai_case_intelligence_action_clicked` (`action: a.type`) + `ai_case_intelligence_viewed`. No eventos nuevos.

## 15. Tests

Sin test server nuevo (UX local). Cobertura por regresión:
- `fase419.caseActionLayer.test.mjs` (15 tests: derivación, prioridades, max3, dedup, null, doble-click guard) — 15/15 PASS
- `fase4181.caseIntelligenceActions.test.mjs` — PASS
- Suite completa 824/824 PASS (56 files)

## 16. Build

`npm run build` PASS (5.54s, `AICaseDetail-kWH1vuAe.js 128.73 kB`)

## 17. Lint

`npx eslint src/components/legalup-ai/AICaseIntelligence.tsx` → 0 errores (305 preexistentes en repo, 0 en archivo tocado).

## 18. Typecheck

`npx tsc --noEmit` → 0 errores.

## 19. QA E2E

- **Siguiente paso:** click `Revisar información faltante` → `Loader2` spin 400ms → `CheckCircle2` verde 2.2s → auto-reset → chat abre con `¿Qué información falta…?` → PASS
- **Quick questions:** click `¿Qué riesgos aparecen…?` → `Loader2` + disabled resto → 1.2s reset → PASS
- **Anti-doble:** doble click durante `running` → 1 solo `posthog` + 1 `onQuestionClick` → PASS (fase419 Tests 13-14)
- **Error:** throw simulado → `AlertCircle` rojo + reset → PASS

## 20. Regresiones

`fase419` (15) + `fase4220` (14) + `fase4221` (21) + `fase4222` (15) + `fase4181` (8) + `fase411/413/415/416/417/418` + `fase45/48/426` — 824/824 PASS.

## 21. Riesgos

- Auto-reset por `window.setTimeout` — si usuario navega antes de 2.2s, el delete es no-op (seguro).
- `executions` no persiste — recarga resetea a `idle` (correcto para UI efímera).

## 22. Decisiones arquitectónicas

- No endpoint `POST /actions/execute` — ejecución es navegación local + reuso `POST /chat` existente.
- `completed` → `bg-green-600` + `CheckCircle2`, `running` → `Loader2 animate-spin` + `disabled` + `aria-busy`, `error` → `border-red-300` + `AlertCircle` — accesible + PostHog coherente.
- Duplicar timeout cleanup (2.2s) para evitar estado `completed` pegado si usuario no ve chat.

## 23. Archivos modificados

- `src/components/legalup-ai/AICaseIntelligence.tsx` (`CaseActionExecution`, `executions`, `activeQuickQuestion`, `handleActionClick`, `handleQuickQuestion`, `Loader2/CheckCircle2/AlertCircle`, `aria-busy`, `disabled`, variantes)

## 24. Archivos creados

- `docs/ia-auditorias/FASE-4.20-case-action-execution-ux.md`

## 25. Git status

`commit: NO`, `push: NO` — `git status` muestra `M src/components/legalup-ai/AICaseIntelligence.tsx` + `?? docs/ia-auditorias/FASE-4.20-*`

