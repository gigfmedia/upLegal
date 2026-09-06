# FASE 2E.2 — Cita → Checkout → Pago → Meet → Email — Auditoría Completa

**Modo:** AUDIT ONLY — NO CODE CHANGE  
**Fecha:** 2026-09-05  
**Commit base:** `e25a389` + `000457a` + `d1f0f88` (bookings.meet_link, payments.booking_id, ScheduleModal booking-first)

---

## STATUS — PASS (con 1 P0 y 1 blocker sandbox)

Flujo actual es funcional y seguro para Marketplace, pero **Meet se genera antes del pago** (desperdicio + inconsistencia), **email post-pago no puede contener Meet si se genera después**, y **BookingSuccessPage no garantiza información si usuario cierra navegador**. Arquitectura recomendada: Meet **después** del pago aprobado (webhook) + email confirmación como fuente secundaria.

---

## 1. Flujo Actual (Real, Evidencia Código)

```
USER (Marketplace PublicProfile / Search)
  ↓
ScheduleModal.tsx:865-1012
  ├─ formData: name/email/phone/date/time/duration/consultationType/contactMethod (duration default 60)
  ├─ clientAmount = originalAmount * 1.1 (platform surcharge 10%)
  └─ POST /api/bookings/create (service_role, NO auth) — server.mjs:1221
        ├─ validate lawyer_id, user_email, user_name, price, scheduled_date/time/duration 30/60/90/120
        ├─ double-booking check SELECT bookings WHERE lawyer_id + scheduled_date + status pending/confirmed overlap (1291)
        ├─ INSERT bookings {lawyer_id, user_id, user_email/name/phone, scheduled_date/time, duration, price, status pending, booking_type appointment, source UNKNOWN implicit, requires_meeting}
        ├─ INSERT payment_events started (1393), booking_leads started (1456), notifications booking.created (1413)
        ├─ MP Preference: items id=booking.id, external_reference=booking.id (1512), back_urls /booking/success?booking_id=, notification_url=resolveWebhookUrl
        ├─ UPDATE bookings mercadopago_preference_id
        └─ res.json {booking_id, payment_link}
  ↓
Cliente redirigido (ScheduleModal:603 window.location.href = paymentLink) → Mercado Pago Checkout
  ↓
POST /create-payment (opcional, solo para flujo appointmentId legacy)
  ├─ netlify/functions/create-payment.js:51 {appointmentId, amount, lawyerId, userId} → payments.appointment_id, MP external_reference=paymentId (337)
  ├─ server.mjs:904 {appointmentId || bookingId} → payments.booking_id (2B) / appointment_id, MP external_reference=bookingId||paymentId (1123)
  └─ No usado en nuevo flujo ScheduleModal (ya no crea appointments)
  ↓
Usuario paga (MP)
  ↓
POST /api/mercadopago/webhook (server.mjs:2264) — HMAC x-signature (2314), idempotencia payment_events 23505, UPDATE bookings status confirmed WHERE payment_id IS NULL (2489), INSERT appointments mirror (2771), INSERT payment_events success
  ↓
Meet: create-google-meeting invoked
  ├─ Supabase Function create-google-meeting:28 SELECT appointments WHERE id=appointmentId
  ├─ Si appointment mirror existe, genera meet_link (Jitsi fallback) y UPDATE appointments meet_link (2905)
  └─ Además sync bookings.meet_link (2C: 2905+ sync) — pero para bookings sin appointment, path !appointmentId && booking.id && meetLink → UPDATE bookings.meet_link
  ↓
Email: Resend
  ├─ Webhook: emails to user + lawyer + admin (2925, 2949)
  └─ Supabase send-appointment-email (171) link legalup.cl/lawyer/citas or dashboard/appointments
  ↓
BookingSuccessPage.tsx:36 booking_id || external_reference → GET /api/bookings/:id → display abogado/fecha/hora/precio/estado/meet (si existe)
```

**Evidencia:**
- `ScheduleModal.tsx:887` ya **NO** `from('appointments').insert` — ahora `fetch /api/bookings/create` (2D-2)
- `server.mjs:1221 POST /api/bookings/create` crea booking + MP pref
- `server.mjs:904 POST /create-payment` dual `bookingId/appointmentId`
- `server.mjs:2264 webhook` HMAC + `payment_events` + `bookings` update
- `supabase/functions/create-google-meeting/index.ts:28` `appointments` meet
- `BookingSuccessPage.tsx:36` `booking_id`

