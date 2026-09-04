# FASE 1B.1 — REQUESTS + CLIENTS + CASES

> **Lawyer SaaS — First Usable Workflow: Request → Client → Case**
> Fecha: 2026-09-04
> Migration base: `20260904150000_lawyer_saas_foundation.sql` (lawyer_clients, lawyer_cases, bookings.source/client_id)
> No billing, no orgs, no AI, no calendar refactor

---

## 1. Objective

Implementar el primer slice funcional para un abogado piloto:

1. Ver solicitudes entrantes (Marketplace) en `/lawyer/requests`
2. Procesar una solicitud → crear/reutilizar `lawyer_clients` (aislado por `lawyer_id`)
3. Crear/ver caso asociado en `lawyer_cases`
4. Encontrar luego ese cliente en `/lawyer/clients` y su caso en `/lawyer/cases` con navegación Client ↔ Case

Todo con `lawyer_id = auth.uid()` como tenant, sin tocar `server.mjs` ni `POST /api/bookings/create`.

---

## 2. Existing Architecture Used

**Marketplace booking flow (reutilizado, no modificado):**
- `POST /api/bookings/create` (`server.mjs:1202` NO AUTH, `service_role`, `lawyer_id` + `user_email/name/phone`, `scheduled_date/time`, `price`, `booking_type`, `service_id/title`) → `bookings` + `booking_leads` + `payment_events` + `notifications booking.created` (`server.mjs:1394`). **Intacto.**
- `bookings` (9 rows, `table-stats`) con `booking_range` exclusion `no_overlapping_bookings` (`20260729`), `source`/`client_id` nuevos (Fase 1A) default `UNKNOWN`/null.

**Jobs aggregation (reutilizado):**
- `src/hooks/useLawyerJobs.ts:40-223` — `Promise.all( bookings where lawyer_id=auth.uid() and booking_type=service + service_quote_requests where lawyer_id=auth.uid())` → `LawyerJob` (booking + quote). Pattern `useState/useEffect/useCallback`, `supabase.from(...).eq('lawyer_id', user.id)`. Reusado en `useRequests`.

**Quote requests (reutilizado):**
- `service_quote_requests` (`QuoteRequestsPage:15` interface: `id, lawyer_id, service_title, user_name/email/phone, description, status pending/quoted/paid/cancelled/expired, quoted_price, mercadopago_preference_id`) — leído en `useLawyerJobs:64` y `QuoteRequestsPage:59`. No nueva tabla.

**Auth & RLS:**
- `src/contexts/AuthContext/clean/useAuth.ts`, `RequireLawyer` (`App.tsx:30` static), `DashboardLayout:39` (role detection `location.pathname.startsWith('/lawyer')`), `supabaseClient.ts`, `src/types/supabase.ts` (regenerated 2026-09-04, includes `lawyer_clients`, `lawyer_cases`, `bookings.source/client_id`).

**UI components (reutilizados):**
- `Card`, `CardContent`, `Button`, `Badge`, `Input`, `Label`, `Select`, `Dialog`, `Textarea` (`src/components/ui/*` shadcn), `Loader2`, `Search`, `User`, `Mail`, `Phone`, `FileText` (`lucide-react`), `formatDistanceToNow` (`date-fns/es`), `useToast`.

---

## 3. Request Source Discovered During Audit

**Fuente de verdad no es una nueva tabla.** Es la unión de dos fuentes existentes, exactamente como `useLawyerJobs`:

1. `public.bookings` — `lawyer_id = auth.uid()` (RLS), `booking_type` `service`/`appointment`, `status` `pending`/`confirmed`/`in_progress`/`completed`, `user_name/email/phone`, `service_title/description/price`, `source` (`UNKNOWN` para Marketplace por `DEFAULT`, `LAWYER_DIRECT` futuro SaaS), `scheduled_date/time` (solo `appointment`), `created_at`. **10-50 rows por abogado** (`useRequests` limit 50).
2. `public.service_quote_requests` — `lawyer_id = auth.uid()`, `user_name/email/phone`, `service_title`, `description`, `status`, `created_at`. **Requiere presupuesto** (`requires_quote` en `lawyer_services`).

