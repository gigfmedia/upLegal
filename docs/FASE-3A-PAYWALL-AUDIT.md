# FASE 3A — Auditoría Paywall LegalUp AI → Base para LegalUp Pro

**Modo:** AUDIT ONLY — NO CODE CHANGES  
**Fecha:** 2026-09-06

---

## 1. Executive Summary

LegalUp AI posee un **paywall completo, seguro y reutilizable** basado en `ai_subscriptions` + Mercado Pago `preapproval` (`AI_<lawyerId>`) + webhook HMAC + `hasAccess` centralizado (`useAISubscription` → `requireAIEntitlement` 402). **LegalUp Pro no existe**: `lawyer_subscriptions` no existe (deferred), ningún `src/pages/lawyer/*` verifica entitlement salvo `/lawyer/ai`. Todo el SaaS (Clients/Cases/Citas/Requests/Earnings) es **gratuito e ilimitado** hoy. El funnel Pro deseado (`explora gratis → primera acción de valor → paywall → $19.990 Founder 15 → MP → active`) puede **reutilizar >80%** de la infraestructura AI cambiando solo `external_reference`, tabla/entitlement y gate. Riesgo P0: sin gate, cualquier lawyer puede crear N clientes/casos/citas sin pagar; por ahora intencional.

---

## 2. LegalUp AI Current Paywall

### UI — Componente Único `AIPricingModal`

**Archivo:** `src/components/legalup-ai/AIPricingModal.tsx:48` `Modal de suscripción / paywall`

- **Props:** `open, onOpenChange` (`:26`), `Dialog open={open}` (`:107`), `DialogContent sm:max-w-lg` (`:108`)
- **Precio:** `src/lib/aiFeatures.ts:30` `AI_SUBSCRIPTION_PRICE_CLP=49900`, `AI_SUBSCRIPTION_TRIAL_DAYS=5` (`:31`), `AI_SUBSCRIPTION_PRICE_LABEL $49.900` (`:33`), perks 4 (`:31-36` — Análisis, Workspace, Chat, Jurisprudencia)
- **Copy modal:** `DialogTitle LegalUp AI` + `Tu asistente jurídico` (`:110`), `Badge trialing` `Estás en prueba: X días` (`:120`), `Badge Essential` (`:129`), `"$49.900 /mes"` (`:132`), `status==='none' ? "Empieza con 5 días gratis, sin tarjeta."` (`:136`)
- **CTA:** `primaryCta = status==='none' ? {label:'Empezar gratis', action:handleStartTrial} : {label:'Suscribirme por $49.900/mes', action:handleSubscribe}` (`:99-104`), Button `onClick={primaryCta.action}` (`:177`), `Loader2 Procesando…` (`:177`)
- **Instancias (5):** `LegalUpAIWorkspace.tsx:493`, `AICaseDetail.tsx:634`, `LegalUpAI.tsx:2345`, `AISubscriptionBanner.tsx:110`, `AISubscriptionCard.tsx:177`

### Triggers — Gate `hasAccess`

**Hook:** `src/hooks/useAISubscription.ts:36` `useAISubscription` → `hasAccess = isTrialing || isActive || isCancelledWithAccess` (`:79`)

**Backend autoridad:** `server.mjs:7441 getAILawyerAccess()` + `7585 requireAIEntitlement() => 402 {code:'AI_PLAN_REQUIRED'}`

**Workspace (`LegalUpAIWorkspace.tsx`):** `hasAccess` (`120`), `openPaywall() => posthog.capture('ai_paywall_opened') + setPricingOpen(true)` (`140`), `handleAvailableClick() if(!hasAccess) openPaywall()` (`147`), `enabled = available && hasAccess` (`227`), Button `Activa tu prueba` (`288`), `Nuevo caso` `315`, `Crear mi primer caso` `370`, `AICaseTimelinePreview` `449`

