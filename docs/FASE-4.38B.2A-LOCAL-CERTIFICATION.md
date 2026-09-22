# FASE 4.38B.2A — Local production-schema certification

Status: PASS. Production migration NOT applied. No production queries, provider calls, deploy, commit or push in this phase.

## Restore and isolation

Source: verified production logical snapshot `2026-09-22T01:05:02.944009+00:00`, outside repository at `/Users/juanguajardo/legalup-backups/2026-09-22-010502-UTC/`. All SHA256SUMS entries reverified before testing.

Target: disposable `legalup-recovery-438b2`, image `public.ecr.aws/supabase/postgres:17.4.1.054`, PostgreSQL 17.4, network `none`, no published ports. Restored using the previously certified extension prelude, roles, expanded schema, data and migration-history artifacts. The full snapshot remains private; tests output no restored messages/documents. Only synthetic identities/resources/attempts are used by the regression.

A clean restore was repeated before the final successful run. The transient startup attempt encountered missing `vault` during bootstrap and rolled back; the subsequent restore completed successfully after bootstrap finished.

## Reproduction and correction

Applied `20260928000000_ai_operation_metering.sql` locally first. Pre-fix contract asserted: nullable NO, default 0.

One synthetic case-chat operation, one succeeded synthetic provider attempt: prompt 6495, completion 2400, total 8895, actual USD 0.0003699, estimate NULL. Exact settlement RPC rejected compatibility INSERT with SQLSTATE **23502**, `null value in column "estimated_cost_usd"`. Operation stayed reserved with quota zero and no compatibility row.

Applied `20260929000000_ai_usage_unknown_estimated_cost.sql` locally. Post-fix: nullable YES, default 0 preserved. Public table/view column catalogs match except this nullability flag. Historical ai_usage row digest and relation filenode unchanged: no backfill or table rewrite observed.

Retried the same settlement: succeeded, quota 1, one compatibility row, one unchanged provider attempt, tokens and actual cost preserved, estimate NULL. Replayed settlement and begin-operation: terminal response reused, no duplicate charge/attempt/row.

Legacy omitted value evaluates equal to zero; explicit NULL remains NULL. A separate known-estimate operation persists 0.02 normally. Monthly synthetic total: two successful chats, 8995 tokens, no reservation; all reconciliation deltas zero. Historical numeric rows remain unchanged.

## Executed tests

- `AI_RESTORED_SCHEMA_CONTAINER=legalup-recovery-438b2 npx vitest run server/ai/legacyCost.productionSchema.test.mjs`: **5 passed**, 36.81s. Output `/tmp/legalup-438b2a-restored-tests.log`.
- `AI_METERING_TEST_CONTAINER=legalup-ai-metering-438b npx vitest run server/ai/metering.postgres.test.mjs`: **21 passed**, 142.07s, including five prepared compatibility regressions. Output `/tmp/legalup-438b2a-pg-tests.log`.
- ESLint both modified test files: PASS. `git diff --check`: PASS.

First restored-schema test run: 4 passed, 1 assertion failure comparing textual `0.00000000` against `0`. Corrected assertion to SQL numeric equality (not weakened semantics), restored cleanly, reran all five successfully.

The five new restore tests require a dedicated pre-metering production restore and explicitly reject any other container, network access, published ports, unexpected PostgreSQL/image or already-installed metering tables. They do not use the historical hand-built fixture. The 21-test suite additionally exercises concurrency, access controls and fail-closed behavior in a separate disposable database.

## Production boundary

No linked DB command or production read/write was executed in this phase. Consequently this phase did not alter production migration history, its reserved operation or provider attempts. Their current external state was not independently reread. No provider was called locally or remotely.

Prepared migration, nullable types and tests remain uncommitted. Existing reports from earlier phases were not changed. No application/runtime/product modifications were introduced.

Ready to resume the explicitly authorized production-fix phase: **YES**. This report does not authorize or certify applying that production migration or recovering the production operation. No 4.38C work started.
