# FASE 4.38B — AI usage metering

## Authority and boundaries

The previous handler wrote `ai_usage` and called `increment_ai_usage_monthly` independently, ignored returned database errors, and checked monthly limits fail-open. The new service-only RPCs reserve and settle under a per-lawyer PostgreSQL transaction lock. Failed reservation prevents provider calls. Failed settlement cannot return a successful HTTP result.

`ai_operations` is the logical action ledger. `ai_provider_attempts` records each actual fetch, including HTTP retries, JSON-mode fallback and structured-output retries. One successful logical operation charges one request unit; failed operations charge zero request units. Known tokens and provider costs of failed attempts still count. Deterministic reads, extraction, upload, provisioning and workflow actions do not create metered AI operations.

The scope is authenticated document analysis, case/document chat and legacy-entitled research. The public marketplace assistant is not included. Plans, Founder billing, provider routing, prompts, 1-workspace/3-document limits, Pro research denial and existing 20M tokens/5000 requests monthly defaults remain unchanged. The 30/min limiter remains process-local.

## Idempotency and replay

Frontend hooks persist an opaque SHA256 fingerprint plus random UUID in sessionStorage (memory fallback). The fingerprint scopes authenticated user, capability, resource and action input; analysis includes model, chat includes conversation/message/document, research includes query. No prompt, credential or document content is stored in this browser mechanism. Pending retries and refresh reuse the UUID. A terminal response clears it; an intentional reanalysis or repeated question after completion gets a new UUID.

The server validates `X-AI-Operation-ID`, derives ownership from authentication, hashes normalized input, and enforces unique `(lawyer_id,idempotency_key)`. Same key/different input is rejected. Terminal requests replay stored response without repeating provider or product persistence. Pending duplicate returns 409. Different tabs that independently initiate different UUIDs are distinct user operations; existing document analysis lock still protects simultaneous analysis.

Operation rows store private response bodies for replay, service-role only. Logs contain operation/attempt IDs, model, status and timing, not legal text. Existing legacy data is not backfilled into invented attempts.

## Database objects

Migration: `20260928000000_ai_operation_metering.sql`.

- Tables: `ai_operations`, `ai_provider_attempts` (RLS enabled, no normal-client grants).
- `ai_usage.operation_id`: unique partial index for one compatibility ledger row per operation with attempts. Pre-provider failures leave no fabricated legacy usage row.
- Monthly additions: reserved operations/tokens, nullable known actual/estimated cost subtotals, unknown metadata counters, immutable historical `metering_baseline`.
- Functions: `ai_begin_operation`, `ai_begin_attempt`, `ai_finish_attempt`, `ai_finish_operation`; EXECUTE restricted to service_role.
- Indexes: operation lawyer/period/capability, workspace/time, canonical case, unique idempotency, unique operation/attempt number, unique usage operation.
- Canonical case link is resolved server-side; ambiguous links fail closed. Legacy orphan workspaces retain nullable canonical case linkage. Document and conversation ownership are validated separately.

UTC calendar month is fixed when the logical action begins, including settlement after month rollover. Each attempt reserves serialized input UTF8 bytes + configured max output + 1024 as a conservative token budget, then settles reported tokens. This is an estimate rather than a tokenizer guarantee and can reject close to the monthly ceiling. Unknown provider usage is NULL on attempts and explicitly counted; it is never presented as known zero. Compatibility numeric legacy totals are known subtotals only.

## Cost semantics

Requested model, actual model and provider request ID are separate fields. Prompt, completion and total tokens retain provider metadata when available, including selected reasoning/cache details. Provider-reported `usage.cost` is recorded separately from estimated USD cost. Existing OpenAI rates are estimates, not invoice verification. Explicit known aliases normalize to catalog names; arbitrary suffixes are not stripped. Unknown model cost is NULL. `AI_MODEL_COSTS_JSON` accepts finite nonnegative input/output rates per 1000 tokens; invalid entries and generic default are ignored with value-free warnings.

## Recovery and reconciliation

A crash between provider execution and persistence is intrinsically ambiguous. Reservations never expire into an automatic new provider call. The same operation stays pending/409 until reviewed; this avoids duplicate cost but can consume capacity pending reconciliation. There is no automatic reconciliation worker in this phase.

Use service-only read access:

