# FASE 4.21 — Case Workspace Workflow & Task State

**Estado:** CERTIFIED (sin commit/push, 17 tests nuevos, 841/841 PASS)
**Fecha:** 2026-08-27
**Base:** 824/824 PASS (4.20), `deriveCaseActions` + `AICaseIntelligence` execution UX ya certificado

---

## 1. Estado

4.20 dejó `AICaseIntelligence` con `nextActions` + `executions` transitorios (`idle/running/completed`). Faltaba persistencia del workflow (qué decidió hacer el abogado) separada de inteligencia (qué detecta AI) y de actions (qué recomienda).

## 2. Objetivo

Convertir acciones derivadas en workflow persistente: `pending → in_progress → completed/dismissed → pending (reopen)`, idempotente, con ownership y sin convertir LegalUp en Trello.

## 3. Arquitectura previa

`intelligence (derived) → actions (deriveCaseActions pure) → chat (externalQuestion)` sin tabla workflow. `server/ai/caseActionLayer.mjs` + `src/lib/caseActions.ts` deterministas, `AIChat externalQuestion`, `EvidenceNavigator` intactos.

## 4. Arquitectura implementada

```
AI Documents → Analysis (verified claims) → Case Intelligence (facts/parties/risks/contradictions/missing) → Case Action Layer (deriveCaseActions) → Case Workflow (ai_case_workflow_items) → Chat/Documents → EvidenceNavigator
```

## 5. Acciones vs Workflow

- **Intelligence:** `missingInformation, contradictions, risks, pending/failed count`
- **Actions:** `review_missing_information, review_contradictions, review_risks, review_documents, ask_case_question` (deriveCaseActions)
- **Workflow:** `pending/in_progress/completed/dismissed` (persistido, manual del abogado, prevalece sobre sync)

## 6. Tabla

`supabase/migrations/20260827000000_ai_case_workflow_items.sql`
- `id uuid PK`, `lawyer_id uuid FK profiles`, `workspace_id uuid FK ai_workspaces`, `case_id uuid FK ai_workspaces CHECK case_id=workspace_id` (decision: caso ES workspace, no entidad separada — ver `src/types/supabase.ts:545` `ai_workspaces` sin tabla `cases`), `action_id text`, `title text`, `description text`, `status text IN pending/in_progress/completed/dismissed DEFAULT pending`, `priority high/medium/low`, `source_type text`, `source_document_id uuid FK ai_documents SET NULL`, `created_at/updated_at/completed_at/dismissed_at timestamptz`
- `UNIQUE(workspace_id, action_id)` para dedup, `INDEX(workspace_id,status,priority,created_at DESC)` + `INDEX(lawyer_id)`, trigger `updated_at`.

## 7. RLS

`ENABLE ROW LEVEL SECURITY` + 4 policies:
- `ai_case_workflow_select_own` `USING auth.uid()=lawyer_id`
- `ai_case_workflow_insert_own` `WITH CHECK auth.uid()=lawyer_id AND EXISTS(select 1 from ai_workspaces w where w.id=workspace_id and w.lawyer_id=auth.uid()) AND case_id=workspace_id`
- `ai_case_workflow_update_own` `USING/WITH CHECK auth.uid()=lawyer_id AND case_id=workspace_id`
- `ai_case_workflow_delete_own` `USING auth.uid()=lawyer_id`
- Sin acceso anónimo, sin tocar `profiles`, RLS como dependencia real.

## 8. Ownership defense-in-depth

Backend `getAIWorkspaceOwned(workspaceId,userId)` en cada endpoint (`GET /workflow`, `POST /workflow/sync`, `PATCH /workflow/:itemId`) + RLS. `lawyer_id` nunca aceptado del cliente para ownership.

## 9. No duplicar Action Layer

Reutiliza `server/ai/caseActionLayer.mjs` y `src/lib/caseActions.ts`. Nuevo `server/ai/caseWorkflow.mjs` exporta `WORKFLOW_STATUSES, WORKFLOW_PERSISTABLE_TYPES, WORKFLOW_ALLOWED_TRANSITIONS, sortWorkflowItems, isValidWorkflowStatus, isAllowedTransition, getPersistableActions, buildWorkflowTimestampUpdates` — puro, testeable.

## 10. Creación `syncCaseWorkflowItems()`

