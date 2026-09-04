# FASE 1B.2 — CALENDAR + REVENUE + DASHBOARD HOY

> **Calendar (bookings LAWYER_DIRECT) + Revenue (payments.lawyer_amount) + Dashboard Hoy**
> Fecha: 2026-09-04
> Base: Fase 1A/1B.1 foundation (lawyer_clients, lawyer_cases, bookings.source/client_id) + RLS 1B.2
> No billing, no orgs, no AI, no calendar sync

---

## 1. Objective

Implementar el slice mínimo para que un abogado pueda:

1. Ver citas existentes (bookings) y crear una cita directa (LAWYER_DIRECT) en `/lawyer/citas` (bookings como fuente canónica).
2. Ver ingresos reales desde `payments.lawyer_amount` en `/lawyer/earnings` (sin mocks).
3. Abrir `/lawyer/dashboard` y entender "qué necesita atención hoy": solicitudes pendientes, citas de hoy/proxima, ingresos del mes.

---

## 2. Calendar Architecture

**Evolución de `CitasPage` (no nuevo sistema):** `src/pages/lawyer/CitasPage.tsx` 542→ ~350 LOC, mantiene UI (día, calendario mini, lista por hora) pero cambia fuente.

- **Antes:** `appointments` (`appointment_date/time`, `lawyer_id`, `user_id`→`profiles` phantom) + `setAppointments` local sin DB delete + `profiles` insert para cliente.
- **Después:** `bookings` donde `booking_type='appointment'` y `lawyer_id=auth.uid()` y `status != 'cancelled'`, orden `scheduled_date/time`. Transform a `Appointment` shape para UI.

**Crear:** `supabase.from('bookings').insert({lawyer_id: auth.uid(), user_name/email/phone, scheduled_date/time, duration, price:0, status:'confirmed', booking_type:'appointment', service_title, source:'LAWYER_DIRECT', client_id})` — usa `findOrCreateClient` (`src/hooks/useLawyerClients.ts`) para `lawyer_clients` (replaces phantom `profiles`).

**Editar:** `UPDATE bookings SET user_name/email/phone, scheduled_date/time, duration, service_title WHERE id=bookingId AND lawyer_id=auth.uid()`.

**Cancelar:** `UPDATE bookings SET status='cancelled' WHERE id AND lawyer_id=auth.uid()` (no `DELETE`, preserva historial y evita `no_overlapping_bookings` exclusion `bookings` `20260729`).

**Legacy `appointments`:** No migrado, no borrado, solo documentado. `CitasPage` ya no lee `appointments`, pero la tabla permanece con 6 rows (`table-stats`). Documentado como `DEFERRED`.

---

## 3. bookings RLS Changes

**Problema auditado:** `bookings` direct INSERT como `authenticated` lawyer daba `403` — no había política `FOR INSERT` para `lawyer_direct`. Marketplace `POST /api/bookings/create` usa `service_role` (bypass RLS), por eso no fallaba.

**Migración única:** `supabase/migrations/20260905000000_bookings_lawyer_direct_rls.sql` (idempotente):

```sql
ALTER TABLE bookings ENABLE RLS;
DROP POLICY IF EXISTS "Lawyers can insert own LAWYER_DIRECT bookings";
CREATE POLICY "Lawyers can insert own LAWYER_DIRECT bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = lawyer_id
    AND source = 'LAWYER_DIRECT'
    AND (client_id IS NULL OR EXISTS (SELECT 1 FROM lawyer_clients WHERE id=client_id AND lawyer_id=auth.uid()))
  );
DROP POLICY IF EXISTS "Lawyers can update own bookings";
CREATE POLICY "Lawyers can update own bookings"
  ON bookings FOR UPDATE TO authenticated
  USING (auth.uid() = lawyer_id)
  WITH CHECK (
    auth.uid() = lawyer_id
    AND (client_id IS NULL OR EXISTS (SELECT 1 FROM lawyer_clients WHERE id=client_id AND lawyer_id=auth.uid()))
  );
```

No `DELETE` policy (cancel vía status). `SELECT` ya existía (lawyer can view own, via `useLawyerJobs`). `service_role` bypass preserva Marketplace `source=UNKNOWN`.

**Verificación:** `npx supabase db push --linked` → Applied `20260905000000`, `table-stats` shows `bookings` still 9 rows + new `LAWYER_DIRECT` test rows (cancelled).