```sql
SELECT * FROM public.ai_metering_reconciliation
WHERE token_delta <> 0 OR chat_delta <> 0 OR analysis_delta <> 0
   OR research_delta <> 0 OR actual_cost_delta <> 0
   OR estimated_provider_cost_delta <> 0 OR estimated_cost_delta <> 0
   OR reservation_delta <> 0 OR reserved_token_delta <> 0
   OR terminal_operations_without_ledger <> 0
   OR pending_operations > 0 OR unknown_cost_attempts > 0;
```

Deltas compare monthly summary against the frozen historical baseline, charged logical operations and known attempt totals. Pending and unknown rows require interpretation, not automatic correction. Historical baseline accuracy is not certified by this migration.

Operator procedure: locate operation and attempts by ID; verify provider request ID and persisted product result without logging document contents. Obtain reliable completion/usage evidence. Only then use service `ai_finish_attempt` for an unresolved attempt and `ai_finish_operation` for the verified terminal HTTP result. Both are idempotent and preserve the original month. Never fabricate a known cost, blindly release a started attempt, mark an unproven result successful, or invoke a second provider request merely to unblock a reservation. If evidence is unavailable, retain the reservation and escalate reconciliation.

## Staging/deployment

No remote migration or deployment was performed for this phase. Apply and inspect this migration in staging first. Quiesce metered writes for migration/cutover so old backend writers do not invalidate the frozen baseline. Deploy compatible backend and frontend together: old clients without the new header receive a refresh-required 400. Do not run old/new usage writers concurrently during cutover. Existing legacy RPCs remain service-only for compatibility, but the new core routes do not call them.

Staging must verify actual grants/RLS, canonical and orphan flows, duplicate replay, monthly reconciliation, concurrent last-unit reservation, failure injection and legacy entitlements. No real payment or provider usage is required. Production application is a separate step.

## Local evidence

- Relevant regression: 65 files passed, 1033 tests passed; PostgreSQL suite skipped in normal run and executed separately.
- Isolated PostgreSQL 15 (no network/port): 16 tests passed, including real concurrent reservations, same-key duplicates, fail-closed DB errors, settlement rollback, retry totals, ownership, grants and migration reapplication.
- Provider/API calls mocked: zero real LLM calls.
- Build passed. Changed-file lint and diff checks passed.
- Typecheck: baseline HEAD and current both have 328 diagnostics; comparison by file, line/column, TS code and message found zero added/removed diagnostics. Absolute temporary baseline paths were normalized. No unrelated TypeScript cleanup was performed.

Residuals: process-local rate limiting; unavailable actual cost/tokens; conservative reservation estimates; explicit manual recovery after ambiguous crashes; historical baseline not reconstructed; staging certification pending. No new commercial quotas or pricing tiers.

Executed commands:

```sh
./node_modules/.bin/vitest run server/ai src/__tests__/chatLifecycle.test.tsx src/__tests__/analysisModelRecovery.test.tsx src/__tests__/documentsWorkspaceParity.test.tsx src/__tests__/CaseAIEntitlement.test.tsx src/__tests__/aiUsage.test.ts src/__tests__/researchIntegration.test.ts src/__tests__/documentParity.test.ts src/__tests__/aiOperationIdentity.test.ts server/proFounder.test.mjs --maxWorkers=2
AI_METERING_TEST_CONTAINER=legalup-ai-metering-438b ./node_modules/.bin/vitest run server/ai/metering.postgres.test.mjs --testTimeout=30000 --maxWorkers=1
npm run build
npm run typecheck
./node_modules/.bin/tsc --noEmit --skipLibCheck -p /tmp/legalup-438b-baseline-8qjh6i9p/tsconfig.app.json
./node_modules/.bin/eslint server.mjs server/ai/metering.mjs server/ai/metering.test.mjs server/ai/metering.postgres.test.mjs server/ai/modelCosts.mjs server/ai/provider.mjs server/ai/jurisprudencePipeline.mjs server/ai/coreAuthority.test.mjs server/ai/researchIntegration.test.mjs server/ai/fase430b.security.test.mjs src/lib/aiOperationIdentity.ts src/hooks/useAIChat.ts src/hooks/useAIDocuments.ts src/hooks/useAIResearch.ts src/__tests__/aiOperationIdentity.test.ts src/__tests__/analysisModelRecovery.test.tsx
git diff --check
```

The temporary baseline was extracted from HEAD, including unchanged generated types, server/shared modules and Supabase shared authority modules, using the same installed TypeScript compiler. No source changes were applied to the baseline.