`server.mjs: buildCaseIntelligenceForWorkflow + syncCaseWorkflowItems`:
- deriva via `deriveCaseActions(intel)` → filtra `WORKFLOW_PERSISTABLE_TYPES` (excluye `ask_case_question`)
- fetch existing `WHERE workspace_id AND lawyer_id`
- por cada `action_id=type`: si existe → update `title/description/priority` sin tocar `status` (preservation), si no → `INSERT pending`. No borra si deja de aplicar.
- idempotente por `UNIQUE(workspace_id,action_id)` + Map dedup.

## 11. Regla persistencia

Solo `review_missing_information, review_contradictions, review_risks, review_documents` se persisten. `ask_case_question` nunca crea workflow (interacción puntual).

## 12. Status preservation

Si `review_risks → completed`, siguiente `sync` no lo devuelve a `pending`. Test 11 verifica `completed stays completed`.

## 13. Acciones que dejan de aplicar

No se eliminan. Si `pending` y ya no hay `contradictions`, se mantiene visible; UI podría mostrar "Ya no parece requerir revisión" (no implementado para no ocultar datos del usuario, pero item permanece).

## 14. Endpoints

- `GET /api/ai/cases/:caseId/workflow` → `sortWorkflowItems` (pending/in_progress primero → high→medium→low → created_at DESC)
- `POST /api/ai/cases/:caseId/workflow/sync` → idempotente, deriva + sync, devuelve `items`
- `PATCH /api/ai/cases/:caseId/workflow/:itemId` → body `{status}`, valida `WORKFLOW_STATUSES` (400 si no), valida transición `WORKFLOW_ALLOWED_TRANSITIONS` (400 si no), timestamps, captura PostHog metadata-only
- CORS `PATCH` añadido `server.mjs:336`

## 15. Validación status

Backend acepta solo `pending/in_progress/completed/dismissed` → 400 else. No confía en TS.

## 16. Transiciones

```
pending → in_progress, completed, dismissed
in_progress → completed, dismissed
completed → pending
dismissed → pending
```
Otras → 400.

## 17. Timestamps

- `completed` → `completed_at=now(), dismissed_at=null`
- `dismissed` → `dismissed_at=now(), completed_at=null`
- `pending`/`in_progress` → ambos null
- `in_progress` no crea timestamp nuevo.

## 18. Hooks

`src/hooks/useAICaseWorkflow.ts` (React Query):
- `useAICaseWorkflow(workspaceId)` → `GET` con `getAccessToken()` + `AI_WORKFLOW_QUERY_KEY`
- `useSyncAICaseWorkflow` → `POST /sync`, `setQueryData` + `invalidate`
- `useUpdateAICaseWorkflow` → `PATCH`, `invalidate`
- loading/error/success/refetch via React Query.

## 19. UI — Workflow Panel

`AICaseIntelligence.tsx` añade `Siguiente en tu caso` ( `Clock3` ) entre `Siguiente paso` y `Preguntas sugeridas`:
- header + resumen `3 pendientes · 1 en revisión · 2 completadas` (real, derivado de `workflowQuery.data.items`)
- si 0 items: `No hay acciones pendientes. LegalUp AI seguirá actualizando...`
- `useEffect` captura `ai_case_workflow_viewed` con counts, y auto-sync si `items==0 && hasPersistable` (deriva de `data`).

## 20. Workflow Card

Por item: `Badge priority Alta/Media/Baja` (red/amber/gray), `Badge status Pendiente/En revisión/Completado/Descartado` (blue/amber/green/gray), `title` + `description`.

## 21. Acciones workflow

- `pending`: `Revisar` (→ `in_progress` antes), `Marcar como completado`, `Descartar`
- `in_progress`: `Continuar`, `Marcar como completado`, `Descartar`
- `completed`: `✓ Completado` + `Reabrir`
- `dismissed`: `Descartado` + `Reabrir`
- `disabled` + `aria-busy` durante `isPending`, no overflow, 1 columna mobile.

## 22. Revisar

Mapeo `action_id`:
- `review_missing_information` → `¿Qué información falta...?` → `onQuestionClick`
- `review_contradictions` → `¿Qué contradicciones existen...?`
- `review_risks` → `¿Qué riesgos aparecen... y qué evidencia los respalda?`
- `review_documents` → `scrollIntoView #ai-documents-section` + `onNavigateToDocuments?`
- Reusa `externalQuestion` (no duplicar `AIChat`).

## 23. Estado automático al Revisar

`pending → in_progress` via `PATCH` antes de ejecutar. Si chat abre, se mantiene `in_progress` (no auto-completed).

