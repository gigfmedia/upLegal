# FASE 2C-2 — Consolidación de Consumidores de `appointments`

**Modo:** AUDIT + IMPLEMENTATION (minimal, no DROP)  
**Fecha:** 2026-09-05  
**Previo:** `20260909000000_bookings_meet_link.sql` (meet_link), `CitasPage` ya `bookings`

---

## 1. Consumers Antes

| Archivo | Operación | Usuario | Flujo | ¿Puede migrarse? |
|---------|-----------|---------|-------|------------------|
| `CitasPage.tsx:222` | SELECT/INSERT `bookings` | lawyer | SaaS LAWYER_DIRECT | Ya migrado — no |
| `ScheduleModal.tsx:739,888` | SELECT/INSERT `appointments` | client | Marketplace pending_payment | No — Marketplace legacy |
| `UserDashboard.tsx:278,383,405` | SELECT `appointments` | client | SaaS+legacy | **Sí** — dual-read |
| `DashboardAppointments.tsx:109` | `appointmentsApi.list` | client/lawyer | Legacy | No — queda legacy, doc |
| `EarningsPage.tsx:96` | SELECT `appointments` fallback | lawyer | Revenue legacy | **Sí** — ya dual (bookings primary) |
| `admin/analytics.tsx:305,500,558,604` | SELECT `appointments`+`bookings` | admin | Analytics dual | No — histórico |
| `lib/api.ts:149` | CRUD `appointments` | both | Helper legacy | No — marcar deprecated |
| `reviews/*:118,475` | SELECT `appointments` | both | Review eligibility | No — legacy |
| `create-google-meeting:28` | SELECT/UPDATE `appointments` `meet_link` | backend | Meet store | Sí sync → `bookings.meet_link` |
| `netlify/create-payment.js:226` | SELECT `appointments` | backend | Payment verify | No — legacy |

---

## 2. Consumers Migrados (2C-2)

- **UserDashboard.tsx** — `ClientDashboardContent` ahora dual-read: `appointments` (legacy) + `bookings WHERE user_id=uid AND booking_type=appointment`. Normaliza `bookings` a shape `appointment_date/time` y merge `[...bookings, ...appointments]` con `getAppointmentDateTime`. `fetchData` y `fetchDashboardData` (nextAppointment) ambos dual. RLS: `user_id=auth.uid()` tenant-safe. `bookings` primary, `appointments` fallback.
- **EarningsPage.tsx** (ya en 2C) — `payments.booking_id → bookings` primary, `appointments` fallback.
- **server.mjs webhook** — sync `bookings.meet_link` tras `appointments` update.

---

## 3. Consumers que Permanecen Legacy (por qué)

- `ScheduleModal.tsx` — Marketplace `pending_payment` insert `appointments` con `user_id=client`, `lawyer_id`. Migrar a `bookings` cambiaría `POST /api/bookings/create` (service_role) y rompería Mercado Pago `external_reference=paymentId`. Clasificado **Marketplace legacy write = preserved**.
- `DashboardAppointments.tsx` — `appointmentsApi` (client/lawyer) — queda legacy; no se crea nueva dependencia `appointments` para features nuevos.
- `lib/api.ts appointmentsApi` — 0 consumidores nuevos SaaS, pero `DashboardAppointments` aún lo usa → documentado `DEPRECATED`.
- `admin/analytics`, `reviews`, `netlify/create-payment`, `create-google-meeting` appointment fallback — histórico, se mantienen hasta 2D.
- Todos con RLS `lawyer_id/user_id` (2A) — seguro.

---

## 4. Escrituras Restantes

| Tabla | Escritura | Estado | Origen |
|-------|-----------|--------|--------|
| `appointments` INSERT | `ScheduleModal:888` `user_id=uid` | **ACTIVE WRITE** (Marketplace) | Marketplace |
| `appointments` UPDATE `meet_link` | `create-google-meeting:226` + `server.mjs:2905` | ACTIVE WRITE (webhook) | Marketplace/Meet |
| `bookings` INSERT | `CitasPage:146` `lawyer_id=uid source LAWYER_DIRECT` + `server.mjs:1512` `UNKNOWN` | ACTIVE WRITE | SaaS + Marketplace |
| `bookings` UPDATE `meet_link` | `server.mjs` sync (new) | ACTIVE WRITE | Webhook |
| `bookings` | No new `appointments` writes from SaaS | **NEW SaaS writes = 0** | 2C goal met |

