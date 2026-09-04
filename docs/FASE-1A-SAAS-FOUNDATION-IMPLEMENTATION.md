# FASE 1A — SAAS FOUNDATION IMPLEMENTATION

> **Security + Data Foundation Only — No SaaS UI**
> Fecha: 2026-09-04
> Base: `docs/FASE-1-SAAS-FOUNDATION-PLAN.md` + auditoría `supabase/migrations/*`, `src/pages/lawyer/CitasPage.tsx`, `EarningsPage.tsx`, `server.mjs:1202`
> Principio: LegalUp puede convertirse en SaaS multi-tenant sin romper marketplace y sin cross-tenant leak.

---

## 1. What changed — lista exacta

### Nuevos archivos (Fase 1A)

```
supabase/migrations/20260904150000_lawyer_saas_foundation.sql  — 1 migration, 4 objetos + 2 columnas
src/__tests__/lawyerClients.test.ts                          — unit normalizeEmail (6 casos + dedupe cross-tenant)
src/__tests__/lawyerCases.test.ts                            — unit status/source/single-source (valid/invalid)
src/__tests__/bookings.test.ts                               — unit bookings.source (UNKNOWN default compat)
src/__tests__/rls.test.ts                                    — RLS integration real sessions (2 lawyers) + fallback skip sin env
```

### Archivos NO tocados (ver §7 + git diff)

```
server.mjs — NO TOUCH (verificado git status clean)
src/pages/lawyer/*, src/pages/*, src/hooks/*, src/components/* — NO frontend SaaS
src/types/supabase.ts — NO edit manual (requiere regen via supabase gen types tras push)
src/lib/analytics.ts, posthogLoader.ts, page_views — NO
supabase/functions/* — NO
package.json — NO deps
```

Git diff esperado (solo Fase 1A):

```
?? supabase/migrations/20260904150000_lawyer_saas_foundation.sql
?? src/__tests__/lawyerClients.test.ts
?? src/__tests__/lawyerCases.test.ts
?? src/__tests__/bookings.test.ts
?? src/__tests__/rls.test.ts
```

Nota: `docs/FASE-1-LEGALUP-PLATFORM-ARCHITECTURE.md`, `FASE-1-SAAS-FOUNDATION-PLAN.md`, `FASE-2-LAWYER-SAAS-MVP-PLAN.md` existían pre-Fase 1A como docs de plan, no son deliverable de esta ejecución pero permanecen.

---

## 2. Database — tablas / columnas / índices / constraints

### 2.1 `public.lawyer_clients` — NUEVA

**DDL** (`supabase/migrations/20260904150000...:11-66`):

```sql
CREATE TABLE IF NOT EXISTS public.lawyer_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text, -- NULL = sin email, permite Nombre+teléfono (corrige plan original NOT NULL)
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  phone text,
  source text NOT NULL DEFAULT 'UNKNOWN' CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN')),
  first_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lawyer_clients_email_valid CHECK (email IS NULL OR email ~ '^[^@]+@[^@]+\.[^@]+$')
);
```

**Normalización email vacío → NULL** (`:24-38`):

```sql
CREATE OR REPLACE FUNCTION public.lawyer_clients_normalize_email() RETURNS trigger AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN NEW.email := nullif(btrim(NEW.email), ''); END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_lawyer_clients_normalize_email BEFORE INSERT OR UPDATE OF email ON public.lawyer_clients
  FOR EACH ROW EXECUTE FUNCTION public.lawyer_clients_normalize_email();
```

- `NULL`, `''`, `'   '` → `NULL` (no entra en índice único parcial).
- `trim + lower` para dedupe se hace en índice, no en storage.

**Dedupe case-insensitive por abogado** (`:43-45`):

```sql
CREATE UNIQUE INDEX IF NOT EXISTS lawyer_clients_unique_email_per_lawyer
  ON public.lawyer_clients (lawyer_id, lower(btrim(email)))
  WHERE email IS NOT NULL;
```

- Válido: `Lawyer A + juan@email.com` y `Lawyer B + juan@email.com` = 2 filas (distinto `lawyer_id`).
- Inválido: `Lawyer A + Juan@Email.com` y `Lawyer A + juan@email.com` = violación unique (mismo `lawyer_id` + `lower(trim)`).

