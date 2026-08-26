# FASE 4.18.1 — Auditoría y Fix de Acciones en Inteligencia del Caso

**Estado:** CERTIFIED (con fix mínimo)
**Fecha:** 2026-08-24
**Base:** 799/799 PASS (4.18), EvidenceNavigator + Chat Ver evidencia por oración

---

## 1. Problema reportado

Botones en `AICaseIntelligence` no ejecutaban acción real:

- **Siguiente paso:** `Completar información pendiente del caso` solo hacía `scrollIntoView`, no enviaba pregunta al chat.
- **Preguntas sugeridas:** 5 botones (`¿Cuál es el hecho principal...?` etc.) solo hacían `posthog.capture` + `onQuestionClick?.(q)` pero `AICaseDetail` no pasaba `onQuestionClick`, por lo que eran no-ops (solo analytics).

## 2. Causa raíz

- `AICaseIntelligence` definía `onQuestionClick?: (q: string) => void` pero `AICaseDetail.tsx:504` lo usaba como `<AICaseIntelligence workspaceId={workspace.id} />` sin prop.
- `AIChat` no tenía prop para recibir pregunta externa; solo manejaba `input` interno y `handleSuggestion` para `AIChatSuggestions` (empty state).
- `AICaseDetail` no tenía estado `activeTab`/`chatQuestion` ni `Tabs` controlado, por lo que no podía cambiar de `intelligence` a `documents` (donde está el chat) ni pasar la pregunta.
- `AIChat` `useEffect` para `externalQuestion` no existía, y el destructuring no incluía `externalQuestion`/`onExternalQuestionHandled` (ReferenceError en tests).

## 3. Flujo anterior (FAIL)

```
AICaseIntelligence Button
  → posthog.capture
  → document.getElementById().scrollIntoView (solo scroll)
  → onQuestionClick?.(q) // undefined, no-op
  → FIN (no POST /api/ai/chat)
```

## 4. Flujo corregido (PASS)

```
AICaseIntelligence Button
  → posthog.capture + onQuestionClick(q) // ahora sí existe
  → AICaseDetail: setChatQuestion(q) + setActiveTab('documents') + scroll
  → AIChat (prop externalQuestion) → useEffect → runMutation(q) → POST /api/ai/chat → respuesta → Ver evidencia
```

Para `Siguiente paso` con `review_missing_information`: envía `¿Qué información falta para completar el análisis de este caso?` (pregunta contextual fija).

## 5. Archivos modificados

- `src/components/legalup-ai/AIChat.tsx` (+12, `AIChatProps` con `externalQuestion`/`onExternalQuestionHandled`, `useEffect` para disparar `runMutation`)
- `src/pages/lawyer/AICaseDetail.tsx` (+15, `activeTab`/`chatQuestion` state, `Tabs` controlado, `AICaseIntelligence` con `onQuestionClick`, `AIChat` con `externalQuestion`)
- `src/components/legalup-ai/AICaseIntelligence.tsx` (+8, `nextActions` ahora envía pregunta para `review_missing_information` en lugar de solo scroll)

## 6. Archivos creados

- `server/ai/fase4181.caseIntelligenceActions.test.mjs` (10 tests: 6 botones × pregunta correcta + contexto + no doble envío + analytics + ownership)
- `docs/ia-auditorias/FASE-4.18.1-case-intelligence-actions.md` (este doc)

## 7. Tests

`npx vitest run` 809/809 PASS (55 archivos, +10). `fase4181` 10/10 PASS.

## 8. Build

`npm run build` PASS (6.77s)

## 9. Lint

`npx eslint` sobre archivos tocados → 0 errores (corregido `externalQuestion` destructuring)

## 10. QA E2E (6 botones)

- Click `Completar información pendiente` → Chat visible, `¿Qué información falta…?` enviada, respuesta visible → PASS
- Click `¿Cuál es el hecho principal…?` → pregunta aparece, POST ejecutado, respuesta aparece → PASS
- Click `¿Qué obligaciones…?` → PASS
- Click `¿Qué riesgos…?` → PASS
- Click `¿Qué información contradictoria…?` → PASS
- Click `¿Qué información falta…?` → PASS
- Doble click rápido → 1 request (deshabilitado por `sending`/`conversationId` guard) → PASS
- Caso sin documentos → NO_EVIDENCE honesto, no bloquea botón → PASS

## 11. Analytics

`ai_case_intelligence_action_clicked` con `action: review_missing_information` y `open_chat` + `question_type` (main_fact/obligations/risks/contradictions/missing_information) — sin texto jurídico, solo metadata categórica.

## 12. Seguridad

Ownership del Chat no cambia (`requireAILawyer` + `getAIWorkspaceOwned` + `lawyer_id`/`workspace_id`), RLS intacto, no bypass.

## 13. Riesgos residuales

- `AIChat` `externalQuestion` se limpia vía `onExternalQuestionHandled` después de un uso; si el usuario hace click muy rápido antes de que `conversationId` esté listo, el segundo click espera a `conversationId` (guard `if (!externalQuestion || sending || !conversationId) return`).

## 14. Veredicto

**CERTIFIED** — Los 6 botones ahora ejecutan el Chat existente con trazabilidad completa y sin RAG.

## 15. Git

`commit: NO`, `push: NO` (working tree con 3 modificados + 2 creados)
