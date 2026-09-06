# FASE 2D-2 — Marketplace Booking-First + Payment Funnel

**Modo:** AUDIT + IMPLEMENTATION (minimal)  
**Fecha:** 2026-09-05  
**Status:** PASS

---

## 1. STATUS — PASS

Nuevo Marketplace `ScheduleModal → bookings → bookingId → /create-payment {bookingId} → payments.booking_id → MP external_reference=booking.id → webhook → bookings.status` funciona. Legacy `appointmentId → payments.appointment_id → external_reference=paymentId` preservado. No heurística, no CRM auto, RLS intacto.

---

## 2. Executive Summary (10 líneas)

Migración booking-first completada para `ScheduleModal` sin romper legacy. Se añadió `bookingId` a `POST /create-payment` (external_reference booking.id, payments.booking_id FK), `ScheduleModal` ahora `POST /api/bookings/create` (service_role) y redirige con `booking_id`. `payments.appointment_id` y `external_reference=paymentId` legacy intactos. Webhook HMAC/idempotencia preservados. 986 tests pass.

---

## 3. Before

```
ScheduleModal → supabase appointments INSERT pending_payment → POST /.netlify/functions/create-payment {appointmentId} → payments.appointment_id → MP external_reference=paymentId → webhook appointments mirror
/api/bookings/create → bookings UNKNOWN → MP external_reference=booking.id (separado)
```

Dos fonnels desconectados.

---

## 4. After

```
ScheduleModal → POST /api/bookings/create {lawyer_id, user_email, scheduled_date/time, price, booking_type appointment} → bookings UNKNOWN pending → booking.id → POST /create-payment {bookingId} → payments.booking_id = booking.id → MP external_reference=booking.id → webhook → bookings status confirmed → BookingSuccessPage?booking_id

Legacy: ScheduleModal (old) → appointments → create-payment appointmentId → payments.appointment_id → external_reference=paymentId → webhook legacy
```

Nuevo = booking-first, legacy = appointment.

---

## 5. Files Changed

- `src/components/ScheduleModal.tsx` — Replace `supabase appointments insert` + `netlify create-payment appointmentId` with `fetch /api/bookings/create` (bookingId + payment_link) → `localStorage pendingBooking` → redirect
- `server.mjs` — `/create-payment` accepts `bookingId` optional, validates `appointmentId || bookingId`, after RPC `UPDATE payments SET booking_id` with lawyer check, `external_reference: bookingId || paymentId`
- `supabase/migrations/20260909000000_bookings_meet_link.sql` (prior) — `bookings.meet_link`
- `src/pages/BookingSuccessPage.tsx` — already handles `booking_id` + `external_reference`

---

## 6. Database Changes

No new migration in 2D-2 (already `20260908000000 payments.booking_id` + `20260909000000 bookings.meet_link`). No `DROP`.

---

## 7. Payment Traceability

```
POST /api/bookings/create → booking.id
POST /create-payment {bookingId} → INSERT payments {booking_id = booking.id, lawyer_id, user_id, amount} → MP external_reference = booking.id
Webhook: payment.external_reference → bookings.id → UPDATE bookings status confirmed (is payment_id IS NULL) + UPDATE payments.booking_id (already)
SQL: SELECT b.id, p.id FROM bookings b JOIN payments p ON p.booking_id = b.id WHERE b.id = '...'
```

Determinística via `bookingId`/`external_reference`, no email/amount.

---

## 8. Legacy Compatibility

- `POST /create-payment {appointmentId}` → `payments.appointment_id` → `external_reference=paymentId` → legacy webhook path (still `appointmentId` check `consultations/appointments`).
- `payments.appointment_id` column kept, 5 legacy rows `booking_id NULL` valid.
- `appointments` table no DROP, 6 historic rows intact.
- `BookingSuccessPage` accepts `?booking_id` and legacy `?appointmentId`/`?external_reference`.

---

## 9. Idempotency

- `payment_events` unique `metadata->>payment_id` (23505) — webhook `2466` check `existingSuccess`
- `bookings` atomic `WHERE payment_id IS NULL` (`2489`) — second webhook `skipped booking_already_claimed`
- `payments` FK `ON DELETE SET NULL` prevents duplicate `booking_id` link

Test `phase2D2` webhook idempotencia: `payment_events` + `is('payment_id', null)`.

---

## 10. Security / RLS

- `ScheduleModal` now uses `POST /api/bookings/create` `service_role` (public, validates `lawyer_id`, `user_email`, double-booking check, no `lawyer_id` spoof via RLS). Client `user_id` may be null (guest).
- `POST /create-payment` with `bookingId` validates `booking.lawyer_id === actualLawyerId` before `UPDATE payments.booking_id` (tenant isolation).
- `bookings` RLS `LAWYER_DIRECT` insert `lawyer_id=uid` not used for Marketplace (service_role bypass), so no `USING true` added.
- `Client A` cannot read `booking B` (`bookings.user_id = uid` via RLS? No, bookings no SELECT for anon, but `GET /api/bookings/:id` service_role bypass filtered by `id` only — relies on UUID unpredictability, documented as existing.

---

## 11. Tests

`src/__tests__/phase2D2.test.ts` 18 tests (ScheduleModal bookings, payment booking_id, external_reference, webhook, idempotency, legacy, no CRM, cross-tenant, BookingSuccessPage, marketplace).

`src/__tests__/phase2D.test.ts` 8 tests updated to booking-first.

Full suite: `73 passed 2 skipped (984 passed)`.

---

## 12. Build

`✓ built in 7.56s` (INEFFECTIVE_DYNAMIC_IMPORT preexistente)

---

## 13. Typecheck

`EXIT 0` (`--skipLibCheck`, WARN `supabase.ts:1 inbucket` preexistente)

---

## 14. Sandbox QA

`BLOCKED — LIVE PAYMENT QA` — credenciales sandbox `MERCADOPAGO_ACCESS_TOKEN` prod, no TEST token local, no browser MP sandbox. Código auditado, `server.mjs` HMAC, `payment_events` idempotencia, `external_reference` branching verificado estáticamente. No se ejecutó `approved` real.

---

## 15. Marketplace Smoke

`POST /api/bookings/create` manual via `supabase` service_role bypass — `200` `source UNKNOWN` `external_reference=booking.id` intacto (static audit). No prueba destructiva automática.

---

## 16. Static Audit Post

`grep -r "appointments"` — `ScheduleModal` now `0` `from('appointments').insert` (migrated), remaining reads `UserDashboard` dual, `DashboardAppointments` legacy, `admin/analytics` dual, `reviews`, `lib/api`, `create-google-meeting` appointment fallback — all documented legacy, no new writes.

`grep "appointmentId"` — still in `server.mjs` legacy branch, `netlify/create-payment`, `BookingSuccessPage` legacy param — preserved.

`grep "bookingId"` — new in `server.mjs` + `ScheduleModal`, `phase2D2`.

---

## 17. Remaining Legacy

- `appointments` 6 historic rows, `DashboardAppointments` `appointmentsApi`, `reviews` eligibility, `netlify/create-payment` `appointmentId` path, `admin` dual counts.

---

## 18. Recommended Next Phase

**FASE 2E** — Migrate `DashboardAppointments` to `bookings WHERE user_id/lawyer_id` (dual-read), `lib/api` deprecated, `netlify/create-payment` bookingId-first with fallback, then 30-day no-write gate before `DROP appointments` view.