**Detalle caso (`AICaseDetail.tsx`):** `useAIFeatureAccess()` (`64`) `canAnalyze/canChat/canResearch` (`65-67`), `accessLoading` skeleton (`332`), lock cards `!canAnalyze` `343` CTA `Ver planes` `359`, `!canChat` `410`, `!canResearch` `538`, `AIPricingModal` `634`

**Banner (`AISubscriptionBanner.tsx`):** `hasAccess, isActive, isTrialing` (`20`), `if(isActive) return null` (`25`), copy `neverStarted: Prueba 5 días Sin tarjeta. Después $49.900` (`42`), `isTrialing Badge trialDaysRemaining` (`52`), `expired` (`68`), CTA `setPricingOpen(true)` `88` labels `Empezar prueba gratis / Administrar suscripción / Reanudar` (`93`)

**Landing (`LegalUpAI.tsx`):** `ctaLabel` `needsProfile ? Completar perfil : canResume ? Reanudar : isActive ? Abrir : hasAccess ? Ir : Probar gratis 5 días` (`1873`), `handleStartTrial` `1973` `if(!user) AuthModal`, `if(canResume) setShowPricingModal(true)`, `if(hasAccess) navigate("/lawyer/ai")` else `startTrialFlow()`

**PostHog:** `ai_paywall_opened` (`141`), `ai_trial_cta_clicked` (`67`), `ai_subscribe_clicked` (`83`)

### Qué ocurre al click

- **Trial:** `AIPricingModal:63 handleStartTrial()` → `useAISubscription:162 POST /api/ai/trial/start` → `server.mjs:7690` idempotente (check `email_confirmed_at` `7701`, `role=lawyer` `7708`, duplicate `23505` `7774`) → `toast.success¡Prueba activada!` `onOpenChange(false)` — **no MP**
- **Subscribe:** `AIPricingModal:79 handleSubscribe()` → `useAISubscribe:200 POST /api/ai/subscribe` → `server.mjs:7809` crea `preapproval` MP (`7826 external_reference AI_<lawyerId>`, `payer_email`, `auto_recurring 1 month 49900 CLP`, `back_url /lawyer/ai?ai_subscription_success=true` `7840`, `notification_url` webhook) → `fetch api.mercadopago.com/preapproval` `7848` → `UPDATE ai_subscriptions provider_subscription_id` `7868` → `res.json {initPoint}` `7878` → `window.location.href = initPoint` **redirect full-page** (no popup). Fallback toast `Te redirigimos a Mercado Pago...`

### Estado después del pago

- **Back URL:** `https://legalup.cl/lawyer/ai?ai_subscription_success=true` (`7840`) → `LegalUpAIWorkspace:126` `toast.success Suscripción confirmada` + `history.replaceState` remove param
- **Webhook que confirma:** `server.mjs:4934 handleAIPreapprovalWebhook` (`authorized|active` → `UPDATE ai_subscriptions status active, period +30d` `4965`) / `5025 handleAIAuthorizedPayment` (`payment approved` → `active`) — hasta entonces `getAILawyerAccess:7463` mantiene `hasAccess` por trial si existe
- **UI reactiva:** `useAISubscription:40` query `ai_subscriptions WHERE lawyer_id=user.id ORDER created_at DESC limit 1`, `isTrialing/isActive/isCancelledWithAccess` (`70-78`), `AISubscriptionBanner:25 if(isActive) return null`, `AISubscriptionCard:86` STATUS_META `trialing/active/cancelled/past_due/expired`, `AIUsageMeter` `209` `hasAccess &&`
- **Emails:** `server.mjs:4276 ¡Bienvenido a LegalUp AI!` (welcome), `4287 No pudimos procesar el pago`, `7940 cancelada` — todos post-webhook

---

## 3. Mercado Pago Current Flow

