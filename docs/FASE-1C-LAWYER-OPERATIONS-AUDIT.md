# FASE 1C — LAWYER OPERATIONS AUDIT

> **Solicitud → Cliente → Caso → Cita → Ingreso : ¿Puede un abogado operar un asunto real end-to-end?**
> Modo: PLAN / AUDIT ONLY — NO CODE CHANGES
> Fecha: 2026-09-04
> Base: lectura directa `src/pages/lawyer/*`, `src/hooks/*`, `src/types/supabase.ts`, `supabase/migrations/*`, `server.mjs`, `supabase inspect table-stats`, `npm run test:run` (913 passed), `npm run build` (PASS)

---

## 1. Executive Summary

**Pregunta:** ¿Puede un abogado tomar una solicitud real de LegalUp y gestionarla completamente hasta convertirla en cliente/caso/cita/ingreso sin salir de LegalUp?

**Respuesta auditada: SÍ — con gaps P1/P2, no blockers P0 para el flujo feliz.**

- **Request → Client:** SÍ, con `findOrCreateClient()` + `lawyer_clients` dedupe `lower(btrim(email))` y `NULL` para sin email. Evita duplicados, permite cliente sin email, diferente abogados mismo email OK.
- **Client → Case:** SÍ, `lawyer_cases` envuelve `booking_id`/`quote_request_id` + `client_id`, con `UNIQUE booking_id` y RLS cross-tenant. Creación manual y automática desde solicitud funciona.
- **Case → Booking:** **PARCIAL** — el modelo soporta **1 booking por caso** (`lawyer_cases.booking_id` UNIQUE partial), no `1 caso → N citas`. No hay tabla `case_bookings` ni `lawyer_cases` → `bookings` array. Un caso no puede tener explícitamente Cita 1, 2, 3.
- **Client History:** PARCIAL — `ClientDetailPage` muestra casos y bookings donde `client_id = lawyer_clients.id` (SaaS) pero no muestra `service_quote_requests` ni `payments` directamente.
- **Case History:** PARCIAL — `CaseDetailPage` muestra cliente, booking origen, descripción, estado, fechas, pero no lista citas múltiples ni ingresos relacionados.
- **Bookings/Calendar:** SÍ para `LAWYER_DIRECT` via `bookings` (migrado en 1B.2, RLS `INSERT source='LAWYER_DIRECT'`), `CitasPage` ya usa `bookings` como fuente, no `appointments`. Legacy `appointments` (6 rows) queda huérfano.
- **Revenue:** SÍ, `EarningsPage` ahora usa `payments.lawyer_amount` (fix 1B.2), pero trazabilidad `cliente→caso→ingreso` no es explícita (ingreso solo en `Earnings`, no en `Client`/`Case`).
- **Marketplace → SaaS:** SÍ, `POST /api/bookings/create` (service_role, `source=UNKNOWN`) → `bookings` → `RequestsPage` → `lawyer_clients/cases` → `bookings LAWYER_DIRECT` → `payments` → `Dashboard Hoy` — flujo no roto (smoke 200, `source UNKNOWN`).
- **RLS:** SÍ, `lawyer_clients`/`cases`/`bookings LAWYER_DIRECT` con `USING auth.uid()=lawyer_id` y `WITH CHECK EXISTS` para `client_id`/`booking_id` — cross-tenant bloqueado (5+8 tests RLS `403`/`409`).

**Gap más importante (P1):** Un caso no puede gestionar múltiples citas explícitamente. Para un asunto real con 3 audiencias, el abogado hoy debe crear 3 `bookings` con `client_id` igual pero sin vínculo `case_id`, o 1 caso con 1 booking y el resto huérfanos. Esto rompe "Caso → Cita" como 1:N.

**No hay P0 blocker que impida operar un asunto simple de 1 cita.** El MVP `Solicitud → Cliente → Caso (1 booking) → Ingreso` ya es end-to-end.

---

## 2. Current Architecture

```
lawyer (profiles.id = auth.uid())
├── lawyer_clients (id, lawyer_id, email NULL, name, phone, source, first_booking_id, notes)
│   └── UNIQUE (lawyer_id, lower(btrim(email))) WHERE email IS NOT NULL
├── lawyer_cases (id, lawyer_id, client_id FK lawyer_clients, booking_id FK bookings UNIQUE, quote_request_id, title, status 7, source, ai_workspace_id, price_clp)
│   └── UNIQUE (booking_id) WHERE NOT NULL, UNIQUE (quote_request_id) WHERE NOT NULL
├── bookings (id, lawyer_id, user_name/email/phone, service_title, price, status, booking_type appointment/service, scheduled_date/time, duration, source UNKNOWN/LAWYER_DIRECT, client_id FK lawyer_clients, booking_range tsrange, exclusion no_overlapping_bookings)
│   └── shared Marketplace (service_role, POST /api/bookings/create) + SaaS (authenticated, source LAWYER_DIRECT)
├── service_quote_requests (id, lawyer_id, user_name/email, service_title, description, status pending/quoted/paid/cancelled/expired, quoted_price)
├── appointments (id, lawyer_id, user_id, appointment_date/time, duration, status, type, legacy 6 rows) — compatibility-read
├── payments (id, lawyer_id, user_id, amount, lawyer_amount, platform_fee, status, payout_status, appointment_id, service_description)
│   └── lawyer_amount is revenue
├── lawyer_services, profiles, notifications, page_views, etc.
└── ai_* (ai_workspaces, ai_documents, ai_case_workflow_items) — not used in core flow
```

