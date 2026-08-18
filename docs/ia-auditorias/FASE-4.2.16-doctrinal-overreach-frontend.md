# FASE 4.2.16 — Corrección del overreach doctrinal (F2) y auditoría del frontend AI (chat + jurisprudencia)

## 1. Objetivo
Dos objetivos independientes sobre la base `49c9eb2` (fase 4.2.14), sin revertir
trabajo ajeno ni tocar el motor jurídico:

- **A. Doctrinal overreach (F2 de 4.2.15):** el guard `DOCTRINAL_OVERREACH_RE`
  advertía pero **no descartaba** los claims doctrinales con lenguaje normativo
  categórico ("Es obligatorio…", "Está prohibido…"). Corregir con `continue` y
  tests específicos.
- **B. Regresión de frontend reportada:** "el chat y las preguntas de jurisprudencia
  desaparecieron". Auditar read-only primero y demostrar la causa con evidencia
  antes de tocar nada.

## 2. Estado del repositorio
- Base: commit `49c9eb2` (fase 4.2.14), HEAD sin mover, sin commits nuevos.
- Working tree final de esta fase (los únicos archivos modificados):
  - `server/ai/jurisprudencePrompt.mjs` — fix A (`continue`).
  - `server/ai/jurisprudencePrompt.test.mjs` — tests A (Caso 1/2/3 + test heredado).
  - `src/hooks/useAISubscription.ts` — fix B (exponer `isLoading`).
  - `src/pages/lawyer/AICaseDetail.tsx` — fix B (skeleton en loading, no lock prematura).
  - `src/__tests__/AICaseDetail.gates.test.tsx` — tests B (nuevo).
  - `src/__tests__/AIChatSuggestions.test.tsx` — tests B (nuevo).
- Persisten sin commit: cambios heredados de 4.2.15 (`fase4214.documentContextRobustness.test.mjs`,
  `jurisprudencePipeline.mjs`) y docs 4.2.11/4.2.13/4.2.15. NO tocados.

---

# PARTE A — DOCTRINAL OVERREACH (F2)

## A1. Problema
En `verifyJurisprudenceClaims` (`server/ai/jurisprudencePrompt.mjs`), el guard de
`DOCTRINAL_OVERREACH_RE` detectaba el lenguaje normativo categórico en claims de
doctrina, emitía un warning, pero **no descartaba el claim**: el veredicto
`rejected` nunca se asignaba, así que el claim seguía pasando a la evidencia.

Criterios de la fase:
- NO cambiar el regex (`/\bes obligatorio\b|\bes (?:legal|ilegal)\b|\best[áa] (?:permitid[oa]|prohibid[oa])\b|\bla (?:ley|normativa|legislaci[oó]n) (?:establece|permite|proh[íi]be)\b/i`).
- NO eliminar el warning.
- NO volver el filtro excesivamente agresivo (un claim prudente y respaldado debe
  seguir siendo `kept`).

## A2. Causa raíz
`server/ai/jurisprudencePrompt.mjs` ~línea 813: el bloque `DOCTRINAL_OVERREACH_RE`
hacía solo `warnings.push(...)` y caía al retorno normal (keep).

## A3. Corrección
Agregar `continue;` tras el warning, de modo que el claim doctrinal con overreach
se descarte de verdad (no entra a evidencia). Fix mínimo de 1 línea + comentario.

## A4. Tests
- Test heredado actualizado: "F2: descarta una doctrina con lenguaje normativo
  categórico" (antes esperaba `kept=1`, ahora `kept=0` + `warnings>=1`).
- Nuevo `describe('Fase 4.2.16 · F2 doctrina con lenguaje normativo categórico (overreach)')`:
  - Caso 1: "Es obligatorio cumplir la ley según la doctrina." → `kept=0`, `warnings>=1`.
  - Caso 2 (5 variantes que el regex ya detecta): "Es legal…", "Está prohibido…",
    "La normativa permite…", "La legislación prohíbe…", "La ley establece…" → `kept=0`.
  - Caso 3: claim prudente ("La doctrina ha sostenido que…") con evidencia → `kept=1`.
- Suites: `jurisprudencePrompt.test.mjs` 56/56, `server/ai` 586/586, suite completa 658/658 (antes de Parte B).

---

# PARTE B — REGRESIÓN DE FRONTEND (CHAT + JURISPRUDENCIA)

