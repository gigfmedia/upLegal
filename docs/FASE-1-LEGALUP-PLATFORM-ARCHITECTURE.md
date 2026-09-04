# FASE 1 — LEGALUP PLATFORM ARCHITECTURE

> **Marketplace + Lawyer SaaS + LegalUpAI**
> Modo: PLAN / AUDITORÍA — NO CODE CHANGES
> Fecha: 2026-09-04
> Autor: Auditoría de código (lectura directa de `src/`, `supabase/migrations/`, `server.mjs`, `server/ai/`)

**Principio de priorización que rige todas las recomendaciones:**
> ¿Esto aumenta la probabilidad de que un abogado pague y permanezca pagando $49.990/mes?
> ¿Esto aumenta la capacidad de LegalUp de generar ingresos recurrentes sin necesitar conseguir un cliente nuevo cada día?

Prioridad: 1) MRR 2) activación 3) retención 4) pagos 5) clientes/casos 6) LegalUpAI 7) marketplace 8) secundarias.

**Precio protegido:** LegalUpAI = **$49.990 CLP** (`src/lib/aiFeatures.ts:31`, `server.mjs:443`). No se modifica en esta fase. Todas las arquitecturas lo preservan como referencia.

---

## 1. Executive Summary — Qué cambia y por qué

**Cambio económico:** LegalUp deja de ser solo un canal de adquisición (marketplace con comisión por reserva) y pasa a ser **oficina legal digital del abogado** con suscripción recurrente.

**Tesis:**
> Un abogado debe pagar por LegalUp porque LegalUp es su oficina (clientes, casos, citas, pagos, documentos, IA), aunque un mes no le llegue ningún lead del marketplace. El marketplace se convierte en ventaja adicional, no en único valor.

**Estrategia de producto (3 capas conectadas):**

| Capa | Quién paga | Qué paga | Valor |
|---|---|---|---|
| **Marketplace** | Cliente → abogado vía LegalUp | Comisión (ya existente: 10% surcharge cliente + 20% fee plataforma) | Adquisición |
| **Lawyer SaaS** | Abogado → LegalUp | Suscripción recurrente | Herramienta diaria (casos, clientes, citas, pagos, perfil compartible) |
| **LegalUpAI** | Abogado o usuario final → LegalUp | $49.990 (standalone o integrado) | Inteligencia sobre documentos/casos |

**Hipótesis a validar antes de construir:** ¿El abogado con web ya resuelta (perfil público compartible + pagos + gestión) + IA que le ahorra 3-5h/semana paga $49.990 aunque no lleguen leads ese mes? El flywheel es: perfil público → comparte URL → trae clientes propios → más actividad → necesita pagos/IA → retención → Marketplace como bonus → recomienda a colegas.

**Qué NO hacer ahora:** construir clientes/casos desde cero sin migrar `bookings`/`bookings→consultations`/`appointments`, duplicar pagos, o bajar precio para "resolver" la conversión.

**Recomendación de monetización (adelanto): Modelo A modificado — ver §6:** Lawyer SaaS = $49.990 con LegalUpAI incluido (bundle). Mantener venta standalone de LegalUpAI a $49.990 para no abogados. Es el único modelo que maximiza ARPU sin duplicar precio y sin canibalizar.

**Camino más corto a $500.000 MRR:** 10 abogados × $49.990. Se logra vendiendo el bundle a abogados que YA usan LegalUp (retención de valor existente) + activación de "perfil compartible + pagos" (valor que el abogado percibe el día 1, antes de tener IA avanzada).

---

## 2. Current State — Inventario real basado en código

### 2.1 Rutas y navegación (evidencia: `src/App.tsx:34-625`, `src/components/dashboard/DashboardLayout.tsx:144-203`)

**Público / Marketplace:**
- `/` (Index), `/search`, `/abogado/:slug` (PublicProfile — `src/pages/PublicProfile.tsx`), `/booking/:lawyerId` + `/checkout/:bookingId`, `/payment/success|failure|pending|canceled`
- SEO landings: `/abogados-laborales|divorcio|arriendo|penales`, `/cae`, `/abogado-divorcio-unilateral`, `/abogado-pension-alimentos`, etc. (`src/pages/*Landing.tsx`)
- LegalUpAI landing: `/ai` (`src/pages/LegalUpAI.tsx` — standalone CSS, pricing trial 5 días)

**Dashboard abogado (protegido `RequireLawyer` → `DashboardLayout`):**
- `/lawyer/dashboard` (DashboardPage — contadores + actividad reciente + banner LegalUpAI)
- `/lawyer/profile` (ProfilePage — 64k LOC, edición completa de perfil)
- `/lawyer/services` (ServicesPage — CRUD `lawyer_services`)
- `/lawyer/citas` (CitasPage), `/lawyer/consultas` (ConsultasPage) — separadas
- `/lawyer/jobs` (JobsPage — une `bookings` + `service_quote_requests` via `useLawyerJobs.ts`)
- `/lawyer/earnings` (EarningsPage — lee `payments` + `appointments`, con cards + monthly breakdown)
- `/lawyer/ai` (LegalUpAIWorkspace) + `/lawyer/ai/cases/:caseId` (AICaseDetail con 5 tabs)
- `/lawyer/favorites`, `/lawyer/notificaciones`, `/lawyer/quotes/:quoteRequestId`
- `/dashboard/payment-settings` (commonItem, no funcional completo — ver §2.5)

**Dashboard cliente (`/dashboard/*`):** Resumen, Citas, Notificaciones, Servicios, Favoritos, Pagos, Perfil, Mensajes, payment-settings.

**Admin (`/admin/*`):** dashboard, analytics, empresas, solicitudes, lawyer-profiles, reviews, notifications.

### 2.2 Estado por funcionalidad (tabla exigida en §18)

| Funcionalidad | Estado | Evidencia (archivo:línea) | Falta | Riesgo |
|---|---|---|---|---|
| **Perfil abogado** | ✅ Existe, completo | `ProfilePage.tsx:64k`, `hooks/useProfile.ts`, `profiles` table | Export como landing compartible sin refactor mayor | Bajo |
| **Servicios** | ✅ CRUD funcional | `ServicesPage.tsx`, `lawyer_services` table, `hooks/useLawyerJobs` | Diferenciar cotizables vs pago directo ya existe (`requires_quote`) | Bajo |
| **Citas** | ✅ Existe (legacy) | `CitasPage.tsx`, `DashboardAppointments.tsx`, `appointments` table (con `appointment_date/time`, `duration`, `meet_link`, `google_integrations`) | Unificar con `bookings` (doble fuente), calendario real | Medio — doble modelo citas |
| **Trabajos / Jobs** | ⚠️ Parcial (vista) | `JobsPage.tsx:272`, `hooks/useLawyerJobs.ts:40` mapea `bookings(type=service)` + `service_quote_requests` a `LawyerJob` | No es "casos" reales: es inbox de servicios contratados/presupuestos. Falta modelo Caso con estados, tareas, documentos, pagos ligados | Alto si se confunde con Casos AI |
| **Clientes** | ❌ No existe como entidad | No hay `clients` table; solo `profiles` con `role=client` + `bookings.user_id/email` | Sección Clientes + `attorney_clients` join (ver §10) | Crítico — bloquea SaaS "oficina" |
| **Pagos** | ✅ Marketplace funcional, ❌ Payouts incompletos | `server.mjs:902-1165` crea `payments` + preferencia MP (`resolveWebhookUrl`), `payments` tiene `platform_fee`, `lawyer_amount`, `client_surcharge`, `payout_status/date/reference/error` + `payout_logs` + `platform_settings` | `mercadopago_accounts` (OAuth) sin UI conecta; `EarningsPage` no muestra `payout_status`; no hay liquidación automática visible | Medio |
| **Ingresos** | ⚠️ Mock + real mezclado | `EarningsPage.tsx:73-634` lee `payments` pero `generateMockTransactions` aún en código; queries con `lawyer_id` incorrecto en algunos paths | Separar `lawyer_revenue` vs `platform_revenue` correctamente; eliminar mocks | Bajo |
| **LegalUpAI** | ✅ Existe (lawyer-only, con trial) | `/ai` landing + `/lawyer/ai` workspace + `ai_workspaces`, `ai_documents` (bucket `ai-documents`, límite 20MB), `ai_document_analyses`, `ai_conversations/messages`, `ai_research_requests`, `ai_subscriptions`, `ai_usage/usage_monthly` — ver §2.3 | Consumer-AI (usuario final no-abogado) NO existe; drafting `coming_soon`; isolation solo lawyer | Medio |
| **Suscripción SaaS abogado** | ❌ No existe | Solo `ai_subscriptions` (plan `essential` = $49.990). No hay `lawyer_subscriptions` / `saas_plans` | Nuevo sistema de planes SaaS separado de AI o bundle (ver §6, §11) | Crítico |
| **Favoritos** | ✅ Existe | `favorites` table, `hooks/useFavorites.ts`, `DashboardFavorites.tsx` | No crítico SaaS; mantener | Bajo |
| **Notificaciones** | ✅ Existe | `notifications` table + `server/notifications/service.mjs`, `NotificationsPage.tsx` | Falta notifs de SaaS (pago fallido, caso, recordatorio cita) | Bajo |
| **Config. de Pagos** | ⚠️ Placeholder | `PaymentSettings.tsx`, `DashboardPayments.tsx`, `mercadopago_accounts` sin flujo completo | OAuth MP + payout real | Alto para MRR si no se cobra comisión auto |
| **Analytics** | ⚠️ Parcial | `page_views`, PostHog (`posthog-js`), GA4 (`sendGA4PurchaseEvent`, `metaCapi.mjs`) | Funnel SaaS + AI tracking | Bajo |