| Endpoint | File:Line | external_reference | Price | Payer | Recurrence | Webhook | Idempotencia |
|----------|-----------|--------------------|-------|-------|------------|---------|--------------|
| `POST /api/ai/trial/start` | `server.mjs:7690` | — (no MP) | 0 | — | — | — | `existing trialing/active → already_started`, `trial_email` cross-account `7740`, `23505` race `7774`, `email_confirmed_at` `7701`, `role lawyer` `7708` |
| `POST /api/ai/subscribe` | `server.mjs:7809` | `AI_<lawyerId>` `7828` | `transaction_amount 49900` `7833` | `payer_email` `7829` | `frequency 1 months` `7831` `start_date +24h` `7835` | `back_url /lawyer/ai?ai_subscription_success=true` `7840`, `notification_url resolveWebhookUrl` `7845` | `provider_subscription_id` update `7868` |
| `POST /api/bookings/create` | `server.mjs:1221` | `booking.id` `1512` | `computedPrice` server-enforced `1549` `hourly_rate*duration` | `payer {name,email}` `1551` | N/A one-time | same `1577` | `bookings WHERE id=external_reference AND payment_id IS NULL` atomic `2489` + `payment_events` 23505 |
| `POST /create-payment` | `server.mjs:903` | `bookingId \|\| paymentId` `1123` | `clientAmount = derivedOriginal*1.1` `1017` | `payer {email,name}` `1112` | N/A | same `1125` | — |
| Webhook `POST /api/mercadopago/webhook` | `server.mjs:2332` | — | — | — | — | HMAC `x-signature` `2362` `timingSafeEqual` `2385` fail-closed `2389 401` | `payment_events` `is payment_id` `2509` + `bookings payment_id IS NULL` `2533` + DB `23505` |

**AI webhook detalle:** `handleAIPreapprovalWebhook:4935` `preapproval.status authorized|active → active +30d` `4965` `wasTrialing ? ai_subscription_started : renewed` `4979`, `cancelled → cancelled` `4996`, `paused → past_due` `5010`; `handleAIAuthorizedPayment:5025` `payment approved → active` `5038` + `ai_subscription_paid` `5060`, `rejected → past_due` `5078` + `ai_subscription_payment_failed` + email `No pudimos procesar`.

**Empresas espejo:** `server.mjs:4507` `external_reference companyId`, `company_subscriptions` — mismo patrón AI.

---

## 4. Payment / Subscription Data Model

**`ai_subscriptions`** `src/types/supabase.ts:514` + `20260804010000_ai_trial_hardening.sql:18`

| Col | Type | PK/FK | RLS | Significado |
|-----|------|-------|-----|-------------|
| `lawyer_id` | uuid | FK `profiles.id` `523`, UNIQUE `lawyer_id` `39` | `USING auth.uid()=lawyer_id` (owner) | Tenant |
| `plan` | text `essential` `524` | CHECK `essential` `20260807000000:26` | — | AI plan |
| `status` | text `528` `trialing/active/cancelled/past_due/expired` | — | — | Entitlement |
| `trial_started_at/ends_at` `530` | timestamptz | — | — | 5 días |
| `current_period_start/end` `519` | timestamptz | — | — | Mensual |
| `provider` `525` | text `mercadopago` | — | — | MP |
| `provider_subscription_id` `526` | text | — | — | preapproval id |
| `cancel_at_period_end` `516` | bool | — | — | Baja fin período |

Triggers `ai_is_lawyer_on_trial` `70` + `ai_enforce_trial_limits` `94` (`workspaces 3, docs 10` `36-40` `src/lib/aiFeatures.ts`).

**`payments`** `2840` `lawyer_id` FK, `lawyer_amount`, `payout_status`, `appointment_id` FK, `booking_id` FK (2B), `provider_subscription_id` — usado por Marketplace (`EarningsPage:64`), no AI.

**`lawyer_clients/cases/bookings`** `2179` `RSL owner`, `bookings` `source UNKNOWN/LAWYER_DIRECT`, `client_id/case_id` FK con `CHECK single_source` `20260904150000:128`.

