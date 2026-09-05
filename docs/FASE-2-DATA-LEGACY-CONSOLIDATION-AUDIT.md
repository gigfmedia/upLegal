# FASE 2 — Data & Legacy Consolidation Audit

**Modo:** PLAN ONLY — NO CODE CHANGE  
**Fecha:** 2026-09-05  
**Alcance:** Post Fases 1A, 1B.1, 1B.2, 1C, 1D  
**Repo:** `upLegal` — branch `main` commit `e4bcc0d`

---

## 1. Executive Summary

LegalUp posee hoy **dos universos canónicos coexistiendo**:

- **SaaS nuevo (2026-09):** `profiles.id=auth.uid()` como tenant, `lawyer_clients` → `lawyer_cases` → `bookings (LAWYER_DIRECT, client_id, case_id)` con RLS propietario. Correcto, reciente, con tests.
- **Marketplace/Legacy (2024-2025):** `bookings (UNKNOWN)` + webhook `server.mjs` + `appointments` espejo + `service_quote_requests` vía Edge Functions + `payments.appointment_id`.

No hay pérdida de datos inminente. El riesgo principal es **doble verdad silenciosa**: `bookings` es canónico declarado para citas, pero `appointments` sigue siendo escrito por el webhook y leído por `EarningsPage`, `lib/api.ts`, y functions; `service_quote_requests` sigue separado de `bookings` sin `client_id`/`case_id` directo; `payments` aún apunta a `appointments.id`, no a `bookings.id`, rompiendo `payment → booking → case → client`. Analytics y Dashboard ya usan `bookings`, por lo que **el funnel Marketplace no se rompe**, pero revenue y reportes muestran ingresos paginados distinto según la vista.

**Veredicto:** No consolidar por estética ahora. Prioridad real es cerrar **RLS faltante** (`service_quote_requests`, `appointments`, `lawyer_services`), documentar `payments.booking_id` gap como P0, y luego decidir si `appointments` se depreca vía *dual-write stop* + *view* + *backfill* antes de eliminar.

| Prioridad | Área |
|-----------|------|
| **P0** | `payments.booking_id` FK faltante + RLS faltante (`service_quote_requests`, `appointments`, `lawyer_services`, `booking_leads/payment_events`) |
| **P1** | `appointments` deprecación segura — dual-write y Dashboard/Earnings unificación; `service_quote_requests` normalización a `lawyer_cases`/`bookings` |
| **P2** | `consultations`/`services`/`lawyers` limpieza, estados unificados, duplicación display-field |
| **P3** | Tipos `supabase.ts` WARN inbucket + drift `booking_range/case_id` |

**Qué NO tocar:** `server.mjs POST /api/bookings/create` + webhook MP (`service_role`), `platform_settings`/`payout_logs`, flujo `service_quote_requests` Edge Functions vigentes, RLS existente sin migración.

---

## 2. Current Architecture

**Tenant:** `profiles.id = profiles.user_id = auth.users.id = auth.uid()` — sin organizaciones (`20260904150000:2-126`). `lawyer_clients.lawyer_id`, `lawyer_cases.lawyer_id`, `bookings.lawyer_id` referencian esa identidad. No multiusuario en MVP.

**SaaS sources:** `lawyer_clients` (dedup email lower/trim unique partial `20260904150000:59-61`), `lawyer_cases` (envelope sobre `booking_id` xor `quote_request_id`, `20260904150000:131-147` + `bookings.case_id` 1:N `20260906000000:13`), `bookings` con `source LAWYER_DIRECT/LEGALUP_MARKETPLACE/UNKNOWN` + `client_id, case_id`. `lawyer_services` para catálogo.

**Marketplace:** `POST /api/bookings/create` público (`server.mjs:1202 NO AUTH`) con `service_role` (`server.mjs:302`) crea `bookings status pending UNKNOWN`, luego `payment_events started` + `booking_leads` + MP preference `external_reference=booking.id` → webhook `POST /api/mercadopago/webhook` verifica HMAC (`server.mjs:2314 timingSafeEqual`), idempotencia `payment_events_success_payment_once` + `UPDATE bookings SET status confirmed WHERE payment_id IS NULL`, inserta `payment_events success`, crea `appointments` espejo si `requires_meeting`, `sendGA4PurchaseEvent`, Meet `profiles.meet_link` → `payments` (vía `rpc create_payment_secure`).

**Pagos:** `payments` escribe vía `rpc create_payment_secure SECURITY DEFINER` (`server.mjs:1053`) y webhook; `payments.appointment_id` FK a `appointments`, sin `booking_id`. `payout_logs`/`platform_settings` para liquidación semanal.

**Requests:** `service_quote_requests` creado solo por Edge Function `service-quote-request` (`supabase/functions/service-quote-request/index.ts:69 service_role`), leído por `useLawyerJobs`/`useRequests` junto a `bookings`, procesado en `RequestsPage:68-122` creando `lawyer_clients` + `lawyer_cases`.

**Citas:** Declarado canónico `bookings` (`booking_type=appointment`, `CitasPage:222-225`), pero webhook sigue escribiendo `appointments` (`server.mjs:2747`).

**Diagrama actual vs objetivo:**
```
Actual:  profiles ─┬─ lawyer_clients ─┐
                   ├─ bookings(UNKNOWN) ─ appointments ─ payments (appointment_id)
                   ├─ bookings(LAWYER_DIRECT) ─ lawyer_clients/bookings.case_id ─ lawyer_cases
                   ├─ service_quote_requests ──┐ (sin FK client)
                   └─ lawyer_cases ── booking_id / quote_request_id (XOR)
Objetivo: profiles → lawyer_clients → lawyer_cases → bookings (client_id, case_id) ← payments.booking_id
```

---

## 3. Table Inventory

Inventario basado en `src/types/supabase.ts:42-3663` (62 tablas) + `supabase/migrations` + grep. Solo tablas SaaS/Marketplace relevantes.