## B1. Síntoma reportado
En `/lawyer/ai/cases/:caseId` "desaparecieron el chat y las preguntas de jurisprudencia".

## B2. Última versión buena vs primera versión mala (historial)
- El layout con tabs (chat en "Documentos y análisis", research en "Investigar
  jurisprudencia") se introdujo el **9–10 de agosto** (`8a476a2` tabs, `e05e057`
  forceMount). Antes, el research panel estaba siempre visible bajo el grid y el
  chat en la columna de documentos.
- `src/pages/lawyer/AICaseDetail.tsx` **no se ha modificado desde `cd6c667`
  (Fase 4.1.13, 10-ago)**, y la HEAD es `49c9eb2` (18-ago). No hay commit de
  eliminación de chat/research (ningún archivo relacionado fue borrado en `git log --diff-filter=D`).
- No existe feature flag que oculte la UI de AI (única flag: `booking_button_text`).

## B3. Auditoría read-only (todo presente)
| Pieza | Estado |
| --- | --- |
| `AIChat` + `AIChatSuggestions` | Existen y se renderizan (`AICaseDetail.tsx:351`), detrás de `canChat` |
| `AIResearchPanel` | Existe y se renderiza (`AICaseDetail.tsx:459`), detrás de `canResearch` |
| `GET/POST /api/ai/cases/:caseId/chat` | Existen (`server.mjs:7744/7775`), contrato coincide con `useAIChat.ts` |
| `GET/POST /api/ai/cases/:caseId/jurisprudence` | Existen (`server.mjs:8003/8035`), contrato coincide con `useAIResearch.ts` |
| Routing `/lawyer/ai` y `/lawyer/ai/cases/:caseId` | Presentes (`App.tsx:580-581`) |
| RLS `ai_subscriptions` | `SELECT` con `auth.uid() = lawyer_id` (permite leer la propia) |

## B4. Causa raíz (demostrada con datos, no por suposición)
Flujo real:

```
AICaseDetail
  → useAIFeatureAccess() (src/hooks/useAISubscription.ts)
  → hasAccess (depende de la fila ai_subscriptions del lawyer)
  → canAnalyze / canChat / canResearch
  → si false → lock cards en lugar del contenido real
```

Evidencia en la BD (Supabase proyecto `lgxsfmvyjctxehwslvyw`):
- `ai_subscriptions` tiene **una sola fila**: trial `essential` "unlimited" hasta
  2099 para `juan.fercommerce@gmail.com` (`7edb1767-…`).
- La cuenta de la sesión actual (`gigfmedia@icloud.com`, `e3ce8fc8-…`) **no tiene
  fila** en `ai_subscriptions` (`LEFT JOIN` → `status NULL`).

Consecuencia: `hasAccess=false` → `canUse()`=false → en `AICaseDetail.tsx`:
- `!canAnalyze` (línea 264) reemplaza **todo el tab "Documentos y análisis"** —
  incluyendo `<AIChat>` — por la lock card "Análisis de documentos no disponible".
- `!canResearch` (línea 434) reemplaza el research por "Investigación de
  jurisprudencia no disponible".

Ambas desaparecen **simultáneamente** porque comparten el mismo `hasAccess`.
No es una regresión de código: es el paywall de Fase 3.5 (requiere suscripción
Essential o trial) comportándose como está diseñado para una cuenta sin plan.

## B5. Defecto de código real encontrado (loading)
`useAIFeatureAccess()` no exponía el estado de carga de la consulta de suscripción,
y `hasAccess` parte en `false`. Resultado: las lock cards se renderizaban
**de inmediato**, incluso mientras la suscripción seguía cargando (flash), y se
mantendrían si la consulta fallara. Criterio de la fase (Parte 10): durante el
loading **no** debe mostrarse una lock card; debe existir un estado de carga.

## B6. Corrección (mínima)
1. `src/hooks/useAISubscription.ts` — `useAIFeatureAccess()` ahora expone
   `isLoading` (ya presente en el spread de `useAISubscription`).
2. `src/pages/lawyer/AICaseDetail.tsx` — con `isLoading` activo, ambos tabs
   muestran un esqueleto ("Cargando tu acceso a LegalUp AI…") en lugar de las
   lock cards. Las lock cards solo aparecen cuando la suscripción cargó y el
   acceso es efectivamente falso.

Comportamiento resultante:
- Usuario con acceso (trial/activo) → chat + research renderizan. ✓
- Usuario sin acceso → lock cards visibles y explicadas (el tab no se oculta). ✓
- Loading → esqueleto, sin lock prematura. ✓ (nuevo)

