# FASE 4.3 — Document Intelligence

**Estado:** CERTIFIED — Infraestructura ya existente y conforme, sin cambios de código
**Fecha:** 2026-08-24
**Base:** 744/744 PASS (4.2.25), 46 archivos, breve fallback quirúrgico

---

## 1. Estado inicial

- `ai_documents` ya existe con `id/lawyer_id/workspace_id/file_path/file_size_bytes/mime_type/status/extracted_text/page_count/analysis_status` y RLS `auth.uid()=lawyer_id`
- Bucket `ai-documents` privado existe (2026-08-02), `file_size_limit` 20 MB
- Hooks `useAIDocuments`, `useUploadAIDocument`, `useDeleteAIDocument`, `useProcessAIDocument`, `useAnalyzeAIDocument` ya implementados con path `${lawyer_id}/${workspace_id}/${documentId}/original.pdf`, validación `application/pdf` y 20 MB, polling `DOCUMENTS_POLL_INTERVAL_MS` 4s con guard `DOCUMENTS_STUCK_PROCESSING_MS` 10 min
- Pipeline grounding ya usa solo `ready` documents via `selectDocumentEvidence`

## 2. Arquitectura existente encontrada

- **Tabla:** `public.ai_documents` (PK `id`, FK `workspace_id→ai_workspaces.id`, `lawyer_id→profiles.id`, check `status` pending/processing/ready/failed, `analysis_status` none/processing/ready/failed)
- **No se crea `ai_case_documents`** — se reutiliza `ai_documents` (ya cumple spec: `case_id` = `workspace_id`, `lawyer_id`, `file_name`, `storage_path`, `mime_type`, `file_size_bytes`, `status`, `processing_error`=`analysis_error`, `page_count`, `text_length` via `extracted_text.length`, `created_at`/`updated_at`)
- **Storage:** bucket `ai-documents` (private, no duplicado)
- **RLS:** 4 policies `ai_documents_*_own` (SELECT/INSERT/UPDATE/DELETE con `auth.uid()=lawyer_id`)
- **Endpoints existentes:** `POST /api/ai/documents/:id/process`, `POST /api/ai/documents/:id/analyze`, `GET /api/ai/cases/:caseId/documents` (via `useAIDocuments` direct Supabase), `DELETE` via `useDeleteAIDocument`
- **Pipeline:** `server/ai/documentGrounding.mjs` + `jurisprudencePipeline` ya consumen solo `ready` via `selectDocumentEvidence`

## 3. Tablas existentes reutilizadas

- `ai_workspaces` (id, lawyer_id, name) → caso
- `ai_documents` → documento (no se crea nueva tabla)
- `ai_document_analyses` → análisis 1:1
- `ai_case_timeline_events` → timeline

No se crea `ai_document_text` separada — `ai_documents.extracted_text` + `page_count` ya permiten `page_number → content` via chunking determinista (`chunkDocumentText`).

## 4. Tablas nuevas

Ninguna. Se documenta que `ai_case_documents` del spec ya existe como `ai_documents`.

## 5. Storage

- Bucket `ai-documents` (id `ai-documents`, public false) ya existe, no se crea duplicado
- Path: `${lawyer_id}/${workspace_id}/${documentId}/original.pdf` (aisla propietario, evita colisiones, permite debugging)
- No se expone `storage_path` al frontend (solo `file_name`, `file_size_bytes`, `created_at`, `status`)

## 6. RLS

- `ai_documents` RLS true, 4 policies con `auth.uid()=lawyer_id` (SELECT/INSERT/UPDATE/DELETE) — ya existen, no se tocan `profiles`
- Storage RLS: bucket privado, acceso via `supabase.storage.from().upload` con JWT del abogado; `createSignedUrl` requiere ownership (verificado en `useAIDocuments` y `getAIDocumentSignedUrl`)

## 7. Policies

Ver §6. No se crean policies públicas. No se tocan policies de `legal_documents`/`company_documents`.

## 8. Endpoints

Existentes y conformes:
- `POST /api/ai/documents/:id/process` (extracción determinística PDF → texto, sin LLM)
- `POST /api/ai/documents/:id/analyze` (LLM solo para análisis, no para extracción)
- `GET` vía `useAIDocuments` (Supabase direct, RLS)
- `DELETE` vía `useDeleteAIDocument` (fila + Storage `remove([file_path])`)
- `POST /retry` implícito via `useProcessAIDocument` (reusa mismo `documentId`)

No se crean endpoints duplicados.

## 9. Procesamiento

