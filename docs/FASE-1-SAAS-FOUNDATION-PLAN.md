# FASE 1 — SAAS FOUNDATION PLAN

> **Foundation + Minimal Sellable Product + Commercial Validation**
> Modo: PLAN ONLY — NO CODE CHANGES
> Fecha: 2026-09-04
> Base: lectura directa de `src/`, `server.mjs`, `supabase/migrations/`, `supabase/types`, `src/lib/`, `docs/FASE-1-*` y `docs/FASE-2-*`
> Principio: **PROBLEMA REAL → SOLUCIÓN MÍNIMA → USO REAL → PILOTO → PAGO → RETENCIÓN → ESCALAR** (no IDEA → 100 FEATURES)

---

## 1. Executive Summary

**Objetivo inmediato no es terminar un SaaS.** Es:

1. Base técnica segura (RLS, `bookings` como fuente única, sin duplicar agenda)
2. Núcleo REAL utilizable (solicitudes → cliente → caso → cita → ingreso en un flujo coherente)
3. Validación con abogados reales (Reddit + 10-15 entrevistas, luego 3-5 pilotos)
4. Decisión gate técnica + producto + comercial antes de acelerar

**Hallazgo principal de la auditoría:** ~70% del SaaS ya existe como infraestructura marketplace reutilizable. Faltan **2 tablas nuevas** (`lawyer_clients`, `lawyer_cases`) + **2 columnas** (`bookings.source`, `bookings.client_id` nullable) + **RLS owner**. Todo lo demás es **evolucionar 3 páginas existentes** (Dashboard, Citas, Ingresos) y **crear 3 páginas nuevas mínimas** (Solicitudes, Clientes, Casos). No se necesita ERP, IA nueva, facturación, orgs ni messaging.

**Mayor riesgo técnico:** Doble agenda `bookings` vs `appointments` con escrituras distintas. Si no se fija `bookings` como única fuente antes de crear `lawyer_cases`, el abogado verá números distintos en Dashboard/Citas/Casos.

**Recomendación de orden:** 1) Migraciones + RLS + índices (1 semana) → 2) Dashboard Hoy + Ingresos reales (1 semana, valida métrica) → 3) Clientes → 4) Casos → 5) Solicitudes inbox → 6) Agenda unificada → 7) Analytics mínimos + QA RLS. Cada fase entrega valor sin esperar a la siguiente.

**Gate real:** No “compila y se ve bonito”. Gate es: RLS aísla tenant, `lawyer_clients` deduplica por `lower(email)`, `lawyer_cases` envuelve booking/quote sin duplicar, marketplace/payments/webhook siguen intactos, y hay 3 pilotos con uso real registrado en PostHog.

---

## 2. Current State — Verificado contra código real

### 2.1 Stack y estructura

VERIFIED:

- **Frontend:** `React 18` + `TypeScript 5.9` + `Vite 8.2` + `TailwindCSS 3.4` + `shadcn-ui` (`components.json`) + `React Query 5.56` (`src/App.tsx:4,143`) + `Zustand` (instalado pero uso menor; `src/contexts/*` predomina) + `lucide-react 0.462` + `date-fns 4.1` — `package.json:22-105`.
- **Backend:** `server.mjs:1-2000+` (Express 5.1, `supabase-js 2.58` service_role, `mercadopago 2.10`, `cherio`, `axios`, `resend 6.0`, `zod`, `pdf-parse`, `server/ai/*`).
- **Infra:** `supabase` (Postgres 17, `supabase/config.toml:34`), `Supabase Auth` (`src/contexts/AuthContext/clean/AuthContext.tsx`), `Netlify` (`netlify.toml`), `Render` (`server.mjs:418` `/health`).
- **Analytics:** `posthog-js 1.418` + `posthogLoader.ts` + `PostHogBoundary` (`App.tsx:102`), `GA4` server-side `sendGA4PurchaseEvent` (`server.mjs:172-236`), `page_views` table (`supabase/migrations` no explicita pero `src/lib/analytics.ts:8` y `types/supabase.ts:1160`).

### 2.2 Rutas reales (no lo que dice la arquitectura, lo que hay)

VERIFIED `src/App.tsx:56-653`:

- Público marketplace: `/`, `/search` (`SearchResults.tsx`), `/abogado/:slug` (`PublicProfile.tsx`), `/booking/:lawyerId` (`BookingPage.tsx`), `/checkout/:bookingId` (`CheckoutResume.tsx`), `/payment/success|failure|pending|canceled`, landings SEO (`/abogados-laborales`, `/cae`, `/abogado-divorcio-unilateral` etc. `App.tsx:118-128`), `/ai` (`LegalUpAI.tsx`).
- Lawyer SaaS actual (protegido `RequireLawyer` estático `App.tsx:30` + `DashboardLayout:39`): `/lawyer/dashboard` (`DashboardPage.tsx:17-787`), `/lawyer/profile` (`ProfilePage.tsx:65k LOC`), `/lawyer/services` (`ServicesPage.tsx`), `/lawyer/citas` (`CitasPage.tsx:542`), `/lawyer/consultas` (`ConsultasPage.tsx`, oculta `DashboardLayout:188`), `/lawyer/jobs` (`JobsPage.tsx:450` mapeo `useLawyerJobs`), `/lawyer/earnings` (`EarningsPage.tsx:634`), `/lawyer/ai` + `ai/cases/:caseId`, `/lawyer/favorites`, `/lawyer/notificaciones`, `/lawyer/quotes/:quoteRequestId`, `/lawyer/onboarding` standalone (`LawyerOnboardingPage:47`).
- Cliente: `/dashboard` + 9 subrutas (`UserDashboard`, `Profile`, `Appointments` etc. `App.tsx:528`).

### 2.3 Infra SaaS existente (re-auditada)

| Área | Estado real | Evidencia code | Reutilizable MVP |
|---|---|---|---|
| Perfiles abogado | VERIFIED completo | `ProfilePage.tsx`, `hooks/useProfile.ts:150`, `profiles` `types:1356` RLS `migrations/20240926*` | Sí |
| Onboarding wizard | VERIFIED lazy | `App.tsx:462` `/lawyer/onboarding` → `LawyerOnboardingWizard` | Sí, no duplicar |
| Disponibilidad | VERIFIED pero desacoplada | `profiles.availability` `types:1358`, `migrations/20250101*`, `google_integrations` `types:872` | Sí (read) |
| `lawyer_services` | VERIFIED CRUD ok | `types:905`, `ServicesPage`, `PublicProfile` lee `sort_order` | Sí |
| `bookings` | VERIFIED fuente agenda | `types:664-754`, `server.mjs:1202` NO AUTH, `useLawyerJobs:58` | Sí — **fuente única AD-001** |
| `appointments` | LEGACY con uso activo | `types:583-662`, `CitasPage:160`, `EarningsPage:114`, `ScheduleModal:739,888`, `admin/analytics:500` cuenta ambas | Compat read, no nueva escritura SaaS |
| `service_quote_requests` | VERIFIED pero RLS unknown | `useLawyerJobs:65`, `QuoteRequestsPage`, no en `types` con RLS explicita | Sí, auditar RLS |
| `booking_leads` | VERIFIED service_role | `server.mjs:1439` insert, no en `types` con policy | Sí, auditar |
| `payments` | VERIFIED con `lawyer_amount` | `types:1193`, `migrations/2024092702*`, `server.mjs:1027` `amount = platform_fee+lawyer_amount`, `platform_settings:1326` | Sí, source real `lawyer_amount` |
| `payments` query bug | VERIFIED bug | `EarningsPage:89` filtra `eq('lawyer_id', session.user.id)` pero `payments` FK es `lawyer_user_id` `types:1268` vs `lawyer_id` legacy — y luego `appointments` join por `appointment_id` no siempre existe para `bookings` service | Corregir en MVP |
| Mocks contaminando | VERIFIED | `EarningsPage:44` `generateMockTransactions` existe aunque `fetchTransactions:165` no hace fallback en error, pero `total/completed/pending` `EarningsPage:206` suma `payment.amount` no `lawyer_amount` | Eliminar mocks, filtrar `lawyer_amount` |
| `CitasPage` phantom client | VERIFIED bug | `CitasPage:90-118` hace `from('profiles').insert(role=client)` + `select('id,user_id')` ad-hoc, creando clientes globales duplicados | Reemplazar por `lawyer_clients` upsert |
| `CitasPage` delete local | VERIFIED bug | `CitasPage:54` `setAppointments(filter)` sin `supabase.delete` → cancel no persiste | Corregir en CalendarPage |
| `ai_workspaces` etc. | VERIFIED AI only | `types:545`, `migrations/60803*`, `60804*`, `60805*` | Preservar, link opcional `ai_workspace_id` |
| Auth `RequireLawyer` | VERIFIED | `src/components/auth/RequireLawyer.tsx` estático `App.tsx:30`, `DashboardLayout:94` `checkAuthAndProfile` | Sí |
| Analytics | PARTIAL triple | `page_views` + `posthog` + `GA4` + `payment_events` (`lib/analytics:22`) + `OWNER_EMAILS` filter solo GA4 `server.mjs:144` | Reusar, no triplicar SaaS |