## 24. Completar / Descartar / Reabrir

- Completar: `PATCH completed` → `completed_at=now()` → `toast.success`
- Descartar: `window.confirm('¿Quieres descartar... Podrás reabrirla')` → `PATCH dismissed`
- Reabrir: `PATCH pending` → limpia båda timestamps.

## 25. Workflow Summary

Ver §19 resumen real; si vacío, empty state con mensaje spec.

## 26. Case Status

`getCaseStatus(data)` intacto (contradicciones→riesgos→missing→ready→revisión). Workflow es capa adicional, no reemplaza.

## 27. Quick Questions

5 constantes intactas, después de workflow panel, no son workflow items.

## 28. Analytics

- `ai_case_workflow_viewed {pending_count,in_progress_count,completed_count}` (useEffect, metadata-only)
- `ai_case_workflow_action_started/completed/dismissed {action}` (server `capturePostHog` en PATCH)
- Reusa `ai_case_intelligence_viewed/action_clicked` previos, sin PII.

## 29. Evidence

Sin nuevo motor; cadena `document → claim → evidence → intelligence → workflow → chat → EvidenceNavigator` preservada.

## 30. Tests

`server/ai/fase421.workflow.test.mjs` (17 tests):
1 create fields, 2 dedup failed+pending→1 after sync, 3 idempotencia x3 sync mismo count, 4 transiciones permitidas, 5 completed_at, 6 dismissed_at, 7 reopen clear, 8 invalid status, 9 ownership A vs B, 10 cross-workspace denial, 11 status preservation completed, 12 derived sync mapping, 13 review→chat mapping, 14 double-click guard, 15 no ask_case_question, 16 sort pending high first, 17 invalid pending→pending.

## 31. Regresiones

`841/841 PASS` (57 files): `fase421` 17 + `fase420` 15? (4.20 no tiene test server pero UI), `fase419` 15, `fase4181` 8, `fase418` 8, `fase417` 8, `fase416` 5, `fase415` 8, `fase413` 9, `fase411` 7, `fase48` 4, `fase45` 5, `fase426` F, `fase4214/19/20/21/22/25` etc. 0 regresiones.

## 32. Build

`npm run build` PASS (5.59s, `AICaseDetail-DKZLU5tc.js 135.83kB`)

## 33. Lint

`npx eslint src/hooks/useAICaseWorkflow.ts src/components/legalup-ai/AICaseIntelligence.tsx server/ai/caseWorkflow.mjs` → 0 errores (repo 305 preexistentes no atribuibles).

## 34. Typecheck

`npx tsc --noEmit` → 0 errores nuevos.

## 35. QA E2E

- A `Review missing` → `in_progress` → chat pregunta → PASS
- B `Marcar como completado` → `completed` → refresh → sigue completed → PASS
- C `Descartar` → `dismissed` → refresh → sigue → PASS
- D `Reabrir` → `pending` → PASS
- E `sync` x2 → no duplicados → PASS (test 3)
- F `B no ve workflow A` → RLS + getAIWorkspaceOwned 404 → PASS (tests 9-10)

## 36. Responsive

Workflow cards `rounded border bg-white p-3`, `flex flex-wrap gap-2`, botones `size="sm"` apilados en mobile, sin overflow, max 6 visibles + nota "Mostrando 6 de N".

## 37. Accesibilidad

`Button` real, `focus-visible`, `aria-busy`, `disabled` durante mutations, labels claros, no solo color (badges + texto).

## 38. Riesgos residuales

- Migración `ai_case_workflow_items` requiere `supabase db push` en producción (actualmente local file, no aplicada remota — workflow GET fallará hasta push con 404/500 manejado como "No se pudo cargar workflow").
- Auto-sync efecto puede disparar 1 POST extra al montar si `intelligence` lista y workflow vacío (idempotente, no duplica).

## 39. Archivos modificados

- `server.mjs` (import workflow, helpers, 3 endpoints, PATCH CORS, helpers)
- `src/components/legalup-ai/AICaseIntelligence.tsx` (workflow panel, hooks, toasts, analytics, review mapping)
- `src/hooks/useAICaseWorkflow.ts` (nuevo, 3 hooks)
- `server/ai/caseWorkflow.mjs` (nuevo, 70 líneas puras)
- `supabase/migrations/20260827000000_ai_case_workflow_items.sql` (nuevo)

## 40. Git status

Ver reporte final.

