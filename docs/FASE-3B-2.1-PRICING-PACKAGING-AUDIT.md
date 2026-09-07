# FASE 3B-2.1 — PRICING / PACKAGING AUDIT — Pro $19.990 vs AI $49.990

**Modo:** AUDIT ONLY — NO CODE CHANGES  
**Fecha:** 2026-09-06

---

## STATUS

**PASS — architecture supports clear separation, but Pro $19.990 DOES NOT include AI $49.990 technically (copy claims otherwise — P1)**

---

## 1. Current AI Architecture

- **Price UI:** `src/lib/aiFeatures.ts:30` `AI_SUBSCRIPTION_PRICE_CLP = 49900` (`:33` `$49.900`), `src/components/legalup-ai/AIPricingModal.tsx:133` `$49.900/mes`, `src/pages/LegalUpAI.tsx:1805` `$49.900`, `src/hooks/useAISubscription.ts` trial 5 days `:31` `AI_SUBSCRIPTION_TRIAL_DAYS=5`
- **Price backend (source of truth):** `server.mjs:443` `AI_SUBSCRIPTION_PRICE_CLP = 49900` (same constant), `server.mjs:7833` `transaction_amount: AI_SUBSCRIPTION_PRICE_CLP` in `POST /api/ai/subscribe` preapproval (`7828` `external_reference AI_<lawyerId>`, `payer_email`, `auto_recurring 1 months`, `back_url /lawyer/ai?ai_subscription_success=true` `7840`, `notification_url` webhook)
- **Subscription table:** `supabase/migrations/20260804010000_ai_trial_hardening.sql:18` `ai_subscriptions` (`lawyer_id UNIQUE`, `plan text`, `status trialing/active/cancelled/past_due/expired`, `trial_started_at/ends_at`, `current_period_start/end`, `provider`, `provider_subscription_id`), `20260804010000:39` `UNIQUE lawyer_id`, `UNIQUE trial_email` `57`, `RLS USING auth.uid()=lawyer_id`
- **Entitlement:** `server.mjs:7455 getAILawyerAccess` — `hasAccess = trialing && trial_ends_at>now || active/cancelled && period_end>now` (with `past_due` only if withinTrial), `7448` authority DB, `7585 requireAIEntitlement → 402 AI_PLAN_REQUIRED` used in `POST /api/ai/documents/:id/process` `8045`, `chat` `8304`, etc.
- **Webhook:** `server.mjs:4935 handleAIPreapprovalWebhook` (`authorized|active → active +30d`, `cancelled → cancelled`, `paused → past_due`) + `5025 handleAIAuthorizedPayment` (`approved → active`, `rejected → past_due`), `x-signature` `2362` timingSafe, idempotency `provider_subscription_id` update same row, no duplicate
- **Trial:** `POST /api/ai/trial/start` `7690` idempotente `email_confirmed` `7701`, `role lawyer` `7708`, `UNIQUE lawyer_id` + `trial_email` dedup `7740`, `23505` race, 5 days, no MP
- **Limits:** `src/lib/aiFeatures.ts:36` `AI_TRIAL_MAX_CASES 3`, `AI_TRIAL_MAX_DOCUMENTS 10` (`ai_enforce_trial_limits` trigger `94`), `isAIOverRateLimit` `7578` 30/min, `checkAIProtectionLimits` `7622` 20M tokens
- **UI gates:** `LegalUpAIWorkspace.tsx:140` `ai_paywall_opened` → `AIPricingModal`, `AICaseDetail.tsx:343` lock cards `Ver planes` if `!canAnalyze/canChat/canResearch`, `AISubscriptionBanner` `hasAccess` check

---

## 2. Current Pro Architecture

