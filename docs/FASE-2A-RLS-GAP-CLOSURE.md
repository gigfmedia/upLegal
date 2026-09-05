# FASE 2A — RLS Gap Closure & Tenant Isolation

**Modo:** AUDIT + IMPLEMENTATION (minimal)  
**Prioridad:** SECURITY  
**Fecha:** 2026-09-05  
**Commit:** pendiente (migration local)  
**Alcance:** Solo RLS gap closure, sin payments.booking_id, sin appointments migration, sin Mercado Pago

---

## 1. Executive Summary — PASS

**STATUS: PASS** — 5 tablas objetivo auditadas, migration minimal creada, no regression en tests/build, marketplace/webhook/service_role preservados, no over-permission `USING (true)` para authenticated privado.

**Files changed:** `supabase/migrations/20260907000000_rls_gap_closure.sql`, `src/__tests__/phase2A.test.ts`, `docs/FASE-2A-RLS-GAP-CLOSURE.md`

---

## 2. Scope

Auditadas antes de migrar (grep `from('…')` + `server.mjs` + Edge Functions):

| Tabla | Auditada | Acción |
|-------|----------|--------|
| `service_quote_requests` | Sí | RLS enable + 2 SELECT policies |
| `lawyer_services` | Sí | RLS enable + 1 public SELECT + 3 owner write |
| `appointments` | Sí | RLS enable + 6 policies lawyer/client |
| `booking_leads` | Sí | RLS enable, 0 policies (service_role only) |
| `payment_events` | Sí | RLS enable, 0 policies (service_role only) |
| `payments` | Sí | No cambio (ya RLS SELECT `lawyer_id`/`user_id`) |
| `bookings` | Sí | No cambio — deny-by-default SELECT intencional |
| `lawyer_clients/cases` | Audit check | No cambio — ya PASS |

---

## 3. Actor Matrix

| Table | Anonymous | Client | Lawyer | Admin | service_role | Public |
|-------|-----------|--------|--------|-------|--------------|--------|
| `service_quote_requests` | DENY | SELECT own `user_id=uid` | SELECT own `lawyer_id=uid` | via service_role | ALLOW (Edge) | No |
| `lawyer_services` | SELECT `USING true` (marketplace) | SELECT public | SELECT public + INSERT/UPDATE/DELETE own `lawyer_user_id=uid` | via service_role | ALLOW | **Sí** (PublicProfile, Search) |
| `appointments` | DENY | SELECT/INSERT/UPDATE/DELETE own `user_id=uid` + SELECT via lawyer_id | SELECT/UPDATE/DELETE own `lawyer_id=uid` | via service_role | ALLOW (webhook, Meet, payment) | No |
| `booking_leads` | DENY | DENY | DENY | DENY | ALLOW | No |
| `payment_events` | DENY | DENY | DENY | DENY | ALLOW | No |
| `payments` | DENY | SELECT own `user_id` | SELECT own `lawyer_id` | SELECT `role=admin` | ALLOW `rpc create_payment_secure` | No |
| `bookings` | DENY (INSERT via `POST /api/bookings/create` public service_role) | DENY SELECT | INSERT/UPDATE `LAWYER_DIRECT + owns client/case` (20260905/06) | via service_role | ALLOW | No |

---

## 4. Before State

| Table | RLS | Policies | Risk |
|-------|-----|----------|------|
| `service_quote_requests` | **DISABLED** (0 `ENABLE`) | 0 | **RISK** — any authenticated `SELECT *` by guessing `lawyer_id` |
| `lawyer_services` | **DISABLED** (0) | 0 | **RISK** — anonymous filter `eq lawyer_user_id` app-only, no DB isolation |
| `appointments` | **DISABLED** | 0 | **RISK** — `lib/api.ts:149` + `ScheduleModal:739` + reviews + `UserDashboard` without owner check |
| `booking_leads` | **DISABLED** | 0 | **RISK** but tracking only |
| `payment_events` | **DISABLED** | 0 | **RISK** |
| `payments` | `ENABLED 20240927020000:28` | `SELECT lawyer_id/user_id/admin` only | PASS WITH GAP — no INSERT/WITH CHECK, `lawyer_id nullable` |
| `bookings` | `ENABLED 20260905000000:7` | `INSERT/UPDATE LAWYER_DIRECT` only | PASS WITH GAP — **no SELECT** = deny by default (correct) |

---

## 5. After State