**Decisiones Fase 1A/1B.1/1B.2 respetadas:** `bookings` source of truth para citas, `lawyer_clients` private, `lawyer_cases` wrap, tenant = lawyer, Supabase RLS direct + server for money, `bookings` shared, `LAWYER_DIRECT` semantics, `appointments` legacy, subscriptions deferred.

---

## 3. Request → Client Audit

**Fuentes:**

- `bookings` — `src/hooks/useRequests.ts:38` `select * from bookings where lawyer_id = auth.uid() limit 50`, mapeo `RequestItem` `booking-${id}` con `user_name/email/phone`, `service_title`, `status`, `source`, `scheduled_date/time`.
- `service_quote_requests` — `useRequests.ts:40` `select * where lawyer_id=auth.uid()`, mapping `quote-${id}`, `price=quoted_price`, `source='LEGALUP_MARKETPLACE'`.

**Tipos:** `booking` (appointment vs service via `booking_type`) y `quote` (service_quote_requests). No hay `consultations` como request en este flujo.

**Identificación cliente:** `RequestsPage.tsx:44` `findOrCreateClient({name: req.clientName, email: req.clientEmail, phone: req.clientPhone, source: req.source})` — `src/hooks/useLawyerClients.ts:94` `findOrCreateClient` normaliza via `src/lib/normalizeEmail.ts:1` `trim+lower, ''→null`, checks `findByNormalizedEmail` (JS `clients` array) + DB `ilike` fallback, else `createClient`.

**Duplicados:** `lawyer_clients` `UNIQUE (lawyer_id, lower(btrim(email))) WHERE email IS NOT NULL` (`20260904150000:38`), `useLawyerClients.ts:60` pre-check + `23505` handling, `phase1B1.test.ts` 8 tests including `Same lawyer cannot create duplicate normalized email → 409`, `Different lawyers same email → 2 rows`.

**Sin email:** `email text NULL` (`20260904150000:13` corrigió `NOT NULL`), `NULL`→`null` via `lawyer_clients_normalize_email` trigger `nullif(btrim)` (`:18`), `WHERE email IS NOT NULL` evita colisión de `NULL`s — `src/__tests__/lawyerClients.test.ts` null/''/'   '→null.

**Repetidas:** Si misma solicitud reprocesada, `RequestsPage:75` `select id from lawyer_cases where lawyer_id=auth.uid() and booking_id=rawId maybeSingle()` — si existe, reuse `caseId`, no crea nuevo caso. `lawyer_cases` `UNIQUE booking_id` también previene duplicado (`409`).

**Marcado procesado:** `RequestsPage:54-59` `UPDATE bookings SET client_id=client.id` + `if (req.status==='pending') UPDATE bookings SET status='confirmed' WHERE status='pending'` — usa existente `status` enum (`pending`→`confirmed`), no nuevo enum. UI no filtra procesadas por `status` (still shows), but `confirmed` vs `pending` distinguishes. **Existe parcialmente** — no hay `processed` boolean, but status change works. **Gap P1:** UI still shows processed as `pending` until refetch, and `useRequests` does not hide processed (shows all 50). Could filter `status='pending'` only for inbox.

**Estados:** `bookings.status` `pending`, `confirmed`, `in_progress`, `completed`, `cancelled` + `pending_payment`; `service_quote_requests.status` `pending`, `quoted`, `paid`, `cancelled`, `expired`. `RequestsPage:16` `statusColor` handles.

**Veredicto:**

- **Existe:** SÍ — `RequestsPage` + `useRequests` + `lawyer_clients` dedupe.
- **Correcta:** SÍ — normalización, reuse, `NULL` handling.
- **Fuente correcta:** SÍ — `bookings` + `service_quote_requests`.
- **RLS:** SÍ — `lawyer_clients` `USING auth.uid()=lawyer_id`, `RequestsPage` `findOrCreateClient` uses `auth.uid()` not input.
- **UX suficiente:** Sí, con `Procesar solicitud` → `lawyer_clients` → `lawyer_cases` → navigate.
- **Trazabilidad:** SÍ — `lawyer_clients.first_booking_id` + `lawyer_cases.booking_id` + `bookings.client_id`.
- **End-to-end:** SÍ — cualquier `pending` booking/quote puede convertirse sin duplicado.
- **Falta:** Inbox muestra también `confirmed`/`paid` (debería filtrar solo `pending` para "por procesar"), y `service_quote_requests` pending not marked `confirmed` (only `bookings`).

---

## 4. Client → Case Audit

**Páginas:**

- `ClientsPage.tsx` — list `lawyer_clients` where `lawyer_id`, search client-side `includes`, create Dialog `name/email/phone` → `createClient` (dedupe).
- `ClientDetailPage.tsx` — `useLawyerClient` single `eq('id', clientId).eq('lawyer_id', user.id)`, edit/delete, shows `lawyer_cases where client_id=clientId` + `bookings where client_id=clientId` (via `supabase.from('lawyer_cases/bookings').eq('client_id', clientId).eq('lawyer_id', user.id)` `ClientDetailPage:40`).
- `CasesPage.tsx` — list `lawyer_cases` where `lawyer_id`, search title/client, filter `status`, create Dialog `title/client_id/description` → `createCase`.
- `CaseDetailPage.tsx` — `useLawyerCase` single `eq('id', caseId).eq('lawyer_id', user.id)` with joins `client:lawyer_clients` + `booking:bookings`, edit `title/description/status/client_id`, delete, link to client.

**Relación:**

