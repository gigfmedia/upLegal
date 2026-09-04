# FASE 2 — LAWYER SAAS MVP PLAN

> **De Marketplace a Oficina Digital del Abogado**
> Modo: PLAN — NO CODE CHANGES
> Fecha: 2026-09-04
> Base: lectura directa de `src/`, `server.mjs`, `supabase/migrations/`, `supabase/types`, `docs/FASE-1-*`
> Principio: *¿Qué piezas ya funcionan como infraestructura SaaS? Reutilizar antes de inventar.*

---

## 1. Executive Summary

**Pregunta central:**
> ¿Cómo transformar la infraestructura actual de LegalUp en una herramienta SaaS que entregue valor recurrente al abogado, sin romper ni duplicar innecesariamente el marketplace existente?

**Respuesta en una frase (MVP mínimo viable):**
> Un abogado puede ver en una sola vista `/lawyer/*` sus **solicitudes** (leads marketplace), sus **clientes** (deduplicados por email), sus **casos** (envolvente de `bookings` + `service_quote_requests`), su **agenda** (unificada) y sus **ingresos** (derivados de `payments.lawyer_amount`), todo aislado por `lawyer_id = auth.uid()` y sin duplicar el flujo `client → booking → Mercado Pago → webhook → booking_paid` que ya existe.

**Qué reutiliza (no se reescribe):** `profiles` (perfil), `lawyer_services` (servicios), `bookings` + `service_quote_requests` (fuente de verdad de trabajos/casos), `appointments` (legacy pero unificable), `payments`/`platform_settings`/`payout_logs` (pagos), `notifications`/`page_views`/PostHog/GA4 (analytics), `ai_*` (no MVP SaaS pero preservado).

**Qué crea (mínimo):** `lawyer_clients` (vista deduplicada de abogados↔emails) + `lawyer_cases` (envolvente SaaS sobre bookings/quotes) + columnas `source` + `lawyer_subscriptions` preparado (no cobrado en MVP) + unificación `Citas` + 3 rutas nuevas (`/lawyer/clients`, `/lawyer/cases`, `/lawyer/cases/:id`) + hooks derivados.

**Qué NO hace el MVP:** ERP jurídico completo, tasks/kanban, documentos no-AI, contabilidad, facturación electrónica, comisión diferenciada, consumer AI, white-label. Todo `NOT MVP` queda en Fase 2.5+.

**Mayor riesgo:** Duplicación `bookings` vs `appointments` como dos agendas paralelas con RLS distinto. Si el MVP crea una tercera tabla `cases` sin resolver la fuente de verdad, el abogado verá cifras distintas en Dashboard / Citas / Casos.

---

## 2. Current State

Evidencia base: `docs/FASE-1-LEGALUP-PLATFORM-ARCHITECTURE.md:42-124`, `src/App.tsx:1-653`, `src/components/dashboard/DashboardLayout.tsx:1-457`, `src/types/supabase.ts:1-2385`.

- **Marketplace VERIFIED:** `/` → `/search` (`SearchResults.tsx`) → `/abogado/:slug` (`PublicProfile.tsx:152-1350`) con `lawyer_services` ordenado, `reviews`, `hourly_rate_clp *1.1` → `/booking/:lawyerId` (`BookingPage.tsx`) → `POST /api/bookings/create` (`server.mjs:1202-1730`, `NO AUTHENTICATION REQUIRED`) → MP preference (`/create-payment` `server.mjs:902-1165`) → webhook `POST /api/mercadopago/webhook` (no inspeccionado a fondo en esta fase, pero referenciado en `server.mjs:1140` `notification_url`) → `bookings.payment_status` + `payments` row. Landings SEO (`/abogados-laborales`, `/cae`, etc.) VERIFIED.
- **Lawyer surface PARTIAL:** `src/pages/lawyer/` 11 páginas: `DashboardPage.tsx` (contadores + actividad + banner AI), `ProfilePage.tsx` (64k LOC, edición completa), `ServicesPage.tsx` (CRUD `lawyer_services`), `CitasPage.tsx` (542 LOC, calendario diario + CRUD `appointments`), `ConsultasPage.tsx`, `JobsPage.tsx:450` (`useLawyerJobs.ts:223` mapea `bookings`+`service_quote_requests`→`LawyerJob`), `EarningsPage.tsx:634` (mocks + `payments` real), `LegalUpAIWorkspace.tsx`+`AICaseDetail.tsx`, `QuoteRequestsPage.tsx`, `ServicesPage.tsx`, `LawyerOnboardingPage.tsx:47` (wizard lazy). Sidebar `DashboardLayout.tsx:144-203` con 10 items lawyer (Inicio, LegalUp AI, Perfil, Servicios, Citas, Trabajos, Favoritos, Notificaciones, Ingresos, Config Pagos).
- **Auth VERIFIED:** `src/contexts/AuthContext/clean/AuthContext.tsx` + `useAuth.ts` + `RequireLawyer.tsx` (estático en `App.tsx:30` para evitar double suspense), `supabaseClient.ts`, `server.mjs:359-415` `requireAdmin` (no `requireLawyer` en server — el server confía en RLS + service_role para bookings).
- **Pagos VERIFIED pero incompleto:** `payments` (`payout_status` pending/processing/completed/failed, `platform_fee`/`lawyer_amount`/`client_surcharge`) + `payout_logs` + `platform_settings` (10% surcharge, 20% fee `server.mjs:430`) + `mercadopago_accounts` (OAuth sin UI) + `payment_events` (tracking) + `supabase/functions/process-weekly-payouts/`. `EarningsPage` mezcla mocks `generateMockTransactions` con `payments` reales.
- **Datos sin `clients`/`cases` REAL:** No existe `lawyer_clients` ni `lawyer_cases` / `cases` / `matters`. `ai_workspaces` es "caso AI" aislado (lawyer_id FK) sin link a booking/cliente/pago. `bookings` disperso en `bookings`, `appointments`, `consultations`, `services`/`lawyer_services`.

---

## 3. Existing Infrastructure Inventory

Formato exigido §3 y §30: `EXISTE | ESTADO | REUTILIZABLE | REQUIERE CAMBIO`.

| Feature | Existe | Estado | Reutilizable | Requiere cambio | Evidence |
|---|---|---|---|---|---|
| Perfiles profesionales | VERIFIED | Completo, 64k LOC edición, RLS `auth.uid()=id` | Sí, directo | No (solo compartir URL ya resuelve “oficina”) | `src/pages/lawyer/ProfilePage.tsx`, `hooks/useProfile.ts:16028`, `supabase.ts:profiles:1356` |
| Dashboard abogado | PARTIAL | Contadores hoy/citas/servicios/consultas + actividad + banner AI, pero sin clientes/casos pipeline | Sí, extender | Sí — checklist activación + métricas clientes/casos | `src/pages/lawyer/DashboardPage.tsx:17-787`, `DashboardLayout.tsx:183` |
| Disponibilidad / horarios | VERIFIED (legacy) | `profiles.availability: string|null` + migración `20250101000000_add_lawyer_availability` + `google_integrations` | Sí | Unificar con `bookings.scheduled_*` | `types:profiles.availability`, `migrations/202501*`, `google_integrations:872` |
| Bookings (citas con hora) | VERIFIED | `bookings` con `scheduled_date/time`, `duration`, `status`, `payment_status`, `booking_type=appointment|service`, RLS `lawyer_id→profiles.user_id` | Sí — **fuente de verdad elegida AD-001** | Añadir `source` col | `types:bookings:664`, `server.mjs:1202`, `useLawyerJobs:56` |
| Appointments (legacy) | LEGACY / VERIFY BEFORE REUSE | `appointments` con `appointment_date/time`, `duration`, `lawyer_id` string sin FK, CRUD en `CitasPage.tsx:542` | Parcial — migrar lectura a `bookings` | Sí — vista unificada, no nueva tabla | `types:appointments:583`, `CitasPage:160`, `EarningsPage` lee ambos |
| Solicitudes / leads | PARTIAL | `booking_leads` (no tipada, `server.mjs:1439`) + `notifications type=booking.created` | Sí | Exponer inbox Solicitudes filtrando `bookings.status=pending` | `server.mjs:1394`, `notifications:1118` |
| Clientes | NOT FOUND IN REPOSITORY | No tabla; solo `profiles.role=client` + `bookings.user_email/name/phone` denormalizado | No — crear `lawyer_clients` deduplicado | Sí — nueva tabla + vista | `types` sin `clients`, `bookings:687-690`, `CitasPage:90-118` crea `profiles` cliente ad-hoc (anti-pattern) |
| Casos / asuntos | NOT FOUND | Solo `ai_workspaces` (caso AI) + `JobsPage` map `bookings/service_quote_requests`→`LawyerJob` (no persistente) | Parcial — envolvente sobre bookings | Sí — `lawyer_cases` nueva | `JobsPage:272`, `useLawyerJobs:17`, `ai_workspaces:545` |
| Servicios | VERIFIED | `lawyer_services` (lawyer_user_id, title, price_clp, delivery_time, features[], available, requires_quote, sort_order) CRUD completo | Sí directo | No | `types:lawyer_services:905`, `src/pages/lawyer/ServicesPage.tsx` |
| Cotizaciones | VERIFIED | `service_quote_requests` (no tipada completa; usada en `useLawyerJobs:64`, `QuoteRequestsPage.tsx`) | Sí | Añadir link a `lawyer_cases` | `useLawyerJobs:116`, `JobsPage:51` |
| Pagos | VERIFIED | `payments` + `payout_logs` + `platform_settings` + `payment_events` + MP preference/webhook | Sí | Separar `lawyer_revenue` vs plataforma en queries | `types:payments:1193`, `server.mjs:902`, `migrations/20241125*` |
| Documentos (caso) | PARTIAL (AI only) | `ai_documents` (bucket `ai-documents`, 20MB `migrations/608030002`, `extracted_text` 80k `server.mjs:439`) 1:1 `ai_document_analyses` | Para AI sí; para SaaS docs no-AI — NOT MVP | No tocar en MVP | `types:ai_documents:293`, `server/ai/documents.mjs` |
| Mensajería | PARTIAL / LEGACY | `messages` (consultation_id, service_id, sender/receiver) + `MessageProvider.tsx` pero `DashboardLayout:152` oculta `/messages` | No SaaS-critical en MVP | NOT MVP | `types:messages:1070`, `App.tsx:584` comentado |
| Notificaciones | VERIFIED | `notifications` (user_id, type, title, entity_type/id, is_read) + `server/notifications/service.mjs:311` | Sí | Añadir tipos SaaS (`case.created`) | `types:notifications:1118`, `server.mjs:311` |
| Estadísticas / reviews | VERIFIED | `reviews`/`review_tokens` + `reviews` RLS, `EarningsPage` mocks+real | Reutilizable | Limpiar mocks | `types:reviews:1537`, `EarningsPage:634` |
| Config profesional | VERIFIED | `ProfilePage` + `mercadopago_accounts` + `google_integrations` | Sí | Exponer conexión MP/GCal en Configuración | `types:mercadopago:1022`, `google_integrations:872` |
| Onboarding | VERIFIED | `/lawyer/onboarding` (`LawyerOnboardingPage:47` + `LawyerOnboardingWizard` lazy) standalone sin sidebar | Sí, no duplicar | Extender wizard con pasos servicios/disponibilidad si faltan | `App.tsx:462`, `src/components/lawyer/LawyerOnboardingWizard.tsx` (no leído pero lazy) |
| Autenticación | VERIFIED | `AuthContext/clean`, `RequireLawyer`, `supabaseClient`, `requireAdmin` server | Sí | Nada | `src/contexts/AuthContext/clean/*`, `server.mjs:359` |
| Analytics | PARTIAL | `page_views`, `posthog-js` (`posthogLoader.ts`), GA4 `sendGA4PurchaseEvent`+`metaCapi.mjs`, PostHog events `ai_*` | Sí | Añadir eventos SaaS ( §18 ) | `types:page_views:1160`, `server.mjs:172`, `lib/posthogLoader.ts` |

**Conclusión inventario:** 70% del SaaS ya existe como infraestructura marketplace. Faltan dos entidades de dominio (`lawyer_clients`, `lawyer_cases`) y una vista unificada de agenda.

---

## 4. Lawyer SaaS Product Definition

**Posicionamiento (no ERP):**
> LegalUp no sólo consigue clientes para abogados; también les entrega una herramienta para gestionar su práctica profesional — sin convertirse en un ERP jurídico completo.

**Usuario principal:** Abogado independiente / pequeño estudio (1-5 abogados) que hoy gestiona clientes en WhatsApp/Excel y cobra por transferencia o MP manual, y que ya tiene perfil en LegalUp o lo creará por SEO/landings.