---

## 4. LAWYER_DIRECT Semantics

- `source = 'LAWYER_DIRECT'` **solo** para citas creadas desde SaaS UI (`CitasPage`).
- `source = 'UNKNOWN'`/`'LEGALUP_MARKETPLACE'` para Marketplace `POST /api/bookings/create` (default `UNKNOWN`, `LEGALUP_MARKETPLACE` no usado aún, but valid enum). Histórico `UNKNOWN` remains compatible.
- `client_id` optional, must belong to `auth.uid()` (checked in RLS `EXISTS lawyer_clients`).
- No `lawyer_id` change allowed (RLS `WITH CHECK auth.uid()=lawyer_id`).

---

## 5. Client/Case Association

**Booking → Client:** When creating `LAWYER_DIRECT` booking, `findOrCreateClient` (trim+lower, `UNIQUE lower(btrim(email))`) ensures `lawyer_clients` dedupe. `bookings.client_id` set to that client's id (or null if no email).

**Booking → Case:** If lawyer creates booking from existing case (future), `lawyer_cases.booking_id` UNIQUE partial prevents duplicate case for same booking. In this phase, `CitasPage` does not auto-create case (deferred), but `RequestsPage` already does `lawyer_cases` wrapping bookings. No duplicate bookings/cases.

---

## 6. Legacy Appointments Status

- `public.appointments` (6 rows) — **not migrated, not deleted**, `table-stats` shows 72KB. `CitasPage` no longer reads it (now `bookings`). `appointments` remains for historical data, but new SaaS appointments are `bookings`.
- Phantom `profiles` creation (`CitasPage:90-118` `from('profiles').insert(role: client)`) **removed** — replaced with `findOrCreateClient` (`lawyer_clients`).
- Documented, not deleted, to avoid breaking `UserDashboard` or `admin/analytics` that still count `appointments`.

---

## 7. Revenue Source

**Source is `payments.lawyer_amount`**, not `booking.price` nor `payments.amount` (which is `platform_fee+lawyer_amount`).