- `lawyer_cases.client_id` `FK lawyer_clients(id) ON DELETE SET NULL` (`20260904150000:78`), `NULL` allowed (manual case without client).
- `lawyer_cases.client_id` optional — `CasesPage` create allows `none`, `CaseDetailPage` Select `none`.
- `lawyer_clients` → `lawyer_cases` 1:N (one client many cases) — `ClientDetailPage` shows list, `CasesPage` shows `client.name` link.
- `lawyer_cases` → `lawyer_clients` N:1 — `CaseDetailPage` shows `client` join, can change `client_id`.

**Creación:**

- Manual: `CasesPage:56` `createCase({title, client_id, source:'LAWYER_DIRECT'})`.
- Automática: `RequestsPage:62` `casePayload` with `client_id` from `findOrCreateClient`, `booking_id`/`quote_request_id`, `source`, `status`.

**Ownership/RLS:**

- `lawyer_clients` RLS `USING auth.uid()=lawyer_id` (4 policies `20260904150000:69`), `lawyer_cases` RLS `USING auth.uid()=lawyer_id` + `WITH CHECK EXISTS` for `client_id`/`booking_id` (`20260904150000:174`).
- `useLawyerClients.ts:126` `updateClient` `eq('id', id)` without `eq('lawyer_id')` but RLS `USING` ensures only own rows update (0 rows if not owner, not error). Same for `useLawyerCases:94` `eq('id', id)` — RLS protects.
- `CaseDetailPage` `useLawyerCase` adds `eq('lawyer_id', user.id)` explicitly — defense in depth.

**Edición/Eliminación:**

- `updateClient`/`deleteClient`/`updateCase`/`deleteCase` all `eq('id', id)` + RLS — `phase1B1.test.ts` `Lawyer A cannot update B client → 0 rows`, `lawyer_id takeover blocked`.

**Estados:**

- `lawyer_cases.status` 7 `CHECK` (`new`, `quoted`, `paid`, `in_progress`, `delivered`, `closed`, `cancelled`) (`20260904150000:94`), `CasesPage` filter and `CaseDetailPage` Select show all, `statusColors` + `statusLabels` Spanish (`Nuevo`, `Cotizado`, etc.) — correct.

**Historial:**

- `ClientDetailPage` shows `lawyer_cases` + `bookings` where `client_id`, but not `service_quote_requests` or `payments` directly.
- `CaseDetailPage` shows `client` + `booking` (single), but not `bookings` list for case.

**Veredicto:**

- **Existe:** SÍ — both directions.
- **Correcta:** SÍ — dedupe, ownership checks.
- **Fuente correcta:** SÍ — `lawyer_clients` + `lawyer_cases` with FKs.
- **RLS:** SÍ — 8 tests `phase1B1` + `rls` 5 passed.
- **UX suficiente:** SÍ — list, detail, create, edit, delete, link.
- **Trazabilidad:** SÍ — `client.first_booking_id`, `case.client_id`/`booking_id`/`quote_request_id`, `booking.client_id`.
- **Falta:** `ClientDetailPage` does not show `service_quote_requests` history, nor `payments` for that client; `CaseDetailPage` does not show multiple bookings for same case.

---

## 5. Case → Booking Audit

**Modelo:**

- `lawyer_cases.booking_id` `UUID REFERENCES bookings(id) ON DELETE SET NULL` (`20260904150000:78`), `UNIQUE (booking_id) WHERE NOT NULL` (`:102`), `CHECK single_source` (`:94` `booking_id XOR quote_request_id`).

**Uso:**

- `RequestsPage:72` `casePayload.booking_id = rawId` when `kind==='booking'`, else `quote_request_id`.
- `CaseDetailPage:129` `select booking:bookings(id,user_name,service_title,price,status,scheduled_date,scheduled_time)` — shows single booking origin.
- `CitasPage` `bookings` with `client_id` — not `case_id`; no `bookings.case_id` column exists.

**1:N vs 1:1:**

- Current: `lawyer_cases` → `bookings` is **1:1** (or 0:1) because `booking_id` is single FK with UNIQUE. A case cannot have `Cita 1,2,3` explicitly. **Does NOT support `Caso { Cita 1, Cita 2, Cita 3 }`.**
- Workaround today: lawyer creates 3 `bookings` with same `client_id` (not `case_id`), then `ClientDetailPage` shows 3 bookings for that client, but `CaseDetailPage` only shows 1 `booking` (the origin). No explicit `case → bookings` 1:N.
- **Exists:** Exist for 1, not for N.
- **Correcta:** For 1, yes; for N, no.
- **RLS:** `lawyer_cases` `WITH CHECK EXISTS bookings where lawyer_id=auth.uid()` ensures own booking, but no check for N.
- **UX:** `CaseDetailPage` shows single `booking` card, `CitasPage` shows bookings without case link, `CasesPage` shows `booking.service_title` but not count.
- **Falta:** Explicit 1:N, e.g., `bookings.case_id` FK or `case_bookings` join table, or `lawyer_cases` → `bookings` via `client_id` indirect.

**Navegación:**

- `Case → Cita`: `CaseDetailPage` shows single `booking`, no list, no `Ver agenda` for case's bookings.
- `Cita → Case`: `CitasPage` shows bookings without case link, no `Ver caso`.

**Veredicto: PARCIAL — P1 gap.**

---

## 6. Client History Audit

**Ruta:** `/lawyer/clients/:clientId` (`ClientDetailPage.tsx`)

**Muestra:**

