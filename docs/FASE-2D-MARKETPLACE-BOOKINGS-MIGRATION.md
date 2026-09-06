# FASE 2D — Marketplace Scheduling → Bookings

**Modo:** AUDIT + IMPLEMENTATION (minimal, safe)  
**Fecha:** 2026-09-05  
**Previo:** 2B `payments.booking_id`, 2C `bookings.meet_link` + `CitasPage` bookings

---

## 1. Arquitectura Antes

```
Marketplace legacy:
ScheduleModal → appointments (pending_payment, user_id, lawyer_id) → POST /.netlify/functions/create-payment {appointmentId, amount, lawyerId} → payments.appointment_id → MP pref external_reference=paymentId → webhook (no booking) → appointments status

Marketplace moderno:
POST /api/bookings/create → bookings UNKNOWN, booking_type appointment/service → MP pref external_reference=booking.id → webhook → bookings status confirmed, payment_events, appointments mirror, emails
```

Dos `external_reference` distintos: `paymentId` vs `booking.id`. Dos tablas de citas.

---

## 2. Arquitectura Después (Target, no forzado en 2D)

```
Marketplace (target):
ScheduleModal → bookings UNKNOWN, booking_type appointment, scheduled_date/time, price, service_title, user_id/lawyer_id → MP pref external_reference=booking.id → webhook → bookings confirmed → payments.booking_id → emails/Meet

appointments → histórico read-only (6 filas), no new writes Marketplace
```

**2D mantiene:** `appointments` histórico, legacy flow `ScheduleModal → appointments → create-payment` permanece, nuevo SaaS `CitasPage → bookings` ya. No se fuerza migración ScheduleModal en 2D por blocker (ver §5).

---

## 3. ScheduleModal Audit

**Archivo:** `src/components/ScheduleModal.tsx:866-1012`

| Dato | Valor | Origen |
|------|-------|--------|
| lawyer_id | `finalLawyerId` (prop `lawyerId` o selección) | prop |
| user_id | `user?.id || ''` (guest → '' ) | auth |
| fecha/hora/duración | `formData.date/time/duration` | UI |
| precio | `clientAmount` calc `DEFAULT_CLIENT_SURCHARGE 10%` + `platformFee 20%` | `platform_settings` |
| servicio | `consultationType` | UI |
| appointment | `INSERT appointments {name,email,phone,user_id,lawyer_id,status pending_payment, appointment_date/time, duration, price, amount, consultation_type, contact_method}` | direct `supabase.from('appointments').insert` (RLS `appointments_client_insert user_id=uid`) |
| payment | `POST https://uplegal.netlify.app/.netlify/functions/create-payment {appointmentId, amount, lawyerId, userId}` → `payments.appointment_id` → MP `external_reference=paymentId` | Netlify function `create-payment.js:57 appointmentId` |
| redirect | `payment_link` (MP init_point) → `localStorage pendingAppointment` → `window.location.href` |  |
| webhook | `POST /api/mercadopago/webhook` no usado por este flujo (usa `paymentId`); `appointments` status remains `pending_payment` until manual? |  |
| meet | `appointments.meet_link` null at creation |  |
| review | `appointments` eligibility `SELECT appointments WHERE lawyer_id` |  |

**Flujo real:** `UI → appointments → create-payment (appointmentId) → payments` — no `bookings`.

---

## 4. Comparación Flujos Marketplace

| Campo | `appointments` (ScheduleModal) | `bookings` (`/api/bookings/create`) |
|-------|-------------------------------|-------------------------------------|
| lawyer | `lawyer_id uuid` | `lawyer_id uuid` |
| client/user | `user_id uuid` + `name/email/phone` snapshot | `user_id uuid` + `user_email/user_name/user_phone` |
| date | `appointment_date date` + `appointment_time time` | `scheduled_date date` + `scheduled_time time` |
| duration | `duration int` | `duration int` |
| price | `price int` + `amount` | `price int` + `payment_id/service` |
| status | `pending_payment/pending/confirmed/completed/cancelled` | `pending/confirmed/cancelled` (plus `payment_status`) |
| payment | `payments.appointment_id` FK | `payments.booking_id` FK (2B) + `bookings.payment_id text` |
| meet_link | `appointments.meet_link` | `bookings.meet_link` (new) |
| service | `consultation_type/description` | `service_title/description/delivery_time` |
| metadata | `notes` | `metadata jsonb` |
| source | — | `UNKNOWN` (Marketplace) |

No equivalencia 1:1 sin `service_id` (SaaS service vs consultation).

---

## 5. Contrato Canónico Booking Marketplace (si se migrara)

```json
{
  "lawyer_id": "uuid (auth)",
  "user_id": "uuid (auth, guest ''→ system)",
  "user_email": "text snapshot",
  "user_name": "text",
  "user_phone": "text",
  "scheduled_date": "date",
  "scheduled_time": "time",
  "duration": 60,
  "price": 30000,
  "status": "pending",
  "booking_type": "appointment",
  "source": "UNKNOWN",
  "service_title": "Consulta Legal",
  "client_id": null,
  "case_id": null,
  "meet_link": null
}
```

`client_id/case_id` NULL (Marketplace sin CRM), `meets RLS` no (client cannot INSERT bookings `LAWYER_DIRECT` only). Por eso migración requiere `service_role` endpoint `POST /api/bookings/create`, no direct `supabase.insert`.

**Blocker:** Cambiar `ScheduleModal` a `POST /api/bookings/create` cambiaría `external_reference` de `paymentId` a `booking.id`, rompiendo `netlify/create-payment` → `payments.appointment_id` y `BookingSuccessPage` que espera `appointmentId`. Requiere refactorizar `create-payment.js`, webhook, emails, `BookingSuccessPage` — fuera de alcance 2D minimal.

