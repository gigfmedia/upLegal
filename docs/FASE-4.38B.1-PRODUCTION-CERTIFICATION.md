# FASE 4.38B.1 — production certification

Status: BLOCKED. Stop condition reached during the first controlled Case Chat request. No document chat, analysis, research or repeated provider request was run afterward. No corrective migration was applied.

## Preflight and release

Recovery snapshot `~/legalup-backups/2026-09-22-010502-UTC/`: all six SHA256 checks passed; directory 0700/files 0600. Fresh production counts and public schema object counts matched that snapshot. `docs/PRODUCTION-DB-RECOVERY.md` exists and remained outside deployed code.

HEAD and origin/main were already `a0abb89b32783471b9656c715fd0c15135896446`, one SEO-copy commit after `c69a84f`. Netlify reported that same revision published/ready at 2026-09-22T01:35:22.884Z before this resumed execution. No additional push or deployment was initiated in this phase. Render served the new `X-AI-Operation-ID` CORS contract and the live request wrote the new metering tables. Exact Render SHA, private server logs and environment configuration could not be independently verified through the available deployment credentials.

Only pending migration `20260928000000_ai_operation_metering.sql` was applied through `supabase db push --linked --yes`. Migration history and actual remote objects were inspected afterward; CLI exit alone was not used as proof.

## Verified schema and authority

- New operations/attempt tables, expected foreign keys, checks and indexes exist.
- Unique `(lawyer_id,idempotency_key)` and `(operation_id,attempt_number)` exist; compatibility ledger has a unique operation index.
- Both new tables have RLS; anon/authenticated have no SELECT or authoritative write grants on them.
- Anon/authenticated have no write grants on legacy usage/summary tables.
- Four new security-definer RPCs use `search_path=public,pg_temp`; executable by service_role only.
- A transaction on the explicitly authorized account tested direct INSERT denial under anon/authenticated, service reservation/failed settlement/replay without a provider attempt, and cross-tenant rejection. It ended with ROLLBACK. No fixture records survived. This no-attempt test did not exercise the compatibility ledger INSERT that failed during live QA.
- Before live QA all 11 historical counts were unchanged, historical new cost fields were NULL and reconciliation had zero deltas/pending operations.

## One authorized live request

The user supplied their own account access and explicitly confirmed the selected case/documents were non-sensitive test material. Credentials and document content are intentionally absent from this report.

Opening the Case Chat CTA automatically sent its existing suggested question. No second manual question was sent.

Operation ID: `0577cc54-e39a-46fa-bcda-478cea945331`.

- Capability: case_chat.
- Lawyer/workspace/canonical case links: verified correct with server-side comparisons.
- One logical operation; one provider attempt.
- Requested and returned model: `openai/gpt-oss-20b`.
- Provider attempt status: succeeded; latency 95,525 ms; provider request ID captured.
- Prompt tokens 6,495; completion tokens 2,400; total 8,895.
- Provider-reported actual cost: USD 0.0003699.
- Estimated cost: NULL (no known estimate for the returned model).
- UI terminal error: unable to confirm the request; input became available again.
- Logical operation remained reserved, quota_units=0, response_status=NULL, compatibility ledger rows=0.
- Total usage rows remained 105; chat message count changed from 82 to 83; new operation/attempt counts are 1/1. Successful assistant response delivery is NOT certified.

## Concrete production schema incompatibility

Production `information_schema.columns` shows `public.ai_usage.estimated_cost_usd` is NOT NULL with default 0. In contrast, the historical repository migration `20260804000000_ai_usage_cost_tracking.sql` used by the local PostgreSQL regression fixture declares that column nullable.

The new `ai_finish_operation` explicitly INSERTs the aggregate estimated cost. When an attempt has unknown estimated cost, that aggregate is NULL. An explicit NULL does not use the column default. The deployed legacy NOT NULL constraint therefore rejects this settlement path. The coordinator returns the observed fail-closed error and retains the reservation. No provider call is retried.

Local tests passed against the nullable historical migration fixture, not this stricter deployed column. The migration's postflight object checks alone did not detect this legacy-column compatibility gap before live QA.

Next correction requires separate authorization: preserve unknown-cost semantics (do not fabricate zero), reconcile the deployed legacy column contract with metering, and add regression coverage using the actual production schema/restore. Then explicitly reconcile the existing pending QA operation without calling the provider again. This phase made none of those changes.

## Reconciliation and limits

After the failure, known token/cost totals and reservation deltas remained zero against the attempts/operation ledgers. There is one pending operation; zero numerical deltas do NOT mean end-to-end settlement passed. No unexplained duplicated attempt or charged logical unit was observed.

Research for Pro remains excluded in the feature map. This migration does not alter the 1-workspace/3-document limits, 20-active-case capacity, services access, appointment Pro gate, Founder or pricing. The rate limiter remains process-local. Production `AI_MODEL_COSTS_JSON` presence/validity was not inspectable; only this model's actual unknown estimate was observed.

## Final disposition

- Migration: applied; schema/RLS verified.
- Historical records: preserved; one authorized QA message plus metering evidence added.
- Case Chat: FAIL end-to-end.
- Document Chat/Analysis: NOT TESTED after stop condition.
- Idempotency: PASS at production RPC level in rollback; successful live HTTP replay not tested.
- Fail-closed: observed in production settlement failure.
- Immediate private Render logs: unavailable; browser state and database metadata supplied the evidence.
- Ready for 4.38C: NO.

The QA browser tab was closed. No credentials were written to scripts/docs, no production reconciliation updates were attempted, and no new phase was started.
