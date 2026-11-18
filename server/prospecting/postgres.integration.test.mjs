// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const DATABASE_URL = process.env.PROSPECTING_TEST_DATABASE_URL || '';
const ALLOW_RESET = process.env.PROSPECTING_TEST_ALLOW_RESET === '1';

const migrationFiles = [
  '../../supabase/migrations/20261105004400_prospecting_automation.sql',
  '../../supabase/migrations/20261105225853_prospecting_quality_limits.sql',
  '../../supabase/migrations/20261106120000_prospecting_quality_version.sql',
  '../../supabase/migrations/20261116000000_prospecting_block3_ledger_guard.sql',
  '../../supabase/migrations/20261116000100_prospecting_block3_ledger_backfill.sql',
  '../../supabase/migrations/20261116000200_prospecting_block3_permissions.sql',
];

const migrations = migrationFiles.map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));

function assertSafeReset() {
  if (!ALLOW_RESET) throw new Error('PROSPECTING_TEST_ALLOW_RESET=1 required');
  const database = new URL(DATABASE_URL).pathname.replace(/^\//, '');
  if (!database.includes('prospecting_test')) {
    throw new Error(`refusing to reset non-test database: ${database}`);
  }
}

const skip = (!DATABASE_URL || !ALLOW_RESET) ? 'PROSPECTING_TEST_DATABASE_URL and PROSPECTING_TEST_ALLOW_RESET=1 required' : false;

let primary;
let secondary;
let beforeCutoff;
let operationNow;

async function asServiceRole(client, fn) {
  await client.query('begin');
  await client.query('set local role service_role');
  try {
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

async function createSendFixture(suffix) {
  const email = `${suffix}@estudio.example`;
  const prospect = await primary.query(`
    insert into public.prospects (dedupe_key, email, firm_name, source, status, validation_status, validated_at)
    values ($1, $2, $3, 'test', 'validated', 'valid', now())
    returning id
  `, [`email:${email}`, email, `Estudio ${suffix}`]);
  const run = await primary.query(`
    insert into public.prospecting_runs (run_key, trigger, mode, status)
    values ($1, 'manual', 'send', 'running')
    returning id
  `, [`manual:${suffix}`]);
  const send = await primary.query(`
    insert into public.prospecting_sends
      (run_id, prospect_id, to_email, subject, html, idempotency_key, status)
    values ($1, $2, $3, 'Asunto', '<p>hola</p>', $4, 'queued')
    returning id
  `, [run.rows[0].id, prospect.rows[0].id, email, `send-${suffix}`]);
  return {
    email,
    prospectId: prospect.rows[0].id,
    runId: run.rows[0].id,
    sendId: send.rows[0].id,
  };
}

async function claimFixture({ sendId, runId, now = operationNow }) {
  const result = await asServiceRole(primary, (client) => client.query(
    'select public.prospecting_claim_send_attempt($1,$2,$3::timestamptz) as result',
    [sendId, runId, now],
  ));
  return result.rows[0].result;
}

async function revalidateFixture({ attemptId, now = operationNow }) {
  const result = await asServiceRole(primary, (client) => client.query(
    'select public.prospecting_revalidate_attempt_day($1,$2::timestamptz) as result',
    [attemptId, now],
  ));
  return result.rows[0].result;
}

describe.skipIf(skip)('prospecting block 3 PostgreSQL contract', () => {
  beforeAll(async () => {
    assertSafeReset();
    const { default: pg } = await import('pg');
    const { Client } = pg;
    primary = new Client({ connectionString: DATABASE_URL });
    secondary = new Client({ connectionString: DATABASE_URL });
    await primary.connect();
    await secondary.connect();
    await primary.query('drop schema if exists public cascade');
    await primary.query('create schema public');
    await primary.query('create extension if not exists pgcrypto');
    await primary.query(`
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
        if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
        if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role bypassrls; end if;
      end $$;
    `);
    await primary.query('grant usage on schema public to public');
    await primary.query('grant all on schema public to service_role');
    await primary.query('create table if not exists public.profiles (id uuid primary key);');
    for (const sql of migrations) {
      await primary.query(sql);
    }
    const cutoff = await primary.query('select ledger_cutoff_at from public.prospecting_settings where id = 1');
    const cutoffMs = new Date(cutoff.rows[0].ledger_cutoff_at).getTime();
    beforeCutoff = new Date(cutoffMs - 60_000).toISOString();
    operationNow = new Date(cutoffMs + 60_000).toISOString();
  }, 120000);

  afterAll(async () => {
    await primary?.end();
    await secondary?.end();
  });

  it('cierra el backfill con ledger_ready=true y cutoff persistido', async () => {
    const result = await primary.query(`
      select ledger_ready, ledger_cutoff_at, octet_length(recipient_hash_key) as key_len
      from public.prospecting_settings where id = 1
    `);
    expect(result.rows[0]).toMatchObject({ ledger_ready: true });
    expect(result.rows[0].ledger_cutoff_at).toBeTruthy();
    expect(result.rows[0].key_len).toBe(32);
  });

  it('permite operar a service_role y bloquea DELETE/TRUNCATE en fase 2', async () => {
    const grants = await primary.query(`
      select
        has_table_privilege('service_role', 'public.prospecting_send_attempts', 'select') as attempts_select,
        has_table_privilege('service_role', 'public.prospecting_send_attempts', 'delete') as attempts_delete,
        has_table_privilege('service_role', 'public.prospecting_events', 'delete') as events_delete,
        has_table_privilege('service_role', 'public.prospecting_events', 'truncate') as events_truncate,
        has_table_privilege('service_role', 'public.prospecting_operational_health', 'select') as health_select
    `);
    expect(grants.rows[0]).toMatchObject({
      attempts_select: true,
      attempts_delete: false,
      events_delete: false,
      events_truncate: false,
      health_select: true,
    });

    const capacity = await asServiceRole(primary, (client) => client.query(
      'select public.prospecting_get_capacity(now()) as result',
    ));
    expect(capacity.rows[0].result).toMatchObject({ ledger_ready: true });

    const health = await asServiceRole(primary, (client) => client.query(
      'select ledger_ready, pending_events, stale_reserved from public.prospecting_operational_health',
    ));
    expect(health.rows[0].ledger_ready).toBe(true);
    expect(Number(health.rows[0].pending_events)).toBe(0);
  });

  it('claim bloquea antes del cutoff y opera después con el mismo ledger', async () => {
    const prospect = await primary.query(`
      insert into public.prospects (dedupe_key, email, firm_name, source, status, validation_status, validated_at)
      values ('email:ledger-test@estudio.example', 'ledger-test@estudio.example', 'Estudio Ledger', 'test', 'validated', 'valid', now())
      returning id
    `);
    const run = await primary.query(`
      insert into public.prospecting_runs (run_key, trigger, mode, status)
      values ('manual:ledger-contract', 'manual', 'send', 'running')
      returning id
    `);
    const send = await primary.query(`
      insert into public.prospecting_sends
        (run_id, prospect_id, to_email, subject, html, idempotency_key, status)
      values ($1, $2, 'ledger-test@estudio.example', 'Asunto', '<p>hola</p>', 'ledger-contract-1', 'queued')
      returning id
    `, [run.rows[0].id, prospect.rows[0].id]);

    const blockedSnapshot = await primary.query(`
      select status, attempt, updated_at::text as updated_at
      from public.prospecting_sends
      where id = $1
    `, [send.rows[0].id]);

    const blockedCapacity = await asServiceRole(primary, (client) => client.query(
      'select public.prospecting_get_capacity($1::timestamptz) as result',
      [beforeCutoff],
    ));
    expect(blockedCapacity.rows[0].result).toMatchObject({
      ledger_ready: true,
      recovery_required: true,
    });

    const blocked = await asServiceRole(primary, (client) => client.query(
      'select public.prospecting_claim_send_attempt($1,$2,$3::timestamptz) as result',
      [send.rows[0].id, run.rows[0].id, beforeCutoff],
    ));
    expect(blocked.rows[0].result).toMatchObject({
      claimed: false,
      reason: 'recovery_required',
    });

    const blockedAfter = await primary.query(`
      select status, attempt, updated_at::text as updated_at
      from public.prospecting_sends
      where id = $1
    `, [send.rows[0].id]);
    expect(blockedAfter.rows[0]).toEqual(blockedSnapshot.rows[0]);

    const blockedAttempts = await primary.query(
      'select count(*) from public.prospecting_send_attempts where send_id = $1',
      [send.rows[0].id],
    );
    expect(Number(blockedAttempts.rows[0].count)).toBe(0);

    const before = await asServiceRole(primary, (client) => client.query(
      'select public.prospecting_get_capacity($1::timestamptz) as result',
      [operationNow],
    ));
    const claimed = await asServiceRole(primary, (client) => client.query(
      'select public.prospecting_claim_send_attempt($1,$2,$3::timestamptz) as result',
      [send.rows[0].id, run.rows[0].id, operationNow],
    ));
    expect(claimed.rows[0].result).toMatchObject({ claimed: true });
    expect(claimed.rows[0].result.attempt_id).toBeTruthy();

    const conflict = await asServiceRole(secondary, (client) => client.query(
      'select public.prospecting_claim_send_attempt($1,$2,$3::timestamptz) as result',
      [send.rows[0].id, run.rows[0].id, operationNow],
    ));
    expect(conflict.rows[0].result.claimed).toBe(false);

    const finalized = await asServiceRole(primary, (client) => client.query(
      `select public.prospecting_finalize_send_attempt(
        $1, 'sent', 're_ledger_contract', null, false, false, true, null, $2::timestamptz
      ) as result`,
      [claimed.rows[0].result.attempt_id, operationNow],
    ));
    expect(finalized.rows[0].result).toMatchObject({ finalized: true, outcome: 'sent' });

    const after = await asServiceRole(primary, (client) => client.query(
      'select public.prospecting_get_capacity($1::timestamptz) as result',
      [operationNow],
    ));
    expect(Number(after.rows[0].result.used)).toBe(Number(before.rows[0].result.used) + 1);

    const state = await primary.query(`
      select s.status, p.send_status, p.campaign_count, a.state, a.provider_contacted
      from public.prospecting_sends s
      join public.prospects p on p.id = s.prospect_id
      join public.prospecting_send_attempts a on a.send_id = s.id
      where s.id = $1
    `, [send.rows[0].id]);
    expect(state.rows[0]).toMatchObject({
      status: 'sent',
      send_status: 'sent',
      campaign_count: 1,
      state: 'consumed',
      provider_contacted: true,
    });
  });

  it('webhook es idempotente por provider_event_id', async () => {
    const send = await primary.query(`
      select id from public.prospecting_sends
      where idempotency_key = 'ledger-contract-1'
      limit 1
    `);
    const ingest = () => asServiceRole(primary, (client) => client.query(
      `select public.prospecting_ingest_provider_event(
        'msg_ledger_contract', 'email.delivered', 're_ledger_contract',
        'ledger-test@estudio.example', '{"type":"email.delivered"}'::jsonb, $1::timestamptz
      ) as result`,
      [operationNow],
    ));
    const first = await ingest();
    const second = await ingest();
    expect(first.rows[0].result.processed).toBe(true);
    expect(second.rows[0].result).toMatchObject({ processed: true, duplicate: true });

    const delivered = await primary.query('select status from public.prospecting_sends where id = $1', [send.rows[0].id]);
    expect(delivered.rows[0].status).toBe('delivered');
  });

  it('unsubscribe usa el ledger y crea supresión', async () => {
    const prospect = await primary.query(`
      select id, email from public.prospects where dedupe_key = 'email:ledger-test@estudio.example'
    `);
    const result = await asServiceRole(primary, (client) => client.query(
      `select public.prospecting_apply_unsubscribe(
        $1, $2, 'email_link', 'test', null, $3::timestamptz
      ) as result`,
      [prospect.rows[0].id, prospect.rows[0].email, operationNow],
    ));
    expect(result.rows[0].result).toMatchObject({ applied: true });
    const state = await primary.query(`
      select p.status, p.send_status, s.reason
      from public.prospects p
      left join public.prospecting_suppressions s on s.email_normalized = p.email_normalized
      where p.id = $1
    `, [prospect.rows[0].id]);
    expect(state.rows[0]).toMatchObject({ status: 'unsubscribed', send_status: 'delivered', reason: 'unsubscribe' });
  });

  it('re-ejecutar el backfill no altera ledger ni contadores', async () => {
    const snapshot = () => primary.query(`
      select
        (select count(*) from public.prospecting_send_attempts)::integer as attempts,
        (select count(*) from public.prospecting_sends)::integer as sends,
        (select count(*) from public.prospecting_events where association_evaluated_at is not null)::integer as processed_events,
        (select coalesce(sum(campaign_count), 0) from public.prospects)::integer as campaign_total,
        (select ledger_ready from public.prospecting_settings where id = 1) as ledger_ready,
        (select ledger_cutoff_at::text from public.prospecting_settings where id = 1) as ledger_cutoff_at
    `);
    const before = await snapshot();
    await primary.query(migrations[4]);
    const after = await snapshot();
    expect(after.rows[0]).toEqual(before.rows[0]);
  });

  it('revalida el mismo día antes del proveedor', async () => {
    const fixture = await createSendFixture('revalidate-same-day');
    const claimed = await claimFixture(fixture);
    expect(claimed).toMatchObject({ claimed: true });

    const revalidated = await revalidateFixture({ attemptId: claimed.attempt_id });
    expect(revalidated).toMatchObject({
      valid: true,
      rolled_over: false,
      day_key: claimed.day_key,
    });

    const attempt = await primary.query(
      'select state, day_key::text as day_key from public.prospecting_send_attempts where id = $1',
      [claimed.attempt_id],
    );
    expect(attempt.rows[0]).toMatchObject({ state: 'reserved', day_key: claimed.day_key });

    const finalized = await asServiceRole(primary, (client) => client.query(
      `select public.prospecting_finalize_send_attempt(
        $1, 'sent', 're_revalidate_same_day', null, false, false, true, null, $2::timestamptz
      ) as result`,
      [claimed.attempt_id, operationNow],
    ));
    expect(finalized.rows[0].result).toMatchObject({ finalized: true, outcome: 'sent' });
  });

  it('revalida el cruce de medianoche y mueve el day_key', async () => {
    const fixture = await createSendFixture('revalidate-rollover');
    const claimed = await claimFixture(fixture);
    const nextDay = new Date(new Date(operationNow).getTime() + 24 * 60 * 60 * 1000).toISOString();

    const revalidated = await revalidateFixture({ attemptId: claimed.attempt_id, now: nextDay });
    expect(revalidated).toMatchObject({ valid: true, rolled_over: true });
    expect(revalidated.day_key).not.toBe(claimed.day_key);

    const attempt = await primary.query(`
      select state, day_key::text as day_key, metadata->>'rolled_from' as rolled_from
      from public.prospecting_send_attempts where id = $1
    `, [claimed.attempt_id]);
    expect(attempt.rows[0]).toMatchObject({
      state: 'reserved',
      day_key: revalidated.day_key,
      rolled_from: claimed.day_key,
    });

    const finalized = await asServiceRole(primary, (client) => client.query(
      `select public.prospecting_finalize_send_attempt(
        $1, 'released', null, 'test_cleanup', true, false, false, 'test_cleanup', $2::timestamptz
      ) as result`,
      [claimed.attempt_id, nextDay],
    ));
    expect(finalized.rows[0].result).toMatchObject({ finalized: true, outcome: 'released' });
  });

  it('libera la reserva si el prospecto fue bloqueado después del claim', async () => {
    const fixture = await createSendFixture('revalidate-blocked');
    const claimed = await claimFixture(fixture);
    await primary.query(`
      update public.prospects set status = 'unsubscribed', updated_at = now() where id = $1
    `, [fixture.prospectId]);

    const revalidated = await revalidateFixture({ attemptId: claimed.attempt_id });
    expect(revalidated).toMatchObject({ valid: false, reason: 'prospect_blocked' });

    const state = await primary.query(`
      select s.status, s.last_error, a.state, a.release_reason
      from public.prospecting_sends s
      join public.prospecting_send_attempts a on a.id = $2
      where s.id = $1
    `, [fixture.sendId, claimed.attempt_id]);
    expect(state.rows[0]).toMatchObject({
      status: 'skipped',
      last_error: 'prospect_blocked',
      state: 'released',
      release_reason: 'prospect_blocked',
    });
  });

  it('libera la reserva si el prospecto fue suprimido después del claim', async () => {
    const fixture = await createSendFixture('revalidate-suppressed');
    const claimed = await claimFixture(fixture);
    await primary.query(`
      insert into public.prospecting_suppressions (email_normalized, reason, source)
      values (lower($1), 'manual', 'test')
    `, [fixture.email]);

    const revalidated = await revalidateFixture({ attemptId: claimed.attempt_id });
    expect(revalidated).toMatchObject({ valid: false, reason: 'suppressed' });

    const state = await primary.query(`
      select s.status, s.last_error, a.state, a.release_reason
      from public.prospecting_sends s
      join public.prospecting_send_attempts a on a.id = $2
      where s.id = $1
    `, [fixture.sendId, claimed.attempt_id]);
    expect(state.rows[0]).toMatchObject({
      status: 'skipped',
      last_error: 'suppressed',
      state: 'released',
      release_reason: 'suppressed',
    });
  });

  it('429/425 explícitos incrementan attempt y bloquean tras tres rechazos', async () => {
    const fixture = await createSendFixture('transient-explicit');
    let claimed = await claimFixture(fixture);
    expect(claimed).toMatchObject({ claimed: true });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (attempt > 1) claimed = await claimFixture(fixture);
      expect(claimed).toMatchObject({ claimed: true });

      const error = attempt === 2 ? 'too_many_requests_425' : 'rate_limit_429';
      const finalized = await asServiceRole(primary, (client) => client.query(
        `select public.prospecting_finalize_send_attempt(
          $1, 'released', null, $2, true, true, true, 'provider_rejected', $3::timestamptz
        ) as result`,
        [claimed.attempt_id, error, operationNow],
      ));
      expect(finalized.rows[0].result).toMatchObject({ finalized: true, outcome: 'released' });

      const send = await primary.query(`
        select status, attempt, last_error, last_error_transient
        from public.prospecting_sends where id = $1
      `, [fixture.sendId]);
      expect(send.rows[0]).toMatchObject({
        status: 'failed',
        attempt,
        last_error_transient: true,
      });
    }

    const exhausted = await claimFixture(fixture);
    expect(exhausted).toMatchObject({ claimed: false, reason: 'attempts_exhausted' });

    const retryable = await primary.query(`
      select count(*)::integer as count
      from public.prospecting_sends
      where id = $1 and status = 'failed' and last_error_transient and attempt < 3
    `, [fixture.sendId]);
    expect(retryable.rows[0].count).toBe(0);

    const attempts = await primary.query(
      'select count(*)::integer as count from public.prospecting_send_attempts where send_id = $1',
      [fixture.sendId],
    );
    expect(attempts.rows[0].count).toBe(3);
  });

  it('5xx ambiguo queda unknown y no se reintenta', async () => {
    const fixture = await createSendFixture('ambiguous-5xx');
    const claimed = await claimFixture(fixture);
    const finalized = await asServiceRole(primary, (client) => client.query(
      `select public.prospecting_finalize_send_attempt(
        $1, 'unknown', null, 'timeout', false, false, true, null, $2::timestamptz
      ) as result`,
      [claimed.attempt_id, operationNow],
    ));
    expect(finalized.rows[0].result).toMatchObject({ finalized: true, outcome: 'unknown' });

    const send = await primary.query(`
      select status, attempt, last_error_transient
      from public.prospecting_sends where id = $1
    `, [fixture.sendId]);
    expect(send.rows[0]).toMatchObject({
      status: 'unknown',
      attempt: 1,
      last_error_transient: false,
    });

    const retry = await claimFixture(fixture);
    expect(retry).toMatchObject({ claimed: false, reason: 'send_not_claimable' });
  });
});