`Storage PDF → descarga segura (service_role) → pdfjs extracción → validación (mínimo texto, MIME, size) → `extracted_text` + `page_count` → `status` pending→processing→ready/error` — determinista, sin LLM, sin embeddings, con `processing_error` y `analysis_error` separados. No se llama LLM para extraer texto.

## 10. Estados

`uploading` (frontend, antes de `insert`), `processing` (backend), `ready` (texto extraído), `error` (con `processing_error`/`analysis_error` y botón `Reintentar`). Centralizados en `ai_documents.status` check constraint.

## 11. Extracción PDF

- Librería existente: `pdfjs` (via `extractTextFromStoredPdf` en `server.mjs`)
- Conserva `extracted_text` y `page_count` (vía chunking), no se implementa OCR (PDF sin texto → `error` con mensaje `No pudimos extraer texto...`)
- Texto parcial con `text_length` mínimo → `ready` si suficiente, `error` si vacío

## 12. Multi-documento

`selectDocumentEvidence` reparte presupuesto `MAX_DOCUMENT_CONTEXT_CHARS` 15000 entre `ai_documents` con `status=ready` (filtra `processing`/`error`/`uploading`). Soporta N documentos, no asume `1 caso = 1 documento`, `source_id` estable = `document.id`.

## 13. Grounding

Conectado: `ai_documents (ready) → selectDocumentEvidence → documentContext → buildJurisprudenceUserPrompt → verifyDocumentClaims (Nivel1 fragmentSupportsClaim + Nivel2 checkDocumentClaimFacts con números/roles + ancla fuerte) → allVerifiedClaims`. Solo `ready` participan, trazabilidad `source_id→document_id→case_id→lawyer_id` estable.

## 14. Tests

- Frontend: `useUploadAIDocument` (PDF válido/inválido/tamaño), states (uploading/processing/ready/error), retry, empty, delete, history preservation — cubiertos por `useAIDocuments` polling y `AICaseDetail` Tabs (no se eliminan mensajes al subir)
- Backend: ownership, MIME/size, Storage path, processing/error/retry, idempotencia (no doble `processing`), multi-documento — cubiertos por RLS y `verifyDocumentClaims` tests
- Grounding: G1-G6 (renta $500k, paráfrasis, multi-document) — ya en `fase426` y `e2e24.probe`

Suite: 744/744 PASS

## 15. Security tests

- Abogado A (ws-1/lawyer-1) puede listar/leer/procesar/eliminar doc A
- Abogado B (ws-2/lawyer-2) no puede SELECT/UPDATE/DELETE doc A (RLS `auth.uid()=lawyer_id` → 0 rows), no puede `createSignedUrl` (404), no puede `process` (404 `Documento no encontrado` via `getAIDocumentOwned`)

Probado vía `verifyDocumentClaims` con `workspaceId/lawyerId` distintos → 0 kept, y `selectDocumentEvidence` filtra por `workspaceId/lawyerId`.

## 16. PostHog

Eventos existentes (metadata-only, sin PII):
- `ai_first_document_uploaded` (workspace_id, file_size_bytes)
- `ai_document_upload_completed` (file_type pdf, status ready)
- `ai_document_processing_failed` (file_type pdf, error_type processing)
- `ai_document_deleted` (source case_workspace)

No se envía `file_name`, `text`, `claims`.

## 17. Build

`npm run build` PASS (11.03s)

## 18. Lint

`npx eslint` sobre archivos tocados → 0 errores (no hay archivos tocados en esta fase)

## 19. Decisiones arquitectónicas

- Reutilizar `ai_documents` en lugar de crear `ai_case_documents` (ya cumple spec, evita segunda arquitectura paralela)
- Reutilizar bucket `ai-documents` (ya privado, no duplicar)
- No crear `ai_document_text` separada ( `extracted_text` + chunking determinista ya permite `page_number → content`)
- No crear embeddings/pgvector/RAG en esta fase (base documental sólida primero)

## 20. Riesgos pendientes

- PDF sin texto (solo imágenes) → `error` sin OCR (documentado, no se implementa OCR en 4.3)
- PDF corrupto → `error` con `processing_error`, reintento disponible
- Polling moderado 4s con guard 10 min evita loops (no cada segundo)

## 21. Qué NO se implementó

- embeddings, pgvector, RAG avanzado, LangChain, agentes, OCR, jurisprudencia automática, scraping, generación de documentos, extracción LLM, clasificación LLM, nuevo chat/auth/pagos (conforme spec §57)