| Tabla | Propósito | Quién la usa (evidencia) | Fuente actual | Legacy? | RLS | Riesgo |
|-------|-----------|--------------------------|---------------|---------|-----|--------|
| `profiles` | Usuario/abogado, tenant `id=user_id=auth.uid()` | Todo: `useProfile.ts:198`, `server.mjs:1316`, `AuthContext` | **Canónica** | No | `ENABLE RLS 20240926220000:2` — `SELECT USING true` (public) + `UPDATE/INSERT USING auth.uid()=id/user_id` (`20240927000100:11,18,26`) — OK | Bajo |
| `lawyer_clients` | Cliente SaaS deduplicado | `useLawyerClients:34`, `CitasPage:129`, `RequestsPage:68`, `ClientDetailPage:55` | **Canónica** | No | `ENABLE RLS 20260904150000:70` — owner `auth.uid()=lawyer_id` + unique lower(trim) | Bajo |
| `lawyer_cases` | Caso/envelope (booking o quote) | `useLawyerCases:43`, `RequestsPage:96`, `CaseDetailPage:85` | **Canónica** | No | `ENABLE RLS 20260904150000:175` + `EXISTS client/booking owned` | Bajo |
| `bookings` | Cita SaaS+Marketplace, 1:N hacia cases | `server.mjs:1364`, `CitasPage:146,222`, `DashboardPage:68,69,74`, `useLawyerJobs:58` | **Canónica declarada** | No (coexiste `appointments`) | `ENABLE RLS 20260905000000:7` — solo INSERT/UPDATE `LAWYER_DIRECT` + check `client/case owned` (`20260906000000:27`); **sin SELECT policy** | Medio — marketplace bypass `service_role`, SELECT implícito permisivo |
| `appointments` | Cita legacy (unitime, Google Meet) | `EarningsPage:92`, `lib/api.ts:149`, `server.mjs:2753 webhook`, `ScheduleModal:739` | **Legacy activa** (dual-write) | Sí — debería ser DEPRECATE | **No ENABLE** — 0 policies | Alto — sin aislamiento DB |
| `service_quote_requests` | Solicitud presupuesto (service) | `useLawyerJobs:64`, `useRequests:40`, `QuoteRequestsPage:60`, Edge Functions `service-quote-request, send-service-quote, mercado-pago-webhook` | **Semicanónica** (entidad negocio distinta) | No (vigente) | **No ENABLE** — 0 policies | **P0** — cualquier authenticated podría leer |
| `payments` | Cobro MP, `lawyer_amount`, `payout_status` | `server.mjs:1053 rpc`, `EarningsPage:63`, `DashboardPage:71`, `admin FunnelDashboard` | **Legacy FK** | Migrar a `booking_id` | `ENABLE RLS 20240927020000:28` — solo SELECT `lawyer_id/user_id`; sin INSERT/WITH CHECK, depende `SECURITY DEFINER` | Medio — escribe sin RLS, `lawyer_id nullable` |
| `payment_events` | Idempotencia webhook `payment_id→booking` | `server.mjs:1375,2710`, `FunnelDashboard` | Canónica tracking | No | **No ENABLE** | Medio |
| `booking_leads` | Lead Marketplace | `server.mjs:1439` | Tracking | No | **No ENABLE** | Bajo |
| `lawyer_services` | Catálogo servicios abogado | `useProfile:149`, `ServicesPage`, `DashboardPage:73` | **Canónica** | No | **No ENABLE** | Alto si falta RLS |
| `consultations` | Consulta free/paid legacy | `ConsultasPage:44`, `netlify/create-payment:216` | **Legacy** | Sí | **No ENABLE** | Bajo — lectura escasa |
| `services` / `legal_services` | Catálogos genéricos | `types` tríple — `lawyers` (rut,full_name) también | **Legacy names** | Sí | No | P2 |
| `payout_logs` | Liquidación semanal | `process-weekly-payouts:180` | Canónica | No | `ENABLE RLS 20241125150000:119` — admin/service_role only | OK pero lawyer no puede ver propio |
| `platform_settings` | Fees 10% surcharge/20% platform | `server.mjs:991` | Canónica | No | `ENABLE RLS 20241125150000:40` — `SELECT USING true` + admin write | OK |
| `ai_workspaces/docs/research` | IA | `2026080*` | Canónica | No | Owner RLS | Bajo |
| `chat_events` / `page_views` | Analytics anon | `20260812000000:38 service_role_full_access` | Canónica | No | `service_role` only | OK |

**62 tablas totales** (`types:42`); solo 3 SaaS nuevas RLS completas. Migraciones futuras 2026x fuera de orden cronológico, 2 `remote_placeholder` vacíos, `20241007200000`+`20241007200100` duplicado `ratings`.

---

## 4. appointments Audit

### 4.1 Matriz completa

| Archivo | Operación | Propósito | ¿Reemplazable por bookings? |
|---------|-----------|-----------|-----------------------------|
| `server.mjs:2753,2766,2887,2898,3012` | `INSERT appointments` + `UPDATE appointments meet_link/meet_status` | Webhook crea espejo `status pending_meet_link→confirmed` tras `bookings` pago `requires_meeting!=false`; luego `create-google-meeting` actualiza `meet_link` | **Sí** — bookings ya tiene `scheduled_date/time/duration/requires_meeting`; espejo puede dejar de escribirse |
| `server.mjs:3382,3392,7157` | `SELECT appointments` | Admin `appointmentsWithoutPayments` y reconcile; legacy consults `paid confirmed is(amount null)` | Sí con `bookings` + `payments.booking_id` |
| `src/pages/lawyer/EarningsPage.tsx:92,108` | `SELECT * FROM appointments WHERE id IN (payments.appointment_id)` + `client:profiles!appointments_client_id_fkey` | Enriquecer `payments` (nombre cliente/servicio) | **Sí** — debería ser `SELECT bookings JOIN payments.booking_id` |
| `src/lib/api.ts:149,158,166,172,178` | `getAppointments`, `getAppointmentById`, `updateAppointment`, `deleteAppointment` | CRUD legacy expuesto a frontend | Deprecar — `CitasPage` ya migrado a bookings |
| `src/components/ScheduleModal.tsx:739,888` | `INSERT appointments` (`:739`) + `SELECT appointments` | Modal calendario legacy (comentario `Changed from consultations to appointments`) | Migrar a `bookings` (CAELanding usa bookings) |
| `src/pages/UserDashboard.tsx:278,383` | `SELECT appointments WHERE user_id` | Dashboard cliente (historial) | Sí — `bookings WHERE user_id` |
| `src/pages/ReviewPage.tsx:57, PublicProfile:475, LawyerReviewsSection:118` | `SELECT appointments` review eligibility | Verifica cliente tuvo cita | Sí — bookings |
| `src/pages/admin/analytics.tsx:305,500-503,558,604-606` | `SELECT count(*) FROM appointments` (total, 30d, today, by status) | Analytics dual | Consolidar a `bookings` |
| `supabase/functions/create-google-meeting/index.ts:28,81,226` | `SELECT/UPDATE appointments` | Meet generation `meet_link` idempotency | Sí — `bookings` tiene `meet_link`? No, actualmente bookings no tiene `meet_link`; `appointments` sí (`types:780 meet_link`). Necesita migrar `meet_link` a bookings o mantener appointments como `meet_store` |
| `supabase/functions/request-review:35, send-real-review:32, send-manual-review:37, get-google-busy-slots:23, delete-user-admin:92, netlify/create-payment:226` | `SELECT/DELETE appointments` | Auxiliares | Reemplazable |
| `docs/FASE-1C:272` | Auditoría confirma `DashboardPage` no lee appointments, pero `ScheduleModal/lib/api/EarningsPage` sí | Inconsistencia documentada | — |

### 4.2 Preguntas clave

1. **¿Quién lee?** `EarningsPage`, `lib/api`, `ScheduleModal`, `UserDashboard`, reviews, admin, 5 Edge Functions, `server.mjs`.
2. **¿Quién escribe?** `ScheduleModal INSERT`, `lib/api INSERT/UPDATE/DELETE`, webhook `INSERT/UPDATE` (`server.mjs:2753,2887`), `create-google-meeting UPDATE`.
3. **¿Flujo activo dependiente?** Sí — **webhook sin bookings escribe appointments** — si se deja de escribir, `create-google-meeting` perdería `meet_link` store y `EarningsPage` quedaría vacío hasta migrar `payments` a `booking_id`. Por eso dual-write aún vigente.
4. **¿Admin depende?** Sí — `admin/analytics` y `admin/payments` (`server.mjs:7156-7171`) anti-join `appointmentsWithoutPayments`.
5. **¿Analytics depende?** Parcial — `admin/analytics:500-503` dual count; PostHog no, GA4 no.
6. **¿Datos únicos allí?** No únicos — `appointments.appointment_date/time/duration/meet_link` existe en `bookings.scheduled_date/time/duration/requires_meeting` excepto `meet_link` (no columna en bookings). `meet_link` hoy vive en ambos (`profiles.meet_link` fallback + `appointments.meet_link`).
7. **¿Relaciones no representables en bookings?** Solo `meet_link` falta en `bookings` si se quiere eliminar `appointments` totalmente; o mantener `appointments` como store exclusivo de Meet.
8. **¿Si se deja de escribir?** Webhook seguiría marcando `bookings confirmed` pero no crearía `appointments`; `EarningsPage` no mostraría pagos (depende `appointment_id`), Google Meet no se persistiría vía `appointments`.
9. **¿Si se deja de leer?** Dashboard ya no lee (`bookings` only) — sin impacto; Earnings/Admin sí se romperían hasta migrar.
10. **¿Deprecated?** Sí — marcar `DEPRECATE` (no MIGRATE aún).
11. **¿Eliminable eventualmente?** Sí, tras: (a) migrar `payments.appointment_id→booking_id`, (b) mover `meet_link` a `bookings` o `bookings_meet`, (c) migrar Earnings/Admin a `bookings`, (d) backfill histórico 6 filas + dual-write off.