- **Price UI:** `src/components/legalup-pro/ProPricingModal.tsx:80` `$19.990/mes por 3 meses`, `82` `Founder 15`, `81` `Founder 15` badge, perks `Clientes/Casos/Solicitudes/Citas/AI` (`22`), CTA `Activar LegalUp Pro`
- **Price backend (source of truth):** `server.mjs` (new 3B-1) `PRO_SUBSCRIPTION_PRICE_CLP = 19990` (added after `443`), `POST /api/pro/subscribe` `transaction_amount: PRO_SUBSCRIPTION_PRICE_CLP` `19990`, `external_reference PRO_<lawyerId>`, `payer_email` server, `back_url /lawyer/dashboard?pro_subscription_success=true`
- **Subscription table:** `supabase/migrations/20260910000000_pro_entitlement.sql:5` `lawyer_subscriptions` (`lawyer_id UNIQUE`, `plan saas_essential`, `status pending/active/cancelled/past_due/expired`, `provider mercadopago`, `provider_subscription_id`, `amount_clp 19990`, `is_founder`, `current_period_start/end`), `RLS owner_select USING auth.uid()=lawyer_id`, no insert for authenticated
- **Entitlement:** `server.mjs` `getProLawyerSubscription` → `getProLawyerAccess` (`hasProAccess = active || cancelled with period_end>now`), `requireProEntitlement → 402 PRO_PLAN_REQUIRED` (added after `7585`), used in `POST /api/pro/subscribe` check + future gates (3B-2 will add to `lawyer_clients/cases/bookings` via `has_pro_access` RLS `20260911000000_pro_gates.sql`)
- **Webhook:** `handleProPreapprovalWebhook` + `handleProAuthorizedPayment` (mirroring AI, `PRO_` prefix routing in `handlePreapprovalWebhook` `PRO_` check after `AI_` and in `handleAuthorizedPayment` `proSub` check before Empresas), `x-signature` same, idempotency `provider_subscription_id`
- **Founder:** `is_founder boolean` set if `count(is_founder true AND status pending/active) <15` at `POST /api/pro/subscribe` (race 15+1 possible, documented)
- **Trial:** **NO** — Pro is direct sale, no `POST /api/pro/trial/start` (spec 3B-1 §2)

---

## 3. Coexistence Matrix

| AI | Pro | Current behavior (code) | DB rows | Entitlement | What can use |
|----|-----|-------------------------|---------|-------------|--------------|
| NO | NO | `ai_subscriptions` none, `lawyer_subscriptions` none | none | `hasAccess false`, `hasProAccess false` | Dashboard free, `Pro` paywall on `create_client/case` etc. (3B-2 gates), `AI` paywall on `LegalUpAIWorkspace` |
| YES | NO | `ai_subscriptions trialing/active` `hasAccess true`, `lawyer_subscriptions` none | 1 AI row | `AI` via `ai_subscriptions`, `Pro` via `lawyer_subscriptions` false | AI features (3 cases, 10 docs, chat), Pro SaaS **blocked** (would need Pro) |
| NO | YES | `ai_subscriptions` none, `lawyer_subscriptions active` `hasProAccess true` | 1 Pro row | `AI` false, `Pro` true | Pro SaaS (clients/cases/citas), AI **blocked** (needs AI) |
| YES | YES | both `active` | 2 rows (separate tables) | both true | Both Pro + AI (no bundle discount, two MP preapprovals `AI_` + `PRO_`, two `init_point`, two webhooks) |

**Key:** `ai_subscriptions` and `lawyer_subscriptions` are **independent, separate tables** (`ai_subscriptions` `lawyer_id UNIQUE`, `lawyer_subscriptions` `lawyer_id UNIQUE`) — no FK, no relation, separate `provider_subscription_id`, separate `external_reference` prefixes, separate `get*Access` functions. No code currently checks both together.

---

## 4. Critical Finding

> **¿Pro $19.990 incluye AI $49.990 actualmente?**

**NO.**

**Evidence:**
- `getAILawyerAccess` (`7448`) checks **only** `ai_subscriptions` (`select * from ai_subscriptions where lawyer_id = userId`), not `lawyer_subscriptions`.
- `getProLawyerAccess` (new) checks **only** `lawyer_subscriptions`, not `ai_subscriptions`.
- `requireAIEntitlement` (`7585`) 402 if `!hasAccess` AI — does not check Pro.
- `ProPricingModal.tsx:22` perks **claims** `LegalUp AI integrado` but code **does not** grant AI access when Pro active — `useAISubscription` still checks AI, `Pro` active does not set `ai_subscriptions` row.
- No `lawyer_subscriptions → ai_subscriptions` trigger, no `hasAccess = hasProAccess || hasAIAccess` bridge.

**Consequence:** Marketing copy says Pro includes AI, but technically `Pro ACTIVE` still `AI` **blocked** (`AICaseDetail` lock). User would need **two** subscriptions: `PRO $19.990` + `AI $49.990` = `$69.980` total, not $19.990. This is **P1 commercial mismatch**, not DB bug.

---

## 5. Technical Options

| Option | DB Change | Entitlement Change | MP | Price | Effort | Risk |
|--------|-----------|-------------------|----|-------|--------|------|
| **AI standalone** (current) | none | `AI` separate | `AI_`, 49900 | $49.990 | 0 | none |
| **Pro standalone** (current) | `lawyer_subscriptions` | `Pro` separate | `PRO_`, 19990 | $19.990 | done | none |
| **Pro + AI (two subs)** | none (both tables) | `AI` + `Pro` independent | 2 preapprovals, 2 webhooks | 19990+49990 | 0 | user pays double, no bundle |
| **Pro includes AI (entitlement bridge)** | none | `getAILawyerAccess` → `if (hasProAccess) return true` | 1 Pro preapproval only | $19.990 includes AI | 1 file, 3 lines | **Regala AI 49.990 por 19.990** — revenue risk, resource abuse (see §6) |
| **Pro includes AI limited** | `ai_subscriptions` stays, `aiFeatures` add `pro_limited` plan | `hasAccess = hasProAccess ? limited : hasAIAccess` + `aiFeatures` new limits (e.g., 1 case, 3 docs) | 1 Pro | $19.990 limited | 2 files, low risk |
| **Pro + AI bundle new plan** | new `plan bundle_pro_ai` in `lawyer_subscriptions` or `ai_subscriptions` | `bundle` checks both | 1 bundle preapproval  `BUNDLE_`, price 59.990 | $59.990 | migration + webhook | medium |