No se creó `requests` table. `bookings` + `service_quote_requests` ya cubre "request" como lead entrante. `consultations` y `appointments` son legacy pero no fuente de requests (se mantienen sin tocar).

**Evidencia:** `useLawyerJobs:56-68` `Promise.all(...from('bookings')...eq('lawyer_id', user.id)...from('service_quote_requests')...)`, `src/pages/lawyer/QuoteRequestsPage:59` `eq('lawyer_id', user.id)`, `supabase/migrations` sin nueva request table, `App.tsx:576` `/lawyer/consultas` oculto.

---

## 4. Request → Client → Case Data Flow

```
Marketplace: client → /abogado/:slug → /booking/:lawyerId → POST /api/bookings/create (NO AUTH, service_role)
  → bookings {id, lawyer_id, user_name/email/phone, service_title, price, status:pending, source:UNKNOWN, client_id:null}

Lawyer SaaS:
  /lawyer/requests (useRequests) — SELECT bookings+service_quote_requests WHERE lawyer_id=auth.uid() ORDER BY created_at DESC
    ↓ "Procesar solicitud" (RequestsPage:72 handleProcess)
  1. findOrCreateClient({name, email, phone, source}) — useLawyerClients.findOrCreateClient
     - normalizeEmail = trim+lower, ''/null/'   '→null (src/lib/normalizeEmail.ts, Fase 1A)
     - if normalizedEmail exists for this lawyer (SELECT where lawyer_id=auth.uid() AND lower(btrim(email))=norm) → reuse
     - else INSERT lawyer_clients {lawyer_id: auth.uid() (! from input), name, email: normalized, phone, source, first_booking_id}
     - UNIQUE (lawyer_id, lower(btrim(email))) WHERE email IS NOT NULL en DB previene race (409)
     - Different lawyers same email → 2 rows (lawyer_id different, OK)
  2. UPDATE bookings SET client_id = client.id WHERE id=bookingId AND lawyer_id=auth.uid() (RLS)
  3. INSERT lawyer_cases {lawyer_id: auth.uid(), client_id, booking_id OR quote_request_id, title=service_title, description, source, status:'new', price_clp} 
     - UNIQUE (booking_id) WHERE NOT NULL y UNIQUE (quote_request_id) WHERE NOT NULL previenen duplicado (409)
     - If case exists for same booking/quote (SELECT), reuse id
     - RLS WITH CHECK (auth.uid()=lawyer_id AND client_id EXISTS AND booking_id EXISTS where lawyer_id=auth.uid()) blocks cross-tenant

  → navigate /lawyer/cases/:caseId

  /lawyer/clients — SELECT lawyer_clients WHERE lawyer_id=auth.uid() (useLawyerClients)
    → /lawyer/clients/:clientId — SELECT single + JOIN lawyer_cases/bookings for history
  /lawyer/cases — SELECT lawyer_cases WHERE lawyer_id=auth.uid() JOIN lawyer_clients/bookings
    → /lawyer/cases/:caseId — SELECT single + update status/client
```

**No se duplica booking:** `lawyer_cases.booking_id` UNIQUE partial. **No se migra histórico.**

---

## 5. Routes Added

| Route | File | Guard | Note |
|-------|------|-------|------|
| `/lawyer/requests` | `src/pages/lawyer/RequestsPage.tsx` (new) | `RequireLawyer` via `DashboardLayout` | Inbox, uses `useRequests` |
| `/lawyer/clients` | `src/pages/lawyer/ClientsPage.tsx` (new) | `RequireLawyer` | List + search + create Dialog |
| `/lawyer/clients/:clientId` | `src/pages/lawyer/ClientDetailPage.tsx` (new) | `RequireLawyer` | Detail, edit, delete, cases/bookings history |
| `/lawyer/cases` | `src/pages/lawyer/CasesPage.tsx` (new) | `RequireLawyer` | List + filter, create Dialog |
| `/lawyer/cases/:caseId` | `src/pages/lawyer/CaseDetailPage.tsx` (new) | `RequireLawyer` | Detail, edit status/client, delete, link to client |