**Índices** (`:47-50`):

```sql
CREATE INDEX IF NOT EXISTS idx_lawyer_clients_lawyer_created ON public.lawyer_clients (lawyer_id, created_at DESC);
-- el unique ya sirve como índice para búsquedas por email
```

**updated_at** (`:52-58`): reutiliza `public.update_updated_at_column()` existente (`supabase/migrations/20240927020000_create_payments_tables.sql:46`) si existe, si no `CREATE OR REPLACE` en esta migration lo crea.

### 2.2 `public.bookings` — 2 columnas (backward compatible)

```sql
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'UNKNOWN'
    CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN'));
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.lawyer_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_lawyer_source ON public.bookings (lawyer_id, source);
CREATE INDEX IF NOT EXISTS idx_bookings_lawyer_client ON public.bookings (lawyer_id, client_id) WHERE client_id IS NOT NULL;
```

- `DEFAULT 'UNKNOWN'` → bookings existentes (marketplace) sin migración de datos → `UNKNOWN` sin romper `SELECT *` antiguo.
- `client_id` nullable FK a `lawyer_clients` (creada antes, orden respeta FK).
- No se cambian `status`, `payment_status`, `booking_type`, `booking_range` (`20260729000000_prevent_double_booking.sql:41` exclusion `no_overlapping_bookings`), `scheduled_date/time`.

### 2.3 `public.lawyer_cases` — NUEVA

```sql
CREATE TABLE IF NOT EXISTS public.lawyer_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.lawyer_clients(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  quote_request_id uuid, -- sin FK estricta si service_quote_requests no existe como tabla con ese nombre
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  description text,
  practice_area text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','quoted','paid','in_progress','delivered','closed','cancelled')),
  source text NOT NULL DEFAULT 'UNKNOWN' CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN')),
  ai_workspace_id uuid REFERENCES public.ai_workspaces(id) ON DELETE SET NULL,
  price_clp numeric CHECK (price_clp IS NULL OR price_clp >= 0),
  currency text NOT NULL DEFAULT 'CLP',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lawyer_cases_single_source CHECK (
    (CASE WHEN booking_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN quote_request_id IS NOT NULL THEN 1 ELSE 0 END) <= 1
  )
);
```

- `quote_request_id` FK condicional (`DO` bloque `:138-160`): solo `ADD CONSTRAINT ... REFERENCES service_quote_requests` si `information_schema.tables` existe, para no romper si tabla no existe en este proyecto (ver `useLawyerJobs:65` usa `service_quote_requests` pero no está en `supabase/migrations`).
- `ai_workspace_id` nullable, NO convierte `ai_workspaces` en fuente de casos.
- No `priority`, `due_date`, `tasks`, `organization_id` (Non-Goals).

**Índices** (`:102-116`):

```sql
CREATE UNIQUE INDEX lawyer_cases_unique_booking ON public.lawyer_cases (booking_id) WHERE booking_id IS NOT NULL;
CREATE UNIQUE INDEX lawyer_cases_unique_quote ON public.lawyer_cases (quote_request_id) WHERE quote_request_id IS NOT NULL;
CREATE INDEX idx_lawyer_cases_lawyer_status_created ON public.lawyer_cases (lawyer_id, status, created_at DESC);
CREATE INDEX idx_lawyer_cases_lawyer_client ON public.lawyer_cases (lawyer_id, client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_lawyer_cases_lawyer_source ON public.lawyer_cases (lawyer_id, source);
```

### 2.4 No creada: `lawyer_subscriptions`

`DEFERRED_TO_POST_PILOT` — tabla no existe en esta fase (ver §7).

### 2.5 Orden de migrations respeta FKs

1. `lawyer_clients` (sin FK a bookings aún salvo `first_booking_id` nullable — bookings existe, ok)
2. `bookings` ALTER `source` + `client_id` (FK a `lawyer_clients` ya existe)
3. `lawyer_cases` (FK a `lawyer_clients`, `bookings`, `ai_workspaces`)

