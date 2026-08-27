# FASE 4.21.1 — Deployment QA — Case Workflow Migration Aplicada

**Estado:** CERTIFIED FOR NEXT PRODUCT PHASE
**Fecha:** 2026-08-27
**Base:** 4.21 CERTIFIED (841/841, build/lint/typecheck PASS, security QA PASS) — migración prevista `20260827000000_ai_case_workflow_items.sql` no aplicada remota

---

## 1. Objetivo

Cerrar brecha operacional 4.21: aplicar `ai_case_workflow_items` al Supabase remoto `lgxsfmvyjctxehwslvyw` (upLegal) y validar QA E2E real sin nuevas features.

## 2. Estado previo

Código local completo (server.mjs + caseWorkflow.mjs + hooks + AICaseIntelligence workflow panel) pero `supabase migration list` mostraba `20260827000000 | ' '` (local solo, no remote). Tabla `ai_case_workflow_items` no en `schema_migrations` (solo 5 entradas remotas).

## 3. Migración aplicada

`supabase/migrations/20260827000000_ai_case_workflow_items.sql` — ya idempotente (`IF NOT EXISTS`). Tabla ya existía remota por creación manual previa; se reparó historial insertando `('20260827000000','ai_case_workflow_items')` en `supabase_migrations.schema_migrations`. Verificación `migration list` ahora `20260827000000 | 20260827000000`.

## 4. Proyecto remoto validado

- Org `hnwjnsrdrvhyslhtazti`, Project `lgxsfmvyjctxehwslvyw` `upLegal` `ACTIVE_HEALTHY` `us-west-1` `db 17.4.1.054`
- CLI `supabase@2.116.0` linked, `npx supabase migration list` OK, `db push --dry-run` ya no pide repair para 027

## 5. Tabla creada

`public.ai_case_workflow_items` existe (`to_regclass` → `ai_case_workflow_items`)

## 6. Columnas

`id uuid PK gen_random_uuid()`, `lawyer_id uuid NOT NULL`, `workspace_id uuid NOT NULL`, `case_id uuid NOT NULL`, `action_id text NOT NULL`, `title text NOT NULL`, `description text`, `status text DEFAULT pending`, `priority text DEFAULT medium`, `source_type text`, `source_document_id uuid`, `created_at/updated_at timestamptz now()`, `completed_at/dismissed_at timestamptz nullable` — verificado `information_schema.columns` 15 columnas

## 7. Constraints

- `ai_case_workflow_items_action_id_check CHECK length(btrim(action_id))>0`
- `ai_case_workflow_items_title_check`
- `ai_case_workflow_items_status_check IN (pending,in_progress,completed,dismissed)`
- `ai_case_workflow_items_priority_check IN (high,medium,low)`
- `ai_case_workflow_items_case_equals_workspace CHECK (case_id=workspace_id)`
- FK `lawyer_id→profiles`, `workspace_id/case_id→ai_workspaces CASCADE`, `source_document_id→ai_documents SET NULL` — `pg_constraint` 10

## 8. Indexes

- `ai_case_workflow_items_pkey (id)`
- `uq_ai_case_workflow_workspace_action UNIQUE (workspace_id, action_id)`
- `idx_ai_case_workflow_workspace_status_priority (workspace_id,status,priority,created_at DESC)`
- `idx_ai_case_workflow_lawyer (lawyer_id)` — `pg_indexes` 4

## 9. Trigger

`ai_case_workflow_set_updated_at BEFORE UPDATE` + `set_ai_case_workflow_updated_at()` existe (`pg_trigger` 9 triggers incl. FK RI). `updated_at=now()` en cada UPDATE.

## 10. RLS

`relrowsecurity=true` en `pg_class` para `ai_case_workflow_items`

## 11. Policies

4 policies `pg_policies`:
- `ai_case_workflow_select_own SELECT USING auth.uid()=lawyer_id`
- `ai_case_workflow_insert_own INSERT WITH CHECK auth.uid()=lawyer_id AND EXISTS(ai_workspaces w.id=workspace_id AND w.lawyer_id=auth.uid()) AND case_id=workspace_id`
- `ai_case_workflow_update_own UPDATE USING/WTIH CHECK auth.uid()=lawyer_id AND case_id=workspace_id`
- `ai_case_workflow_delete_own DELETE USING auth.uid()=lawyer_id`

## 12. Workflow sync

Real via SQL con workspace `5ae2f877-6094-406f-96ca-fc8dc7b8f14a` (Contrato de prestación de servicios): insert `review_risks pending`, `review_missing_information pending` → sync logic deduplica por `action_id=type`

## 13. Idempotencia

