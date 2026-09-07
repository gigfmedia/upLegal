# FASE 3B-2.2 — AI Limited Validation — Pro $19.990 incluye AI limitado?

**Modo:** REVIEW ONLY — NO CODE CHANGES  
**Fecha:** 2026-09-06

---

## STATUS

**PASS — safe to implement Pro Limited AI (1 caso / 3 docs) with 1-file backend change, no new subscription row, no new MP**

Pro ACTIVE **no** debe desbloquear AI Full hoy, pero **puede** desbloquear AI Limited de forma segura con cambio mínimo y backend-enforced. AI Full permanece protegido.

---

## 1. Current AI Enforcement

| Endpoint/Feature | Entitlement | Limit aplicado | Backend enforced |
|------------------|-------------|----------------|------------------|
| `POST /api/ai/documents/:id/process` `8045` | `requireAIEntitlement` `8054` → `hasAccess` | `checkAILimits` `AI trial 3 cases /10 docs` | **YES** `402 AI_PLAN_REQUIRED` |
| `POST /api/ai/documents` `upload` | `requireAIEntitlement` | same | YES |
| `POST /api/ai/cases` `create` | `requireAIEntitlement` + `ai_enforce_trial_limits` trigger | 3 cases | YES (DB trigger `ai_enforce_trial_limits`) |
| `POST /api/ai/chat` `case_chat` `8304` | `canUse('case_chat')` + `requireAIEntitlement` | same | YES |
| `POST /api/ai/research` `jurisprudence` `8335` | `canUse('jurisprudence')` | same | YES |
| `GET /api/ai/subscription` | `getAILawyerAccess` | — | YES |
| `AI workspace` `LegalUpAIWorkspace:227` | `hasAccess` `enabled = available && hasAccess` | UI `bg-gray-50` | NO (frontend) |
| `AICaseDetail` `canAnalyze/canChat/canResearch` `65` | `useAIFeatureAccess` `canUse` | UI lock `Ver planes` | NO, but backend also |

**All AI mutations go through `requireAIEntitlement` + `checkAILimits`/`ai_enforce_trial_limits` — backend is authority.**

---

## 2. Current Limits

- **Source:** `src/lib/aiFeatures.ts:36` `AI_LIMITS trialMaxCases 3, trialMaxDocuments 10` — UI guidance, backend authority `server.mjs:7664 checkAILimits` + DB trigger `supabase/migrations/20260804010000:94 ai_enforce_trial_limits`
- **Enforcement:** `checkAILimits` `7664` → `if (!access?.isTrialing) return null` — **only if `isTrialing` true**, else unlimited. `ai_is_lawyer_on_trial` `70` checks `status trialing OR (active/cancelled/past_due AND period_end <= now AND trial_ends_at>now)` — trial window.
- **Applies to:** `isTrialing` only. `isActive` Essential → unlimited (no `3/10` limit). `past_due/expired` → blocked unless withinTrial.
- **Frontend vs backend:** `aiFeatures.ts:52` `canUseAIFeature` plan `free: []` `essential: all` — frontend, but backend `402` is authority.
- **Trial vs paid:** `trialing` limited, `active` unlimited — correct.

---

## 3. Pro Limited Feasibility

> ¿Puede Pro ACTIVE recibir AI Limited sin crear ai_subscriptions?

**YES — without new row.**

`getAILawyerAccess` currently:

```js
// server.mjs:7455
const subscription = await getAILawyerSubscription(userId); // ai_subscriptions
hasAccess = (status trialing/active/cancelled with period/trial)
```

Pro Limited can be implemented as:

```js
// In getAILawyerAccess, before ai_subscriptions check:
const proAccess = await getProLawyerAccess(userId);
if (proAccess.hasAccess) {
  return { hasAccess: true, plan: 'pro_limited', isProLimited: true, ... };
}
// else fall through to ai_subscriptions logic
```

**No** `INSERT ai_subscriptions` needed for Pro. `lawyer_subscriptions` `active` + `pro_limited` plan is enough. `ai_subscriptions = NULL` + `lawyer_subscriptions active` → `AI Limited`.

**DB:** No new migration, no `ai_subscriptions` row for Pro. `lawyer_subscriptions` already `active` is source.

---

## 4. AI Full Protection

> ¿Puede Pro obtener AI Full accidentalmente?

**NO — if implemented correctly, but YES with naive bridge.**

**Naive bridge (BAD):** `if (hasProAccess) hasAccess = true` without plan distinction → `canUseAIFeature('jurisprudence', 'essential')` would return `true` for Pro, and `checkAILimits` would return `null` (unlimited) because `isTrialing false` → **Pro Limited becomes AI Full unlimited + research**.

**Safe bridge:** Must return `plan = 'pro_limited'` and `canUseAIFeature` must check `pro_limited: ['document_analysis','case_chat']` (2 of 5), and `checkAILimits` must enforce `1 case /3 docs` for `pro_limited` (new limits), not `trialing` only.

**Current code without change:** `Pro ACTIVE` still `AI` **blocked** (`hasAccess false`) — **safe**, no leak. Naive 1-line fix would leak.

---