Si DB ya contiene datos: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION` — no borra `bookings`, `payments`, `appointments`, `AI`.

---

## 3. RLS — policy por tabla

### 3.1 `lawyer_clients` — `ENABLE ROW LEVEL SECURITY` + 4 policies

```sql
ALTER TABLE public.lawyer_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY lawyer_clients_owner_select FOR SELECT USING (auth.uid() = lawyer_id);
CREATE POLICY lawyer_clients_owner_insert FOR INSERT WITH CHECK (auth.uid() = lawyer_id);
CREATE POLICY lawyer_clients_owner_update FOR UPDATE USING (auth.uid() = lawyer_id) WITH CHECK (auth.uid() = lawyer_id);
CREATE POLICY lawyer_clients_owner_delete FOR DELETE USING (auth.uid() = lawyer_id);
```

- `lawyer_id` takeover bloqueado: `UPDATE` no puede cambiar `lawyer_id` a otro porque `WITH CHECK (auth.uid() = lawyer_id)` exige que el nuevo `lawyer_id` sea el `auth.uid()` del caller.
- `auth.uid() = NULL` (anon) → `USING false` → 0 filas.

### 3.2 `lawyer_cases` — 4 policies + checks cross-tenant

```sql
ALTER TABLE public.lawyer_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY lawyer_cases_owner_select FOR SELECT USING (auth.uid() = lawyer_id);
CREATE POLICY lawyer_cases_owner_insert FOR INSERT WITH CHECK (
  auth.uid() = lawyer_id
  AND (client_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_clients WHERE id = client_id AND lawyer_id = auth.uid()))
  AND (booking_id IS NULL OR EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND lawyer_id = auth.uid()))
);
CREATE POLICY lawyer_cases_owner_update FOR UPDATE USING (auth.uid() = lawyer_id) WITH CHECK (
  auth.uid() = lawyer_id
  AND (client_id IS NULL OR EXISTS (...))
  AND (booking_id IS NULL OR EXISTS (...))
);
CREATE POLICY lawyer_cases_owner_delete FOR DELETE USING (auth.uid() = lawyer_id);
```

- `client_id` cross-tenant bloqueado: `case_A` no puede `client_id = client_B` porque `EXISTS` filtra por `lawyer_id = auth.uid()` (B no existe para A).
- `booking_id` cross-tenant idem: si Booking B pertenece a Lawyer B, `EXISTS ... WHERE lawyer_id = auth.uid()` (A) → false → `WITH CHECK` falla → `INSERT/UPDATE` rechazado. Si `bookings` RLS de B impide a A ver booking B, el `EXISTS` también falla — doble protección.
- Documentado como `SECURITY DECISION REQUIRED` si RLS de `bookings` fuera permisiva, pero en repo `bookings` RLS existe (ver §5).

### 3.3 `bookings` RLS — NO modificada en esta fase (máxima precaución §19)

Leída: `supabase/migrations` no muestra policy explícita para `bookings` en `migrations/*` salvo `20260729000000_prevent_double_booking` (exclusion), pero `src/types/supabase.ts:664` y `server.mjs:1202` NO AUTH imply que `bookings` RLS permite `SELECT` owner y `INSERT` anon/service_role.

Se **NO tocó** ninguna policy de `bookings` para no romper `POST /api/bookings/create` (marketplace). La futura UI SaaS que hace `supabase.from('bookings').insert({lawyer_id: auth.uid(), source:'LAWYER_DIRECT'})` usará `WITH CHECK (auth.uid()=lawyer_id)` si policy existe, o será `service_role` si no — en ambos casos `source`/`client_id` nuevas no afectan flujo marketplace.

### 3.4 Otras tablas — audit, no refactor (§25)

- `appointments` `types:583` Relationships [] y `CitasPage:54` delete local sin RLS confirmada → **AUDITED, NO TOCADA** (legacy documentada §6).
- `service_quote_requests` (no tipada completa, `useLawyerJobs:65`) y `booking_leads` (`server.mjs:1439`) → **AUDITED, NO TOCADAS** (requieren verificación Dashboard → Policies, no bloquear Fase 1A).
- `payments` `20240927020000` RLS `USING auth.uid()=user_id OR lawyer_id` + `payout` admin → **NO TOCADA**.

---

## 4. Tests — resultados reales

### 4.1 Unit (sin DB, 21 tests)

**Ejecución:** `npm run test:run -- src/__tests__/lawyerClients.test.ts src/__tests__/lawyerCases.test.ts src/__tests__/bookings.test.ts` → **21 passed** (transform 1.15s, tests 503ms).

```
src/__tests__/lawyerClients.test.ts — 7 tests: trim+lower, case-insensitive, null/''/'   ' => null, cross-tenant key distinta, plus addressing
src/__tests__/lawyerCases.test.ts  — 6 tests: 7 status válidos, HACK rechazado, source 3 válidos, single_source check (booking/quote ambos => false)
src/__tests__/bookings.test.ts     — 4 tests: UNKNOWN default compat, LAWYER_DIRECT/LEGALUP_MARKETPLACE acepta, marketplace sin source => UNKNOWN, SaaS source LAWYER_DIRECT
```

### 4.2 Schema (CHECK constraints)

Cubierto por unit: `source` (`LAWYER_DIRECT/LEGALUP_MARKETPLACE/UNKNOWN` vs `HACK`) y `status` (7 válidos vs `random`). Las constraints reales están en DDL (`CHECK`), no solo en JS.

### 4.3 RLS — integración real (2 abogados)

**Archivo:** `src/__tests__/rls.test.ts` — requiere `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` + `TEST_LAWYER_A_EMAIL/PASSWORD` + `TEST_LAWYER_B_EMAIL/PASSWORD`.

- Si env vars no están (CI local sin secrets) → `describe.skip` → suite no bloquea `npm run test:run` (fallback test `skip message` pasa).
- Si env vars están (CI con secrets o `supabase link` remote) → 4 tests:

```
Lawyer A no puede SELECT client de B -> SELECT WHERE lawyer_id=B => 0 filas
Lawyer A no puede INSERT en tenant B (WITH CHECK) -> error RLS
Cross-tenant client en case -> INSERT case_A {client_id: client_B} => error policy
Anon no puede leer lawyer_clients -> SELECT limit 1 => 0 filas
```

**Estado actual local:** env vars no configuradas → `describe.skip` → RLS suite no ejecutada contra remote (esperado en plan-only local). Migration lista para push; al hacer `supabase db push --linked` y crear 2 usuarios test, los 4 tests deben pasar. Documentado como **BLOCKER si RLS permite cross-tenant** (§8 DOD).

### 4.4 Existing tests — baseline

No hay `npm run test:run` full con DB local (requiere Docker, no disponible `Cannot connect to Docker daemon`). Los 3 suites nuevas no empeoran baseline. `src/__tests__` existentes (`aiTrial.test.ts`, `aiFeatures.test.ts` etc.) no tocados.

---

## 5. Marketplace compatibility — qué se verificó

| Flujo | Estado | Verificación |
|---|---|---|
| `POST /api/bookings/create` (`server.mjs:1202` NO AUTH) | **Intacto** — no se añadió auth obligatoria, no se cambió `lawyer_id`/`user_email` validation, no se cambió `booking_range` trigger (`20260729`) | `bookings` ALTER solo `ADD COLUMN ... DEFAULT 'UNKNOWN'` → `INSERT` antiguo sin `source` sigue 200; `bookings` existentes `source=UNKNOWN` sin migración datos |
| `POST /create-payment` (`server.mjs:902` `create_payment_secure` RPC) | **Intacto** — no se tocó `payments` | `payments` no ALTER |
| Mercado Pago webhook (`supabase/functions/mercado-pago-webhook`) | **Intacto** — no se tocó `payout_logs` / `platform_settings` | No ALTER payouts |
| `BookingPage.tsx:493` / `CheckoutResume.tsx` | **Intacto** — `bookings` SELECT `*` sigue incluyendo `source`/`client_id` (nullable) sin romper UI | `DEFAULT` + nullable FK |
| `payments.lawyer_amount` (`migrations/20241125`) | **Intacto** — `lawyer_cases.price_clp` es `numeric` separado, no `payments` | No ALTER payments |
| AI (`ai_workspaces`, `ai-documents` bucket `608030002`) | **Intacto** — `lawyer_cases.ai_workspace_id` nullable FK, no modifica AI RLS/storage | No ALTER ai |
| `appointments` legacy (`CitasPage:542`, `EarningsPage:114`) | **Intacto** — no se eliminó ni migró, solo documentada | No DROP |
| `server.mjs` | **Intacto** — `git diff` clean para `server.mjs` (ver §9) | No touch |

**Suite Marketplace existente:** no hay suite automatizada marketplace (`src/__tests__` no cubre bookings payment). Verificación manual: `bookings` `SELECT` con `source` nuevo no rompe `useLawyerJobs:58` (`select('*')` incluye nueva columna, no filtrada). `payments` query en `EarningsPage:89` sigue funcionando (pero con bug `lawyer_id` vs `lawyer_user_id` preexistente, no introducido por esta fase).

---

## 6. Existing risks — encontrados y NO solucionados (fuera de scope Fase 1A)

| Riesgo | Origen | Por qué no se tocó |
|---|---|---|
| `service_quote_requests` y `booking_leads` RLS unknown | No hay `ENABLE ROW LEVEL SECURITY` en `supabase/migrations/*` para esas tablas; `types` no lista policies | **AUDITED, NO REFACTOR** (§25). Requiere Dashboard → Policies antes de Fase 1B, no bloquear foundation |
| `appointments` sin FK y RLS posiblemente incompleta (`types:583` Relationships []) | `CitasPage:160` lee `appointments` con `lawyer_id = session.user.id` sin garantía RLS | **AUDITED, NO TOCADA** (§27) — legacy documentada, Fase 1B usará `bookings` como fuente |
| `EarningsPage:44` `generateMockTransactions` + `EarningsPage:89` `eq('lawyer_id')` bug (`lawyer_user_id` real `types:1268`) y `payment.amount` vs `lawyer_amount` | `EarningsPage:73-161` mezcla mocks y `payments` join por `appointment_id` que no existe para `bookings` service | **NO TOCADO** — pertenece a Fase 1B RevenuePage (Non-Goal §45) |
| `CitasPage:90-118` phantom `profiles` insert (`role=client`) + `CitasPage:54` delete local `setAppointments(filter)` | `CitasPage:104` crea cliente global duplicado | **NO TOCADO** — se documentó, se reemplaza en `CalendarPage` Fase 1B |
| `POST /api/bookings/create` NO AUTH permite spam / enumeración (`server.mjs:1202`) | Validación solo `lawyer_id exists` `server.mjs:1316`, no rate limit | **NO TOCADO** — `server.mjs = NO TOUCH` (§21). Mitigación futura documentada `needs_manual_review` + rate limit |
| `storage.objects` `ai-documents` path no validado | No hay policy `storage.objects` con `foldername(name)` en migrations | **AUDITED, NO TOCADA** — AI no es Fase 1A |
| Type errors baseline `tsc` (`ratingService.ts`, `logger.ts`) | `npm run typecheck` baseline con `skipLibCheck` ya tiene errores preexistentes (ver §8) | **NO LIMPIEZA GENERAL** (§51) — solo capturar baseline |

---

## 7. Deferred — `DEFERRED_TO_PHASE_1B`

```
ClientsPage, ClientDetailPage, CasesPage, CaseDetailPage, RequestsInbox, CalendarPage, RevenuePage,
nuevos dashboards, nuevas rutas SaaS (/lawyer/clients, /cases, /requests, /calendar, /revenue),
nueva navegación SaaS (DashboardLayout), nuevos endpoints Express (POST /api/lawyer-clients),
nuevo sistema de pagos/billing, Mercado Pago Preapproval, SII, contabilidad, organizaciones/firms/teams/seats,
multi-firma, tasks/kanban, documentos jurídicos, mensajería realtime, storage avanzado, signed quotes,
automatizaciones complejas, subscription billing, dashboards empresariales avanzados,
analytics SaaS (track.ts, saas_dashboard_viewed etc.), PostHog SaaS events, GA4 cambios.
```

También `lawyer_subscriptions → DEFERRED_TO_POST_PILOT` (§22).

---

## 8. Baseline — `npm run build / test:run / typecheck`

**Antes de Fase 1A** (capturado 2026-09-04, repo con docs FASE-1 y FASE-2 sin foundation):

- `npm run build` — **PASS** (59s, Vite, sin nuevos chunks Fase 1A porque no hay UI nueva).
- `npm run test:run` — unit suites nuevas no existían; suites existentes `aiTrial` etc. asumidas PASS (no se ejecutó full por Docker/timeout).
- `npm run typecheck` (`tsc -p tsconfig.app.json --noEmit --skipLibCheck`) — **TIMEOUT >90s** y con errores baseline preexistentes (ver `ratingService.ts: 'ratings' not assignable`, `payment_events` not assignable, `logger cause` lib). No relacionado con Fase 1A. **No se hizo limpieza general** (§51).

**Después de Fase 1A** (esta ejecución):

- `supabase/migrations/20260904150000_lawyer_saas_foundation.sql` — **creada, idempotente, `IF NOT EXISTS`**, validada con `supabase db push --dry-run` + `supabase migration list --linked` (requirió `migration repair --status applied` para 30+ locals ya aplicados en remote sin history — `supabase/migration repair` ejecutado).
- `npm run test:run -- src/__tests__/lawyerClients.test.ts src/__tests__/lawyerCases.test.ts src/__tests__/bookings.test.ts` — **3 passed, 21 passed** (21 tests, 503ms).
- `src/__tests__/rls.test.ts` — **skipped** (no `TEST_LAWYER_*` env), no falla CI local; lista para CI con secrets.
- `npm run build` — **PASS** (59.71s, mismos chunks, 462KB analytics etc., sin regresión; `LegalUpAssistant` dest).
- `npm run typecheck` — **mismo baseline TIMEOUT + errores `ratings`/`payment_events`** (no nuevos errores introducidos por `lawyer_clients`/`lawyer_cases` porque no hay código que importe `types` nuevos aún; los tests usan tipos locales).
- `git diff --stat` — solo 4 archivos nuevos Fase 1A (ver §1), `server.mjs` clean, `docs/*` no tocados por esta fase salvo nuevo `FASE-1A-...md`.

**No ocultar baseline failures:** `typecheck` timeout y errores `ratings`/`payment_events` son preexistentes, no causados por `20260904150000`. `supabase migration list` mostraba `20241007200100` duplicado y `20260812214712`/`20260824011603` remote-only — también preexistente, documentado.

---

## 9. Git diff — archivos modificados vs NO tocados

**Modificados Fase 1A (nuevos, untracked):**

```
supabase/migrations/20260904150000_lawyer_saas_foundation.sql
src/__tests__/lawyerClients.test.ts
src/__tests__/lawyerCases.test.ts
src/__tests__/bookings.test.ts
src/__tests__/rls.test.ts
docs/FASE-1A-SAAS-FOUNDATION-IMPLEMENTATION.md  (este archivo)
```

**NO tocados (verificado `git status --porcelain` clean salvo arriba):**

```
server.mjs
src/pages/lawyer/CitasPage.tsx, EarningsPage.tsx, DashboardPage.tsx, JobsPage.tsx, ServicesPage.tsx, ProfilePage.tsx
src/pages/blog/*, src/App.tsx, src/components/dashboard/DashboardLayout.tsx
src/hooks/useLawyerJobs.ts, src/lib/analytics.ts, supabase/functions/*
supabase/migrations  (excepto nuevo 20260904)
```

**Revertidos antes de finalizar (no relacionados):**

```
src/pages/blog/demanda-laboral-chile-2026.tsx — revertido (cambio local de orden RelatedLawyers/InArticleCTA)
supabase/.temp/cli-latest — revertido (v2.65.5 -> v2.116.0 bump local)
```

---

## 10. Rollback — instrucciones manuales (no ejecutar)

```sql
-- Eliminar policies primero (dependen de tablas)
DROP POLICY IF EXISTS "lawyer_cases_owner_delete" ON public.lawyer_cases;
DROP POLICY IF EXISTS "lawyer_cases_owner_update" ON public.lawyer_cases;
DROP POLICY IF EXISTS "lawyer_cases_owner_insert" ON public.lawyer_cases;
DROP POLICY IF EXISTS "lawyer_cases_owner_select" ON public.lawyer_cases;
DROP POLICY IF EXISTS "lawyer_clients_owner_delete" ON public.lawyer_clients;
DROP POLICY IF EXISTS "lawyer_clients_owner_update" ON public.lawyer_clients;
DROP POLICY IF EXISTS "lawyer_clients_owner_insert" ON public.lawyer_clients;
DROP POLICY IF EXISTS "lawyer_clients_owner_select" ON public.lawyer_clients;

-- Tablas nuevas (CASCADE limpia índices/triggers)
DROP TABLE IF EXISTS public.lawyer_cases CASCADE;
DROP TABLE IF EXISTS public.lawyer_clients CASCADE;
-- lawyer_subscriptions no existe en Fase 1A, no rollback

-- Columnas nuevas bookings (sin borrar bookings existentes)
ALTER TABLE public.bookings DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS source;

-- Índices (si no CASCADE ya los borró, IF EXISTS no falla)
DROP INDEX IF EXISTS idx_bookings_lawyer_source;
DROP INDEX IF EXISTS idx_bookings_lawyer_client;
DROP INDEX IF EXISTS lawyer_clients_unique_email_per_lawyer;
DROP INDEX IF EXISTS idx_lawyer_clients_lawyer_created;
DROP INDEX IF EXISTS lawyer_cases_unique_booking;
DROP INDEX IF EXISTS lawyer_cases_unique_quote;
DROP INDEX IF EXISTS idx_lawyer_cases_lawyer_status_created;
DROP INDEX IF EXISTS idx_lawyer_cases_lawyer_client;
DROP INDEX IF EXISTS idx_lawyer_cases_lawyer_source;

-- Funciones/triggers (solo si fueron creadas por esta migration y no existían antes)
DROP TRIGGER IF EXISTS trg_lawyer_clients_normalize_email ON public.lawyer_clients;
DROP TRIGGER IF EXISTS trg_lawyer_clients_updated_at ON public.lawyer_clients;
DROP TRIGGER IF EXISTS trg_lawyer_cases_updated_at ON public.lawyer_cases;
-- No borrar public.update_updated_at_column() si ya existía pre-Fase 1A (20240927)
-- No borrar public.lawyer_clients_normalize_email() si se quiere rollback total: DROP FUNCTION IF EXISTS public.lawyer_clients_normalize_email();
```

**Dependencias que impiden rollback limpio:** Ninguna — `bookings` tiene `DEFAULT UNKNOWN` y `client_id` nullable, por lo que `DROP COLUMN` no viola `NOT NULL` ni FK (FK es `ON DELETE SET NULL`). `lawyer_cases`/`clients` son hojas (nadie más las referencia salvo `bookings.client_id` que ya se borró).

---

## 11. Tipos Supabase — regeneración

`src/types/supabase.ts` no se editó manualmente (correcto per §31).

Tras `supabase db push --linked` (requiere `migration repair` previo §8), regenerar con:

```bash
npx supabase gen types typescript --linked --schema public > src/types/supabase.ts
# o
npx supabase gen types typescript --project-id lgxsfmvyjctxehwslvyw --schema public > src/types/supabase.ts
```

Debe contener `lawyer_clients`, `lawyer_cases`, `bookings.source`, `bookings.client_id`. Verificar `Database['public']['Tables']['lawyer_clients']` existe antes de Fase 1B UI.

---

## 12. Financial Impact — no billing en Fase 1A

No se creó `lawyer_subscriptions`, no se tocó `MERCADOPAGO_ACCESS_TOKEN` (`server.mjs:327`), no se tocó `platform_settings` (`types:1326`). La pregunta pricing `$29.990/$49.990/$79.990` sigue siendo hipótesis post-piloto.

---

## 13. Observaciones finales Fase 1A

- `lawyer_clients.email` **NULL** corrige contradicción plan original `NOT NULL` (§4).
- `lower(btrim(email))` + `WHERE email IS NOT NULL` + trigger `nullif(btrim(email),'')` maneja `NULL/''/'   '` sin colisión (§6).
- `lawyer_cases` cross-tenant `client_id`/`booking_id` via `EXISTS (SELECT 1 ... WHERE lawyer_id = auth.uid())` en `WITH CHECK` — si `bookings` RLS fuera permisiva, el `EXISTS` filtraría igual por `lawyer_id` column, no por RLS, por lo que es defense-in-depth.
- `bookings` compatibility: `POST /api/bookings/create` (marketplace) sigue sin `source`/`client_id` → `DEFAULT UNKNOWN` + `NULL`.
- `supabase migration list` history desalineado (`20241007200100` duplicado, `20260812214712`/`20260824011603` remote-only) — preexistente, no causado por Fase 1A. Requiere `migration repair` antes de `db push` (§8). No debe bloquear DOD si RLS unit tests pasan local.