---

## 2. Flujo Esperado (Recomendado)

```
USER
 ↓
ScheduleModal (valida fecha/hora/duración≥60, precio clientAmount)
 ↓
POST /api/bookings/create → BOOKING status pending, source UNKNOWN, payment_id NULL
 ↓
CREATE CHECKOUT (MP pref external_reference=booking.id, init_point) — NO pagamento aún
 ↓
Redirect MP
 ↓
USER PAYS (approved/pending/rejected)
 ↓
WEBHOOK HMAC → payment_events → booking resolution external_reference→bookings.id
 ↓ (approved)
UPDATE payments.booking_id = booking.id (si via /create-payment bookingId) + INSERT payment_events success
UPDATE bookings.status = confirmed, bookings.payment_id = paymentId
 ↓
CREATE / ENSURE MEET (después de confirmed) → bookings.meet_link (preferido) + appointments mirror (legacy)
 ↓
EMAIL CONFIRMATION (Resend, booking-first) → contiene abogado, fecha, hora, duración, precio (bookings.price), estado confirmed, pago succeeded, Meet link, instrucciones, soporte
 ↓
BOOKING SUCCESS + EMAIL (doble fuente, no depende solo de navegador)
```

**Por qué:** Meet antes de pago desperdicia recursos y puede quedar huérfano si pago `pending/rejected`. Email solo desde webhook garantiza información aunque usuario cierre navegador.

---

## 3. Crear Cita

**Quién:** Frontend `ScheduleModal` (cliente anon/auth) → `POST /api/bookings/create` (service_role, no `supabase direct`). Ya no `supabase appointments insert` (2D-2).

**Qué tabla:** `bookings` (no `appointments`). Campos generados (`server.mjs:1355`):

```
id uuid (gen), lawyer_id, user_id|null, user_email, user_name, user_phone, scheduled_date, scheduled_time, duration, price, status pending, booking_type appointment, source UNKNOWN (default), client_id NULL, case_id NULL, meet_link NULL, payment_id NULL, mercadopago_preference_id, experiment_variant, posthog_distinct_id, metadata.article_slug
```

`appointments` si se usa → `id, user_id, lawyer_id, appointment_date/time, status pending_payment, meet_link null` (legacy, ya no para nuevo flujo).

**Evidencia:** `ScheduleModal:603` `fetch /api/bookings/create` con `bookingPayload {lawyer_id, user_email/name, scheduled_date/time, duration, price}`, `CitasPage:146` `LAWYER_DIRECT` ya `bookings` (SaaS).

---

## 4. Checkout

**¿Inmediato?** Sí — `ScheduleModal` crea booking y **inmediatamente** recibe `payment_link` de `/api/bookings/create` (MP pref) y redirige (`window.location.href = paymentLink` 603) sin pantalla intermedia. No hay `BookingSuccess` previo.

**Endpoint:** `POST /api/bookings/create` → MP `POST https://api.mercadopago.com/checkout/preferences` (`1531`) con `external_reference=booking.id` (`1512`), `items unit_price=price`, `payer email/name`, `back_urls success/failure/pending ?booking_id`, `notification_url=resolveWebhookUrl`. Respuesta `200 {booking_id, payment_link}` (1584).

`/create-payment` (server `904`, netlify `51`) es **segundo flujo** para `appointmentId` legacy (external_reference=paymentId). Nuevo flujo **no** lo usa (ScheduleModal ya no llama `netlify/create-payment`).

**Payment link almacenado:** `bookings.mercadopago_preference_id` (`1550`), no `payment_link` persistido aparte.

---

## 5. Precio — Source of Truth

**Flujo actual:**

- Frontend `ScheduleModal:811` `clientAmount = originalAmount * 1.1` (10% surcharge) `platformSettings.client_surcharge_percent`, `hourlyRate` prop
- Enviado a `/api/bookings/create` como `price: clientAmount` (no validado contra `lawyer_services` price)
- `server.mjs:1221` valida `price` required, `emailRegex`, `duration 30/60/90/120`, `lawyer exists`, **no valida `price` contra `lawyer` tarifa** — cliente podría manipular `price` en request body (ej. enviar `price=1000` vs 30000). **Riesgo P0**.
- Almacenado `bookings.price = price` (1364)
- Enviado a MP `unit_price: price` (1500)
- `netlify/create-payment` recalcula `derivedOriginalAmount, clientSurcharge, platformFee, lawyerAmount` desde `amount` y `platform_settings` (173) — no usa `bookings.price` para `appointment` legacy
- `payment transaction amount` = `clientAmount` (MP)