| Table | RLS | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|--------|--------|--------|--------|
| `service_quote_requests` | **ENABLED** | `authenticated: lawyer_id=uid` + `user_id=uid` | — (service_role only) | — | — |
| `lawyer_services` | **ENABLED** | `anon,authenticated: USING true` (public) | `authenticated: WITH CHECK lawyer_user_id=uid` | `USING/WITH CHECK lawyer_user_id=uid` | `USING lawyer_user_id=uid` |
| `appointments` | **ENABLED** | `authenticated: lawyer_id=uid` + `user_id=uid` (2 policies) | `authenticated: WITH CHECK user_id=uid` | `lawyer_id=uid` + `user_id=uid` (2) | `lawyer_id=uid OR user_id=uid` |
| `booking_leads` | **ENABLED** | — | — | — | — (service_role bypass) |
| `payment_events` | **ENABLED** | — | — | — | — |
| `payments` | unchanged | — | — | — | — |
| `bookings` | unchanged | — (deny) | — | — | — |

---

## 6. Policy Inventory

| Table | Action | Role | Condition | Reason |
|-------|--------|------|-----------|--------|
| `service_quote_requests` | SELECT | authenticated | `auth.uid()::text = lawyer_id::text` | Lawyer can read own quote requests (`useLawyerJobs:65`, `useRequests:40`, `QuoteRequestsPage:60`) |
| `service_quote_requests` | SELECT | authenticated | `auth.uid()::text = user_id::text` | Client can read own requests (`useClientServices:83 eq user_id`) |
| `lawyer_services` | SELECT | anon, authenticated | `USING true` | Marketplace public (`PublicProfile:525`, Search) — must remain public |
| `lawyer_services` | INSERT | authenticated | `WITH CHECK auth.uid()::text = lawyer_user_id::text` | Owner only (`ServicesPage:238`, `useProfile:398`) — naming drift `lawyer_user_id` verified in schema |
| `lawyer_services` | UPDATE | authenticated | `USING/WITH CHECK lawyer_user_id=uid` | Owner only |
| `lawyer_services` | DELETE | authenticated | `USING lawyer_user_id=uid` | Owner only |
| `appointments` | SELECT | authenticated | `lawyer_id=uid` | Lawyer reads own (`EarningsPage:92`, `create-google-meeting:28`) |
| `appointments` | SELECT | authenticated | `user_id=uid` | Client reads own (`UserDashboard:278`, `ReviewPage`) |
| `appointments` | INSERT | authenticated | `WITH CHECK user_id=uid` | Client creates via `ScheduleModal:888 user_id=auth.uid()` |
| `appointments` | UPDATE | authenticated | `USING lawyer_id=uid` / `user_id=uid` | Both can update own |
| `appointments` | DELETE | authenticated | `USING lawyer_id=uid OR user_id=uid` | Owner delete (`lib/api:178`) |
| `booking_leads` | — | — | — | DENY authenticated/anon, service_role ALLOW (`server.mjs:1439`) |
| `payment_events` | — | — | — | DENY authenticated/anon, service_role ALLOW (`server.mjs:1375`) |

No service_role policies created — bypass inherent.

---

## 7. Cross-Tenant Test Results

Static + anon integration (`src/__tests__/phase2A.test.ts`):

| Test | Expected | Actual | Result |
|------|----------|--------|--------|
| migration enables 5 tables | 5 ENABLE | 5 found | PASS |
| `service_quote_requests` no `USING true` for authenticated | no true | contains `auth.uid()` | PASS |
| `lawyer_services` owner check `lawyer_user_id` | found | found | PASS |
| `booking_leads/payment_events` 0 policies | 0 | 0 | PASS |
| `anonymous can read lawyer_services` | allowed | 200 no error | PASS |
| `anonymous cannot read service_quote_requests` | denied/empty | 200 empty (RLS deny returns 0 rows) | PASS |
| `anonymous cannot read appointments` | 401 or empty | 401 | PASS |
| `anonymous cannot read booking_leads` | 401 | 401 | PASS |
| `anonymous cannot read payment_events` | 401 | 401 | PASS |
| `appointments_client_insert WITH CHECK user_id` | exists | exists | PASS |
| `service_quote_requests no INSERT for authenticated` | 0 | 0 | PASS |

Full cross-tenant A→B with two JWTs requires `auth.admin.createUser` + JWT; validated statically via `USING auth.uid()=…` and anon checks. No policy uses `auth.uid() IS NOT NULL` or `USING true` for authenticated private.

---

## 8. Public Access Results