---

## 3. Architecture Validation — AD-001 a AD-009 contra código real

### AD-001 — `bookings` única fuente de citas con horario

**Propuesto:** Todo `bookings`, `appointments` legacy compat.
**Validación:** **CONFIRMADO.** `bookings` tiene `scheduled_date/time` + `duration` + `status` + `payment_status` + prevención overlap `server.mjs:1272-1313` (409) + RPC `get_lawyer_busy_slots` (`types:1704`). `appointments` tiene `appointment_date/time` pero sin FK clara (`types:662` Relationships []), sin prevención server, y es leída en 6 sitios distintos (`CitasPage`, `EarningsPage:114`, `ScheduleModal`, `UserDashboard:278`, `admin/analytics:500`) creando dos verdades. **No crear `lawyer_appointments`.**

### AD-002 — `lawyer_clients` aislado por `lawyer_id`

**Propuesto:** No `profiles(role=client)` global.
**Validación:** **CONFIRMADO.** `profiles` RLS es `auth.uid()=id` (`migrations/20240926*`), no por abogado. Un email con 3 abogados compartiría una fila global → leak. `CitasPage:94` ya hace `profiles` insert ad-hoc sin tenant — anti-pattern. `bookings.user_email/name/phone` `types:687` denormalizado confirma que **no hay join cliente** hoy. Necesita `lawyer_clients` `UNIQUE(lawyer_id, lower(email))`.

### AD-003 — `lawyer_cases` wrapper, no `ai_workspaces`

**Propuesto:** `lawyer_cases` con `booking_id`/`quote_request_id`/`ai_workspace_id` nullable, no convertir AI workspace en caso.
**Validación:** **CONFIRMADO.** `ai_workspaces` (`types:545`, RLS `lawyer_id`) tiene triggers trial 3 casos/10 docs (`migrations/608040100`) que no deben aplicar a SaaS. `JobsPage:272` + `useLawyerJobs:17` es map en memoria `LawyerJob` sin persistencia SaaS. Envolvente permite caso manual sin booking y múltiples bookings futuros.

### AD-004 — Tenant `profiles.id = auth.uid()` / `lawyer_id`

**Propuesto:** No orgs en MVP.
**Validación:** **CONFIRMADO.** `profiles.id` = `auth.uid()` (`server.mjs:529` `id: userId, user_id: userId`). Todo `ai_*`, `lawyer_services`, `bookings` ya filtra por `lawyer_id = auth.uid()` (o `lawyer_user_id`). No hay `organizations` table en `types`. No implementar.

### AD-005 — Supabase + RLS para CRUD normal, `server.mjs` para dinero/secrets

**Validación:** **CONFIRMADO.** `payments` vía `RPC create_payment_secure` `server.mjs:1053` (service_role) + MP `fetch api.mercadopago.com` `server.mjs:1121` con secret `MERCADOPAGO_ACCESS_TOKEN` `server.mjs:327` (nunca `VITE_`, check `isJwt` `server.mjs:1117`). CRUD SaaS simple (clients/cases/bookings) puede ser Supabase directo con RLS owner — pattern ya en `useLawyerJobs:181` `supabase.from('bookings').update(...).eq('id', sourceId)`.

### AD-006 — Marketplace y SaaS comparten `bookings` + `source`

**Validación:** **CONFIRMADO con gap.** `bookings` es compartido (marketplace crea NO AUTH `server.mjs:1202`, SaaS lee). `source` no existe hoy (no en `types:664`), `client_id` tampoco. `metadata.article_slug` `server.mjs:1356` ya traza origen SEO. Añadir `source` `LAWYER_DIRECT/LEGALUP_MARKETPLACE/UNKNOWN` + `client_id FK lawyer_clients` es mínimo sin romper `BookingPage`/`CheckoutResume`.

### AD-007 — Analytics PostHog client + GA4 purchase server

**Validación:** **CONFIRMADO.** `posthog-js` `package.json:24` + `posthogLoader.ts` + `sendGA4PurchaseEvent` server-side `server.mjs:172` + `page_views` + `payment_events` `lib/analytics:30` + `OWNER_EMAILS` `server.mjs:144` filtra GA4 pero no PostHog. SaaS debe usar PostHog client para `saas_*` y no duplicar `purchase`.

### AD-008 — `lawyer_subscriptions` preparado, no cobrar

**Validación:** **CONFIRMADO.** `ai_subscriptions` (`types:362`) ya cobra AI standalone (`AI_SUBSCRIPTION_PRICE 49900` `server.mjs:443`). `lawyer_subscriptions` no existe (`types` sin tabla). Preparar tabla vacía con RLS pero sin `preapproval` MP en esta fase evita scope y valida retención antes de pricing.

### AD-009 — Day view primero

**Validación:** **CONFIRMADO.** `CitasPage:14` `selectedDate=new Date()` + `Today/Mañana` `CitasPage:30` + `Calendar mini` `CitasPage:247` es day-first. Semana como toggle post-validación.

---

## 4. Data Model — Mínimo verificable

### 4.1 Tablas existentes (reusar, no tocar salvo 2 columnas)

- `profiles` `types:1356` — tenant, sin cambios
- `lawyer_services` `types:905` — sin cambios
- `bookings` `types:664` — **añadir** `source` + `client_id` nullable (ver §10)
- `appointments` `types:583` — legacy, solo lectura compat, sin ALTER
- `service_quote_requests` (no tipada completa, `useLawyerJobs:65`) — sin ALTER, solo FK desde `lawyer_cases`
- `payments` `types:1193` — sin ALTER, solo corregir queries a `lawyer_amount` + `payout_status`
- `ai_workspaces` etc. `types:545` — sin ALTER, solo FK nullable desde `lawyer_cases`

### 4.2 `lawyer_clients` — NUEVA (MUST)