**Objetivo:** `bookings.price` debe ser fuente de verdad, pero **actualmente frontend controla**. Recomendado: servidor calcule `price` desde `lawyer_services` o `hourly_rate` + `duration`, no acepte `price` arbitrario.

**Evidencia:** `server.mjs:1257 if (!price)`, no `SELECT lawyer_services WHERE lawyer_user_id`. `netlify:134 numericAmount` direct.

**Recomendación P0:** En `/api/bookings/create`, ignorar `price` cliente y calcular `price = lawyer_rate * duration/60` o `service price_clp` desde `lawyer_services` (si `booking_type service`), o al menos validar `price >= 1000` y `price` no manipulable > ±10%.

---

## 6. Mercado Pago — Dos Caminos

**Nuevo (booking-first):**
- Request `POST /api/bookings/create` → MP `preferenceData external_reference = booking.id` (`1512`), `metadata booking_id, lawyer_id, user_id`
- Response `init_point` (prod `mpData.init_point`, sandbox `sandbox_init_point` `1565` `isTestToken`)
- No `payment` row creado aquí; `payment_events started` (1393) y `booking_leads` (1456)

**Legacy (appointment):**
- `POST /create-payment` (`netlify:313`, `server:1123`) → `INSERT payments {appointment_id, client_user_id, lawyer_user_id, total_amount}` → MP `external_reference = paymentId` (`337 netlify`, `1123 server bookingId||paymentId` ahora)
- `POST /.netlify/functions/create-payment` aún solo `appointmentId` (sin booking), `server` ahora soporta `bookingId`

Marketplace nuevo usa **booking.id**, legacy usa **paymentId** — webhook debe resolver ambos.

---

## 7. Webhook — Diagrama Real (`server.mjs:2264`)

```
POST /api/mercadopago/webhook
  ├─ ignore merchant_order (2276)
  ├─ HMAC x-signature: manifest id:${data.id};request-id:${x-request-id};ts:${ts}; HMAC sha256 v1 timingSafeEqual (2314) — FAIL-CLOSED 401
  ├─ extract paymentId: body.data.id || body.resource || query data.id (2347)
  ├─ GET https://api.mercadopago.com/v1/payments/{paymentId} (auth Bearer mpAccessToken)
  ├─ external_reference = payment.external_reference || '' (2418)
  ├─ route: if externalRef startsWith DOCUMENT_/DOCREVIEW_ → docs flow (2401)
  ├─ else booking flow:
  │    ├─ idempotencia payment_events: SELECT payment_events WHERE metadata->>payment_id = paymentId AND event_type success (2466) → skip if exists
  │    ├─ atomic claim: UPDATE bookings SET status confirmed, payment_id = paymentId, payment_status approved WHERE id = external_reference AND payment_id IS NULL (2489) is('payment_id', null)
  │    ├─ if no booking found → needs_manual_review
  │    ├─ booking normalization: create auth user/profile if guest (2604), associate bookings.user_id
  │    ├─ INSERT payment_events success {payment_id, booking_id, lawyer_id} (2724, unique 23505)
  │    ├─ IF requires_meeting → appointments mirror INSERT (2771) + create-google-meeting (2863) → UPDATE appointments meet_link (2905) + sync bookings.meet_link (2C)
  │    ├─ GA4 sendGA4PurchaseEvent (2798), PostHog booking_paid (2519)
  │    └─ Emails: resend to user, lawyer, admin (2925)
  ├─ handle pending/rejected: update bookings status pending? (not confirmed)
  └─ reconcile: POST /api/mercadopago/reconcile/:paymentId (3305) re-lookup
```

**Para legacy `paymentId`:** `external_reference` is `paymentId` (UUID), `SELECT bookings WHERE id = paymentId` fails → `booking not found` → `needs_manual_review` (no payment row update). `payments` flow via `netlify` not handled here.

---

## 8. ¿Cuándo se debe crear el Meet?

