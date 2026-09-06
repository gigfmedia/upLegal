# FASE 2G — Remove Functional Dependency on Appointments Mirror

**Modo:** EXECUTION minimal, evidence-driven  
**Fecha:** 2026-09-06

---

## A. Before

```
payment approved
 ↓
booking confirmed (atomic payment_id claim)
 ↓
INSERT appointments mirror (pending_meet_link)
 ↓
create-google-meeting(appointmentId) → appointments.meet_link
 ↓
sync bookings.meet_link = fresh.meet_link
 ↓
email (with meet_link)
```

Modern Marketplace booking **dependía** de `INSERT appointments` para obtener `appointmentId` y luego `create-google-meeting(appointmentId)`. Sin mirror, `bookings.meet_link` no se generaba.

---

## B. After

```
payment approved
 ↓
booking confirmed (atomic)
 ↓
if booking.meet_link exists → reuse (idempotent)
else
  ↓
  ensure meeting via bookingId (primary)
   ↓
  create-google-meeting({bookingId, appointmentId}) → checks bookings.meet_link first, then lawyer fixed, then Jitsi
   ↓
  UPDATE bookings.meet_link = meetLink
   ↓
  (mirror) try INSERT appointments (non-blocking, catch log) → UPDATE appointments.meet_link (legacy) — failure does not block
 ↓
email (booking-first, with bookings.meet_link)
```

Modern flow **no requiere** `appointments` para Meet/email; mirror es compatibilidad.

---

## C. Mirror

**RETAINED — COMPATIBILITY ONLY** (no DROP)

**Reason:** `appointments` aún tiene 6 históricos + consumidores legacy (`DashboardAppointments` fallback, `admin/analytics` dual, `netlify/create-payment` appointmentId path, `reviews` fallback). El mirror `server.mjs:2833 INSERT appointments` permanece pero es **non-blocking** (try/catch log, no throw) y no es fuente de verdad para nuevo bookings. Su fallo no rompe `booking confirmed → Meet → email`.

**Modern dependency:** NO — `create-google-meeting` ahora acepta `bookingId` primary, `bookings.meet_link` es source.

---

## D. Consumers — Actualizado

| Consumer | Before | After | Estado |
|----------|--------|-------|--------|
| `ScheduleModal` | `appointments` INSERT | `bookings` (`POST /api/bookings/create`) | Migrated |
| `server webhook` | `appointments` mirror required for Meet | `bookings.meet_link` primary, `appointments` mirror non-blocking | Migrated |
| `create-google-meeting` | `appointmentId` only | `bookingId` primary + `appointmentId` fallback (idempotent) | Migrated |
| `UserDashboard` | `appointments` only | `bookings` primary + `appointments` fallback | Migrated |
| `DashboardAppointments` | `appointmentsApi` only | `bookings` primary + `appointments` fallback | Migrated |
| `EarningsPage` | `appointments` fallback | `bookings` primary via `payments.booking_id` | Migrated |
| `LawyerReviewsSection` | `appointments` only | `bookings` + `appointments` fallback | Migrated |
| `admin/analytics` | dual | dual (historical) | Remaining |
| `lib/api` | `appointments` CRUD | deprecated, 1 consumer fallback | Remaining |
| `netlify/create-payment` | `appointmentId` only | `bookingId` + `appointmentId` | Migrated |

---

## E. Writes — Lista exacta restantes

| Write | Tabla | Flujo | Estado |
|-------|-------|-------|--------|
| `INSERT appointments` `server.mjs:2833` | appointments | webhook mirror `pending_meet_link` | **RETAINED** compatibility, non-blocking |
| `UPDATE appointments.meet_link` `server.mjs:2905` + `create-google-meeting:225` | appointments | Meet | RETAINED |
| `INSERT bookings` `CitasPage:146` `LAWYER_DIRECT` + `server.mjs:1381` `UNKNOWN` | bookings | SaaS + Marketplace | **Primary** |
| `UPDATE bookings.meet_link` `server.mjs` sync + `create-google-meeting` bookings | bookings | Meet | **Primary** |
| `INSERT appointments` `ScheduleModal` | appointments | Marketplace | **0** (migrated) — `rg from('appointments').insert src/components/ScheduleModal.tsx` → 0 |

**Marketplace new appointments created: 0**

---

## F. Historical Data

- `SELECT count(*) FROM appointments` → `6` (2026-02-19 to 2026-09-06, 2 with `meet.jit.si`)
- `SELECT count(*) FROM payments WHERE appointment_id IS NOT NULL` → `0` (5 rows `appointment_id NULL`, `metadata` string)
- `SELECT count(*) FROM payments WHERE booking_id IS NOT NULL` → `0` (legacy, new flow not yet exercised with real payment)
- **No modificado:** 6 historic intacto, no backfill, no `UPDATE` masivo.

---

## G. Tests

`src/__tests__/phase2G.test.ts` 10 tests (modern booking no appointment, bookingId Meet, reuse, failure, email, mirror failure, legacy, booking_id, tenant).

---

## H. No-Write Gate

**Functional dependency on appointments:** **REMOVED** (modern `booking → Meet → bookings.meet_link` no requiere `appointments`)

**Appointments mirror:** **RETAINED** (compatibility only, non-blocking)

**Mirror reason:** 6 historic + `admin/analytics` dual + `DashboardAppointments` fallback. Mirror failure does not block `booking confirmed → Meet → email` (try/catch).

**No-write observation:** **READY TO START** (not STARTED — requires 30-day evidence). `ScheduleModal` 0 new writes, `CitasPage` 0, `bookings` primary. Mirror writes still occur (`server.mjs:2833`) but are compatibility, not source. Gate can start when mirror is feature-flagged off or observed 30 days with `SELECT count(*) FROM appointments WHERE created_at > now()-30d` =0 for new Marketplace (excluding mirror if flagged).

---

## I. Remaining Risks

- **P0:** None for modern flow.
- **P1:** `admin/analytics` dual counts could double if not deduped by `booking_id` (mitigated by `bookings` primary for new).
- **P2:** `lib/api` deprecated but still fallback for `DashboardAppointments` — 1 consumer.