### 2.3 LegalUpAI — lo que YA tiene (no asumir lo que no existe)

**Modelos y precio:**
- `AI_SUBSCRIPTION_PLAN = 'essential'` (`lib/aiFeatures.ts:29`), `PRICE = 49900` (`:30`), `TRIAL_DAYS = 5` (`:31`, `server.mjs:444`), `AI_DEFAULT_MODEL = gpt-4o-mini` (`server.mjs:438`), `MAX_EXTRACTED_TEXT_CHARS = 80000`, `AI_TRIAL_MAX: 3 casos / 10 docs` (`trialIdentity.mjs`, `migration 608040100` trigger).
- Features: `document_analysis`, `case_chat`, `jurisprudence`, `document_drafting(coming_soon)`, `case_analysis` (`aiFeatures.ts:9-14`). Todas requieren `plan=essential` + `hasAccess` (`useAISubscription.ts:114,134`).

**Tablas AI (tipadas en `types/supabase.ts:17-581`):**
- `ai_workspaces` (id, lawyer_id→profiles.id, name, description, practice_area, timestamps) — es el "caso AI" actual.
- `ai_documents` (workspace_id→ai_workspaces, lawyer_id, file_path (bucket `ai-documents`), mime_type, file_size_bytes≤20MB, status, extracted_text, analysis_status, analysis_error, model, page_count).
- `ai_document_analyses` (document_id 1:1, workspace_id, lawyer_id, summary, document_type, parties[], key_points[], obligations[], deadlines[], risks[], recommendations[], model).
- `ai_conversations` + `ai_chat_messages` (conversation_id, workspace_id, lawyer_id, role, content, metadata) — chat contextual por caso.
- `ai_research_requests` (workspace_id, query, answer, sources jsonb) — jurisprudencia con fuentes verificables (`jurisprudenceSources.mjs`, `jurisprudencePrompt.mjs`, `jurisprudencePipeline.mjs`).
- `ai_case_timeline_events` (workspace_id, lawyer_id, event_type, title, description, event_date, metadata) — timeline automático.
- `ai_case_workflow_items` (migration 608270000) — workflow items (statuses, transitions).
- `ai_subscriptions` (lawyer_id UNIQUE, plan, status trialing/active/cancelled/past_due/expired, trial_started_at/ends_at, trial_email UNIQUE parcial para anti-abuse, current_period_start/end, provider, provider_subscription_id, cancel_at_period_end, unlimited_trial).
- `ai_usage` + `ai_usage_monthly` (credits_used = ceil(tokens/1000), estimated_cost_usd, counts por operation).

**Flujo AI actual (`server.mjs` + `server/ai/`):**
- Upload → `server/documents.mjs` → `ai-documents` bucket → `extracted_text` → `processAIDocument` → `analyzeAIDocument` (`legalPrompt.mjs`) → `ai_document_analyses` (Zod `AIDocumentAnalysisSchema`).
- Chat: `legalChatPrompt.mjs` + `chatEvidenceResolver.mjs` + `documentGrounding.mjs` + `dynamicContextBudget.mjs` + `provider.mjs` (`chatCompletion`, `createLlmCallBudget` con `AI_CHAT_MAX_TOKENS=2400`).
- Research: `jurisprudenceSources.mjs` (`searchJurisprudence`, `classifyLegalQuery`) → `jurisprudencePipeline.mjs` (`runJurisprudenceWithRetry`) → `AIResearchPanel`.
- Case Intelligence: `caseBrief.mjs`, `caseActionLayer.mjs`, `caseWorkflow.mjs`, `contradiction.mjs` — genera brief/workflow/intelligence por caso.

**Frontend AI:**
- `LegalUpAIWorkspace.tsx:509` — lista workspaces, 4 features cards, `AISubscriptionBanner`, `AIPricingModal` ($49.990), `AIUsageMeter`, `AICaseTimelinePreview`.
- `AICaseDetail.tsx:637` — 5 tabs: overview (CommandCenter), documents+analysis+chat, research, intelligence, timeline. Gates por `useAIFeatureAccess()` (si no `hasAccess` → paywall).
- No hay LegalUpAI para cliente/usuario final (consumer) — solo lawyer.

### 2.4 Marketplace real

- Búsqueda: `SearchResults.tsx` + `supabase/functions/` (search gn). Perfil público en `PublicProfile.tsx` con `lawyer_services` ordenado por `sort_order`, reviews, bio, educación, idiomas, `hourly_rate_clp * 1.1` (surcharge cliente).
- Reserva: `BookingPage.tsx` → `POST /api/bookings/create` (`server.mjs:1203`) → inserta en `bookings` (lawyer_id, user_email/name/phone, scheduled_date/time, duration, price, booking_type=appointment|service, service_*). Prevención double-booking solo para `appointment` (semáforo de overlap). Crea `booking_leads` + notificaciones in-app + preferencia MP.
- Pago: `POST /create-payment` → `payments` row con `client_surcharge(10%)`, `platform_fee(20% de original)`, `lawyer_amount = original - platform_fee`, external_reference=paymentId, `notification_url` webhook MP. Tracking `payment_events` + GA4 `purchase` + Meta CAPI.
- Completado: job aparece en `JobsPage` (mapping bookings+quotes). Cita en `appointments` es tabla separada (legacy, no siempre sync con bookings).

### 2.5 Datos — sin `clients`/`cases` reales

El backend NO tiene entidad cliente propia ni caso/expediente fuera de `ai_workspaces`. El "caso" del SaaS hoy es confusamente `bookings`/`consultations`/`appointments` dispersos, mientras que `ai_workspaces` es "caso AI" aislado (no ligado a booking/cliente/pago). Migración conceptual requerida: no renombrar `ai_workspaces` a `cases`; crear `cases` como entidad SaaS y linkear `ai_workspaces` como 1:1 opcional (ver §9).

---

## 3. New Business Model — Marketplace + Lawyer SaaS + LegalUpAI

```
ANTES (funnel único, transaccional):
  Google → LegalUp → Abogado → Reserva → Comisión (solo si hay transacción)
  Problema: sin clientes/día = $0

DESPUÉS (3 motores, ingresos desacoplados):
  MOTOR 1 — MARKETPLACE (adquisición)
    Google → artículo → Marketplace → abogado → reserva → pago → comisión
    · No desaparece. Es el acquisition engine (SEO + landings ya existentes)
    · Métrica: booking conversion rate

  MOTOR 2 — LAWYER SAAS (retención / MRR)
    Abogado → LegalUp SaaS ($49.990 bundle) → oficina digital
    · Usa LegalUp aunque no llegue lead ese mes (clientes propios, pagos, IA)
    · Métrica: MRR, retención, activation (primer cliente/caso/pago)

  MOTOR 3 — LEGALUPAI ($49.990 standalone + integrado)
    · Standalone consumer: usuario final paga $49.990 sin ser abogado
    · Standalone lawyer: abogado paga $49.990 solo por IA (hoy)
    · Integrated: IA dentro de cada caso del SaaS (máximo valor)
    · Métrica: AI activation, queries/mes, retention
```

**Separación de ingresos (§12):** `lawyer_revenue` (lo que el cliente paga al abogado, neto de comisiones) vs `platform_revenue` (SaaS + AI subscription + marketplace commission). El dashboard del abogado muestra SOLO lo primero; el admin ve lo segundo.

**Flywheel reducido (ver §16 para expandido):** Abogado crea perfil → comparte URL (`/abogado/slug-id`) → trae clientes propios → crea casos/citas/pagos → usa LegalUpAI dentro del caso → retiene → Marketplace le suma leads orgánicos → recomienda LegalUp.

---

## 4. Monetization Architecture — Cómo gana dinero LegalUp

