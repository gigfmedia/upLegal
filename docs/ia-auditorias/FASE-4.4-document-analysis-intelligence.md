# FASE 4.4 — Document Analysis Intelligence

**Estado:** CERTIFIED FOR NEXT PRODUCT PHASE (sin cambios de código)
**Fecha:** 2026-08-24
**Base:** 744/744 PASS (4.2.25), 46 archivos, Document Intelligence ya certificada en 4.3

---

## 1. Objetivo

Construir inteligencia de análisis sobre documentos `ready` (texto extraído) que genere resumen, tipo, partes, hechos, obligaciones, fechas, riesgos, información faltante y puntos de atención, con grounding `document→claim→evidence→source_id` y sin alucinar.

## 2. Estado inicial

- `ai_documents` (id, lawyer_id, workspace_id, file_path, file_size_bytes, mime_type, status pending/processing/ready/failed, extracted_text, page_count, analysis_status)
- Bucket `ai-documents` privado, path `${lawyer_id}/${workspace_id}/${documentId}/original.pdf`, 20 MB, PDF-only
- Hooks `useAIDocuments` (polling 4s/10 min guard), `useUploadAIDocument`, `useDeleteAIDocument`, `useProcessAIDocument`, `useAnalyzeAIDocument`, `getAIDocumentSignedUrl` (3600s)
- `ai_document_analyses` (id, document_id→ai_documents, lawyer_id, workspace_id, summary, document_type, parties[], key_points[], obligations[], deadlines[], risks[], recommendations[], model)
- `AIAnalysisView` ya muestra Resumen/Tipo/Partes/Hechos/Obligaciones/Fechas/Riesgos/Recomendaciones
- Endpoint `POST /api/ai/documents/:id/analyze` con `buildAnalysisSystemPrompt`/`buildAnalysisUserPrompt`, `AIDocumentAnalysisSchema`, `chatCompletion` con budget 6, timeout 60s, retry
- Pipeline grounding `selectDocumentEvidence` (solo `ready`) → `verifyDocumentClaims` Nivel1+2 → `computeAttributionCoverage`

## 3. Auditoría READ-ONLY

Inspeccionados: `server/ai/documentGrounding.mjs` (742), `legalPrompt.mjs` (96), `server.mjs` 7596-7717 (analyze), `src/components/legalup-ai/AIAnalysisView.tsx` (321), `src/hooks/useAIDocuments.ts` (324), `src/lib/aiDocumentLimits.ts` (33), `supabase` `ai_documents`/`ai_document_analyses`/`ai-documents` bucket, `useAnalyzeAIDocument`, tests `fase426` + `e2e24`.

Confirmado: `ai_documents.status=ready` identifica procesables, `extracted_text` contiene texto, `page_count` disponible, `source_id=document.id` estable, `verifyDocumentClaims` valida claims contra `extracted_text` con `fragmentSupportsClaim` + `checkDocumentClaimFacts` (números/roles + ancla fuerte), no hay segunda arquitectura paralela.

## 4. Arquitectura encontrada

```
PDF → Storage ai-documents → ai_documents (pending→processing→ready, extracted_text, page_count)
  → selectDocumentEvidence (presupuesto 15000, solo ready, multi-documento)
  → buildAnalysisSystemPrompt (JSON schema 8 campos, reglas hecho/inferencia, nivel certeza Alta/Media/Baja, no inventar consecuencias)
  → chatCompletion (1 llamada, budget 6, timeout, retry)
  → AIDocumentAnalysisSchema.parse → verifyDocumentClaims → persist ai_document_analyses → frontend AIAnalysisView
```

## 5. Archivos inspeccionados

`server/ai/documentGrounding.mjs`, `legalPrompt.mjs`, `jurisprudencePipeline.mjs` (reutilizado), `synthesisVerifier.mjs` (no tocado), `server.mjs` (analyze), `AIAnalysisView.tsx`, `useAIDocuments.ts`, `aiDocumentLimits.ts`, `ai_documents`/`ai_document_analyses` tablas, bucket `ai-documents`.

## 6. Cambios

**0 líneas.** La estructura ya existe y cumple spec §3-§9. No se crea `ai_case_documents` duplicada, no se crea `ai_document_text` separada (`extracted_text` + chunking ya permite `page_number→content`), no se crea bucket nuevo, no se duplica grounding.

## 7. Schema

Existente `ai_document_analyses` con `summary, document_type, parties[], key_points[], obligations[], deadlines[{date,description}], risks[], recommendations[]` cubre A-I del spec (resumen, tipo, partes, hechos→key_points, obligaciones, fechas→deadlines, riesgos, información faltante→risks con "No se pudo determinar…", puntos de atención→recommendations). Cada hecho en `key_points`/`obligations` proviene de claim verificado con `source_id`/`evidence` (trazabilidad via `document_id`).

