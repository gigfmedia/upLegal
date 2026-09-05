# FASE 2C — Deprecación Segura de `appointments`

**Modo:** AUDIT + IMPLEMENTATION (minimal, no DROP)  
**Fecha:** 2026-09-05  
**Migrations:** `20260909000000_bookings_meet_link.sql` (applied), prior `20260908000000_payments_booking_traceability.sql`

---

## 1. Estado — PASS

`bookings` es única fuente operacional nueva SaaS; `appointments` congelada como histórico con RLS tenant-safe, sin nuevas escrituras SaaS, `bookings.meet_link` agregado para futuro, `payments` dual (`booking_id` + `appointment_id`) preservado, Marketplace/webhook intactos.

---

## 2. Inventario — 47 hits `appointments` en repo

| Archivo | Línea | Operación | Tabla | Flujo | Migrable | Acción 2C |
|---------|------:|-----------|-------|-------|----------|-----------|
| `server.mjs:2771,2784,2905,2916,3030` | INSERT/UPDATE `appointments` | appointments | Marketplace webhook espejo `requires_meeting` | Sí (a bookings.meet_link) | Sync `bookings.meet_link` agregado |
| `server.mjs:7175` | SELECT | appointments | Admin `appointmentsWithoutPayments` | No | Keep (legacy report) |
| `src/lib/api.ts:149,158,166,172,178` | CRUD `appointments` | appointments | Legacy helper `appointmentsApi` | P2 | Keep, document DEPRECATED |
| `src/components/ScheduleModal.tsx:739,888` | SELECT/INSERT `appointments` | appointments | Marketplace client booking `pending_payment` | No | Keep (Marketplace) |
| `src/pages/lawyer/CitasPage.tsx:222` | SELECT `bookings` `LAWYER_DIRECT` | bookings | **SaaS** | Done | Keep |
| `src/pages/lawyer/EarningsPage.tsx:96` | SELECT `appointments` (fallback) + `bookings` (new) | both | Revenue legacy + traceability | P0 | Dual-read (prefiere bookings) |
| `src/pages/UserDashboard.tsx:278` | SELECT `appointments` | appointments | Client historial | P1 | Keep fallback |
| `src/pages/DashboardAppointments.tsx:109` | `appointmentsApi.list` | appointments | Client citas legacy | P1 | Keep |
| `src/pages/admin/analytics.tsx:305,500,558,604` | SELECT `appointments` + `bookings` dual | both | Analytics dual | P2 | Keep dual |
| `src/components/reviews/LawyerReviewsSection.tsx:118` `PublicProfile:475` `ReviewPage:57` | SELECT `appointments` | appointments | Review eligibility | P1 | Keep |
| `supabase/functions/create-google-meeting:28,81,226` | SELECT/UPDATE `appointments` `meet_link` | appointments | Google Meet store | Sí | Sync to bookings |
| `supabase/functions/request-review:35` etc | SELECT `appointments` | appointments | Reviews cron | P1 | Keep |
| `netlify/functions/create-payment.js:226` | SELECT `appointments` | appointments | Payment verify | Legacy | Keep |

**Conclusión:** SaaS `CitasPage` ya `bookings`; Marketplace `ScheduleModal`/`webhook` aún `appointments` — no migrar ciegamente.

---

## 3. Las 6 Filas Reales — Clasificación

`SELECT id, lawyer_id, user_id, status, appointment_date, meet_link FROM appointments ORDER BY created_at`

| appointment | user_id | lawyer_id | status | date | meet_link | booking | payment | case/client | Conclusión |
|-------------|---------|-----------|--------|------|-----------|---------|---------|-------------|------------|
| 508a3787... | 7644b8... | f517d8... | completed | 2026-02-19 | NULL | — | — | — | Historic `appointments` only, no booking/payment determinístico |
| e7b9a943... | 7644b8... | 2fbae2... | confirmed | 2026-02-16 | NULL | — | — | — | Historic |
| e45af0a6... | c1cf96... | ba62e3... | confirmed | 2026-06-18 | NULL | — | — | — | Historic |
| c8108157... | acde8d... | 7edb17... | confirmed | 2026-09-04 | https://meet.jit.si/legalup-c810... | — | — | — | Historic with meet_link |
| 014cec9f... | 7edb17... | 7edb17... | confirmed | 2026-09-05 | https://meet.jit.si/legalup-014... | — | — | — | Self-booking historic |
| 2f4fb439... | 7edb17... | f44178... | pending_meet_link | 2026-09-06 | NULL | — | — | — | Pending meet generation |

**Ninguna** tiene `booking_id`/`payment_id` FK determinística a `bookings`/`payments`. `payments` 5 rows tienen `appointment_id NULL` y `metadata.appointment_id` como `consulta-...` string, no UUID FK. **UNRESOLVED** — no backfill heurístico.