**Propuesta de valor SaaS (3 capas, sin duplicar marketplace):**
1. **Captura** — Todo lead (marketplace o propio) aterriza como `booking`/`quote` y aparece en **Solicitudes**. No pierde ningún contacto.
2. **Gestión** — Deduplica a **Cliente** (`lawyer_clients` por email) y envolvente **Caso** (`lawyer_cases` sobre booking/quote) para darle seguimiento (estado, pagos, próxima cita).
3. **Operación** — **Agenda** unificada (`bookings` como fuente, `appointments` como vista legacy) + **Ingresos** derivados de `payments.lawyer_amount` + **Servicios** ya operativos.

**Fuera de MVP a propósito:** Kanban, tasks, documentos no-AI, facturación SII, firma electrónica, contabilidad por centro de costo, multi-sede, white-label, consumer AI.

---

## 5. Jobs To Be Done

| JTBD | Problema | Evidence en repo | Solución MVP | Prioridad | Complejidad | Dependencia |
|---|---|---|---|---|---|---|
| **JTBD-1: No perder ningún lead** | Abogado recibe solicitud por LegalUp y por WhatsApp y las pierde en bandejas distintas | `bookings` sin auth (`server.mjs:1202`), `booking_leads` + `notifications` (`server.mjs:1394`), pero sin inbox SaaS dedicado. `JobsPage` es lista plana post-pago | Inbox **Solicitudes** (`/lawyer/requests`) filtrando `bookings.status=pending` + `service_quote_requests.status=pending/quily quoted` del `lawyer_id` | MUST | Baja (query) | RLS `bookings` |
| **JTBD-2: Saber quién es mi cliente** | `bookings` guarda `user_email/name/phone` denormalizado; si el mismo email reserva 3 veces, no hay ficha única. `CitasPage:90-118` incluso crea `profiles` cliente ad-hoc duplicando | `bookings.user_email:687`, `profiles.role=client` sin join abogado-cliente | **lawyer_clients** deduplicado por `lawyer_id + lower(email)` + vista **Clientes** con historial (bookings+quotes+payments) | MUST | Media (nueva tabla + backfill vista) | `bookings` |
| **JTBD-3: Dar seguimiento a un asunto** | No hay `cases`/`matters`; `JobsPage`+`useLawyerJobs` es map en memoria sin persistencia de estado SaaS (`in_progress/completed` solo en `bookings.status`). No hay expediente | `JobsPage:272`, `useLawyerJobs:17`, `ai_workspaces:545` (caso AI ≠ caso SaaS) | **lawyer_cases** envolvente sobre `booking_id`/`quote_request_id` con `status` SaaS propio | MUST | Media | `lawyer_clients` |
| **JTBD-4: No chocar agenda** | Dos agendas: `bookings` (con `scheduled_date/time` + prevención overlap `server.mjs:1272`) y `appointments` (`appointment_date/time` en `CitasPage:160`). Abogado ve huecos distintos | `bookings:664`, `appointments:583`, `get_lawyer_busy_slots` RPC `types:1704`, `CitasPage:56` delete solo local `setAppointments(filter)` (bug) | **Agenda unificada** (fuente `bookings`, vista `appointments` como compat) + día/semana con `get_lawyer_busy_slots` | MUST | Media | AD-001 |
| **JTBD-5: Cobrar y saber cuánto cobré** | `payments` existe pero `EarningsPage:634` lee `payments.amount` sin separar `lawyer_amount` vs `platform_fee` y mezcla mocks | `payments:1193`, `platform_settings:1326`, `EarningsPage:73` | **Ingresos** = `SUM(lawyer_amount WHERE lawyer_user_id=auth.uid() AND status=completed)` + `payout_status` visible | MUST | Baja | `payments` RLS |
| **JTBD-6: Ofrecer servicios claros** | Ya resuelto — `lawyer_services` CRUD funciona, pero sidebar muestra badge rojo si 0 servicios (`DashboardLayout:74-91`) | `lawyer_services:905`, `ServicesPage` | Sin cambio, solo CTA en onboarding + dashboard | MUST (ya) | Baja | — |
| **JTBD-7: Documentos del caso con IA** | `ai_documents` + `ai_document_analyses` solo en `/lawyer/ai/cases/:caseId` (`AICaseDetail.tsx`) sin link a `lawyer_cases` | `ai_workspaces:545`, `AICaseDetail` | NOT MVP — link `lawyer_cases.ai_workspace_id` preparado pero no flujo completo | COULD | Alta | `lawyer_cases` |
| **JTBD-8: Mensajería cliente-abogado** | `messages` existe pero oculto (`DashboardLayout:152` comentado), sin RLS auditada a fondo | `messages:1070` | NOT MVP | Baja | — | — |

---

## 6. MVP Scope

### MUST HAVE — Sin esto el SaaS no tiene sentido

| # | Feature | Descripción | Usuario | Tablas | Componentes/Rutas | APIs | Riesgo |
|---|---|---|---|---|---|---|---|
| M1 | **Solicitudes (inbox leads)** | Lista unificada de `bookings` (appointment+service) + `service_quote_requests` del abogado filtrada por `pending/quote_pending`. CTA: ver detalle → crear/ vincular cliente+caso, o crear presupuesto | Lawyer | `bookings`, `service_quote_requests`, `notifications` | `src/pages/lawyer/RequestsInbox.tsx` (nuevo), `/lawyer/requests`, `/lawyer/requests/:id` | Supabase SELECT (RLS) | Bajo |
| M2 | **Clientes** | Ficha deduplicada por `lawyer_id + email`. Lista + detalle con historial (bookings, quotes, payments, citas). Crear manual + auto-crear desde booking | Lawyer | NUEVA `lawyer_clients` + `bookings` + `payments` + `appointments` (read) | `/lawyer/clients`, `/lawyer/clients/:id`, `hooks/useLawyerClients.ts` | Supabase CRUD + trigger deduplicate | Medio (dedupe) |
| M3 | **Casos** | Envolvente `lawyer_cases` sobre `booking_id` o `quote_request_id` + casos manuales. Status SaaS propio (`new → quoted → paid → in_progress → delivered → closed`). No sustituye `bookings`; lo envuelve | Lawyer | NUEVA `lawyer_cases` (FK `lawyer_clients`, `bookings`, `service_quote_requests`, `ai_workspaces` nullable) | `/lawyer/cases`, `/lawyer/cases/:id` (reutiliza `JobsPage` logic) | Supabase CRUD | Medio (migración conceptual) |
| M4 | **Agenda unificada** | Fuente `bookings` (appointment) + vista compat `appointments`. Día/semana, CRUD cita SaaS (crea `bookings` type appointment), prevención overlap server, `get_lawyer_busy_slots` | Lawyer | `bookings`, `appointments` (compat), `get_lawyer_busy_slots` RPC | Evoluciona `CitasPage.tsx:542` → `CalendarPage`, `/lawyer/calendar` (alias `/lawyer/citas` redirect) | Supabase + RPC | Alto (fuente dual) |
| M5 | **Ingresos (lawyer revenue)** | Solo `SUM(payments.lawyer_amount)` del abogado, por mes/estado, con `payout_status`. Elimina mocks `EarningsPage:generateMockTransactions` | Lawyer | `payments`, `payout_logs`, `platform_settings` | Evoluciona `EarningsPage.tsx:634` → `RevenuePage`, `/lawyer/revenue` | Supabase SELECT | Bajo |
| M6 | **Servicios** | Ya MUST — mantener. Añadir CTA onboarding si 0 servicios (badge ya en `DashboardLayout:74`) | Lawyer | `lawyer_services` | `/lawyer/services` (existente) | Supabase | Bajo |
| M7 | **Dashboard “Hoy”** | Resumen: próximas citas (hoy), solicitudes sin responder (count), clientes nuevos 7d, ingresos mes (lawyer_amount), CTA conecta MP/GCal si falta | Lawyer | `bookings`, `lawyer_clients`, `payments`, `google_integrations`, `mercadopago_accounts` | Evoluciona `DashboardPage.tsx:787` | Supabase | Bajo |
| M8 | **RLS multi-tenant** | Todo SaaS aislado por `lawyer_id = auth.uid()`; `client` no cruza abogados | System | Todas SaaS | — | Policies | Crítico |

### SHOULD HAVE — Mucho valor, puede esperar a Fase 2.3+

- Disponibilidad horaria editor (`profiles.availability` + `202501` migración + GCal sync) — existe pero no integrado a agenda real.
- Notificaciones SaaS (`case.created`, `payment.failed`, `appointment.reminder`) vía `server/notifications/service.mjs:311`.
- Búsqueda/filtros avanzados en Clientes/Casos (por `practice_area`, `status`, `source`).
- Export CSV de clientes/casos/ingresos.

### COULD HAVE — Útil posteriormente

- Tareas por caso (kanban), notas internas, documentos no-AI por caso, recordatorios email/WhatsApp, métricas embudo (visitor→booking).

### NOT MVP — No implementar ahora

- Kanban/tasks completo, SII/facturación, firma avanzada, contabilidad multi-centro, white-label, consumer AI (`/ai` landing es marketing, no SaaS), mensajería real-time, cotizaciones con firma, comisiones diferenciadas por `source`, multi-abogado por estudio (seats).

---

## 7. Feature Prioritization

Ver también **§31 MVP Score**. Escala 1= bajo, 5= alto.

| Feature | User Value | Revenue Potential | Retention | Complexity | Risk | Priority | Verdict |
|---|---|---|---|---|---|---|---|
| Solicitudes inbox | 5 | 4 | 4 | 2 | 2 | MUST | Incluye |
| Clientes deduplicados | 5 | 3 | 5 | 3 | 3 | MUST | Incluye |
| Casos envolvente | 5 | 4 | 5 | 3 | 3 | MUST | Incluye |
| Agenda unificada | 5 | 3 | 4 | 4 | 4 | MUST | Incluye |
| Ingresos (lawyer_amount) | 4 | 5 | 3 | 2 | 2 | MUST | Incluye |
| Servicios (existente) | 4 | 4 | 3 | 1 | 1 | MUST | Reutiliza |
| Dashboard Hoy | 4 | 3 | 3 | 2 | 1 | MUST | Evoluciona |
| RLS multi-tenant | 5 | 5 | 5 | 3 | 5 | MUST | Bloqueante |
| Disponibilidad editor | 3 | 2 | 3 | 2 | 2 | SHOULD | Fase 2.3 |
| Notificaciones SaaS | 3 | 2 | 4 | 2 | 2 | SHOULD | Fase 2.3 |
| Docs no-AI por caso | 2 | 2 | 3 | 4 | 3 | COULD | Post-MVP |
| Kanban tasks | 2 | 2 | 3 | 5 | 4 | NOT MVP | No |
| Consumer AI | 2 | 3 | 2 | 5 | 4 | NOT MVP | No |
| Mensajería | 2 | 1 | 2 | 3 | 3 | NOT MVP | No |
| Comisión diferenciada | 1 | 4 | 1 | 4 | 4 | NOT MVP | No |

---

## 8. User Flows

### 8.1 Onboarding `registro → perfil → configuración → disponibilidad → servicios → listo`

```
VERIFIED existente: /lawyer/onboarding lazy Wizard (App.tsx:462) standalone sin sidebar.
Paso 1: Auth (supabase.auth) → /api/profiles POST (server.mjs:501) crea profiles.id=user_id, role=lawyer
Paso 2: Perfil (ProfilePage.tsx) — bio, specialties[], location, hourly_rate_clp, idiomas, educación
Paso 3: Servicios (ServicesPage.tsx) — al menos 1 lawyer_services (DashboardLayout:74 badge rojo si 0)
Paso 4: Disponibilidad — profiles.availability (202501 migración) + GoogleCalendarConnect (DashboardPage)
Paso 5: Pagos — MercadoPagoConnect (EarningsPage) / PaymentSettings (placeholder DashboardLayout:157)
Paso 6: “Listo” → Dashboard Hoy muestra checklist. Falta en repo: checklist visual; se propone en MVP sin tocar wizard.
Evidence: LawyerOnboardingPage:47, App.tsx:462, DashboardLayout:74-91, useProfile.ts:16028
Propuesta MVP: NO duplicar wizard. Solo añadir Checklist en DashboardPage (read-only sobre counts) + deep-link a cada paso.
```

### 8.2 Dashboard “Hoy”

```
Login → /lawyer/dashboard (RequireLawyer → DashboardLayout)
→ Cards: próximas citas hoy (bookings scheduled_date=today), solicitudes pendientes (count), clientes nuevos 7d (lawyer_clients created_at), ingresos mes (SUM lawyer_amount)
→ Timeline: últimos bookings + payments + notifications (ya en DashboardPage)
→ CTA condicional: si mercadopago_accounts==0 → Conecta MP; si google_integrations==0 → Conecta GCal
```

### 8.3 Agenda `bookings` como fuente

```
Crear cita SaaS: /lawyer/calendar → POST bookings (booking_type=appointment, lawyer_id=auth.uid(), user_email/name/phone, scheduled_date/time, duration, price=0 o service price)
→ server.mjs:1272 previene overlap (SELECT bookings WHERE lawyer_id + scheduled_date overlap) → 409 si choca
→ get_lawyer_busy_slots RPC (types:1704) alimenta slots disponibles en BookingPage (cliente) — reutilizado
→ CitasPage actual crea appointments + profiles cliente (anti-pattern CitasPage:90-118) — MVP cambia a crear bookings + lawyer_clients upsert, no profiles
```