---

## 5. bookings Audit

### Marketplace
- `POST /api/bookings/create` (`server.mjs:1203` PUBLIC, `service_role` `302`) — valida `lawyer_id,user_email,user_name,price` (`:1239`), `booking_type service` vs `appointment` (`:1226`), anti double-booking (`:1275 SELECT pending/confirmed overlap`), inserta `status pending UNKNOWN` (`:1364`), `payment_events started` (`:1374`), `booking_leads` (`:1439`), MP preference `external_reference=booking.id` (`:1494`), PostHog `booking_created` (`:1551`). Reads públicas `GET /api/bookings/:id` (`:1620 service_role`, sin `lawyer_id` check — UUID entropy).
- Webhook `POST /api/mercadopago/webhook` (`:2264` HMAC `x-signature` `2314`, idempotencia `payment_events` + `UPDATE bookings SET status confirmed WHERE payment_id IS NULL` `:2463`) → PostHog `booking_paid` (`:2497`), `appointments` espejo (`:2750`), GA4, Meet, emails. Reconcile `POST /api/mercadopago/reconcile/:paymentId` (`:3270` secret).
- `source` CHECK `LAWYER_DIRECT/LEGALUP_MARKETPLACE/UNKNOWN` (`20260904150000:100`) pero marketplace escribe `UNKNOWN` (DEFAULT) — `phase1B1.test:146` confirma — vs `LEGALUP_MARKETPLACE` nunca escrito; `Dashboard`/`Requests` fallback asume marketplace.

### SaaS
- `CitasPage:100,146,194,222-225` — `INSERT/UPDATE/SELECT bookings WHERE lawyer_id, booking_type appointment, client_id, case_id, source LAWYER_DIRECT` (`:146 price 0 status confirmed`).
- `RequestsPage:78-81` — `UPDATE bookings SET client_id, status confirmed WHERE lawyer_id, status pending` tras `findOrCreateClient`.
- `DashboardPage:68,69,74,75` — KPIs `pending/pending_payment`, `todayCount booking_type appointment scheduled_date=todayStr`, `nextAppointments gte today`.
- `useLawyerJobs:58,181,188,214` / `useRequests:39` / `CaseDetailPage:85` / `ClientDetailPage:55` — lecturas `lawyer_id` scoped, `client_id`/`case_id` FK, `bookings_case_id_fkey` join (`useLawyerCases:43`).
- `lib/demoData:31` / `activationAnalytics:60` — demo y tracking `source LAWYER_DIRECT`.

### Otros
- `admin FunnelDashboard:131,142,165` / `admin analytics:298` — `SELECT bookings` funnel sanity `leads>=bookings>=payments`.
- Traducción estados: `pending, pending_payment, confirmed, in_progress, completed, cancelled, payment_status approved/paid`.

**¿Puede ser única fuente?** Sí para citas SaaS+Marketplace **si** se añade `meet_link` (o se mantiene `profiles.meet_link` como origen) y se cierra `payments.booking_id`. Conflictos actuales: `bookings.price` puede ser 0 para `LAWYER_DIRECT` (Citas) vs `lawyer_amount` en `payments`; `scheduled_date/time` nullable para `service` vs required para `appointment`; `user_email/user_name` snapshot vs `lawyer_clients` canonical — snapshot es legítimo histórico (no deduplicar).

---

## 6. service_quote_requests Audit

**Schema `types:3366-3441`:** `lawyer_id FK profiles.user_id`, `service_id/title, user_id/email/name/phone, description, status DEFAULT pending (pending/quoted/paid/cancelled/expired), quoted_price/quote_notes/quoted_at, mercadopago_preference_id/payment_link/payment_status/payment_id/paid_at`.

**Quién crea:** Solo Edge Function `supabase/functions/service-quote-request/index.ts:69-83 service_role INSERT status pending` (`POST /functions/v1/service-quote-request`) — no `supabase.from().insert` en hooks.

**Quién lee:** `useLawyerJobs:65`, `useRequests:40` (`Promise.all bookings + quotes WHERE lawyer_id LIMIT50` swallow missing table), `QuoteRequestsPage:60`, Edge Functions `mercado-pago-webhook:60`, `send-service-quote:110`.

**Quién procesa:** `QuoteRequestsPage:115 POST /functions/v1/send-service-quote {quoted_price}` → `send-service-quote:98-208 auth.getUser(jwt) verify lawyer_id==user.id && status pending, create MP preference external_reference=quote.id, UPDATE status quoted` (admin service_role). `mercado-pago-webhook:68 UPDATE status paid WHERE id=external_reference`. `RequestsPage:94-122 findOrCreateClient + INSERT lawyer_cases {client_id, quote_request_id, source}` — no actualiza `service_quote_requests` (deja pending si no quoted), deja status inconsistente documentado `FASE-1B2:185`.

**Relaciones:**
- `lawyer_clients`: **Sin FK** — heuristic `findOrCreateClient lower(trim(email))` unique (`20260904150000:59`) → `lawyer_cases.client_id`. `ClientDetailPage:55` solo `bookings WHERE client_id` — quotes vía `user_email` no mostrados (`FASE-1C:180` deferred).
- `lawyer_cases`: `quote_request_id UUID` conditional FK (`20260904150000:211-222 IF EXISTS service_quote_requests THEN ADD CONSTRAINT`), `CHECK booking_id XOR quote_request_id <=1`, unique partial (`:160`).
- `bookings`: **Sin FK directa** — `useLawyerJobs:188 INSERT bookings price 0 in_progress` al hacer `startWork` sobre quote crea booking desconectado sin `quote_request_id` link; `RequestsPage` mantiene separados.

**Heurísticas explícitas — riesgo:** `lower(btrim(email))` + `ilike email` (`useLawyerClients:105`) y `GlobalSearch ILIKE bookings.user_name` (`:38`) — único `findOrCreateClient` es canonical, no substring; `service_quote_requests.user_email → lawyer_clients.email` join propuesto pero no implementado (`FASE-1C:442`), por lo que historia cliente incompleta y `useLawyerJobs clientId = booking.user_id` (auth id) vs `lawyer_clients.id` mismatch.

**¿Mantener como entidad?** Sí — `service_quote_requests` es **solicitud comercial distinta a cita** (cotización → paid → `in_progress→completed`), con MP flow propio (`payment_link` + webhook Deno separado `mercado-pago-webhook` vs `server.mjs` webhook para bookings — dual webhook split-brain `R1`).

---

## 7. Client → Case → Booking Model

**Objetivo:** `LAWYER → CLIENT → CASE → BOOKING` (+ `REQUEST → CLIENT/CASE`).

