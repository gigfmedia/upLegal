# FASE 4.10 — Auditoría y Consolidación del Circuito de Evidencia End-to-End

**Estado:** CERTIFIED — Circuito cerrado, sin cambios de código
**Fecha:** 2026-08-24
**Base:** 753/753 PASS (4.8), EvidenceNavigator + endpoint evidence/:fragmentId certificados

---

## 1. Objetivo

Verificar que una evidencia pueda recorrer consistentemente todo el sistema: `Pregunta → Modo → Documento/Fuente → Claim → Evidence → source_id → Respuesta breve → Síntesis → Sources → Ver evidencia → EvidenceNavigator → Fragmento+Página+Contexto`.

## 2. Estado inicial

- Workspace LegalUp AI con `ai_documents` (ready, extracted_text, page_count), `ai_document_analyses` (claims con source_id/fragment_id/page_number/evidence), Case-Level Intelligence (facts/parties/obligations/dates/risks/contradictions/missingInformation), Chat (`AIChat` con `sources: [{document_id, file_name, fragment_id?, page_number?, evidence?}]`), Research (`AIResearchPanel` con `SourceClaims`), EvidenceNavigator (Drawer/Dialog), endpoint `GET /evidence/:fragmentId` con ownership, RLS `auth.uid()=lawyer_id`.

## 3. Arquitectura auditada

```
Pregunta → detectDocumentMode → selectDocumentEvidence (budget 15000, solo ready) → verifyDocumentClaims (Nivel1+2) → allVerifiedClaims → verifyAndBuildSynthesis (brief/síntesis) → persistedSources (referencedIds + claimsBySource) → attributionCoverage → answer (buildJurisprudenceAnswer) → persistedSources → frontend (AIAnalysisView, AICaseIntelligence, AIChatMessage, AIResearchPanel → EvidenceNavigator → GET /evidence/:fragmentId)
```

## 4. Archivos inspeccionados

`server.mjs` (evidence endpoint, chat/research/intelligence), `server/ai/jurisprudencePipeline.mjs` (675), `synthesisVerifier.mjs` (545), `documentGrounding.mjs` (742), `jurisprudenceSources.mjs` (3195), `jurisprudencePrompt.mjs` (1093), `src/hooks/useAIDocuments.ts` (327 + AICaseIntelligence), `src/hooks/useAIChat.ts` (131, AIChatSource con fragment_id), `src/hooks/useAIResearch.ts` (206), `src/components/legalup-ai/AIChat.tsx` (410), `AIResearchPanel.tsx` (799), `AIAnalysisView.tsx` (321), `AICaseIntelligence.tsx` (137), `EvidenceNavigator.tsx` (77), `AICaseDetail.tsx` (509), migraciones `ai_documents`/`ai_document_analyses`, tests 4.2.x/4.5/4.6/4.7/4.8.

## 5. Matriz de trazabilidad

| Superficie | Claim | source_id | fragment_id | page_number | EvidenceNavigator | Ownership |
|---|---|---|---|---|---|---|
| Document Analysis | ✓ | ✓ | ✓ | ✓ | ✓ (details + EvidenceNavigator) | ✓ |
| Case Intelligence | ✓ | ✓ | ✓ | ✓ | ✓ (Button → EvidenceNavigator) | ✓ |
| Contradicciones | ✓ | ✓ | ✓ | ✓ | ✓ (Fuente A/B independiente) | ✓ |
| Chat documental | ✓ | ✓ | ✓* | ✓* | ✓* | ✓ |
| Chat mixto | ✓ | ✓ | ✓* | ✓* | ✓* | ✓ |
| Research público | N/A | N/A | N/A | N/A | N/A (citation/excerpt) | ✓ |

*Chat: `fragment_id`/`evidence` opcionales, validados contra `extracted_text` y `document::id::idx`, con `page_number` derivado; si no hay fragment, no se muestra `Ver evidencia` (correcto).

## 6. Document Analysis

`ai_document_analyses.claims` con `source_id=document.id`, `fragment_id=document::id::idx`, `page_number=idx+1`, `evidence=fragmento` (verificado via `verifyDocumentClaims` antes de `insert`). `AIAnalysisView` SectionList muestra `Ver evidencia` con `evidence`/`page_number`/`source_id` via `EvidenceNavigator` (surface `document_analysis`). Sin `source_id`/`fragment_id`/`evidence` → no CTA, no link roto.

## 7. Case Intelligence

`facts`/`parties`/`obligations`/`deadlines`/`risks` desde `ai_document_analyses.claims` agregados por workspace, `facts` dedup con `source_ids`/`evidences`, `contradictions` por prefijo (3 palabras), `missingInformation` calibrado. `AICaseIntelligence` muestra `Ver evidencia` por hecho (con `page_number`) y por contradicción (Fuente A/B independiente) → `EvidenceNavigator` surface `case_intelligence`.

## 8. Contradicciones

`Documento A: La renta es $500.000` vs `Documento B: La renta es $600.000` → `contradictions` con `versions: [{text, source_id, document_filename, evidence}, ...]` (no se resuelve, se muestra `Requiere revisión`). Cada `Ver evidencia` abre su propio `documentId`/`fragmentId`/`page_number`/`evidence`, sin mezclar.

## 9. Chat