**¿Existe `lawyer X → pagó → producto Y → ACTIVE` reutilizable?**

- **Para AI:** **SÍ** — `lawyer_id → ai_subscriptions WHERE plan=essential AND status IN (trialing,active) AND (trial_ends_at>now OR current_period_end>now OR cancelledWithAccess)` → `hasAccess` (`useAISubscription:79` + `server 7448`). Confiable, RLS, webhook-driven, idempotente.
- **Para Pro:** **NO EXISTE ENTITLEMENT REUTILIZABLE** — `lawyer_subscriptions` no existe (`types` 0 hits, `20260904150000:231` `NOTA: NO se crea en Fase 1A DEFERRED`). `docs/FASE-1A` `160` `No creada`, `FASE-1-SAAS-FOUNDATION-PLAN:235` plan `saas_essential` con `amount_clp 49900` preparado pero no migrado. `ai_subscriptions` podría reutilizarse extendiendo `plan` CHECK a `saas_essential` (propuesta `FASE-1-LEGALUP-PLATFORM-ARCHITECTURE:353`), pero hoy no hay fila Pro.

---

## 5. Access Control

**Frontend:** `hasAccess` (`useAISubscription`) + `canUseAIFeature` (`aiFeatures:52` `free:[] essential:all`) → disabled cards `bg-gray-50` + skeletons `accessLoading` (`AICaseDetail:332`) + `posthog` — **bypassable** si solo frontend.

**Backend (SECURE):** `server.mjs:7585 requireAIEntitlement` → `getAILawyerAccess` `7448` (trial `trial_ends_at>now` else `UPDATE expired` `7471`; `active/cancelled` `periodEndMs>now || withinTrial`) → `402 AI_PLAN_REQUIRED` si `!hasAccess`. Usado en `server.mjs:7976` `documents/:id/process`, `8040 analyze`, `8304 chat`, etc. + `checkAILimits:7595` (enforce 3/10 + `isAIOverRateLimit 7570` 30/min, `checkAIProtectionLimits 7622` 20M tokens). **No bypass por URL/localStorage/Zustand.**

**Pro hoy:** **INSECURE** (no existe gate) — cualquier `lawyer` puede `POST lawyer_clients/cases/bookings` (RLS `auth.uid()=lawyer_id` permite, sin `entitlement`). `localStorage/Zustand` no usado para AI; Pro tampoco.

**Clasificación AI:** **SECURE** (DB + webhook, no frontend-only). **Pro:** **INSECURE** (ausencia de gate, no vulnerabilidad sino falta de feature).

---

## 6. LegalUp Pro Current Capabilities

| Ruta | FREE hoy | VALUE (debería ser PRO) | Gate actual |
|------|----------|-------------------------|-------------|
| `dashboard` | Todo: `bookings` KPIs `72`, `next appointments` `78`, `OnboardingCard`, `GoogleCalendarConnect` | Atención, revenue drill-down | **NONE** |
| `requests` | Unlimited `Procesar` `RequestsPage:63` `bookings.update + lawyer_cases insert` | >5/mes, bulk | NONE |
| `clients` | Unlimited `createClient` `ClientsPage:35` `source LAWYER_DIRECT` | >5 clientes, export | NONE |
| `cases` | Unlimited `createCase` `CasesPage:72` `ai_workspace_id` | >3 casos, templates | NONE |
| `citas` | Unlimited `bookings LAWYER_DIRECT` `CitasPage:146` | >10/mes, Meet | NONE (RLS LAWYER_DIRECT fijo en 2B) |
| `earnings` | Full `payments` history `EarningsPage:64` + `MercadoPagoConnect` | Export, >30d | NONE |
| `services` | Unlimited CRUD `ServicesPage:70` | 1 free / rest PRO | NONE (badge si 0) |
| `profile` | Full `ProfilePage:579` `calculateProfileCompletion >=70` | Boost | NONE |
| `ai` | **GATED** `hasAccess` | Todo AI | **AI paywall** |
| `ai/cases/:id` | **GATED** `canUse` per tab | `document_analysis`, `case_chat`, `jurisprudence` | **AI paywall** |