| Relación | FK real | RLS validado | Heurística | Riesgo |
|----------|---------|--------------|------------|--------|
| `lawyer_clients.lawyer_id → profiles.id` | Sí `FK 20260904150000:22` | `USING auth.uid()=lawyer_id` `73,78,83,89` | No | Bajo |
| `lawyer_cases.lawyer_id → profiles.id` | Sí `20260904150000:139` | `USING auth.uid()=lawyer_id` + `EXISTS client/booking owned 186-189` | No | Bajo |
| `lawyer_cases.client_id → lawyer_clients.id` | Sí `20260904150000:133` | `EXISTS lawyer_clients WHERE lawyer_id=auth.uid()` `187` | No — email dedup vía unique partial | Bajo |
| `lawyer_cases.booking_id → bookings.id` | Sí `20260904150000:131` unique partial `157` | `EXISTS bookings WHERE lawyer_id=auth.uid()` `188` | No | Bajo |
| `lawyer_cases.quote_request_id → service_quote_requests.id` | **Condicional** `20260904150000:211 IF EXISTS` `ON DELETE SET NULL`, unique partial `160` | No `EXISTS` check para quote (solo booking/client) | Sí — indirecta | Medio |
| `bookings.lawyer_id → profiles.user_id` | Sí `types:1092` | `USING auth.uid()=lawyer_id` para `LAWYER_DIRECT` (`20260906000000:27`); marketplace bypass `service_role` | No | Medio — SELECT sin policy |
| `bookings.client_id → lawyer_clients.id` | Sí `FK SET NULL 20260904150000:109` | `WITH CHECK EXISTS lawyer_clients owned 31-32` | Heurística previa `findOrCreateClient email` | Medio — NULL hasta `RequestsPage` procesa |
| `bookings.case_id → lawyer_cases.id` | Sí `FK SET NULL 20260906000000:13` partial index `idx_bookings_case_id:19` | `EXISTS lawyer_cases owned 33` | No | Bajo — nuevo, correcto |
| `service_quote_requests.lawyer_id → profiles.user_id` | Sí `types:3430` | **No** — 0 policies | Heurística `user_email` a `lawyer_clients` | **P0** |
| `payments.appointment_id → appointments.id` | Sí `types:2921` | `auth.uid()==lawyer_id` SELECT only | Legacy | Alto — no `booking_id` |
| `payments.lawyer_id → profiles.id` | Sí nullable `types:2942` | `auth.uid()==lawyer_id` | Nulo si histórico | Medio |

**Modelo real hoy:** 1:N casual vía `bookings.case_id` (desde `1C.1`) + 1:1 legacy `lawyer_cases.booking_id`; `service_quote_requests` en paralelo sin `client_id`; `bookings` espejo `appointments` para Meet/pagos.

---

## 8. Ownership / Tenant Isolation

| Tabla | `lawyer_id` directo | Depende indirecto | Policies | `service_role` | Clasificación |
|-------|---------------------|-------------------|----------|----------------|---------------|
| `lawyer_clients` | Sí | — | `ENABLE RLS:70` 4 policies owner | No | **PASS** |
| `lawyer_cases` | Sí + `client_id/booking_id EXiSTS` | `lawyer_clients`, `bookings` | `ENABLE RLS:175` 4 policies con cross-check | No | **PASS** |
| `bookings` | Sí | `lawyer_clients/cases` via `WITH CHECK` | `ENABLE RLS:7` INSERT/UPDATE `LAWYER_DIRECT` only; **sin SELECT**; marketplace `service_role` bypass `server.mjs:302` | Sí (`server.mjs`) | **PASS WITH GAP** — SELECT permisivo, marketplace intencional |
| `payments` | Sí nullable | `appointments` | `ENABLE RLS:28` SELECT `user_id`/`lawyer_id`/`admin` — sin INSERT/WITH CHECK | `rpc create_payment_secure SECURITY DEFINER` | **PASS WITH GAP** |
| `lawyer_services` | `lawyer_user_id` (no `lawyer_id`) | — | **No ENABLE** (grep 0) — app filter `eq lawyer_user_id` `useProfile:149` | No | **RISK** — sin BD aislamiento |
| `service_quote_requests` | Sí | — | **No ENABLE** | `service_role` Edge Functions | **RISK** |
| `appointments` | `lawyer_id` semántico | — | **No ENABLE** | `service_role` webhook | **RISK** |
| `booking_leads` | `lawyer_id` | `bookings` | **No ENABLE** | `service_role` | **RISK** |
| `payment_events` | `metadata.lawyer_id` | `bookings` | **No ENABLE** | `service_role` | **RISK** |
| `profiles` | `id=user_id=auth.uid()` | — | `ENABLE RLS:2` public read `USING true` + owner write | No | **PASS** |
| `payout_logs` | `lawyer_user_id` | `payments` | `ENABLE RLS:119` admin/service_role only — **lawyer no ve propio** | `auth.role()=service_role` | **PASS WITH GAP** |
| `favorites`, `notifications`, `ai_*` | Sí | — | Owner RLS | No | **PASS** |

**Cross-tenant potencial:** `service_quote_requests` sin RLS → `authenticated` podría `SELECT * WHERE lawyer_id=otro`. `appointments`/`lawyer_services` idem. `bookings` SELECT sin policy podría permitir `SELECT *` si anon key (mitigado porque frontend siempre filtra `eq lawyer_id`, pero DB no bloquea). `payments` con `lawyer_id NULL` bypass owner check.

---

## 9. Payments Traceability

**Flujo actual:**
```
POST /api/bookings/create → supabase rpc create_payment_secure → INSERT payments {lawyer_id, amount=platform_fee+lawyer_amount, status pending, metadata appointment_id}
  ↓ webhook POST /api/mercadopago/webhook → GET MP /v1/payments → external_reference=bookingId → UPDATE bookings status confirmed payment_status approved
  ↓ INSERT payment_events success {metadata {payment_id, booking_id, lawyer_id}} + UPDATE payments status + INSERT appointments if requires_meeting
  ↓ GET /api/bookings/:id (service_role) → BookingSuccessPage
```

**Puede trazarse `payment→booking→case→client`?** **No de forma segura.**

- `payments` **no tiene** `booking_id` (`types:2840` solo `appointment_id/consultation_id`) — gap P0. Webhook guarda `payment_events.metadata.booking_id` (`server.mjs:1380,2710`) y `payments.metadata.appointment_id` (`server.mjs:1041`) — JSON no FK.
- `bookings` tiene `payment_id:text` (`types:998`) sin FK a `payments.id` y `payment_status`, pero no inverso.
- `lawyer_cases.booking_id` + `bookings.case_id` resuelven `booking→case` (1:N nuevo), y `bookings.client_id`→`lawyer_clients` resuelve `case→client` (vía `lawyer_cases.client_id` cross-checked). Sin `payments.booking_id`, `EarningsPage:82` debe hacer `JOIN payments.appointment_id → appointments` y `appointmentsMap`, no `bookings`, por lo que revenue SaaS `LAWYER_DIRECT` (price 0) no aparece.
- `FunnelDashboard:170` reconoce `"payment_events no guarda lawyer_user_id, atribución requiere join manual"` — actualmente `admin FunnelDashboard:165-176` hace agregación `lawyer_id→bookings count` y `payments/bookings*100` heurístico, no FK join.
- Reconcile `POST /api/mercadopago/reconcile/:paymentId` (`server.mjs:3270`) repite `UPDATE bookings` por `external_reference`, pero tampoco vincula `payments`.