| Fuente | Cobro a | Mecánica actual | Evolución propuesta | $ |
|---|---|---|---|---|
| **Marketplace commission** | Cliente paga; plataforma descuenta fee | `create-payment`: `derivedOriginal = price/1.1`, `client_surcharge=10%`, `platform_fee=20% de original`, `lawyer_amount=80%`. Payout pendiente (`payout_status`) | Mantener. Confirmar `platform_fee_percent`/`client_surcharge_percent` en `platform_settings` como source of truth. No tocar hasta validar SaaS MRR. | Variable por reserva |
| **Lawyer SaaS subscription** | Abogado → LegalUp | No existe | **Bundle $49.990** (SaaS+AI) recurrente vía MP `preapproval` (mismo rail que `ai_subscriptions.provider=mercadopago`). `lawyer_subscriptions` o extender `ai_subscriptions` con `plan=saas_essential` (ver §6) | $49.990/mes |
| **LegalUpAI standalone (consumer)** | Usuario final | No existe (AI solo lawyer) | Nuevo `consumer_ai_subscriptions` (user_id, plan essential, $49.990). Sin workspaces/casos; solo workspace personal/documents/chat/research | $49.990/mes |
| **LegalUpAI standalone (lawyer sin SaaS)** | Abogado | Hoy: `ai_subscriptions` $49.990 | Mantener como tier. Si abogado quiere solo IA sin SaaS, paga igual $49.990 (sin gestión de clientes/casos SaaS) | $49.990/mes |
| **LegalUpAI integrado** | Incluido en SaaS bundle | Hoy integrado solo en `/lawyer/ai` | Dentro de cada caso SaaS: resumir, extraer, checklist, borradores (ver §8). Ya incluido en $49.990 bundle, no extra | $0 extra |

**Regla:** precio AI siempre $49.990. Nunca se baja para "resolver" conversión. El SaaS justifica el precio por IA + oficina; no al revés.

**No implementar aún:** comisiones diferenciadas por source (LAWYER_DIRECT vs MARKETPLACE). Dejar modelo preparado (campo `source` en bookings/clients) pero con misma comisión inicial para no complejizar GTM.

---

## 5. LegalUpAI Strategy — Producto independiente $49.990 + integración SaaS

### 5.1 Producto independiente — dos contextos

**A. Consumer AI (usuario final, NO abogado):**
- *Usuario objetivo:* persona con problema legal que quiere entender documentos / preparar antecedentes antes de contratar abogado. No quiere workspace de casos legales complejos; quiere workspace personal.
- *Problema:* leer 80 páginas de contrato/demanda, entender riesgos, saber qué preguntar al abogado, organizar papeles.
- *Funcionalidades (reutilizan motor actual):* subir PDFs → análisis estructurado (summary, risks, obligations, deadlines), chat con documentos, investigación jurisprudencia básica. Sin `ai_workspaces` multi-caso; un solo workspace personal por usuario o 1 caso simple.
- *Límites:* max docs, tamaño, tokens/mes (mismo esquema `ai_usage_monthly` pero con `user_id` no `lawyer_id`). Sin acceso a datos de abogados ni a `ai_workspaces` de otros.
- *Datos:* aislado en `consumer_ai_workspaces` o `ai_workspaces` con `owner_type=consumer` (preferible tabla separada para no contaminar RLS lawyer).

**B. Lawyer AI standalone (hoy):**
- *Usuario:* abogado que solo quiere IA sin oficina SaaS. Usa `/lawyer/ai` tal cual. Paga $49.990. Límite trial 3/10, luego essential ilimitado (con protections de tokens/requests).

**Diferencia clave:** Consumer no ve features de abogado (timeline, case brief, workflow actions, client/case linking). Abogado sí ve jurisprudencia con contexto de caso + inteligencia del caso + chat con evidencia cross-documento.

### 5.2 Integración en Lawyer SaaS (valor máximo)

Dentro de `Caso (SaaS)` → pestaña **LegalUpAI** contextual:

- Resumir caso (agregado de todos los docs del caso)
- Resumir/Analizar documento individual (ya existe)
- Extraer información estructurada (partes, pretensiones, plazos, montos)
- Detectar información faltante (checklist de antecedentes)
- Preparar preguntas para el cliente
- Generar borradores (coming_soon → fase 2)
- Crear checklist / minuta / organizar antecedentes (inteligencia + workflow ya generan `caseBrief`/`deriveCaseActions`)
- Ayudar a revisar: contradicciones (`contradiction.mjs`), evidencia documental (`documentGrounding.mjs`)

**Reutilización:** Todo lo de `server/ai/` es reutilizable. Nuevas tablas necesarias solo para ligar `cases ↔ ai_workspaces` y permisos. No nuevas APIs de IA desde cero en fase 1.

### 5.3 Separación de contextos (seguridad)

```
CONSUMER AI                          LAWYER AI
user_id → consumer_workspace         lawyer_id(=auth.uid()) → ai_workspaces → ai_documents
         → consumer_docs                       → ai_document_analyses
         → consumer_research                  → ai_conversations/messages
                                              → ai_research_requests
                                              → ai_case_timeline_events
                                              → ai_case_workflow_items
                                              → (futuro) cases → ai_workspace_id FK
Aislamiento absoluto: ninguna query puede leer filas de otro lawyer_id.
```

---

## 6. Pricing Recommendation — Análisis de Modelo A/B/C

**Contexto precio:** `AI_SUBSCRIPTION_PRICE_CLP = 49900` (`lib/aiFeatures.ts:30`, `server.mjs:443`, `LEGALUPAI.tsx:precio`). Trial 5 días sin tarjeta. Es el precio ancla del producto. SaaS aún no tiene precio.

| Modelo | Definición | Ventajas | Desventajas | MRR / ARPU | Conversión / Retención | Canibalización | Upsell | Complejidad técnica |
|---|---|---|---|---|---|---|---|
| **A — Lawyer SaaS $49.990 con AI incluido** | Un solo precio, un solo plan. SaaS+AI bundle. Consumer AI standalone también $49.990 (segmento distinto). | Mensaje simple ("tu oficina + IA por $49.990"). No duplica cobro. Aumenta percepción de valor (IA justifica precio). Una suscripción = un churn. | Si abogado solo quiere oficina sin IA, paga de más (pero IA le retiene). Margen LLM variable dentro de precio fijo. | ARPU $49.990. MRR = lawyers × 49.990. Sin stacking. | Conversión alta (un CTA: "Activa tu oficina"). Retención alta (valor oficina + IA). | Nula si consumer es separado. Lawyer AI standalone deja de existir como SKU separado (se fusiona en SaaS). | Upsell futuro: plan Pro con más casos/docs, seats, storage. | Baja: extender `ai_subscriptions` con plan `saas_essential` o nueva `lawyer_subscriptions` con mismo provider MP. |
| **B — SaaS barato + AI $49.990 adicional** | SaaS $19.990–29.990 + AI $49.990 = $69.990–79.990 bundle real. | SaaS accesible; AI premium separado. Segmentación clara. | Precio total $70k+ mata conversión abogados chilenos (abogado junior paga ~$50k = abogado ve 40% más caro). Doble suscripción = doble churn point. IA como add-on se percibe opcional → menos adoption → menos retención. | ARPU variable $19.990 a $79.990, difícil predecir. MRR fragmentado. | Conversión baja (dos decisiones). Retención baja si AI no se activa. | Alta: abogado prueba SaaS barato, nunca activa AI, no ve valor completo y churna igual. | Upsell natural (AI add-on) pero frío. | Media: dos suscripciones MP `preapproval` por abogado, estados combinados. |
| **C — Bundle $49.990 (AI+ SaaS juntos por $49.990, es decir AI gratis si tomas SaaS)** | Mismo $49.990 pero framing "AI $49.990 + SaaS gratis" vs "SaaS $49.990 + AI gratis". Económicamente idéntico a A, pero framing distinto. | Framing "pagas AI, te llevas oficina" justifica $49.990 para abogados que ya valoran AI (early adopters AI). | Para abogado que no usa AI, framing confuso ("¿por qué pago AI si no la uso?"). | Igual que A. | Conversión de AI-first alta, SaaS-first baja. | Similar a A. | Confuso. | Baja, igual que A. |

**Pregunta estratégica del brief (§22):**
- *¿LegalUpAI como producto premium principal + SaaS como capa alrededor?* → Modelo C.
- *¿Lawyer SaaS como producto principal + LegalUpAI como motor que justifica $49.990?* → Modelo A.

**Recomendación: Modelo A (con framing de A, no C).**

**Justificación por criterio del brief:**