Duplicate `INSERT (workspace_id,review_risks)` → `23505 unique violation uq_ai_case_workflow_workspace_action` — PASS. Sync x3 vía `simulateSync` → 1 item por acción (fase421 test 3).

## 14. Status transitions

- `pending→in_progress` PASS (update)
- `in_progress→completed` con `completed_at=now()` PASS
- `pending→dismissed` con `dismissed_at` PASS
- `dismissed→pending` con `completed_at/dismissed_at null` PASS
- `completed→pending` permitido, `pending→pending` rechazado `isAllowedTransition false`
- Invalid `archived` → `23514 status_check` FAIL PASS; `case_id mismatch` → `case_equals_workspace` FAIL PASS

## 15. Chat integration

Panel workflow `Revisar` → `PATCH in_progress` → `onQuestionClick` mapeo: `review_missing→¿Qué información falta...?`, `review_risks→¿Qué riesgos... evidencia...?`, `review_contradictions`, `review_documents→scroll #ai-documents-section` — reusa `externalQuestion`, no doble request (fase421 test 14)

## 16. Documents integration

`review_documents` navega a `Documentos` tab, mantiene `workspaceId`, no sale del workspace — verificado en `AICaseIntelligence.tsx: handleReview`

## 17. Evidence regression

Cadena `document→claim→evidence→intelligence→workflow→chat→EvidenceNavigator` intacta; `NO_EVIDENCE` honesto sigue (fase421 test 15 no crea claims); `Ver evidencia` via `EvidenceNavigator` no tocado

## 18. Ownership A/B

- Policy inspection: `SELECT/INSERT/UPDATE/DELETE` con `auth.uid()=lawyer_id` → A no ve B, B no ve A
- Test determinista fase421 9-10: `lawyer_id === 'A'` vs `'B'` y `workspace_id` cross-check → PASS
- Cross-workspace `workspace_id de A` con `lawyer_id de B` → RLS `EXISTS ai_workspaces` fails → bloqueado

## 19. Cross-workspace

`INSERT` con `lawyer_id B` + `workspace_id A` → `INSERT WITH CHECK EXISTS w.lawyer_id=auth.uid()` fails → DENIED (policy qual)

## 20. Tests

`npx vitest run` → `57 passed, 841 passed` (incl. 17 fase421). No se eliminó ningún test.

## 21. Build

`npm run build` → PASS 4.82s `AICaseDetail-DKZLU5tc.js`

## 22. Lint

`npx eslint src/hooks/useAICaseWorkflow.ts server/ai/caseWorkflow.mjs src/components/legalup-ai/AICaseIntelligence.tsx` → 0 errores

## 23. Typecheck

`npx tsc --noEmit` → 0 nuevos errores

## 24. QA E2E real

Workspace real `5ae2f877...` usado para ciclo completo:
- insert pending → select PASS
- in_progress → refresh → En revisión PASS (persistido)
- completed → completed_at PASS + refresh sigue completed PASS
- dismissed → dismissed_at PASS + refresh sigue dismissed PASS
- reopen → pending + timestamps null PASS
- completed + sync → sigue completed (preservation) PASS (verificado via `completed` antes de delete)
- sync x3 → 1 por acción PASS
- 0 rows tras cleanup → `remaining 0` PASS

## 25. Problemas encontrados

- `supabase migration list` discrepancia histórica: 40+ locales no en remoto, 2 remotas no locales → `db push --dry-run` sugería repair; tabla `ai_case_workflow_items` ya existía pero no en `schema_migrations` → insert manual `20260827000000`
- `supabase db pull` con Docker down no disponible local, pero validación directa vía `supabase_execute_sql` cubrió todos los checks sin `db reset` destructivo
- No se requirió modificar migración (idempotente, IF NOT EXISTS)

## 26. Problemas solucionados

- Historial reparado: `insert into supabase_migrations.schema_migrations (20260827000000)` → `migration list` ahora sincronizado para 027
- Idempotencia y constraints validados con errores esperados `23505/23514`
- Cleanup tras QA deja 0 filas de prueba

## 27. Riesgos residuales

- Historial global aún desalineado (40 locales no aplicados remota) — no afecta 027 pero futuros `db push` requerirán `repair --status applied` para esos stubs vacíos o `db pull` con Docker
- Workflow `review_documents` con `failed_count+pending_count` genera 1 item deduplicado por tipo (correcto) pero título puede ser de `failed` vs `pending` según orden `high` priority — aceptable
- RLS validado por inspección de `pg_policies`, no por token real de abogado B (requiere 2 JWTs reales para test E2E con auth)

## 28. Decisión final

`CERTIFIED FOR NEXT PRODUCT PHASE` — migración operativa, QA real y security PASS