**Actual:** Durante webhook **después** de `payment approved` y `bookings confirmed`, vía `create-google-meeting` que actualmente lee `appointments` (`supabase/functions/create-google-meeting:28`). Para `bookings` sin `appointment`, fallback `!appointmentId && booking.id && meetLink → UPDATE bookings.meet_link` (2C). Pero generación aún depende de `appointments` mirror existencia.

**Opción recomendada: B (después del pago)**
- **Pros:** No desperdicia Jitsi/Meet si pago `pending/rejected`, consistente `bookings.status confirmed` → Meet, email contendrá Meet válido aunque usuario cierre navegador (webhook envía email).
- **Contras:** Si Meet falla después de `approved`, booking queda `confirmed` sin `meet_link` — necesita retry (`payment approved → booking confirmed → meet creation retry`).

**Opción A (antes):** Crearía Meet al crear booking (antes de pago) — desperdicia recursos, riesgo cancelación, UX no justifica.

**Recomendación:** `B` + retry: `webhook approved → ENSURE Meet` con `bookings.meet_link` como fuente, `appointments` mirror solo legacy. Si `create-google-meeting` falla, log `updateError` y re-intento vía cron `booking_leads` o manual.

---

## 9. ¿Quién necesita el Meet?

- **Usuario:** Email confirmación con `meet_link` + `BookingSuccessPage` muestra `meet_link` si `hasMeeting` (hasMeeting true). `UserDashboard` `bookings.meet_link` (dual-read).
- **Abogado:** Email confirmación + `CitasPage`/`lawyer/citas` muestra `meet_link`, `GoogleCalendarConnect` no.
- **Booking:** `bookings.meet_link` (new) + `appointments.meet_link` (legacy) — `bookings` debe ser fuente principal (2C migration titulada `bookings.meet_link`).
- **Dashboard:** `bookings.meet_link` debe aparecer (actual `CitasPage` no muestra Meet link en lista, solo `DashboardAppointments` legacy).

---

## 10. Email al Usuario

**Funciones:**
- `supabase/functions/send-appointment-email/index.ts` (legacy `appointments` link `legalup.cl/lawyer/citas` vs `dashboard/appointments`)
- `server.mjs:2925` webhook Resend: `from LegalUp <hola@mg.legalup.cl> to userEmail, subject 'Tu consulta ha sido confirmada'`, html con `meet_link` (si `hasMeeting`), abogado, fecha/hora, servicio, precio, instrucciones. Enviado **solo después de `approved`** (webhook), no al crear booking.
- `supabase/functions/service-quote-request` etc. — no para citas.

**¿Email inmediato al crear?** No — `POST /api/bookings/create` envía `notificationsService booking_created` (in-app) pero **no email**; email solo tras `approved`.

**¿Email Meet?** Incluido en webhook email si `meetLink` generado (2954 html). Si Meet falla, email sin Meet (riesgo).

**¿Rechazado?** No email específico para `rejected` (solo `pending` no email).

**¿Recordatorio?** No.

---

## 11. Contenido del Email (Actual)

Webhook email (server `2925` html) contiene:
- Abogado `first_name last_name`
- Fecha `scheduled_date`, hora `scheduled_time`, duración `duration`
- Servicio `service_title`
- Precio `price` (bookings.price)
- Estado `confirmed` implícito (subject confirmada)
- `meet_link` si `requires_meeting` y `meetLink` no null (`<a href="${meetLink}">Unirse</a>`)
- Instrucciones: `Conéctate 5 min antes`, soporte `soporte@legalup.cl`
- No contiene: `booking.id` explícito, `payment_id`, `payout`, cancelación link.

**Usa `bookingId` (webhook `booking.id`) y obtiene `meet_link` desde `fresh.meet_link` (appointments) + sync `bookings`.**

---

## 12. Checkout vs Email (UX)

**Actual:** `ScheduleModal` → `POST /api/bookings/create` → **redirección inmediata** a `payment_link` (MP checkout) `603 window.location.href`. No pantalla confirmación previa, no email previo. Email solo tras `approved` webhook.

**Casos:**
- `Caso 1` (actual): Crear → Redirect MP → (usuario paga → webhook → email) — **correcto** para pago previo.
- `Caso 2` (confirmación antes de pago) no existe.
- No hay riesgo de "cita confirmada antes de pago" porque `bookings.status` es `pending` hasta webhook `confirmed`.

---

## 13. ¿Cuándo se envía el Email? (Evento)