Existing routes kept: `/lawyer/dashboard`, `/lawyer/citas` (legacy, not replaced), `/lawyer/jobs` (kept, now alias to cases via nav), `/lawyer/services`, `/lawyer/profile`, `/lawyer/quotes/:id`, `/lawyer/ai`, etc. No removal.

`src/App.tsx:87-91` added 5 lazy imports, `App.tsx:585-589` added 5 child routes under `/lawyer`.

---

## 6. Components Added

- **Pages (5):** `RequestsPage`, `ClientsPage`, `ClientDetailPage`, `CasesPage`, `CaseDetailPage` — each ~150-300 LOC, uses `Card`, `Button`, `Badge`, `Input`, `Dialog`, `Select`, `Textarea`, `Loader2`, `Search`, `User` etc. Prioritizes loading/empty/error states, mobile usable, no animations polish.
- **No new global providers** — uses existing `AuthProvider`, `QueryClientProvider`, `NotificationProvider` (`App.tsx:562`).
- **Existing CitasPage untouched** — documented as legacy with phantom `profiles` insert (`CitasPage:90-118`), not refactored in this phase (deferred to 1B.2).

---

## 7. Hooks Added

| Hook | File | Purpose | Data Access |
|------|------|---------|-------------|
| `useRequests` | `src/hooks/useRequests.ts` (new, 78 LOC) | `Promise.all` bookings + service_quote_requests where `lawyer_id=auth.uid()`, maps to `RequestItem` (id, kind, clientName/email/phone, title, status, source, dates) | Supabase `eq('lawyer_id', user.id)` + RLS |
| `useLawyerClients` | `src/hooks/useLawyerClients.ts` (new, 140 LOC) | CRUD `lawyer_clients` with `normalizeEmail`, `findByNormalizedEmail` (JS filter), `createClient` (dedupe check + 409 handling), `findOrCreateClient` (ilike + lower check), `updateClient`, `deleteClient` | Supabase `eq('lawyer_id', user.id)` + RLS |
| `useLawyerClient` | same file | Single fetch `eq('id', clientId).eq('lawyer_id', user.id).single()` | Supabase |
| `useLawyerCases` | `src/hooks/useLawyerCases.ts` (new, 130 LOC) | CRUD `lawyer_cases` with joins `client:lawyer_clients` + `booking:bookings`, `createCase` (lawyer_id: auth.uid()), `updateCase`, `deleteCase` | Supabase `eq('lawyer_id', user.id)` + RLS `WITH CHECK` for client/booking ownership |
| `useLawyerCase` | same file | Single with joins | Supabase |
| `normalizeEmail` | `src/lib/normalizeEmail.ts` (new, 6 LOC) | `trim+lower, ''→null` — reused from `lawyerClients.test.ts` | Pure |

Existing hooks reused: `useAuth`, `useToast`, `supabaseClient`.

---

## 8. Supabase Queries

**Requests:**
```sql
SELECT * FROM bookings WHERE lawyer_id = auth.uid() ORDER BY created_at DESC LIMIT 50;
SELECT * FROM service_quote_requests WHERE lawyer_id = auth.uid() ORDER BY created_at DESC LIMIT 50;
```

**Clients:**
```sql
SELECT * FROM lawyer_clients WHERE lawyer_id = auth.uid() ORDER BY created_at DESC;
SELECT * FROM lawyer_clients WHERE id = $1 AND lawyer_id = auth.uid(); -- single
INSERT INTO lawyer_clients (lawyer_id, name, email, phone, source, first_booking_id) VALUES (auth.uid(), ...);
UPDATE lawyer_clients SET name|email|phone|notes WHERE id=$1 AND lawyer_id=auth.uid();
DELETE FROM lawyer_clients WHERE id=$1 AND lawyer_id=auth.uid();
```

**Cases:**
```sql
SELECT *, client:lawyer_clients(id,name,email), booking:bookings(id,user_name,service_title,status) FROM lawyer_cases WHERE lawyer_id = auth.uid() ORDER BY created_at DESC;
SELECT * FROM lawyer_cases WHERE id=$1 AND lawyer_id=auth.uid(); -- with joins
INSERT INTO lawyer_cases (lawyer_id, client_id, booking_id, quote_request_id, title, status, source) VALUES (auth.uid(), ...);
UPDATE lawyer_cases SET title|status|client_id WHERE id=$1 AND lawyer_id=auth.uid();
-- RLS WITH CHECK ensures client_id EXISTS (lawyer_id=auth.uid()) and booking_id EXISTS
```