**Conclusión:** Pro es actualmente **exploración 100%**. No hay `lawyer_subscriptions` ni `paywall_viewed` para Pro.

---

## 7. Recommended Paywall Trigger

**Recomendado MVP (1 punto):** **Primera `Crear cliente real` / `Crear caso real` / `Procesar solicitud real`** — **NO entrada al dashboard**.

**Por qué:** Cumple criterio *explora suficiente para entender valor, primera acción real → paywall*. Dashboard `Requests → Clients → Cases → Citas` es el core loop; bloquear en `POST lawyer_clients` / `POST lawyer_cases` / `POST bookings LAWYER_DIRECT` + `RequestsPage.handleProcess` es técnico limpio (un `checkProAccess` en 3 lugares + RLS). Alternativas:
- `A. Entrada dashboard` → demasiado pronto, no ve valor.
- `E. Creación cita` → también válido pero más tarde.
- `F. Acceso AI` → ya existe, no monetiza Pro office.

**MVP:** Gate en `ClientsPage.handleCreate`, `CasesPage handleCreate`, `RequestsPage handleProcess` → `AIPricingModal`-style `ProPricingModal` con Founder 15 copy. Dashboard sigue 100% visible.

---

## 8. Reusable Infrastructure

| Componente | Reutilizable | Cómo |
|------------|--------------|------|
| **Modal** `AIPricingModal.tsx:53` | **Sí** | Clonar a `ProPricingModal` cambiando `AI_SUBSCRIPTION_PRICE_CLP` → `PRO` (mismo `49900` pero `Pro` label), perks Pro (Clientes/Casos/Citas/IA), `primaryCta` `Empezar / Suscribirme` |
| **CTA** `handleStartTrial/handleSubscribe` | **Sí** | Reutilizar `useAISubscription` → `useProSubscription` (mismo `POST /api/pro/trial/start` + `/subscribe`) |
| **Mercado Pago checkout** `POST /api/ai/subscribe` `7809` `preapproval` `external_reference AI_<id>` | **Sí** | Copiar a `POST /api/pro/subscribe` con `external_reference PRO_<lawyerId>` + mismo `auto_recurring` `7831` + `back_url /lawyer/dashboard?pro_subscription_success=true` |
| **Preference creation** `preapprovalData` `7826` | **Sí** | Reutilizar `reason LegalUp Pro - Suscripción mensual`, `transaction_amount 49900`, `notification_url` |
| **Webhook** `handleAIPreapprovalWebhook` `4935` + `handleAIAuthorizedPayment` `5025` | **Sí** | Clonar a `handleProPreapprovalWebhook` con `PRO_` prefix y `lawyer_subscriptions` tabla |
| **Payment record** `ai_subscriptions` row | **Parcial** | **No** — crear `lawyer_subscriptions` (falta) o extender `ai_subscriptions.plan` CHECK a `saas_essential` (rápido pero acopla). Recomendado **nueva tabla** `lawyer_subscriptions` (plan `saas_essential`) por separación Pro vs AI (FASE-1 docs) |
| **Entitlement** `getAILawyerAccess` `7448` + `requireAIEntitlement` `7585` | **Sí** | Clonar a `getProLawyerAccess` / `requireProEntitlement` (misma lógica `trial_ends_at/current_period_end`) |
| **Success page** `?ai_subscription_success=true` `126` | **Sí** | Reutilizar `?pro_subscription_success=true` + `useEffect toast` |
| **Error handling** `409 TRIAL_ALREADY_USED`, `23505` duplicate | **Sí** | Idéntico |
| **Analytics** `ai_trial_started`, `ai_paywall_opened` | **Sí** | Renombrar `pro_trial_started`, `pro_paywall_opened` |

