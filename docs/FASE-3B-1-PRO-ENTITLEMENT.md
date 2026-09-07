# FASE 3B-1 — LegalUp Pro Entitlement + Mercado Pago

**Modo:** IMPLEMENTATION (minimal)  
**Fecha:** 2026-09-06

---

## 1. Tabla Creada

**Migration:** `supabase/migrations/20260910000000_pro_entitlement.sql`

```sql
CREATE TABLE lawyer_subscriptions (
  id uuid PK, lawyer_id uuid UNIQUE FK profiles(id),
  plan text saas_essential CHECK, status pending/active/cancelled/past_due/expired,
  provider mercadopago, provider_subscription_id text,
  amount_clp int 19990, is_founder boolean,
  current_period_start/end, cancel_at_period_end, cancelled_at
);
CREATE UNIQUE INDEX lawyer_subscriptions_one_per_lawyer (lawyer_id);
INDEX status, provider_subscription_id
```

**RLS:** `ENABLE ROW LEVEL SECURITY`, `POLICY owner_select USING auth.uid()=lawyer_id` — no insert/update/delete for authenticated (service_role only), activation via webhook.

---

## 2. RLS

- `SELECT` owner only (`authenticated`), no `USING true`
- No `INSERT`/`UPDATE` for `authenticated` — prevents self-activation, `status`/`amount`/`provider_subscription_id` only via `service_role` (backend/webhook)
- `is_founder` not writable by client

---

## 3. Endpoints

- `GET /api/pro/subscription` (`server.mjs` after AI) — `requireAILawyer` (lawyer role), `getProLawyerAccess`, returns `{hasProAccess, status, subscription}`
- `POST /api/pro/subscribe` — `requireAILawyer`, check existing `active/pending` → 409, `Founder 15` count `SELECT count(*) WHERE is_founder true AND status IN (pending,active)` <15 → `is_founder`, `INSERT` pending `19990`, `POST https://api.mercadopago.com/preapproval` `external_reference PRO_<lawyerId>`, `payer_email`, `auto_recurring 1 month 19990 CLP`, `back_url /lawyer/dashboard?pro_subscription_success=true`, `notification_url`, `UPDATE provider_subscription_id`, `capturePostHog pro_subscription_checkout_started`
- `POST /api/pro/subscription/cancel` — `requireAILawyer`, `status active` check, `PUT preapproval status cancelled` MP, `UPDATE cancelled`, `capturePostHog`

---

## 4. Mercado Pago

- Reuses AI infra `resolveWebhookUrl`, `mercadopagoAccessToken`, `fetch preapproval`
- `reason LegalUp Pro - Suscripción mensual`, `transaction_amount 19990`, `frequency 1 months`, `currency CLP`, `start_date +24h`
- `external_reference PRO_<lawyerId>` (distinct from `AI_<id>`), `payer_email` from `auth.admin.getUserById`, `back_url` Pro, `notification_url` webhook
- Price **not** from client (`lawyerId = authenticated user`, `price = 19990` server)

---

## 5. External Reference

`PRO_<lawyerId>` — deterministic, idempotent `provider_subscription_id` update, no `price`/`lawyerId` from body.

---

## 6. Webhook

- `handleProPreapprovalWebhook(preapproval)` — `status authorized|active → active +30d`, `cancelled → cancelled`, `paused → past_due`, `capturePostHog pro_subscription_activated/renewed`, email welcome
- `handleProAuthorizedPayment(payment)` — `payment.status approved → active +30d`, `rejected → past_due`
- Routing: `handlePreapprovalWebhook` checks `PRO_` prefix before Empresas, `handleAuthorizedPayment` checks `lawyer_subscriptions` via `provider_subscription_id` before Empresas
- HMAC `x-signature` timingSafe, fail-closed, idempotency `provider_subscription_id` unique per second call just updates period

---

## 7. Idempotencia

- `INSERT` race `23505` on `lawyer_id` unique → second gets `already`
- `UPDATE` `status active` with same `period_end` on duplicate webhook → same row, no duplicate
- `isFounder` check `count <15` race: two concurrent at 14 → both may set `true` (14+2=16) — documented as acceptable for MVP, can add advisory lock if needed

---

## 8. Estados

`pending` (after subscribe, before webhook) → `active` (authorized/active) → `cancelled` (cancel) / `past_due` (paused/rejected) / `expired` (period_end past). `hasProAccess` true only `active` or `cancelled` with `current_period_end > now`.

---

## 9. Founder 15

- `is_founder boolean` set at `POST /api/pro/subscribe` if `count(is_founder true AND status pending/active) <15`
- Counts **activations/pagos** (pending/active founder), not visits
- Reservation via `count` + `INSERT`; concurrent race may exceed by 1 (documented, acceptable), can add `SELECT FOR UPDATE` or unique `founder_number` if needed
- `amount_clp` always `19990` regardless of founder (founder is flag, not price difference yet)

---

## 10. Entitlement

`getProLawyerSubscription(userId)` → `maybeSingle` order `created_at DESC`
`getProLawyerAccess(userId)` → `hasAccess` if `active`/`cancelled` with `current_period_end > now`
`requireProAccess` → `hasAccess ? access : null`
`requireProEntitlement(req,res,userId)` → `402 {code: PRO_PLAN_REQUIRED}` if `!hasAccess` — pattern same as `requireAIEntitlement` `AI_PLAN_REQUIRED`

---

## 11. Tests

`src/__tests__/phase3B1.test.ts` 11 tests: no subscription false, active true, expired false, cancelled with period, non-lawyer cannot, unauthenticated, price manipulation (19990), lawyer A cannot use B id, duplicate webhook idempotency, webhook falso no activa, marketplace still passes.

---

## 12. Riesgos Pendientes

- P1: Founder race (15+1) — add `SELECT FOR UPDATE` or `founder_number` unique 1-15
- P1: `pro_subscription_checkout_started` vs `ai` — separate analytics, no dashboard
- P2: Email Pro uses `sendAIEmail` template (Pro text) — reuse, not blocking

---

## 13. Qué queda para 3B-2

Gates `ClientsPage`, `CasesPage`, `RequestsPage`, `CitasPage` → `requireProEntitlement` 402 + `ProPricingModal` (clon AI, Founder 15 $19.990). Dashboard sigue free.