1. **Percepción de valor:** "Tu oficina legal digital con IA incluida" se entiende por abogado no-AI-native. El valor inmediato es oficina (perfil compartible + pagos + gestión); IA es descubrimiento progresivo (cuando sube primer doc). Framing C invierte el orden y deja fuera a abogado que aún no cree en IA.
2. **Facilidad comercial:** Un precio, un CTA, una objeción ("$49.990"). El equipo de ventas/onboarding no explica dos SKUs. Consumer AI queda como producto separado sin contaminar mensaje lawyer.
3. **MRR/ARPU:** ARPU fijo $49.990 simplifica forecast. 10 lawyers = $499k MRR. Con B, ARPU promedio < $49.990 porque mayoría no toma add-on AI.
4. **Conversión:** Test implícito: trial 5 días ya genera `hasAccess` gate; convertir a bundle único tiene 1 paywall (`AIPricingModal`), no 2. Menos fricción.
5. **Retención:** Abogado que no usa IA el mes 1 igual retiene por oficina (clientes propios, pagos). Si AI fuera add-on, no retiene porque nunca la activa. Bundle asegura exposure a IA → habit loop → sticky.
6. **Canibalización:** Preservar venta standalone AI a $49.990 solo para **consumer** (usuario final) y para **lawyer que no quiere SaaS** (mantener `ai_subscriptions` como SKU pero deprecado en comms; si abogado compra AI standalone sin SaaS, se le ofrece upgrade a SaaS al mismo precio — churn positivo).
7. **Complejidad:** Una suscripción MP por abogado (extender `ai_subscriptions.plan` a `saas_essential` o nueva `lawyer_subscriptions` con `provider_subscription_id` MP `preapproval`). No doble webhook.
8. **Upsell:** Futuro: `saas_essential` ($49.990) → `saas_pro` ($79.990) con más storage, más casos, seats para estudio, white-label. AI sigue incluida; el upsell es capacidad, no "AI sí/no".

**Implementación precio preservado:**
- Crear `lawyer_subscriptions` (o reutilizar `ai_subscriptions` con `plan='saas_essential'`, `status`, `current_period_end`) con `amount_clp=49900`. Consumer mantiene `consumer_ai_subscriptions` a $49.990.
- No permitir que abogado pague dos veces $49.990 (AI + SaaS). Si `ai_subscriptions` activa existe, migrarla a `saas_essential` (upgrade sin recobro prorrateado en fase 1).

---

## 7. Lawyer SaaS Architecture — Qué debe contener

### 7.1 Qué existe vs qué falta (gap)

| Módulo SaaS objetivo | Existe hoy | Gap para "oficina digital" |
|---|---|---|
| Dashboard (ingresos, citas, clientes, casos, solicitudes, actividad) | `LawyerDashboardPage` con contadores + actividad (citas, mensajes, consultas, servicios, pagos) + banner AI | Falta: pipeline de clientes/casos, pagos pendientes, tareas, métricas MRR del abogado, primera-acción checklist |
| Clientes | ❌ No existe | Tabla + sección Clientes (datos, historial, citas, trabajos/casos, docs, pagos, notas, comunicaciones) |
| Casos / Trabajos | `JobsPage` (inbox bookings+quotes) — no es caso | Evolucionar a `cases` con estados, tareas, docs, citas, pagos, notas; migrar `bookings` → `case` opcional |
| Citas | `CitasPage` + `appointments` + `bookings(type=appointment)` | Unificar modelo; calendario + disponibilidad + Google Calendar (`google_integrations`) ya existe; falta recordatorios |
| Servicios | `ServicesPage` + `lawyer_services` | Ya SaaS-ready. Solo falta `sort_order`, `available`, y que servicio sea plantilla de caso |
| Pagos | `payments` + `payout_logs` + `platform_settings` | Falta UX de liquidación, retry fallidos, vista `payout_status` en Earnings |
| Solicitudes | Notificaciones + `bookings` pending | Inbox "Solicitudes LegalUp" (leads marketplace sin pagar aún) |
| LegalUpAI | `/lawyer/ai` workspace + 5 tabs | Conectar a `cases` (ver §8) |
| Perfil | `ProfilePage` | Convertir en página compartible + SEO (`/abogado/slug`) ya es (ver §8) |

### 7.2 Dashboard objetivo (mínimo viable SaaS)

```
Inicio (nuevo /lawyer/dashboard agrandado)
├── Métricas: ingresos mes, citas hoy, clientes activos, casos abiertos, pagos pendientes, solicitudes LegalUp sin responder
├── Tareas: presupuestos por enviar, trabajos por iniciar, pagos por verificar
├── Actividad reciente (ya existe) + Timeline de casos
├── Checklist activación: perfil ≥80% → 1 servicio → disponibilidad → compartir URL → 1er cliente → 1er pago → 1er doc AI
└── CTA: Conecta Mercado Pago | Conecta Google Calendar | Crea tu primer caso

Clientes (NUEVO — prioridad 1)
├── Tabla: nombre, email, teléfono, source (DIRECT|MARKETPLACE), último caso, monto total, estado
├── Ficha: datos + historial (citas+casos+pagos) + docs + notas + comunicaciones + actividad
└── Acciones: crear cliente manual, importar desde booking, vincular a caso

Casos (evolución de Trabajos)
├── Tabla: título, cliente, estado (borrador→activo→en_progreso→entregado→cerrado), fecha, monto, AI badge
├── Ficha: overview (brief AI), documentos+análisis, investigación, inteligencia, timeline, tareas, citas, pagos, notas
└── Migración: bookings(type=service) + service_quote_requests → cases (ver §9)

Citas, Servicios, Pagos/Ingresos, Solicitudes, LegalUpAI, Perfil, Configuración (evolución de existentes)
```

### 7.3 Navegación futura propuesta (ver §13 para IA placement)

```
Inicio | Clientes* | Casos* | Citas | Servicios | Pagos | Ingresos | Solicitudes | LegalUp AI | Perfil | Configuración
* nuevo crítico
Renombrar: Trabajos → Casos (o mantener Trabajos como alias si "Casos" confunde laboralistas)
Eliminar/fusionar: Consultas + Citas → Citas (unificar). Mantener Favoritos/Notificaciones en sub-nav o header.
```

---

## 8. Marketplace Architecture — Qué se conserva

**Se conserva íntegro:** `/search`, filtros por especialidad/precio/ubicación/modalidad, `/abogado/:slug` (pública, compartible, SEO), landings verticales, `/booking/:lawyerId` → `bookings` + MP preference, reviews, favoritos.

**Integración con SaaS (sin romper funnel):**
- Cuando llega `booking(type=service|appointment)` desde Marketplace, el abogado lo ve en **Solicitudes** (si pendiente) y en **Casos/Citas** (si pagado). Al aceptar/presupuestar, se crea `client` (si no existe, deduplicado por email) + `case` (o `appointment`) con `source=LEGALUP_MARKETPLACE` (ver §5→9).
- Cliente propio: abogado comparte `legalup.cl/abogado/slug`. Reserva llega con `source=LAWYER_DIRECT` (param `?ref=direct` o `utm_source=lawyer_share` o detection por `referrer` + `booking.source`). Mismo flujo, pero trazable para futura comisión diferenciada (no activa en fase 1).

**Flywheel (ver §16):** Marketplace sigue siendo acquisition engine SEO + paid. SaaS lo hace retener y viralizar (abogado comparte URL → trae tráfico propio → más reservas → más proof para marketplace).

---

## 9. Data Architecture — Tablas actuales vs necesarias

### 9.1 Inventario real (de `types/supabase.ts` + `supabase/migrations/`)

**Core:**
- `profiles` (id=auth.uid(), user_id, email, first_name/last_name/display_name, role lawyer/client/admin, avatar_url, bio, specialties[], location, hourly_rate_clp, rating/review_count, experience_years, verified/pjud_verified, languages[], availability jsonb, education, university, study years, rut, contact_fee_clp, bar_number, certifications jsonb). RLS: `auth.uid()=id`.
- `specialties` (id, name), `lawyers` (rut, full_name, is_active) — legacy PJUD, no usado SaaS.