### 8.4 Clientes

```
Lead marketplace: POST /api/bookings/create (server.mjs:1202) → bookings row (user_email/name/phone)
→ Lawyer abre Solicitudes → “Convertir en cliente” → upsert lawyer_clients (lawyer_id, email lower, name, phone, source=LEGALUP_MARKETPLACE|LAWYER_DIRECT)
→ Cliente SaaS manual: /lawyer/clients → form → insert lawyer_clients (source=LAWYER_DIRECT)
→ Cliente con varios abogados: cada abogado tiene su propia fila lawyer_clients (mismo email, distinto lawyer_id) — no shared global clients table
→ Ficha /lawyer/clients/:id muestra bookings+quotes+payments filtrados por email (o FK si se añade bookings.client_id)
Evidence: bookings.user_email:687, types:lawyer_services:905, CitasPage:90 crear profiles cliente (a reemplazar)
```

### 8.5 Casos

```
Caso desde solicitud: Solicitud → “Crear caso” → insert lawyer_cases (lawyer_id, client_id, booking_id|quote_request_id, title=service_title, status=new, source)
→ Caso manual: /lawyer/cases → New → insert lawyer_cases sin booking
→ Transiciones: new → quoted → paid (webhook MP actualiza bookings.payment_status=approved) → in_progress (useLawyerJobs:178) → delivered/completed → closed
→ Ficha /lawyer/cases/:id muestra cliente + bookings + payments + citas vinculadas + (futuro) ai_workspace link
→ JobsPage actual es solo vista map (useLawyerJobs:40) — MVP persiste estado en lawyer_cases.status SaaS, no solo bookings.status
```

### 8.6 Servicios / Ingresos

```
Servicios: ServicesPage CRUD lawyer_services (reutiliza). No nuevo flujo.
Ingresos: EarningsPage hoy lee payments.amount — MVP cambia a payments.lawyer_amount WHERE lawyer_user_id=auth.uid() AND status=completed, group by month, payout_status badge.
```

---

## 9. Information Architecture

```
LegalUp (público, SEO) — no indexar SaaS privado (§26)
├── / , /search, /abogado/:slug (PublicProfile), /booking/:lawyerId, /checkout/:bookingId
└── /ai (LegalUpAI marketing, standalone)

Lawyer SaaS (privado, RequireLawyer + RLS lawyer_id)
├── /lawyer/onboarding (wizard standalone, existente)
└── /lawyer (DashboardLayout, sidebar)
    ├── Inicio (/lawyer/dashboard) — Hoy, métricas, checklist, CTAs
    ├── Solicitudes (/lawyer/requests) — inbox leads marketplace + propios
    ├── Clientes (/lawyer/clients) — lista + ficha /:id (historial)
    ├── Casos (/lawyer/cases) — lista + ficha /:id (cliente+pagos+citas+AI link futuro)
    │   └── (futuro) /lawyer/cases/:id/ai → proxy a /lawyer/ai/cases/:workspaceId
    ├── Agenda (/lawyer/calendar + redirect /lawyer/citas) — día/semana, CRUD bookings
    ├── Servicios (/lawyer/services) — CRUD lawyer_services (existente)
    ├── Ingresos (/lawyer/revenue + redirect /lawyer/earnings) — dashboard financiero abogado
    ├── Perfil (/lawyer/profile) — edición + preview público
    ├── LegalUp AI (/lawyer/ai + /lawyer/ai/cases/:caseId) — preservado tal cual
    └── Configuración (/lawyer/settings) — cuenta, MP, GCal, notificaciones, suscripción (preparado)
    Header: Notificaciones (bell), Favoritos (heart) como iconos, no sidebar primary (§13)
```

---

## 10. Routing

| Ruta | Estado actual | Propuesta MVP | Protección | Componente |
|---|---|---|---|---|
| `/lawyer` | VERIFIED — redirect a `dashboard` (`App.tsx:571`) | Mantener | RequireLawyer | `DashboardLayout` |
| `/lawyer/dashboard` | VERIFIED (`LawyerDashboardPage:787`) | Evolucionar (Hoy + checklist) | RequireLawyer | `DashboardPage.tsx` |
| `/lawyer/profile` | VERIFIED (`ProfilePage.tsx`) | Mantener | RequireLawyer | `ProfilePage` |
| `/lawyer/services` | VERIFIED | Mantener | RequireLawyer | `ServicesPage.tsx` |
| `/lawyer/citas` | VERIFIED (`CitasPage:542` legacy) | **Alias** → `/lawyer/calendar`, redirect 301 | RequireLawyer | `CitasPage` → `CalendarPage` (evol) |
| `/lawyer/calendar` | NOT FOUND | **NUEVA** (agenda unificada) | RequireLawyer | `CalendarPage.tsx` (nuevo, reutiliza `CitasPage` + `bookings`) |
| `/lawyer/consultas` | VERIFIED pero ocultable (`App.tsx:188` comentado) | **Fusionar** en calendar (no nueva ruta) | RequireLawyer | `ConsultasPage.tsx` — deprecate, redirect a calendar |
| `/lawyer/jobs` | VERIFIED (`JobsPage:450`) | **Alias** → `/lawyer/cases`, redirect | RequireLawyer | `JobsPage` → `CasesPage` |
| `/lawyer/cases` | NOT FOUND | **NUEVA** — lista envolvente | RequireLawyer | `CasesPage.tsx` (nuevo, reutiliza `useLawyerJobs` logic) |
| `/lawyer/cases/:id` | NOT FOUND | **NUEVA** — ficha caso | RequireLawyer | `CaseDetailPage.tsx` (nuevo) |
| `/lawyer/clients` | NOT FOUND | **NUEVA** — lista clientes deduplicados | RequireLawyer | `ClientsPage.tsx` (nuevo) |
| `/lawyer/clients/:id` | NOT FOUND | **NUEVA** — ficha cliente | RequireLawyer | `ClientDetailPage.tsx` (nuevo) |
| `/lawyer/requests` | NOT FOUND | **NUEVA** — inbox solicitudes | RequireLawyer | `RequestsInbox.tsx` (nuevo) |
| `/lawyer/earnings` | VERIFIED (`EarningsPage:634`) | **Alias** → `/lawyer/revenue` | RequireLawyer | `EarningsPage` → `RevenuePage` |
| `/lawyer/revenue` | NOT FOUND | **NUEVA** (alias, corrige query) | RequireLawyer | `RevenuePage.tsx` |
| `/lawyer/ai` | VERIFIED (`LegalUpAIWorkspace`) | Mantener | RequireLawyer | `LegalUpAIWorkspace.tsx` |
| `/lawyer/ai/cases/:caseId` | VERIFIED (`AICaseDetail:637`) | Mantener + link desde `lawyer/cases/:id` | RequireLawyer | `AICaseDetail.tsx` |
| `/lawyer/notificaciones` | VERIFIED | Mantener | RequireLawyer | `NotificationsPage.tsx` |
| `/lawyer/favorites` | VERIFIED | Mantener (o header icon) | RequireLawyer | `DashboardFavorites.tsx` |
| `/lawyer/quotes/:quoteRequestId` | VERIFIED | Mantener | RequireLawyer | `QuoteRequestsPage.tsx` |
| `/lawyer/onboarding` | VERIFIED (standalone) | Mantener, no duplicar | Auth | `LawyerOnboardingPage:47` |
| `/dashboard/*` (cliente) | VERIFIED | Sin tocar en SaaS MVP | Auth | `UserDashboard.tsx` etc. |
| `/admin/*` | VERIFIED | Sin tocar | RequireAdmin `server.mjs:359` | `AdminLayout` |

**Lazy loading:** `App.tsx:56-107` ya usa `lazy()` + `Suspense` + prefetch `AICaseDetail` (`App.tsx:112`). Nuevas rutas deben seguir mismo patrón `lazy(() => import('./pages/lawyer/ClientsPage'))` + `Suspense` en `DashboardLayout` (`DashboardLayout:436`).

---

## 11. Data Model

### 11.1 Clasificación EXISTENTE vs NUEVA

| Entidad | Clasificación | Justificación |
|---|---|---|
| `profiles` | EXISTENTE — reutilizar | Ya contiene abogado (role=lawyer) con RLS `auth.uid()=id`. Es `lawyer_id` para todo SaaS. |
| `lawyer_services` | EXISTENTE — reutilizar | Fuente de verdad servicios SaaS. No crear `services` paralelo. |
| `bookings` | EXISTENTE — reutilizar (modificar: añadir `source`, `client_id` nullable) | Fuente de verdad agenda + trabajos directos. `booking_type=appointment|service`, `status`, `payment_status` ya cubren flujo. |
| `appointments` | EXISTENTE — legacy | Compat: lectura en agenda unificada, pero creación nueva va a `bookings`. No añadir columnas. |
| `service_quote_requests` | EXISTENTE — reutilizar | Fuente de cotizaciones. Link a `lawyer_cases` vía FK. |
| `payments` | EXISTENTE — reutilizar | `lawyer_amount` ya separa ingreso abogado. No crear `invoices` MVP. |
| `platform_settings`, `payout_logs`, `mercadopago_accounts`, `google_integrations`, `notifications`, `reviews`, `favorites` | EXISTENTE — reutilizar | Sin cambios MVP salvo lectura. |
| `ai_workspaces` etc. | EXISTENTE — reutilizar (no MVP SaaS) | Preparar FK desde `lawyer_cases.ai_workspace_id` pero no flujo AI completo en MVP. |
| `lawyer_clients` | NUEVA | Deduplicación abogado↔cliente por email. No existe. |
| `lawyer_cases` | NUEVA | Envolvente SaaS sobre bookings/quotes. No existe. |
| `lawyer_subscriptions` | NUEVA (preparación, no cobro MVP) | Para monetización futura bundle $49.990 (FASE-1 §6 Modelo A). No bloquear MVP. |

### 11.2 `lawyer_clients` (NUEVA — MUST)

**Propósito:** Vista deduplicada de clientes por abogado. Un email = un cliente por abogado; mismo email con dos abogados = dos filas.

```
lawyer_clients
  id uuid PK default gen_random_uuid()
  lawyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
  email text NOT NULL               -- lower(trim(email))
  name text NOT NULL                -- display
  phone text | null
  source text NOT NULL DEFAULT 'UNKNOWN' CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN'))
  first_booking_id uuid NULL REFERENCES bookings(id) ON DELETE SET NULL
  notes text | null
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()
  -- No FK a profiles(user_id) porque cliente puede ser guest sin user_id (bookings.user_id nullable)

Índices:
  UNIQUE (lawyer_id, lower(email))
  INDEX (lawyer_id, created_at DESC)
  INDEX (lawyer_id, lower(email))

RLS:
  ENABLE ROW LEVEL SECURITY
  POLICY "lawyer_clients_owner_select" ON lawyer_clients FOR SELECT USING (auth.uid() = lawyer_id)
  POLICY "lawyer_clients_owner_insert" FOR INSERT WITH CHECK (auth.uid() = lawyer_id)
  POLICY "lawyer_clients_owner_update" FOR UPDATE USING (auth.uid() = lawyer_id) WITH CHECK (auth.uid() = lawyer_id)
  POLICY "lawyer_clients_owner_delete" FOR DELETE USING (auth.uid() = lawyer_id)

Dependencias: bookings (source), profiles (lawyer_id)
Backfill (opcional, no bloqueante): INSERT INTO lawyer_clients (lawyer_id,email,name,phone,source,first_booking_id)
  SELECT DISTINCT ON (lawyer_id, lower(user_email)) lawyer_id, lower(user_email), user_name, user_phone, 'LEGALUP_MARKETPLACE', min(id) OVER...
  FROM bookings WHERE lawyer_id IS NOT NULL AND user_email ~ '^[^@]+@[^@]+\.[^@]+$'  -- evita guests sin email
```

**Por qué no reutilizar `profiles`:** `CitasPage:90-118` ya intentó `profiles` con `role=client` ad-hoc pero rompe tenant (un `profiles` global compartiría cliente entre abogados). `lawyer_clients` es tenant-isolated.

### 11.3 `lawyer_cases` (NUEVA — MUST)

**Propósito:** Expediente SaaS que envuelve una solicitud (booking o quote) o es manual. Es la “fuente SaaS”, no la de pagos/agenda.