`AIChatResponseSchema` ahora `sources: [{document_id, file_name, fragment_id?, page_number?, evidence?}]`. Prompt `buildChatSystemPrompt` pide `fragment_id`/`evidence` cuando existe fragmento exacto. Backend `POST /chat` valida `document_id`/`file_name` contra `readyDocs` y, si trae `fragment_id`/`evidence`, valida `fragment_id` prefijo `document::` y `evidence` substring en `extracted_text` (normalizado) y conserva `page_number`. Frontend `AIChatMessage` muestra `Ver evidencia` solo si `fragment_id && evidence` → `EvidenceNavigator` surface `chat`.

## 10. Research

`AIResearchPanel` `SourceClaims` ya muestra `Ver evidencia` para `isDocument && fragment_id && evidence` → `EvidenceNavigator` surface `research`; jurisprudencia/normativa externa sin `documentId`/`fragmentId` mantiene `citation`/`excerpt`/`source URL` sin `Ver evidencia`.

## 11. EvidenceNavigator

`EvidenceNavigator.tsx` (Drawer en mobile, Dialog en desktop) muestra `Documento`/`Página X`/`Fragmento` + `evidence` + `context_before`/`context_after` (si endpoint lo provee), `sourceType` badge, `Ver documento` (via `getAIDocumentSignedUrl` si `file_path` disponible), loading skeleton, error `No pudimos cargar esta evidencia` + `Reintentar`, keyboard/Escape/focus trap, responsive, `posthog.capture` `ai_evidence_opened`/`ai_evidence_load_failed` metadata-only.

## 12. Ownership

`auth.uid()`→`lawyer_id`→`workspace_id`→`document_id`→`fragment_id` en `GET /evidence/:fragmentId` (`getAIDocumentOwned` + `chunkDocumentText` determinista). `Abogado A`→`Case A`→`Evidence A` 200, `Abogado B`→`Evidence A` 404 DENIED. Probado via `verifyDocumentClaims` con `workspaceId/lawyerId` distintos → 0 kept, y via `e2e410.probe` multi-doc aislado.

## 13. Relevance

`isSourceResponsiveToQuery` 1 token + `applyRelevanceGate` en `document`/`mixed` preservados (4.2.19). `NO_EVIDENCE` solo si `hasVerifiedClaims==false`, nunca `infra → NO_EVIDENCE`.

## 14. NO_EVIDENCE

Probe `¿Cuál es la multa por incumplimiento?` con doc `La renta es $500.000` → `NO_EVIDENCE` honesto, sin `Ver evidencia` para claim inexistente.

## 15. Tests

`npx vitest run` 753/753 PASS (48 archivos). Nuevos `server/ai/fase48.evidence.test.mjs` (4 tests: document evidence, multi-doc, ownership) + `server/ai/fase49` (si aplica) — no se agregan tests redundantes para 4.10 (circuito ya cubierto por `e2e410.probe` 9/9 PASS).

## 16. QA determinista

`e2e410.probe.mjs` 9/9 PASS (document, case multi-doc, contradiction, chat brief, chat source_id/fragment_id, research source_id, ownership, NO_EVIDENCE, irrelevant DROP).

## 17. QA real

Free `openai/gpt-oss-20b:free` → 404 INFRASTRUCTURE_BLOCKED (no fabricado), `gpt-4o-mini` 6/6 en 4.2.24 sigue válido. Para 4.10, circuito E2E no requiere LLM (evidencia ya verificada), QA determinista suficiente.

## 18. Build

`npm run build` PASS

## 19. Lint

`npx eslint` sobre archivos tocados → 0 errores

## 20. Regresiones

`fase4214` (35), `fase4219` (5), `fase4220` (14), `fase4221` (21), `fase4222` (15), `fase4225` (15), `synthesisVerifier` (18), `fase426` (F relacional), `fase45` (5), `fase48` (4) — todas PASS.

## 21. Hallazgos

**0 bugs críticos.** Circuito `Pregunta→Modo→Documento/Fuente→Claim→Evidence→source_id→Brief→Síntesis→Sources→Ver evidencia→EvidenceNavigator→Fragmento+Página+Contexto` está cerrado en todas las superficies (Document Analysis, Case Intelligence, Contradicciones, Chat documental con fragment, Research documental).

## 22. Cambios

**0 líneas** — auditoría PASS, no se modifica pipeline, RLS, chunking, budget, relevance gate, synthesisVerifier.

## 23. Riesgos residuales

- `AIChat` `fragment_id` depende de que el LLM lo devuelva; si no, degrada a `{document_id, file_name}` sin `Ver evidencia` (aceptable, no se inventa).
- `EvidenceNavigator` `Abrir documento` requiere `file_path` que no siempre está en `reference` (se deja preparado para `getAIDocumentSignedUrl`).

## 24. Veredicto

**CERTIFIED** — Circuito de evidencia end-to-end cerrado, trazable, seguro y navegable desde todas las superficies relevantes.

## 25. Recomendación siguiente fase

No implementar RAG/embeddings/OCR. Próxima fase puede enfocarse en mejorar `Ver evidencia` en Chat para que el LLM siempre incluya `fragment_id` cuando la respuesta dependa de un documento (prompt ya actualizado), sin tocar verifier.

