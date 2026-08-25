# FASE 4.15 — Multi-Claim Chat Evidence Resolution

**Estado:** CERTIFIED (sin RAG, sin embeddings, sin nueva tabla)
**Fecha:** 2026-08-24
**Base:** 760/760 PASS (4.13), Chat con fallback determinista para single claim

---

## 1. Objetivo

Permitir que una respuesta del chat con múltiples afirmaciones verificables (ej. renta + fecha + obligaciones) pueda tener múltiples evidencias, una por claim, sin crear nuevo motor de grounding.

## 2. Estado inicial

- `resolveChatEvidenceFromVerifiedClaims` solo resolvía 1 claim (la respuesta completa como un solo texto)
- Respuesta multi-oración `La renta es $500.000. El contrato comenzó el 1 de enero de 2026.` con 2 claims verificados solo retornaba 1 evidencia
- `POST /chat` fallback solo manejaba 1 claim (enriquecía una fuente)

## 3. Auditoría READ-ONLY

Inspeccionados: `server.mjs` chat fallback (single), `server/ai/chatEvidenceResolver.mjs` (115 líneas, single), `AIChat` (fuentes como lista, ya soporta múltiples), `EvidenceNavigator` (ya reutilizable).

## 4. Problema

Respuesta multi-claim correcta quedaba con evidencia parcial (solo 1 de 2-3 claims).

## 5. Causa raíz

Resolver evaluaba `answer` completo como un solo texto contra todos los claims, con `numbersMatch` que exige todos los números del claim y de la respuesta coincidan, por lo que una respuesta con 2 números ($500k y 01/01/2026) no coincidía con un claim que solo tiene 1 número.

## 6. Arquitectura existente

```
answer (multi-oración)
  → splitSentences (por .!? )
  → por oración: resolveChatEvidenceFromVerifiedClaims (conservador)
  → deduplica por source_id::fragment_id
  → matchedClaims[]
```

## 7. Solución

- Nuevo `resolveMultiClaimEvidence({answer, verifiedClaims})` en `chatEvidenceResolver.mjs` (25 líneas): `splitSentences` + por oración `resolveChatEvidenceFromVerifiedClaims` + dedup + preserva orden
- `server.mjs` chat fallback: ahora usa `resolveMultiClaimEvidence` y enriquece `sources` con cada `k` en `matchedList` (bucle, no solo 1), deduplica por `source_id::fragment_id`, preserva orden de aparición

No se toca `synthesisVerifier`, `documentGrounding`, RLS, chunking, budget, relevance gate.

## 8. Matching

Reutiliza `numbersMatch`/`datesMatch`/`rolesMatch`/`overlap` de 4.13 por oración.

## 9. Multi-claim

- 1 oración → 1 claim
- 2 oraciones → 2 claims (posiblemente mismo doc o docs diferentes)
- 3 oraciones → 3 claims
- Deduplica si dos oraciones apuntan al mismo claim

## 10. Multi-document

`Documento A: $500.000` + `Documento B: $700.000` + respuesta que requiere ambos → 2 evidencias con `document_id` correctos, no contaminación.

## 11. Ambigüedad

Si una oración puede corresponder a 2 claims con mismo score → `null` (se descarta, no se muestra Ver evidencia).

## 12. Seguridad

`auth.uid()`→`lawyer_id`→`workspace_id`→`documentId`→`fragmentId` via `getAIDocumentOwned` + `verifyDocumentClaims` con `workspaceId`/`lawyerId`.

## 13. Frontend

`AIChatMessage` ya mapea `sources` como lista, cada fuente con `Ver evidencia` → `EvidenceNavigator` surface `chat`. Sin cambios (ya soporta múltiples).

## 14. Tests

Nuevo `server/ai/fase415.multiClaim.test.mjs` (8 tests: single, 2, 3, same doc, no match, monto incorrecto, deduplicación, orden) — 8/8 PASS. Suite total 777/777 PASS (51 archivos).

## 15. QA determinista

`e2e410.probe` 9/9 + `fase413` 9/9 + `fase415` 8/8 — 0 leaks, 0 invalid, 0 cross-workspace, 0 discarded reintroduced.

## 16. QA real

Free `openai/gpt-oss-20b:free` → 404 INFRASTRUCTURE_BLOCKED, `gpt-4o-mini` 6/6 en 4.2.24 sigue válido; multi-claim determinista no requiere LLM adicional.

## 17. Regresiones

`fase4214` (35), `fase4219` (5), `fase4220` (14), `fase4221` (21), `fase4222` (15), `fase4225` (15), `synthesisVerifier` (18), `fase426` (F), `fase45` (5), `fase48` (4), `fase411` (7) — todas PASS.

## 18. Riesgos residuales

- Respuesta multi-claim con frase genérica (`La renta es $500.000 y existe información adicional`) — solo la primera oración con claim tiene evidencia, la segunda sin match queda sin evidencia (correcto, no se inventa).

## 19. Veredicto

**CERTIFIED** — Chat multi-claim ahora tiene múltiples evidencias deterministas, sin RAG, sin embeddings, sin romper grounding.