**Marketplace / Bookings:**
- `bookings` (id, lawyer_id→profiles.user_id, user_id nullable, user_email/name/phone, scheduled_date/time, duration, price, status pending/confirmed/in_progress/completed/cancelled, booking_type appointment|service, service_id/title/description/delivery_time, requires_meeting, mercadopago_preference_id, payment_status, needs_manual_review, experiment_variant, posthog_distinct_id, metadata jsonb {article_slug}, created_at). Sin `source` aún.
- `service_quote_requests` (no tipada completa pero usada en `useLawyerJobs.ts:64`: lawyer_id, user_id/name/email/phone, service_title, description, quoted_price, status pending/quoted/paid/cancelled/expired, mercadopago_preference_id, payment_link, quote_notes). Fuente de Jobs "quote".
- `appointments` (id, lawyer_id, user_id, name/email/phone, appointment_date/time, duration, price, status, consultation_type, contact_method, address, type, meet_link/provider/status, amount/currency). Tabla legacy, paralela a bookings.
- `consultations` (lawyer_id→profiles.id, client_id, service_id→services.id, title, description, price, status, is_free). Inbox consultas free/paid.
- `services` (id, lawyer_id→profiles.id, title, description, price_clp, duration, delivery_time, features[], available, is_active) — legacy marketplace. `lawyer_services` (id, lawyer_user_id→auth.uid(), title, description, price_clp, delivery_time, features[], available, requires_quote, sort_order) — nueva, usada por PublicProfile y ServicesPage.
- `favorites` (user_id, lawyer_id→profiles.id), `ratings/reviews` (lawyer_id, client_id, rating, comment, status), `reviews/review_tokens`, `messages` (consultation_id, service_id, sender/receiver, content, read), `notifications` (user_id, type, title, message, entity_type/id, is_read, metadata).
- `page_views` (visitor_id, user_id, page_path/title, referrer).
- `booking_leads` (no tipada, ver `server.mjs:1439`: lawyer_id, name/email/phone, selected_date/time/duration/price, booking_id, booking_type, status started).

**Pagos:**
- `payments` (id, amount=original_amount=platform_fee+lawyer_amount constraint, original_amount, client_surcharge/percent, platform_fee/percent, lawyer_amount, currency, status pending/completed/refunded/failed, lawyer_user_id/client_user_id, appointment_id/consultation_id, payment_gateway_id, payout_status pending/processing/completed/failed, payout_date/reference/error, total_amount, service_description). Creado vía RPC `create_payment_secure`.
- `payout_logs` (lawyer_user_id, payment_ids[], total_amount, status, reference, error, metadata).
- `platform_settings` (platform_fee_percent, client_surcharge_percent, currency, updated_by). Defaults `server.mjs:430`: 10% surcharge cliente, 20% fee plataforma.
- `mercadopago_accounts` (user_id, mercadopago_user_id, access_token/refresh_token, public_key, email, nickname, expires_at) — OAuth sin UI.
- `payment_events` (no tipada; `server.mjs:1375`: event_type, amount, status, metadata{booking_id}, user_id) — tracking purchase funnel.
- `documents` (documents.mjs: pagos de pagaré/documento legal — no SaaS case docs).

**AI (listado completo §2.3):** `ai_workspaces`, `ai_documents` (bucket `ai-documents`), `ai_document_analyses`, `ai_conversations`, `ai_chat_messages`, `ai_research_requests`, `ai_case_timeline_events`, `ai_case_workflow_items`, `ai_subscriptions`, `ai_usage`, `ai_usage_monthly`, `ai_case_timeline_events`, `chat_analytics`.

**Integraciones:** `google_integrations` (user_id, access_token/refresh_token, expires_at, scope), `linkedin_profiles`, `contact_messages`.

### 9.2 Qué falta para SaaS + source-tracking + bundle

| Entidad | Estado | Acción propuesta | Riesgo migración |
|---|---|---|---|
| `attorney_clients` (o `clients`) — tabla propia SaaS | ❌ No existe | **Crear** `attorney_clients` (id uuid, lawyer_id→profiles.id, email, name, phone, source enum DIRECT|MARKETPLACE|UNKNOWN, first_booking_id nullable, notes, created_at). UNIQUE(lawyer_id, lower(email)). Buckets sin datos aún. | Bajo (nueva tabla, sin backfill obligatorio salvo deducir de bookings existentes opcional) |
| `cases` — expediente SaaS | ❌ No existe (solo `ai_workspaces` como caso-AI) | **Crear** `cases` (id, lawyer_id, client_id→attorney_clients.id nullable, title, description, practice_area, status enum draft/active/in_progress/delivered/closed/cancelled, source DIRECT|MARKETPLACE, booking_id/quote_request_id nullable, service_title, price, currency, created_at). Link opcional `ai_workspace_id→ai_workspaces.id` (1:1). Migrar `bookings` existentes a cases solo si abogado activa SaaS (lazy, no backfill masivo). | Medio — si se migra mal, bookings huérfanos. Mitigación: cases no reemplaza bookings; booking sigue siendo origen de verdad, case es envolvente |
| `case_tasks` + `case_notes` + `case_documents` | ❌ No existe | **Crear** solo `case_tasks` si SaaS lo exige en fase 2. `case_documents` puede ser vista sobre `ai_documents` + docs subidos no-AI (si se añade upload no-AI). No bloquear MRR inicial con tasks. | Alto si se sobre-modela fase 1. Prioridad: no crear hasta validar retención con clientes+casos básicos |
| `source` en `bookings` + `attorney_clients` + `cases` | ❌ No existe | **Agregar columna** `source text DEFAULT 'UNKNOWN'` + índice. Backfill opcional: si `bookings.metadata.article_slug` o `experiment_variant/posthog_distinct_id` existe → MARKETPLACE, si `referrer` contiene `/abogado/` share → DIRECT (heurística). No bloquear launch sin backfill. | Bajo (ADD COLUMN nullable) |
| `lawyer_subscriptions` (SaaS) | ❌ No existe (via `ai_subscriptions`) | **Opción recomendada A:** extender `ai_subscriptions` con `plan='saas_essential'` y `amount_clp` + `provider_subscription_id` MP `preapproval` (una fila por lawyer, UNIQUE(lawyer_id)). **Opción B:** nueva `lawyer_subscriptions` (id, lawyer_id UNIQUE, plan saas_essential, status, amount_clp, provider, provider_subscription_id, current_period_start/end, cancel_at_period_end, trial_* ). Preferencia: B para no contaminar semántica AI, pero ambas válidas. Migrar `ai_subscriptions` activas → `lawyer_subscriptions` con mismo período (sin recobro). | Medio — doble fuente de verdad si se mantiene ai_subscriptions paralelo. Mitigación: trigger o view `lawyer_has_access = saas active OR ai active` |
| `consumer_ai_subscriptions` | ❌ No existe | Crear si se lanza consumer AI. Estructura igual a `ai_subscriptions` pero con `user_id` (cualquier role) y `workspace` personal. No priorizar antes de validar SaaS MRR. | Bajo, pero no priorizar |
| `lawyer_availability` (ya existe migración `20250101000000_add_lawyer_availability.sql`: lawyer_id, availability jsonb) | ⚠️ Existe pero no integrado a SaaS calendar | Mantener, unificar con `google_integrations` y `appointments/bookings` slots | Bajo |
| `payments.payout_*` visibility | ⚠️ Tabla sí, UX no | No nueva tabla; exponer `payout_status` en `EarningsPage` + filtrar `lawyer_revenue` vs `platform_fee` en queries | Bajo |

**Dependencias ordenadas:** `attorney_clients` → `cases` → `source` columns → `lawyer_subscriptions` → (futuro) `case_tasks`/`consumer_ai`.

**Decisión "cases vs ai_workspaces":** No reutilizar `ai_workspaces` como `cases`. `ai_workspaces` es workspace AI (docs+chat+research+timeline); `cases` es expediente SaaS (cliente+cita+pago+estado). Relación: `cases.ai_workspace_id` nullable → el SaaS puede crear caso sin AI, y puede linkear AI después. Esto preserva `ai_workspaces` existentes sin migración y evita romper RLS AI (ver §12).

---

## 10. Payments Architecture — SaaS subscription + marketplace payments + lawyer payouts

**Hoy (marketplace):**
```
Cliente reserva (booking) → server POST /api/bookings/create → MP preference (items.title, unit_price=clientAmount)
→ Cliente paga en MP → webhook POST /api/mercadopago/webhook → update bookings.payment_status=approved → payments.status=completed
→ (payout pendiente) → process-weekly-payouts Edge Function (supabase/functions/process-weekly-payouts/) → transferencia MP → payout_logs
   + GA4 purchase + Meta CAPI purchase (dedup event_id=paymentId)
```
Evidencia: `server.mjs:1084-1144` (preference), `mercado-pago-webhook`, `platform_settings`, `payout_logs`, `mercadopagoService.ts:100-127`, `EcommercePerformance` (no usado).

**SaaS subscription (propuesta bundle $49.990):**
```
Abogado activa trial 5 días (POST /api/ai/trial/start → ai_subscriptions trialing) — ya existe
→ Al convertir, POST /api/ai/subscribe (o /api/saas/subscribe) → crea MP preapproval (recurrente)
   external_reference = AI_<lawyer_id>_<timestamp> (server.mjs:446)
   provider_subscription_id = preapproval.id, current_period_end = +30 días
→ Webhook MP preapproval (nuevo handler o extender webhook existente) → update ai_subscriptions/lawyer_subscriptions status=active
→ Cron diario valida expiry (server.mjs cron) → grace period 3-7 días → past_due → expired
→ Cancelación POST /api/ai/subscription/cancel → cancel_at_period_end=true, acceso hasta period_end
```
Provider actual: `mercadopago` (no Stripe). Mantener. `supabase/functions/create-mercado-pago-preference/` ya maneja preference creation.