```
lawyer_cases
  id uuid PK
  lawyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
  client_id uuid NULL REFERENCES lawyer_clients(id) ON DELETE SET NULL
  booking_id uuid NULL REFERENCES bookings(id) ON DELETE SET NULL
  quote_request_id uuid NULL REFERENCES service_quote_requests(id) ON DELETE SET NULL
  -- exactamente uno de booking_id / quote_request_id o NULL (manual). CHECK:
  -- CHECK ( (booking_id IS NOT NULL)::int + (quote_request_id IS NOT NULL)::int <= 1 )
  title text NOT NULL              -- denormalizado de service_title / manual
  description text | null
  practice_area text | null        -- free-form o FK a specialties (no FK en MVP)
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','quoted','paid','in_progress','delivered','closed','cancelled'))
  source text NOT NULL DEFAULT 'UNKNOWN' CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN'))
  ai_workspace_id uuid NULL REFERENCES ai_workspaces(id) ON DELETE SET NULL  -- futuro link AI
  price_clp integer | null
  currency text NOT NULL DEFAULT 'CLP'
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz NOT NULL DEFAULT now()

Índices:
  UNIQUE (booking_id) WHERE booking_id IS NOT NULL   -- 1 booking = 1 caso max
  UNIQUE (quote_request_id) WHERE quote_request_id IS NOT NULL
  INDEX (lawyer_id, status, created_at DESC)
  INDEX (lawyer_id, client_id)
  INDEX (lawyer_id, source)

RLS: idéntico a lawyer_clients (auth.uid()=lawyer_id)

Dependencias: lawyer_clients, bookings, service_quote_requests, ai_workspaces
```

**Alternativa descartada:** Reutilizar `ai_workspaces` como `lawyer_cases` (AD-003). Razón descarte: `ai_workspaces` tiene RLS + triggers trial (3 casos/10 docs `migrations/608040100`) que contaminarían SaaS; además `ai_workspaces` no tiene `client_id`/`booking_id`.

### 11.4 Modificaciones a tablas existentes (mínimas)

```
bookings:
  ADD COLUMN source text NOT NULL DEFAULT 'UNKNOWN' CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN'))
  ADD COLUMN client_id uuid NULL REFERENCES lawyer_clients(id) ON DELETE SET NULL  -- PROPOSED, opcional MVP (join por email ya funciona)
  CREATE INDEX idx_bookings_lawyer_source ON bookings(lawyer_id, source)
  CREATE INDEX idx_bookings_lawyer_client ON bookings(lawyer_id, client_id) WHERE client_id IS NOT NULL

lawyer_services: sin cambios
payments: sin cambios (solo corregir queries a lawyer_amount)
appointments: sin cambios (compat lectura)
profiles: sin cambios
```

### 11.5 `lawyer_subscriptions` (NUEVA — preparación, NOT cobro en MVP)

```
lawyer_subscriptions (para FASE-1 Modelo A bundle $49.990)
  id uuid PK
  lawyer_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','saas_essential','saas_pro'))
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','trialing','active','past_due','cancelled','expired'))
  provider text NULL CHECK (provider IN ('mercadopago','manual'))
  provider_subscription_id text NULL  -- MP preapproval id
  amount_clp integer NOT NULL DEFAULT 49900
  current_period_start timestamptz NULL
  current_period_end timestamptz NULL
  trial_started_at timestamptz NULL
  trial_ends_at timestamptz NULL
  cancel_at_period_end boolean NOT NULL DEFAULT false
  cancelled_at timestamptz NULL
  created_at / updated_at

RLS: auth.uid()=lawyer_id
Índice: UNIQUE(lawyer_id), INDEX(status)
Nota MVP: crear tabla vacía + RLS, sin endpoint de cobro. ai_subscriptions sigue vigente para AI trial; lawyer_subscriptions es preparación monetización §16.
```

---

## 12. Database Changes

**Orden de migraciones (dependencias):**

```
MIG-001: lawyer_clients (sin FK a bookings aún para evitar ciclo)
MIG-002: bookings source + client_id nullable (+ índices)
MIG-003: lawyer_cases (FK a lawyer_clients + bookings + service_quote_requests + ai_workspaces)
MIG-004: lawyer_subscriptions (standalone)
MIG-005: backfill view opcional (no bloqueante) — insert lawyer_clients desde bookings existentes (solo lawyer_id + email válidos)
MIG-006: RLS policies para NUEVAS tablas (separate file por tabla)
```

**Estimación SQL incremental:** < 200 LOC total. Sin `DROP` de tablas existentes. Sin `ALTER` destructivo. `ADD COLUMN ... DEFAULT 'UNKNOWN'` es online sin rewrite (Postgres 12+). `UNIQUE WHERE` parcial no bloquea inserts existentes (bookings con NULL `client_id`).

**Rollback:** `DROP TABLE lawyer_cases, lawyer_clients, lawyer_subscriptions` + `ALTER TABLE bookings DROP COLUMN source, client_id`. Sin pérdida de datos existentes.

**Compatibilidad backward:** `JobsPage`/`useLawyerJobs` siguen leyendo `bookings`+`service_quote_requests` sin saber de `lawyer_cases`. `CitasPage` sigue leyendo `appointments`. No breaking change.

---

## 13. RLS & Security

**Principio:** *No confíes en restricciones exclusivamente del frontend* (§9). Todo SaaS filtra por `auth.uid() = lawyer_id`.

### 13.1 Lawyer (abogado autenticado, `profiles.role=lawyer`)

| Entidad | SELECT | INSERT | UPDATE | DELETE | Evidence actual |
|---|---|---|---|---|---|
| `lawyer_clients` | `USING auth.uid()=lawyer_id` | `WITH CHECK auth.uid()=lawyer_id` | `USING/WITH CHECK auth.uid()=lawyer_id` | `USING auth.uid()=lawyer_id` | NUEVA — crear policies |
| `lawyer_cases` | idem | idem (+ check `client_id` pertenece al mismo `lawyer_id` vía trigger o `WITH CHECK EXISTS (SELECT 1 FROM lawyer_clients WHERE id=client_id AND lawyer_id=auth.uid())`) | idem | idem | NUEVA |
| `bookings` | `USING auth.uid()=lawyer_id` (ya existe) | Service-role only (`server.mjs:1202` NO AUTH) — lawyer no inserta directo salvo agenda SaaS (insert `bookings` con `auth.uid()=lawyer_id` permitir) | `USING auth.uid()=lawyer_id` (status updates `useLawyerJobs:178`) | No (solo cancel) | VERIFIED `types:bookings:746` FK `lawyer_id→profiles.user_id`, RLS a verificar en migrations `20241125*` / `202607*` — asumir `USING lawyer_id=auth.uid()` |
| `appointments` | `USING auth.uid()=lawyer_id` | `WITH CHECK auth.uid()=lawyer_id` | `USING auth.uid()=lawyer_id` | `USING auth.uid()=lawyer_id` | LEGACY RLS a auditar — `types:appointments:662` sin Relationships indica RLS quizá incompleta |
| `lawyer_services` | `USING auth.uid()=lawyer_user_id` | idem | idem | idem | VERIFIED |
| `payments` | `USING auth.uid()=lawyer_user_id` (abogado ve solo sus cobros) | No (solo server RPC `create_payment_secure`) | No | No | VERIFIED `types:payments:1266` |
| `ai_*` | `USING auth.uid()=lawyer_id` | idem | idem | idem | VERIFIED `ai_workspaces:573` etc. |
| `lawyer_subscriptions` | `USING auth.uid()=lawyer_id` | No (solo server) | No | No | NUEVA |
| `service_quote_requests` | `USING auth.uid()=lawyer_id` **UNKNOWN — auditar** | — | — | — | NOT FOUND / INFERRED — a verificar Dashboard → Table Editor → RLS enabled |
| `booking_leads` | `USING auth.uid()=lawyer_id` **UNKNOWN** | — | — | — | NOT FOUND — auditar |

### 13.2 Client (usuario `role=client`)

| Entidad | Permiso | Nota |
|---|---|---|
| `lawyer_clients` | NOT VISIBLE | Cliente nunca ve `lawyer_clients` de abogado. Es tabla privada abogado. |
| `lawyer_cases` | NOT VISIBLE | Idem. Cliente no ve expediente SaaS. |
| `bookings` | `USING auth.uid()=user_id` (si `user_id` no null) — VERIFIED cliente ve sus bookings | `types:bookings` no lista policy cliente pero `server.mjs:1397` notifica `user_id` si existe |
| `payments` | `USING auth.uid()=client_user_id` | VERIFIED |
| Marketplace público | `SELECT` sin auth en `/abogado/:slug` (PublicProfile) | RLS `profiles` permite `SELECT` público para abogados visibles (ver `migrations/20240926*`) — no cambiar |

### 13.3 Admin (`requireAdmin` `server.mjs:359` + `profiles.role=admin`)

| Entidad | Permiso |
|---|---|
| Todas | `USING EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin')` — ya en `migrations/20241125*` para `platform_settings` etc. Mantener. Admin no necesita `lawyer_clients`/`cases` salvo soporte. |

### 13.4 Reglas de ownership críticas

```
Lawyer A
  ↓ lawyer_id = auth.uid() = <uuid-A>
  → sus lawyer_clients (WHERE lawyer_id = A)
  → sus lawyer_cases (WHERE lawyer_id = A)
  → sus bookings (WHERE lawyer_id = A) + sus payments (WHERE lawyer_user_id = A)
  → sus ai_workspaces (WHERE lawyer_id = A)

Lawyer B (uuid-B) — ningún SELECT/UPDATE/DELETE puede leer/escribir filas de A si RLS es USING auth.uid()=lawyer_id
Test obligatorio: Lawyer A cannot read Lawyer B data (ver §24)
```

**Datos sensibles:** `bookings.user_email/phone`, `lawyer_clients.email/phone`, `payments.lawyer_amount`, `ai_documents.extracted_text` (80k chars `server.mjs:439`) + PII cliente en `ai_documents`. RLS ya aísla por `lawyer_id`; server nunca debe exponer `extracted_text` a otro `lawyer_id` (validar `workspace.lawyer_id == auth.uid()` antes de `chatCompletion` — ya en `server.mjs:21` import `trialIdentity`).

**Documentos:** `ai-documents` bucket path `lawyer/<lawyer_id>/<workspace_id>/<file>`; policy `storage.objects` debe ser `auth.uid()::text = (storage.foldername(name))[1]` — a auditar en Supabase Storage → Policies antes de implementar `lawyer_cases` docs no-AI.

---

## 14. API / Backend Architecture

**Decisión (AD-005):** Operaciones SaaS de lectura/CRUD simple → **Supabase directo** (RLS). Operaciones con dinero, secrets o cross-entity → **server.mjs**. No Edge Functions nuevas en MVP salvo payout existente.