**Riesgos futuros:** Reporte ingresos por cliente/caso heurístico `user_email` match; `payout_logs.payment_ids TEXT[]` (`20241125150000:104`) sin FK garantiza que un payout podría incluir pagos de otro lawyer sin DB constraint.

**Propuesta no implementada:** `ALTER TABLE payments ADD COLUMN booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL` + `UPDATE payments SET booking_id = (SELECT id FROM bookings WHERE bookings.payment_id = payments... or external_reference)` + backfill `metadata.appointment_id` → deprecate `appointment_id`.

---

## 10. Dashboard Data Sources

**Archivo:** `src/pages/lawyer/DashboardPage.tsx:59-106,169-214,246-279`.

| Widget | Fuente | Query (`lawyer_id=auth.uid()`) | ¿Legacy? | Inconsistencia |
|--------|--------|--------------------------------|----------|----------------|
| Solicitudes pendientes | `bookings` `status IN (pending,pending_payment)` `:68` | Correcto SaaS | No | **Falta `service_quote_requests pending`** — `DashboardPage:88` sólo `bookingsForAttention` (`bookings status pending`) → abogado ve `0 solicitudes` aunque tenga quotes pendientes (documentado `FASE-1B2:184`). `RequestsPage` sí une ambas. |
| Citas hoy | `bookings` `booking_type=appointment scheduled_date=todayStr neq cancelled` `:69` | SaaS | No | `OnboardingCard:27` cuenta solo `bookings source LAWYER_DIRECT`; Dashboard cuenta `LAWYER_DIRECT+UNKNOWN` — discrepancia menor. `todayStr = new Date().toISOString().slice(0,10)` UTC, no `America/Santiago`. |
| Casos activos | `lawyer_cases` `NOT IN (delivered,closed,cancelled)` `:70` | Canónico | No | — |
| Ingresos mes | `payments` `eq lawyer_id gte created_at startOfMonth` `SUM lawyer_amount` `:71,81` | Legacy join | **Sí** | No filtra `status`/`payout_status`; incluye `pending` → sobrestima vs `EarningsPage` que mapea `status`/`payout_status`. Ignora `bookings.price` (SaaS 0). |
| Próximas citas | `bookings booking_type appointment gte todayStr order date/time LIMIT3` `:74` | Canónico | No | — |
| Atención | `bookings status pending LIMIT1` `:75` | Canónico | No | No prioriza quotes. |
| Stats clientes/servicios | `lawyer_clients head:72`, `lawyer_services eq lawyer_user_id:73` | Canónico | No | `lawyer_services` usa `lawyer_user_id` vs `bookings.lawyer_id=user_id` — naming drift. |
| Actividades recientes | `payments?` no, solo `bookings` | — | — | No usa `appointments`. |

**FASE-1C:272,380** confirmó que `DashboardPage` ya no lee `appointments`, pero `EarningsPage` sí, y `DashboardPage:372` viejo leía `appointments` — corregido. Queda brecha `Requiere tu atención` y revenue.

---

## 11. Hooks

| Hook | Tablas | Mezcla | Join manual | RLS | Deduplicación | Riesgo |
|------|--------|--------|-------------|-----|---------------|--------|
| `useLawyerJobs.ts:58-223` | `bookings` (`booking_type service`) + `service_quote_requests` `Promise.all eq lawyer_id` | Sí — merge `LawyerJob[]` orden `createdAt DESC` | No SQL join, app merge | `eq lawyer_id` app filter, RLS falta para quotes | No dedup `lawyer_cases` | Duplicado quote+booking desconectado (`price 0`), estados desalineados (`payment_status` vs `quote status`) |
| `useLawyerClients.ts:34-178` | `lawyer_clients` | No | `findByNormalizedEmail lower(trim)` + `23505` catch (`80`) | `eq lawyer_id` + RLS owner | Sí — unique partial `lower(btrim(email))` | Bajo |
| `useLawyerCases.ts:43-145` | `lawyer_cases` + `lawyer_clients` + `bookings` via PostgREST FK `lawyer_cases_booking_id_fkey` | Sí — `select *, client:lawyer_clients, booking:bookings!...` | FK real | `eq lawyer_id` + `EXISTS` cross-check | Unique `booking_id`/`quote_request_id` | Bajo |
| `useProfile.ts:149,198,322` | `profiles` + `lawyer_services` | No | `features` string→array split `\n` | `eq user_id/lawyer_user_id` (services sin RLS) | Handle `education` JSON string | Medio — `lawyer_services` sin RLS |
| `useRequests.ts:40-86` | `bookings` + `service_quote_requests` `LIMIT50` | Sí — `RequestItem kind booking/quote` (`:56`) | No join, `source LEGALUP_MARKETPLACE` hardcode para quotes | `eq lawyer_id` | Swallow `Could not find table` (`:42`) | `inbox pending` no incluye `client_id` link para quotes |
| `usePayments.ts:11` | `payments` | No | — | `eq lawyer_id` | — | — |

---

## 12. Páginas y Componentes Legacy

| Componente | Dependencia legacy | Riesgo | Reemplazable | Prioridad |
|------------|--------------------|--------|--------------|-----------|
| `EarningsPage.tsx:92,108` | `appointments` para `clientName/service` desde `payments.appointment_id` | Alto — ingresos SaaS invisibles | `bookings` via `payments.booking_id` (P0) | **P1** |
| `lib/api.ts:149` `getAppointments*` | CRUD `appointments` | Medio | `bookings` | P1 |
| `ScheduleModal.tsx:739` | `INSERT appointments` | Medio | `bookings` (`CitasPage` ya) | P1 |
| `UserDashboard.tsx:278,383` | `appointments WHERE user_id` historial cliente | Bajo | `bookings WHERE user_id` | P2 |
| `ConsultasPage.tsx:44,114` | `consultations` | Bajo | Eliminar | P2 |
| `PublicProfile:475, ReviewPage:57, LawyerReviewsSection:118, request-review functions` | `appointments` para review eligibility | Medio | `bookings completed` | P2 |
| `JobsPage.tsx:22` (via `useLawyerJobs`) | `service_quote_requests` separado de `bookings` | Medio | `lawyer_cases` envelope | P1 |
| `QuoteRequestsPage:60` | `service_quote_requests` unitario | Bajo | Mantener (entidad negocio) | KEEP |
| `CitasPage.tsx` | **Migrado** `bookings` desde 1B.2 | — | Canónico | KEEP |
| `RequestsPage.tsx` | Fusiona ambos (dual read) | Medio | `lawyer_cases` | KEEP |

---

## 13. Estados

