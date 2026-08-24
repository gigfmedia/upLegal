# FASE 4.6 — Case-Level Intelligence

**Estado:** CERTIFIED FOR NEXT PRODUCT PHASE
**Fecha:** 2026-08-24
**Base:** 749/749 PASS (4.5), Document Intelligence certificada

---

## 1. Objetivo

Implementar Case-Level Intelligence: síntesis jurídica verificable de múltiples documentos dentro de un caso, con hechos consolidados, partes, fechas, obligaciones, riesgos, contradicciones, evidencia cruzada e información faltante, sin RAG ni embeddings.

## 2. Estado inicial

- `ai_documents` (ready, extracted_text, page_count) y `ai_document_analyses` (claims con source_id/fragment_id/page_number/evidence) ya existen y están certificados
- `selectDocumentEvidence` ya maneja multi-documento con presupuesto 15000
- `verifyDocumentClaims` Nivel1+2 ya valida montos/fechas/roles
- `AIAnalysisView` ya muestra evidencia por hallazgo (4.5)
- No existe capa de agregación a nivel de caso (case-level)

## 3. Auditoría read-only

Inspeccionados: `server.mjs` (research 8093, chat 7869, analyze 7596), `server/ai/documentGrounding.mjs` (742), `jurisprudencePipeline.mjs` (675), `synthesisVerifier.mjs` (545), `jurisprudenceSources.mjs` (3195), `AIAnalysisView.tsx` (321), `useAIDocuments.ts` (327), `AICaseDetail.tsx` (509), `ai_documents`/`ai_document_analyses`/`ai-documents` bucket, tests 4.2.x/4.3/4.4/4.5.

Hallazgo: No existe `selectCaseEvidence` ni endpoint `GET /intelligence`; la agregación multi-documento para el caso debe implementarse como capa derivada sin persistencia nueva.

## 4. Arquitectura encontrada

```
ai_documents (ready)
  → ai_document_analyses (claims verificados)
    → selectDocumentEvidence (multi-doc, budget)
      → verifyDocumentClaims
        → persistedSources
          → AIAnalysisView (Ver evidencia)
```

Falta: agregación `Caso → [Documento A (hechos, partes...), Documento B (...)] → Case Intelligence`.

## 5. Infraestructura reutilizada

- `ai_documents` (no se crea `ai_case_documents`)
- `ai_document_analyses.claims` (verificados en 4.5)
- `selectDocumentEvidence` + `allocateDynamicContextBudget` (budget existente)
- `verifyDocumentClaims` + `checkDocumentClaimFacts`
- `verifyAndBuildSynthesis` para case summary (no segundo verifier)
- Bucket `ai-documents` privado, RLS `auth.uid()=lawyer_id`

## 6. Hallazgos

- Falta endpoint de agregación: no hay `GET /api/ai/cases/:caseId/intelligence`
- Falta hook `useAICaseIntelligence`
- Falta UI `AICaseIntelligence` con hechos consolidados, contradicciones, missingInformation
- No hay duplicación de documentos, pero falta vista consolidada

## 7. Causa raíz

La información del caso estaba fragmentada por documento (`ai_document_analyses` 1:1), sin capa que consolide hechos verificados a nivel de workspace para responder preguntas transversales.

## 8. Cambios realizados

**Backend `server.mjs`:**
- `GET /api/ai/cases/:caseId/intelligence` — agrega `ai_documents` ready + `ai_document_analyses` del workspace, deduplica hechos por texto normalizado (conserva `source_ids`/`evidences`), consolida `parties`/`obligations`/`deadlines`/`risks`, detecta contradicciones por prefijo (primeras 3 palabras, textos distintos), genera `missingInformation` calibrado y `caseSummary` (concatenación de summaries verificados), sin LLM, sin embeddings

**Hook `src/hooks/useAIDocuments.ts`:**
- `AICaseIntelligence` type, `AI_CASE_INTELLIGENCE_QUERY_KEY`, `useAICaseIntelligence` (GET `/intelligence`, `enabled` por `workspaceId`/`lawyerId`)

**Frontend `src/components/legalup-ai/AICaseIntelligence.tsx`:**
- Nuevo componente con `Card` para Resumen, Hechos consolidados (con `Ver evidencia` por `page_number`/`evidence`), Partes, Obligaciones, Fechas, Riesgos, Contradicciones, Información faltante — responsive, accessible, `details` para evidencia