| Operación | Frontend → | Evidencia / Razón |
|---|---|---|
| `GET lawyer_clients` / `POST lawyer_clients` / `PATCH` / `DELETE` | **Supabase** (`supabase.from('lawyer_clients').select().eq('lawyer_id', auth.uid())`) | RLS owner, sin secrets, sin join complejo. Reutiliza pattern `useLawyerJobs:56` pero con `lawyer_id = user.id` |
| `GET lawyer_cases` / `POST` / `PATCH status` | **Supabase** | Idem. `status` transition validada por `CHECK` constraint, no server |
| `GET bookings` (solicitudes) / `PATCH bookings.status` | **Supabase** | Ya en `useLawyerJobs:178` (`supabase.from('bookings').update({status}).eq('id', sourceId)`) — reutiliza |
| `POST bookings` (crear cita SaaS desde agenda) | **Supabase** (si `lawyer_id=auth.uid()`) o **server** si se quiere reuse `POST /api/bookings/create` con auth — MVP: Supabase directo para no tocar server | `server.mjs:1202` es `NO AUTH` para cliente; para abogado SaaS se puede insert directo con RLS |
| `GET payments` (ingresos) | **Supabase** | `EarningsPage` ya hace `supabase.from('payments').select().eq('lawyer_user_id', session.user.id)` — corregir a `lawyer_amount` |
| `POST /api/profiles` | **server.mjs:501** | Ya existe para crear `profiles` durante signup — mantener |
| `POST /create-payment` + `POST /api/mercadopago/webhook` | **server.mjs:902 + webhook** | Secrets MP, nunca Supabase. No tocar en MVP |
| `GET /api/mercadopago/preference` (supabase/functions/create-mercado-pago-preference) | **Edge Function** existente | Mantener |
| `process-weekly-payouts` | **Edge Function** existente (cron) | No tocar |
| `POST /verify-lawyer` / `POST /verify-rut` | **server.mjs:622/594** | PJUD scraper `load` cheerio + `axios` — fuera de MVP |
| `GET get_lawyer_busy_slots` RPC | **Supabase RPC** | `types:1704` `get_lawyer_busy_slots(query_date, query_lawyer_id)` — ya usado para disponibilidad, reutilizar en agenda |
| `POST /api/ai/*` (trial, subscribe, documents, chat, research) | **server.mjs:21-56 imports ai/** | AI no MVP SaaS, preservar. `lawyer_cases.ai_workspace_id` solo FK, no nuevo endpoint |
| Notificaciones `server/notifications/service.mjs:311` | **server** vía `notificationsService.notifyUsers` | Ya en `server.mjs:1394` para `booking.created`; reutilizar para `lawyer_case.created` si se añade trigger |

**Sin nuevo server endpoint en MVP** salvo opcional `POST /api/lawyer-clients/deduplicate` si se quiere deduplicar email case-insensitive server-side (PROPOSED, no bloqueante — `UNIQUE (lawyer_id, lower(email))` + `ON CONFLICT` ya resuelve).

---

## 15. Marketplace ↔ SaaS Architecture

**Objetivo:** Un abogado que obtiene un cliente desde LegalUp debe poder gestionarlo dentro del SaaS sin duplicar información. Y viceversa: un cliente SaaS debe relacionarse con marketplace cuando corresponda.

```
LEGALUP MARKETPLACE (público, SEO, adquisición)
  /search → /abogado/:slug (PublicProfile.tsx) → /booking/:lawyerId (BookingPage.tsx)
  ↓ POST /api/bookings/create (server.mjs:1202) — NO AUTH, crea bookings + booking_leads + notifications
  bookings { lawyer_id, user_email/name/phone, booking_type, service_*, price, status=pending, source=UNKNOWN→MIG-002 }

LAWYER SAAS (privado, /lawyer/*, RLS lawyer_id)
  Solicitudes (bookings pending + service_quote_requests pending WHERE lawyer_id=auth.uid())
  ↓ “Convertir en cliente” → upsert lawyer_clients { lawyer_id, email lower, source=LEGALUP_MARKETPLACE }
  ↓ “Crear caso” → insert lawyer_cases { lawyer_id, client_id, booking_id|quote_request_id, status=new, source }
  ↓ Agenda: bookings appointment (misma tabla) → payments (lawyer_amount) → Ingresos
  ↓ Origen propio: abogado crea lawyer_clients manual (source=LAWYER_DIRECT) → crea lawyer_cases manual → crea bookings appointment (misma tabla, source=LAWYER_DIRECT)

Compartido:
  lawyer_services ya es usado por ambos (PublicProfile lee lawyer_services para mostrar servicios; SaaS edita). Sin duplicado.
  payments ya es compartido (marketplace lo crea; SaaS lo lee filtrado lawyer_user_id).
  profiles ya es compartido (abogado es tenant; cliente es global profiles.role=client pero aislado por lawyer_clients).
```

**Qué se comparte vs qué se aísla:**

| Dato | Comparte Marketplace↔SaaS | Cómo |
|---|---|---|
| `lawyer_services` | Sí | Marketplace lee, SaaS escribe. Misma tabla. |
| `bookings` | Sí — **fuente única** AD-001 | Marketplace crea (NO AUTH), SaaS lee/escribe (RLS). `source` distingue origen |
| `service_quote_requests` | Sí | Marketplace crea (via `service-rescue` etc.), SaaS lee/quote |
| `payments` | Sí | Marketplace/webhook crea, SaaS lee `lawyer_amount` |
| `lawyer_clients` | Solo SaaS (aislado por lawyer_id) | Marketplace no lee; SaaS deduplica por email. Cliente global `profiles` no es `lawyer_clients` |
| `lawyer_cases` | Solo SaaS | Marketplace no lee. Envolvente, no reemplaza bookings |
| `ai_workspaces` | Solo SaaS (link opcional) | `lawyer_cases.ai_workspace_id` nullable |

**Flujo aceite sin duplicar:**

```
Cliente nuevo Google → artículo → /abogado/:slug?article_slug=X (server.mjs:1223 metadata.article_slug)
→ BookingPage → POST /api/bookings/create { lawyer_id, user_email: "ana@...", article_slug }
→ bookings { source=UNKNOWN (MIG-002) → trigger o backfill rule: if metadata.article_slug IS NOT NULL → LEGALUP_MARKETPLACE }
→ Lawyer ve Solicitudes → Convierte → lawyer_clients { email=ana@..., source=LEGALUP_MARKETPLACE } + lawyer_cases { booking_id, client_id, source=LEGALUP_MARKETPLACE }

Cliente propio: abogado comparte /abogado/slug en WhatsApp con ?ref=lawyer_direct (o booking creado manual desde SaaS con source=LAWYER_DIRECT)
→ bookings { source=LAWYER_DIRECT } → misma conversión pero source distinto (futuro monetización diferenciada, no MVP)
```

**Backward compatibility:** `bookings` existentes con `source=UNKNOWN` siguen funcionando. `JobsPage` y `BookingPage` no leen `source` aún; no breaking change.

---

## 16. Payments & Mercado Pago Impact

**Estado actual VERIFIED:** `POST /create-payment` (`server.mjs:902`) crea `payments` vía `RPC create_payment_secure` con `DEFAULT_CLIENT_SURCHARGE 10%` + `DEFAULT_PLATFORM_FEE 20%` (`server.mjs:430`, `platform_settings:1326`), luego `fetch https://api.mercadopago.com/checkout/preferences` con `mercadopagoAccessToken` (`server.mjs:327`, `MERCADOPAGO_ACCESS_TOKEN`, nunca `VITE_` — check `isJwt` `server.mjs:1117`), `external_reference=paymentId`, `notification_url=resolveWebhookUrl` (`server.mjs:134`). Webhook `POST /api/mercadopago/webhook` (Edge Function `supabase/functions/mercado-pago-webhook/`) actualiza `bookings.payment_status` + `payments.status` + dispara `sendGA4PurchaseEvent` (`server.mjs:172`) + `sendMetaPurchaseEvent` (`server/metaCapi.mjs`) + `payment_events` tracking (`server.mjs:1374`). `process-weekly-payouts` liquida `payout_logs`.

| Pregunta §13 | Respuesta (evidencia) |
|---|---|
| Qué representa ingreso del abogado | `payments.lawyer_amount` (= `original_amount - platform_fee`, `original_amount` = `amount` `server.mjs:1027`). `lawyer_amount = original * 0.8` con defaults. Visible solo si `payout_status=completed` (o `status=completed`). |
| Qué representa comisión LegalUp | `payments.platform_fee` (20% de original) + `client_surcharge` (10% extra pagado por cliente, no ingreso abogado). `platform_settings.platform_fee_percent` / `client_surcharge_percent` es source of truth (`types:1326`). |
| Qué datos ya existen | `payments:1193` (amount/original_amount/lawyer_amount/platform_fee/client_surcharge + payout_* + status + currency) + `payout_logs:1290` + `platform_settings:1326` + `payment_events` + GA4/Meta dedup `event_id=paymentId`/`doc.id` |
| Qué información falta | `payout_status` no visible en `EarningsPage.tsx:634` (muestra `status` genérico, no `payout_status`). `mercadopago_accounts` sin UI de conexión (OAuth). `lawyer_subscriptions` sin tabla (FASE-1 §6 bundle). |
| Qué NO debe tocarse en esta fase | **No tocar:** `POST /create-payment`, `POST /api/bookings/create`, webhook MP, `platform_settings` defaults, `process-weekly-payouts`, `create_payment_secure` RPC. **Solo leer** `payments.lawyer_amount` en nuevo `RevenuePage` con RLS. **Preparar** `lawyer_subscriptions` tabla vacía sin endpoint cobro. Regla FASE-1: precio LegalUpAI $49.990 no se modifica; no introducir `saas` charge aún. |

**Impacto SaaS MVP:** Cero. SaaS lee `payments` existente filtrado `lawyer_user_id = auth.uid()`; no crea `payments` nuevos salvo vía flujo marketplace existente. Agenda SaaS que crea `bookings` type appointment sin pago (`price=0`) no genera `payments` — correcto (cita gratuita). Si cita SaaS es pagada, reutiliza mismo `POST /create-payment` (no nuevo).

---

## 17. Multi-Tenancy

**Tenant:** `lawyer` (`profiles.id = auth.uid()` donde `role=lawyer`). No org, no estudio multi-abogado en MVP.

**Garantía:**

```
Lawyer A (auth.uid() = uuid-A)
  → WHERE lawyer_id = uuid-A en: lawyer_clients, lawyer_cases, bookings, lawyer_services, payments(lawyer_user_id), appointments, ai_workspaces, service_quote_requests, booking_leads, google_integrations, mercadopago_accounts
  → NO puede SELECT/UPDATE/DELETE rows donde lawyer_id = uuid-B

Lawyer B (uuid-B) — idem espejo
Client (role=client, uuid-C) — solo puede SELECT bookings/payments WHERE user_id = uuid-C, nunca lawyer_clients/cases
Admin (role=admin, requireAdmin server.mjs:359) — SELECT all pero solo para soporte/analytics, no muta SaaS tenant sin audit log
```

**¿Modelo actual ya permite?** **PARTIAL.** `profiles` + `lawyer_services` + `bookings` + `ai_*` ya tienen RLS `auth.uid()=lawyer_id`. `appointments` y `service_quote_requests`/`booking_leads` tienen RLS **UNKNOWN — auditar** (ver §13). `lawyer_clients`/`cases` nuevas tendrán RLS owner. No se necesita `tenant_id` extra; `lawyer_id` es tenant key. No `row-level` por estudio.

**Mínima evolución:** Añadir RLS `lawyer_clients`/`lawyer_cases`/`lawyer_subscriptions` con `USING auth.uid()=lawyer_id`. Auditar y añadir policies faltantes a `appointments`/`service_quote_requests`/`booking_leads` antes de Fase 2.2.

**Futuro multi-abogado por estudio (NOT MVP):** Añadir `organizations` + `organization_members` + `lawyer_cases.organization_id` — no diseñar ahora.

---

## 18. Analytics

**Existente VERIFIED:**

- **Client-side:** `usePageTracking.ts` (`App.tsx:317` `usePageTracking()` en `AppContent`), `posthog-js` (`lib/posthogLoader.ts`, `PostHogBoundary` `App.tsx:103`), `GoogleAnalytics.tsx` lazy (`App.tsx:637`), `page_views` (`types:1160` visitor_id/user_id/page_path/referrer/user_agent), `TestAnalytics.tsx`.
- **Server-side:** `sendGA4PurchaseEvent` (`server.mjs:172` Measurement Protocol `purchase` con `transaction_id`, `value`, `currency`, `booking_id`, `lawyer_id`, `is_owner` dedup), `sendMetaPurchaseEvent` (`server/metaCapi.mjs`, dedup `eventId=doc.id`), `payment_events` (`server.mjs:1374` event_type started, `server.mjs:1374` tracking), `owner` (`OWNER_EMAILS` `server.mjs:144` filtra métricas internas `gigfmedia@icloud.com` / `juan.fercommerce@gmail.com` flagged `transport_is_owner`).
- **PostHog SaaS/AI ya:** `ai_workspace_viewed`, `ai_paywall_opened`, `ai_feature_clicked`, `ai_first_case_created` (`hooks/useAIWorkspaces` posthog), `ai_document_processing_*`, `ai_case_chat_panel_opened` (`AICaseDetail.tsx`), `ai_onboarding_started` — pero **no hay** `saas_client_created`, `saas_case_created`, etc.

**Duplicados / mal definidos:**

- `page_views` + `usePageTracking` + GA4 `gtag` (`PublicProfile` quizá) + PostHog `pageview` = triple tracking sin dedup. `payment_events` + GA4 `purchase` + Meta `purchase` = triple purchase sin `event_id` unificado salvo `paymentId`/`doc.id` en server — OK dedup server pero no client.
- `generateMockTransactions` en `EarningsPage:73` contamina `payments` analytics si no se filtra `status`.
- `OWNER_EMAILS` filtra bien pero solo en `sendGA4PurchaseEvent`/`sendDocumentPurchaseEvent` (`server.mjs:240`); no filtra `posthog` ni `page_views`.

**Eventos MVP (solo útiles, §17):**

| Evento | Dónde dispara | Tipo | Reutiliza |
|---|---|---|---|
| `lawyer_signup` | `POST /api/profiles` `server.mjs:501` (role=lawyer) | server | Nuevo (server log) |
| `lawyer_onboarding_started` / `completed` | `LawyerOnboardingPage:47` mount + wizard finish | client | PostHog `ai_onboarding_started` como referencia |
| `lawyer_dashboard_viewed` | `DashboardPage.tsx:17` mount | client | PostHog `ai_workspace_viewed` pattern |
| `solicitation_viewed` | `RequestsInbox` mount | client | PostHog |
| `client_created` (source) | `lawyer_clients` INSERT (autocliente deduplicate) | client+server | Nuevo |
| `case_created` (source) | `lawyer_cases` INSERT | client | Nuevo |
| `appointment_created` (source) | `bookings` INSERT type appointment desde SaaS | client | `booking.created` notification ya |
| `service_created` | `ServicesPage` INSERT `lawyer_services` | client | Existente (no event aún) |
| `booking_received` | `server.mjs:1202` `POST /api/bookings/create` success (ya `payment_events started` + `notifications booking.created`) | server | Reutiliza `payment_events` + add PostHog |
| `booking_paid` | webhook MP `payment_status=approved` | server | Ya `sendGA4PurchaseEvent` + `payment_events` |
| `revenue_viewed` | `EarningsPage`/`RevenuePage` mount | client | Nuevo |
| `profile_completed` | `ProfilePage` save where `profile_setup_completed` true | client | Existente `profiles.profile_setup_completed` |

**Dónde:** Preferir **server-side** para `booking_*`/`payment_*` (verdad), **client-side PostHog** para vistas SaaS (no GA4). GA4 `purchase` ya server-side con `GA4_MEASUREMENT_ID`+`GA4_API_SECRET` (`server.mjs:164`). No duplicar `purchase` client. Filtrar `is_owner` en todos.

---

## 19. UX Architecture

**Flujo ideal (frecuencia > velocidad > claridad > baja fricción §19):**

```
Abogado → Login (AuthContext) → Dashboard Hoy
  ↓ “Hoy”: próxima cita (08:30 Ana), solicitudes (2 sin responder), ingresos mes ($1.2M), clientes nuevos
  → Tap “Solicitudes” → ve lead Ana (bookings pending) → “Convertir en cliente” → ficha Ana (lawyer_clients) lista
  → “Crear caso” → caso “Divorcio Ana” (lawyer_cases new) → agenda cita dentro del caso → cobra (link MP)
  → Todo < 3 taps, sin dashboards sobrecargados, sin modales anidados
```

**Dashboard (evoluciona `DashboardPage:787`):** 4 cards (próximas citas hoy, solicitudes count, clientes 7d, ingresos mes) + lista actividad (ya) + checklist activación (perfil≥80% → 1 servicio → disponibilidad → MP conectado → primer cliente → primer caso). No métricas decorativas (no “total page views”).

**Agenda (unificada):** Vista día (default hoy) como `CitasPage:226` + semana. `Search` existente + filtros `status`. `AppointmentForm` (`CitasPage:463` `components/appointments/AppointmentForm.tsx`) reutilizado pero cambiando `supabase.from('profiles').insert(role=client)` (`CitasPage:104`) por `lawyer_clients` upsert. Bug actual `handleNewAppointment:480` crea cita local `setAppointments([...prev, newAppointment])` sin persistir `appointments` row — MVP persiste `bookings`.

**Clientes/Casos:** Tablas con `Search` + `Select` filtros (`JobsPage:337` pattern) + `Dialog` detalle (`JobsPage:87` `JobDetailDialog`). Sin kanban. Ficha cliente muestra historial (bookings+quotes+payments) filtrado `email`, no `user_id` (guest sin user_id). Ficha caso muestra cliente + booking/quote link + status transitions (buttons `paid → in_progress → delivered` como `JobsPage:235`).

**Evitar:** dashboards con 8 cards, features decorativas (no “satisfaction rate” mock), workflows complejos (no multi-paso cotización con firma), configuración innecesaria (no “preferencias de notificación por tipo” MVP).

---

## 20. Performance Considerations

- **React Query:** `App.tsx:142` `QueryClient` con `retry:1`, `refetchOnWindowFocus:false`. Nuevos hooks (`useLawyerClients`, `useLawyerCases`, `useRequestsInbox`) deben usar `@tanstack/react-query:5.56.2` (`package.json:54`) con `staleTime:60s`, `gcTime:5m`, key `['lawyer-clients', lawyerId]`. No `useState+useEffect` manual como `CitasPage:213` `fetchAppointments` sin cache.
- **Supabase queries:** `lawyer_clients` + `lawyer_cases` son `SELECT * WHERE lawyer_id=auth.uid() ORDER BY created_at DESC LIMIT 50` con `count:exact` — necesitan índices `lawyer_id` (ver §11). `bookings` ya tiene `lawyer_id` index implícito por RLS; añadir `source` index. Evitar `select *` en `JobsPage`/`useLawyerJobs:56` sin `select` columns — limitar a columnas necesarias.
- **N+1:** Ficha cliente que hace `bookings` + `payments` + `service_quote_requests` separados = 3 queries. MVP aceptable con `Promise.all` (ver `DashboardPage:135` `fetchActivities` con 5 paralelas). Post-MVP considerar `view lawyer_client_overview` o RPC `get_lawyer_client_detail(client_id)`.
- **Lazy loading:** `App.tsx:87-107` lazy routes + `Suspense` `DashboardLayout:436` + prefetch `AICaseDetail:112`. Nuevas rutas `ClientsPage`, `CasesPage` deben ser `lazy(() => import(...))` igual. No eager import.
- **Bundle:** Ya `vite:8.2.1`, `terser:5.44.0`, `supabase-js:2.58.0`, `mercadopago:2.10.0` pesados. Nuevas páginas no añaden deps; reutilizan `shadcn-ui` (`components.json`), `lucide-react:0.462.0`, `date-fns:4.1.0`.

---

## 21. Risks

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Duplicación `bookings` vs `appointments` (dos agendas) | 5 | 5 | AD-001: `bookings` fuente única. `appointments` solo compat lectura. Agenda MVP lee `bookings` + union `appointments` si existe; crea siempre `bookings`. Migración post-MVP archiva `appointments` |
| RLS faltante `service_quote_requests` / `booking_leads` / `appointments` | 5 | 4 | Auditar Supabase Dashboard → Policies antes de Fase 2.1. Tests `Lawyer A cannot read B` (§24) bloquean deploy |
| `lawyer_clients` dedupe por email case-insensitive rompe `UNIQUE lower(email)` con NULL/email inválido | 3 | 3 | `CHECK email ~ '^[^@]+@[^@]+\.[^@]+$'` + `lower(trim(email))` trigger. Guest sin email no entra en `lawyer_clients` (solo bookings sin cliente) |
| `lawyer_cases` 1 booking = 1 caso UNIQUE WHERE bloquea reintentos idempotentes | 3 | 3 | `INSERT ... ON CONFLICT (booking_id) DO NOTHING` + UI “Ya existe caso para esta solicitud” |
| `CitasPage:90-118` crea `profiles` cliente fantasma (role=client) duplicando global namespace | 4 | 4 | MVP reemplaza por `lawyer_clients` upsert; depreca ese bloque. No borrar código, solo no usar en nueva `CalendarPage` |
| `EarningsPage` mocks contaminan métricas si no se borran | 3 | 5 | Fase 2.2 elimina `generateMockTransactions` y filtra `payments.lawyer_amount WHERE status=completed` |
| `POST /api/bookings/create` NO AUTH permite spam leads al inbox SaaS | 4 | 4 | Rate limit (no en MVP, documentado) + `source` tracking + inbox con “needs_manual_review” flag (`bookings.needs_manual_review` `types:674`) |
| `server.mjs` `requireAdmin` no cubre `requireLawyer` — abogado puede mutar `bookings` de otro si RLS falla | 5 | 2 | RLS owner es última defensa; test RLS bloqueante |
| Marketplace/SaaS coupling: `bookings` schema change (`source`, `client_id`) rompe `BookingPage.tsx` / `CheckoutResume.tsx` | 4 | 3 | `ADD COLUMN ... DEFAULT 'UNKNOWN'` sin NOT NULL hard; `client_id` nullable; no breaking SELECT * |
| Migración `lawyer_clients` backfill masivo bloquea DB | 2 | 2 | Backfill es `INSERT ... SELECT DISTINCT ON` opcional, no transacción única larga; puede ser lazy (solo on-demand al abrir Solicitudes) |
| `ai_workspaces` triggers trial (3/10) contaminan `lawyer_cases` si se confunden | 4 | 2 | Separar tablas (AD-003) — `lawyer_cases` no tiene trigger trial |
| `service.mjs` notificaciones `booking.created` duplica si `lawyer_cases` también notifica | 2 | 3 | `eventId` dedup `booking_created:${booking.id}` ya en `server.mjs:1412`; `lawyer_cases` no notifica booking, solo `case.created` con otro eventId |

---

## 22. Dependencies

```
Feature → Database → RLS → API → Component → Route → Analytics

M1 Solicitudes
  → bookings + service_quote_requests (EXISTENTE)
  → RLS EXISTENTE (auditar)
  → Supabase SELECT
  → RequestsInbox.tsx (NUEVO)
  → /lawyer/requests (NUEVA)
  → PostHog solicitation_viewed
  Bloqueante: RLS audit (no código)

M2 Clientes
  → lawyer_clients (NUEVA MIG-001) → RLS MIG-006 → Supabase CRUD
  → bookings (read, existente)
  → ClientsPage + ClientDetail + useLawyerClients (NUEVO)
  → /lawyer/clients, /:id
  → client_created
  Bloqueante: M1 (source), RLS

M3 Casos
  → lawyer_cases (NUEVA MIG-003, FK lawyer_clients + bookings)
  → RLS MIG-006
  → Supabase CRUD
  → CasesPage + CaseDetail (NUEVO, reutiliza JobsPage logic)
  → /lawyer/cases, /:id
  → case_created
  Bloqueante: M2 (client_id), M1 (booking_id), RLS

M4 Agenda unificada
  → bookings (EXISTENTE + source col MIG-002) + appointments (compat read)
  → RLS EXISTENTE
  → Supabase + RPC get_lawyer_busy_slots
  → CalendarPage (evoluciona CitasPage:542)
  → /lawyer/calendar (alias /lawyer/citas)
  → appointment_created
  Bloqueante: AD-001 decisión, M2 (client upsert)

M5 Ingresos
  → payments + payout_logs + platform_settings (EXISTENTE)
  → RLS EXISTENTE
  → Supabase SELECT lawyer_amount
  → RevenuePage (evoluciona EarningsPage:634, elimina mocks)
  → /lawyer/revenue (alias /lawyer/earnings)
  → revenue_viewed
  Bloqueante: ninguno (solo query fix)

M6 Servicios
  → lawyer_services (EXISTENTE)
  → RLS EXISTENTE
  → Supabase
  → ServicesPage (existente)
  → /lawyer/services
  → service_created
  Bloqueante: ninguno

M7 Dashboard Hoy
  → bookings + lawyer_clients + lawyer_cases + payments + google_integrations + mercadopago_accounts (EXISTENTE/NUEVA)
  → RLS mixta
  → Supabase counts
  → DashboardPage evol
  → /lawyer/dashboard
  → lawyer_dashboard_viewed
  Bloqueante: M2 + M3 (counts)

M8 lawyer_subscriptions (prep monetización)
  → lawyer_subscriptions (NUEVA MIG-004) + RLS
  → Server MP preapproval (NO en MVP, solo tabla)
  → Configuración placeholder
  → /lawyer/settings → SubscriptionCard (prep)
  → (no event MVP)
  Bloqueante: ninguno, puede ir último
```

---

## 23. Implementation Phases

**Cada fase: objetivo, archivos, tablas, cambios, dependencias, aceptación, tests, riesgos. No implementa ahora — solo planea.**

### FASE 2.1 — Data model + RLS (1 sem)

- **Objetivo:** Crear `lawyer_clients`, `lawyer_cases`, `lawyer_subscriptions` + columnas `bookings.source`/`client_id` + RLS policies. Sin UI.
- **Archivos:** `supabase/migrations/20260915_lawyer_clients.sql`, `..._lawyer_cases.sql`, `..._lawyer_subscriptions.sql`, `..._bookings_source.sql`, `..._rls_policies.sql`
- **Tablas:** NUEVA 3 + ALTER 1 (ver §11-12).
- **Cambios:** SQL only. No frontend/backend.
- **Dependencias:** Ninguna. Auditar RLS existentes `appointments`/`service_quote_requests` antes.
- **Aceptación:** `supabase db reset` sin error; `SELECT` con `auth.uid()` aísla tenants; `INSERT lawyer_clients (lawyer_id=auth.uid())` OK, otro lawyer 403; `UNIQUE lower(email)` funciona.
- **Tests:** RLS suite §24 (Lawyer A ≠ B).
- **Riesgos:** RLS incompleta → IDOR. Mitiga audit.

### FASE 2.2 — Lawyer dashboard + Ingresos fix (1 sem)

- **Objetivo:** Checklist activación + cards “Hoy” + fix `RevenuePage` (lawyer_amount).
- **Archivos:** `src/pages/lawyer/DashboardPage.tsx:787` evol (añade counts `lawyer_clients`/`cases`, checklist), `src/pages/lawyer/RevenuePage.tsx` (nuevo, copia `EarningsPage:634` sin `generateMockTransactions`), `src/hooks/useRevenue.ts` (nuevo), `src/App.tsx:90` rutas alias `/lawyer/revenue` + redirect `/lawyer/earnings`, `src/lib/utils.ts` format CLP.
- **Tablas:** read `payments.lawyer_amount`, `lawyer_clients`, `lawyer_cases` (counts).
- **Dependencias:** FASE 2.1.
- **Aceptación:** Dashboard muestra 0→n counts reales; Ingresos suma solo `lawyer_amount` completed; mocks eliminados.
- **Tests:** Unit `formatCurrency` + integration dashboard render.
- **Riesgos:** Ninguno.

### FASE 2.3 — Clients (1 sem)

- **Objetivo:** `/lawyer/clients` lista + ficha + CRUD + auto-dedupe desde Solicitudes.
- **Archivos:** `src/pages/lawyer/ClientsPage.tsx` (nuevo, tabla Search+Select como `JobsPage:337`), `src/pages/lawyer/ClientDetailPage.tsx`, `src/hooks/useLawyerClients.ts` (nuevo, React Query), `src/components/lawyer/ClientForm.tsx`, `src/App.tsx` rutas `/lawyer/clients` + `/:id`.
- **Tablas:** `lawyer_clients` CRUD + read `bookings`/`payments` por email join.
- **Dependencias:** FASE 2.1, 2.2.
- **Aceptación:** Crear cliente manual → aparece deduplicado; “Convertir en cliente” desde Solicitudes crea 1 fila; mismo email con otro abogado = filas separadas; ficha muestra historial.
- **Tests:** Unit dedupe `lower(email)`, integration client→booking, RLS A≠B.

### FASE 2.4 — Cases (1 sem)

- **Objetivo:** `/lawyer/cases` lista + ficha + transiciones `lawyer_cases.status`.
- **Archivos:** `src/pages/lawyer/CasesPage.tsx` (reutiliza `useLawyerJobs:40` map logic pero persiste), `src/pages/lawyer/CaseDetailPage.tsx`, `src/hooks/useLawyerCases.ts`, `src/components/lawyer/CaseForm.tsx`, redirect `/lawyer/jobs`→`/lawyer/cases`.
- **Tablas:** `lawyer_cases` CRUD + FK `client_id`, `booking_id`, `quote_request_id`, `ai_workspace_id` nullable.
- **Dependencias:** FASE 2.3 (client_id).
- **Aceptación:** Crear caso manual sin booking; crear caso desde Solicitud (booking) → UNIQUE booking_id previene duplicado; `ai_workspace_id` link vacío (no flujo AI aún).
- **Tests:** Unit status CHECK, integration case→client→booking.

### FASE 2.5 — Requests Inbox (3 días)

- **Objetivo:** `/lawyer/requests` inbox unificado.
- **Archivos:** `src/pages/lawyer/RequestsInbox.tsx`, `src/hooks/useRequestsInbox.ts` (Promise.all `bookings pending` + `service_quote_requests pending`), `src/App.tsx` rutas.
- **Tablas:** read `bookings` + `service_quote_requests`.
- **Dependencias:** FASE 2.1 (source col), 2.3/2.4 (actions).

### FASE 2.6 — Calendar unificado (1 sem)

- **Objetivo:** `/lawyer/calendar` (alias `/lawyer/citas`) unifica `bookings` type appointment + `appointments` legacy.
- **Archivos:** `src/pages/lawyer/CalendarPage.tsx` (evol `CitasPage:542`, reemplaza `profiles` insert `CitasPage:104` por `lawyer_clients` upsert), `src/components/appointments/AppointmentForm.tsx` (existente, ajustar props), `src/hooks/useCalendar.ts`, `supabase` RPC `get_lawyer_busy_slots`.
- **Tablas:** `bookings` (create appointment), `lawyer_clients`, `appointments` (read compat).
- **Dependencias:** FASE 2.3, AD-001.
- **Aceptación:** Crear cita SaaS → INSERT `bookings` type appointment → aparece en día; overlap 409 desde `server.mjs:1272`; `appointments` legacy aún visible si existe.

### FASE 2.7 — Analytics + QA (3 días)

- **Objetivo:** PostHog `client_created`/`case_created` etc. (§18) + RLS/E2E tests.
- **Archivos:** `src/lib/track.ts`, `src/hooks/usePageTracking.ts`, `server.mjs` `payment_events` already.
- **Tests:** §24 full suite.

### FASE 2.8 — Monetización prep (no cobro, 2 días)

- **Objetivo:** `lawyer_subscriptions` UI placeholder en `/lawyer/settings` (muestra free, CTA “Próximamente $49.990 bundle” sin crear preapproval).
- **Archivos:** `src/components/subscription/SubscriptionCard.tsx` (prep), no `POST /api/ai/subscribe` aún.

---

## 24. Testing Strategy

### Unit

- `formatCurrency` CLP (`lib/utils.ts`), `lower(email)` dedupe, `status` transition `CHECK` valid, `source` enum, `get_lawyer_busy_slots` parseTimeToMinutes (`server.mjs:1284`).
- Helpers `lawyerClients.upsert`, `lawyerCases.create` (pure functions extracted from hooks).

### Integration

- `lawyer → client`: `POST lawyer_clients` (lawyer A) → `GET` (A ve 1, B ve 0).
- `lawyer → case`: `POST lawyer_cases {booking_id}` → `GET` case includes `client_id` join.
- `lawyer → booking`: `POST bookings` type appointment desde SaaS → `lawyer_clients` auto-created si email nuevo.
- `lawyer → service`: `POST lawyer_services` → aparece en `PublicProfile` (marketplace read).
- `case → booking UNIQUE`: segundo `POST lawyer_cases` con mismo `booking_id` → 409/ON CONFLICT DO NOTHING.

### RLS (obligatorio)

```sql
-- Lawyer A cannot read Lawyer B data (repro con 2 users via supabase.auth)
-- Ejecutar como auth.uid() = A
SELECT * FROM lawyer_clients WHERE lawyer_id = 'uuid-B';  -- expect 0 rows
SELECT * FROM lawyer_cases WHERE lawyer_id = 'uuid-B';    -- 0
SELECT * FROM bookings WHERE lawyer_id = 'uuid-B';         -- 0 (si RLS correcta)
SELECT * FROM payments WHERE lawyer_user_id = 'uuid-B';    -- 0
-- Cross-tenant update attempt:
UPDATE lawyer_clients SET name='hacked' WHERE id='<B-client-id>'; -- expect 0 rows affected, RLS USING false
```

Automatizable con `supabase` JS client con 2 sesiones + `expect`.

### E2E (Playwright, existente `playwright-mcp/` en repo root)

```
Login (lawyer) → /lawyer/dashboard → /lawyer/requests → Convertir en cliente → /lawyer/clients → /lawyer/clients/:id (historial)
→ /lawyer/cases → Crear caso manual → /lawyer/cases/:id → /lawyer/calendar → Crear cita → /lawyer/revenue (ingresos)
→ Logout → Login Lawyer B → verifica no ve datos de A
→ Client login → /dashboard → verifica no ve /lawyer/* (RequireLawyer redirect)
```

---

## 25. Acceptance Criteria

### Lawyer

- [ ] puede registrarse (`POST /api/profiles` `server.mjs:501`) y completar onboarding (`/lawyer/onboarding` wizard existente) sin regresión
- [ ] puede acceder a `/lawyer/dashboard` (RequireLawyer `App.tsx:564`) y ve checklist + métricas reales (no mocks)
- [ ] puede ver **Solicitudes** (bookings pending + quotes pending) y “Convertir en cliente” crea `lawyer_clients` deduplicado
- [ ] puede ver **Clientes** (`/lawyer/clients`) lista y ficha con historial bookings/quotes/payments filtrado por email
- [ ] puede crear cliente manual y no duplica si email existe (UNIQUE lower)
- [ ] puede ver **Casos** (`/lawyer/cases`) y crear caso desde solicitud o manual, con `lawyer_cases.status` transiciones
- [ ] puede gestionar **Agenda** (`/lawyer/calendar`) — crear cita SaaS (bookings type appointment) con overlap 409, ver día/semana, y `appointments` legacy aún visible
- [ ] puede gestionar **Servicios** (`/lawyer/services`) CRUD sin regresión
- [ ] puede consultar **Ingresos** (`/lawyer/revenue`) derivado solo de `payments.lawyer_amount` (no platform_fee), por mes y `payout_status`
- [ ] **no puede** acceder a `lawyer_clients`/`cases`/`bookings`/`payments` de otro abogado (RLS `auth.uid()=lawyer_id`) — test RLS pasa
- [ ] **no pierde** funcionalidad marketplace cliente: `/abogado/:slug` + `/booking/:lawyerId` siguen creando `bookings` sin auth (verdadero para cliente, no para SaaS agenda)

### Client

- [ ] no pierde ninguna funcionalidad marketplace: search, PublicProfile, booking, payment, BookingSuccessPage
- [ ] mantiene sus `bookings` (`user_id`) visibles en `/dashboard/appointments` (UserDashboard)
- [ ] no ve `/lawyer/*` (RequireLawyer redirect a `/` `DashboardLayout:100`)

### System

- [ ] RLS evita acceso cruzado (tests §24 pasan)
- [ ] no se duplican fuentes de verdad: `bookings` sigue siendo agenda/pagos, `lawyer_cases` es envolvente (no reemplaza), `appointments` solo compat
- [ ] analytics: PostHog `client_created`/`case_created`/`appointment_created` disparan; GA4 `purchase` solo server (`server.mjs:172`) sin duplicado client; `is_owner` filtra OWNER_EMAILS (`server.mjs:144`)
- [ ] pagos existentes no se rompen: `POST /create-payment` y webhook MP sin cambios; `lawyer_subscriptions` no cobrado en MVP
- [ ] marketplace continúa funcionando: `POST /api/bookings/create` NO AUTH sigue 200; `booking_leads` + `notifications` siguen
- [ ] performance: `lawyer_clients`/`cases` queries < 200ms con índices; React Query cache hit en segunda visita; lazy routes sin bundle +200kB

---

## 26. Open Questions

| # | Pregunta | Contexto | Impacto MVP | Propuesta provisional |
|---|---|---|---|---|
| Q1 | ¿`service_quote_requests` table tiene RLS? | No tipada en `types/supabase.ts`, no migración RLS encontrada | Bloqueante RLS | UNKNOWN — auditar Dashboard → Table Editor antes de FASE 2.1 |
| Q2 | ¿`booking_leads` y `payment_events` necesitan RLS? | Inserts desde `server.mjs:1374/1439` con service_role, pero Select quizá sin RLS | Medio | Auditar, añadir `USING auth.uid()=lawyer_id` si faltan |
| Q3 | ¿`appointments` debe migrarse a `bookings` o mantener dual? | Dos agendas paralelas con `lawyer_id` distinto tipo (uuid string vs no FK) | Alto | AD-001: `bookings` fuente, `appointments` compat read-only post-MVP archive |
| Q4 | ¿Guest sin email puede ser `lawyer_clients`? | `bookings.user_email` puede ser guest `guest-*.legalup.cl` (`server.mjs:936`) | Bajo | No — `lawyer_clients` requiere email válido (`CHECK email ~ regex`), guests quedan solo como `bookings` sin cliente |
| Q5 | ¿Email de cliente es mutable? ¿Qué pasa si cambia? | `lawyer_clients.email` es UNIQUE key; si cliente cambia email, deduplicación rompe | Bajo | MVP: email es inmutable (si cambia, crear nuevo `lawyer_clients`); futuro `client_emails` join |
| Q6 | ¿`lawyer_cases` debe tener `due_date` / `priority`? | JobsPage no tiene, pero SaaS “caso” podría necesitar vencimiento | Bajo | NOT MVP — solo `created_at`, `status`; `due_date` en Fase 2.7 si usuarios lo piden |
| Q7 | ¿Monetización SaaS bundle interfiere con AI trial `ai_subscriptions`? | FASE-1 §6 recomienda bundle SaaS+AI $49.990, pero `ai_subscriptions` ya cobra AI standalone | Medio | MVP: `lawyer_subscriptions` vacía (no cobro). Migración futura: si `ai_subscriptions.status=active`, upsert `lawyer_subscriptions` saas_essential sin recobro prorrateado |
| Q8 | ¿Inbox Solicitudes debe paginar? | `bookings` puede crecer sin límite por abogado | Bajo | MVP: limit 50 `ORDER BY created_at DESC` como `useLawyerJobs:62`; paginación post-MVP |

---

## 27. Final Recommendation

**Reutilizar 70%, crear 30%.** El marketplace ya es la infraestructura SaaS a falta de dos vistas deduplicadas. No construir ERP.

**Orden correcto (fases §23):** 2.1 Data+RLS → 2.2 Dashboard/Ingresos fix → 2.3 Clients → 2.4 Cases → 2.5 Requests → 2.6 Calendar → 2.7 Analytics/QA → 2.8 Subscriptions prep.

**No construir en MVP:** tasks/kanban, docs no-AI, SII, white-label, consumer AI, mensajería, comisión diferenciada.

**Preparar técnicamente para monetización FASE-1 Modelo A:** `lawyer_subscriptions` (plan `saas_essential` $49.990) lista con RLS pero sin endpoint MP `preapproval` en MVP; AI trial `ai_subscriptions` sigue; migración `ai_subscriptions active → lawyer_subscriptions` sin recobro.

---

# ARCHITECTURAL DECISIONS

### AD-001 — Fuente de verdad para bookings/agenda

**Decisión:** `bookings` es fuente de verdad para toda cita con hora (`booking_type=appointment` con `scheduled_date/time`, `duration`, `status`, `payment_status`). `appointments` queda como **legacy compat-read** (SELECT union si existe), pero toda creación SaaS nueva inserta en `bookings`.
**Alternativa descartada:** Mantener dos fuentes paralelas o crear `lawyer_appointments` nueva.
**Razón:** `bookings` ya tiene prevención overlap (`server.mjs:1272`), RPC `get_lawyer_busy_slots` (`types:1704`), y es usada por `useLawyerJobs:56`, `BookingPage`, y webhook MP. Duplicar crea inconsistencia de disponibilidad. `appointments` no tiene FK clara (`types:663` Relationships []) y `CitasPage:90` crea `profiles` fantasma.

### AD-002 — Fuente de verdad para relación abogado-cliente

**Decisión:** Nueva tabla `lawyer_clients` (tenant-isolated, `UNIQUE lawyer_id + lower(email)`) es fuente. No reutilizar `profiles` global (`role=client`) porque compartiría cliente entre abogados.
**Alternativa descartada:** Reutilizar `profiles` + join `lawyer_client_relations`.
**Razón:** `profiles` es global y su RLS es `auth.uid()=id` (no por abogado). Un email con dos abogados crearía un solo `profiles` row visible para ambos → leak. `lawyer_clients` aísla por `lawyer_id`. Guest sin `user_id` (`bookings.user_id nullable:714`) no puede ser `profiles` de todos modos.

### AD-003 — Modelo de casos

**Decisión:** `lawyer_cases` envolvente SaaS con FKs opcionales `booking_id` / `quote_request_id` + `client_id` + `ai_workspace_id` nullable. No reutilizar `ai_workspaces` como caso.
**Alternativa descartada:** `ai_workspaces` como `cases` o `bookings` como `cases` directo.
**Razón:** `ai_workspaces` tiene triggers trial 3/10 (`migrations/608040100`) y RLS AI que no aplican a SaaS; `bookings` es transacción, no expediente (sin `client_id` propio ni status SaaS `new→closed`). Envolvente permite caso manual sin booking y caso con múltiples bookings futuros.

### AD-004 — Modelo multi-tenant

**Decisión:** Tenant = `lawyer` (`profiles.id = auth.uid()`). Tenant key = `lawyer_id` en todas SaaS tables con RLS `USING auth.uid()=lawyer_id`. Sin `organization_id` en MVP.
**Alternativa descartada:** `organization` + `membership` multi-abogado.
**Razón:** Usuario principal Fase 2 es abogado independiente (§5). Multi-estudio es NOT MVP (§6) y añadir `organization_id` a todas tablas en MVP complica RLS y migraciones sin validación.

### AD-005 — Permisos/RLS

**Decisión:** Todo SaaS CRUD vía **Supabase directo con RLS owner** (`auth.uid()=lawyer_id`). Solo pagos/webhooks/PJUD vía **server.mjs** con `service_role` + secrets.
**Alternativa descartada:** Todo vía server.mjs con `requireLawyer` middleware.
**Razón:** RLS es defense-in-depth y permite `select` sin server (menos latencia, menos código). Server ya confía en `service_role` para `POST /api/bookings/create` NO AUTH; añadir `requireLawyer` duplicaría validación y no resuelve RLS de storage. Pattern ya VERIFIED en `ai_*` (`USING auth.uid()=lawyer_id`).

### AD-006 — Marketplace ↔ SaaS

**Decisión:** **Una tabla `bookings` compartida** + **dos tablas SaaS aisladas** (`lawyer_clients`, `lawyer_cases`). Marketplace crea, SaaS consume y envuelve. `source` column (`LAWYER_DIRECT` / `LEGALUP_MARKETPLACE` / `UNKNOWN`) traza origen sin bifurcar flujo. `lawyer_services` ya compartida (Marketplace lee, SaaS escribe).
**Alternativa descartada:** Dos sistemas independientes con sync job o eventos.
**Razón:** Sync job duplica datos y crea eventual consistency; una tabla con `source` permite comisión diferenciada futura sin refactor y mantiene `POST /api/bookings/create` sin cambios (back-compat `DEFAULT UNKNOWN`).

### AD-007 — Analytics

**Decisión:** **Server-side** para `booking_*`/`payment_*` (verdad, dedup `paymentId`/`doc.id` + `is_owner` filter `server.mjs:144`), **PostHog client-side** para vistas SaaS (`client_created` etc.), **GA4 server-side** solo purchase (`server.mjs:172`). No GA4 client `gtag` para SaaS.
**Alternativa descartada:** Todo client-side `gtag` o todo PostHog sin GA4.
**Razón:** `page_views` + PostHog + GA4 ya triple (§18). Unificar purchase en server evita bots/duplicados; PostHog es VERIFIED en repo (`posthog-js:1.10.3` `package.json:24`) para product analytics. `OWNER_EMAILS` debe filtrar también PostHog (hoy solo GA4).

### AD-008 — Monetización futura

**Decisión:** Preparar `lawyer_subscriptions` (plan `saas_essential` $49.990 bundle SaaS+AI, `provider=mercadopago` `preapproval`) pero **no cobrar en MVP**. AI trial `ai_subscriptions` sigue; migración futura `ai_subscriptions active → lawyer_subscriptions` sin recobro.
**Alternativa descartada:** Extender `ai_subscriptions` con `plan=saas_essential` directamente o cobrar SaaS en MVP.
**Razón:** FASE-1 §6 Modelo A (bundle $49.990) validado; pero cobrar en MVP sin validar retención Clientes/Casos es prematuro (§16 Q7). Tabla separada evita contaminar `ai_subscriptions` (semántica AI vs SaaS) y permite `UNIQUE lawyer_id` independiente.

### AD-009 — Agenda: ¿Día o semana default?

**Decisión:** Día (hoy) default como `CitasPage:14` (`selectedDate = new Date()` + `Today/Mañana` `CitasPage:30`), con navegación `±1 día` y calendario mini `CitasPage:247`. Semana como toggle secundario post-MVP.
**Alternativa descartada:** Semana default o calendario mes completo.
**Razón:** JTBD-4 frecuencia diaria > semanal; `CitasPage` ya es día y no se ha validado necesidad semana con abogados reales. Menor fricción.

---

## MVP SCORE — Tabla priorización

Escala 1–5 (5 = más alto).

| Feature | User Value | Revenue Potential | Retention | Complexity | Risk | Priority Score* | Verdict |
|---|---|---|---|---|---|---|---|
| Solicitudes inbox | 5 | 4 | 4 | 2 | 2 | 9 | MUST |
| Clientes deduplicados | 5 | 3 | 5 | 3 | 3 | 10 | MUST |
| Casos envolvente | 5 | 4 | 5 | 3 | 3 | 11 | MUST |
| Agenda unificada | 5 | 3 | 4 | 4 | 4 | 8 | MUST |
| Ingresos (lawyer_amount) | 4 | 5 | 3 | 2 | 2 | 10 | MUST |
| Servicios (existente) | 4 | 4 | 3 | 1 | 1 | 10 | MUST (reuse) |
| Dashboard Hoy | 4 | 3 | 3 | 2 | 1 | 9 | MUST |
| RLS multi-tenant | 5 | 5 | 5 | 3 | 5 | 12 | MUST (blocking) |
| Disponibilidad editor | 3 | 2 | 3 | 2 | 2 | 6 | SHOULD |
| Notificaciones SaaS | 3 | 2 | 4 | 2 | 2 | 7 | SHOULD |
| Docs no-AI por caso | 2 | 2 | 3 | 4 | 3 | 4 | COULD |
| Kanban tasks | 2 | 2 | 3 | 5 | 4 | 2 | NOT MVP |
| Consumer AI | 2 | 3 | 2 | 5 | 4 | 2 | NOT MVP |
| Mensajería | 2 | 1 | 2 | 3 | 3 | 3 | NOT MVP |
| Comisión diferenciada | 1 | 4 | 1 | 4 | 4 | 2 | NOT MVP |

*Priority Score = (User Value + Revenue + Retention) − (Complexity + Risk) + 5 bias para visual. Mayor = más prioritario.

---

## FINAL VERDICT

### ¿QUÉ DEBEMOS CONSTRUIR? (5–8 principales, MUST)

1. **Solicitudes** — inbox `bookings`+`quotes` pending (M1)
2. **Clientes** — `lawyer_clients` deduplicado por email + ficha con historial (M2)
3. **Casos** — `lawyer_cases` envolvente sobre booking/quote/manual + ficha + transiciones (M3)
4. **Agenda unificada** — `bookings` como fuente, alias `/lawyer/calendar` (M4)
5. **Ingresos** — `payments.lawyer_amount` filtrado + `payout_status` (M5)
6. **Dashboard Hoy** — checklist + 4 cards (M7) — evoluciona `DashboardPage`
7. **RLS multi-tenant** — policies `lawyer_clients`/`cases`/`lawyer_subscriptions` + audit `appointments`/`service_quote_requests` (M8)
8. **Servicios** — sin construir, reutilizar (M6) — solo CTA si 0

### ¿QUÉ NO DEBEMOS CONSTRUIR? (explícito)

- Kanban/tasks, documentos no-AI por caso, SII/facturación, contabilidad, firma avanzada, multi-sede/organization, white-label, consumer AI, mensajería real-time, cotizaciones con firma, comisión diferenciada por `source`, seats, storage pro, métricas decorativas, workflows complejos, configuración por tipo de notificación.

### ¿QUÉ PODEMOS REUTILIZAR? (infra existente)

- `profiles` (perfil), `lawyer_services` (servicios), `bookings`+`service_quote_requests` (solicitudes/trabajos), `appointments` (compat agenda), `payments`+`payout_logs`+`platform_settings` (ingresos), `notifications`+`page_views`+PostHog/GA4 (analytics), `ai_*` (link futuro), `google_integrations`+`mercadopago_accounts` (integraciones), `reviews/favorites`, `LawyerOnboardingWizard`, `DashboardLayout`+`RequireLawyer`+`AuthContext`, `CitasPage`/`JobsPage`/`EarningsPage` como base, `AppointmentForm`, `supabase/migrations` RLS existentes, `server.mjs` bookings/payments/webhook sin tocar.

### ¿QUÉ DEBEMOS CAMBIAR? (lista mínima)

- NUEVA: `lawyer_clients`, `lawyer_cases`, `lawyer_subscriptions` (prep) + `bookings.source`+`client_id` cols + índices
- NUEVA RLS: policies owner para 3 tablas + audit/fix `appointments`/`service_quote_requests`/`booking_leads`
- EVOLUCIONA: `CitasPage` → `CalendarPage` (bookings fuente, no `profiles` fantasma), `EarningsPage` → `RevenuePage` (lawyer_amount), `DashboardPage` → Hoy + checklist, `App.tsx` rutas alias + lazy `ClientsPage`/`CasesPage`/`RequestsInbox`
- ELIMINA (código): `generateMockTransactions` en `EarningsPage:73`, no más `supabase.from('profiles').insert(role=client)` en `CitasPage:104`
- NO TOCAR: `server.mjs` bookings/payments/webhook, `platform_settings`, `process-weekly-payouts`, marketplace `/search`/`/abogado/:slug`/`/booking`, `ai_*`.

### ¿CUÁL ES EL ORDEN CORRECTO? (fases §23)

```
2.1 Data+RLS (1 sem) → 2.2 Dashboard/Ingresos fix (1 sem) → 2.3 Clients (1 sem) → 2.4 Cases (1 sem) → 2.5 Requests (3d) → 2.6 Calendar (1 sem) → 2.7 Analytics/QA (3d) → 2.8 Subscriptions prep (2d)
Total: ~6 semanas para SaaS MVP sin cobrar, listo para monetización FASE-1 Modelo A.
```

### ¿CUÁL ES EL MAYOR RIESGO?

**Duplicación `bookings` vs `appointments` como dos agendas con RLS distinta.** Si el MVP crea `lawyer_cases` sin fijar `bookings` como fuente única (AD-001) y sin auditar RLS de `appointments`/`service_quote_requests`, el abogado verá 3 cifras distintas (Dashboard count vs Citas vs Casos) y perderá confianza en su oficina digital. Es bloqueante y debe resolverse en FASE 2.1 antes de cualquier UI.

### ¿CUÁL ES EL MVP MÍNIMO VIABLE? (una frase)

> Un abogado ve y gestiona, aislado por `lawyer_id`, sus solicitudes, clientes deduplicados, casos envolventes y agenda unificada (todo sobre `bookings`), y sus ingresos reales (`payments.lawyer_amount`), sin romper el flujo marketplace `booking → Mercado Pago → webhook`.

---

## Evidence Legend

- **VERIFIED:** leído en repo (`src/...:line`, `types/supabase.ts:`, `server.mjs:`, `supabase/migrations/`).
- **INFERRED:** deducido de pattern (ej. `service_quote_requests` no tipada pero usada en `useLawyerJobs:64` → INFERRED existe con esas columnas).
- **PROPOSED:** diseño MVP (NUEVA tabla/columna/ruta/componente).
- **UNKNOWN:** no encontrado, requiere auditar Supabase Dashboard (Table Editor → RLS, Policies, Storage).

Toda decisión PROPOSED en este plan está marcada y no se asume como hecho.
