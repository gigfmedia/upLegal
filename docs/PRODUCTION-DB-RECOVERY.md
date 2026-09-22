# Production database recovery

## Scope and safety

This is a logical database recovery procedure, not a complete Supabase disaster-recovery guarantee. It does not deploy application code or apply pending migrations. A production restore requires a separate authorized maintenance plan; never pipe this procedure into a production connection.

Official reference: [Supabase CLI backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

Never run `supabase db reset --linked`. Never restore a dump into the linked project by accident. Do not run `supabase db push` as part of backup verification. Do not use a production URL/password for the local target.

## Prerequisites

- Authenticated Supabase CLI linked to the intended project; record its non-secret project reference.
- Docker, a compatible Supabase PostgreSQL image, and sufficient disk/memory.
- Private backup directory outside Git: `~/legalup-backups/YYYY-MM-DD-HHMMSS-UTC/`, mode 0700; files mode 0600 (`umask 077`).
- Record UTC time, HEAD, PostgreSQL version, CLI version, critical counts and schema metadata. Do not print user rows, credentials, raw dumps or sensitive restore-error context.
- Stop on a dump error. Preserve original dump files unchanged while diagnosing a local restore.

## Create the backup

Set `backup_dir` to the new private directory (not a repository directory). The authenticated linked workflow avoids exposing a database URL/password in command arguments:

```sh
umask 077
supabase db dump --linked --role-only -f "$backup_dir/roles.sql"
supabase db dump --linked -f "$backup_dir/schema.sql"
supabase db dump --linked --data-only --use-copy \
  -x storage.buckets_vectors -x storage.vector_indexes -f "$backup_dir/data.sql"
```

Save stdout/stderr privately and check every exit code and file size. The standard schema dump excludes managed Auth/Storage table definitions although data includes their rows. For a faithful restore onto an older disposable local image, capture an expanded dependency schema and migration history:

```sh
supabase db dump --linked --schema public,auth,storage,extensions,vault \
  -f "$backup_dir/restore-schema.sql"
supabase db dump --linked --schema supabase_migrations -f "$backup_dir/history-schema.sql"
supabase db dump --linked --schema supabase_migrations --data-only --use-copy \
  -f "$backup_dir/history-data.sql"
```

The explicit-schema dump does not include extension creation statements in CLI 2.108.0. Retain `schema.sql`: its `CREATE EXTENSION` statements must be executed before the expanded schema. Preserve both files; do not overwrite a dump with a hand-edited variant.

Record byte sizes and SHA-256 in `backup-manifest.json` and `SHA256SUMS`. Before restore, run `shasum -a 256 -c SHA256SUMS` from the backup directory. Logical split dumps are separate snapshots. Do not claim a globally atomic cross-file snapshot; compare data COPY counts and pre/post production counts, and identify any concurrent changes.

## Isolated local restore

Certified image: `public.ecr.aws/supabase/postgres:17.4.1.054` (PostgreSQL 17.4). A generic PostgreSQL image lacks Supabase roles, extensions and managed dependencies.

Create a uniquely named disposable container with:

- `--network none`, no published ports;
- `--tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,size=2g` for this snapshot;
- a randomly generated **local-only** `POSTGRES_PASSWORD`, passed through environment without printing it;
- command `postgres -D /etc/postgresql -c listen_addresses= -c cron.launch_active_jobs=off`.

Do not use `POSTGRES_HOST_AUTH_METHOD=trust` as a substitute for the image's bootstrap password: the first empty-container startup failed without a password. This was local-only and the empty container was replaced.

Verify `docker inspect` shows network `none`, no port bindings, and the expected container name. Query through `docker exec`, never through a linked/database URL. Confirm `current_database() = postgres`, `inet_server_addr() IS NULL`, server version 17.4, and cron jobs disabled.

Use `psql -X -U supabase_admin -d postgres --single-transaction -v ON_ERROR_STOP=1` inside that container. Set `PGPASSWORD` from the container's local `POSTGRES_PASSWORD`. Feed the following in order:

1. Exact `CREATE EXTENSION ...` lines extracted from original `schema.sql`.
2. `SET session_replication_role = replica;`.
3. On this **empty disposable target only**, drop bootstrap `auth` and `storage` schemas with CASCADE. This avoids retaining outdated managed columns/constraints under `IF NOT EXISTS`.
4. `roles.sql`.
5. `restore-schema.sql` (public plus complete managed dependencies).
6. `data.sql`.
7. `history-schema.sql`, then `history-data.sql`.
8. `SET session_replication_role = origin;`.

The complete stream is a single transaction. Any SQL error must stop and roll back, not be ignored. Preserve private logs. Expected dump warnings about circular foreign keys are handled by replica mode during data load. Validate constraints/schema after restoring; do not weaken production permissions.

An initial local restore omitted the extension prelude and failed on the UUID GiST operator class. It rolled back completely. The corrected order above succeeded with zero SQL errors. Original backup files were not changed.

## Verification

Compare counts for `ai_usage`, `ai_usage_monthly`, `ai_workspaces`, `ai_documents`, `ai_chat_messages`, `ai_research_requests`, `profiles`, `lawyer_cases`, `lawyer_clients`, `bookings`, and `lawyer_services`.

Additionally parse each COPY section in `data.sql` without displaying rows, count data lines until `\.` and compare against the corresponding restored table. Compare public tables, views, functions, non-internal triggers, indexes, constraints, policies and RLS-enabled table counts. Check the migration history excludes unapplied migrations.

Typical metadata-only checks:

```sql
SELECT schemaname, count(*) FROM pg_policies GROUP BY schemaname;
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relrowsecurity;
SELECT version FROM supabase_migrations.schema_migrations
WHERE version='20260928000000'; -- absent in this pre-metering snapshot
```

Keep reconciliation evidence beside the dumps. After verification stop/remove only the named disposable container (including its anonymous volumes). Because PGDATA is tmpfs, stopping removes that live data copy. Preserve verified dump files; do not remove the only backup.

## Coverage and limitations

- Public application schema and data, including RLS/policies/functions/triggers, are restored.
- Expanded schema plus data restored Auth tables, including users/identities and associated records. No login was attempted. OAuth configuration, JWT/signing settings, external provider credentials, Edge Functions and hosted Auth service configuration are not proven recoverable by this database test.
- Auth/Storage migration bookkeeping managed by the platform is not certified by this application clone; a new hosted Supabase project may require compatible service versions and separate platform configuration.
- Storage buckets/object metadata restored; actual object bytes were **not downloaded or backed up**. Database metadata alone cannot recover missing files. The 4.38B migration does not mutate Storage.
- Managed roles depend on the matching image/platform bootstrap. The small roles dump does not recreate every platform-owned role or original login password.
- Vault/encryption root keys, external secrets, scheduled jobs, realtime publication configuration and infrastructure are not a complete recovery claim. CLI exclusions/sanitization and managed state require separate review for a full platform migration. No new network-capable services were started in the restore target.
- Backup is local and access-restricted, not an off-site encrypted disaster-recovery system. This phase did not introduce encryption or claim protection from loss of the host.

## Certified snapshot — 2026-09-22 UTC

- HEAD: `c69a84f4910df05a80d6d285bcba5e0d8258e6fe`.
- Project: `lgxsfmvyjctxehwslvyw`; CLI 2.108.0; PostgreSQL 17.4.
- Artifacts: `/Users/juanguajardo/legalup-backups/2026-09-22-010502-UTC/`.
- Standard dumps: roles 297 bytes; schema 352,123 bytes; data 86,188,144 bytes.
- Supplements: expanded schema 446,612 bytes; history schema 1,422 bytes; history data 164,820 bytes.
- 106 COPY tables / 178,995 rows reconciled exactly to the restored snapshot.
- Critical precheck counts: usage 105; monthly 2; workspaces 2; documents 4; chat messages 82; research 13; profiles 52; cases 2; clients 7; bookings 4; lawyer services 20.
- Public metadata counts match: 75 tables, 0 views, 263 functions, 45 non-internal triggers, 252 indexes, 278 constraints, 235 policies, 75 RLS-enabled tables.
- Storage metadata: ai-documents 3 objects / 1,034,022 known bytes; avatars 38 / 19,360,367; documents 39 / 8,384,000. No object file contents included.
- Standard dump execution: approximately 242 seconds; supplemental dumps approximately 114 seconds. Successful restore: approximately 38 seconds (excluding image/bootstrap and verification).
- No production migration, application deployment or application-data mutation was performed. CLI's normal temporary login-role authentication is not an application-data write.

A fresh preflight is still required when resuming 4.38B.1. This verified snapshot makes recovery practical; it does not authorize production migration within this phase or remove the need to select a controlled QA case/document.

Final read-only production check: all 11 critical counts still match the precheck. `ai_operations` and `ai_provider_attempts` remain absent; migration `20260928000000` remains unapplied. All six dump checksums verified successfully. Backup directory is 0700 and every artifact file is 0600.
