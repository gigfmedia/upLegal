# FASE 4.5 — Document Analysis Quality & Evidence UX

**Estado:** CERTIFIED (sin commit/push, 5 tests nuevos)
**Fecha:** 2026-08-24
**Base:** 744/744 PASS (4.2.25), 46 archivos, Document Intelligence certificada

---

## 1. Objetivo

Mejorar la calidad del análisis jurídico de documentos y la evidencia visible por hallazgo, manteniendo grounding y sin crear segunda arquitectura.

## 2. Estado inicial

- `ai_documents` y `ai_document_analyses` ya existen con `summary, document_type, parties, key_points, obligations, deadlines, risks, recommendations`
- `AIAnalysisView` ya muestra secciones, pero sin `Ver evidencia` por hallazgo
- `server.mjs` analyze ya genera JSON y persiste, pero sin verificación `verifyDocumentClaims` antes de persistir

## 3. Auditoría

Inspeccionados: `AIAnalysisView.tsx` (321, SectionList sin evidencia), `useAIDocuments.ts` (324, claims extendido), `server.mjs` analyze (7596, sin grounding), `legalPrompt.mjs` (prompt con hecho/inferencia), `ai_documents`/`ai_document_analyses` (ver §2), tests 4.2.x/4.3/4.4.

Hallazgo: análisis se persistía sin verificar cada hecho contra `extracted_text`; `AIAnalysisView` no mostraba `source_id`/`page_number`/`evidence` por hallazgo.

## 4. Cambios

- `supabase` migración `add_claims_to_ai_document_analyses` (claims JSONB, evidence_sources JSONB)
- `server.mjs`: importa `verifyDocumentClaims`, verifica `parties`/`key_points`/`obligations`/`deadlines` via `verifyDocumentClaims` (Nivel1+2) y persiste solo verificados + `claims` con `source_id`/`fragment_id`/`evidence`/`page_number`
- `src/hooks/useAIDocuments.ts`: tipo `AIDocumentAnalysis` extendido con `claims`
- `src/components/legalup-ai/AIAnalysisView.tsx`: `SectionList` ahora acepta `claims` y muestra `Ver evidencia` con `evidence`/`page_number`/`source_id`

No se crean tablas duplicadas, no se duplica grounding, no se toca `synthesisVerifier`/`relevance gate`/RLS.

## 5. Tests

Nuevo `server/ai/fase45.analysis.test.mjs` (5 tests: monto correcto, monto incorrecto, fecha incorrecta, paráfrasis válida, hecho inexistente) — todos PASS.

Suite: 749/749 PASS (47 archivos, +5)

## 6. QA

Determinista: 5/5 PASS. Build PASS (14.66s), lint PASS (0 errores tras corregir `any`).

## 7. Veredicto

**PASS** — Análisis ahora persiste solo claims verificados con evidencia trazable y UI muestra `Ver evidencia` por hallazgo.