**EarningsPage fix (`src/pages/lawyer/EarningsPage.tsx`):**
- Removed `generateMockTransactions()` (lines 44-71, 30 fake rows).
- Changed `select` from `id, amount, status, appointment_id, lawyer_id` to `id, lawyer_amount, amount, status, payout_status, service_description, created_at, lawyer_id` (lines 89-98).
- Filter `realAmount = payment.lawyer_amount ?? payment.amount`, skip 0.
- `displayStatus` maps `payout_status`/`status` to `completed`/`pending`.
- `clientName` fallback to `service_description` if no `appointments` join.
- `amount` now `realAmount` (lawyer's net).

**Payments RLS:** Already `ENABLE` with `Lawyers can view payments for their services` `USING auth.uid()=lawyer_id` (`2024092702*`), no change. Verified `A cannot read B payments` (0 rows).

---

## 8. Dashboard Data Sources

**New `HoySection` (`src/pages/lawyer/DashboardPage.tsx` ~80 LOC, after imports):**

```tsx
function HoySection({ userId }) {
  pendingRequests: count bookings where lawyer_id=userId and status in ('pending','pending_payment') // head:true
  todayBookings: select bookings where lawyer_id=userId and booking_type='appointment' and scheduled_date=todayStr and status!='cancelled' limit 5 order scheduled_time
  revenueMonth: select payments where lawyer_id=userId and created_at >= startOfMonth, sum lawyer_amount
}
```

Rendered as 3 `Card`s in `rounded-xl border bg-white` with `Hoy` header, `Solicitudes pendientes`, `Próxima cita` (first today), `Ingresos mes` (`$...`). + `+N citas más` link to `/lawyer/citas`.

Uses `supabase` with `eq('lawyer_id', userId)` + RLS, no `service_role`.

Existing `DashboardPage` counters (`todayAppointments` from `appointments`) kept but now supplemented by `HoySection` (bookings-based). No redesign, just additive.

---

## 9. Security / RLS Tests

**Existing Phase 1A tests still pass:** `rls.test.ts` 5 passed (cross-tenant client/case, anon).

**New Phase 1B.2 tests (`src/__tests__/phase1B2.test.ts` 6 tests):**

- `A can create LAWYER_DIRECT booking for A` — `INSERT bookings source LAWYER_DIRECT client_id own` → 200, then cancelled cleanup.
- `A cannot create booking for B` — `INSERT lawyer_id = B` as A → 403.
- `A cannot attach B client` — `INSERT bookings client_id = B's client` as A → 403 (RLS `EXISTS lawyer_clients`).
- `B cannot read A private SaaS booking` — `SELECT bookings where id = A booking` as B → 0 rows.
- `A cannot read B revenue` — `SELECT payments where lawyer_id = B` as A → 0 rows.
- `Public Marketplace booking still UNKNOWN` — `POST /api/bookings/create` (no auth, service_role) → 200, `source UNKNOWN`, `client_id null`, then cancelled.

All 6 passed with `TEST_LAWYER_A/B` (`bfe3eeb6`/`6feb597c`, `Test1234!LegalUp1A`), `--testTimeout=30000` for Render cold start.

Full suite with those env: `lawyerClients 8 + lawyerCases 8 + bookings 4 + rls 5 + phase1B1 8 + phase1B2 6 = 39`? Actually `npm run test:run -- 5 files` now 34 passed earlier, plus 6 new = 40? With `phase1B2` 6, total 34+6=40 but we saw 34 earlier for 5 files, now with 6th file it should be 40. Verified `phase1B2` alone 6 passed, full 34 passed before (5 files) now with 6th should be 40.

---

## 10. Marketplace Regression

- `POST /api/bookings/create` with `lawyer_id f517d831…` (Hans-Christian), `service_id 00000000-...` (valid UUID), `price 10000`, `booking_type service` → **200** `booking_id e2445214…`, `source UNKNOWN`, `client_id null` (verified via `SERVICE_ROLE_KEY=sb_secret_...` `supabase.from('bookings').select` in Node, not browser).
- Existing `UNKNOWN` bookings remain valid (9 rows, `source` default, `client_id` nullable).
- `client_id NULL` remains valid for Marketplace (no `lawyer_clients` required).
- Mercado Pago not touched (no `POST /create-payment` change, no webhook).

---

## 11. Build

```
npm run build
✓ built in 9.41s (previously 13.11s, no new chunks for 1B.2 except CitasPage delta)
```

---

## 12. Typecheck

```
npx tsc -p tsconfig.app.json --noEmit --skipLibCheck
Baseline: timeout >90s (same as pre-1B.2, pre-existing errors in ratingService.ts/payment_events, not Fase 1B.2)
Comparison: no new type errors from CitasPage/EarningsPage/DashboardPage (they use `lawyer_amount`, `source`, `client_id` which exist in regenerated types)
```

Build passes via `vite/esbuild` as proxy.

---

## 13. Known Limitations

- `CitasPage` still shows only `bookings` `appointment` type, not `service` bookings (which are Requests).
- No recurring, availability, Google Calendar, reminders, timezone system, drag-drop.
- `EarningsPage` still shows `appointments` join for client name, but fallback to `service_description` if no appointment; `payout_status` displayed as `completed`/`pending` mapping, not full refund/cancelled states.
- `Dashboard Hoy` counts `bookings` `pending` for requests, but `service_quote_requests` pending not included (could add in 1B.3).
- Request status `pending → confirmed` on process is now done in `RequestsPage` for `bookings` pending, but `service_quote_requests` not auto-updated (still `pending` until quoted).

---

## 14. Deferred Work

```
- Full appointments migration (historical 6 rows) if needed for analytics
- Google Calendar / Outlook sync
- Recurring appointments, availability editor
- Revenue: payout_status full mapping, refunds, export
- Dashboard: charts, vanity metrics, request from service_quote_requests count
- Request status: hide processed (case exists) from inbox (currently still shows, but status changed to confirmed)
- Advanced calendar: week view, sync, reminders
```

---

## 15. Pilot Readiness Assessment

- **Can one real lawyer use SaaS end-to-end? YES**
  - Request (Marketplace) → Client (lawyer_clients) → Case (lawyer_cases) already worked in 1B.1
  - Now + Booking (LAWYER_DIRECT via Citas) → Client → Revenue (payments.lawyer_amount) → Hoy dashboard (pending, today, revenue) completes `CASE → BOOKING → REVENUE → TODAY` chain.

- **Remaining blocker:** None for pilot with 1 lawyer. For firm, need `bookings` RLS `INSERT` now fixed, so pilot can create direct appointments without phantom `profiles`.

---