- **Existe:** `client` info (name, email, phone, source, notes, created_at) — `ClientDetailPage:92` Card `Ficha`.
- **Existe:** `lawyer_cases where client_id=clientId` (list, link to `/lawyer/cases/:id`, `ClientDetailPage:40`).
- **Existe:** `bookings where client_id=clientId` (list, `ClientDetailPage:41` `select ... where client_id`).
- **Existe parcialmente:** No `service_quote_requests` where `user_email` matches client email (would need email join, not `client_id`).
- **No existe:** `payments` for that client (no `payments.client_id` for bookings service? `payments` has `appointment_id`, `user_id`, `lawyer_id`, but not `client_id`; would need `payments.booking_id` → `bookings.client_id` join, not done).
- **No existe:** Timeline/communications.

**Veredicto: PARCIAL — suficiente para operativo (cliente + casos + citas vinculadas via `client_id`), pero ingresos del cliente no visible (must go to `Earnings`).**

---

## 7. Case History Audit

**Ruta:** `/lawyer/cases/:caseId` (`CaseDetailPage.tsx`)

**Muestra:**

- **Existe:** `client` via `client:lawyer_clients` join (`CaseDetailPage:129`), `booking` origin via `booking:bookings` join, `title`, `description`, `status` (Spanish labels), `source`, `price_clp`, `currency`, `created_at`, `updated_at`, `practice_area`.
- **Existe parcialmente:** `client` link to `/lawyer/clients/:client_id`, `booking` card with `user_name, service_title, status`, but not `scheduled_date/time` formatted as in `CitasPage`.
- **No existe:** List of all `bookings` for this `client_id` or `case_id` (only single `booking_id`), no `payments` for this case (no `payments.case_id` or `booking_id` → `payments.booking_id` not in schema; `payments` has `appointment_id`/`booking_id`? Actually `payments` `types: payments` has `appointment_id`, not `booking_id` — gap), no `service_quote_requests` history, no timeline.

**Veredicto: PARCIAL — SÍ muestra cliente + solicitud origen + estado + fechas, NO muestra citas múltiples ni ingresos del caso.**

---

## 8. Booking / Calendar Audit

**Fuente canónica:** `bookings` — **NO `appointments`**.

- `CitasPage.tsx` now `fetchAppointments` does `select from bookings where lawyer_id=auth.uid() and booking_type='appointment' and status!='cancelled' order scheduled_date/time` (`CitasPage:180`), not `appointments`. `appointments` legacy (6 rows) still exists in DB but not read.
- **Crear:** `handleNewAppointment` `findOrCreateClient` + `insert bookings {lawyer_id: auth.uid(), source:'LAWYER_DIRECT', client_id, scheduled_date/time, duration, price:0, status:'confirmed', service_title, client_id}` (`CitasPage:90`), RLS `INSERT TO authenticated WITH CHECK source='LAWYER_DIRECT' AND lawyer_id=auth.uid()` (`20260905000000_bookings_lawyer_direct_rls.sql:14`) — now allowed (previously 403, fixed in 1B.2).
- **Editar:** `handleUpdateAppointment` `UPDATE bookings SET user_name/email/phone, scheduled_date/time, duration, service_title WHERE id=bookingId AND lawyer_id=auth.uid()` (`CitasPage:148`).
- **Cancelar:** `confirmDeleteAppointment` `UPDATE bookings SET status='cancelled' WHERE id AND lawyer_id` (`CitasPage:66`), not `DELETE`.
- **Cliente asociado:** `findOrCreateClient` ensures `lawyer_clients`, `client_id` set, `source LAWYER_DIRECT`.
- **Caso asociado:** **No** — `CitasPage` does not associate `case_id` when creating booking (no `case_id` column in `bookings`; would need `bookings.case_id` or `lawyer_cases` → `bookings` 1:N). Currently `bookings` has `client_id` but no `case_id`.
- **Servicio, fecha, hora, duración, precio, estado, source:** `service_title`, `scheduled_date/time`, `duration`, `price` (0 for direct), `status` (`confirmed`/`cancelled`), `source` (`LAWYER_DIRECT` vs `UNKNOWN` for Marketplace). `CitasPage` shows `Hour` range, `Videollamada` hardcoded `type: video`.
- **Distinguir:** `source` column exists (`20260904150000:94`), `CitasPage` stores `LAWYER_DIRECT`, Marketplace `UNKNOWN` — but `CitasPage` UI does not show `source` badge (unlike `RequestsPage`).

**Veredicto: SÍ para CRUD via `bookings` LAWYER_DIRECT, NO para `case` association (gap P1).**

---

## 9. Revenue Audit

**Fuente:** `payments` (`supabase/migrations/20240927020000_create_payments_tables.sql`, `20241125_platform_settings_and_payouts.sql`).