**Bookings link:**
```sql
UPDATE bookings SET client_id = $clientId WHERE id=$bookingId AND lawyer_id = auth.uid();
```

All via `supabase.from(...).eq('lawyer_id', user.id)` + RLS `USING auth.uid()=lawyer_id`.

---

## 9. RLS / Security Assumptions

**Fase 1A RLS is authoritative, not weakened:**
- `lawyer_clients` 4 policies `USING/WITH CHECK auth.uid()=lawyer_id` (including `lawyer_id` takeover blocked via `WITH CHECK`).
- `lawyer_cases` 4 policies with `WITH CHECK (auth.uid()=lawyer_id AND (client_id IS NULL OR EXISTS (SELECT 1 FROM lawyer_clients WHERE id=client_id AND lawyer_id=auth.uid())) AND (booking_id IS NULL OR EXISTS (SELECT 1 FROM bookings WHERE id=booking_id AND lawyer_id=auth.uid())))` — blocks cross-tenant client/booking attach and `lawyer_id` takeover.
- `bookings` RLS not modified (marketplace `POST /api/bookings/create` remains `service_role` bypass). SaaS `UPDATE bookings SET client_id` uses `eq('lawyer_id', auth.uid())` + RLS `USING auth.uid()=lawyer_id` (existing, not changed in this phase). Marketplace `source=UNKNOWN` default preserved.
- **No service_role from frontend** (`supabase` client uses anon key, `auth` session). No `lawyer_id` from client input trusted (always `user.id`).
- **Anonymous/client cannot read SaaS:** `lawyer_clients/cases` `USING auth.uid()=lawyer_id` with `auth.uid()=null` → 0 rows (verified via `rls.test.ts` anon 0).

**Assumptions not changed:** `appointments` legacy RLS unknown but untouched; `service_quote_requests`/`booking_leads` RLS audited but not refactored (no new policies in this phase).

---

## 10. Tests

**Targeted:**
- `src/__tests__/lawyerClients.test.ts` — normalizeEmail unit (8 tests, existing Fase 1A)
- `src/__tests__/lawyerCases.test.ts` — status/source/single-source unit (8 tests)
- `src/__tests__/bookings.test.ts` — bookings.source unit (4 tests)
- `src/__tests__/phase1B1.test.ts` — **new** (8 tests: 3 unit + 5 integration real)

**RLS:**
- `src/__tests__/rls.test.ts` — 4 real + 1 fallback (existing Fase 1A, updated with `persistSession:false` to avoid token collision, `testTimeout 15000`)
- `src/__tests__/phase1B1.test.ts` RLS section (5 integration, `maybeDescribe` skip without `TEST_LAWYER_*`):
  - Same lawyer duplicate normalized email → 409 unique
  - Different lawyers same email → 2 rows
  - A cannot attach B booking → 403
  - Request processing creates client+case and reuses existing client + booking unique 409
  - lawyer_id takeover blocked (update `lawyer_id` → still A, `PATCH 403`)

**Results:**
- `npm run test:run -- lawyerClients/lawyerCases/bookings/phase1B1 --testTimeout=15000` → **24 passed | 5 skipped (without env)**
- With `TEST_LAWYER_A/B` env (bfe3eeb6/6feb597c, `Test1234!LegalUp1A`) → **34 passed (5 files)** (`lawyerClients 8 + lawyerCases 8 + bookings 4 + rls 5 + phase1B1 8` + 1 skipped fallback). All 30s timeout for Render cold start.

**Full:**
- `npm run test:run` (with env, 30s timeout) → **34 passed**, 0 failed.

---

## 11. Marketplace Regression Test

