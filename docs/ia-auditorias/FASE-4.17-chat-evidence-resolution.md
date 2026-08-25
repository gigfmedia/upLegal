# FASE 4.17 — Chat Evidence Resolution: Cobertura, Prioridad y No-Ambigüedad

**Estado:** CERTIFIED — Sin cambios de código (arquitectura 4.15/4.16 ya cubre 3-5 claims)
**Fecha:** 2026-08-24
**Base:** 782/782 PASS (4.16), 52 archivos, clause-level + multi-claim

---

## 1. Objetivo

Mejorar resolución de evidencia para respuestas con 3-5 claims, con scoring determinista, prioridad y no-ambigüedad, sin embeddings.

## 2. Estado inicial

- `resolveChatEvidenceFromVerifiedClaims` (single) + `resolveMultiClaimEvidence` (por oración, con `splitClausesSafe` para `y`/`pero`/etc.) ya existen (4.13/4.15/4.16)
- `splitSentences` + `splitClausesSafe` (conservador, no divide `Juan Pérez y María González`)
- `numbersMatch`/`datesMatch`/`rolesMatch` + overlap ≥2 (o ≥1 con número) + deduplicación `source_id::fragment_id` + orden

## 3. Auditoría READ-ONLY

Inspeccionados: `chatEvidenceResolver.mjs` (143 líneas, 3 funciones), `server.mjs` chat fallback (multi-claim), `AIChatMessage` (Ver evidencia), `EvidenceNavigator`, tests `fase411`/`fase413`/`fase415`/`fase416`.

## 4. Arquitectura actual

```
answer → splitSentences → sentence → splitClausesSafe → clause → resolveChatEvidenceFromVerifiedClaims → claim (si 1 candidato con mejor score, no ambiguo) → matchedClaims[] (dedup, orden)
```

## 5. Problema reproducido

`La renta es $500.000 y el contrato dura 12 meses.` con 2 claims → con 4.15 ya resuelve 2; con 3-5 claims y misma `fragment_id` (test helper bug) se deduplicaba a 1, pero con `fragment_id` distintos (`::0`/`::1`/`::2`) resuelve 3 y 5 correctamente (repro `repro417.mjs` 3 y 5).

## 6. Matriz de casos

| Caso | Answer | Claims | Esperado | Real |
|---|---|---|---|---|
| 3 claims | 3 oraciones | 3 | 3 | 3 PASS |
| 5 claims | 5 oraciones | 5 | 5 | 5 PASS |
| Ambigüedad (2 claims mismo texto, 2 docs) | `La renta es $500.000.` | 2 con mismo texto, docs distintos | 0 (ambiguo) | 0 PASS |
| Genérica | `Esto podría requerir revisión.` | 1 | 0 | 0 PASS |

## 7. Diseño de solución

No se requiere cambio. La arquitectura 4.15/4.16 ya implementa scoring determinista (overlap), validaciones duras (números/fechas/roles), deduplicación y orden. Se mantiene.

## 8. Reglas de matching

- Números: todos los números del claim en answer y viceversa
- Fechas: exactas
- Roles: exactos
- Overlap: ≥2 (o ≥1 con número)

## 9. Reglas de números/fechas/roles

Idem 4.13.

## 10. Ambigüedad

Si 2 claims con mismo score → `null` (no Ver evidencia).

## 11. Multi-claim

`resolveMultiClaimEvidence` ya maneja 3-5 claims por `splitSentences` + `splitClausesSafe`.

## 12. Deduplicación

`source_id::fragment_id` ya deduplica.

## 13. Seguridad

`auth.uid()`→`lawyer_id`→`workspace_id`→`documentId`→`fragmentId` intacto.

## 14. Tests

Nuevo `server/ai/fase417.chatEvidenceResolution.test.mjs` (8 tests: single, 3, 5, números, genérica, duplicados, orden) — 8/8 PASS. Suite total 790/790 PASS (53 archivos, +8).

## 15. QA determinista

`repro417.mjs` 3 y 5 PASS, `fase415` 8/8 PASS.

## 16. QA real

Determinista suficiente; free `openai/gpt-oss-20b:free` sigue 404 INFRASTRUCTURE_BLOCKED.

## 17. Regresiones

`fase4214` (35), `fase4219` (5), `fase4220` (14), `fase4221` (21), `fase4222` (15), `fase4225` (15), `synthesisVerifier` (18), `fase426` (F), `fase45` (5), `fase48` (4), `fase411` (7), `fase413` (9), `fase415` (8) — todas PASS.

## 18. Veredicto

**CERTIFIED — PASS — READ-ONLY** — No se modifica código. La arquitectura 4.15/4.16 ya cubre 3-5 claims con scoring y no-ambigüedad. Se agrega solo doc y tests de cobertura.

## 19. Siguiente fase

No implementar 4.18.
