# FASE 4.13 — Resolución Determinista de Evidencia para Chat Parafraseado

**Estado:** CERTIFIED (sin RAG, sin embeddings, sin nuevo sistema de evidencia)
**Fecha:** 2026-08-24
**Base:** 760/760 PASS (4.11), Chat con fallback determinista

---

## 1. Objetivo

Resolver el riesgo residual de 4.11: si el LLM parafrasea correctamente un claim verificado (`La renta mensual es de $500.000.` → `El canon mensual pactado asciende a $500.000.`) pero no entrega `fragment_id`, el fallback anterior (`verifyDocumentClaims` sobre `answer` literal) podía no encontrar coincidencia y dejar la respuesta sin `fragment_id`/`evidence`/`page_number`.

## 2. Estado inicial

- Chat `POST /chat` ya valida `fragment_id`/`evidence` cuando el LLM lo entrega (4.9) y tiene fallback que verifica `answer` literal contra `readyDocs` (4.11)
- Fallback 4.11: `verifyDocumentClaims([{document_id, afirmacion: answer, fragmento: answer}], docsById)` — requiere coincidencia literal de `answer` como `afirmacion`, no maneja paráfrasis con mismo monto/fecha/rol
- `AIChatMessage` ya muestra `Ver evidencia` cuando `fragment_id`+`evidence` existen

## 3. Auditoría

Inspeccionados: `server.mjs` (chat 7872, fallback 8075), `server/ai/chatEvidenceResolver.mjs` (no existía), `documentGrounding.mjs` (verifyDocumentClaims), `legalChatPrompt.mjs` (prompt con `fragment_id` opcional), `AIChatMessage.tsx` (Ver evidencia), tests `fase411`.

Falta: función determinista que resuelva `answer` parafraseada contra `verifiedClaims` ya verificados, validando números/fechas/roles y exigiendo ≥2 términos o 1+ número.

## 4. Arquitectura

```
answer (parafraseada)
  → extractNumericFacts, extractRoleWords, normalizeClaimTokens, extractSubstantiveTerms (reutilizados)
  → compara contra verifiedClaims (ya verificados, con source_id/fragment_id/evidence)
  → numbersMatch (todos los números del claim deben estar en answer y viceversa)
  → datesMatch (fechas exactas)
  → rolesMatch (arrendador vs arrendatario)
  → overlap sustantivo ≥2 (o ≥1 si hay número coincidente)
  → si 1 candidato con mejor score → devuelve claim verificado (source_id/fragment_id/evidence/page_number)
  → si 0 o ambiguo (2 con mismo score) → null (no se muestra Ver evidencia, preferible a evidencia incorrecta)
```

## 5. Tests

Nuevo `server/ai/fase413.chatParaphrase.test.mjs` (9 tests): A renta parafraseada con mismo monto → PASS, B monto incorrecto → FAIL, C fecha correcta → PASS, D fecha incorrecta → FAIL, E rol correcto → PASS, F rol incorrecto → FAIL, G dos claims ambiguos → FAIL, H sin source_id → FAIL, N multi-document conflicto → docA para $500k y null para $600k. 9/9 PASS.

## 6. Cambios

- Nuevo `server/ai/chatEvidenceResolver.mjs` (109 líneas, `resolveChatEvidenceFromVerifiedClaims`, sin embeddings, sin LLM, reutiliza `normalizeClaimTokens`/`extractSubstantiveTerms` y `extractNumericFacts` local)
- `server.mjs` chat fallback: ahora primero intenta `resolveChatEvidenceFromVerifiedClaims` contra `allVerifiedClaims` (construido desde `readyDocs` + `ai_document_analyses.claims` verificados), si encuentra match lo usa para enriquecer `sources`; si no, mantiene fallback anterior (verify answer literal)

No se toca `synthesisVerifier`, `documentGrounding`, `jurisprudencePipeline`, RLS, chunking, budget.

## 7. Veredicto

**CERTIFIED** — Chat parafraseado ahora recupera evidencia determinista sin crear claims nuevos, sin inventar evidencia, con validación estricta de números/fechas/roles y sin ambigüedad. Tests 769/769 PASS (50 archivos).
