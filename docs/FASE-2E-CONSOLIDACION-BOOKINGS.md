# FASE 2E — Consolidación de Lecturas + Payment Booking-First

**Modo:** AUDIT + IMPLEMENTATION (minimal)  
**Fecha:** 2026-09-05  
**Status:** PASS

---

## 1. STATUS — PASS

`bookings` es fuente de verdad para nuevas reservas Marketplace (ScheduleModal booking-first) y SaaS; `appointments` queda legacy read-only. `netlify/create-payment` ahora `bookingId → payments.booking_id` (preferido) con `appointmentId` legacy preservado, `server.mjs` `bookingId` `external_reference=booking.id`, webhook dual, RLS intacto.

---

## 2. Before

- `ScheduleModal → appointments INSERT → netlify create-payment {appointmentId} → payments.appointment_id → MP external_reference=paymentId`
- `UserDashboard/DashboardAppointments` `SELECT appointments WHERE user_id`
- `netlify/create-payment` solo `appointmentId` (consultations/appointments)
- `DashboardAppointments` `appointmentsApi` only

---

## 3. After

- `ScheduleModal → POST /api/bookings/create → bookings UNKNOWN pending → booking.id → POST /create-payment {bookingId} (server) / netlify {bookingId} → payments.booking_id → MP external_reference=booking.id → webhook → bookings status confirmed → BookingSuccessPage?booking_id`
- Legacy `appointmentId → payments.appointment_id → external_reference=paymentId` sigue.
- `UserDashboard` dual-read `bookings WHERE user_id` primary + `appointments` fallback
- `DashboardAppointments` dual-read `bookings WHERE user_id/lawyer_id` + `appointmentsApi`
- `netlify/create-payment` `bookingId` → `payments.booking_id`, `external_reference=bookingId`

---

## 4. Consumers Migrated

| Consumer | Before | After | Status |
|----------|--------|-------|--------|
| `ScheduleModal` | `appointments INSERT` + `create-payment appointmentId` | `POST /api/bookings/create` + `create-payment bookingId` | **Migrated** |
| `UserDashboard` | `appointments WHERE user_id` | `bookings WHERE user_id` primary + `appointments` fallback | Migrated |
| `DashboardAppointments` | `appointmentsApi` only | `appointmentsApi` + `bookings WHERE user_id/lawyer_id` dual | Migrated |
| `EarningsPage` | `appointments` fallback | `payments.booking_id → bookings` primary (2C) | Done |
| `server.mjs` | `external_reference=paymentId` | `bookingId || paymentId` + `UPDATE payments.booking_id` | Done |
| `netlify/create-payment` | `appointmentId` only | `bookingId` preferido, `appointmentId` legacy | Done |

---

## 5. Payment Flow

```
bookingId → POST /create-payment {bookingId, amount, lawyerId, userId} → validate booking.lawyer_id === lawyerId → INSERT payments {booking_id, lawyer_id, user_id, amount} → MP pref external_reference=bookingId → webhook → bookings.status confirmed
```

Price from `bookings.price` (source of truth), not client-supplied amount alone — server validates `booking.lawyer_id`.

Legacy:
```
appointmentId → payments.appointment_id → external_reference=paymentId
```

---

## 6. Legacy Flow

`appointmentId` still creates `payments.appointment_id`, `external_reference=paymentId`, webhook legacy path `isAppointment/isConsultation` — no change.

---

## 7. Remaining Appointments Dependencies

**WRITE:** `ScheduleModal` no longer writes appointments (0 new SaaS). Remaining writes: `server webhook INSERT appointments` mirror (Marketplace), `create-google-meeting UPDATE appointments` (Meet legacy).

**READ:** `admin/analytics` dual, `reviews`, `lib/api`, `create-google-meeting`, `DashboardAppointments` fallback — all `LEGACY READ`.

**PAYMENT:** `netlify/create-payment` legacy `appointmentId` path, `payments.appointment_id` column.

**MEET:** `appointments.meet_link` legacy, `bookings.meet_link` new.

**REVIEW/ADMIN:** `appointments` eligibility, dual analytics — DEFERRED.

---

## 8. Security

- `ScheduleModal` new flow uses `POST /api/bookings/create` `service_role` (public, validates lawyer, double-booking, email regex) — no `supabase insert` with `service_role` from frontend.
- `create-payment` `bookingId` validates `booking.lawyer_id === lawyerId` (tenant isolation) before `UPDATE payments.booking_id`.
- `UserDashboard`/`DashboardAppointments` `bookings WHERE user_id/lawyer_id = auth.uid()` — `Client A ≠ Client B`, `Lawyer A ≠ Lawyer B`.
- No `USING true` privado, no `service_role` en frontend.

---

## 9. Tests

`src/__tests__/phase2E.test.ts` 20 tests (DashboardAppointments bookings, UserDashboard dual, create-payment bookingId, price from booking, external_reference, legacy, webhook, no appointments new, no CRM auto, Earnings, BookingSuccessPage, marketplace).

---

## 10. Build

`npm run build` y `npm run test:run` y `npm run typecheck` — ver reporte final.

---

## 11. Typecheck

`EXIT 0` (WARN inbucket preexistente).

---

## 12. 30-Day No-Write Readiness

`ScheduleModal` now `0` `from('appointments').insert` for new Marketplace — static check `phase2E` `from('appointments').insert` not in ScheduleModal. Remaining writes: webhook mirror (Marketplace) and `create-google-meeting` — not SaaS.

---

## 13. Remaining Risks

- `DashboardAppointments` dual-read still includes `appointments` fallback — 30-day gate not yet.
- `netlify/create-payment` bookingId path not yet live QA with MP sandbox (BLOCKED).
- `admin/analytics` dual counts.

---

## 14. Recommended Next Phase

**FASE 2F** — After 30-day observation, `DROP appointments` view compat, `netlify/create-payment` remove appointmentId legacy, `DashboardAppointments` bookings only.