Nota: el panel de jurisprudencia **nunca tuvo** chips de preguntas sugeridas
(verificado en git: `AIChatSuggestions.tsx` solo cubre el chat y no se ha tocado
desde su creación). Su superficie de pregunta es el buscador con placeholder
("Ej.: ¿Qué dice la jurisprudencia sobre…"). No se agregaron chips nuevos para
mantener el fix mínimo.

## B7. Tests (Parte 12)
- `src/__tests__/AICaseDetail.gates.test.tsx` (nuevo):
  1. loading → esqueleto, NO lock card prematura.
  2. suscripción activa → chat + research renderizan.
  3. sin suscripción → lock cards correctas (+ "Ver planes").
- `src/__tests__/AIChatSuggestions.test.tsx` (nuevo):
  4. chat con documento listo y conversación vacía → preguntas sugeridas visibles.
  5. chat sin documentos listos → estado vacío (no preguntas).
  6. research con acceso → buscador + placeholder de pregunta visible.

---

# QA FUNCIONAL (browser manual)
Pendiente de ejecutar en navegador con una cuenta con trial (p. ej.
`juan.fercommerce@gmail.com`, `unlimited_trial`):
1. `/lawyer/ai` — listado de casos.
2. `/lawyer/ai/cases/:caseId` — chat + research visibles.
3. Pregunta documental ("¿Cuál es la renta mensual?").
4. Pregunta de jurisprudencia ("¿Qué jurisprudencia existe sobre término anticipado?").
5. Pregunta mixta ("¿La cláusula QUINTA es compatible con el artículo 1545?").
6. Caso NO_EVIDENCE — la UI no debe romperse.

Nota: con la cuenta sin suscripción (`gigfmedia@icloud.com`) lo correcto es ver
lock cards, no el chat/research. Ese no es un bug.

# SUITES / BUILD / LINT
- Suite completa: **664/664 PASS** (658 previos + 6 nuevos). `server/ai` 586/586,
  `jurisprudencePrompt.test.mjs` 56/56.
- `npm run build`: **PASS** (8.78s).
- Lint (eslint) en archivos modificados: **0 errores** (`useAISubscription.ts`,
  `AICaseDetail.tsx`, `AICaseDetail.gates.test.tsx`, `AIChatSuggestions.test.tsx`,
  `jurisprudencePrompt.mjs`, `jurisprudencePrompt.test.mjs`).

# GIT
- Sin commits nuevos; HEAD sigue en `49c9eb2`. NO push.
- `git status --short` (solo archivos del alcance):
```
 M server/ai/fase4214.documentContextRobustness.test.mjs   (heredado 4.2.15)
 M server/ai/jurisprudencePipeline.mjs                     (heredado 4.2.15)
 M server/ai/jurisprudencePrompt.mjs                       (Parte A)
 M server/ai/jurisprudencePrompt.test.mjs                  (Parte A)
 M src/hooks/useAISubscription.ts                          (Parte B)
 M src/pages/lawyer/AICaseDetail.tsx                       (Parte B)
?? docs/ia-auditorias/FASE-4.2.11-… / FASE-4.2.13-… / FASE-4.2.15-…   (no tocados)
?? src/__tests__/AICaseDetail.gates.test.tsx               (Parte B)
?? src/__tests__/AIChatSuggestions.test.tsx                (Parte B)
```

# RIESGOS PENDIENTES
- **QA LLM real** no ejecutable: el proveedor `openai/gpt-oss-20b:free` seguía
  devolviendo `HTTP 429` en las fases previas (no re-probeado en esta sesión).
  Si persiste → QA LLM con clasificación `INFRASTRUCTURE`, no funcional.
- La cuenta sin `ai_subscriptions` seguirá viendo lock cards hasta iniciar un
  trial (`POST /api/ai/trial/start`) o suscribirse — comportamiento esperado.

# VEREDICTO
- **Parte A:** PASS — F2 corregido con fix mínimo + tests (Caso 1/2/3).
- **Parte B:** causa raíz demostrada (paywall por falta de fila `ai_subscriptions`,
  no eliminación de código) + fix mínimo del estado de loading (esqueleto en vez de
  lock prematura). Restaurar la experiencia para cuentas con acceso no requiere
  más cambios de código.
- **QA LLM real:** PENDIENTE de proveedor (429 histórico).
