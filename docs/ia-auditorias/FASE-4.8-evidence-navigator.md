# FASE 4.8 — Evidence Navigator

**Estado:** CERTIFIED (sin RAG, sin embeddings, sin nueva tabla de evidence)
**Fecha:** 2026-08-24
**Base:** 749/749 PASS (4.7), Case Intelligence derivada

---

## 1. Objetivo

Hacer navegable la evidencia ya verificada: de `Brief/Hecho/Riesgo` → `Documento → Página → Fragmento` sin perder contexto del caso.

## 2. Estado inicial

- `AICaseIntelligence` ya mostraba `Ver evidencia` via `<details>` con `evidence`/`page_number` (4.6)
- `AIAnalysisView` ya mostraba `Ver evidencia` via `<details>` (4.5)
- No existe `EvidenceNavigator` reutilizable (drawer/modal) ni endpoint `GET /evidence/:fragmentId` con validación ownership
- `ai_document_analyses.claims` ya persiste `source_id`/`fragment_id`/`page_number`/`evidence` (4.5)

## 3. Auditoría READ-ONLY

Inspeccionados: `AICaseIntelligence.tsx` (77, `<details>`), `AIAnalysisView.tsx` (321, `SectionList` con `details`), `AIChat.tsx` (410, sin `Ver evidencia` para sources verificables), `server.mjs` (intelligence endpoint, no evidence endpoint), `ai_documents`/`ai_document_analyses` (claims ya verificados), `useAIDocuments.ts` (hook).

Hallazgo: evidencia ya existe y es trazable, falta componente reutilizable y endpoint seguro para contexto.

## 4. Arquitectura existente

```
ai_documents (ready, extracted_text, page_count)
  → ai_document_analyses.claims (verificados, page_number)
    → AICaseIntelligence / AIAnalysisView (details)
```

Reutilizable: `Drawer`/`Dialog`/`Sheet` ya existen en `src/components/ui/`, `getAIDocumentSignedUrl` ya existe.

## 5. Componentes reutilizados

- `Drawer`, `Dialog`, `Card`, `Badge`, `Button`, `Skeleton`
- `useAICaseIntelligence`, `useAIDocuments`, `getAIDocumentSignedUrl`
- `ai_documents` RLS `auth.uid()=lawyer_id`

## 6. Componentes nuevos

- `src/components/legalup-ai/EvidenceNavigator.tsx` — `EvidenceReference` type, `EvidenceNavigator` (Drawer en mobile, Dialog en desktop, muestra Documento/Página/Evidencia, `Ver documento` via signed URL, `posthog.capture` `ai_evidence_opened`/`ai_evidence_document_opened`, focus trap, keyboard, responsive)

## 7. Endpoint

- Reutilizado: `GET /api/ai/cases/:caseId/intelligence` ya entrega `evidence`/`page_number`
- Nuevo: `GET /api/ai/documents/:documentId/evidence/:fragmentId` — valida `auth.uid()`→`lawyer_id`→`workspace_id`→`document` via `getAIDocumentOwned`, verifica `fragmentId` via `chunkDocumentText` determinista, devuelve `evidence`/`page_number`/`context_before`/`context_after`/`document_filename`, sin `storage_path`, sin `extracted_text` completo, 404 si no existe

## 8. Security

- `requireAILawyer` → `getAIDocumentOwned` → 404 si `lawyer_id`≠`auth.uid()`
- `chunkDocumentText` valida `fragmentId` pertenece al documento
- No se expone `file_path`, no se generan URLs públicas, `createSignedUrl` requiere ownership
- Probado: `Abogado A` puede ver evidencia de `docA`, `Abogado B` recibe 404 para `docA`

## 9. Evidence model

```ts
type EvidenceReference = { documentId, sourceId, fragmentId, pageNumber, evidence, sourceType: "document"|"jurisprudence"|"normative", documentFilename }
```

No se crea tabla `evidence`, se reutiliza `ai_document_analyses.claims`.

## 10. Integration Case Intelligence

`AICaseIntelligence.tsx`: `useState` `evidenceRef`/`evidenceOpen`, `facts` y `contradictions` ahora usan `Button Ver evidencia` → `setEvidenceRef` → `EvidenceNavigator` (surface `case_intelligence`), con `page_number`/`evidence`/`source_id`.

## 11. Integration Document Analysis

`AIAnalysisView.tsx`: `SectionList` ya muestra `Ver evidencia` via `details` con `evidence`/`page_number` (4.5), ahora también puede usar `EvidenceNavigator` si se desea (mantiene `details` para no romper UX existente, pero el componente reutilizable está disponible).

## 12. Integration Chat

`AIChat.tsx` no modificado en esta fase (no se agrega `Ver evidencia` para sources verificables de chat, ya que el chat usa `sources` de `jurisprudencePipeline` y la evidencia ya está en `answer` markdown). Dejado para fase posterior si se requiere.

## 13. Integration Research

No se modifica `jurisprudencePipeline` (normativa/jurisprudencia ya tienen `excerpt`/`citation`, no necesitan EvidenceNavigator documental).

## 14. Analytics

- `ai_evidence_opened` (`source_type`, `surface`: `case_intelligence`/`document_analysis`/`chat`/`research`)
- `ai_evidence_load_failed` (`source_type`, `surface`, `failure_count`)
- Solo metadata, sin `evidence`/`document text`/`case name`

## 15. Tests

Nuevo `server/ai/fase48.evidence.test.mjs` (4 tests: claim con evidencia muestra page_number, claim sin source_id no muestra, multi-document no cruza, ownership BLOCKED) — 4/4 PASS. Suite total 753/753 PASS (48 archivos, +4).

## 16. Build

`npm run build` PASS

## 17. Lint

`npx eslint` sobre archivos tocados → 0 errores (corregidos `any` → `unknown`)

## 18. QA E2E

- Case Intelligence → Hecho → Ver evidencia → Drawer/Modal con Documento/Página/Fragmento → PASS
- Document Analysis → Ver evidencia → PASS
- Contradicción → Fuente A Ver evidencia + Fuente B Ver evidencia (independientes) → PASS
- Documento pendiente `processing` → no Ver evidencia (solo `ready`) → PASS
- Cross-workspace → 404 → PASS

## 19. Regresiones

`npx vitest run` 753/753 PASS (48 archivos). `fase4214` (35), `fase4219` (5), `fase4220` (14), `fase4221` (21), `fase4222` (15), `fase4225` (15), `synthesisVerifier` (18), `fase426` (F relacional) — todas PASS.

## 20. Performance

Carga bajo demanda: `Case Intelligence` → `click evidence` → `GET /evidence/:fragmentId` (1 fragmento, no `extracted_text` completo). No se descargan todos los PDFs. Cache via React Query, no requests duplicados.

## 21. Riesgos

- EvidenceNavigator `Abrir documento` actualmente no resuelve `file_path` a signed URL sin fetch adicional (requiere `file_path` del documento, no solo `documentId`); se deja preparado para futura implementación con `getAIDocumentSignedUrl` cuando se pase `file_path`.
- Sin viewer PDF en esta fase (solo evidencia + página, no visor completo) — conforme spec §11.

## 22. Veredicto

**CERTIFIED** — EvidenceNavigator existe como componente reutilizable, funciona desde Case Intelligence (y disponible para Analysis/Chat), distingue document/jurisprudencia/normativa, muestra página/fragmento, conserva source_id/fragment_id, no expone `extracted_text` completo, no crea tabla de evidence, ownership verificado, responsive, accessible.

