# FASE 2E.1 — Mercado Pago E2E Sandbox Certification

**Modo:** EXECUTION / QA CERTIFICATION  
**Fecha:** 2026-09-05 21:45 UTC  
**Status:** **BLOCKED** — Sandbox no disponible (credenciales producción)

---

## STATUS — BLOCKED

No se pudo ejecutar pago REAL en Mercado Pago Sandbox por falta de token TEST. Implementación booking-first auditada y verificada estáticamente, pero certificación E2E con `approved` requiere `MERCADOPAGO_ACCESS_TOKEN` TEST.

---

## Environment (sin secretos)

- **Frontend URL:** `http://localhost:3001` (`VITE_APP_URL`, `FRONTEND_URL`)
- **Backend URL:** `http://localhost:3000` (`VITE_API_BASE_URL`, `VITE_API_URL`)
- **Mercado Pago env:** `production` (`MERCADOPAGO_ENV=production`, `VITE_MERCADOPAGO_ENV=production`)
- **Token utilizado:** `APP_USR-...` (prod, `MERCADOPAGO_ACCESS_TOKEN`, `VITE_MERCADOPAGO_ACCESS_TOKEN`) — **no TEST**
- **Sandbox flag:** `VITE_MERCADOPAGO_SANDBOX=true` (mismatch: flag sandbox true pero token prod)
- **Webhook URL:** `https://uplegal-service.onrender.com/api/mercadopago/webhook` (`MERCADOPAGO_WEBHOOK_URL`, `resolveWebhookUrl` fallback `VITE_API_BASE_URL`)
- **Supabase:** `https://lgxsfmvyjctxehwslvyw.supabase.co` (anon + service_role `sb_secret_...` válido)

---

## Test — Fecha/hora

Intento 2026-09-05 21:40 UTC — no se ejecutó flujo navegador real por blocker sandbox. Se ejecutó auditoría estática + smoke `bookings` + `appointments` counts.

---

## IDs (no sensibles, no generados por falta de pago)

- `booking_id`: (no creado en este intento — smoke previo `58 bookings` incluye 1 de prueba, no de este flujo)
- `payment_id`: (no creado — requiere MP TEST)
- `external_reference`: (no generado)

No se exponen tokens, tarjetas, CVV.

---

## Before

Query `SELECT count(*) FROM appointments` → `6`  
`SELECT count(*) FROM bookings` → `58` (57 + 1 test)  
`SELECT count(*) FROM payments` → `5`

Para nuevo booking Marketplace esperado:
```
status = pending
booking_type = appointment
source = UNKNOWN
payment_id = NULL
client_id = NULL
case_id = NULL
```

---

## Payment (no ejecutado)

Mercado Pago status: **BLOCKED** — token `APP_USR-...` es producción. Flag `VITE_MERCADOPAGO_SANDBOX=true` sugeriría sandbox, pero `server.mjs:1564 isTestToken = mpToken.startsWith('TEST-')` → `false` → usa `init_point` prod, no `sandbox_init_point`. Sin `TEST-` token, no se puede crear `approved` sandbox sin riesgo de cobro real.

Confirmado `external_reference` esperado para nuevo flujo: `booking.id` (server `server.mjs:1123 bookingId || paymentId`, `netlify:337 isBooking ? bookingId : paymentId`). Legacy `paymentId` preservado.

---

## Webhook

No recibido (no hubo pago approved). Verificación estática:
- HMAC `x-signature` (`server.mjs:2314` timingSafeEqual) — intacto
- `payment_events` idempotencia `23505` — intacto
- Resolución `external_reference → bookings.id` (`server.mjs:2486 is('payment_id', null)` + `payment_events` check) — implementado

---

## After (sin pago)

No se modificó `bookings.status` a `confirmed` (requiere webhook approved). `bookings.payment_id` permanece `NULL` para pending, `payments.booking_id` permanece `NULL` para 5 legacy (verificado `SELECT count(booking_id) =0`).

---

## BookingSuccess

`BookingSuccessPage.tsx:36` `searchParams.get('booking_id') || external_reference` — soporta `booking_id` y legacy `appointmentId` (via `external_reference`). Verificado estático, no QA navegador real por blocker.

---

## APPOINTMENTS — Critical Check

`COUNT appointments` antes `6` → después `6` (no se ejecutó nuevo `supabase appointments INSERT` en flujo booking-first; `ScheduleModal` ahora `POST /api/bookings/create` — verificado `src/components/ScheduleModal.tsx` no contiene `from('appointments').insert`). `appointments nuevos = 0` para nuevo flujo (static).

---

## Automated Tests

`src/__tests__/phase2E1.test.ts` 12 tests — **PASS** (static, no live MP):
- booking-first payment flow
- payments.booking_id
- external_reference = booking.id
- webhook resolves booking
- booking confirmed
- payment_events idempotency
- no new appointments
- price source booking
- cross-tenant
- BookingSuccessPage booking_id/appointmentId
- marketplace endpoint
- legacy intact

`full suite: 75 passed 2 skipped (1002 passed)` — `phase2E1` + `phase2E` + `phase2D` etc.

---

## Build

`npm run build` ✓ 5.51s

---

## Typecheck

`EXIT 0` (`--skipLibCheck`, WARN `supabase.ts:1 inbucket` baseline)

---

## Remaining Risks

- Sandbox TEST token ausente — no validación `approved` real, no `payment_events` nuevo, no `bookings.status confirmed` E2E.
- `appointments` 6 historic, `DashboardAppointments` aún fallback `appointments` (dual-read), no 30-day gate aún.

---

## Recommendation

1. Proveer `MERCADOPAGO_ACCESS_TOKEN=TEST-...` + `VITE_MERCADOPAGO_ACCESS_TOKEN=TEST-...` sandbox y `MERCADOPAGO_WEBHOOK_URL` accesible desde MP (ngrok o staging).
2. Re-ejecutar `ScheduleModal → bookings → bookingId → create-payment → MP sandbox approved → webhook → bookings confirmed → BookingSuccessPage` con `bookingId` y verificar `appointments nuevos =0`.
3. No hacer `DROP appointments` hasta 30-day no-write + `payments` 100% `booking_id` (actual 0/5).

---

## IDs (si se ejecuta)

Cuando se disponga de TEST token, registrar:
```
booking_id: <uuid>
payment_id: <uuid>
external_reference: <booking_id>
payment_events: 1
booking.status: confirmed
booking.payment_id: <payment_id>
payments.booking_id: <booking_id>
appointments nuevos: 0
```

**BLOCKER:** `MERCADOPAGO_ACCESS_TOKEN` TEST requerido. Proporcionar `TEST-...` y `MERCADOPAGO_WEBHOOK_SECRET` sandbox, y exponer `http://localhost:3000/api/mercadopago/webhook` vía `ngrok` o `uplegal-service.onrender.com` accesible.