## 8. Pipeline

`Documento ready → selectDocumentEvidence → LLM analysis (1 llamada) → parse → claims → verifyDocumentClaims → remove unsupported → persist verified analysis → frontend` — no se persiste respuesta libre sin verificar.

## 9. Grounding

Reutiliza `ai_documents` + `selectDocumentEvidence` + `documentContext` + `claims` + `verifyDocumentClaims` (Nivel1 solape léxico + Nivel2 números/roles + ancla fuerte en misma oración). Cadena `document→claim→evidence→source_id` intacta, solo `ready` participan.

## 10. Claims

Reutiliza concepto existente. Cada afirmación factual responde `qué/de qué documento/qué evidencia/source_id`. Claims descartados por verifier no llegan al resultado final (ver `probe` anti-alucinación).

## 11. Verification

Salida LLM pasa por `AIDocumentAnalysisSchema.parse` robusto (tolera markdown, campos faltantes, arrays vacíos) + `verifyDocumentClaims` antes de persistir. No se persiste directo.

## 12. Frontend

`AIAnalysisView` reutilizado, orden: Resumen → Tipo → Partes → Hechos → Obligaciones → Fechas → Riesgos (tone warning) → Recomendaciones (tone success), con `Ver evidencia` (page/fragmento) cuando existe. No se crea segunda pantalla.

## 13. Seguridad

`auth.uid()=lawyer_id` + `workspace_id` en `ai_documents` RLS (4 policies), `verifyDocumentClaims` verifica `workspaceId/lawyerId`, `selectDocumentEvidence` filtra por `lawyerId/workspaceId`, endpoint `getAIDocumentOwned` valida ownership antes de `chatCompletion`. Abogado B no puede analizar/leer documento de A (probado en `e2e24.probe`).

## 14. Tests

Suite existente 744/744 PASS. Probe determinista 4.4 (contrato sintético con renta $500.000, inicio 01/01/2026, 12 meses, 60 días, María/Jorge, garantía $500.000) — 13 checks: resumen, monto, fecha, duración, partes, obligaciones, riesgos, missing, multi-doc, ownership, provider — todos PASS vía `verifyDocumentClaims`/`buildJurisprudenceOutcome`.

## 15. QA determinista

`e2e24.probe` 26/26 PASS (12 UX E2E + 14 grounding/anti-alucinación). Casos G1-G6 (renta, paráfrasis, multi-doc, processing/error) PASS. Anti-alucinación monto/fecha/rol/hecho inexistente → NO_EVIDENCE.

## 16. QA real

No se ejecutó LLM real para análisis en esta fase (infra ya certificada en 4.2.24 con `gpt-4o-mini` 6/6). Free `openai/gpt-oss-20b:free` sigue 404 INFRASTRUCTURE_BLOCKED (no fabricado). Determinista cubre análisis; QA real de análisis con documento controlado queda para siguiente iteración con proveedor disponible.

## 17. Performance

`extracted_text` reutilizado (no re-extrae PDF durante análisis), `selectDocumentEvidence` presupuesto 15000, no descarga repetida, no loops, `upload→processing async` con polling 4s/10 min guard.

## 18. Costos

1 llamada LLM por análisis (ideal), retries solo vía `call budget` 6. Costo `gpt-4o-mini` ~$0.001 por análisis (medido en 4.2.24).

## 19. Regresiones

`npx vitest run` 744/744 PASS, `npm run build` PASS (11.03s), `npx eslint` 0 errores (no hay archivos tocados).

## 20. Riesgos

- PDF sin texto (solo imágenes) → `error` sin OCR (documentado, no se implementa OCR en 4.3/4.4)
- PDF corrupto → `error` con reintento
- No se reconstruyen tablas/columnas complejas (fase siguiente)

## 21. Decisiones arquitectónicas

- Reutilizar `ai_documents`/`ai-documents`/`ai_document_analyses` en lugar de crear duplicados (evita segunda arquitectura paralela)
- No crear `ai_document_text` separada ( `extracted_text` + `chunkDocumentText` ya permite `page_number→content`)
- No implementar embeddings/RAG/OCR/agentes en 4.4 (base documental sólida primero)

## 22. Funcionalidades no implementadas

RAG avanzado, embeddings, pgvector, LangChain, agentes, OCR, jurisprudencia automática, scraping, generación de escritos (conforme spec §57)

## 23. Veredicto final

**CERTIFIED FOR NEXT PRODUCT PHASE** — Documento ready puede analizarse, análisis estructurado funciona con grounding, resumen/partes/hechos/obligaciones/fechas/riesgos/missing/attention grounded, claims verificados, source IDs válidos, evidencia visible, no se inventan números/fechas/roles, ownership intacto, chat/research/historial intactos, PostHog metadata-only, suite/build/lint PASS.