- **Cálculo:** `EarningsPage.tsx` now `select lawyer_amount, payout_status, service_description` `eq('lawyer_id', user.id)` (`EarningsPage:89`), `realAmount = lawyer_amount ?? amount`, `displayStatus` from `payout_status`/`status`, `filter realAmount !=0`, `reduce` for `total/completed/pending` — **uses `lawyer_amount`**, not `booking.price`, mocks removed (`generateMockTransactions` deleted).
- **Qué pago pertenece a qué booking:** `payments` has `appointment_id` (FK `appointments`), `booking_id`? Not in `types: payments` Row (`appointment_id`, `consultation_id`, but no `booking_id`). `EarningsPage` joins `appointments` via `appointment_id` → `client` (`EarningsPage:114`), but for `bookings` service, `appointment_id` is null, so `clientName` fallback to `service_description`. **Not direct `booking_id` → `payments` link for service bookings.**
- **Cliente:** `EarningsPage` `clientName` from `appointments.client` or `service_description`, not from `lawyer_clients`.
- **Caso:** No `payments.case_id` or `payments.booking_id` → `lawyer_cases` link, so `CaseDetailPage` cannot show ingresos.
- **Dónde aparece:** Only `EarningsPage` (`/lawyer/earnings`), not in `ClientDetailPage` nor `CaseDetailPage`.
- **Estados:** `payments.status` `completed`/`pending` + `payout_status` `pending`/`paid` (mapped to `completed`/`pending`), `refunded`/`failed` possible but not in `lawyer_cases` enum.
- **No modificación flujo:** `server.mjs` `POST /create-payment` `POST /api/bookings/create` → `booking_paid` → `payments` unchanged (audit only).

**Veredicto: SÍ calcula ingreso real via `lawyer_amount` with RLS `auth.uid()=lawyer_id`, but trazabilidad `Cliente/Caso → Ingreso` is **NO** — gap P1.**

---

## 10. Marketplace → SaaS Audit

**Flujo conceptual:**

```
Cliente Marketplace
  → POST https://uplegal-service.onrender.com/api/bookings/create
    {lawyer_id, user_name/email/phone, price, booking_type service/appointment, service_title, service_id (UUID), duration, scheduled_date/time}
    (NO AUTH, service_role, supabase.from('bookings').insert)
  → bookings {id, lawyer_id, user_email, status pending, source UNKNOWN (DEFAULT), client_id null, booking_range tsrange, no_overlapping_bookings}
  → payment (if service) → POST /create-payment → payments {lawyer_amount, status, appointment_id?} → webhook → booking_paid → payout
  → abogado
    → /lawyer/requests (useRequests: bookings + service_quote_requests where lawyer_id=auth.uid())
    → findOrCreateClient (lawyer_clients)
    → lawyer_cases (booking_id, client_id)
    → /lawyer/citas (bookings LAWYER_DIRECT)
    → /lawyer/earnings (payments.lawyer_amount)
```

**Dónde se pierde información:**

- `bookings.client_id` is `null` initially (Marketplace does not know `lawyer_clients` id), only filled after `RequestsPage` `UPDATE bookings SET client_id`. Before that, `ClientDetailPage` cannot show Marketplace bookings for that client via `client_id` join (must fallback to `user_email`).
- `bookings.source` is `UNKNOWN` for Marketplace (not `LEGALUP_MARKETPLACE`), so `CitasPage` query `eq('booking_type','appointment')` includes Marketplace appointments, but `source` not used to filter.
- `bookings.user_id` is `null` for guest (Marketplace allows `user_id: null`, `user_email` required), so `lawyer_clients` cannot FK to `profiles` (hence `lawyer_clients` is private, not `profiles`).
- `bookings.user_email` is denormalized, not normalized `lower(btrim)`, so `findOrCreateClient` must normalize.
- `payments.booking_id` not in `types` (only `appointment_id`), so `bookings` → `payments` join is via `appointments` for appointment type, but for `service` type, `payments` may have `appointment_id = null` and rely on `metadata`? Actually `EarningsPage` joins `appointments` only, so service payments without `appointment_id` show as `Cliente`/`Consulta` fallback.
- `bookings.booking_type` `appointment` vs `service` determines if `scheduled_date/time` present.

**Veredicto: Flujo no roto, but `client_id`/`source` initially null/UNKNOWN, and `payments` link to `bookings` for service is weak (needs `payments.booking_id` or `metadata`).**

---

## 11. Legacy appointments Audit

**Quién lee:**

- `src/pages/lawyer/CitasPage.tsx` — **no longer** (now `bookings`), but `59` line `CitasPage` old version did.
- `src/pages/lawyer/DashboardPage.tsx:234` `supabase.from('appointments').select('*').eq('lawyer_id', user.id)` (5 rows) — **still reads** `appointments` for `appointments` count (today) and `activities` (recent appointments). **Inconsistency: Dashboard counts `appointments` but Citas shows `bookings`.**
- `src/pages/lawyer/EarningsPage.tsx:114` `appointments` join for `client` — still.
- `src/pages/admin/analytics.tsx:500` `supabase.from('appointments').select(count)` + `bookings` count — both.
- `src/components/ScheduleModal.tsx:739` `from('appointments')` — still.
- `src/lib/api.ts:149` `from('appointments')` — still.
- `src/pages/UserDashboard.tsx:278` `appointments` — client dashboard.
- `src/pages/admin/lawyer-profiles.tsx:68` `lawyer_services` not appointments.

**Quién escribe:**

- `CitasPage` **no longer** writes `appointments` (now `bookings`), but old code did `from('appointments').insert`.
- `ScheduleModal.tsx` still `from('appointments').insert` (line 739).
- `src/lib/api.ts` still `appointments`.

**Riesgo inconsistencias:**

- `appointments` 6 rows vs `bookings` 9 rows (plus new `LAWYER_DIRECT`), dashboard counts `appointments` but calendar shows `bookings` → numbers differ.
- `EarningsPage` joins `appointments` for service payments → may miss `bookings` service payments.
- `admin/analytics` double counts.

**Veredicto: LEGACY DEPENDENCIES remain, documented, not migrated. Risk: dashboard `todayAppointments` counts `appointments` not `bookings` → 0 even if `bookings` has today.**

---