---

## 5. User Dashboard

- **Antes:** solo `appointments WHERE user_id`
- **Después:** dual `appointments` + `bookings WHERE user_id AND booking_type=appointment`, merge, `status` mapping `bookings.status` → UI `scheduled/confirmed` (no conversión automática, `UNMAPPED` si `pending_meet_link` → `pending`). `meet_link` desde `bookings.meet_link` preferido.
- **RLS:** `user_id=auth.uid()` para ambos; `lawyer A ≠ client B` validado.

---

## 6. Meet

- **Antes:** `appointments.meet_link` store, `create-google-meeting` `SELECT/UPDATE appointments`.
- **Después:** `bookings.meet_link` existe (09000000), webhook sync `bookings.meet_link` tras `appointments` update, y fallback `!appointmentId && booking.id && meetLink` → `bookings`. Nuevos SaaS `bookings` pueden recibir `meet_link` directo. `appointments` sigue para legacy.

---

## 7. Reviews

- `LawyerReviewsSection:118`, `PublicProfile:475`, `ReviewPage:57` → `SELECT appointments WHERE lawyer_id` para eligibility. **Permanece legacy** — no existe `booking → review` FK determinística. No heurística `email+fecha`.

---

## 8. Admin / Analytics

- `admin/analytics.tsx:500,558,604` dual `appointments`+`bookings` — conserva histórico. Métrica `appointmentsWithoutPayments` (`server.mjs:7184`) legacy, no migrada.

---

## 9. ScheduleModal

- **Clasificación:** Marketplace scheduling (client `user_id` → `lawyer_id`), no SaaS LAW YER_DIRECT. `INSERT appointments status pending_payment` + `POST /create-payment external_reference=paymentId`. No migrado — reescritura grande rompería Mercado Pago. Documentado como **Marketplace legacy write = preserved**, nuevas features SaaS deben usar `bookings` (CitasPage).

---

## 10. Payments

- `payments.booking_id` (2B) intacto, `payments.appointment_id` intacto, `external_reference=paymentId` para appointment legacy y `=booking.id` para Marketplace. `create-payment` no tocado (preserva `appointment_id`). Test `phase2B` FK 0 linked, `phase2C` no heurística.

---

## 11. Dual Read

- `EarningsPage` y `UserDashboard` usan `bookings → primary, appointments → legacy fallback`. No join heurístico (`email/amount/date` prohibido), solo `id` FK.

---

## 12. Seguridad

- `UserDashboard` `bookings.user_id=uid` + `appointments.user_id=uid` → `Client A ≠ Client B`.
- `DashboardAppointments` `appointmentsApi` filtra `lawyer_id===uid` / `client_id===uid` en JS + RLS `lawyer_id/user_id`.
- `bookings.meet_link` hereda `bookings` RLS `LAWYER_DIRECT` (no `USING true`).
- No `USING true` en privados.

---

## 13. Tests

- `phase2C.test.ts` 8 tests + `phase2C2.test.ts` (new) — UserDashboard dual-read, bookings.meet_link, no new `appointments` writes for SaaS, tenant isolation.
- `npm run test:run` 71 passed, `phase2C2` + `phase2C` pass.

---

## 14. Build/Typecheck

- `npm run build` ✓ 6.58s, `typecheck` EXIT 0 (WARN inbucket preexistente).

---

## 15. Criterios para eliminar `appointments`

Ver `docs/FASE-2C-APPOINTMENTS-DEPRECATION.md` §10 — requiere 30 días sin writes, `payments` 100% `booking_id`, `ScheduleModal` migrado, `UserDashboard`/`DashboardAppointments` solo `bookings`, etc. **No DROP en 2C-2**.

