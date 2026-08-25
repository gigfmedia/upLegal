# FASE 4.16 — Clause-Level Chat Evidence Resolution

**Estado:** CERTIFIED (sin RAG, sin embeddings, sin nueva tabla)
**Fecha:** 2026-08-24
**Base:** 777/777 PASS (4.15), multi-claim por oración ya certificado

---

## 1. Objetivo

Permitir que una sola oración con múltiples afirmaciones independientes (`La renta es $500.000 y el contrato dura 12 meses.`) pueda resolver 2 evidencias sin crear nuevo motor de grounding.

## 2. Estado inicial

- `resolveMultiClaimEvidence` por oración (4.15) ya maneja `La renta es $500.000. El contrato dura 12 meses.` → 2 evidencias
- `La renta es $500.000 y el contrato dura 12 meses.` (una sola oración con `y`) → 0 evidencias (fallo reproducido)

## 3. Auditoría READ-ONLY

Inspeccionados: `chatEvidenceResolver.mjs` (splitSentences, resolveMultiClaimEvidence, resolveChatEvidenceFromVerifiedClaims, numbersMatch, datesMatch, rolesMatch), `server.mjs` chat fallback, `documentGrounding.mjs`, `synthesisVerifier.mjs`, tests 4.11/4.13/4.15.

`splitSentences` usa `(?<=[.!?])\s+`, no divide `y`. `numbersMatch` exige equivalencia bidireccional, por lo que una oración con 2 números no matchea un claim con 1 número.

## 4. Arquitectura actual

```
answer → splitSentences → sentence → resolveChatEvidenceFromVerifiedClaims → claim
```

Falta: `sentence → splitClausesSafe → clause → resolver`

## 5. Caso límite reproducido

`La renta mensual es de $500.000 y el contrato comenzó el 1 de enero de 2026.` con claims `La renta mensual es de $500.000.` y `El contrato comenzó el 1 de enero de 2026.` → `resolveMultiClaimEvidence` 0 → esperado 2.

## 6. Causa raíz

`splitSentences` conserva toda la oración, `numbersMatch` ve 2 números en la oración vs 1 en cada claim y rechaza.

## 7. Solución

`splitClausesSafe` (15 líneas, determinista, conservadora): divide en ` y | pero | además | mientras que | sin embargo` solo si cada parte >10 chars, tiene verbo/número/fecha y no es "Juan Pérez y María González" (nombres propios) ni enumeración corta (<15 chars). `resolveMultiClaimEvidence` ahora: por oración, intenta `resolveChatEvidenceFromVerifiedClaims`; si null y `splitClausesSafe` >1, evalúa cada cláusula con el mismo resolver, deduplica y preserva orden.

## 8. Segmentación

`y` entre dos afirmaciones con verbo/número → divide; `y` entre nombres propios o enumeración sin verbo → no divide. Prioridad `correctness > coverage`.

## 9. Matching

Reutiliza `resolveChatEvidenceFromVerifiedClaims` (números/fechas/roles/overlap) sin duplicar.

## 10. Números

`$500.000` + `12 meses` en una oración → cada cláusula con 1 número matchea su claim (1+ número es suficiente).

## 11. Fechas

`1 de enero` + `31 de diciembre` en una oración → cada cláusula con fecha correcta matchea, incorrecta se rechaza.

## 12. Roles

`arrendatario paga gastos` + `arrendador repara` → cada cláusula con rol correcto matchea, invertido se rechaza.

## 13. Paráfrasis

Se mantiene 4.13 (`canon` vs `renta` con mismo monto → 1 término + número).

## 14. Multi-documento

`Documento A: $500.000` + `Documento B: $700.000` → cada cláusula abre su `documentId`/`fragmentId` sin mezclar.

## 15. Ambigüedad

Si una cláusula es ambigua (2 claims con mismo score) → `null` (no evidencia).

## 16. Seguridad

`auth.uid()`→`lawyer_id`→`workspace_id`→`documentId`→`fragmentId` intacto.

## 17. Frontend

No requiere cambios (ya soporta múltiples `sources[]` con `Ver evidencia`).

## 18. Tests

Nuevo `server/ai/fase416.clauseEvidence.test.mjs` (5 tests: A 2 números →2, F nombres propios, G y no separable, M monto incorrecto solo 1, orden) — 5/5 PASS. Suite total 782/782 PASS (52 archivos).

## 19. QA determinista

`repro416.mjs` 2/2 PASS, `fase415` 8/8 PASS.

## 20. QA real

Determinista suficiente; free `openai/gpt-oss-20b:free` sigue 404 INFRASTRUCTURE_BLOCKED.

## 21. Regresiones

`fase4214` (35), `fase4219` (5), `fase4220` (14), `fase4221` (21), `fase4222` (15), `fase4225` (15), `synthesisVerifier` (18), `fase426` (F), `fase45` (5), `fase48` (4), `fase411` (7), `fase413` (9) — todas PASS.

## 22. Riesgos residuales

- `y` en enumeración sin verbo (`La renta y los gastos comunes`) no se divide (conservador, aceptable).
- Oración muy larga con 3 cláusulas y solo 2 claims verificados → solo 2 evidencias (correcto).

## 23. Decisiones arquitectónicas

- Capa pequeña `splitClausesSafe` + reuso de resolver existente, sin parser jurídico, sin NLP externo, sin embeddings.

## 24. Veredicto

**CERTIFIED** — Clause-level resuelto, sin romper 4.13/4.15, sin RAG.

## 25. Siguiente fase

No implementar 4.17.