**Estimación:** 80% reuso (modal, MP, webhook, emails, analytics) + 20% nuevo (tabla, hooks, gates).

---

## 9. Security Risks

| Riesgo | Impacto | Mitigación Pro |
|--------|---------|----------------|
| Frontend-only gate | **P0** si Pro se hace solo frontend | Usar `requireProEntitlement` 402 en `server` para `POST lawyer_clients/cases/bookings` (mismo que AI) |
| `localStorage` entitlement | No existe para AI, no crear para Pro | DB `lawyer_subscriptions` |
| URL param `?pro_success=true` sin verificación | Bajo | Solo toast, no activa; webhook es autoridad |
| Trial sin `email_confirmed_at` | `AI 403 EMAIL_NOT_CONFIRMED` `7701` | Reutilizar para Pro |
| `lawyer_id` spoof | `AI` verifica `profiles.role=lawyer` `7708` | Reutilizar |

---

## 10. Marketplace Compatibility

`Marketplace` (`POST /api/bookings/create` `1221` **NO AUTH**, `service_role` `303`, `lawyer exists` `1334`, `bookings` `UNKNOWN`, `payment_events` + `booking_leads`, MP `booking.id`) **no debe tocarse**. `Pro` gate es solo para `LAWYER_DIRECT` (`CitasPage:146`, `RequestsPage`, `ClientsPage`) con `auth.uid()=lawyer_id` (SaaS), separado de `UNKNOWN` marketplace.

---

## 11. Minimal Future Architecture

```
lawyer (auth.users)
  ↓
lawyer_subscriptions (NEW, RLS USING auth.uid()=lawyer_id)
  id, lawyer_id UNIQUE, plan saas_essential, status trialing/active/cancelled/past_due, trial_started_at/ends_at (7d? 5d), current_period_start/end, provider=mercadopago, provider_subscription_id, amount_clp 19990 Founder, cancel_at_period_end
  ↓
POST /api/pro/trial/start → trialing (5d, sin MP) — idempotente, email_confirmed, role check, trial_email dedup
POST /api/pro/subscribe → preapproval MP external_reference PRO_<lawyerId> → provider_subscription_id, status trialing until webhook
POST /api/pro/subscription/cancel → cancelled + MP cancel
  ↓
Mercado Pago webhook preapproval/authorized_payment → handlePro* → status active/cancelled/past_due → capture pro_subscription_started/renewed
  ↓
getProLawyerAccess() → hasProAccess
  ↓
requireProEntitlement() → 402 PRO_PLAN_REQUIRED
  ↓
Gates: ClientsPage, CasesPage, RequestsPage handleProcess, CitasPage LAWYER_DIRECT insert
```

**Alternativa rápida (no recomendada a largo plazo):** Extender `ai_subscriptions` `CHECK plan IN ('essential','saas_essential')` (`20260807000000:26`) y reusar misma tabla con `plan` discriminante — ahorra migración pero acopla AI+Pro (bundle $49.990 vs $19.990 Founder).

---

## 12. Proposed Implementation Phases

**Fase 3B-1 — Entitlement (1 migración):** `CREATE TABLE lawyer_subscriptions` (mismo DDL `ai_subscriptions` + RLS), `POST /api/pro/trial/start|subscribe|cancel`, webhook `PRO_` handlers, `useProSubscription` hook, no gates aún — test `trial → active`.

**Fase 3B-2 — Gates (3 archivos):** `ClientsPage`, `CasesPage`, `RequestsPage` + `CitasPage` `requireProEntitlement` (402) + `ProPricingModal` (clon AI, Founder 15 $19.990). Dashboard sigue free.

**Fase 3B-3 — Analytics & Success:** `pro_trial_started`, `pro_paywall_opened`, `pro_subscription_started` PostHog + `?pro_success` toast, docs.

Cada fase <1 día, marketplace intacto.