**Separación critical (§12):**
- `lawyer_revenue`: sum(`payments.lawyer_amount WHERE payout_status=completed AND lawyer_user_id=auth.uid()`) — dashboard abogado (`EarningsPage`).
- `platform_revenue`: sum(`payments.platform_fee + SaaS subscriptions`) — dashboard admin.
- Nunca mezclar en una query. `EarningsPage.tsx:88-99` hoy lee `payments.amount` sin distinguir; corregir en SaaS.

**Failed payment / grace:**
- `ai_subscriptions` ya tiene `status past_due` + `cancelled_at` + `current_period_end`. Reutilizar para SaaS.
- Grace period: 7 días con acceso degradado (solo lectura de casos/clientes, no nuevo análisis AI ni nuevos casos). Notificar via `notifications` + email (Resend).

**Payouts de marketplace:** Mantener weekly batch (`process-weekly-payouts`) pero hacerlo visible: Earnings muestra `payout_status` (pending → processing → completed/failed) y retry link. No mezclar con flujo SaaS recurring.

---

## 11. AI Architecture — Consumer AI vs Lawyer AI

### 11.1 Consumer AI (usuario final, no abogado)

- **Auth:** cualquier `user_id` (`profiles.role = client` o sin perfil abogado), sin requisito `pjud_verified`.
- **Workspace:** `consumer_ai_workspaces` (user_id, name personal) o `ai_workspaces` con `owner_type=consumer` y RLS `auth.uid()=user_id`. Preferencia: tabla separada para no mezclar índices/límites.
- **Docs:** bucket `ai-documents` con path `consumer/<user_id>/<doc_id>.pdf` (vs `lawyer/<lawyer_id>/...` actual). Límite mismo 20MB, pero trial consumer podría ser 1 workspace / 5 docs.
- **Research/Chat:** mismo `provider.mjs` + prompts, pero `CHAT_LIMITS` y `JURISPRUDENCE_LIMITS` ajustados (menos documentos en contexto, sin `caseBrief`).
- **Pricing:** $49.990 reuse `consumer_ai_subscriptions`. Trial 5 días.

### 11.2 Lawyer AI (actual + contextual en caso)

- **Auth:** `lawyer_id = auth.uid()` + `profiles.role=lawyer` (check en `server.mjs` trialIdentity + RLS).
- **Workspace:** `ai_workspaces` con RLS `lawyer_id = auth.uid()` (existente). Añadir FK `cases.ai_workspace_id` para linking SaaS.
- **Docs:** path `ai-documents/<lawyer_id>/<workspace_id>/<doc>.pdf`. RLS: `auth.uid() = lawyer_id`.
- **Contextos dentro de caso SaaS:**
  1. **Global AI** (`/lawyer/ai`): lista workspaces, métricas, research general. (ya existe)
  2. **Contextual** (`/lawyer/ai/cases/:caseId` o `/lawyer/cases/:caseId/ai`): tabs Documents+Chat+Research+Intelligence+Timeline. Valor máximo: briefing que agrega todos los docs del caso (`caseBrief.mjs`), acciones derivadas (`caseActionLayer.mjs`), contradicciones (`contradiction.mjs`), workflow (`caseWorkflow.mjs`), sources (`documentGrounding.mjs`).
- **Funciones futuras dentro de caso (no implementar fase 1, solo diseñar):** resumir caso (map-reduce de `ai_document_analyses` del workspace), extraer checklist faltante (prompt sobre `parties/obligations/deadlines` vacíos), generar minuta (llm con `caseBrief` + `jurisprudence`), preparar preguntas cliente (derivadas de `risks`/`obligations`).
- **Nuevas tablas necesarias:** ninguna para fase 1. Todo usa `ai_documents/analyses/conversations`. Solo `cases.ai_workspace_id` para navegación.

### 11.3 Hipótesis de arquitectura IA (§14)

> "LegalUpAI debe ser accesible globalmente, pero su máximo valor aparece dentro de cada caso."

**Validada.** Evidencia: `AICaseDetail.tsx` ya organiza valor por workspace (caso) con 5 tabs contextuales; `LegalUpAIWorkspace.tsx` global solo lista + CTA. Global es entry point (descubrimiento, creación), contextual es donde el abogado pasa tiempo (docs+chat+brief). Recomendación: mantener ambas, con deep-link desde `cases` → `ai/cases/:workspaceId`.

---

## 12. Security — RLS, ownership, authorization y separación

### 12.1 RLS actual (audit de `supabase/migrations/*`)

- **Profiles / bookings / appointments / lawyer_services:** RLS con `auth.uid()=id/user_id/lawyer_user_id` (migs `20240926*`, `20250101`, `20260803*`). Correcto.
- **AI:** `ai_workspaces`, `ai_documents`, `ai_document_analyses`, `ai_conversations/messages`, `ai_research_requests`, `ai_case_timeline_events`, `ai_case_workflow_items` — todas con `USING (auth.uid() = lawyer_id)` + `WITH CHECK` igual. Correcto, owner-isolated. Triggers trial límites son `SECURITY DEFINER` pero no exponen datos (solo cuentan).
- **AI subscriptions:** `USING (auth.uid() = lawyer_id)` (no explicit en migs listadas pero pattern `ai_usage` y `ai_subscriptions` lo siguen — ver `supabase/types` fkeys a profiles.id). Verificar.
- **Payments:** RLS permite user leer sus payments (`user_id`) y lawyer leer sus `lawyer_id`; admin via `profiles.role=admin` (migs `20240927*`, `20241125`).
- **Storage `ai-documents`:** bucket `ai-documents` con RLS de storage (no lista en mids pero policy estándar Supabase storage.objects con `auth.uid()` folder). Verificar path incluye `lawyer_id`.

### 12.2 Riesgos encontrados (no arreglar, solo reportar)

| Riesgo | Severidad | Evidencia | Mitigación futura |
|---|---|---|---|
| **Doble modelo citas** (`appointments` vs `bookings` type appointment) con RLS dispar | Alta | `appointments` tiene `lawyer_id/lawyer_user_id` mixto; `bookings.lawyer_id` → `profiles.user_id` FK, pero `appointments.lawyer_id` sin FK clara (types: Relationships []). Queries en `CitasPage.tsx` + `DashboardAppointments.tsx` pueden leak si no filtran ambos ids | Unificar en `cases/appointments` o view consolidada con RLS única |
| **IDOR potencial en `ai_documents.file_path`** | Media | File path es string, no validado contra workspace ownership en upload inicial (server/documents.mjs no auditado en detalle). Supabase Storage RLS może permitir list si policy usa `name` like `%lawyer_id%` mal | Validar server-side que `workspace.lawyer_id = auth.uid()` antes de upload + policy strict `auth.uid() = substring(path,1,uuid_len)` |
| **Campos controlados por cliente en bookings** | Media | `bookings` insert desde `POST /api/bookings/create` sin auth (NO AUTHENTICATION REQUIRED comment `server.mjs:1203`). Cualquiera puede crear booking con `lawyer_id` arbitrario + `user_email` arbitrario → spam / enumeración de abogados | Rate limit + hCaptcha + verificar lawyer existe (ya lo hace `lines 1316-1325`) pero no verificar `user_id` ownership si se pasa. Fase SaaS debe exigir auth para bookings type service desde SaaS |
| **Secrets en bundle** | Baja | `mercadopagoAccessToken`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` solo en `server.mjs` (correcto, no `VITE_`); `VITE_MERCADOPAGO_ACCESS_TOKEN` check `isJwt` detecta misconfig (`server.mjs:1117`) | OK, pero auditar `.env.local` no commiteado + `netlify.toml` no expone secrets |
| **Exposición datos sensibles a LLM** | Media | `MAX_EXTRACTED_TEXT_CHARS=80000` enviados a `provider.mjs` `chatCompletion` (OpenAI/etc). Sin redaction PII ni consent del cliente del abogado. Abogado sube docs de terceros | Añadir aviso legal + opt-in + no-log de extracted_text en provider + retention policy en `ai_documents.extracted_text` (delete on workspace delete CASCADE ya existe) |
| **RLS de `service_quote_requests` y `booking_leads`** | Media | No tipadas en `types/supabase.ts`; RLS desconocida. Si no tienen RLS `auth.uid()=lawyer_id`, cualquier authenticated user podría list quotes ajenos | Revisar Supabase Dashboard → Table Editor → RLS enabled + policies antes de launch SaaS |
| **Cross-tenant via `ai_usage_monthly` RPC** | Baja | `increment_ai_usage_monthly` es `SECURITY DEFINER` sin check `auth.uid()` (called desde server con service_role, OK). Pero si se expone como RPC cliente, riesgo. Actualmente solo server la llama | No exponer RPC a anon/authenticated, solo service_role |
| **Unlimited trial flag** | Baja | `ai_subscriptions.unlimited_trial boolean` + `trial_email` UNIQUE parcial puede ser bypass si attacker borra `trial_email` y recreation | Trigger `ai_is_lawyer_on_trial` ya considera `trial_ends_at` null → unlimited, pero verificar no permite crear segunda fila por `lawyer_id UNIQUE` |

**Recomendación fase 1:** Audit Supabase RLS en Dashboard para: `ai_*`, `service_quote_requests`, `booking_leads`, `payments`, `lawyer_services`, `appointments`, `storage.objects`. Activar RLS donde falte. No arreglar en código aún; levantar checklist.

---

## 13. UX / Navigation — Nueva estructura del dashboard

### 13.1 Arquitectura actual (`DashboardLayout.tsx:143-203`)

```
Lawyer sidebar:
  Inicio (/lawyer/dashboard) | LegalUp AI* | Perfil | Servicios | Citas | Trabajos | Favoritos | Notificaciones | Ingresos | Config. de Pagos
  * highlight + AI badge
