# FASE 4.2.17 — AUDITORÍA HISTORIAL LEGALUP AI

- **Fecha de auditoría:** 2026-08-20 (UTC 13:40; Chile 09:40, UTC-4)
- **Modo:** READ-ONLY (sin cambios de código, datos, RLS ni schema)
- **Caso auditado:** `Contrato de prestación de servicios`
- **Workspace id:** `5ae2f877-6094-406f-96ca-fc8dc7b8f14a`
- **Usuario:** `juan.fercommerce@gmail.com` (lawyer id `7edb1767-7e4f-4e3e-a61b-4bbf154ae564`)

---

## 1. Objetivo

Determinar exactamente en qué capa se pierde (si se pierde) el historial real de LegalUp AI
para el caso indicado:

```text
Supabase / BD
→ endpoint backend
→ response JSON
→ useAIChat / React Query
→ AIChat
→ DOM / scroll / render
→ usuario
```

Responder una sola pregunta:

> **¿Dónde están las preguntas que hice la semana pasada y por qué no las puedo ver?**

## 2. Estado inicial

- 1 workspace (el caso), 1 conversación, 1 documento `ready`, 1 análisis.
- Según auditoría previa: 48 mensajes de chat y 13 investigaciones guardadas.
- El usuario reporta: "Aun sigo sin ver ninguna pregunta de las que hice la semana pasada".

## 3. Fecha de referencia — "semana pasada"

- Fecha real del entorno: **jue 2026-08-20**.
- Semana pasada (calendario): **lunes 2026-08-10 → domingo 2026-08-16** (zona Chile, UTC-4).

## 4. Modelo de datos real

| Tabla | Rol | Campos clave |
|-------|-----|--------------|
| `ai_workspaces` | 1 workspace = 1 caso | `id`, `lawyer_id`, `title` |
| `ai_conversations` | conversación del caso | `id`, `workspace_id`, `lawyer_id`, `title` |
| `ai_chat_messages` | mensajes | `id`, `conversation_id`, `workspace_id`, `lawyer_id`, `role` (`user`/`assistant`), `content`, `metadata`, `created_at` |
| `ai_research_requests` | investigaciones | `id`, `workspace_id`, `lawyer_id`, `query`, `answer`, `sources`, `model`, `created_at` |
| `ai_documents` / `ai_document_analyses` | documentos y análisis | `workspace_id`, `lawyer_id`, `status` |
| `ai_subscriptions` | acceso | `status`, `plan`, `trial_ends_at`, `unlimited_trial` |
| `ai_usage` / `ai_usage_monthly` | consumo | `lawyer_id`, `total_tokens`, contadores |

Relación: `lawyer → (1:N) workspace → (1:1) conversation → (1:N) message`. No hay columna
`case_id` ni `user_id`: se usa `workspace_id` + `lawyer_id` + `conversation_id`.

## 5. Evidencia Supabase

### 5.1 Conversaciones

Una única conversación para el caso:

| conversation_id | created_at | mensajes |
|-----------------|------------|---------:|
| `4cf88176-d8a0-48e8-9f27-d0e41657053c` | 2026-08-02 23:16 UTC | 48 |

- Mensajes huérfanos (conversación inexistente): **0**.
- Conversaciones sin workspace válido: **0**.
- Otras conversaciones globales: **0**.

### 5.2 Mensajes (48) — orden cronológico

| # | role | created_at (UTC) | created_at (CL) | len |
|---|------|------------------|-----------------|----:|
| 1 | user | 2026-08-02 23:18:43 | 08-02 19:18:43 | 38 |
| 2 | assistant | 2026-08-02 23:18:46 | 08-02 19:18:46 | 560 |
| 3 | user | 2026-08-03 01:46:01 | 08-02 21:46:01 | 42 |
| … | (pares user/assistant consecutivos) | | | |
| 47 | user | 2026-08-05 15:58:10 | 08-05 11:58:10 | 26 |
| 48 | assistant | 2026-08-05 16:18:02 | 08-05 12:18:02 | 1772 |

Resumen:

- Total: **48** (24 `user` + 24 `assistant`), todos pareados (ningún user sin respuesta).
- Primer mensaje: **2026-08-02 23:18:43 UTC**.
- Último mensaje: **2026-08-05 16:18:02 UTC**.
- Mensajes de la semana pasada (10–16 ago): **0**.
- Mensajes posteriores al 05-ago: **0**.
- Duplicados: 0. Contenido íntegro (ninguno vacío/nulo) en los 48.
- Gaps temporales: solo entre sesiones (02-ago → 04-ago → 05-ago); sin huecos intra-sesión.