```
lawyer_clients
  id uuid PK default gen_random_uuid()
  lawyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
  email text NOT NULL                      -- normalized lower(trim(email))
  name text NOT NULL
  phone text NULL
  source text NOT NULL DEFAULT 'UNKNOWN' CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN'))
  first_booking_id uuid NULL REFERENCES bookings(id) ON DELETE SET NULL
  notes text NULL
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()
  -- email check: CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$') — evita guest sin email
Índices:
  UNIQUE (lawyer_id, lower(email))  -- requiere: CREATE UNIQUE INDEX ... ON lawyer_clients (lawyer_id, lower(email))
  INDEX (lawyer_id, created_at DESC)
  INDEX (lawyer_id, lower(email))
```

**Por qué así:** Un email = un cliente por abogado. Mismo email con 2 abogados = 2 filas (aislado). No FK a `profiles` porque `bookings.user_id` nullable `types:714` (guest sin user). `first_booking_id` nullable tracea origen sin requerir backfill.

### 4.3 `lawyer_cases` — NUEVA (MUST)

```
lawyer_cases
  id uuid PK default gen_random_uuid()
  lawyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
  client_id uuid NULL REFERENCES lawyer_clients(id) ON DELETE SET NULL
  booking_id uuid NULL REFERENCES bookings(id) ON DELETE SET NULL
  quote_request_id uuid NULL REFERENCES service_quote_requests(id) ON DELETE SET NULL
  -- CHECK: (booking_id IS NOT NULL)::int + (quote_request_id IS NOT NULL)::int <= 1  -- 0 o 1, no ambos
  title text NOT NULL
  description text NULL
  practice_area text NULL          -- free-form MVP, no FK specialties
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','quoted','paid','in_progress','delivered','closed','cancelled'))
  source text NOT NULL DEFAULT 'UNKNOWN' CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN'))
  ai_workspace_id uuid NULL REFERENCES ai_workspaces(id) ON DELETE SET NULL
  price_clp integer NULL CHECK (price_clp >= 0)
  currency text NOT NULL DEFAULT 'CLP'
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()
Índices:
  UNIQUE (booking_id) WHERE booking_id IS NOT NULL
  UNIQUE (quote_request_id) WHERE quote_request_id IS NOT NULL
  INDEX (lawyer_id, status, created_at DESC)
  INDEX (lawyer_id, client_id)
  INDEX (lawyer_id, source)
```

**No crear en MVP:** `due_date`, `priority`, `case_tasks`, `case_notes`, `case_documents` (solo `ai_workspace_id` link preparado).

### 4.4 `lawyer_subscriptions` — NUEVA (prep, no cobro)

```
lawyer_subscriptions
  id uuid PK
  lawyer_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','saas_essential','saas_pro'))
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','trialing','active','past_due','cancelled','expired'))
  provider text NULL CHECK (provider IN ('mercadopago','manual'))
  provider_subscription_id text NULL
  amount_clp integer NOT NULL DEFAULT 49900
  current_period_start timestamptz NULL
  current_period_end timestamptz NULL
  trial_started_at timestamptz NULL
  trial_ends_at timestamptz NULL
  cancel_at_period_end boolean NOT NULL DEFAULT false
  cancelled_at timestamptz NULL
  created_at / updated_at
Índices: UNIQUE(lawyer_id), INDEX(status)
Uso MVP: crear tabla + RLS, sin endpoint preapproval. Solo placeholder UI en /lawyer/settings.
```

### 4.5 Cambios a `bookings`

```
ALTER TABLE public.bookings
  ADD COLUMN source text NOT NULL DEFAULT 'UNKNOWN'
    CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN')),
  ADD COLUMN client_id uuid NULL REFERENCES lawyer_clients(id) ON DELETE SET NULL;
CREATE INDEX idx_bookings_lawyer_source ON public.bookings(lawyer_id, source);
CREATE INDEX idx_bookings_lawyer_client ON public.bookings(lawyer_id, client_id) WHERE client_id IS NOT NULL;
-- DEFAULT 'UNKNOWN' mantiene compat: bookings existentes y BookingPage no roto
```

---

## 5. RLS Strategy

**Principio:** Todo SaaS `USING (auth.uid() = lawyer_id)` (o `lawyer_user_id` donde aplica). Client global nunca ve SaaS. `service_role` solo en `server.mjs` con validación ownership si muta por ID.

### 5.1 Nuevas tablas (bloqueante)

```sql
ALTER TABLE public.lawyer_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY lawyer_clients_owner_select ON public.lawyer_clients FOR SELECT USING (auth.uid() = lawyer_id);
CREATE POLICY lawyer_clients_owner_insert ON public.lawyer_clients FOR INSERT WITH CHECK (auth.uid() = lawyer_id);
CREATE POLICY lawyer_clients_owner_update ON public.lawyer_clients FOR UPDATE USING (auth.uid() = lawyer_id) WITH CHECK (auth.uid() = lawyer_id);
CREATE POLICY lawyer_clients_owner_delete ON public.lawyer_clients FOR DELETE USING (auth.uid() = lawyer_id);

-- lawyer_cases idem + check client_id pertenece al mismo lawyer (trigger o WITH CHECK EXISTS):
CREATE POLICY lawyer_cases_owner_insert ON public.lawyer_cases FOR INSERT WITH CHECK (
  auth.uid() = lawyer_id AND (client_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_clients WHERE id = client_id AND lawyer_id = auth.uid()))
);

ALTER TABLE public.lawyer_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY lawyer_subscriptions_owner ON public.lawyer_subscriptions FOR ALL USING (auth.uid() = lawyer_id) WITH CHECK (auth.uid() = lawyer_id);
-- Server con service_role bypasa RLS para webhook preapproval — validar lawyer_id ownership en handler
```

### 5.2 Existentes — auditar antes de Fase 1B

| Tabla | RLS hoy | Riesgo si falta | Acción Fase 1A |
|---|---|---|---|
| `bookings` | ENABLE RLS VERIFIED (`migrations/*` no explicita bookings policy pero `types` FK `lawyer_id→profiles.user_id` + `server.mjs` service_role) — auditar `USING auth.uid()=lawyer_id OR auth.uid()=user_id` | Alta si falta | Verificar Dashboard → Policies |
| `appointments` | UNKNOWN — `types:583` sin Relationships, migraciones no muestran policy | Alta | **Añadir** `USING auth.uid()=lawyer_id` + `USING auth.uid()=user_id` si falta |
| `service_quote_requests` | UNKNOWN — no hay `ENABLE ROW` en `migrations/*` grep (solo `favorites 20241003*`) | Media (IDOR quotes) | Auditar, añadir owner policies |
| `booking_leads` | UNKNOWN | Media (leak leads) | Auditar, añadir `lawyer_id` policy |
| `payments` | ENABLE `2024092702*` `USING auth.uid()=client_user_id OR lawyer_user_id` — VERIFIED | Alta | Verificar no filtra `service_role` cross-tenant |
| `lawyer_services` | VERIFIED `USING auth.uid()=lawyer_user_id` (pattern) | Baja | Verificar |
| `ai_*` | ENABLE `60803*, 60804*, 60805*` `USING auth.uid()=lawyer_id` | Baja | Verificar storage `ai-documents` path `lawyer/<lawyer_id>/` |

---

## 6. Security Risks — Prioridad máxima