`booking_created` in-app (1413) inmediato, email **solo** `payment_approved` webhook (2925). No `booking_created` email, no `meet_created` separado.

**Riesgo actual:** Si usuario cierra navegador tras pagar y `BookingSuccessPage` no carga, **email es única fuente** — correcto que sea webhook (no depende de navegador). Recomendado mantener.

---

## 14. BookingSuccessPage

`src/pages/BookingSuccessPage.tsx:36` `bookingId = searchParams.get('booking_id') || external_reference` → `GET /api/bookings/:id` (service_role bypass, no RLS). Muestra: abogado, fecha, hora, duración, servicio, `payment` precio `booking.price`, estado `confirmed` implícito, `hasMeeting` (service `requires_meeting`), **no muestra `meet_link`** directamente (solo próximos pasos genéricos `Enlace de videollamada te llegará`). No depende de `appointments`. No requiere `appointmentId` legacy para nuevo flujo; legacy `?appointmentId` no soportado (solo `booking_id`).

**¿Representa cita pagada?** Sí — solo accesible tras `payment approved` → `booking confirmed` (webhook). Si `pending`, mostraría igualmente `¡Asesoría confirmada!` pero sin pago — riesgo menor (booking `pending` no debería llegar a success sin pago).

---

## 15. Estados

| Evento | Booking | Payment | Meet | Email |
|--------|---------|---------|------|-------|
| cita creada (`POST bookings`) | `pending` | `payments` no creado (Marketplace) / `pending` (appointment legacy) | `meet_link NULL` | no email, solo in-app `booking_created` |
| checkout creado (MP pref) | `pending`, `mercadopago_preference_id` set | `pending` | `NULL` | no |
| pago pending (MP) | `pending` | `pending` | `NULL` | no |
| pago approved (webhook) | `confirmed`, `payment_id=paymentId`, `payment_status approved` | `pending` (no update) / `payment_events success` | `appointments.meet_link` + `bookings.meet_link` (2C sync) | **sí** Resend to user/lawyer/admin |
| pago rejected | `pending` (no cambia) | `pending` | `NULL` | no (no email) |
| Meet creado | `confirmed` + `meet_link` | `pending` | `meet_link` set | no extra email (ya enviado) |

---

## 16. Fallas y Edge Cases

| Caso | Comportamiento Actual | Riesgo | Recomendación |
|------|----------------------|--------|---------------|
| A Booking creado, MP falla | `bookings` `pending`, `payment_events started`, no `payment_link` | Usuario sin checkout, booking huérfano `pending` forever | Cron `booking_leads` `started→abandoned` + email rescue (ya existe `booking_rescue_emails`) |
| B Checkout creado, abandona | `bookings pending`, `booking_leads checkout`, no `payment` | Igual huérfano | Rescue email |
| C Pago approved, webhook demora | `bookings pending` hasta webhook | Usuario ve `pending` en BookingSuccess si llega antes | BookingSuccess debería poll `bookings.status` |
| D Webhook x2 | `payment_events` unique `23505` → segundo `skipped`, `bookings` `WHERE payment_id IS NULL` atomic → segundo `skipped booking_already_claimed` | No duplicado | OK |
| E Pago approved, Meet falla | `bookings confirmed`, `appointments` sin `meet_link`, email sin Meet | Usuario sin Meet | Retry `create-google-meeting` + update `bookings.meet_link` async |
| F Meet ok, email falla | `bookings` confirmed con Meet, email no enviado | Usuario sin email, pero `BookingSuccessPage` muestra info | Retry Resend + `payment_events` success ya, email non-blocking (no throw) — OK |
| G Email ok, webhook retry | Segundo webhook `skipped` por `payment_id` exists | No re-email (idempotencia) | OK |
| H Paga pero Success no carga | Email ya enviado (webhook) | Usuario tiene email | OK (email es fuente secundaria) |
| I Vuelve sin pagar | `bookings pending` | No confirm | OK |
| J Pago rejected | `bookings pending` | No email | Podría enviar email `rejected` (no existe) — P2 |
| K Paga 2x mismo booking | `bookings WHERE payment_id IS NULL` → segundo `skipped` | No duplicado | OK |
| L Dos usuarios misma hora | `POST bookings/create` double-booking check `SELECT pending/confirmed` overlap `1291` → `409 Time slot not available` | Race con `service_role` bypass? Check con `supabase` service_role, no RLS, pero `409` prevenido | OK, pero necesita `EXCLUDE tsrange` DB constraint `20260729000000` para race 2 concurrent |