---

## 6. Recommended Architecture

**Elegir *Pro includes AI limited* (Option: Pro $19.990 incluye AI limitado, AI Full $49.990 standalone) — más compatible con código actual.**

**Por qué:**
1. **Código actual:** `aiFeatures.ts` ya distingue `free: []` vs `essential: all` (`52`), y `checkAILimits` enforces `3 cases /10 docs` only during trial — fácil añadir `pro_limited: [document_analysis, case_chat]` con `1 case / 3 docs` without new table, just `getAILawyerAccess` → `if (hasProAccess) return limited`.
2. **DB actual:** No requiere nueva tabla ni `bundle` plan — solo `lawyer_subscriptions` + `ai_subscriptions` coexist, `hasProAccess` bridge in `getAILawyerAccess` (1 `SELECT` extra).
3. **MP actual:** 1 preapproval per product (AI 49900, Pro 19990) — bundle would need new MP plan 59990 and webhook, more risk.
4. **Coexistence:** Usuarios `YES/YES` (AI+Pro) keep 2 rows, no conflict; `NO/YES` (Pro only) gets limited AI, `YES/NO` keeps full AI; no double charge for limited.
5. **Recursos:** AI Full $49.990 has no hard monthly token limit beyond trial (only `AI_PROTECT` 20M), but Pro $19.990 gifting full AI would let $19.990 user consume same as $49.990 — **regala 30k margen**.

**No recomendar:** `Pro includes AI full` (Option B) — economically decoupled, AI no trial limits for `pro_limited` would be abused (20M tokens/month for 19.990 vs 49.990 same).

---

## 7. Required Changes (if Pro includes AI limited)

- `src/lib/aiFeatures.ts:44` add `pro_limited: ['document_analysis', 'case_chat']` + `AI_PRO_LIMITS` (1 case, 3 docs)
- `server.mjs:7448 getAILawyerAccess` → `if (await hasProAccess(userId)) return limitedAccess` (check `lawyer_subscriptions` before `ai_subscriptions`)
- `src/components/legalup-pro/ProPricingModal.tsx:22` perks already says `LegalUp AI integrado` — keep, but add footnote `* Versión limitada (1 caso, 3 docs). AI Full $49.990`
- No DB migration, no MP change, no webhook change

**Impact:** 1 file, 3 lines, no MP, no RLS

---

## 8. Commercial Implication

**¿Podemos vender Pro a $19.990 sin destruir AI a $49.990?**

**Sí, si Pro incluye AI limitado, no Full.** `Pro $19.990` con `AI limitado (1 caso, 3 docs)` es **valor percibido** sin regalar `AI Full` (10 docs, ilimitado cases post-trial, research). `AI Full $49.990` permanece como upsell `AI` para power users.

**¿Cómo presentar AI dentro de Pro según código?**

- `ProPricingModal` perks `LegalUp AI integrado` es **correcto** si se entiende como `AI limitado` — actualmente código **no** lo cumple (Pro no da AI), por eso es **P1 copy drift**. Código permite distinguir `pro_limited` vs `essential` (1 file), por lo que copy debe aclarar `* AI limitado incluido. AI Full $49.990 para uso ilimitado` para no prometer `AI Full` por $19.990.

**Si vendemos Pro $19.990 con AI Full hoy (sin código):** técnicamente `Pro` no activa `AI`, usuario pagaría $19.990 y seguiría bloqueado en `AICaseDetail` — **soporte + churn**.

---

## 9. Final Recommendation

**ARCHITECTURE CLEAR — proceed to implementation (1 file) — DO NOT CODE YET — pricing decision required**

**Recomendación:** Antes de implementar paywall Pro (3B-2), decidir **Pro $19.990 incluye AI limitado (1 caso/3 docs) vs no incluye**. Código actual soporta ambos, pero copy `AI integrado` sugiere **limitado**. Implementar bridge `getAILawyerAccess → hasProAccess` con `pro_limited` (1 file) y ajustar `ProPricingModal` footnote. No crear `bundle` ni regalar `AI Full`.

**No code changes in this audit.**