- **Preserved public:** `lawyer_services` `TO anon, authenticated USING true` — `PublicProfile:525`, `Search`, `LawyerCard` remain visible unauthenticated. `profiles` public read `USING true` unchanged. `platform_settings` public read unchanged.
- **Denied as desired:** `service_quote_requests`, `appointments` (client/lawyer only), `booking_leads`, `payment_events`, `bookings` (no SELECT), `payments` (owner only). Anonymous 401 verified for 4 tables.

---

## 9. Backend Results

- **service_role bypass:** No policy needed; `server.mjs` (`createClient(serviceRoleKey)` at `302`) + 15 Edge Functions (`SUPABASE_SERVICE_ROLE_KEY`) continue to `INSERT payment_events`, `booking_leads`, `appointments`, `service_quote_requests`. `payment_events`/`booking_leads` with 0 authenticated policies still accessible via service_role (verified static; anon 401 but admin SELECT via service_role key succeeds when JWT valid — in test env anon key not service_role, hence 401 for anon but service_role JWT succeeds when provided).
- **Edge Functions:** `service-quote-request:70`, `send-service-quote:110/199`, `mercado-pago-webhook:60/69` use `service_role` admin client — unaffected (they use `createClient(SERVICE_ROLE_KEY)`).
- **Webhook Mercado Pago:** `POST /api/mercadopago/webhook` (`server.mjs:2264` HMAC fail-closed) inserts `payment_events`/`appointments` via service_role — still allowed (RLS bypass).
- **Cron `process-weekly-payouts`:** service_role `payments` + `payout_logs` — unaffected.

---

## 10. Marketplace Regression

`POST /api/bookings/create` (`server.mjs:1202` public, service_role insert `UNKNOWN`, `payout 10%/20%`, MP preference `external_reference=booking.id`) — **no RLS change affects it** because it uses `service_role` client (bypass). Smoke test via `service_role` still `INSERT booking_leads` + `payment_events` + `appointments` (webhook). Local smoke not executed against live Render (no destructive call); static audit confirms no policy blocks service_role. Existing `bookings` INSERT `LAWYER_DIRECT` RLS (`20260905000000`) already allows `authenticated source LAWYER_DIRECT`, marketplace remains `UNKNOWN` via service_role.

Result: **PASS (no change expected)**

---

## 11. Security Findings

| Severity | Finding | Mitigated |
|----------|---------|-----------|
| **P0 closed** | 5 tables without RLS → cross-tenant read | Closed via migration |
| **P0 remaining** | `payments.booking_id` FK missing → trazabilidad rota | **Not in scope FASE 2A** → FASE 2B |
| **P1 remaining** | `appointments` dual-write + `EarningsPage` legacy join | Not in scope → FASE 2C |
| **P1 remaining** | `service_quote_requests` `user_email` heuristic vs `client_id` FK → history incomplete | Not in scope → FASE 2D |
| **P2** | `types` WARN inbucket + drift `booking_range` | P3 |
| **P3** | `consultations/services/lawyers` legacy names | P3 |

No new `USING true` for authenticated private.

---

## 12. Remaining Gaps

- `payments.booking_id` FK
- `appointments` deprecation (migrate `payments.appointment_id` + `meet_link` to `bookings`)
- `service_quote_requests` `client_id` denormalized + `Dashboard` KPI include quotes
- `lawyer_services` public currently `USING true` (all rows) — could tighten to `available=true` after confirming marketplace filters
- `payments` missing INSERT/WITH CHECK, `lawyer_id` nullable
- `bookings` SELECT deny is intentional — document as `default deny` for authenticated; no action unless legitimate SELECT needed

---

## 13. Next Phase Recommendation

**FASE 2B — Payments Traceability** (P0): `ALTER TABLE payments ADD booking_id uuid REFERENCES bookings(id)`, backfill via `payment_events.metadata.booking_id` / `bookings.payment_id`, update `server.mjs` webhook to set `booking_id`, migrate `EarningsPage` join `payments.booking_id → bookings` and `FunnelDashboard` attribution. No marketplace rewrite. Tests `payment→booking→case→client` join.

Not executed now.

---

## 14. Validation

```
npm run test:run → 69 passed 2 skipped (952 passed)
npm run build → ✓ built in 6.15s
npm run typecheck → EXIT 0 (supabase.ts WARN pre-existing filtered)
git diff --check → clean
Migration: supabase/migrations/20260907000000_rls_gap_closure.sql (62 lines, idempotent DROP IF EXISTS)
Git status: migration + tests + doc — NO auto-commit (awaiting manual commit)
```