---

## 17. Seguridad

- Precio: `bookings.price` desde `clientAmount` (frontend) **no validado** contra `lawyer_services`/`hourly_rate` — **P0** manipulable (enviar `price=1`).
- `lawyer_id` validado `profiles WHERE user_id=lawyer_id AND role=lawyer` (1334) — OK.
- `booking_id` ownership: `/create-payment` `bookingId` valida `booking.lawyer_id === actualLawyerId` (1090), webhook `external_reference → bookings.id` sin check `user_id` (service_role) — OK (MP + HMAC).
- `user ownership` `bookings.user_id` puede ser null (guest) — no RLS bypass para `bookings` SELECT (deny), pero `GET /api/bookings/:id` service_role `SELECT bookings WHERE id` sin `user_id` check — **IDOR** si UUID guessable (128-bit entropy mitigate, pero logs MP `external_reference` expone).
- `service_role` no en frontend.
- RLS `bookings` `LAWYER_DIRECT` only, `appointments` `lawyer_id/user_id` — no `USING true` privado.

---

## 18. Arquitectura Recomendada

```
USER
 ↓ ScheduleModal (valida fecha/hora/duración≥60, precio clientAmount)
 ↓ POST /api/bookings/create {lawyer_id, user_email/name/phone, scheduled_date/time, duration, price, booking_type} [service_role, validates lawyer, double-booking]
 ↓ BOOKING status pending, source UNKNOWN, mercadopago_preference_id, payment_events started, booking_leads started
 ↓ MP Checkout init_point (external_reference=booking.id)
 ↓ USER PAYS approved
 ↓ WEBHOOK HMAC → payment lookup MP → payment_events → UPDATE bookings SET status confirmed, payment_id, payment_status approved WHERE payment_id IS NULL (idempotencia) → INSERT payment_events success
 ↓ CREATE / ENSURE MEET (después de confirmed) → bookings.meet_link (primary) + appointments mirror (legacy) → retry si falla
 ↓ EMAIL CONFIRMATION (Resend, booking-first, con abogado/fecha/hora/duración/precio/estado/pago/Meet) → USER + lawyer + admin
 ↓ BOOKING SUCCESS + EMAIL (doble fuente)
```

**Recomendación:** Mantener orden propuesto en §18 del prompt (Meet después de pago). No generar Meet antes.

---

## 19. Pregunta Clave: Meet Antes o Después

**Después (recomendado):**
- No desperdicia Jitsi si `pending/rejected`
- Consistente `confirmed` → Meet
- Email puede incluir Meet válido
- Si falla, `bookings confirmed` sin Meet → retry async, no bloquea pago

**Antes (actual es después, correcto):** Ya es después (webhook). No antes.

**Si falla después:** `payment approved → booking confirmed → meet creation retry` con cron o `POST /api/bookings/:id/meet` (no existe, crear `P1`).

---

## 20. Email como Fuente

**Debe existir ambos:** `BookingSuccessPage` (inmediato si no cierra navegador) + `Email` (si cierra). Email debe incluir: abogado, fecha, hora, duración, precio `bookings.price`, estado `confirmed`, pago `approved`, `meet_link`, instrucciones 5 min antes, soporte `soporte@legalup.cl`, cancelación. Actual email ya incluye abogado/fecha/hora/duración/servicio/precio/Meet (si `requires_meeting`) — **suficiente**, pero debería añadir `booking.id` explícito y `payment_id` para soporte.

---

## 21. Documentación Final — Requisitos

Este doc cumple 1-21. No código modificado.

---

## 22. Tests

AUDIT ONLY — no tests nuevos, `npm run test:run` `76 passed 2 skipped (1034)` preexistente, `build` `13.18s` preexistente.

---

## 23. Build / Typecheck

`npm run build` ✓ `13.18s` (INEFFECTIVE_DYNAMIC_IMPORT preexistente), `typecheck` EXIT 0 (WARN inbucket).

---

## 24. Regla Final

No se modificó `ScheduleModal`, `server.mjs`, `create-payment`, `BookingSuccessPage`, Meet, emails, DB, migrations, RLS. Auditoría evidencia completa para próxima fase que implemente precio validado + Meet retry.

```