| Riesgo | Evidencia code | Impacto | Probabilidad | Mitigación Fase 1 |
|---|---|---|---|---|
| `POST /api/bookings/create` NO AUTH (`server.mjs:1202` **NO AUTHENTICATION REQUIRED**) + `lawyer_id` arbitrario + `user_email` arbitrario → spam inbox / enumeración abogados | `server.mjs:1202-1244` valida `lawyer_id` existe `profiles.role=lawyer` `server.mjs:1316` pero no rate limit / captcha, y `user_id` no validado | 4 | 4 | **No romper marketplace:** mantener NO AUTH para cliente, pero para SaaS agenda (`bookings` desde abogado) exigir `auth.uid()=lawyer_id` (Supabase insert, no server). Añadir `needs_manual_review` flag + rate limit documentado (no código MVP, solo plan) |
| `CitasPage:90-118` crea `profiles` cliente global sin tenant → un email aparece como cliente de todos los abogados que lo crean | `CitasPage:104` `insert {first_name,last_name,email,role:client}` global | 4 | 4 | Reemplazar por `lawyer_clients` upsert (`lower(email)` unique por lawyer). Deprecar bloque, no borrar aún |
| Doble agenda `bookings` vs `appointments` con RLS distinta → cifras distintas Dashboard/Casos/Citas | `bookings:664` vs `appointments:583` + `admin/analytics:500` cuenta ambas + `CitasPage:54` delete local no persiste | 5 | 5 | AD-001: `bookings` fuente, `appointments` compat read-only. Agenda MVP crea `bookings` |
| `EarningsPage:89` filtra `payments` por `lawyer_id` pero FK es `lawyer_user_id` `types:1268`; join `appointments` por `appointment_id` falla para `bookings` service → ingresos $0 o parcial | `EarningsPage:89` `eq('lawyer_id', session.user.id)` vs `types:1203` `lawyer_user_id`; `appointmentIds` `EarningsPage:105` solo `appointment_id` | 3 | 5 | Corregir query a `lawyer_user_id` + `bookings` join (ver §12) |
| `service_role` cross-tenant si endpoint confía en `lawyer_id` del body sin validar `auth.uid()` | `server.mjs:359` `requireAdmin` sí valida, pero `POST /api/bookings/create` y `POST /create-payment` no validan ownership de `lawyerId` vs caller | 5 | 2 | Nuevas políticas SaaS: `WITH CHECK auth.uid()=lawyer_id` en DB + validar ownership en server si mutate por ID |
| `storage.objects` `ai-documents` path no validado → IDOR file | `migrations` no muestra storage policy, `types` bucket `ai-documents` `608030002` size limit 20MB solo | 3 | 3 | Auditar Storage → Policies: `auth.uid()::text = (storage.foldername(name))[1]` |
| Client authenticated puede intentar `SELECT lawyer_clients` de abogado | Si RLS falta en nueva tabla | 5 | 2 | RLS `USING auth.uid()=lawyer_id` bloquea (test §14 RLS suite) |
| `generateMockTransactions` `EarningsPage:44` puede mostrar $ aleatorio si pagos fallan | `EarningsPage:44-70` existe aunque `catch` no hace fallback, pero `total` suma `payment.amount` no `lawyer_amount` → cifra no es ingreso real | 3 | 5 | Eliminar mocks, mostrar solo `lawyer_amount` completed |

**Checklist Fase 1A:** Auditar Supabase Dashboard → Table Editor → RLS enabled + Policies para `bookings`, `appointments`, `service_quote_requests`, `booking_leads`, `payments`, `lawyer_services`, `storage.objects`. Activar donde falte. No arreglar en código aún — solo tests.

---

## 7. Reuse Map

**Buscar primero, duplicar nunca.**

| Necesidad MVP | Ya existe (reusar) | Archivo:línea | Crear nuevo | Evolucionar |
|---|---|---|---|---|
| Dashboard Hoy | `DashboardPage:787` contadores + actividad + GCal | `DashboardPage:135` `fetchActivities` 5 paralelas, `GoogleCalendarConnect` | — | Evoluciona DashboardPage (añade counts `lawyer_clients`/`cases`, checklist) |
| Solicitudes inbox | `JobsPage:450` lista + `useLawyerJobs:223` map | `useLawyerJobs:56` `Promise.all(bookings, quotes)` | `RequestsInbox.tsx` (nuevo, reutiliza pattern) | — |
| Clientes CRUD | Nada deduplicado | — | `ClientsPage.tsx`, `ClientDetailPage.tsx`, `hooks/useLawyerClients.ts` | — |
| Casos CRUD | `JobsPage` logic + `QuoteRequestsPage` | `JobsPage:87` `JobDetailDialog`, `JobsPage:337` Search+Select | `CasesPage.tsx`, `CaseDetailPage.tsx`, `hooks/useLawyerCases.ts` | Redirect `JobsPage`→`/cases` |
| Agenda | `CitasPage:542` + `AppointmentForm` | `CitasPage:463` `AppointmentForm`, `components/appointments/AppointmentForm.tsx` | `CalendarPage.tsx` (evol) | Reemplaza `profiles` insert por `lawyer_clients` upsert |
| Ingresos | `EarningsPage:634` + `MercadoPagoConnect` | `EarningsPage:370` `MercadoPagoConnect`, `lib/utils.ts` format | `RevenuePage.tsx` (alias) | Elimina mocks, corrige `lawyer_amount` |
| Servicios | `ServicesPage`, `useProfile:150` | `ServicesPage`, `hooks/useProfile` | — | Mantener, badge `DashboardLayout:74` ya alerta 0 servicios |
| Perfil | `ProfilePage:65k LOC` | `ProfilePage` | — | Mantener |
| Auth/Rutas | `RequireLawyer`, `DashboardLayout:436` Suspense, `App.tsx:56` lazy | `RequireLawyer.tsx` estático `App.tsx:30`, `DashboardLayout` | — | Añadir 3 rutas lazy igual pattern |
| Analytics | `posthogLoader`, `page_views` | `lib/posthogLoader.ts`, `lib/analytics.ts:8` | — | Añadir 6 eventos `saas_*` (§13) |
| Notificaciones | `server/notifications/service.mjs:311` + `NotificationsPage` | `server.mjs:1394` `notifyUsers` | — | Añadir tipos `case.created` post-MVP |

---

## 8. Implementation Phases — Fase 1 (no 6 semanas, iterativo)

Cada fase entrega valor sin esperar a la siguiente y tiene gate.

### PHASE 1A — Technical Foundation (1 semana)

**Objetivo:** Base segura sin UI.
**Entrega:** Migraciones + RLS + índices, marketplace intacto.
**Archivos:** `supabase/migrations/20260915_lawyer_clients.sql`, `..._lawyer_cases.sql`, `..._lawyer_subscriptions.sql`, `..._bookings_source_client.sql`, `..._rls_policies.sql` (5 files).
**DB:** `lawyer_clients`, `lawyer_cases`, `lawyer_subscriptions` + `bookings.source`+`client_id` (§10).
**RLS:** Policies §5 + audit `appointments`/`service_quote_requests`/`booking_leads`.
**Tests:** RLS suite §14 (Lawyer A ≠ B).
**Gate:** `supabase db reset` ok; RLS tests pasan; `POST /api/bookings/create` NO AUTH sigue 200.
**Qué NO tocar:** Server, frontend, payments, AI.

### PHASE 1B.1 — Dashboard Hoy + Ingresos reales (1 semana)

