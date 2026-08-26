# FASE 4.19 — Case Action Layer

**Estado:** CERTIFIED (sin commit/push, 15 tests nuevos)
**Fecha:** 2026-08-24
**Base:** 809/809 PASS (4.18.1), Action Center + Quick Questions ya conectados a Chat

---

## 1. Estado

4.18.1 ya dejó `AICaseIntelligence` con `nextActions` + `quickQuestions` → `onQuestionClick` → `AICaseDetail` → `AIChat` `externalQuestion`. 4.19 formaliza la capa como `deriveCaseActions` determinista.

## 2. Objetivo

Transformar `Case Intelligence` en `Case Action Layer` con acciones priorizadas y accionables, sin crear nueva fuente de verdad.

## 3. Arquitectura previa

`AICaseIntelligence` ya tenía `nextActions` inline (contradicciones → risks → missing → pending → open_chat) y `quickQuestions` (5 constantes) → `onQuestionClick` → `AIChat`.

## 4. Arquitectura implementada

- **Server:** `server/ai/caseActionLayer.mjs` (`deriveCaseActions`, 80 líneas, pura, sin DB/LLM)
- **Shared:** `src/lib/caseActions.ts` (misma lógica, para frontend)
- **Frontend:** `AICaseIntelligence.tsx` ahora importa `deriveCaseActions` de `@/lib/caseActions` en lugar de inline

## 5. Acciones

`review_missing_information`, `review_contradictions`, `review_risks`, `review_documents`, `ask_case_question` — con `title`, `description`, `priority`, `question` opcional.

## 6. Derivación

`deriveCaseActions(intelligence)` — `failed_count` (high) → `contradictions` (high) → `missingInformation` (high) → `risks` (medium) → `pending_count` (low) → fallback `ask_case_question`/`add_documents` (low). Ordena por `high>medium>low`, dedup por `id`, limita a 3.

## 7. Prioridades

`high` (contradicciones, missing, failed), `medium` (risks), `low` (pending, ask_case).

## 8. Integración con AICaseIntelligence

`AICaseIntelligence` → `const nextActions = deriveCaseActions(data)` — ya no inline.

## 9. Integración con AIChat

`AICaseDetail` → `AICaseIntelligence onQuestionClick` → `setChatQuestion` → `setActiveTab('documents')` → `AIChat externalQuestion` → `useEffect` → `runMutation` → `POST /api/ai/chat` — ya en 4.18.1.

## 10. externalQuestion

Reutiliza 4.18.1 (`externalQuestion` + `onExternalQuestionHandled` + `useEffect` en `AIChat`).

## 11. Evidence

No crea evidencia, reutiliza `verifyDocumentClaims` existente.

## 12. EvidenceNavigator

No modificado.

## 13. Seguridad

`requireAILawyer` + `getAIWorkspaceOwned` + RLS, `deriveCaseActions` no hace queries, solo deriva de `intelligence` ya autorizada.

## 14. Analytics

Reutiliza `ai_case_intelligence_viewed` + `ai_case_intelligence_action_clicked` (`action`).

## 15. Tests

`server/ai/fase419.caseActionLayer.test.mjs` (15 tests: missing→review_missing, risks→review_risks, contradictions→review_contradictions, failed→review_documents, sin docs→review_documents, sin issues→ask_case, prioridades, max 3, dedup, null, cross-workspace, preguntas, no doble envío, NO_EVIDENCE) — 15/15 PASS.

## 16. Build

`npm run build` PASS

## 17. Lint

`npx eslint` sobre archivos tocados → 0 errores

## 18. Typecheck

0 nuevos

## 19. QA E2E

Click `Completar información pendiente` → Chat `¿Qué información falta…?` → respuesta → PASS (x6 botones).

## 20. Regresiones

`fase4214` (35), `fase4219` (5), `fase4220` (14), `fase4221` (21), `fase4222` (15), `fase4225` (15), `synthesisVerifier` (18), `fase426` (F), `fase45` (5), `fase48` (4), `fase411` (7), `fase413` (9), `fase415` (8), `fase416` (5), `fase417` (8) — todas PASS.

## 21. Riesgos

- `deriveCaseActions` es derivado, no persiste; si `intelligence` cambia, las acciones cambian (correcto).

## 22. Decisiones arquitectónicas

- Capa derivada sin tabla/endpoint nuevo (consume `GET /intelligence` existente)
- No LLM para decidir acciones (reglas deterministas)
- Reutilizar `externalQuestion` de 4.18.1

## 23. Archivos modificados

- `src/components/legalup-ai/AICaseIntelligence.tsx` (usa `deriveCaseActions`)
- `server/ai/caseActionLayer.mjs` (nuevo, 80 líneas)
- `src/lib/caseActions.ts` (nuevo, 80 líneas, duplicado para frontend)

## 24. Archivos creados

- `server/ai/caseActionLayer.mjs`
- `src/lib/caseActions.ts`
- `server/ai/fase419.caseActionLayer.test.mjs`
- `docs/ia-auditorias/FASE-4.19-case-action-layer.md`

## 25. Git status

`commit: NO`, `push: NO`
