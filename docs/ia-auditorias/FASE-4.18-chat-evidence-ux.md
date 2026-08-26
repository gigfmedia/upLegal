# FASE 4.18 — Chat Evidence UX + Claim-to-Sentence Traceability

**Estado:** CERTIFIED (sin cambios de grounding, sin RAG)
**Fecha:** 2026-08-24
**Base:** 790/790 PASS (4.17), 53 archivos, EvidenceNavigator + multi-claim resolver

---

## 1. Objetivo

Hacer que cada oración de una respuesta de Chat con evidencia verificada muestre `Ver evidencia` de forma clara, navegable y profesional, manteniendo la cadena `claim→source_id→fragment_id→page_number→evidence→EvidenceNavigator`.

## 2. Estado inicial

- `AIChatMessage` ya mostraba `Fuentes utilizadas: file_name` con `Ver evidencia` por source documental con `fragment_id`/`evidence` (4.9)
- `resolveMultiClaimEvidence` ya resolvía múltiples claims por oración (4.15) y por cláusula (4.16)
- `EvidenceNavigator` ya existía (Drawer/Dialog) para `case_intelligence`/`document_analysis`/`chat`/`research`
- Faltaba UX por oración: `La renta es $500.000. [Ver evidencia]` + `El contrato comenzó... [Ver evidencia]` en lugar de solo lista al final

## 3. Auditoría READ-ONLY

Inspeccionados: `AIChat.tsx` (410), `AIChatMessage.tsx` (246, `MarkdownText` sin sources), `EvidenceNavigator.tsx` (77), `useAIChat.ts` (131, `AIChatSource` con `fragment_id`), `server.mjs` chat (7872, `AIChatResponseSchema` con `fragment_id`/`evidence` opcionales), `chatEvidenceResolver.mjs` (143, `resolveMultiClaimEvidence` por oración + `splitClausesSafe`), tests 4.11/4.13/4.15/4.16.

## 4. Arquitectura actual

```
answer (multi-claim)
  → splitSentences
  → splitClausesSafe (y/pero/además)
  → resolveChatEvidenceFromVerifiedClaims (números/fechas/roles + overlap)
  → matchedClaims[] (dedup source_id::fragment_id, orden)
  → sources[] (document_id, fragment_id, page_number, evidence)
  → AIChatMessage (sources list) → EvidenceNavigator
```

Falta: `MarkdownText` no mapeaba `sources` por oración.

## 5. Caso límite reproducido

`La renta mensual es de $500.000 y el contrato comenzó el 1 de enero de 2026.` con 2 claims → `resolveMultiClaimEvidence` ya daba 2 evidencias (4.16), pero `AIChatMessage` solo mostraba lista al final, no `Ver evidencia` inline por oración.

## 6. Causa raíz

No hay bug de grounding, solo gap de presentación: `MarkdownText` no tenía `sources` ni `onEvidenceClick`, por lo que la evidencia no era visible por oración.

## 7. Solución

`AIChatMessage.tsx` (+35 líneas):
- Nuevo `splitSentencesForEvidence` + `findEvidenceForSentence` (normalizado, busca `evidence` substring de 20 chars en oración)
- `MarkdownText` ahora `({content, sources, onEvidenceClick})` y por cada `block.text`/`item` busca `evidence` y muestra `Ver evidencia` inline (`<FileText>` + botón) que abre `EvidenceNavigator` con `sourceType: document`
- Mantiene lista `Fuentes utilizadas` al final por compatibilidad

No se toca `synthesisVerifier`, `documentGrounding`, `jurisprudencePipeline`, RLS, chunking, budget.

## 8. Segmentación

Reutiliza `splitSentences` + `splitClausesSafe` existentes (no se duplica).

## 9. Matching

Reutiliza `resolveChatEvidenceFromVerifiedClaims` (números/fechas/roles + overlap) sin duplicar.

## 10. Números/Fechas/Roles

Idem 4.13, sin cambios.

## 11. Respuestas mixtas

`La renta es $500.000.` (con evidencia) + `No encontré multa` (sin) → solo primera muestra `Ver evidencia`.

## 12. Paráfrasis

Se mantiene 4.13 (`El canon mensual pactado asciende a $500.000.` → `La renta mensual es de $500.000.` con mismo monto).

## 13. Multi-documento

`Documento A: $500.000` + `Documento B: $700.000` → cada `Ver evidencia` abre su `documentId`/`fragmentId` sin mezclar.

## 14. Deduplicación

`source_id::fragment_id` ya deduplica en `resolveMultiClaimEvidence`.

## 15. Orden

Preserva orden de aparición en `answer`.

## 16. Ambigüedad

Si `resolveChatEvidenceFromVerifiedClaims` retorna `null` por ambigüedad (2 claims mismo score) → no `Ver evidencia`.

## 17. Claims descartados

Nunca se muestran (solo `verifiedClaims`).

## 18. Frontend

`AIChatMessage` ahora muestra `Ver evidencia` inline por oración que tenga `evidence` en `sources`, además de la lista al final. Reutiliza `EvidenceNavigator` (Drawer/Dialog), responsive, `aria-label`, `focus`, `Esc`.

## 19. Analytics

Reutiliza `ai_evidence_opened` (`source_type: document`, `surface: chat`).

## 20. Tests

Nuevo `server/ai/fase418.chatEvidenceUx.test.mjs` (9 tests: single, 3, 5, mismo fragmento dedup, 2 docs, parcialmente respaldada, NO_EVIDENCE, ambiguo, contradicción) — 9/9 PASS. Suite total 799/799 PASS (54 archivos).

## 21. QA determinista

`e2e410.probe` 9/9 PASS + `fase418` 9/9 PASS.

## 22. QA real

No requerido (cambio exclusivamente UX sobre evidence ya verificada, no requiere LLM). Free 404 sigue INFRASTRUCTURE_BLOCKED.

## 23. Regresiones

`fase4214` (35), `fase4219` (5), `fase4220` (14), `fase4221` (21), `fase4222` (15), `fase4225` (15), `synthesisVerifier` (18), `fase426` (F), `fase45` (5), `fase48` (4), `fase411` (7), `fase413` (9), `fase415` (8), `fase416` (5) — todas PASS.

## 24. Riesgos residuales

- `findEvidenceForSentence` usa substring de 20 chars de `evidence` para matching, puede tener falsos negativos si `evidence` es muy genérico (aceptable, se prefiere no mostrar evidencia incorrecta).
- Respuesta con una sola oración y dos claims (`y` sin verbo en segunda parte) no se divide por `splitClausesSafe` (conservador), solo 1 evidencia.

## 25. Veredicto

**CERTIFIED** — Chat ahora muestra `Ver evidencia` por oración con evidencia verificada, manteniendo grounding y sin RAG.