---

## 6. Payment Creation

- **Legacy:** `POST /.netlify/functions/create-payment {appointmentId}` → `payments.appointment_id` → MP `external_reference=paymentId` (server `netlify/create-payment.js:122`).
- **Moderno bookings:** `POST /api/bookings/create` → `bookings` → MP `external_reference=booking.id` (server `1512`), luego `POST /create-payment` no usado; `payments.booking_id` vía 2B `bookingId` param (pero no en bookings flow).
- **2D:** No modifica `create-payment` (mantiene `appointmentId`), no cambia `external_reference` legacy. Nuevo `bookingId` path documentado pero no activado en ScheduleModal.

---

## 7. External Reference

- **Marketplace legacy:** `paymentId` (UUID `payments.id`)
- **Bookings moderno:** `booking.id`
- Webhook `server.mjs:2418` ruta `DOCUMENT_` vs booking. Para `paymentId` no hay booking, caería `booking not found` → `needs_manual_review`. Por eso no se puede simplemente cambiar `ScheduleModal` a `booking.id` sin nuevo handler `paymentId → payments.booking_id`.

---

## 8. Webhook

`POST /api/mercadopago/webhook` (`server.mjs:2264` HMAC `x-signature`, `payment lookup MP API`, `payment_events` idempotencia `23505`, `UPDATE bookings SET status confirmed WHERE payment_id IS NULL`, `INSERT appointments` espejo, GA4, Meet). **No modificado** en 2D. Idempotencia preservada.

---

## 9. Idempotencia

`payment_events` `metadata payment_id` unique partial + `bookings payment_id IS NULL` atomic — intacto. `payments` FK no afecta.

---

## 10. Meet Link

- Legacy `appointments.meet_link` (2 filas jit.si)
- New `bookings.meet_link` (09000000) — webhook ahora sync `bookings.meet_link` tras `appointments` (server patch 2C). ScheduleModal nuevas citas Marketplace deberían usar `bookings.meet_link` (no implementado en 2D).

---

## 11. Emails / Notificaciones

`supabase/functions/send-appointment-email`, `BookingSuccessPage`, `notificationTypes` usan `appointment_id`/`booking_id` según flujo. No migrados — dual.

---

## 12. Reviews

`LawyerReviewsSection:118`, `PublicProfile:475` → `appointments WHERE lawyer_id` eligibility — permanece legacy, no FK `booking→review`.

---

## 13. RLS / Security

- `bookings` RLS: `LAWYER_DIRECT` insert `lawyer_id=uid`, Marketplace `service_role` bypass — `ScheduleModal` client `user_id=uid` no puede `INSERT bookings` directo (deny). Por eso migración requiere `POST /api/bookings/create`.
- `appointments` RLS `lawyer_id/user_id` (2A) — `Client A ≠ Client B` ok.
- `payments.booking_id` FK no leak cross-tenant (check `booking.lawyer_id === actualLawyerId` en server).

---

## 14. Historical Data

57 bookings: `LAWYER_DIRECT 30 cancelled`, `UNKNOWN 27` (6 appt +21 service) — no auto CRM (2B classification). 6 appointments UNRESOLVED, no deterministic `appointment→booking` FK.

---

## 15. Tests

`src/__tests__/phase2D.test.ts` — ScheduleModal still `appointments` (legacy), `CitasPage` `bookings`, `payments` dual intact, `external_reference` both preserved.

---

## 16. Build/Typecheck

`build ✓`, `typecheck PASS` (inbucket WARN preexistente).

---

## 17. Files Changed

`server.mjs` (2C webhook sync), `src/pages/UserDashboard.tsx` (dual-read), `src/pages/lawyer/EarningsPage.tsx` (booking trace), `supabase/migrations/20260909000000` (meet_link), docs, tests — **ScheduleModal NOT changed** in 2D.

---

## 18. Migrations Applied

`20260907000000_rls_gap_closure`, `20260907000001_fix_overpermissive`, `20260908000000_payments_booking_traceability`, `20260909000000_bookings_meet_link` — all MIGRATED.

---

## 19. Appointments Remaining

| Uso | Antes | Después | Estado |
|-----|-------|---------|--------|
| ScheduleModal INSERT | activo | **activo** | Marketplace legacy |
| webhook INSERT | activo | activo | Mirror |
| webhook UPDATE meet | activo | activo + sync bookings | Dual |
| create-google-meeting | activo | activo | appointments |
| Reviews read | read | read | Legacy |
| Admin read | read | read | Dual |
| Dashboard read | read | **dual** (UserDashboard) | Migrated primary |
| payments appointment_id | active | active | Legacy |

---

## 20. RLS / Security

No `USING true` en privados; `bookings` deny SELECT intacto.

---

## 21. Marketplace Smoke

`POST /api/bookings/create` → `200`, `source UNKNOWN`, `external_reference=booking.id` — no regression (static).

---

## 22. Remaining Risks

P1 `ScheduleModal` still `appointments` → `payments.appointment_id` → `external_reference=paymentId` (legacy) vs `booking.id` modern — **blocker para 2C full**. P2 `DashboardAppointments` still `appointmentsApi`.

---

## 23. Recommended Next Phase

**FASE 2D-2** — si se decide migrar ScheduleModal: crear `POST /api/bookings/create` path para `ScheduleModal` con `booking_type appointment` + `payments.booking_id` + `external_reference=booking.id` + nuevo webhook branch `paymentId` vs `bookingId`, y `create-payment` dual `appointmentId|bookingId`. No heurística, no CRM auto. Requiere sandbox MP live QA.