**Objetivo:** Primera métrica real accionable (“¿Qué pasa hoy?”).
**Archivos:** `src/pages/lawyer/DashboardPage.tsx` evol (counts `lawyer_clients`/`cases`, checklist 4 pasos), `src/pages/lawyer/RevenuePage.tsx` (copia `EarningsPage:634` sin `generateMockTransactions:44`, query `lawyer_user_id` + `lawyer_amount`), `src/hooks/useRevenue.ts`, `src/App.tsx` alias `/lawyer/revenue` + redirect `/lawyer/earnings`.
**DB:** Read only `lawyer_clients`, `lawyer_cases`, `payments`, `bookings`.
**Gate:** Dashboard muestra 0→n real; Ingresos = `SUM(lawyer_amount)` completed, no `amount`; mocks eliminados.

### PHASE 1B.2 — Clientes (1 semana)

**Archivos:** `src/pages/lawyer/ClientsPage.tsx`, `ClientDetailPage.tsx`, `hooks/useLawyerClients.ts` (React Query `['lawyer-clients', lawyerId]`), `components/lawyer/ClientForm.tsx`, `App.tsx` routes `/lawyer/clients`, `/:id`.
**Gate:** Crear cliente manual deduplica `lower(email)`; Mismo email con Lawyer B = filas separadas; Ficha historial bookings/quotes/payments por email.

### PHASE 1B.3 — Casos (1 semana)

**Archivos:** `src/pages/lawyer/CasesPage.tsx`, `CaseDetailPage.tsx`, `hooks/useLawyerCases.ts`, redirect `/lawyer/jobs`→`/cases`.
**Gate:** Caso manual sin booking; Caso desde solicitud con `UNIQUE booking_id` previene duplicado; `ai_workspace_id` nullable link (no flujo AI).

### PHASE 1B.4 — Solicitudes (3 días)

**Archivos:** `src/pages/lawyer/RequestsInbox.tsx`, `hooks/useRequestsInbox.ts` (`Promise.all` bookings pending + quotes pending), `App.tsx`.
**Gate:** Inbox muestra `bookings.status=pending` + `quotes pending` WHERE `lawyer_id=auth.uid()`; CTA “Convertir” crea cliente+caso.

### PHASE 1B.5 — Agenda unificada (1 semana)

**Archivos:** `src/pages/lawyer/CalendarPage.tsx` (evol `CitasPage:542`, reemplaza `profiles` insert `CitasPage:104`), `App.tsx` alias `/lawyer/calendar` + redirect `/lawyer/citas`, `hooks/useCalendar.ts`.
**Gate:** Crear cita SaaS → INSERT `bookings` type appointment → día; overlap 409 `server.mjs:1272`; `appointments` legacy aún visible.

### PHASE 1B.6 — Analytics mínimos + QA (3 días)

**Archivos:** `src/lib/track.ts` 6 eventos `saas_*` (§13), `src/hooks/usePageTracking.ts` ya, server sin cambios.
**Gate:** PostHog `saas_client_created` etc. disparan; RLS/E2E tests §14 pasan.

### PHASE 1B.7 — Monetización prep (2 días, no cobro)

**Archivos:** `components/subscription/SubscriptionCard.tsx` placeholder en `/lawyer/settings` (“Próximamente $49.990 bundle” sin `preapproval`).
**Gate:** Tabla `lawyer_subscriptions` vacía con RLS, sin endpoint MP.

**Total Fase 1B:** ~5 semanas iterativas, pero cada sub-fase es shippable. No 6 semanas monolito.

---

## 9. Exact Files — Qué se toca y qué NO

### Tocar (crear/evolucionar)

```
SUPABASE (5 migraciones):
  supabase/migrations/20260915_lawyer_clients.sql              — CREATE TABLE + UNIQUE lower(email) + RLS
  supabase/migrations/20260915_lawyer_cases.sql                — CREATE TABLE + CHECK status/source + RLS + trigger client check
  supabase/migrations/20260915_lawyer_subscriptions.sql        — CREATE TABLE + RLS (prep)
  supabase/migrations/20260915_bookings_source.sql             — ALTER bookings ADD source + client_id + índices
  supabase/migrations/20260915_rls_audit.sql                   — ENABLE RLS + policies appointments/service_quote_requests/booking_leads si faltan

FRONTEND (nuevas):
  src/pages/lawyer/ClientsPage.tsx
  src/pages/lawyer/ClientDetailPage.tsx
  src/pages/lawyer/CasesPage.tsx
  src/pages/lawyer/CaseDetailPage.tsx
  src/pages/lawyer/RequestsInbox.tsx
  src/pages/lawyer/CalendarPage.tsx        — evoluciona CitasPage.tsx:542 (no duplicar, refactor)
  src/pages/lawyer/RevenuePage.tsx         — alias EarningsPage.tsx:634 sin mocks
  src/hooks/useLawyerClients.ts
  src/hooks/useLawyerCases.ts
  src/hooks/useRequestsInbox.ts
  src/hooks/useCalendar.ts
  src/hooks/useRevenue.ts
  src/components/lawyer/ClientForm.tsx
  src/components/lawyer/CaseForm.tsx
  src/lib/track.ts                         — 6 eventos saas_*

FRONTEND (evolucionar, no crear duplicado):
  src/App.tsx:56-653                       — añadir 5 lazy routes + redirects /lawyer/jobs→/cases, /citas→/calendar, /earnings→/revenue
  src/components/dashboard/DashboardLayout.tsx:183 — sidebar: añadir Clientes, Casos, Solicitudes, Agenda alias; mover Favoritos a header icon post-MVP (no bloquear)
  src/pages/lawyer/DashboardPage.tsx:787   — checklist + counts lawyer_clients/cases
  src/pages/lawyer/CitasPage.tsx:90-118    — REEMPLAZAR bloque profiles insert por lawyer_clients upsert (en CalendarPage)
  src/pages/lawyer/EarningsPage.tsx:44,89  — ELIMINAR generateMockTransactions + corregir eq('lawyer_user_id') + lawy er_amount

TESTS (nuevos):
  src/__tests__/lawyerClients.test.ts      — dedupe lower(email)
  src/__tests__/rls.test.ts                — Lawyer A≠B (supabase JS 2 sessions)
  e2e/lawyer-saas.spec.ts                  — Playwright login→clients→cases→calendar
```

### NO tocar en Fase 1

```
server.mjs:501 (/api/profiles), :594/622 verify-rut/lawyer, :902 /create-payment, :1202 /api/bookings/create, :327 mercadopago secret, :172 GA4 purchase, :1394 notifications booking.created
supabase/functions/mercado-pago-webhook, process-weekly-payouts, create-mercado-pago-preference
src/pages/PublicProfile.tsx, SearchResults.tsx, BookingPage.tsx, CheckoutResume.tsx
src/pages/lawyer/ServicesPage.tsx, ProfilePage.tsx, LegalUpAIWorkspace.tsx, AICaseDetail.tsx
src/contexts/AuthContext/*, RequireLawyer, supabaseClient.ts
package.json deps (no instalar)
supabase AI tables (ai_workspaces etc.)
```

---

## 10. Exact Database Changes

Orden secuencial, cada file idempotente con `IF NOT EXISTS`:

**20260915_lawyer_clients.sql**
```sql
CREATE TABLE IF NOT EXISTS public.lawyer_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  phone text,
  source text NOT NULL DEFAULT 'UNKNOWN' CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN')),
  first_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lawyer_clients_email_valid CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);
CREATE UNIQUE INDEX IF NOT EXISTS lawyer_clients_unique_email_per_lawyer
  ON public.lawyer_clients (lawyer_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_lawyer_clients_lawyer_created ON public.lawyer_clients (lawyer_id, created_at DESC);
ALTER TABLE public.lawyer_clients ENABLE ROW LEVEL SECURITY;
-- policies §5
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_lawyer_clients_updated_at ON public.lawyer_clients;
CREATE TRIGGER trg_lawyer_clients_updated_at BEFORE UPDATE ON public.lawyer_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

**20260915_lawyer_cases.sql** (FK bookings/client_id depende de 20260915_bookings_source — crear sin FK primero o en orden inverso: este antes de bookings ALTER si references lawyer_clients ya existe pero bookings no tiene client_id aún — FK lawyer_clients sí existe)

**20260915_bookings_source.sql**
```sql
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'UNKNOWN'
  CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN'));
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.lawyer_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_lawyer_source ON public.bookings (lawyer_id, source);
CREATE INDEX IF NOT EXISTS idx_bookings_lawyer_client ON public.bookings (lawyer_id, client_id) WHERE client_id IS NOT NULL;
```

**20260915_rls_audit.sql** — `ENABLE ROW LEVEL SECURITY` + policies owner para `appointments`, `service_quote_requests`, `booking_leads` si faltan (usar `DROP POLICY IF EXISTS` + `CREATE POLICY`).

**Rollback:** `DROP TABLE lawyer_cases, lawyer_clients, lawyer_subscriptions; ALTER TABLE bookings DROP COLUMN source, client_id;` — `bookings` datos existentes intactos.

---

## 11. API Changes

**No nuevos endpoints server en MVP.** Regla AD-005.

| Operación | Vía | Detalle | Evidencia |
|---|---|---|---|
| `lawyer_clients` CRUD | Supabase | `from('lawyer_clients').select/insert/update/delete` con `lawyer_id=auth.uid()` RLS | Pattern `useLawyerJobs:56` |
| `lawyer_cases` CRUD | Supabase | idem + `WITH CHECK client_id` pertenece a mismo lawyer | Nuevo, con CHECK |
| `bookings` read/update (Solicitudes, Agenda) | Supabase | `from('bookings').select/update` WHERE `lawyer_id=auth.uid()` | `useLawyerJobs:181` ya hace update |
| `bookings` create (SaaS cita) | Supabase | `from('bookings').insert({lawyer_id: auth.uid(), user_email, booking_type:'appointment', source:'LAWYER_DIRECT'})` | No usar `POST /api/bookings/create` NO AUTH para SaaS (evita spam) |
| `payments` read (Ingresos) | Supabase | `from('payments').select('lawyer_amount,payout_status,status,created_at')` WHERE `lawyer_user_id=auth.uid()` y `status=completed` → `SUM(lawyer_amount)` | Corrige `EarningsPage:89` bug |
| `get_lawyer_busy_slots` | Supabase RPC | `rpc('get_lawyer_busy_slots', {query_date, query_lawyer_id})` | `types:1704` VERIFIED |
| `POST /api/bookings/create` | server.mjs NO AUTH | **No tocar** — sigue para marketplace cliente. SaaS no lo usa para `lawyer_clients` | `server.mjs:1202` |
| `POST /create-payment` + webhook | server.mjs + Edge Function | No tocar | `server.mjs:902` |
| `verify-lawyer`/`verify-rut` | server.mjs | No tocar | `server.mjs:594/622` |

Si se necesita dedupe case-insensitive server-side, opcional `POST /api/lawyer-clients/upsert` con `lower(email)` check, pero `UNIQUE lower(email)` + `ON CONFLICT` supabase ya lo hace client-side.

---

## 12. UI Changes

- **Navegación `DashboardLayout:183`:** Añadir 5 items lawyer: `Solicitudes (/lawyer/requests, icon Inbox)`, `Clientes (/lawyer/clients, icon Users)`, `Casos (/lawyer/cases, icon Briefcase)` (reemplaza Jobs alias), `Agenda (/lawyer/calendar, icon Calendar)` (alias `Citas`), mantener `Solicitudes` antes que `Clientes` para flujo inbox→cliente. `LegalUp AI` queda highlight pero no mover. `Favoritos`/`Notificaciones` quedan (no mover a header en MVP para no romper).
- **Dashboard `DashboardPage:787`:** 4 cards: citas hoy (`bookings` today count), solicitudes pendientes (count), clientes 7d, ingresos mes (`SUM lawyer_amount`). + checklist activación: `profiles.profile_setup_completed` + `lawyer_services count>0` (`useProfile:150`) + `google_integrations` + `mercadopago_accounts` conectados. Sin gráficos `Recharts` decorativos.
- **Solicitudes:** Lista `Card` por booking/quote con `Badge status` (`JobsPage:47` `statusConfig` reuse), `Search` + `Select` filtros (`JobsPage:337`), `Dialog` CTA convertir.
- **Clientes/Casos:** Tablas con `Search` + `Select` (`JobsPage:337` reuse), `Card` list `p-4` hover, `Dialog` form (`Dialog` `JobsPage:14`), `formatDistanceToNow` `date-fns` `JobsPage:44`.
- **Agenda `CalendarPage`:** Reuse `CitasPage:247` calendario mini + `CitasPage:300` lista día + `Dialog` `AppointmentForm` `CitasPage:463`, pero `onSubmit` hace `supabase.from('bookings').insert` + `lawyer_clients` upsert, no `profiles` insert. Corrección delete: `supabase.from('bookings').delete().eq('id', id)` no `setAppointments(filter)`.
- **Ingresos `RevenuePage`:** Copia `EarningsPage:352` layout (`Summary Cards` + `Monthly` + `Top Services` + `Recent Transactions`) pero `fetchTransactions` corrige `eq('lawyer_user_id')` y `select lawyer_amount,payout_status` y `formatCurrency` sobre `lawyer_amount`, y elimina `generateMockTransactions:44`.
- **Lazy:** Nuevas páginas `lazy(() => import('./pages/lawyer/ClientsPage'))` (`App.tsx:87` pattern) + `Suspense` `DashboardLayout:436`.

---

## 13. Analytics — Mínimo, sin duplicar purchase

**Taxonomía SaaS (6 eventos, §13 spec):**

| Evento | Props | Disparo | Tipo |
|---|---|---|---|
| `saas_dashboard_viewed` | `lawyer_id` | `DashboardPage` mount | PostHog client `posthog.capture` (reuse `posthogLoader.ts`) |
| `saas_request_viewed` | `lawyer_id, request_id, source` | `RequestsInbox` item view | PostHog |
| `saas_client_created` | `lawyer_id, source, has_phone` | `lawyer_clients` insert success | PostHog + opcional `trackPageView` `lib/analytics:8` (no GA4) |
| `saas_case_created` | `lawyer_id, client_id, source, has_booking` | `lawyer_cases` insert success | PostHog |
| `saas_booking_created` | `lawyer_id, source, booking_type` | SaaS `bookings` insert (no marketplace `POST /api/bookings/create` que ya tiene `payment_events`+GA4) | PostHog (distinto de server `payment_events`) |
| `saas_revenue_viewed` | `lawyer_id, range` | `RevenuePage` mount | PostHog |

**No duplicar:** `purchase` sigue solo server-side `sendGA4PurchaseEvent` `server.mjs:172` + `payment_events` `lib/analytics:22` (amount/status). SaaS no crea `purchase` client. `page_views` (`lib/analytics:8`) sigue pero no para SaaS funnel (PostHog es verdad producto).

**Filtro owner:** `OWNER_EMAILS` `server.mjs:144` filtra GA4 `transport_is_owner` `server.mjs:202` — extender a PostHog `posthog.capture({is_owner: isOwnerEmail})` si `user_email` es owner.

**Implementation:** `src/lib/track.ts` `export const trackSaaS = (event, props) => posthog.capture(event, props)` + `useEffect` en cada Page mount.

---

## 14. Testing Strategy

### Unit

- `lawyer_clients` dedupe: `lower(trim(email))` unique — `src/__tests__/lawyerClients.test.ts` pure function `normalizeEmail`.
- `lawyer_cases` status CHECK + `booking_id` UNIQUE WHERE — `src/__tests__/lawyerCases.test.ts` Zod `status` enum.
- `source` enum `LAWYER_DIRECT/LEGALUP_MARKETPLACE/UNKNOWN` — `src/__tests__/bookings.test.ts`.
- `formatCurrency` CLP `Intl.NumberFormat('es-CL')` — `src/lib/utils.test.ts`.

### Integration (supabase JS + service_role seed)

- `lawyer → client`: `insert lawyer_clients` lawyer A → `select` A 1 row, B 0 rows.
- `lawyer → case`: `insert lawyer_cases {booking_id}` → `select` includes `client_id`; second insert same `booking_id` → 409 unique violation.
- `lawyer → booking SaaS`: `insert bookings` type appointment `lawyer_id=A` + `client_id` FK valid → `select bookings` A ve, B no.
- `booking → payment` no SaaS: `payments` insert via `create_payment_secure` RPC — no test SaaS.

### RLS (obligatorio, bloquea deploy si falla)

```js
// Two authenticated sessions: lawyerA (uuid-A), lawyerB (uuid-B)
// As A: await supabaseA.from('lawyer_clients').select().eq('lawyer_id', uuidB) → expect 0 rows
// As A: await supabaseA.from('lawyer_clients').update({name:'hacked'}).eq('id', clientB_id) → expect error or 0 rows, RLS USING false
// As A: await supabaseA.from('lawyer_clients').delete().eq('id', clientB_id) → 0
// Same for lawyer_cases, bookings WHERE lawyer_id=B, payments WHERE lawyer_user_id=B, appointments, service_quote_requests if exists
// Client role (uuid-C): await supabaseC.from('lawyer_clients').select() → 0 rows (RLS no policy for client)
// Unauthenticated: 401
```

File: `src/__tests__/rls.test.ts` (supabase-js with anon keys) + `e2e/rls.spec.ts` (Playwright).

### E2E (Playwright `playwright-mcp/` existente)

```
Login lawyer → /lawyer/dashboard (checklist) → /lawyer/requests (empty or seeded) → Convertir en cliente → /lawyer/clients → /lawyer/clients/:id (historial)
→ /lawyer/cases → Crear caso manual → /lawyer/cases/:id → /lawyer/calendar → Crear cita SaaS → /lawyer/revenue (ingresos, no mocks)
→ Logout → Login lawyerB → verify 0 rows cross-tenant
→ Client login → /dashboard (UserDashboard) → verify /lawyer/* redirects DashboardLayout:100 navigate('/')
→ Marketplace: /abogado/:slug → /booking/:lawyerId → POST /api/bookings/create NO AUTH → 200 + webhook still works
```

---

## 15. Rollback Strategy

- **DB:** `supabase/migrations` down no existe — rollback manual: `DROP TABLE IF EXISTS public.lawyer_cases, public.lawyer_clients, public.lawyer_subscriptions CASCADE; ALTER TABLE public.bookings DROP COLUMN IF EXISTS source, DROP COLUMN IF EXISTS client_id; DROP INDEX IF EXISTS ...;` — `bookings` rows existentes intactos (`DEFAULT UNKNOWN` no null violation). No `DROP` de `appointments`/`payments`.
- **Frontend:** `git revert` de 5 `App.tsx` rutas + 7 páginas/hooks. Redirects `/lawyer/jobs`→`/cases`/`/citas`→`/calendar` son 301 con fallback a old route — si rollback, redirects simplemente dejan de existir, old routes siguen (no breaking).
- **Analytics:** `track.ts` no duplica purchase, remover no afecta GA4 server.
- **Marketplace:** No tocado, no rollback necesario. Verificar `POST /api/bookings/create` y `POST /create-payment` E2E después de cada deploy.
- **Deploy:** Netlify (frontend) + Render (server) — server no cambia en Fase 1, solo Supabase DB + frontend.

---

## 16. Commercial Validation — Mientras se construye

No esperar a “terminar” para hablar con abogados. Construir y validar en paralelo.

### Reddit post ya publicado

**Pregunta:** “¿Qué problema de gestión de un estudio jurídico todavía no resuelve bien el software?”
**Objetivo:** Extraer, no asumir.

Cuando aparezcan respuestas, clasificar por:

| Campo | Ejemplo |
|---|---|
| Problema | “Pierdo seguimiento de causas en Excel” |
| Frecuencia | Diaria / semanal / mensual |
| Tamaño estudio | Independiente / pequeño / mediano / grande |
| Impacto | Horas/semana perdidas, $ perdidos, clientes perdidos |
| Workaround actual | WhatsApp + Excel + Gmail + Drive |
| Software actual | Lex, Contable App, Clio, ninguno |
| Disposición a pagar | “Pago $30k por X y no sirve” → señal fuerte |
| Oportunidad LegalUp | Solicitudes→cliente→caso→cita→ingreso encaja? |

**Señal fuerte vs débil:** Fuerte = “Esto me pasa todas las semanas y actualmente pago X para solucionarlo” — priorizar para MVP. Débil = “Suena interesante” — descartar.

**No interpretar antes de tenerlas.** No preguntar “¿Te gustaría esta herramienta?”.

### Entrevistas 10-15 abogados

**Muestra intencional:** 4 independientes, 4 pequeños, 3 medianos, 2 de firma grande (para no asumir que todos tienen mismo problema — spec PUC).

**Guía (no feature pitch):** “Cuéntame cómo entra un cliente hoy → dónde lo anotas → cómo sigues un caso → cómo cobras → qué se te pierde → qué pagas hoy para intentar resolverlo → qué probarías mañana si fuera gratis → qué pagarías si funciona”.

**Artefactos:** Tabla `Commercial Validation` (problema × frecuencia × impacto × workaround × software × willingness). No code.

---

## 17. Pilot Strategy

**Objetivo:** 3-5 pilotos con **uso real**, no demos.

**Criterio piloto:** Abogado/estudio que hoy ya tiene leads por LegalUp o por su red (no partir de 0), que ya paga algo (señal budget), y que acepta 30 min/semana de feedback. De los 10-15 entrevistas, seleccionar 3-5 con señal fuerte.

**Qué se ofrece:** Acceso temprano a Fase 1B (Solicitudes/Clientes/Casos/Agenda/Ingresos) sin IA nueva, sin orgs, sin tasks. No “plataforma gigante”.

**Qué se observa (PostHog + entrevista):**

- Qué usan ( `saas_client_created` / `case_created` / `booking_created` counts por piloto )
- Qué ignoran (Solicitudes sin convertir, Casos sin status change)
- Dónde se atascan (Agenda overlap 409, crear cliente sin email)
- Qué consideran indispensable (pregunta cierre: “Si te quito X mañana, ¿te duele?”)
- Qué reemplazarían (Excel, Drive, WhatsApp)
- Qué pagarían (rango $29.990 / $49.990 / $79.990 sin implementar billing — solo pregunta willingness)

**Duración:** 2-3 semanas de uso real después de que Phase 1B.2-1B.5 estén shippadas.

---

## 18. Decision Gate — No “compila”, sino evidencia

### TECHNICAL gate (bloqueante)

- [ ] RLS correcto: `Lawyer A cannot SELECT/UPDATE/DELETE B` tests pasan para `lawyer_clients`, `lawyer_cases`, `bookings`, `payments`, `appointments`, `service_quote_requests` (si existe) — §14
- [ ] Aislamiento tenant: client auth no ve `lawyer_clients`/`cases`; `service_role` no expone cross-tenant (validar ownership en server si mutate por ID)
- [ ] Marketplace no roto: `POST /api/bookings/create` NO AUTH 200, `POST /create-payment` → MP preference `init_point`, webhook `booking_paid` → `payments` + `payment_events` + GA4 `purchase` siguen — E2E `Marketplace` §14
- [ ] `bookings` consistente: fuente única, `source` default `UNKNOWN` no rompe queries antiguas, `appointments` legacy aún legible
- [ ] Pagos intactos: `payments.lawyer_amount` + `payout_logs` sin ALTER destructivo; `EarningsPage` sin mocks
- [ ] Build correcto: `npm run build` + `tsc --noEmit` sin error; `App.tsx` lazy routes sin chunk error

### PRODUCT gate

- [ ] Núcleo usable: flujo `Solicitudes → Cliente → Caso → Cita → Ingreso` coherente sin re-ingresar email (dedupe lower)
- [ ] Abogado entiende valor < 2 min en Dashboard Hoy (“¿Qué pasa hoy?”) sin tutorial

### COMMERCIAL gate (evidencia, no opinión)

- [ ] ≥10 respuestas Reddit clasificadas (problema×frecuencia×impacto)
- [ ] ≥10 entrevistas con tabla validation (problema costoso/frecuente + workaround + presupuesto)
- [ ] ≥3 pilotos con uso real ≥1 semana (`saas_*` events por piloto > 5) + feedback “qué usan/ignoran” documentado
- [ ] Señal willingness: ≥2 pilotos dicen “pagaría $X / probaría pagando” (rango $29-79k sin asumir $49.990) — débil vs fuerte §16

Si gate comercial falla (solo “suena interesante”), **no escalar**. Iterar problema o segmento antes de Fase 2 (orgs, AI, tasks).

---

## 19. Explicit Non-Goals — Qué NO se construye en esta fase y por qué

| No-Goal | Por qué no ahora | Cuándo sí |
|---|---|---|
| IA nueva / agente legal / docs avanzados | No valida problema gestión base; `ai_workspaces` ya existe y es suficiente link `ai_workspace_id` | Post-piloto si pilotos piden “resumir caso” |
| ERP / contabilidad / facturación SII | No es JTBD frecuente en 1-5 abogados; `payments.lawyer_amount` ya da ingreso real sin contabilidad | Medianos/grandes, post $500k MRR |
| White-label / orgs / multi-firma / seats | AD-004 tenant = lawyer. Org añade RLS + UI + invites sin evidencia | Firmas grandes validado en entrevistas |
| Mensajería realtime | `messages` legacy oculto `DashboardLayout:152`, no es dolor gestión según FASE-2 sin validar | Si pilotos lo piden como follow-up caso |
| Kanban / tasks / automatizaciones | Complejidad 5, riesgo 4, no en JTBD core (3.5) | Si Casos sin tasks bloquea piloto |
| Storage avanzado / SII docs | `ai-documents` bucket ya cubre AI; no-AI docs no es “¿Qué pasa hoy?” | Post-MVP |
| Subscription billing / MP preapproval | AD-008 prep tabla pero no cobrar sin retention | Post-pilotos con willingness |
| Dashboards empresariales avanzados | `DashboardPage` con 4 cards es suficiente; `admin/analytics:500` ya cuenta ambas agendas | Post-MVP |
| Semana view primero | AD-009 day-first validado `CitasPage` | Post-validación |

Cada “no” responde: **¿Esto ayuda a validar, conseguir usuario, activar, retener o generar ingreso?** Si no, fuera.

---

## 20. Recomendación — Qué construir primero (orden exacto)

**Orden que minimiza riesgo y maximiza validación temprana:**

1. **1A — Foundation (1 sem):** Migraciones `lawyer_clients` + `lawyer_cases` + `bookings source/client_id` + RLS. Sin UI. Gate RLS. **Archivos:** 5 migraciones (§10).
2. **1B.1 — Ingresos reales (3 días dentro de 1 semana):** `RevenuePage` sin mocks, query `lawyer_amount`. Valida métrica sin esperar a clientes. **Archivos:** `RevenuePage.tsx`, `useRevenue.ts`, `App.tsx` alias.
3. **1B.2 — Clientes + Solicitudes juntas (1.5 sem):** `ClientsPage` + `RequestsInbox` con CTA convertir. Valida JTBD-1 y 2 en un flujo. **Archivos:** `lawyer_clients` ya, `RequestsInbox.tsx`, `ClientsPage.tsx`.
4. **1B.3 — Casos (1 sem):** `CasesPage` envolvente. Valida JTBD-3. **Archivos:** `lawyer_cases` ya, `CasesPage.tsx`.
5. **1B.4 — Agenda unificada (1 sem):** `CalendarPage` sobre `bookings`. Valida JTBD-4 y cierra flujo `cliente→caso→cita`. **Archivos:** `CalendarPage.tsx` (evol `CitasPage`).
6. **1B.5 — Dashboard Hoy (3 días, pero después de 1B.2-1B.4):** Checklist + cards con datos reales, no antes (evita métricas vacías “nice to have”). **Archivos:** `DashboardPage.tsx` evol.
7. **Paralelo desde semana 1:** Reddit clasificación + entrevistas 10-15 + selección 3-5 pilotos (comercial no espera a código).

**Qué NO hacer primero:** No empezar por Dashboard con mocks ni por IA ni por orgs. El abogado no paga por un dashboard bonito sin clientes/casos reales.

---

## Appendix — Evidencia por archivo (extracto)

- Rutas: `App.tsx:56-124` lazy, `App.tsx:462` onboarding, `App.tsx:556` `/lawyer`, `App.tsx:30` `RequireLawyer` estático
- Navegación: `DashboardLayout:183` `getNavItems` 10 items, `DashboardLayout:74` badge servicios, `DashboardLayout:94` auth check
- Bookings: `types:664` schema, `server.mjs:1202` NO AUTH, `server.mjs:1272` overlap 409, `useLawyerJobs:58` select, `BookingPage:493` create
- Appointments: `types:583`, `CitasPage:54` delete local bug, `CitasPage:90` phantom profiles, `admin/analytics:500` cuenta ambas
- Payments: `types:1193` `lawyer_amount`, `migrations/2024092702*` RLS, `server.mjs:430` 10%/20%, `server.mjs:1053` RPC, `server.mjs:1121` MP fetch, `EarningsPage:44` mocks, `EarningsPage:89` query bug
- Services: `types:905`, `ServicesPage`, `migrations/20250101` availability
- AI: `types:545` workspaces, `migrations/60803-60827` bucket/usage/timeline/workflow
- Analytics: `lib/analytics:8` `page_views`, `lib/analytics:22` `payment_events`, `server.mjs:172` GA4, `server.mjs:144` OWNER filter, `posthogLoader`
- Auth: `AuthContext/clean/AuthContext.tsx`, `supabaseClient.ts`, `server.mjs:359` requireAdmin (no requireLawyer)

> Cada recomendación PROPOSED arriba es trazable a un archivo:línea o tabla. Verificar en repo antes de implementar. PLAN ONLY — no se modificó código en esta ejecución.