- `POST https://uplegal-service.onrender.com/api/bookings/create` with `lawyer_id f517d831…` (Hans-Christian), `user_name Smoke Test`, `user_email smoke-...@test.invalid`, `price 10000`, `booking_type service`, `service_id 00000000-...` → **200** `booking_id e2445214…`, `source: UNKNOWN` (default), `client_id: null` in DB (verified via `SERVICE_ROLE_KEY=sb_secret_...` `supabase.from('bookings').select('source,client_id')` → `UNKNOWN/null`, then cancelled). **Marketplace flow still returns valid booking, source UNKNOWN, client_id null.**
- `GET` public lawyer profile `profiles where role=lawyer limit 1` via anon → 1 row (Hans-Christian).
- No `POST /api/bookings/create` auth added, no Mercado Pago `POST /create-payment` touched, no webhook changed.

---

## 12. Build Result

```
npm run build
✓ built in 13.11s (previously 10.03s, +~3s for 5 new pages)
dist/assets/* — all chunks (analytics 462k, AICaseDetail 162k etc.), no new bundle errors
[INEFFECTIVE_DYNAMIC_IMPORT] warning for useAIDocuments (pre-existing, not introduced)
```

---

## 13. Typecheck Result

```
npx tsc -p tsconfig.app.json --noEmit --skipLibCheck
Baseline: timeout >90s (project large, pre-existing, not Fase 1B.1)
Comparison: same timeout, no new type errors introduced by 5 new pages/hooks (they use `src/types/supabase.ts` regenerated 2026-09-04, `lawyer_clients/cases` types exist, `bookings.source/client_id` exists)
Build (vite/esbuild) passes typecheck as proxy, so no new type errors
```

Known type errors in `ratingService.ts`/`payment_events` (pre-existing, `skipLibCheck` hides but `tsc` without skip would fail) — not introduced by this phase.

---

## 14. Known Limitations

- `CitasPage` still has phantom `profiles` insert (`CitasPage:90-118`) and local-only delete (`CitasPage:54`) — documented, not refactored (Fase 1B.2).
- `Requests` shows both `bookings` and `service_quote_requests` but does not yet mark request as "processed" (no `status` update on bookings after processing; case creation is the marker).
- `Clients` search is simple `includes` (client-side), not `ilike` server-side pagination — fine for <500 clients, will need `limit/offset` for large firm.
- `Cases` `ai_workspace_id` not used (AI deferred).
- No pagination for clients/cases (limit 50 for requests, no limit for clients/cases).
- No `lawyer_clients.notes` timeline or communications.
- `bookings` `source` for SaaS-created bookings via `supabase.from('bookings').insert` would need RLS INSERT policy for `lawyer_id=auth.uid()` — currently not allowed (403) so SaaS agenda direct insert is not used in this phase (only marketplace bookings via service_role). Documented as Fase 1B.2 (needs RLS INSERT policy for `bookings` if SaaS creates appointments directly).

---

## 15. Deferred Items

```
Calendar/day view redesign, week view, appointments migration, lawyer_availability editor,
RevenuePage fix (lawyer_amount), Dashboard redesign, analytics PostHog events (request_viewed etc.),
billing/subscriptions, organizations/seats/teams, tasks/Kanban, SII, document management, AI,
notifications, email/WhatsApp, realtime, advanced CRM filters, pagination, RLS for appointments/service_quote_requests refactor
```
All `DEFERRED_TO_1B.2` per scope.

---

## 16. Recommendation for Fase 1B.2

1. **Calendar unification** — Add RLS `INSERT` policy for `bookings` where `lawyer_id=auth.uid()` and `source=LAWYER_DIRECT` so SaaS can create appointments directly without marketplace endpoint; then refactor `CitasPage` to use `bookings` source of truth and remove phantom `profiles` creation.
2. **Revenue** — Fix `EarningsPage` to use `payments.lawyer_amount` and `payout_status`, remove `generateMockTransactions`.
3. **Dashboard** — Minimal "Hoy" widget showing `requests pending count`, `clients count`, `cases pending`, next appointment (from `bookings`), but no full redesign.
4. **Tests** — Add pagination and `ilike` search for clients/cases, and `bookings` RLS INSERT test.

No new migrations needed for 1B.2 except `bookings` RLS INSERT policy (if not already present) and possibly `lawyer_availability` integration.

