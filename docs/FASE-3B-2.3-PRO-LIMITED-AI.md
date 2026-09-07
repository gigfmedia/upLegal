# FASE 3B-2.3 — Pro Limited AI (1 caso / 3 docs)

**Modo:** IMPLEMENTATION — minimal
**Fecha:** 2026-09-06

---

## Precedence

```
AI ACTIVE (essential, unlimited, research) → AI Full
AI TRIAL (3/10, no research? actually trial has all but limited) → Trial
PRO ACTIVE (pro_limited, 1/3, no research) → Pro Limited
FREE → paywall
AI ACTIVE + PRO ACTIVE → AI Full (pro not downgrade)
```

## Pro Limited Features

`pro_limited: ['document_analysis','case_chat']` — no `jurisprudence`, `document_drafting`, `case_analysis` (if considered premium, but pro_limited only 2)

## Limits

- Pro Limited: 1 caso, 3 docs (enforced backend `checkAILimits` + DB trigger `ai_enforce_trial_limits` with `has_pro_access`)
- AI Trial: 3 cases, 10 docs
- AI Full: unlimited (no check)

## DB Enforcement

Trigger `ai_enforce_trial_limits` now checks `has_pro_access` and `ai_is_lawyer_on_trial` to determine `v_is_pro_limited` vs `v_is_trial`, with `v_max` 1/3 vs 3/10. No new ai_subscriptions row for Pro.

## AI Full Protection

`PRO ACTIVE` alone does not unlock `jurisprudence` (canUse false) and is limited to 1/3, not unlimited. `AI ACTIVE` remains unlimited and with research.

## Tests

FREE blocked, PRO ONLY 1/3, TRIAL 3/10, FULL unlimited, PRO+AI → FULL, etc.

## Risks

P0: none if implemented correctly. P1: DB trigger needs has_pro_access to be stable.

