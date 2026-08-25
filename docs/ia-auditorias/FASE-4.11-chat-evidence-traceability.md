# FASE 4.11 — Trazabilidad Determinista de Evidencia en Chat

**Estado:** CERTIFIED (sin RAG, sin embeddings)
**Fecha:** 2026-08-24
**Base:** 753/753 PASS (4.10), EvidenceNavigator + endpoint evidence/:fragmentId

---

## 1. Objetivo

Hacer que las respuestas de Chat que dependen de documentos tengan referencia determinista `documentId→fragmentId→page_number→evidence` para `Ver evidencia` → `EvidenceNavigator`, priorizando evidencia verificada por backend sobre referencia inventada por LLM.

## 2. Estado inicial

- `AIChatResponseSchema` solo `document_id`+`file_name`, sin `fragment_id`/`page_number`/`evidence`
- `server.mjs` chat: valida `document_id`/`file_name` contra `readyDocs`, mapea a `{document_id, file_name}` sin evidencia
- `AIChatMessage` muestra `Fuentes utilizadas: file_name` sin `Ver evidencia`
- Research ya tiene `fragment_id`/`evidence` y usa `EvidenceNavigator` (4.8/4.9)

## 3. Arquitectura actual

```
POST /chat → getAIWorkspaceOwned → readyDocs → buildChatContext → chatCompletion → AIChatResponseSchema.parse → recordAIUsage → includedById filter → sources → ai_chat_messages.metadata.sources → useAIChat → AIChatMessage
```

Falta: `fragment_id`/`evidence` y fallback determinista.

## 4. Flujo Chat

`POST /chat` → `detectDocumentMode` no usado (chat siempre document), `readyDocs` → `buildChatContext` (chunking) → `chatCompletion` → `AIChatResponseSchema` → `recordAIUsage` → `includedById` → `sources` → `metadata.sources`.

## 5. AIChatResponseSchema

Antes: `sources: [{document_id, file_name}]`
Después: `sources: [{document_id, file_name, fragment_id?, page_number?, evidence?}]` opcionales, backward-compatible.

## 6. Claims

Chat no usa `verifyDocumentClaims` para la respuesta; solo valida `document_id`. Para 4.11, se agrega verificación `verifyDocumentClaims` para derivar `fragment_id`/`evidence` cuando el LLM no lo entrega.

## 7. source_id

`source_id = document.id` (estable, `ai_documents.id`), no se crea nuevo tipo.

## 8. fragment_id

`document::id::idx` determinista via `chunkDocumentText`, `page_number = idx+1`. Backend valida `fragment_id` prefijo y `evidence` substring en `extracted_text`.

## 9. Fallback determinista

Si `fragment_id`/`evidence` ausente o inválido, pero existe claim verificado para `answer` (via `verifyDocumentClaims` contra `readyDocs`), se reutiliza `kept[0].fragment_id`/`fragmento`/`page_number` para enriquecer la fuente. No se crea nuevo claim, no se inventa fragment, no se duplica evidence.

## 10. Document Analysis

`ai_document_analyses.claims` ya persiste `source_id`/`fragment_id`/`page_number`/`evidence` (4.5). No se modifica.

## 11. Case Intelligence

`facts` con `source_ids`/`evidences` ya verificados (4.6). No se modifica.

## 12. Chat documental

Documento `La renta mensual es de $500.000.` + pregunta `¿Cuál es la renta mensual?` → `claim verificado` → `source_id`+`fragment_id`+`evidence` → `Ver evidencia` → `EvidenceNavigator` (page 1, fragmento).

## 13. Chat mixto

`¿Cuál es la renta mensual y qué dice la Ley 21.719?` → `document` (renta) → `EvidenceNavigator`, `normativa` (Ley 21.719) → `citation`/`excerpt` (no `Ver evidencia` documental). Separación preservada.

## 14. NO_EVIDENCE

`¿Cuál es la multa por incumplimiento?` sin claim → `NO_EVIDENCE`, sin `Ver evidencia`, sin source.

## 15. Ownership

`auth.uid()`→`lawyer_id`→`workspace_id`→`documentId`→`fragmentId` via `getAIDocumentOwned` + `chunkDocumentText` + `verifyDocumentClaims` con `workspaceId`/`lawyerId`. `B` → `Evidence A` 404.

## 16. EvidenceNavigator

Reutilizado 1 componente para `case_intelligence`/`document_analysis`/`chat`/`research`, con `surface` param.

## 17. Tests

Nuevo `server/ai/fase411.chatEvidence.test.mjs` (7 tests: LLM fragment válido, fallback determinista, fragment inválido, número/fecha incorrecta, NO_EVIDENCE, ownership) — 7/7 PASS. Suite total 760/760 PASS (49 archivos).

## 18. QA determinista

`e2e410.probe` 9/9 PASS + `fase411` 7/7 PASS. 0 evidence leaks, 0 invalid fragment, 0 cross-workspace, 0 discarded reintroduced.

## 19. QA real

Free `openai/gpt-oss-20b:free` → 404 INFRASTRUCTURE_BLOCKED, `gpt-4o-mini` 6/6 en 4.2.24 sigue válido; chat fallback determinista no requiere LLM adicional.

## 20. Regresiones

`fase4214` (35), `fase4219` (5), `fase4220` (14), `fase4221` (21), `fase4222` (15), `fase4225` (15), `synthesisVerifier` (18), `fase426` (F), `fase45` (5), `fase48` (4) — todas PASS. `npm run build` PASS, `npx eslint` 0 errores.

## 21. Cambios

`server.mjs` (+25, chat fallback), `server/ai/legalChatPrompt.mjs` (+4, prompt pide `fragment_id`/`evidence`), `src/hooks/useAIChat.ts` (+2, tipo), `src/components/legalup-ai/AIChatMessage.tsx` (+30, `Ver evidencia` → `EvidenceNavigator`)

## 22. Riesgos residuales

- `AIChat` `fragment_id` depende de que el LLM lo devuelva; si no, fallback usa `verifyDocumentClaims` sobre `answer` completa (puede no coincidir exactamente con claim verificado si la respuesta es parafraseada).
- `EvidenceNavigator` `Abrir documento` requiere `file_path` no siempre en `reference`.

## 23. Veredicto

**CERTIFIED** — Chat documental ahora tiene trazabilidad determinista `respuesta→claim→source_id→fragmentId→page_number→EvidenceNavigator` cuando existe evidencia verificada, con fallback seguro y sin reintroducir descartados.

## 24. Siguiente fase

No implementar 4.12 (RAG/embeddings) hasta validar 4.11 en producción.