Client sidebar: Resumen | Citas | Notificaciones | Servicios | Favoritos | Pagos | Perfil | Config. Pagos
```

Problemas: Trabajos ≠ Casos, Citas+Consultas duplicado, LegalUpAI destacado pero fuera de flujo de caso, no hay Clientes, Ingresos mezcla lawyer/platform, Config Pagos sin conexión MP visible.

### 13.2 Arquitectura propuesta (prioriza MRR)

```
LAWYER (/lawyer/*, DashboardLayout):
  Inicio              — métricas (ingresos mes, citas hoy, clientes, casos abiertos, pagos pendientes, solicitudes) + checklist activación + CTA conecta MP/GCal + banner AI trial
  Clientes*           — tabla + ficha (datos/historial/citas/casos/pagos/notas/comunicaciones) — NUEVO PRIOR 1
  Casos*              — tabla + ficha (estados, tareas, docs, AI, citas, pagos) — evoluciona Trabajos — NUEVO PRIOR 1
    └── Caso → AI    — tabs: Resumen | Documentos+Chat | Investigación | Inteligencia | Timeline (reuse AICaseDetail)
  Citas               — unifica CitasPage + ConsultasPage + calendario + disponibilidad + GCal
  Servicios           — CRUD lawyer_services (mantener)
  Pagos               — lista pagos marketplace (para abogado) — subset de Ingresos
  Ingresos            — dashboard financiero abogado (solo lawyer_amount, no platform_fee) — evoluciona EarningsPage
  Solicitudes         — inbox leads marketplace sin pagar / presupuestos pendientes (filtra bookings pending + quotes pending)
  LegalUp AI          — entry global (lista workspaces, métricas) — mantiene /lawyer/ai, pero su valor es deep-link a Caso→AI
  Perfil              — público + privado, editar, preview /abogado/slug — mantiene
  Configuración       — cuenta, notificaciones, integraciones (MP, GCal), suscripción (gestionar plan/cancelar)
  (Favoritos/Notificaciones: mover a header icon + dropdown, no sidebar primary)

* = crítico para SaaS "oficina digital"
```

**Eliminar/renombrar/fusionar:**
- `Consultas` → fusionar en `Citas` (ambas son `appointments/bookings` con distinta `consultation_type`).
- `Trabajos` → renombrar a `Casos` (mantener redirect `/lawyer/jobs` → `/lawyer/cases` temporal).
- `LegalUp AI` → mantener como primaria (Opción 1 §14) pero secundaria contextual es donde vive valor. Conclusión: ambas — ver §14.

### 13.3 LegalUpAI en navegación — Opciones §14

| Opción | Pros | Contras |
|---|---|---|
| **1. AI como sección principal** (`/lawyer/ai`) | Descubrimiento, onboarding trial, métricas globales | Fuera de flujo caso, abogado olvida usarla donde importa |
| **2. AI contextual dentro de cada caso** (`/lawyer/cases/:id` → sub-tabs AI) | Valor máximo (brief, docs, research ligados a datos del caso) | Si solo contextual, usuario nuevo no descubre AI sin caso previo |

**Decisión: Ambas, con principal = global + secundaria contextual como primaria de uso.** Global es acquisition + management; contextual es daily driver. Validación: `AICaseDetail` ya es contextual (5 tabs), `LegalUpAIWorkspace` global solo lista. Métrica: % de análisis AI iniciados desde Caso vs global — objetivo >70% desde Caso al mes 3.

---

## 14. Metrics — North Star + secundarias

### 14.1 SaaS (core MRR)

**North Star SaaS:** `Activated Lawyer` = lawyer con perfil ≥80% + 1 servicio + disponibilidad + 1 cliente creado + 1 caso/cita creada + MP conectado. Predice retención.

| Fase | Métrica | Fuente | Success 90 días |
|---|---|---|---|
| Signup | Lawyer signup (auth + profile created) | `profiles` insert | 100 |
| Activation | `profile_completed`, `first_service`, `first_availability`, `first_client`, `first_case`, `first_payment` (cada una) | `lawyer_services`, `attorney_clients`, `cases`, `payments` | 40% activation rate |
| AI activation | `ai_first_case_created` (`useAIWorkspaces.ts:115` posthog), `ai_first_document_uploaded`, `first_analysis_ready` | `ai_workspaces/documents` + posthog `ai_first_case_created` | 50% de activados usan AI en semana 1 |
| Monetización | `subscription_started` (trial→active), `MRR`, `ARPU=$49.990`, `LTV` | `ai_subscriptions`/`lawyer_subscriptions` | 10 paying (=$500k MRR) |
| Retención | `retained_w4/w12`, `churn`, `grace_recovery_rate` | `ai_subscriptions.status` | Churn <10% mensual |

### 14.2 Marketplace

`search` → `profile_view` (`page_views` + `lawyer_profile_views`) → `service_view` → `booking_start` (`POST /api/bookings/create`) → `payment` (`payments`) → `completed_booking` (`bookings.status=completed`) → `repeat_booking` (mismo user_email + lawyer_id). Funnel tracked ya por `booking_leads`, `payment_events`, GA4, Meta.

### 14.3 AI

`activation` (trial start), `sessions` (workspace open), `queries` (chat messages count `ai_chat_messages`), `documents_analyzed` (`ai_document_analyses` count), `research_requests` (`ai_research_requests`), `analysis_success_rate` (`analysis_status ready/failed`), `trial_to_paid` conversion, `AI retention` (weekly active lawyers using AI).

**Instrumentación ya existente:** PostHog `ai_workspace_viewed`, `ai_paywall_opened`, `ai_feature_clicked`, `ai_first_case_created`, `ai_document_processing_*`, `ai_case_chat_panel_opened` (`AICaseDetail.tsx`), `ai_onboarding_started`. Completar con SaaS events: `saas_client_created`, `saas_case_created`, `saas_payment_connected`.

---

## 15. Risks — Técnicos y comerciales

### Técnicos

1. **Doble fuente citas (appointments vs bookings)** — bug de disponibilidad/double-booking si se usa una y se lista la otra. Mitigación: unificar o vista materializada antes de SaaS calendar. Esfuerzo: medio.
2. **RLS incompleta en `service_quote_requests`/`booking_leads`** — IDOR. Mitigación: audit Dashboard → fix policies antes de launch.
3. **Storage RLS de `ai-documents`** — si policy es permisiva, leak cross-lawyer. Mitigación: test con dos usuarios.
4. **Marketplace booking sin auth** — abuse. Mitigación: rate limit + turnstile en fase 2, no bloquea MRR.
5. **Costos LLM impredecibles** a $49.990 flat — un abogado con 100 docs/mes puede costar >$20 en tokens (`ai_usage.estimated_cost_usd` + `ai_usage_monthly.total_tokens`). Mitigación: `AI_PROTECT_MAX_MONTHLY_TOKENS=20M` y `RATE_LIMIT=30/min` ya limitan abuso; añadir fair-use 50 docs/mes en T&C fase 2 si costo supera $15/abogado.
6. **Migración `cases` sin perder `bookings`** — riesgo de bookings huérfanos. Mitigación: cases envolvente, no reemplazo; lazy creation.
7. **Vendor lock MP** — preapproval es Chile-friendly pero no portable. Mitigación: abstraer `provider` column ya existe.

### Comerciales

1. **$49.990 es ancla fuerte pero puede ser alto para abogado junior** — si lawyer no ve oficina+IA día 1, churn trial. Mitigación: onboarding enfatiza perfil compartible + pagos (valor tangible antes de IA) + trial 5 días sin tarjeta + concierge setup.
2. **Modelo A bundle puede percibirse "pago por IA aunque no la uso"** — framing "oficina con IA incluida" + mostrar valor IA en primer caso pre-poblado (dummy caso + doc demo).
3. **Canibalización consumer vs lawyer AI** — si consumer AI a $49.990 es mismo precio, lawyer puede auto-clasificarse consumer para evitar SaaS. Mitigación: consumer sin features lawyer (timeline, workflow, client linking) y sin facturación empresa.
4. **SaaS sin clientes externos no retiene** — si abogado no trae clientes propios ni recibe leads, igual churna. Mitigación: Solicitudes inbox + sharing URL + recordatorio semanal "comparte tu perfil".
5. **Marketplace comisión vs SaaS MRR conflicto interno** — equipo puede optimizar leads vs retención. Mitigación: OKRs separados (marketplace = conversion, SaaS = MRR/retención) pero flywheel compartido.

---

## 16. Roadmap — Fases posteriores (prioriza revenue/validación, no features por cantidad)

**Principio:** cada fase debe aumentar probabilidad de $49.990 pagado y retenido.

### Fase 1.5 — Foundation (2-3 semanas, sin UI mayor) — ESTA FASE YA HECHA (audit)
- [x] Este documento

### Fase 2 — SaaS MVP MRR (4-6 semanas) → **objetivo: 5 abogados pagando $49.990**
1. **DB:** `attorney_clients` + `cases` + `source` cols + `lawyer_subscriptions` (bundle) — migraciones.
2. **API:** `POST /api/saas/subscribe` (MP preapproval bundle), `/api/attorney-clients` CRUD, `/api/cases` CRUD + link `ai_workspace_id`, backfill `source` básico.
3. **UI:** Sidebar nueva (Inicio/Clientes/Casos), página Clientes (tabla+ficha), Casos (tabla+ficha con link a AI), Solicitudes inbox, fix Earnings payout_status, conecta MP visible.
4. **RLS:** audit + fix `service_quote_requests`, `booking_leads`, `attorney_clients`, `cases`, storage.
5. **Instrumentación:** PostHog `saas_*` events, checklist activación en Dashboard.
6. **GTM:** 10 abogados beta (existentes con perfil completo) → concierge onboarding → trial 5 días → paywall bundle.

**Qué NO construir en fase 2:** `case_tasks`/`case_notes`/`consumer AI`/`documentos no-AI`/`comisión diferenciada`/`white-label`.

### Fase 3 — AI contextual + retención (3-4 semanas) → **objetivo: +5 abogados (10 total = $500k MRR)**
1. Link `cases ↔ ai_workspaces` + deep-link `Casos → AI` + brief agregado por caso.
2. Checklist información faltante + generar minuta (prompt sobre caso, no nuevo modelo).
3. Grace period + dunning (notifications + email Resend) + cancel_at_period_end UX.
4. Sharing URL con `?ref=direct` tracking + dashboard "tráe tu primer cliente propio".

### Fase 4 — Marketplace + SaaS integración (2-3 semanas)
1. Funnel `bookings.source` → `cases` auto-create en webhook MP, con `source` correcto.
2. Perfil público como landing compartible (QR, copy link, WhatsApp share) + analytics `?ref`.
3. Reviews + SEO landings siguen alimentando Solicitudes.

### Fase 5 — Consumer AI standalone (si SaaS valida)
1. `consumer_ai_subscriptions` + workspace personal + pricing page `/ai` para consumer.
2. Aislamiento total (tabla separada, bucket path separado).

### Fase 6 — Scale
1. `case_tasks` / `case_notes` / `case_documents` no-AI si retention lo pide (validar con entrevistas).
2. Plan Pro ($79.990) con seats, storage, más casos.
3. Comisión diferenciada DIRECT vs MARKETPLACE (cuando MRR > $2M).

---

## 17. Respuestas a preguntas clave (§23)

| Pregunta | Respuesta (una línea) |
|---|---|
| **¿Qué es LegalUp?** | Marketplace legal + oficina digital del abogado (SaaS) + IA jurídica ($49.990 bundle) |
| **¿Quién paga?** | Abogado paga SaaS+AI $49.990/mes (MRR); consumidor paga AI $49.990 si no es abogado; cliente paga comisión por reserva |
| **¿Por qué paga?** | Porque LegalUp es su oficina (clientes, casos, citas, pagos, perfil compartible) + IA que ahorra horas, aunque no lleguen leads ese mes |
| **¿Cuánto paga?** | $49.990/mes (abogado bundle; consumer standalone). Marketplace comisión 10% surcharge + 20% fee (variable) |
| **¿Qué obtiene el abogado?** | Perfil público, servicios, clientes, casos, citas, pagos/ingresos, solicitudes LegalUp, IA por caso (docs, chat, research, brief) |
| **¿Qué obtiene el usuario?** | Consumer: workspace personal AI (docs, chat, research). Marketplace: buscar abogado, ver perfil/servicios, reservar, pagar, seguimiento |
| **¿Cómo gana LegalUp?** | MRR SaaS+AI ($49.990×lawyers) + comisión marketplace (20% fee) + consumer AI ($49.990×consumers). MRR es el centro |
| **¿Qué parte es Marketplace?** | `/search`, `/abogado/:slug`, landings SEO, `/booking`, `lawyer_services`, `bookings`, `payments` commission, reviews |
| **¿Qué parte es SaaS?** | `/lawyer/*` (Clientes, Casos, Citas, Servicios, Pagos/Ingresos, Solicitudes, Perfil, Configuración) + `attorney_clients`, `cases`, `lawyer_subscriptions` |
| **¿Qué parte es LegalUpAI?** | `/ai` landing + `/lawyer/ai` global + `/lawyer/ai/cases/:id` contextual (docs, análisis, chat, research, timeline) + `ai_*` tables + `server/ai/` |
| **¿Cómo se conectan?** | Booking (source) → creates client+case SaaS → case links ai_workspace → AI enriches case → perfil compartible trae más bookings → flywheel |
| **¿Qué construir primero?** | Fase 2 SaaS MVP: `attorney_clients`+`cases`+`source`+`lawyer_subscriptions bundle`+Clientes/Casos UI+Solicitudes |
| **¿Qué NO construir?** | Tasks/notes no-AI, consumer AI, white-label, comisión diferenciada, seats, storage pro — hasta validar 10 paying |
| **¿Camino más corto a $500k MRR?** | 10 abogados × $49.990 bundle. Beta 10 abogados con perfil completo + concierge + trial 5d → conversión 50% → 5 en fase 2 + 5 en fase 3 |

---

## 18. Apéndices

### A. Glosario de precios y constantes (evidencia)

- `AI_SUBSCRIPTION_PRICE_CLP = 49900` (`src/lib/aiFeatures.ts:30`, `server.mjs:443`) — label `$49.900`
- `AI_SUBSCRIPTION_TRIAL_DAYS = 5` (`aiFeatures.ts:31`, `server.mjs:444`)
- `AI_TRIAL_MAX_CASES=3`, `MAX_DOCUMENTS=10` (`server/ai/trialIdentity.mjs`, `server.mjs:451`, `migration 608040100`)
- `MAX_DOCUMENT_SIZE=20MB` (`server.mjs:452`, `migration 608030002`)
- `AI_CHAT_MAX_TOKENS=2400` (`server.mjs:456`)
- `DEFAULT_CLIENT_SURCHARGE=10%`, `PLATFORM_FEE=20%` (`server.mjs:430`, `platform_settings`)

### B. Tabla `source` propuesta

```sql
-- bookings, attorney_clients, cases
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'UNKNOWN'
  CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN'));
ALTER TABLE public.attorney_clients ADD COLUMN source ...;
ALTER TABLE public.cases ADD COLUMN source ...;
CREATE INDEX idx_bookings_source ON bookings(source);
```

### C. Nota de auditoría de pagos — Dónde ver `lawyer_revenue` vs `platform_revenue`

- `payments.lawyer_amount` + `payout_status=completed` → lawyer
- `payments.platform_fee` + `lawyer_subscriptions.amount_clp` → platform
- Dashboard abogado debe filtrar `lawyer_user_id = auth.uid()` y sumar `lawyer_amount`, no `amount` ni `total_amount`.

---

> **Regla final respetada:** No se diseñó producto imaginario. Todo lo propuesto reutiliza: `profiles`+`lawyer_services` (perfil/SaaS), `bookings`+`service_quote_requests` (jobs→cases), `payments`+`payout_logs` (marketplace), `ai_workspaces`+`ai_documents`+`server/ai` (IA). Deuda técnica (`appointments` vs `bookings`, `services` vs `lawyer_services`) identificada. Gaps (`clients`, `cases`, `lawyer_subscriptions`) priorizados por MRR. Próxima fase puede convertirse directamente en plan técnico por fases (Fase 2 tickets listos).