## 5. Research Protection

- **Endpoint:** `POST /api/ai/research` (`jurisprudence`) `8335` → `canUse('jurisprudence')` + `requireAIEntitlement`
- **UI gate:** `AICaseDetail:538` `!canResearch → Card lock Ver planes` (`565`)
- **Backend:** `requireAIEntitlement` + `canUse` — **not** `checkAILimits` (research not counted in 3/10).
- **Pro Limited → NO research:** Must have `PLAN_FEATURES.pro_limited = ['document_analysis','case_chat']` without `jurisprudence`. Then `canUse('jurisprudence','pro_limited') → false` → 402. **Current** `pro_limited` not in `PLAN_FEATURES`, so naive bridge would give `research` if using `essential`.

**Result:** `Pro Limited → NO research` **only if** new plan added correctly.

---

## 6. Entitlement Precedence

**Current `getAILawyerAccess` returns:**

```js
{ hasAccess: boolean, plan: 'essential'|'free', isTrialing, isActive, ... }
```

**Proposed precedence (safe):**

```
if (aiSubscription status active/cancelled with period > now) → AI FULL (essential, unlimited, research)
else if (aiSubscription trialing with trial_ends_at>now) → AI TRIAL (essential, 3/10, no research? actually trial has all features but limited)
else if (proSubscription active/cancelled with period>now) → AI PRO LIMITED (pro_limited, 1/3, no research)
else → AI PAYWALL (free, [])
```

**No AI + Pro ACTIVE → AI PRO LIMITED** (1 case, 3 docs, no research)

**No AI + NO Pro → PAYWALL**

**AI TRIAL + Pro ACTIVE** → AI TRIAL takes precedence (TRIAL 3/10 vs PRO 1/3 — TRIAL more generous, but both limited; could choose max).

---

## 7. Required Code Changes (NO IMPLEMENT — list only)

1. **`src/lib/aiFeatures.ts:43`** — Add `pro_limited: ['document_analysis','case_chat']` + `AI_PRO_LIMITS = { maxCases:1, maxDocuments:3 }`
2. **`server.mjs:7455 getAILawyerAccess`** — Prepend `proAccess = await getProLawyerAccess(userId); if (proAccess.hasAccess) return { hasAccess:true, plan:'pro_limited', isProLimited:true, trialDaysRemaining:0, ... }` before AI logic, with `checkAILimits` handling `pro_limited` (new branch: if `plan==='pro_limited'` check 1/3)
3. **`server.mjs:7664 checkAILimits`** — Add `if (access.isProLimited) { check 1 case /3 docs }` (reuse same counts but different max)
4. **`ProPricingModal.tsx:22`** — Update perk `LegalUp AI integrado*` footnote `* AI limitado: 1 caso, 3 docs. AI Full $49.900` (already suggests)
5. **No DB migration**, no new `ai_subscriptions` row for Pro, no new MP

**Impact:** 1 file (`aiFeatures.ts`) + 1 file (`server.mjs` 2 functions) — no MP, no RLS, no webhook, no new table.

**Risk if not done:** Pro would either remain AI blocked (current, safe but copy drift) or naive 1-line bridge would give AI Full (leak).

---

## 8. Risks

- **P0:** Naive `hasProAccess → hasAccess` without `pro_limited` plan gives **AI Full unlimited** for $19.990 (vs $49.990) + `research` — revenue cannibalization, resource abuse (20M tokens for 19.990)
- **P1:** `checkAILimits` currently `if (!isTrialing) return null` — `pro_limited` would be unlimited unless new branch added
- **P1:** `ai_enforce_trial_limits` trigger (DB) only checks `ai_is_lawyer_on_trial` (trial), not `pro_limited` — DB would allow unlimited `ai_workspaces` for Pro Limited beyond 1 case unless trigger extended or `checkAILimits` alone is relied upon (frontend can be bypassed, so DB trigger should also enforce 1/3 for `has_pro_access`)
- **P2:** `Pro + AI ACTIVE` precedence — if both, should give `AI Full` (more generous), not `pro_limited`
- **INFO:** `trial` vs `pro_limited` both limited but different max (3/10 vs 1/3) — need clear UX copy

---

## 9. Final Recommendation

**PASS — safe to implement Pro Limited AI with 1-file + 2-function change, no new subscription row, no new MP**

**Conditions:**
1. Add `pro_limited` plan to `PLAN_FEATURES` with 2 features, no `research`
2. Update `getAILawyerAccess` to return `pro_limited` when `hasProAccess` and no AI active/trial
3. Update `checkAILimits` to enforce 1/3 for `pro_limited` (backend, not frontend)
4. Optionally extend `ai_enforce_trial_limits` DB trigger to also check `has_pro_access` for `pro_limited` 1/3 (or rely on `checkAILimits` only — document as P1)
5. Update `ProPricingModal` footnote to `AI limitado`

**Do not implement:** `Pro includes AI Full` (would require no code but destroys $49.990 positioning), `bundle` new plan, `addon` new MP.

**Next:** Implement `pro_limited` (1 file) then re-run `phase3B-2.2` validation.

**No code changes in this audit.**