### 5.3 Investigaciones (13)

- Total: **13**; todas de la semana pasada (10–16 ago): rango 2026-08-11 20:19 UTC → 2026-08-13 14:01 UTC.
- Todas con `answer` presente (315–4.905 caracteres) y `sources` bien formadas (0 fuentes no-objeto,
  0 sin id, 0 con `kind` inválido).
- Modelo: `openai/gpt-oss-20b:free` en las 13.
- Contenido de las consultas: **artefactos de QA** ("Ley N° 99.999", "teletransportación", etc.), no
  preguntas de trabajo del usuario.

### 5.4 Acceso y consumo del usuario

- `ai_subscriptions`: `status=trialing`, `plan=essential`, `trial_ends_at=2099-12-31 23:59:59+00`,
  `unlimited_trial=true` → **acceso vigente**.
- `ai_usage_monthly` (período 2026-08-01): 479.127 tokens, 15 chat, 70 research (techos de protección
  20.000.000 tokens / 5.000 consultas → muy por debajo).
- Cuenta `gigfmedia@icloud.com` (`e3ce8fc8-78f3-496d-99d1-104b9c9a952f`): **0 filas** en
  workspaces, conversations, messages, research, documents ni analyses.

## 6. Evidencia API (backend)

### 6.1 `GET /api/ai/cases/:caseId/chat` (`server.mjs:7744-7772`)

1. `requireAILawyer` (JWT válido).
2. `getAIWorkspaceOwned(caseId, userId)` → ownership del workspace.
3. `requireAIEntitlement` → acceso OK (trial vigente; límites comerciales nulos por
   `unlimited_trial`; protección 479k<20M y 85<5.000; rate 30/min en memoria).
4. `getOrCreateAIConversation` → devuelve la conversación única existente.
5. Query:
   ```js
   select('id, conversation_id, workspace_id, lawyer_id, role, content, metadata, created_at')
     .eq('conversation_id', conversation.id)
     .eq('lawyer_id', userId)
     .order('created_at', { ascending: false })
     .limit(100)
   ```
   luego `.reverse()` → **48 < 100, devuelve los 48 en orden ASC**.

### 6.2 `GET /api/ai/cases/:caseId/jurisprudence` (`server.mjs:8003-8029`)

Query idéntica en filtros, `order('created_at', { ascending: false })`, `.limit(50)` → **13 < 50, devuelve las 13**.

### 6.3 `POST /api/ai/cases/:caseId/chat` (`server.mjs:7775+`)

- Inserta el mensaje `user` **antes** de llamar al proveedor (`server.mjs:7878-7890`) → un envío real
  siempre deja una fila en BD, incluso si la respuesta del asistente falla.
- Retry: dedupe por contenido idéntico del último user (`isRetry`, 7873-7874).

### 6.4 Prueba en vivo

- El server API **está corriendo** en `:3000` (PID 31301, verificado con `lsof`); el dev server de la
  app en `:3001` (PID 17153).
- `curl GET …/chat` y `…/jurisprudence` sin token → **401** `"No autorizado / Token de acceso
  requerido"` → rutas activas y middleware de auth ejecutándose.
- Llamada autenticada real: **no ejecutable** desde esta auditoría (requiere JWT de sesión del
  usuario; la fase es read-only y no hay credenciales). La equivalencia `API = 48/13` es
  **determinista**: la query exacta del endpoint sobre la BD verificada devuelve 48 y 13.

## 7. Evidencia hook (`src/hooks/useAIChat.ts`)

- `queryKey`: `['ai-case-chat', workspaceId]` (línea 33, 52).
- `enabled`: `!!workspaceId && enabled` (53); sin `staleTime`/`gcTime` custom (defaults: stale 0s, gc 5min).
- `queryFn` (54-69): `fetch GET …/chat` → devuelve `body.messages` **sin slice, filter, sort, select ni paginación**.
- Mutation POST (86-130):
  - `onSuccess` (107-124): `setQueryData` **appende** `user_message` y `message` al array existente
    (112-121) — **nunca reemplaza el historial**; luego `invalidateQueries` (refetch de confirmación).
  - `onError` (125-129): `invalidateQueries`.
- Resultado: `API = 48` ⇒ `useAIChat.data.messages = 48`.

