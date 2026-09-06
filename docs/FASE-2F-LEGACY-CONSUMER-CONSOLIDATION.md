# FASE 2F — Legacy Consumer Consolidation + No-Write Observation

**Modo:** EXECUTION minimal, evidence-driven  
**Fecha:** 2026-09-06

---

## A. Before — Mapa de consumidores `appointments`

| Consumer | READ/WRITE | Critical | Antes |
|----------|------------|----------|-------|
| `ScheduleModal.tsx:888` | WRITE INSERT `appointments` | P0 | Marketplace `pending_payment` |
| `server.mjs:2771` webhook | WRITE INSERT `appointments` mirror | P0 | `bookings` → `appointments` |
| `server.mjs:2905` | UPDATE `appointments.meet_link` | P0 | Meet |
| `create-google-meeting:28` | READ/WRITE `appointments` | P0 | Meet |
| `UserDashboard.tsx:278` | READ `appointments WHERE user_id` | P1 | Client historial |
| `DashboardAppointments.tsx:109` | READ `appointmentsApi` | P1 | Client/Lawyer citas |
| `EarningsPage.tsx:96` | READ `appointments` fallback | P1 | Revenue |
| `admin/analytics.tsx:500` | READ `appointments` dual | P1 | Analytics |
| `LawyerReviewsSection:118` | READ `appointments WHERE status completed` | P1 | Review eligibility |
| `lib/api.ts:149` | CRUD `appointments` | P2 | Helper |

---

## B. After — Mapa actualizado

| Consumer | READ/WRITE | Después | Estado |
|----------|------------|---------|--------|
| `ScheduleModal.tsx` | **bookings** `POST /api/bookings/create` | **Migrated** — no `appointments` insert | PASS |
| `server.mjs` webhook | `appointments` mirror + `bookings.meet_link` sync | **Dual** (mirror preserved) | Legacy mirror |
| `create-google-meeting` | `bookings.meet_link` primary + `appointments` fallback | **Migrated** (bookingId) | PASS |
| `UserDashboard.tsx` | `bookings WHERE user_id` primary + `appointments` fallback | **Migrated** dual | PASS |
| `DashboardAppointments.tsx` | `bookings WHERE user_id/lawyer_id` + `appointmentsApi` | **Migrated** dual | PASS |
| `EarningsPage.tsx` | `bookings` primary via `payments.booking_id` | **Migrated** dual | PASS |
| `admin/analytics` | `appointments + bookings` | **Remaining** dual | DEFERRED |
| `LawyerReviewsSection` | `bookings` `confirmed/completed` + `appointments` fallback | **Migrated** | PASS |
| `lib/api.ts` | `appointmentsApi` | **Remaining** deprecated, 1 consumer (`DashboardAppointments` fallback) | P2 |

---

## C. Migrated — bookings como primary

- `UserDashboard` dual-read `bookings` (primary) + `appointments` fallback (historical 6)
- `DashboardAppointments` dual-read `bookings` + `appointmentsApi` (merged, filtered by role/status)
- `LawyerReviewsSection` now checks `bookings WHERE user_id/lawyer_id status confirmed/completed` **or** `appointments`
- `create-google-meeting` now `bookingId` primary (`bookings.meet_link`) with `appointmentId` fallback
- `EarningsPage` already `bookingsMap` primary (2C)

---

## D. Remaining Legacy

- `appointments` **writes:** `server.mjs` webhook mirror `INSERT appointments` (Marketplace) + `create-google-meeting` `UPDATE appointments` — **mirror, not source of truth**, identified as `B. webhook compatibility mirror`
- `appointments` **reads:** `admin/analytics` (dual), `lib/api` (deprecated helper), `netlify/create-payment` appointmentId verification, `reviews` fallback, `DashboardAppointments` fallback
- `payments.appointment_id` column kept (5 legacy rows), `appointmentId` param kept in `netlify` and `server` `/create-payment`

---

## E. Writes — Lista exacta restantes

| Write | Estado | Origen |
|-------|--------|--------|
| `appointments INSERT` `server.mjs:2771` | **ACTIVE** (mirror) | webhook `shouldCreateAppointment` |
| `appointments UPDATE meet_link` `server.mjs:2905` + `create-google-meeting:226` | ACTIVE (mirror) | Meet |
| `bookings INSERT` `CitasPage:146` `LAWYER_DIRECT` + `server.mjs:1381` `UNKNOWN` | ACTIVE (primary) | SaaS + Marketplace |
| `bookings UPDATE meet_link` `server.mjs` sync | ACTIVE | webhook |
| `appointments INSERT` `ScheduleModal` | **0** (migrated) | — |

**Nuevas Marketplace citas:** `0` `appointments` (verificado `rg -n "from\('appointments'\)\.insert" src/components/ScheduleModal.tsx` → 0)

---

## F. No-Write Gate

**STATUS: NOT STARTED**

**Condiciones (§12):**
1. ScheduleModal no escribe appointments → **PASS** (0 new inserts)
2. No otro flujo Marketplace escribe appointments como fuente primaria → **FAIL** — webhook mirror `server.mjs:2771 INSERT appointments` aún escribe appointments como mirror (no fuente primaria, pero es write)
3. bookings es fuente primaria → **PASS** (CitasPage, ScheduleModal, UserDashboard, DashboardAppointments)
4. payments.booking_id funciona → **PASS** (FK, 0 linked legacy, new flow)
5. webhook resuelve booking.id → **PASS**
6. BookingSuccess booking_id → **PASS**
7. Meet usa bookings.meet_link primary → **PASS** (webhook sync + create-google-meeting bookingId)
8. No consumidor crítico requiere nuevo appointment → **FAIL** — `create-google-meeting` aún necesita `appointments` fallback for legacy, `admin/analytics` dual
9. Writes restantes solo mirrors → **FAIL** — mirror still active, not yet removable

**Conclusión:** Gate no puede iniciar hasta que `server.mjs` webhook mirror sea opcional (feature flag) y `DashboardAppointments`/`admin` no dependan de `appointments` fallback. Requiere 30-day observation sin mirror.

**Telemetría:** No se agregó PostHog; `booking_created` (`server.mjs:1569`) ya cuenta `bookings`, `appointments` mirror no instrumentado.

---

## G. Risks

- **P0:** `create-google-meeting` still appointments fallback — si se elimina mirror, Meet para bookings sin appointmentId fallaría (mitigado con bookings path)
- **P1:** `admin/analytics` dual conteo `appointments + bookings` puede duplicar si no se deduplica por `booking_id`
- **P2:** `lib/api` deprecated but still used by `DashboardAppointments` fallback — 1 consumer

---

## H. Next Phase

**FASE 2G** — Después de 30-day no-write observation (con mirror deshabilitado vía flag):
- `server.mjs` webhook: gate `if (featureFlagAppointmentsMirror)` off
- `DashboardAppointments` bookings-only (remove `appointmentsApi` fallback)
- `admin/analytics` bookings-only
- `CREATE VIEW appointments_compat AS SELECT bookings ...` para reviews
- Luego `DROP` solo si `SELECT count(*) FROM appointments WHERE created_at > now()-30d` =0 y `payments.booking_id` 100% para nuevos

No CRM auto, no backfill heurístico.