## 12. RLS / Security Audit

**Policies:**

- `lawyer_clients` (`20260904150000:69`) — 4 policies `USING/WITH CHECK auth.uid()=lawyer_id` — `SELECT/INSERT/UPDATE/DELETE` — `lawyer_id` takeover blocked via `WITH CHECK`.
- `lawyer_cases` (`20260904150000:174`) — 4 policies `USING auth.uid()=lawyer_id` + `WITH CHECK EXISTS` for `client_id`/`booking_id` — blocks cross-tenant `client_B`/`booking_B`, `lawyer_id` takeover blocked.
- `bookings` — `20260905000000` adds `INSERT TO authenticated WITH CHECK source='LAWYER_DIRECT' AND client_id valid` + `UPDATE TO authenticated USING auth.uid()=lawyer_id WITH CHECK` — `SELECT` policy already existed (lawyer can view own, via `useLawyerJobs`), `service_role` bypass preserves Marketplace `POST /api/bookings/create` with `source=UNKNOWN`.
- `payments` — `USING auth.uid()=lawyer_id OR user_id` (`2024092702:31`), not mod. `rls.test.ts` `A cannot read B payments` → 0 rows (verified via `eq('lawyer_id', bId)` as A).
- `service_quote_requests` — RLS unknown (no `ENABLE ROW` in `migrations/*` grep), but `QuoteRequestsPage:59` `eq('lawyer_id', user.id)` + RLS `USING auth.uid()=lawyer_id` assumed; if missing, would be `P0` but `useRequests` works (so RLS likely exists or is permissive). Document as unknown.
- `booking_leads` — RLS unknown.

**Cross-tenant checks (tests):**

- `Lawyer A cannot read B client` → `SELECT where lawyer_id=B` as A → 0 rows (`rls.test.ts` 5 passed, `phase1B1` 8 passed).
- `A cannot INSERT for B` → `INSERT lawyer_id=B` as A → `403 violates row-level security` (`phase1B2` 6 passed).
- `A cannot attach B booking` → `INSERT lawyer_cases booking_id=B` as A → `403` (verified `phase1B2`).
- `A cannot update B` → `UPDATE lawyer_clients SET lawyer_id=B` → 0 rows / `PATCH 403`.

**Veredicto: RLS correct for `lawyer_clients`/`cases`/`bookings LAWYER_DIRECT`, Marketplace `service_role` bypass intact, no `service_role` from browser.**

---

## 13. UX End-to-End Audit

**Navigation:**

- `DashboardLayout.tsx` grouped `LEGALUP | CAPTACIÓN (Solicitudes, Trabajos) | GESTIÓN (Clientes, Casos, Citas, Ingresos) | HERRAMIENTAS (LegalUpAI) | PERFIL (Perfil, Servicios, Notificaciones) | CUENTA (Config Pagos)` — single flow, no Marketplace/SaaS split, `Trabajos` kept but overlapping (audit earlier). `Favoritos` removed from lawyer (commit `926779e`).

**Flow:**

- `Solicitudes` (`/lawyer/requests`) → `Procesar solicitud` button → `findOrCreateClient` → `lawyer_cases` → `navigate /lawyer/cases/:caseId` — **can reach Client/Case easy**.
- `Client` (`/lawyer/clients` → `/:clientId`) → shows `Cases` list (link to `/lawyer/cases/:id`) + `Bookings` list (where `client_id`), but no `link to Appointments` explicitly (bookings shown as list, not agenda link).
- `Case` (`/lawyer/cases` → `/:caseId`) → shows `client` link (`/lawyer/clients/:clientId`) + single `booking` card, but not `appointments` list, not `Revenue`.
- `Cita` (`/lawyer/citas`) → day view, `bookings` only, no `case` link.
- `Ingreso` (`/lawyer/earnings`) → `payments.lawyer_amount` list, no link back to `case`/`client`.

**Context loss:**

- `Requests` → `Client` → `Case` is one-way, but `Case` → `Cita` is only via `client_id` indirect, not explicit.
- `Cita` → `Case` missing.
- `Case` → `Revenue` missing.
- `Client` → `Revenue` missing.

**Veredicto: Navigation exists for each step, but cross-links `Case ↔ Cita ↔ Ingreso` are weak, requiring manual search.**

---

## 14. LegalUpAI Relationship Audit

- `lawyer_cases.ai_workspace_id` `UUID REFERENCES ai_workspaces(id) ON DELETE SET NULL` (`20260904150000:107`), `NULL` allowed, no RLS change for `ai_*`.
- `ai_workspaces` etc. RLS `USING auth.uid()=lawyer_id` (`60803*`), `ai_case_workflow_items` etc.
- `CaseDetailPage` does not show AI link, `AICaseDetail` is separate `/lawyer/ai/cases/:caseId` (not linked from `lawyer_cases`).
- **Conceptually:** `lawyer_cases` could open `ai_workspace` for that case (1:1), isolation `lawyer_id` same, so `lawyer_cases.ai_workspace_id` correctly links.
- **Useful but not indispensable** for `Solicitud→Ingreso` MVP — **DEFER**.

---

## 15. Gaps

### Gap: Case cannot have multiple bookings (1:N)
- **Evidence:** `lawyer_cases.booking_id` `UNIQUE WHERE NOT NULL` (`20260904150000:102`), `CaseDetailPage` shows single `booking`, `CitasPage` has no `case_id` field.
- **Impact:** P1 — a case with 3 hearings cannot be modeled as `Caso {Cita1,2,3}`; workaround is 3 bookings with same `client_id` but no case linkage.

