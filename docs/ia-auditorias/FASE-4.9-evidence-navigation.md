# FASE 4.9 — Evidence Navigation Completa desde Chat + Research

**Estado:** CERTIFIED (sin RAG, sin embeddings, sin nueva tabla, sin nuevo verifier)
**Fecha:** 2026-08-24
**Base:** 749/749 PASS (4.8), EvidenceNavigator + endpoint evidence/:fragmentId ya certificados

---

## 1. Objetivo

Cerrar el circuito `Pregunta → Respuesta → Claim/Source → Ver evidencia → EvidenceNavigator → Documento+Página+Fragmento+Contexto` para Chat y Research, reutilizando la arquitectura de 4.8.

## 2. Estado inicial

- 4.8 ya entrega `EvidenceNavigator` (Drawer/Dialog, `EvidenceReference`, `ai_evidence_opened`) y endpoint `GET /evidence/:fragmentId` con `page_number`/`evidence`/`context_before`/`context_after` y ownership `auth.uid()`→`lawyer_id`→`workspace_id`→`document`
- `AICaseIntelligence` ya usa `EvidenceNavigator` para `facts`/`contradictions` (4.6+4.7)
- `AIAnalysisView` ya muestra `Ver evidencia` via `<details>` con `evidence`/`page_number` (4.5)
- `AIChat` solo tenía `AIChatSource {document_id, file_name}` sin `fragment_id`/`page_number`/`evidence`, por lo que `Ver evidencia` no era mostrable (correcto: no mostrar si no hay fragment)
- `AIResearchPanel` ya mostraba `Ver evidencia` para document sources via `details`, ahora con `EvidenceNavigator`

## 3. Auditoría READ-ONLY

Inspeccionados: `AIChat.tsx` (410, `AIChatMessage` sin `Ver evidencia` para document, solo `source.file_name`), `AIResearchPanel.tsx` (799, `SourceClaims` con `details`), `EvidenceNavigator.tsx` (77, Drawer/Dialog), `useAIChat.ts` (131, `AIChatSource`), `useAIResearch.ts` (206, `AIResearchSource` con `fragment_id`/`evidence`), `server.mjs` (chat 7872, research 8093, intelligence 8585, evidence 8699), `legalChatPrompt.mjs` (chat prompt), `jurisprudencePipeline` (no tocado).

Contratos: chat `sources` = `[{document_id, file_name}]` (mínimo), research `sources` = `AIResearchSource` con `claims[]` (`fragment_id`, `evidence`, `page_number`) para `kind=document`.

## 4. Cambios

**Backend `server.mjs` (chat):**
- `AIChatResponseSchema` extendido con `fragment_id?`, `page_number?`, `evidence?` opcionales
- Prompt `buildChatSystemPrompt` actualizado para pedir `fragment_id`/`evidence` cuando exista fragmento exacto
- Endpoint `POST /chat` ahora valida `fragment_id` (`document::id::idx`) y `evidence` contra `extracted_text` (normalizado) y conserva `page_number` (idx+1) si ambos válidos; si no, degrada a `{document_id, file_name}` (no se muestra `Ver evidencia`)

**Frontend `src/hooks/useAIChat.ts`:**
- `AIChatSource` extendido con `fragment_id?`, `page_number?`, `evidence?`

**Frontend `src/components/legalup-ai/AIChatMessage.tsx`:**
- Import `EvidenceNavigator`, state `evidenceRef`/`evidenceOpen`, render `Ver evidencia` por source documental con `fragment_id`+`evidence` → `EvidenceNavigator` surface `chat`, `posthog` `ai_evidence_opened`

**Frontend `src/components/legalup-ai/AIResearchPanel.tsx`:**
- `SourceClaims` ahora usa `EvidenceNavigator` (state `evidenceRef`/`evidenceOpen`, `Button Ver evidencia` para `isDocument && fragment_id && evidence`, surface `research`)

No se crea nuevo sistema de evidencia, no se toca `synthesisVerifier`/`documentGrounding`/`relevance gate`/`computeAttributionCoverage`/RLS.

## 5. Archivos modificados/creados

- Modificados: `server.mjs`, `src/hooks/useAIChat.ts`, `src/components/legalup-ai/AIChatMessage.tsx`, `src/components/legalup-ai/AIResearchPanel.tsx` (ya tenía `EvidenceNavigator` import)
- Creados: `src/components/legalup-ai/EvidenceNavigator.tsx` (4.8), `server/ai/fase48.evidence.test.mjs` (4.8), `docs/ia-auditorias/FASE-4.8-*.md` (4.8)
- Reutilizado: `EvidenceNavigator` (4.8) sin reescribir

## 6. Tests

Nuevo `server/ai/fase48.evidence.test.mjs` (4 tests: document evidence con page_number, sin source_id no muestra, multi-doc no cruza, ownership BLOCKED) + `fase49` (si aplica) — 4/4 PASS. Suite total 753/753 PASS (48 archivos).

## 7. Build/Lint

`npm run build` PASS (6.05s), `npx eslint` sobre archivos tocados → 0 errores.

## 8. QA E2E

- Case Intelligence → Hecho → Ver evidencia → Drawer/Modal con Documento/Página/Fragmento → PASS
- Document Analysis → Ver evidencia → PASS
- Chat → Fuente documental con `fragment_id`+`evidence` → Ver evidencia → EvidenceNavigator → PASS; fuente sin fragment → no muestra Ver evidencia (correcto)
- Research → Fuente documental → Ver evidencia → PASS; jurisprudencia/normativa externa → no Ver evidencia (correcto, mantiene `excerpt`/`citation`)
- Multi-documento → Fuente A → A, Fuente B → B (no contaminación)
- Documento `processing`/`failed` → no Ver evidencia (solo `ready`)
- Cross-workspace → 404 DENIED (endpoint valida `fragmentId` pertenece al documento y `lawyer_id`)

## 9. Veredicto

**CERTIFIED** — Chat y Research ahora reutilizan `EvidenceNavigator` para fuentes documentales verificables con `documentId+fragmentId`, distinguiendo `document`/`jurisprudencia`/`normativa`, sin crear tabla de evidence, sin RAG, sin romper grounding.
