# FASE 4.56B — Current plan commercial consistency

Status: PASS in code, relative to verified baseline. Production QA pending; no push/deploy.

## Contract communicated

| Capability | Tu primer caso | LegalUp Pro |
|---|---|---|
| Direct cases | One lifetime | Up to 20 active; closed cases free capacity |
| Clients | Creating clients requires Pro | Unlimited |
| Documents | 2 currently stored | 50 currently stored; not per month |
| AI questions | 3 total, shared case/document chat | 300/month, shared case/document chat |
| Document analysis | 1 total | 40/month |
| Legal research | 1 total | 10/month |
| Case state and chronology | Included | Included |
| Command Center | Pro required | Advanced view of facts, risks and pending work |
| Manual appointments | Pro required | Included |
| Marketplace services / revenue | Independent of Pro | Also available |

Evidence: `server/ai/proAllowance.mjs` defines existing 3/1/1/2 lifetime and 300/40/10/50 monthly/current allowances. Client INSERT still requires `has_pro_access` (`20260911000000_pro_gates.sql`); no client-policy changes. Existing capacity, first-case, appointment and allowance authorities remain untouched.

Landing now names the $0 offer **Tu primer caso**, acknowledges included limited AI and explicit non-renewing allowances. Existing signup/dashboard routing and analytics preserved. Paid modal lists limits and stored-document semantics. Founder remains the same Pro capabilities, first 15 distinct payers, first three successful payments $19.990 then $49.990; cancellation/reactivation does not reset count. No price resolver or checkout changes. Standard modal no longer displays Founder badge.

## Retired acquisition and legacy compatibility

- Admin campaign card, selection dialog and send action removed.
- Existing authenticated admin route `/api/admin/ai/send-lawyer-invite` remains behind `requireAdmin`, returning HTTP 410 `AI_TRIAL_INVITE_RETIRED`; no DB/email/provider calls.
- Historical `buildLegalUpAIInviteEmail` template retained inert (definition only, no caller). Campaign history untouched.
- `AIPricingModal` remains the shared compatibility entry point and renders canonical `ProPricingModal`; it cannot start a trial or standalone checkout.
- `AISubscriptionCard` remains behind `legacyAISubscription` in ProfilePage; cancellation, dates and legacy access preserved. Removed Essential price/renewal acquisition offer; historical status uses neutral language.
- `AISubscriptionBanner` currently has no production import outside its own module. Retained safely for reuse: existing access hides it; otherwise acknowledges limited first-case AI and offers Pro.
- Legacy lifecycle notification templates retain existing triggers and dates, remove $49.900 acquisition offers, direct continuation to /pro and identify historical AI subscriptions accurately. No entitlement or subscription logic changes.
- Public /ai remains AI-oriented acquisition for Pro and now also acknowledges limited first-case usage. Existing demos/SEO/attribution preserved.

## Search classification

| Remaining matches | Classification |
|---|---|
| Current Pro/first-case landing, pricing/compatibility modals | CURRENT VALID: no trial offer, Essential sale or $49.900 |
| Admin magic-link copy “No otorga Pro ni trial” | CURRENT VALID: explicit denial, not a trial promise |
| aiFeatures legacy constants, subscription enum/hooks, generated DB types | LEGACY-INTERNAL; no current pricing UI consumer of AI_SUBSCRIPTION_PRICE_LABEL |
| Existing legacy trial lifecycle notifications, expiry dates | LEGACY-INTERNAL: historical access only; no new acquisition/standalone price |
| Inert admin invite template and its historical subject/$49.900 | DEAD: no caller; retired endpoint returns 410 |
| /ai legal examples containing “5 días hábiles”, “prueba documental” | CURRENT VALID: legal example, not commercial trial |
| /ai old email UTM campaign handling | LEGACY-INTERNAL attribution, no acquisition action |
| Trial/price strings in test fixtures | TEST |
| Empresas trial state and juridical blog deadlines | CURRENT VALID outside Pro offer; left unchanged |

Primary commercial terminology is **Investigación jurídica**. Jurisprudencia remains valid as a source category or internal compatibility name. Landing source scope is Tribunal Constitucional, BCN/LeyChile and OpenAlex, without comprehensive-coverage claims. Command Center is described as a view, not a quota-consuming LLM operation. AIUsageMeter already distinguishes “Tu primer caso incluye” from monthly usage; left unchanged. Existing free quota error copy correctly identifies 2 documents, 3 questions, 1 analysis and 1 research; Pro modal now supplies exact continuation limits.

## Validation

Executed targeted batch: 12 files, 121 passed (landing/matrix, modal/Founder, usage allowances, trial, legacy navigation compatibility, service access, backend Founder/allowance, retired admin handler). Added legacy cancellation/banner assertions afterward: 8/8 passed including repeated core tests, two additional unique tests.

Initial broader batch: 102 passed, 11 failed. All 11 also fail on pristine HEAD `05093bf` in an isolated source snapshot (11 failed / 14 passed): two stale Dashboard/legacy-trial assertions in firstFreeCopy; nine stale standalone-workspace expectations in aiCanonicalAcquisition now that current navigation redirects canonical Cases. No changes to those components/tests and no weakening of assertions. The /ai public acquisition test itself passed.

Commands:

- `npx vitest run src/__tests__/currentPlanCopy.test.tsx src/__tests__/proFreeProPricing.test.ts src/__tests__/proFounderModal.test.tsx src/__tests__/proAllowance.test.tsx src/__tests__/serviceNoPro.test.tsx src/__tests__/proCommercialRules.test.ts src/__tests__/dashboardTrialCard.test.ts src/__tests__/aiTrial.test.ts src/__tests__/navigationCompat.test.tsx server/retiredAITrialInvite.test.mjs server/proFounder.test.mjs server/ai/proAllowance.test.mjs`
- `npx vitest run src/__tests__/currentPlanCopy.test.tsx server/retiredAITrialInvite.test.mjs` after two additional assertions.
- Baseline: identical firstFreeCopy/aiCanonicalAcquisition tests against git archive HEAD, Node 22, dummy Supabase URL/key; no real provider/email calls.
- `npm run build`: PASS.
- `npm run typecheck`: FAIL due to baseline diagnostics. Pristine HEAD has 328; current code has 327. Compared by file/code/message with snapshot-root paths normalized: no new diagnostics, one removed in the legacy subscription status map. No diagnostics in modified files. No PASS claimed for the global compiler.
- ESLint modified files: no new errors; 8 existing errors (7 LegalUpPro, 1 ProPricingModal), same rules/locations in original expressions on baseline HEAD. New files, legacy components, admin page and server.mjs pass. Baseline errors not fixed outside copy scope.
- `git diff --check`: PASS.

No schema, migration, quotas, feature maps, pricing, Founder ranking, entitlement, provider calls, emails or production mutations. No Plus plan/flag/UI. Existing untracked `docs/audits/` is excluded. Commit message: `fix(pro): align plan limits and commercial copy`. Push: NO.

Ready for production QA: YES after normal deployment. Plus design only after that QA; no Plus work started.
