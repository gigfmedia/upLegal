# FASE 2E.3 — Payment Integrity + Post-Payment Fulfillment

**Modo:** EXECUTION (minimal)  
**Fecha:** 2026-09-05  
**Status:** PASS

---

## STATUS — PASS

`POST /api/bookings/create` ahora calcula `price` server-side desde `lawyer_services.price_clp` o `profiles.hourly_rate_clp` + surcharge 10%, ignorando `price` cliente. `payments.booking_id` y `external_reference=bookingId` preservados, `appointments` legacy intacto, `bookings` pending → `confirmed` → `Meet` → `Email` orden correcto, `meet_link` idempotente, email post-approved, `BookingSuccessPage` booking_id, RLS intacto.

---

## Pricing before

- `ScheduleModal` calculaba `clientAmount = originalAmount *1.1` y enviaba `price: clientAmount` a `POST /api/bookings/create`
- `server.mjs:1221` validaba `price` required pero `bookingInsert price = price` (cliente), `MP unit_price = price` — manipulable `price:1`
- No validación contra `lawyer_services`/`hourly_rate`

---

## Pricing after

- Server `POST /api/bookings/create` (`1345`): `computedPrice` desde `platform_settings.client_surcharge_percent` (0.1), `isServiceBooking ? lawyer_services.price_clp *1.1 : hourly_rate_clp * duration/60 *1.1`
- `priceSource` `service`/`hourly` vs `client`; `console.warn` si mismatch, `computedPrice` usado para `bookingInsert price: computedPrice` y `MP unit_price: computedPrice`
- Frontend `price` ignorado cuando server puede determinar; fallback a cliente si `hourlyRate 0` (no bloquea)

---

## Manipulation test

- **Test B:** `POST /api/bookings/create {price:1}` → `serverPrice` calculado (ej. 33000) ≠1 → `price manipulation blocked` log, `booking.price = serverPrice` (no 1) — PASS
- **Test C:** price mayor → igual ignorado, `computedPrice` usado
- **Test D:** omite `price` → `400 Missing required fields` (todavía requiere, pero si `priceSource` determinable, podría calcularse — documentado P1)
- **Test 1-5:** `server calculates price`, `booking.price = server price`, `MP uses booking.price` — ver `phase2E3.test.ts`

---

## Mercado Pago

`booking.price` (`computedPrice`) → `MP preferenceData.items[0].unit_price = computedPrice` (`1549`), `payer`, `back_urls ?booking_id`, `external_reference = booking.id` (`1512`), `notification_url` — `booking.price === MP amount` garantizado (server source).

---

## Booking

`bookings` `price: computedPrice`, `payment_id` set por webhook `UPDATE bookings SET payment_id = paymentId WHERE payment_id IS NULL` (atomic), `status pending → confirmed` solo tras `approved`.

---

## Meet

- **Cuándo:** Después de `approved` webhook, `if (shouldCreateAppointment)` (`2890`). **No antes**.
- **Fuente:** `bookings.meet_link` primary (idempotente `if (booking.meet_link) reuse`), `appointments.meet_link` mirror legacy, `lawyerProfile.meet_link` fallback
- **Failure:** `try/catch` log, no revert `confirmed`, `meet_link NULL` permitido, retry via `ensure meeting` (reuse check) — P1 futuro cron
- **Reuse:** `if (booking.meet_link) reused_existing`

---

## Meet failure

Booking permanece `confirmed`, `meet_link NULL` válido, no `failed`, retry idempotente.

---

## Email

- **Cuándo:** Después de `booking confirmed` + `ensure Meet` + `UPDATE bookings.meet_link` (`2925` Resend)
- **Orden:** `payment approved → booking confirmed → ensure Meet → update bookings.meet_link → send confirmation email` (con `meet_link` si existe)
- **Failure:** `catch` log, no revert payment/booking, `confirmed` permanece, retry manual/log
- **Contenido:** booking-first: abogado, fecha `scheduled_date`, hora `scheduled_time`, duración `duration`, servicio `service_title`, precio `bookings.price`/`computedPrice`, estado `confirmed`, pago `approved`, `meet_link` (si `requires_meeting`), instrucciones, soporte `soporte@legalup.cl` — `appointmentId` no usado

---

## Email failure

No revert, `confirmed` permanece, log, retry vía Resend manual.

---

## BookingSuccess

`BookingSuccessPage.tsx:36` `booking_id || external_reference` → `GET /api/bookings/:id` → muestra `lawyer`, `fecha`, `hora`, `duración`, `precio` (`booking.price`), `estado`, `Meet` si `bookings.meet_link` existe (ya no `El enlace te llegará` genérico, muestra link si `meet_link`). Legacy `?appointmentId` no usado para nuevo, pero `appointmentId` path sigue soportado en `server`/`netlify` (dual).

---

## Legacy

`appointmentId → payments.appointment_id → external_reference=paymentId` intacto (`server.mjs` `appointmentId` branch, `netlify` `appointmentId`/`consultation_id`). `appointments` 6 historic, `payments.appointment_id` 5 legacy, `external_reference=paymentId` legacy webhook path preservado.

---

## Tests

`src/__tests__/phase2E3.test.ts` 15 tests (server calculates price, manipulation blocked, booking.price, MP, bookingId external_reference, webhook, Meet, email, legacy, no new appointments, cross-tenant) — **PASS**

`full: 76 passed 2 skipped (1034 passed)` pre, `phase2E3` + `phase2E` etc.

---

## Build

`✓ built` (INEFFECTIVE_DYNAMIC_IMPORT preexistente)

---

## Typecheck

`EXIT 0` (`--skipLibCheck`, WARN `inbucket` preexistente)

---

## Sandbox

`BLOCKED` — `MERCADOPAGO_ACCESS_TOKEN` prod `APP_USR-...`, no `TEST-` sandbox, `VITE_MERCADOPAGO_SANDBOX=true` mismatch — no E2E `approved` real. Static PASS, E2E `BLOCKED` (requiere `TEST-`).

---

## Remaining P0/P1/P2

- **P0 closed:** price manipulation (server-side)
- **P1:** `BookingSuccessPage` mostrar `meet_link` directo si `bookings.meet_link` existe (ya), retry Meet/email cron, `price` omitido por cliente debería ser opcional (P1)
- **P2:** `appointments` mirror eventual deprecación, `admin/analytics` dual, `DashboardAppointments` fallback

---

## Next

**FASE 2F** — Consolidación final consumidores legacy (`DashboardAppointments` bookings-only, `netlify/create-payment` bookingId-first), 30-day no-write gate.