| Entidad | Estados observados (grep + migrations) | Equivalencia semántica | Inconsistencia |
|---------|----------------------------------------|------------------------|----------------|
| `bookings` | `pending`, `pending_payment` (Dashboard `IN`), `confirmed` (webhook/Requests), `cancelled`, `in_progress`, `completed` (`useLawyerJobs:79-92 mapping pago`), `payment_status approved/paid/pending` | `pending≅pending_payment`, `confirmed≅paid` (Jobs mapea `confirmed+approved/paid → paid`) | `pending_payment` nunca escrito por server (solo leído); `in_progress/completed` solo para `service` type, no `appointment` |
| `appointments` | `pending_meet_link`, `confirmed`, `pending`, `confirmed`, `cancelled`, `completed`, `schedule` → `success/fallback` meet | `pending_meet_link` semántico no existe en bookings (bookings usa `pending` + `payment_status`) | Divergencia Meet: `appointments.meet_status pending/success/fallback` (`:2819`) vs `bookings.requires_meeting bool` |
| `service_quote_requests` | `pending, quoted/quote_sent, paid, cancelled, expired` (`QuoteRequestsPage:25`, `useLawyerJobs:118`) | `quoted≅quote_sent` alias | `quoted` vs UI `quote_sent` naming drift; `expired` nunca seteado por cron observado |
| `lawyer_cases` | `new, quoted, paid, in_progress, delivered, closed, cancelled` (`20260904150000:137` CHECK) + UI `new/paid→new` | `new` absorbe `quoted/paid` inicial (`RequestsPage:92`) | `delivered/closed` no mapeado en Dashboard `NOT IN` vs `bookings completed` — potencial desalineación cierre |
| `payments` | `status pending`, `payout_status pending/succeeded/failed` (`20241125150000:82`) | — | `payments.status` no matchea `bookings.status` |
| `companies` etc | `company_requests` `pending/paid/in_progress` | Similar | No impacto MVP |

**Propuesta futura (no implementar):** Unificar `bookings.status` enum CHECK `pending, pending_payment, confirmed, in_progress, completed, cancelled` + `service_quote_requests` `pending, quoted, paid, expired, cancelled` separados; `lawyer_cases` `new→quoted→paid→in_progress→delivered→closed/cancelled`.

---

## 14. Duplicación de Datos

| Dato | Tablas donde aparece | Tipo | Comentario |
|------|----------------------|------|------------|
| `lawyer_id` | `lawyer_clients`, `lawyer_cases`, `bookings`, `service_quote_requests`, `appointments`, `payments`, `lawyer_services` | FK canónico | Tenant isolation |
| `nombre cliente` | `lawyer_clients.name`, `bookings.user_name`, `appointments.name`, `service_quote_requests.user_name`, `lawyer_cases.title` (a veces nombre) | **Snapshot** (`bookings.user_name` histórico legítimo, no dedup) + Source `lawyer_clients.name` canónico | Snapshot no eliminar — preserva historial si cliente cambia nombre |
| `email` | `lawyer_clients.email` (lower/trim unique), `bookings.user_email`, `appointments.email`, `service_quote_requests.user_email` | Snapshot + canonical dedup | Mismo — snapshot histórico vs `lawyer_clients.email` fuente |
| `phone` | `lawyer_clients.phone`, `bookings.user_phone`, `service_quote_requests.user_phone` | Snapshot | — |
| `service name/price` | `lawyer_services.title/price_clp`, `bookings.service_title/price`, `service_quote_requests.service_title/quoted_price`, `payments.lawyer_amount` | Snapshot vs catálogo | `bookings.price` y `payments.lawyer_amount` deben verse como snapshot post-MP, no join catálogo |
| `fecha/hora/duration` | `bookings.scheduled_date/time/duration`, `appointments.appointment_date/time/duration` | Duplicado | Bookings canónico, appointments espejo |
| `estado` | Cada tabla su enum | Independiente | No duplicar — cada entidad su máquina |
| `meet_link` | `profiles.meet_link` (origen), `appointments.meet_link`, `bookings` no tiene columna propia | Cache + espejo | Derivado de `profiles` (DRY) |

**Clasificación:** `bookings.user_*` y `appointments.*` son **snapshots históricos legítimos** del momento de la reserva; `lawyer_clients` es **source of truth** para CRM. No eliminar; documentar propósito snapshot para auditoría.

---

## 15. Datos Huérfanos

*Acceso a datos reales de dev/test no disponible en este entorno (no hay `SUPABASE_URL`/`service_role` env cargado aquí para consultar). Se reporta estructuralmente.*

Potenciales huérfanos por schema:

- `bookings.client_id IS NULL` — marketplace antes de `RequestsPage:78` procesamiento; visible en `phase1B1.test:146 source UNKNOWN` — huérfanos temporales esperados hasta confirmación.
- `bookings.case_id IS NULL` — `LAWYER_DIRECT` sin case (Citas directa) o marketplace hasta conversión.
- `lawyer_cases.client_id` no nulo por CHECK, pero `bookings.client_id` nullable → caso sin bookings huérfano futuro si booking cancelado (`ON DELETE SET NULL`).
- `payments.appointment_id` nullable — pagos `LAWYER_DIRECT` price 0 no generan payment → N/A.
- `payments` sin `booking_id` → todos payments huérfanos respecto a bookings a nivel FK (riesgo P0).
- `appointments` sin `bookings` espejo si webhook falla `needs_manual_review` (`server.mjs:2750`).

*Recomendación futura:* Query `SELECT * FROM bookings WHERE client_id IS NULL AND source='LEGALUP_MARKETPLACE' AND created_at < now()-7d` para medir huérfanos, etc. No modificado.

---

## 16. Analytics Dependencies

| Evento | Fuente canónica | Depende legacy? | Riesgo consolidación |
|--------|----------------|-----------------|----------------------|
| `booking_created` (PostHog `server.mjs:1551` + `activationAnalytics:75`) | `bookings` | No | Ninguno |
| `booking_paid` (`server.mjs:2509` `track.bookingPaid`) | `bookings` `payment_id→MP` | No, pero dedup `seenBookingPaid` localStorage | — |
| `payment.approved` (PostHog interno `server.mjs:2518`) | `payments` + `booking` | Sí — usa `payments.lawyer_amount` | Si se migra a `bookings` sin `payments`, funnel cambiaría |
| `request_processed` (`activationAnalytics:79`, `RequestsPage:84`) | `lawyer_cases` | No | — |
| `page_views`, `chat_events`, `payment_events` | `booking_leads`, `chat_analytics` | `booking_leads` sin RLS pero tracking ok | — |
| `appointment_created` GA4 `sendGA4PurchaseEvent` (`server.mjs:173`) | `payments` + `appointment` `consultation_type` | **Sí legacy** — param `appointment_id` optional (`201`) | Migrar a `bookings` rompería GA4 `items` (service_title) |
| `admin/analytics.tsx:340` revenue dual `bookings`+`appointments` | Ambos | Sí | Consolidar a `bookings` cambiaría revenue hist 6 filas |

**Conclusión:** Funnel `booking_created→booking_paid→request_processed` ya es `bookings` + `lawyer_cases` — sin legacy. Revenue/BI (`EarningsPage`, `FunnelDashboard`) sí dual.

---

## 17. server.mjs / service_role Audit

- **Cliente:** `supabase = createClient(url, serviceRoleKey, {autoRefreshToken:false})` (`server.mjs:302`) — todo `server.mjs` bypass RLS. `if decoded.role !== service_role` (`318`) valida admin JWT para `/api/admin/*` (`:7147`).

- **Endpoints que bypassean:** `POST /api/profiles:544`, `/verify-lawyer:783`, `/create-payment:1053 rpc`, `/api/bookings/create:1202`, `POST /api/mercadopago/webhook:2264`, `/api/mercadopago/reconcile:3270`, `GET /api/bookings/:id:1620` (público!), `/api/documents/*:2034`, admin chats (`:7147`), `process-weekly-payouts`.

- **Validaciones manuales:** `POST /api/bookings/create` valida `lawyer_id/user_email/user_name/price` (`1239`), `scheduled_date/time` rango, double-booking `SELECT pending/confirmed` overlap, lawyer existence `profiles WHERE user_id AND role lawyer`. Webhook verifica HMAC `x-signature` fail-closed (`2314`) + `normalizeId` + routing `external_reference`.