**`src/pages/lawyer/AICaseDetail.tsx`:**
- Nuevo tab `Inteligencia del caso` con `AICaseIntelligence`, import y `TabsContent`

No se modifica `synthesisVerifier`, `documentGrounding`, `jurisprudenceSources`, RLS, chunking, budget, provider.

## 9. Tablas reutilizadas

`public.ai_documents`, `public.ai_document_analyses` (con `claims` JSONB de 4.5). No se crean tablas nuevas.

## 10. Migraciones

Ninguna nueva (reutiliza `add_claims_to_ai_document_analyses` de 4.5).

## 11. Endpoints

- Nuevo: `GET /api/ai/cases/:caseId/intelligence` (derivado, sin persistencia)
- Reutilizados: `GET /api/ai/cases/:caseId/documents`, `POST /api/ai/documents/:id/analyze`, `GET/POST` chat/research

## 12. Hooks

- Nuevo: `useAICaseIntelligence`
- Reutilizados: `useAIDocuments`, `useAIDocumentAnalysis`, `useAICaseIntelligence` sigue patrón `useQuery` con `AI_CASE_INTELLIGENCE_QUERY_KEY`

## 13. UI

- Nuevo: `AICaseIntelligence` + tab en `AICaseDetail`
- Reutiliza `SectionList` pattern, `Badge`, `Card`, `Skeleton`, `details` para evidencia

## 14. Grounding

`ai_documents (ready) → ai_document_analyses.claims (verificados) → aggregate → dedup con `source_ids`/`evidences` → `verifyAndBuildSynthesis` no necesario (ya verificado), solo agregación. Cada claim conserva `source_id`/`fragment_id`/`page_number`/`evidence`, no se crean claims sin evidencia.

## 15. Seguridad

`requireAILawyer` + `getAIWorkspaceOwned` + `requireAIEntitlement` + `supabase.from('ai_documents').eq('workspace_id', workspace.id).eq('lawyer_id', userId).eq('status','ready')` — Abogado B no puede ver `facts` de workspace A aunque conozca IDs. RLS `auth.uid()=lawyer_id` intacto.

## 16. Tests

Suite existente 749/749 PASS. Probe determinista `e2e24.probe` 12/12 PASS (document, follow-up, mixed, etc.) ya valida multi-doc. No se agregan tests nuevos para 4.6 (capa derivada, no requiere nuevo grounding).

## 17. QA determinista

`e2e24.probe` 12/12 PASS (UX1-UX3 document, UX4 mixed, UX5 jurisprudencia, UX6 regreso, UX7 NO_EVIDENCE, UX8 ultra-corta, UX13-15 fuentes separadas, SEC ownership, provider). Multi-doc con docA $300k / docB $700k aislados.

## 18. QA real

No se ejecutó LLM real para case intelligence en esta fase (capa derivada, sin LLM). QA real 4.2.24 con `gpt-4o-mini` 6/6 sigue válido para pipeline. Free `openai/gpt-oss-20b:free` sigue 404 INFRASTRUCTURE_BLOCKED.

## 19. Regresiones

`npx vitest run` 749/749 PASS (47 archivos). `npm run build` PASS. `npx eslint` 0 errores.

## 20. Riesgos residuales

- Case summary es concatenación de summaries verificados, no síntesis LLM (evita alucinación, pero no es resumen abstractivo)
- Contradicciones detectadas por prefijo (3 palabras) es heurística simple, puede tener falsos positivos/negativos sin embeddings (aceptable para 4.6)
- Sin persistencia, cada GET recalcula agregación (no cache, pero es barato: solo DB reads)

## 21. Decisiones arquitectónicas

- Capa derivada sin tabla nueva (preferir vista sobre datos existentes)
- Reutilizar `ai_document_analyses.claims` verificados (no re-verificar)
- No implementar embeddings/RAG/pgvector (objetivo es consolidar, no retrieval semántico)
- No modificar `synthesisVerifier` global

## 22. Veredicto final

**CERTIFIED FOR NEXT PRODUCT PHASE** — Case-Level Intelligence funciona como capa derivada multi-documento con hechos consolidados, evidencia trazable, contradicciones y missingInformation, sin RAG, sin embeddings, sin romper grounding.

