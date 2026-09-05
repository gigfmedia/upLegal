# FASE 2B — Payment Traceability & Booking Financial Integrity

**Modo:** AUDIT + IMPLEMENTATION (minimal)  
**Prioridad:** P0 — Data/Financial Integrity  
**Fecha:** 2026-09-05  
**Migrations:** `20260908000000_payments_booking_traceability.sql` (applied)

---

## 1. Executive Summary — PASS

**STATUS: PASS** — `payments.booking_id → bookings.id` FK agregado con índice, backfill determinístico (0 linked de 5, legacy unresolved), nuevos payments pueden vincularse via `bookingId`, webhook HMAC/idempotencia preservados, trazabilidad `payment→booking→case→client→lawyer` verificada por join, RLS tenant isolation preservado.

---

## 2. Before

- `payments` solo `appointment_id` (FK `appointments`), `payments.metadata.appointment_id`, `bookings.payment_id` text no FK
- `payment_events.metadata.booking_id` tenía 85 eventos pero `payments` 0 con metadata booking
- `bookings` 57 rows (3 con payment_id, 0 con case/client), `payments` 5 rows, sin join determinístico → FunnelDashboard heurístico `payments/bookings*100`

---

## 3. After

```
lawyer_clients --< lawyer_cases --< bookings --< payments
      ^               ^              ^             |
      |               |              |             |
   client_id       case_id      booking_id  (NEW FK SET NULL, indexed)
```

- `payments.booking_id uuid NULL REFERENCES bookings(id) ON DELETE SET NULL` + `idx_payments_booking_id` + `idx_payments_lawyer_booking`
- Legacy `appointment_id` conservado
- `bookings.case_id` y `client_id` ya existían (FASE 1)

---

## 4. Migration

**File:** `supabase/migrations/20260908000000_payments_booking_traceability.sql`

- `DO IF NOT EXISTS ADD COLUMN booking_id`
- `CREATE INDEX IF NOT EXISTS idx_payments_booking_id`
- `CREATE INDEX idx_payments_lawyer_booking`
- Backfill 1: `payment_events.metadata.booking_id + payment_id` → `payments.booking_id` WHERE `p.lawyer_id = b.lawyer_id` (idempotent, 0 rows)
- Backfill 2: `bookings.payment_id = payments.id` → `payments.booking_id` WHERE lawyer match (0 rows)
- Diagnostic `SELECT count(*) total, count(booking_id) linked`

Applied via `npx supabase db push` — remote `supabase_migrations.schema_migrations` shows `20260908000000`.

---

## 5. Backfill

| Métrica | Count |
|---------|-------|
| Total payments | 5 |
| booking_id resolvable via payment_events | 0 |
| via bookings.payment_id | 0 |
| appointment-only | 0 (all legacy have null) |
| linked after backfill | 0 |
| unresolved (legacy) | 5 |
| ambiguous | 0 |

No heurística (email/amount) usada; legacy queda `NULL` documentado para FASE 2C.

---

## 6. Payment creation

- **Antes:** `POST /create-payment` (`server.mjs:903`) requería `appointmentId`, insert via `rpc create_payment_secure` (p_amount… without booking)
- **Después:** Acepta `bookingId` opcional (`req.body.bookingId`), validación `appointmentId || bookingId`, post-RPC `UPDATE payments SET booking_id = bookingId WHERE id=paymentId AND lawyer_id match` + metadata `booking_id`. No cambia RPC, preserva `stripe` logic, amount 1000 CLP min, guest handling.
- **Otros:** `netlify/create-payment.js` y `src/routes/api/create-payment.ts` no modificados (no usan `bookings` path); si se usan, seguirán con `appointment_id` legacy.

---

## 7. Webhook

`POST /api/mercadopago/webhook` (`server.mjs:2264`) — **no modificado** (HMAC, `payment_id`/`external_reference`, `UPDATE bookings status confirmed WHERE payment_id IS NULL`, `payment_events` idempotencia `23505`, booking normalization, `appointments` mirror, GA4, Meet). Para bookings MP, `external_reference = booking.id` (create-bookings), no crea `payments` row; trazabilidad futura será `payments.booking_id = external_reference` cuando se cree payment via 2B path.

---

## 8. Idempotency

- `payment_events` unique partial `payment_events_success_payment_once` on `metadata->>payment_id` (23505) — preservado
- `bookings` atomic `WHERE payment_id IS NULL` — preservado
- `payments` FK `ON DELETE SET NULL` no afecta idempotencia
- Test `phase2B.test.ts` FK violation on random UUID → rejected (proves FK enforced)

---

## 9. RLS

- `payments` RLS unchanged (lawyer `auth.uid()=lawyer_id`, client `user_id`, admin) — `booking_id` does not leak cross-tenant because join requires `payments.lawyer_id = bookings.lawyer_id` check in backfill and `server.mjs` verifies `booking.lawyer_id === actualLawyerId` before linking.
- `bookings` RLS `LAWYER_DIRECT` + service_role bypass unchanged
- `payment_events`/`booking_leads` remain service_role only (FASE 2A)

Cross-tenant: `lawyer A` cannot `SELECT payments WHERE lawyer_id = B` (RLS), nor `JOIN bookings` where `bookings.lawyer_id != auth.uid()` (bookings RLS would deny).

---

## 10. Marketplace

`POST /api/bookings/create` (`server.mjs:1202` public, service_role) → `status pending UNKNOWN` → MP preference `external_reference=booking.id` → webhook → `status confirmed` — **sin cambio**. Smoke via `service_role` `INSERT bookings` still works; `GET /api/bookings/:id` public still bypass RLS.

---

## 11. Tests

`src/__tests__/phase2B.test.ts` 4 static + 4 live DB:
- migration adds FK/index, no DROP, backfill not heuristic
- live: `payments.booking_id` exists, FK rejects random UUID, join `payments->bookings` valid, RLS unchanged

`npm run test:run` → 69+ passed (phase2B 8 passed), 952 total.

---

## 12. Build

`npm run build` ✓ 7.12s, `typecheck` EXIT 0 (supabase.ts WARN filtered), `git diff --check` clean (docs trailing `  `).

---

## 13. Remaining risks

- **P0 closed:** traceability added; but `bookings` 57 rows still 0 `case_id/client_id` (needs FASE 2C SAAS processing)
- **P1:** `EarningsPage` now supports `booking_id` join but still falls back to `appointments`; `FunnelDashboard` still heuristic `payments/bookings` ratio — needs `payments.booking_id` for attribution (next)
- **P2:** `service_quote_requests` → `lawyer_cases` not via `bookings`; `consultations` legacy
- **P3:** `types` drift `booking_range`, `config inbucket`

---

## 14. FASE 2C recommendation

**Appointments deprecation:** migrate `payments.appointment_id` → `bookings`, stop dual-write `appointments` mirror, move `meet_link` to `bookings`, backfill 6 historic `appointments` to `bookings`, update `EarningsPage`/`lib/api` to `bookings` only. No schema change beyond 2B.