### Gap: Client history missing payments and quote requests
- **Evidence:** `ClientDetailPage:40` `select from lawyer_cases/bookings where client_id`, no `service_quote_requests` nor `payments`.
- **Impact:** P1 — lawyer cannot see total revenue per client without going to `Earnings`.

### Gap: Case history missing bookings list and revenue
- **Evidence:** `CaseDetailPage:129` only `booking:bookings` single, no `select from bookings where client_id = case.client_id` or `case_id`.
- **Impact:** P1 — case view incomplete.

### Gap: Cita → Caso navigation missing
- **Evidence:** `CitasPage` shows `bookings` without `case` link, `CaseDetailPage` shows single booking, no `Ver todas las citas del caso`.
- **Impact:** P1 — breaks `Case ↔ Cita` flow.

### Gap: Revenue not linked to Case/Client in UI
- **Evidence:** `EarningsPage` shows `payments` list with `service_description` fallback, not `lawyer_cases` join.
- **Impact:** P1 — `Caso → Ingreso` not visible.

### Gap: Request inbox shows all bookings, not just pending, and no hiding of processed
- **Evidence:** `useRequests.ts:38` `select * limit 50` without `status` filter for `pending`, `RequestsPage` `filtered` no hide where `lawyer_cases` exists, `handleProcess` updates `bookings.status` to `confirmed` only for `pending` but `useRequests` still shows `confirmed`.
- **Impact:** P2 — inbox noisy.

### Gap: Dashboard Hoy uses `bookings` for pending/today but `lawyer_cases` for active, yet `Citas` today count in `DashboardPage` still uses `appointments` (old) for `todayAppointments` (line 372) — inconsistency.
- **Evidence:** `DashboardPage.tsx:372` `from('appointments').select('date, scheduled_time')` vs `HoySection` `from('bookings')`.
- **Impact:** P2 — dashboard `Citas del Día` (old) vs `HoySection` `Citas hoy` may differ.

### Gap: Legacy `appointments` still read in `DashboardPage`, `EarningsPage`, `admin/analytics`, `ScheduleModal`, `api.ts`
- **Evidence:** `grep -r "from.*appointments"` shows 5 files.
- **Impact:** P2 — bloat, double counting.

---

## 16. P0 / P1 / P2 / DEFER

**P0 — BLOCKER (impide operar asunto real):** *None* — single-appointment case end-to-end works.

**P1 — IMPORTANTE (funciona pero incompleto/confuso):**
- Case 1:N bookings (gap above)
- Client → payments history missing
- Case → bookings list + revenue missing
- Cita → Caso link missing
- Request inbox filtering (hide processed)
- EarningsPage fallback for `bookings` service payments without `appointment_id` (client name)

**P2 — MEJORA (puede esperar):**
- Dashboard `appointments` vs `bookings` inconsistency
- Legacy `appointments` dependencies
- `service_quote_requests` history in `ClientDetailPage`
- Request → Case auto `status` mapping (currently `new`/`paid` heuristic)
- `source` badge translation in `RequestsPage` (currently raw `UNKNOWN`)

**DEFER:**
- `CRM avanzado`, `pipeline visual`, `automatizaciones`, `email/WhatsApp`, `facturación electrónica`, `document management`, `firma electrónica`, `multiusuario`, `organizaciones`, `reporting avanzado`, `IA nueva`, `chat interno`, `tasks`/`Kanban`, `subscriptions`, `Google Calendar sync` (beyond `GoogleCalendarConnect`).

---

## 17. Recommended MVP

**MVP operativo mínimo para cobrar:**

```
Solicitud (bookings + service_quote_requests, pending)
  → Cliente (lawyer_clients, dedupe email)
    → Caso (lawyer_cases, client_id, booking_id UNIQUE for 1, status new..)
      → Cita (bookings LAWYER_DIRECT, client_id, scheduled_date/time, source LAWYER_DIRECT)
        → Ingreso (payments.lawyer_amount, where lawyer_id, linked via booking/client)
```

Already works for 1 cita/caso. To make it truly “gestión de práctica” (not just leads), add **1C.1** (Case 1:N bookings) before pilot pricing.

---

## 18. Fase 1C Implementation Plan

**Max 3–5 blocks, based on gaps:**

### 1C.1 — Case ↔ Booking 1:N (P1)
- **Goal:** Un caso puede tener múltiples citas.
- **DB:** `ALTER TABLE bookings ADD COLUMN case_id UUID REFERENCES lawyer_cases(id) ON DELETE SET NULL; CREATE INDEX idx_bookings_case_id WHERE case_id IS NOT NULL;` + RLS `INSERT/UPDATE WITH CHECK case_id EXISTS where lawyer_id=auth.uid()` (similar to `client_id`).
- **Hooks:** `useLawyerCases` add `bookings` relation, `useRequests` no change, `CitasPage` add `case_id` Select when creating (optional, from `lawyer_cases` where `client_id` same).
- **Pages:** `CaseDetailPage` show `bookings where case_id = caseId` list + `Crear cita para este caso` button; `CitasPage` show `case` badge + link to `/lawyer/cases/:caseId`.
- **Tests:** `A cannot attach B case_id`, `case can have 3 bookings`, `B cannot read A case bookings`.