- **Qué NO tocar:** Marketplace (`POST /api/bookings/create` + webhook + `create_payment_secure` + `payment_events` idempotencia + `booking_leads` + GA4/Meta/PostHog). Deno Edge `service-quote-request` / `send-service-quote` / `mercado-pago-webhook` (quotes) — separado.

- **Qué podría reutilizarse por SaaS:** `requireAdmin` (`:368 getUser(token)`), `sendGA4PurchaseEvent`, `notificationsService`, pero `POST /api/bookings/create` ya expuesto para `LAWYER_DIRECT` via RLS `authenticated` (no necesita service_role si frontend inserta directo `CitasPage:146`).

---

## 18. Supabase Types Audit

- **WARN primera línea:** `WARN: config section [inbucket] is deprecated...` (`types:1`) — `supabase gen types` stderr capturado con `2>&1` sin filtro; `config.toml [inbucket]` debe ser `[local_smtp]` y `supabase gen types --local` re-ejecutar.
- **Stale `bookings`:** `booking_range unknown` (`types:985`) sin migración correspondiente; `case_id` añadido `20260906000000` no aparece en types viejo (drift). Tipos desactualizados respecto a `lawyer_cases.quote_request_id` conditional FK vs `types:2174` FK estricto.
- **Legacy duplicados:** `services` vs `lawyer_services` vs `legal_services` vs `lawyers` (rut,full_name `:2302`) vs `profiles(role=lawyer)` — tridente naming.
- **Columnas deprecated:** `profiles MercadoPago` (`:3040`) duplicado `mercadopago_accounts` (`:2619`), `payments.appointment_id` vs nuevo `bookings` trayecto, `consultations` tabla completa.
- **Relationships vacíos:** `appointments.Relationships: []` (`:844`) pese a semántica `lawyer_id/user_id`.

---

## 19. Migration History

| Migración | Decisión |
|-----------|----------|
| `20240925180000_initial_profiles` — `20240929180000_*` | CRUD profiles, Stripe add/remove, RLS iterativo (`20240926220000:ENABLE RLS`), `rut/pjud_verified/university/study years` |
| `20250101000000_add_lawyer_availability` | `availability jsonb` |
| `20260728000000_add_error_logs`, `20260729000000_prevent_double_booking` (`EXCLUDE tsrange`) | Observabilidad, anti doble reserva (booking_range) |
| `20260904150000_lawyer_saas_foundation` | **Fundación SaaS** — `lawyer_clients` dedup, `bookings source+client_id`, `lawyer_cases` envelope, RLS owner — idempotent |
| `20260905000000_bookings_lawyer_direct_rls` | **RLS SaaS** `LAWYER_DIRECT` INSERT/UPDATE — marketplace `service_role` intacto |
| `20260906000000_case_booking_relation` | **1:N** `bookings.case_id` + policy recreate con check `case_id owned` |
| `2026080*` `ai_*`, `20241125150000_platform_settings_and_payouts` | IA + fees `10%/20%` + `payout_logs` singleton |
| Debt | `20240925185300_initial_schema` vacío, `202410072000/001` duplicate ratings, `20260812/2424 placeholder` vacíos, 55 archivos, orden 2024→2026 cronológico inconsistente, sin down, `booking_leads/payment_events` sin `ENABLE RLS` |

Decisiones consolidadas: tenant `profiles.id`, dedup email, envelope cases, `LAWYER_DIRECT` RLS, 1:N cases. Pendiente: `payments.booking_id`, RLS faltante, `appointments` deprecación.

---

## 20. Canonical Target Architecture

*Confirmada con evidencia:* Objetivo `profiles → lawyer_clients → lawyer_cases → bookings` es válido (hoy 1:N vía `case_id`), `lawyer_services` aparte, `service_quote_requests` como **inbox separado** que genera `lawyer_cases`.

```
profiles (tenant auth.uid)
 ├─ lawyer_clients (lawyer_id, email UNIQUE lower/trim)
 │   └─ lawyer_cases (client_id, booking_id xor quote_request_id, source, status new→closed)
 │       ├─ bookings (client_id, case_id, source LAWYER_DIRECT/MARKETPLACE, scheduled/price/status, payment_id, payment_status)
 │       │   └─ payments (booking_id FK ← nuevo, lawyer_amount, payout_status) — hoy appointment_id
 │       └─ service_quote_requests (lawyer_id, service_id, status pending→quoted→paid)
 │           └─ (via lawyer_cases.quote_request_id) — no direct bookings FK hoy
 ├─ lawyer_services (lawyer_user_id)
 └─ bookings (MARKETPLACE) → payments → appointments (dep. solo Meet)
```

`appointments` objetivo: sin escritura desde webhook, solo Meet store o eliminar tras migrar `meet_link` a `bookings`.

---

## 21. Consolidation Matrix

| Área | Actual | Target | Acción futura | Riesgo | Prioridad |
|------|--------|--------|---------------|--------|-----------|
| `appointments` | Dual-write webhook + lectura `EarningsPage/lib/api/ScheduleModal` | `bookings` + `bookings.meet_link` (o mantener solo Meet) | (a) migrar `payments.appointment_id→booking_id` + backfill 6 filas, (b) `EarningsPage`/`api.ts` `→ bookings`, (c) stop dual-write webhook, (d) view compat | Medio | **P1** |
| `payments` | `appointment_id FK`, sin `booking_id` | `payments.booking_id FK bookings` (`ON DELETE SET NULL`) | Migration añadir `booking_id uuid`, backfill vía `payment_events.metadata.booking_id`/`external_reference`, índice, RLS check | Alto trazabilidad | **P0** |
| `service_quote_requests` | Sin `client_id/case_id` directo, sin RLS | Mantener entidad, añadir RLS + `client_id` denormalizado opcional | `ENABLE RLS USING auth.uid()=lawyer_id` + `WITH CHECK` + índice | Alto aislamiento | **P0** |
| `requests` inbox | Dual read `bookings+quotes` en `useLawyerJobs/useRequests` + `RequestsPage` crea `lawyer_cases` | Unificar a `lawyer_cases` envelope (ya 70% listo) | `RequestsPage` `UPDATE service_quote_requests SET client_id` + `DashboardPage` KPI incluir quotes | Medio | **P1** |
| `bookings` source | `UNKNOWN` default marketplace | `LEGALUP_MARKETPLACE` explícito + backfill `UNKNOWN→MARKETPLACE` | Migration `DEFAULT LEGALUP_MARKETPLACE` + `UPDATE` + `CHECK` expandir | Bajo | **P2** |
| `lawyer_services` | Sin RLS | `ENABLE RLS USING auth.uid()=lawyer_user_id` | Migration + policy | Medio | **P0** |
| `booking_leads/payment_events` | Sin RLS | `ENABLE RLS service_role` / read anon limitado | Migration | Medio | **P0** |
| `Dashboard` | `bookings pending` solo + revenue `payments pending` sin filtro | Incluir quotes KPI + `payments` filtro `status approved/payout_status` | Código (sin migration) | Medio | **P1** |
| `Estados` | Fragmentados | `bookings pending/pending_payment/confirmed/in_progress/completed/cancelled` + `cases new→closed`文档 | No code, docs | Bajo | **P2** |
| `consultations/services` | Legacy tablas | `REMOVE` tras auditar 0 escribes SaaS | DROP si vacío | Bajo | **P3** |
| `types` | WARN inbucket + drift | Regenerar `supabase gen types` tras `[local_smtp]` | Config fix | Bajo | **P3** |

---