## 8. Evidencia componente (`src/components/legalup-ai/AIChat.tsx`)

- `chatEnabled = readyCount > 0` (59) → con 1 doc ready, el query se habilita.
- `shownMessages` (84-102): `[...(chatQuery.data?.messages ?? [])]` + mensaje pending si aplica.
  **Sin slicing ni filtros** ⇒ 48.
- Render (286-315): `shownMessages.map(...)` → **48 elementos en DOM**.
- Input habilitado cuando `conversationId` presente (360, 367).
- Las sugerencias solo se muestran cuando `shownMessages.length === 0 && !sending` (283) — ver §11.

## 9. Evidencia DOM / contenedor de scroll

- Contenedor (281): `-ml-4 max-h-[420px] space-y-4 overflow-y-auto pb-6 pl-4 pr-1`.
  - `max-h-[420px]` + `overflow-y-auto` → **el historial completo es accesible por scroll**.
  - Orden natural top→bottom (más antiguo arriba). Sin `flex-col-reverse`, sin virtualización,
    sin paginación, sin `overflow-hidden` que bloquee.
- `AIChat` se monta en el tab "Documentos y análisis" (`AICaseDetail.tsx:362`); `AIResearchPanel`
  en el tab "Investigar jurisprudencia" (`AICaseDetail.tsx:481`, `forceMount` en 440).

## 10. Evidencia auto-scroll

- `userNearBottomRef` (117-122): el usuario "sigue el hilo" si está a <160px del fondo.
- Efecto principal (124-139): durante `sending` fuerza scroll al final; al llegar una respuesta solo
  scrollea si `userNearBottomRef` → **no roba el scroll mientras se leen mensajes antiguos**.
- ResizeObserver (143-152): mantiene el scroll al final solo si el usuario está al día.
- Al cargar historial: sin scroll forzado (depende de `shownMessages.length`/`sending`).
- Comportamiento esperado: **Caso B/D** — los últimos mensajes visibles al entrar, historial completo
  hacia arriba por scroll.

## 11. React Query / cache

- Sin `initialData`, `placeholderData`, `select` ni merge en el GET.
- Único `setQueryData` (POST, `useAIChat.ts:112-121`): append, no reemplazo.
- Al cambiar de tab, `AIResearchPanel` está `forceMount` (no se desmonta); el chat conserva su cache
  por `workspaceId`. Entrar/salir del caso o recargar → nueva query con la misma key; sin persistencia
  que inyecte estado viejo.
- Las sugerencias del chat son **UX**, no historial: solo aparecen con conversación vacía (283).

## 12. Evidencia de research (`useAIResearch.ts` / `AIResearchPanel.tsx`)

- `useAICaseResearch` (130-151): `GET …/jurisprudence` → `body.research` sin transformación; key
  `['ai-case-research', workspaceId]`; sin staleTime custom.
- Mutation (163-206): `setQueryData` **prepende** la nueva investigación (194-199), nunca borra el historial; `invalidateQueries` al final.
- `AIResearchPanel` (497-706): `history = researchQuery.data ?? []` (506); render `history.map(...)`
  (692-704) **sin límite**. Con API arriba muestra las 13 (collapsibles).
- Las 13 pertenecen a la semana pasada pero son artefactos QA (ver §5.3).

## 13. Git history relevante

| Hallazgo | Commit |
|----------|--------|
| `LIMIT 100` chat y `LIMIT 50` research existen desde la creación | `317e322`, `4431aaa` |
| Condición de sugerencias (solo conversación vacía) sin cambios desde creación | `317e322` |
| Tabs: chat → "Documentos y análisis", research → "Investigar jurisprudencia" | `8a476a2`, `e05e057` (09-10 ago) |
| `AICaseDetail` sin cambios de historial desde | `cd6c667` |
| Últimos commits: fases 4.2.15/4.2.16 + landing | `36fd874`, `929d317` |

- El cambio de ubicación (tabs) en agosto NO implica pérdida de datos; es reorganización de superficie.
- Sin regresión reciente en historial/scroll/orden/limit de mensajes.

## 14. Causa raíz

**No hay pérdida de historial en ninguna capa. Las preguntas de chat de la semana pasada
(10–16 ago) no existen: nunca fueron creadas bajo esta cuenta y caso.**

Cadena verificada (BD → API → hook → componente → DOM), con la API corriendo:

| Dato | Valor |
|------|-------|
| Supabase | 48 mensajes (02–05 ago) |
| API | 48 (LIMIT 100) |
| Hook | 48 (sin transformación) |
| Componente | 48 (`shownMessages`) |
| DOM | 48 (map completo, scrollable) |
| Visible | 48 con scroll; 0 si la API no responde |

Evidencia de que no hubo envíos la semana pasada:

1. **Supabase:** último mensaje de chat 2026-08-05 16:18 UTC; 0 mensajes posteriores al 05-ago.
2. **PostHog (evento `ai_chat_message_sent`, fecha actual 20-ago):** 33 envíos solo 02–05 ago;
   **0 envíos del 06-ago en adelante** (incluso tras volver a levantar la API).
3. **PostHog (`ai_chat_response_failed`):** 12 fallos, todos 03–05 ago.
4. **Persistencia garantizada:** el POST inserta el `user` antes de llamar al proveedor
   (`server.mjs:7878-7890`) → si se hubiera enviado una pregunta, existiría una fila. No hay filas.

**Motivo del "no veo nada":** en la ventana de reporte del usuario, **la API no estaba corriendo**
(puerto 3000 sin listener) y el frontend **no muestra error en GETs fallidos**: `AIChat` queda con
`data` undefined → estado vacío con sugerencias (283); `AIResearchPanel` → "Sin investigaciones aún"
(682). Ese fallo silencioso se percibió como pérdida de historial. Confirmado por el usuario
("era porque no estaba levantado el server"). Hoy la API está arriba y los endpoints responden 401
sin token (rutas vivas).

**Investigaciones de la semana pasada:** las 13 existen y se muestran, pero son **artefactos de QA**
(consultas de prueba del 11–13 ago), no preguntas del usuario.

## 15. Severidad

- **Media.** Sin pérdida de datos (48 + 13 íntegros). Impacto operativo/UX: fallo silencioso de carga
  cuando el backend está caído; y percepción de pérdida por esperar preguntas que nunca se enviaron.

## 16. Recomendación de fix (NO implementado en esta fase)

1. **Operativo (resuelve la visibilidad):** mantener el API server corriendo (`.env.local` apunta a
   `http://localhost:3000`; `server.mjs:9029` escucha en `PORT || 3000`). Verificado hoy: activo.
2. **UX (futura fase, opcional):** mostrar estado de error visible en `AIChat.tsx`
   (`chatQuery.isError`) y `AIResearchPanel.tsx` (`researchQuery.isError`) cuando el GET falle, para
   distinguir "backend caído" de "historial vacío". No aplicar aquí.

## 17. Riesgos

- Un backend caído se sigue percibiendo como pérdida de datos mientras no exista estado de error visible.
- Los artefactos QA (13 research) pueden confundirse con actividad real del usuario.
- Si el despliegue en producción sirve la app con un API distinto/inaccesible, el mismo fallo silencioso reaparecerá.
- Llamada autenticada real no ejecutable en esta auditoría (sin credenciales); la equivalencia API se sustenta en la determinismo de la query.

## 18. Conclusión

> **"Las preguntas de la semana pasada no aparecen porque nunca se crearon bajo esta cuenta y caso."**

- El chat guardado es del **02–05 ago** (48 mensajes, todos con respuesta) y **se muestra completo**
  con la API arriba (scroll del contenedor `max-h-[420px] overflow-y-auto`).
- **No existe ningún mensaje de chat posterior al 05-ago** (BD y PostHog coinciden), por lo que no hay
  "preguntas de la semana pasada" que recuperar en el chat.
- Las únicas investigaciones de la semana pasada (13) son de QA y son visibles.
- Lo que falló fue operativo: la API estaba caída y el frontend lo silenciaba. Con el server arriba,
  el historial completo está accesible.

## Matriz obligatoria

| Capa      | Count | Estado (API arriba) |
|-----------|------:|---------------------|
| Supabase  |    48 | PASS |
| API       |    48 | PASS (LIMIT 100; determinista sobre BD verificada) |
| Hook      |    48 | PASS |
| Component |    48 | PASS |
| DOM       |    48 | PASS (evidencia de código; verificación visual requiere sesión del usuario) |
| UX/Scroll |    48 | PASS con scroll; FAIL operativo si API caída (0 visible, sin error mostrado) |

- **Criterio de diagnóstico aplicado:** **F — No existe pérdida**: historial completo visible mediante
  scroll cuando la API está corriendo.
- **Se requiere fix:** NO (dato). Opcional (UX) en futura fase: error visible en GETs fallidos.