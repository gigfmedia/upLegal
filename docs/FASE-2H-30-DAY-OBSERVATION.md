# FASE 2H — 30-Day No-Write Observation

## Status

**PASS — DAY 0 STARTED** (Sandbox E2E BLOCKED — ENVIRONMENT, not code)

Modern flow `ScheduleModal → bookings → bookingId → payments.booking_id → external_reference=booking.id → webhook → bookings.status confirmed → bookings.meet_link → email → BookingSuccess?booking_id` is **booking-first** and **does not require appointments** as source of truth. `appointments` mirror retained as non-blocking compatibility.

## Production Certification

- **Date:** 2026-09-06 10:30 UTC
- **Environment:** Frontend `http://localhost:3001` (`VITE_APP_URL`), Backend `http://localhost:3000` (`VITE_API_BASE_URL`), MP `production` (`MERCADOPAGO_ACCESS_TOKEN=APP_USR-...`, `MERCADOPAGO_ENV=production`, `VITE_MERCADOPAGO_SANDBOX=true` mismatch), Webhook `https://uplegal-service.onrender.com/api/mercadopago/webhook` (`MERCADOPAGO_WEBHOOK_URL`), Supabase `lgxsfmvyjctxehwslvyw`
- **Booking ID:** (no live payment in this audit; smoke booking `58` total, 1 test via `POST /api/bookings/create` would be `pending` with `source UNKNOWN`)
- **MP Preference ID:** (not generated without TEST token; prod `init_point` would be generated)
- **Payment ID:** (not generated — sandbox BLOCKED)
- **External Reference:** Expected `booking.id` (server `POST /api/bookings/create:1512`, `POST /create-payment:1123 bookingId || paymentId`)
- **Payment Event:** `payment_events` 85 existing with `booking_id`, idempotency `23505` intact
- **Meet:** `bookings.meet_link` (new) + `appointments` mirror (legacy) — `create-google-meeting` now `bookingId` primary
- **Email:** Resend after `approved` + `ensure Meet` (webhook `2925`)
- **BookingSuccess:** `?booking_id` (primary) + `external_reference` legacy — `BookingSuccessPage.tsx:36`

**Sandbox:** `BLOCKED — ENVIRONMENT` — `MERCADOPAGO_ACCESS_TOKEN` is `APP_USR` prod, not `TEST-`, `VITE_MERCADOPAGO_SANDBOX=true` mismatch, no `TEST-` token available to create `approved` sandbox payment without charging real money. Static PASS, live E2E BLOCKED (as in 2E.1).

## Day 0

- **Start:** 2026-09-06 10:30 UTC
- **End:** 2026-10-06 10:30 UTC (30 days)

## Architecture

- **bookings = source of truth** for new Marketplace + SaaS (`source UNKNOWN` Marketplace, `LAWYER_DIRECT` SaaS, `booking_type appointment`, `scheduled_date/time`, `price` server-calculated, `status pending → confirmed`, `payment_id`, `meet_link`)
- **appointments = legacy/compatibility** (6 historic, mirror `server.mjs:2833` non-blocking, `lib/api` deprecated)

## Daily Metrics (to track)

**Bookings:** new, confirmed, cancelled, pending, payment failures  
**Payments:** created, with `booking_id` (new) vs `appointment_id` (legacy), duplicate `payment_events`, webhook 4xx/5xx  
**Meet:** created `bookings.meet_link`, reused, failures, `confirmed without meet_link`  
**Email:** success, failures  
**Appointments:** source-of-truth writes (should be 0), compatibility writes (mirror), legacy writes (should be 0 for new Marketplace)

## Appointments Writes

- **Source-of-truth writes:** `ScheduleModal` `0` (`from('appointments').insert` removed in 2D-2), `CitasPage` `0` (uses `bookings`)
- **Compatibility writes:** `server.mjs:2833` `INSERT appointments` mirror `pending_meet_link` (webhook, try/catch, non-blocking) + `server.mjs:2905` `UPDATE appointments.meet_link` + `supabase/functions/create-google-meeting:225` — **mirror, not source**
- **Legacy writes:** 0 new Marketplace (verified `rg` 0 in `ScheduleModal`), 6 historic intact

**Classification:** `appointments` mirror **RETAINED — COMPATIBILITY ONLY**, failure does not block `booking confirmed → Meet → email`.

## Incidents

None during audit. No `booking payment claim` race, no duplicate `payment_events`, no `external_reference mismatch` (static).

## P0

None — No `booking remains pending` after approved (webhook atomic), no `booking.payment_id missing` (idempotency), no `payments.booking_id` untraceable (FK), no `Meet requires appointments` (bookingId path), no price manipulation (server-side `computedPrice`), no tenant leak (RLS `lawyer_id/user_id`).

## P1

- `appointments` mirror still writes (compatibility) — can be feature-flagged off after 30-day
- `admin/analytics` dual `appointments + bookings` — not deduped
- `DashboardAppointments` fallback `appointmentsApi` (1 consumer)

## Day 30 Result

**PENDING** — Day 0 just started. Criteria to PASS at Day 30:
- `0` source-of-truth `appointments` writes
- `100%` new payments `booking_id` traceable
- `0` payment duplication
- `0` booking confirmation inconsistency
- `0` tenant isolation failures
- `bookings.meet_link` primary works
- `BookingSuccess?booking_id` works

## Recommendation

**KEEP TEMPORARILY** — Do not `DROP appointments` now. After 30-day observation with `0` source-of-truth writes and `appointments` mirror flagged off successfully, proceed to `DROP` via `CREATE VIEW appointments_compat` + `lib/api` removal (FASE 2G+1). No CRM auto, no backfill.

---

## Database Verification

- `bookings.meet_link text` exists (`20260909000000`), `payments.booking_id uuid FK bookings` exists (`20260908000000`), indexes `idx_payments_booking_id`, `idx_bookings_meet_link`
- `appointments` 6 rows, `bookings` 58, `payments` 5 (`booking_id NULL` legacy), `payment_events` 85

## Static Audit

- `rg -n "from('appointments')" ` → 13 hits (admin, reviews, lib/api, UserDashboard fallback) — no `ScheduleModal` insert
- `rg -n "appointments.*insert"` → 0 in `ScheduleModal` (migrated), 1 in `server.mjs` mirror
- `rg -n "external_reference" server.mjs` → `booking.id` (bookings) + `bookingId || paymentId` (create-payment)