## 22. Risks

- **R0 P0 — RLS faltante** `service_quote_requests/appointments/lawyer_services/booking_leads/payment_events` → lectura cross-tenant posible (aunque app filtra `eq lawyer_id`, DB no bloquea). `payments.lawyer_id NULL` bypass.
- **R1 — payments→bookings roto** → `FunnelDashboard payments/bookings*100` heurístico, `EarningsPage` vs `Dashboard` revenue mismatch, payout `payment_ids TEXT[]` sin FK cross-tenant.
- **R2 — Dashboard solicitudes** sin quotes → abogado cree 0 pendientes mientras hay quotes.
- **R3 — Client history incompleto** `ClientDetailPage` solo `bookings WHERE client_id` → `service_quote_requests` vía `user_email` no visible hasta procesar.
- **R4 — Dual webhook** `server.mjs` (bookings) vs Deno `mercado-pago-webhook` (quotes) con `notification_url` distinto por `send-service-quote` → idempotencia separada.
- **R5 — Public booking fetch** `GET /api/bookings/:id` `service_role` sin auth → UUID entropy mitigación pero logs MP exponen `external_reference`.
- **R6 — Source drift `UNKNOWN`** → filtros `LEG*MARKETPLACE` mismatch.
- **R7 — appointments sin RLS** → cualquier `authenticated` podría `INSERT` si anon key lo permitiera (mitigado por app `eq lawyer_id`).

---

## 23. Recommended Future Phases

**Solo donde hay evidencia — no sobre-ingenierizar (MVP simple/segura).**

### FASE 2A — Seguridad RLS (P0, sin tocar Marketplace)
*Objetivo:* Cerrar isolation.
*Archivos:* `supabase/migrations/20260915XXXX_rls_gap.sql` — `ENABLE RLS service_quote_requests, appointments, lawyer_services, booking_leads, payment_events` + `CREATE POLICY owner USING auth.uid()=lawyer_id/with_check`.
*Tablas:* arriba.
*RLS:* `FOR SELECT/ALL USING (auth.uid()=lawyer_id OR service_role)` o owner-only.
*Riesgos:* Si `service_role` Edge usa `anon` con user JWT, validar; marketplace `server.mjs` bypass `service_role` no afectado.
*Rollback:* `DROP POLICY`.
*Tests:* `select other_lawyer_id` debe 0 filas.

### FASE 2B — Payment Traceability (P0)
*Objetivo:* `payments.booking_id`.
*Migration:* `ALTER TABLE payments ADD COLUMN booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL; CREATE INDEX idx_payments_booking; UPDATE payments SET booking_id = (SELECT id FROM bookings WHERE bookings.payment_id=payments.payment_gateway_id OR bookings.id = (metadata->>'booking_id')::uuid)`.
*RLS:* `payments` `USING auth.uid()=lawyer_id OR auth.uid()=user_id` + check `booking_id→owned`.
*Impacto Marketplace:* webhook `INSERT payments` debe setear `booking_id=external_reference` (1 línea server).
*Rollback:* `SET NULL`.
*Tests:* `JOIN payments→bookings→cases→clients` sin heurística `user_email`.

### FASE 2C — Appointments Deprecation (P1)
*Objetivo:* Stop dual-write.
*a)* Migrar `EarningsPage:92` → `bookings` join `payments.booking_id` + backfill 6 `appointments→bookings` bajo `bookings.source=APPOINTMENT_LEGACY`.
*b)* `server.mjs:2747-2793` gate `IF feature_flag appointments_mirror` off; `create-google-meeting` read `bookings`.
*c)* `lib/api.ts` `getAppointments` deprecated alias a `bookings` view compat `CREATE VIEW appointments_compat`.
*Rollback:* re-enable flag.

### FASE 2D — Requests Normalization (P1)
*Objetivo:* Unificar inbox.
*Migration:* `ALTER TABLE service_quote_requests ADD COLUMN client_id uuid REFERENCES lawyer_clients(id) SET NULL;` backfill via `lower(trim(user_email))`.
*Code:* `RequestsPage:68-96` `UPDATE service_quote_requests SET client_id` + `DashboardPage:68` `UNION count bookings pending + quotes pending`; `ClientDetailPage` `UNION service_quote_requests`.
*Impacto SaaS:* solo lectura.

**No crear:** `2E microservicios/event sourcing/CQRS` — no necesario. `consultations` DROP solo si `SELECT count(*) FROM consultations` = 0/ irrelevante → **P3**.

---

## 24. What NOT to Change

- `server.mjs POST /api/bookings/create` + webhook HMAC + `payment_events` idempotencia + `booking_leads` + GA4/Meta/PostHog — **$MVP Marketplace funcional**.
- `platform_settings` singleton + `payout_logs` admin — liquidación semanal.
- `lawyer_clients` dedup `lower(btrim(email))` + trigger + RLS — **keep**.
- `lawyer_cases` envelope `XOR booking/quote` + 1:N `case_id` — **keep**.
- `service_quote_requests` Edge Functions `service-quote-request` / `send-service-quote` / `mercado-pago-webhook` — **keep** (no migrar a server.mjs).
- `profiles` public read + owner write — marketplace search.
- `CitasPage` (`bookings`) + `RequestsPage` crea `lawyer_cases` — **keep**.
- `OnboardingCard` `>=70%` check — **keep**.

---

## 25. Definition of Done — Checklist

- [x] Todos los usos `appointments` identificados (45 hits, matriz 4.1)
- [x] Todos los usos `bookings` categorizados Marketplace/SaaS/Dashboard/Admin
- [x] Todos los usos `service_quote_requests` (crea/lee/procesa, heuristic email)
- [x] Relaciones `Client→Case→Booking` FK vs heurística tabla 7
- [x] Ownership/RLS estructural 8 (PASS/PASS WITH GAP/RISK por tabla)
- [x] Payment traceability (`payment→booking` roto documentado)
- [x] Dashboard fuentes por KPI (solo bookings + payments legacy)
- [x] Hooks `useLawyerJobs/Clients/Cases/Profile` auditados
- [x] Componentes legacy matriz 12
- [x] Estados inventario 13
- [x] Duplicación Snapshot vs Source 14
- [x] Datos huérfanos estructural (sin acceso env, reportado) 15
- [x] Analytics dependencias 16 (PostHog/GA4 sin legacy funnel)
- [x] `server.mjs/service_role` 17
- [x] Tipos `supabase.ts` WARN+drift 18
- [x] Migraciones historia 19 (3 claves + debt)
- [x] Arquitectura canónica propuesta 20
- [x] Matriz consolidación P0-P3 21
- [x] Riesgos 22
- [x] Fases futuras solo con evidencia 23
- [x] Qué NO tocar 24

**NO se modificó:** código, DB, RLS, Marketplace, Mercado Pago.

---

## 26. Próximos pasos sugeridos

1. **Fase 2A RLS** (P0) — 1 migration, 0 código Marketplace, smoke `SELECT other lawyer` =0.
2. **Fase 2B payments.booking_id** — migration + 1 línea server `booking_id=external_reference` + `EarningsPage` join fix; `build` + `test:run` + `git diff --check` + manual `BookingPage → MP sandbox → webhook`.
3. Luego decidir si ejecutar 2C/2D tras medir `SELECT count(*) FROM appointments WHERE created_at > now()-30d` en prod.

*Entrega:* este documento `docs/FASE-2-DATA-LEGACY-CONSOLIDATION-AUDIT.md` — auto-commit **NO** realizado por instrucción plan-only.