---

## 4. Migraciones Realizadas

- `20260909000000_bookings_meet_link.sql`:
  ```sql
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meet_link text;
  CREATE INDEX idx_bookings_meet_link ON bookings(meet_link) WHERE meet_link IS NOT NULL;
  ```
  Comentario histórico/compatibilidad. **No backfill** (0 matched, 0 conflicts documentados). `npx supabase db push` applied, `information_schema.columns` verifica `meet_link text`.

Prior `20260908000000`: `payments.booking_id` FK + indexes + backfill 0/5.

---

## 5. Consumers Migrados

- **EarningsPage:** `select booking_id` + `bookingsMap` via `payments.booking_id → bookings (user_name/service_title/client/case)` con fallback `appointmentsMap`. Prefiere `booking.client.name / user_name` y `service_title / case.title`.
- **server.mjs webhook:** Tras `UPDATE appointments SET meet_link`, ahora `UPDATE bookings SET meet_link = fresh.meet_link WHERE id=booking.id` y fallback `if (!appointmentId && booking.id && meetLink) UPDATE bookings`.
- **CitasPage:** ya `bookings LAWYER_DIRECT` (sin cambio, verificado `not contain appointments.insert`).

---

## 6. Consumers Legacy (qué permanece y por qué)

- `appointments` **no DROP**: `ScheduleModal` Marketplace `INSERT pending_payment`, `UserDashboard`, `DashboardAppointments`, `lib/api`, Edge Functions `create-google-meeting`, reviews (`request-review`), `netlify/create-payment` verificación, `server webhook` mirror. Todos tenant-safe via RLS `lawyer_id/user_id` (FASE 2A).
- `payments.appointment_id` **preservado**: 2 flujos coexisten `external_reference=booking.id` (Marketplace bookings) vs `external_reference=paymentId` (appointment legacy). Eliminar rompería `/create-payment`.
- `booking_leads`/`payment_events` service_role only — sin cambio.

---

## 7. Payments — `booking_id` vs `appointment_id` vs `external_reference`

- `payments.booking_id → bookings.id` (NEW, FK, nullable) + `payments.appointment_id → appointments.id` (legacy, nullable) — ambos pueden coexistir; `ON DELETE SET NULL` para booking.
- `external_reference` :
  - Marketplace `POST /api/bookings/create` → `booking.id` (webhook busca `bookings` `external_reference`).
  - Appointment legacy `/create-payment` → `paymentId` (webhook ruta por `DOCUMENT_` vs booking, `paymentId` no encontrado en bookings → `needs_manual_review`, pero `payments` row existe con `appointment_id`).
- 2C no cambia `external_reference=paymentId` para legacy; futuros SaaS `bookings` payments deberán usar `bookingId` + `payments.booking_id`.

---

## 8. Tests

`src/__tests__/phase2C.test.ts` (3 static + 3 live):
- migration adds `meet_link`, no DROP, no heuristic
- `CitasPage` uses bookings LAWYER_DIRECT
- `EarningsPage` booking traceability + `server webhook bookings.meet_link`
- live `bookings.meet_link` column, `appointments` RLS, 57 bookings still without client/case (no auto CRM)

`npm run test:run` — 70 passed 2 skipped (phase2C 6 passed).

---

## 9. Riesgos Pendientes

- **P0 closed:** meet_link now in bookings, but `ScheduleModal` still writes appointments (Marketplace) — intentional.
- **P1:** `UserDashboard`/`DashboardAppointments` still appointments-only for client view — should dual-read bookings `WHERE user_id` in next.
- **P1:** `lawyer_services`/`appointments` RLS already tenant-safe, but `bookings` 30 LAWYER_DIRECT cancelled still orphan (see §5 of 2B).
- **P2:** `admin/analytics` dual counts appointments+bookings (6+57) — should consolidate to bookings after legacy period.

---

## 10. Criterios para eliminar `appointments` (futuro DROP)

Requiere **todos**:
1. `payments` con `booking_id` para nuevos flujos > 30 días, `appointment_id` solo legacy `pending` 0.
2. `ScheduleModal` migrado a `bookings` (client booking via `POST /api/bookings/create` no direct appointments).
3. `UserDashboard`/`DashboardAppointments` leen `bookings WHERE user_id` con `meet_link`.
4. `create-google-meeting` lee `bookings.meet_link`.
5. `EarningsPage` 0 dependencia `appointmentsMap` (solo `bookingsMap`).
6. `netlify/create-payment` verifica `bookings` además de `appointments`.
7. 6 filas historic migradas o archivadas, `SELECT count(*) FROM appointments WHERE created_at > now()-30d` =0.
8. `DROP` solo tras `CREATE VIEW appointments_compat AS SELECT bookings...` + 1 release con compat.

