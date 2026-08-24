# FASE 4.7 — Case Workspace Intelligence UX + Actionable Case Brief

**Estado:** CERTIFIED (sin cambios de motor, 5 archivos)
**Fecha:** 2026-08-24
**Base:** 749/749 PASS (4.6), Case-Level Intelligence derivada

---

## 1. Objetivo

Convertir la inteligencia derivada de `ai_documents`/`ai_document_analyses` en una experiencia accionable: Brief del caso, estado, prioridades, riesgos, contradicciones, evidencia y acciones sugeridas, sin crear nueva fuente de verdad.

## 2. Estado inicial

- 4.6 ya entrega `GET /intelligence` con `facts` (dedup con `source_ids`), `parties`, `obligations`, `deadlines`, `risks`, `contradictions`, `missingInformation`, `caseSummary`, `attributionCoverage`
- `AICaseIntelligence` ya muestra Resumen, Hechos, Partes, Obligaciones, Fechas, Riesgos, Contradicciones, Información faltante con `Ver evidencia`
- Falta: Brief como primera vista, status visual, Action Center determinista, Quick Questions con chat, manejo de `pending_count`, analytics de viewed/action, orden de prioridades

## 3. Auditoría READ-ONLY

Inspeccionados: `AICaseIntelligence.tsx` (77 líneas, sin status/action/quick), `AICaseDetail.tsx` (Tabs documents/research/timeline), `useAICaseIntelligence` (hook), `server.mjs` intelligence endpoint (solo `ready`, sin `pending_count`), `ai_documents`/`ai_document_analyses`, `AIChat` (chat ya funciona con `workspace_id`).

Confirmado: no existe `ai_case_briefs`, briefing debe derivar de `AICaseIntelligence`.

## 4. Arquitectura encontrada

```
ai_documents (ready) → ai_document_analyses.claims (verificados) → GET /intelligence (agregación) → AICaseIntelligence
```

Reutilizable: `selectDocumentEvidence` (multi-doc), `verifyDocumentClaims`, `computeAttributionCoverage`.

## 5. Infraestructura reutilizada

- `ai_documents`, `ai_document_analyses.claims` (4.5)
- Endpoint `GET /intelligence` (4.6)
- `AICaseIntelligence` + `AICaseDetail` Tabs
- `useAICaseIntelligence` (React Query)
- `AIChat` (`useSendChatMessage`)

## 6. Hallazgos

- Falta `pending_count`/`failed_count` en endpoint (UX no puede mostrar "2 documentos todavía no disponibles")
- Falta status visual (`En revisión`, `Con riesgos`, etc.)
- Falta Action Center determinista
- Falta Quick Questions con chat
- Falta analytics `ai_case_intelligence_viewed`/`action_clicked`/`load_failed`

## 7. Cambios realizados

**Backend `server.mjs`:**
- `GET /intelligence` ahora consulta `allDocs` (todos los estados) y deriva `docs` (ready), `pendingDocs`, `failedDocs`; responde `pending_count`, `failed_count`, `total_documents` además de `document_count`

**Hook `src/hooks/useAIDocuments.ts`:**
- Tipo `AICaseIntelligence` extendido con `pending_count`, `failed_count`, `total_documents`

**Frontend `src/components/legalup-ai/AICaseIntelligence.tsx`:**
- `getCaseStatus` (contradicciones→Con contradicciones, riesgos→Con riesgos, missing→Información incompleta, docs→Listo)
- `nextActions` determinista (contradicciones→review_contradictions, missing→review_missing, risks→review_risks, pending→review_documents, else review_obligations)
- `quickQuestions` (5 templates constantes, sin LLM)
- `useEffect` `ai_case_intelligence_viewed` (case_id, documents_ready), `posthog.capture` en actions/quick
- Pending notice `2 documento(s) todavía no disponibles`
- Status `Badge` + `Siguiente paso` Card + `Preguntas sugeridas` Card

**`src/pages/lawyer/AICaseDetail.tsx`:**
- Nuevo tab `Inteligencia del caso` + `TabsContent` con `AICaseIntelligence` (con `onQuestionClick` opcional)

No se toca `synthesisVerifier`, `documentGrounding`, `jurisprudenceSources`, RLS, chunking, budget, provider.

## 8. Tablas reutilizadas

`public.ai_documents`, `public.ai_document_analyses` — no se crean tablas nuevas.

## 9. Migraciones

Ninguna nueva (reutiliza `add_claims_to_ai_document_analyses` de 4.5).

## 10. Endpoints

- Extendido: `GET /api/ai/cases/:caseId/intelligence` (ahora con `pending_count`/`failed_count`/`total_documents`)
- Reutilizados: `GET/POST` chat/research, `POST /documents/:id/analyze`

## 11. Hooks

- Extendido: `useAICaseIntelligence` (ya existía, ahora con `pending_count`)
- Reutilizados: `useAIDocuments`, `useAICaseIntelligence`

## 12. UI

- Nuevo: Brief con `Resumen del caso` primero, status `Badge`, Action Center, Quick Questions
- Reutiliza `SectionList` pattern, `Card`, `Badge`, `Skeleton`, `details` para evidencia, `Button` real, `aria-label`

## 13. Grounding

`ai_documents (ready) → claims verificados → aggregate → dedup → evidence` — sin nuevos claims, sin reintroducir descartados, `source_id`/`fragment_id`/`page_number` preservados.

## 14. Seguridad

`requireAILawyer` + `getAIWorkspaceOwned` + `eq('workspace_id', workspace.id).eq('lawyer_id', userId)` — Abogado B no ve facts de workspace A (probado en `e2e24`).

## 15. Tests

Suite existente 749/749 PASS. No se agregan tests nuevos para 4.7 (capa UX derivada, no requiere nuevo grounding).

## 16. QA determinista

`e2e24.probe` 12/12 PASS (document, follow-up, mixed, jurisprudencia, NO_EVIDENCE, ultra-corta, mixed, irrelevante, doc-only, multi-doc, ownership, provider).

## 17. QA real

No se ejecutó LLM real para 4.7 (UX derivada, sin LLM). QA real 4.2.24 con `gpt-4o-mini` 6/6 sigue válido.

## 18. Regresiones

`npx vitest run` 749/749 PASS, `npm run build` PASS, `npx eslint` 0 errores.

## 19. Riesgos

- Case summary es concatenación de summaries verificados, no síntesis LLM abstractiva (evita alucinación, pero no es resumen inteligente)
- Contradicciones por prefijo (3 palabras) es heurística simple

## 20. Decisiones arquitectónicas

- Capa derivada sin tabla nueva (preferir vista sobre datos existentes)
- No usar LLM para ordenar riesgos/missing/status/acciones (reglas deterministas)
- Reutilizar `ai_document_analyses.claims` verificados

## 21. Veredicto

**CERTIFIED** — Case Workspace Intelligence UX funciona como capa derivada con Brief, status, prioridades, evidencia trazable y acciones, sin RAG, sin romper grounding.

## 22. Git

`commit: NO`, `push: NO` (working tree con 5 archivos)