### 1C.2 — Client/Case Operational Timeline (P1)
- **Goal:** `ClientDetailPage` and `CaseDetailPage` show full history.
- **Client:** Add `service_quote_requests` where `user_email = client.email` (via email, not `client_id`) + `payments` where `lawyer_id` and `booking_id` in `bookings where client_id` (join via `bookings`).
- **Case:** Add `bookings where case_id` list + `payments` where `booking_id` in that list (sum `lawyer_amount` for case revenue).
- **No new tables.**

### 1C.3 — Navigation & Status Polish (P2)
- **Goal:** End-to-end navigation without context loss, and hide processed requests.
- **Requests:** Filter `useRequests` to `status='pending'` for inbox, or add `is_processed` derived `EXISTS lawyer_cases where booking_id` and show `Procesado` badge, hide from `Hoy` pending count handled already.
- **Dashboard:** Fix `DashboardPage` `todayAppointments` to use `bookings` not `appointments` (already `HoySection` does, but old `fetchCounters` still uses `appointments`).
- **Earnings:** Show `case` link in `EarningsPage` where `payments` → `bookings` → `lawyer_cases`.

### 1C.4 — QA / Security / Regression (P1)
- **Goal:** No P0 remains.
- **Tests:** Add `bookings case_id` RLS tests, `client history` integration, `case history` integration.
- **Regression:** `POST /api/bookings/create` still `source UNKNOWN`, `client_id null`, `booking_range` exclusion still works, `Marketplace` → `Requests` → `Client` → `Case` → `Cita` → `Earnings` manual smoke.

**No 1C.5 needed unless `appointments` migration decided (defer).**

---

## 19. Acceptance Criteria

```
AC-01: Una solicitud de Marketplace (bookings pending + service_quote_requests pending) puede convertirse en cliente (lawyer_clients) sin duplicado (lower(btrim) + 409) — verified phase1B1 8 tests.
AC-02: El cliente puede tener uno o más casos (lawyer_cases where client_id) — verified ClientDetailPage shows list.
AC-03: Un caso puede tener sus citas asociadas — CURRENTLY FAILS for N>1 (only 1 via booking_id UNIQUE) — must pass after 1C.1 (bookings.case_id).
AC-04: El abogado puede visualizar el historial del caso (cliente, solicitud origen, descripción, estado, citas, booking, fechas) — PARTIAL (single booking, not list) — must pass after 1C.2.
AC-05: Los ingresos pueden rastrearse hasta el booking correspondiente — PARTIAL (EarningsPage shows payments.lawyer_amount but no case/client link) — must pass after 1C.2 (payments → bookings → case).
AC-06: Lawyer A no puede acceder a datos de Lawyer B — verified RLS 5+8 tests 403/0 rows.
AC-07: El flujo Marketplace existente sigue funcionando (POST /api/bookings/create 200, source UNKNOWN) — verified smoke 200.
AC-08: No se utiliza appointments como source of truth — verified CitasPage now bookings, but DashboardPage still counts appointments — PARTIAL, must pass after 1C.3 (fix DashboardPage).
AC-09: Client history shows all related bookings/cases (1C.2).
AC-10: Case history shows all related bookings + revenue (1C.2).
```

---

## 20. Risks

- **Adding `bookings.case_id` requires new RLS `WITH CHECK EXISTS lawyer_cases where lawyer_id=auth.uid()` — risk of blocking `LAWYER_DIRECT` insert if `case_id` invalid, but safe as `client_id` pattern.
- **1:N without `bookings.case_id` workaround via `client_id` indirect (bookings where client_id = case.client_id) is not explicit — risk of showing unrelated bookings for same client but different case.
- **Not migrating `appointments` leaves Dashboard `todayAppointments` inconsistent with `bookings` — risk of pilot confusion (0 vs 2).
- **No `payments.booking_id` direct FK for service bookings — revenue trace via `bookings where client_id` + `payments where lawyer_id` + date is heuristic, not FK.

---

## 21. Decisions Required

1. **Should `bookings` gain `case_id` FK?** Yes for 1C.1 — explicit 1:N. Alternative is `lawyer_cases` keep single `booking_id` and rely on `client_id` indirect, but explicit is cleaner.
2. **Should `ClientDetailPage` show `service_quote_requests` history via `user_email`?** Yes for 1C.2 — email join, not `client_id`.
3. **Should `EarningsPage` show `case` link?** Yes for 1C.2 — via `bookings.case_id` after 1C.1.
4. **Should `appointments` be deprecated in Dashboard `fetchCounters`?** Yes — change to `bookings` for `todayAppointments`.

---

## 22. Final Recommendation

**Producto no está listo para cobrar, pero sí para piloto con 1 cita por caso.**

- **SÍ puede:** `Solicitud → Cliente (dedupe) → Caso (1 booking) → Cita (LAWYER_DIRECT) → Ingreso (lawyer_amount)` — flujo simple end-to-end ya funciona, RLS intacto, Marketplace no roto, build/tests PASS.
- **NO puede aún:** `Caso → N citas` explícito, `Cliente/Caso → Ingresos` trazable, `Cita → Caso` navegación, `Dashboard` Hoy `Citas del Día` (old) vs `bookings` (new) consistente.

**Recomendación:** Implementar **Fase 1C.1 (Case 1:N)** + **1C.2 (Client/Case history)** + **1C.3 (Navigation polish)** antes de intentar cobrar. Son 3 bloques, ~1 semana, 1 migration (`bookings.case_id`), no new tables, no `appointments` migration, no AI, no billing.

**Si solo se hace 1C.1, el piloto con 3 citas por caso será confuso.** Si se hace todo 1C, el piloto podrá validar `Solicitud → Ingreso` con trazabilidad completa.

