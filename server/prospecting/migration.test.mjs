// @vitest-environment node
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const migrations = [
  new URL('../../supabase/migrations/20261105004400_prospecting_automation.sql', import.meta.url),
  new URL('../../supabase/migrations/20261105225853_prospecting_quality_limits.sql', import.meta.url),
  new URL('../../supabase/migrations/20261106120000_prospecting_quality_version.sql', import.meta.url),
].map((url) => readFileSync(url, 'utf8'))
  .map((sql) => sql.replace(/create extension if not exists pgcrypto;/i, '-- pgcrypto omitido en PGlite; gen_random_uuid es nativo.'));

const uuid = (n) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`;

let db;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE public.profiles (id uuid PRIMARY KEY);
  `);
  for (const sql of migrations) await db.exec(sql);
}, 30000);

afterAll(async () => {
  await db?.close();
});

async function claim(runKey, trigger = 'manual', mode = 'dry_run', actor = null) {
  const result = await db.query(
    'select public.prospecting_claim_run($1,$2,$3,$4::uuid) as result',
    [runKey, trigger, mode, actor],
  );
  return result.rows[0].result;
}

describe('prospecting migration', () => {
  it('crea settings deshabilitado y en dry-run por defecto', async () => {
    const result = await db.query('select enabled, dry_run, daily_target, schedule_time, timezone, allow_multiple_contacts_per_firm from public.prospecting_settings where id = 1');
    expect(result.rows[0]).toMatchObject({
      enabled: false,
      dry_run: true,
      daily_target: 100,
      schedule_time: '10:00:00',
      timezone: 'America/Santiago',
      allow_multiple_contacts_per_firm: false,
    });
  });

  it('agrega columnas de calidad sin tocar prospectos existentes', async () => {
    const result = await db.query(`
      select column_name, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public' and table_name = 'prospects'
        and column_name in ('email_kind', 'org_type', 'rejection_reason', 'discovery_query', 'search_rank', 'person_key', 'domain_key', 'mailbox_verified', 'quality_evaluated_at', 'quality_rules_version')
      order by column_name
    `);
    const columns = Object.fromEntries(result.rows.map((row) => [row.column_name, row]));
    expect(Object.keys(columns)).toHaveLength(10);
    expect(columns.mailbox_verified.column_default).toContain('false');
    expect(columns.email_kind.is_nullable).toBe('YES');
    expect(columns.org_type.is_nullable).toBe('YES');
    expect(columns.quality_rules_version.is_nullable).toBe('YES');
  });

  it('exige evaluación cuando se registra una versión de calidad', async () => {
    await expect(db.exec(`
      INSERT INTO public.prospects (dedupe_key, firm_name, source, quality_rules_version)
      VALUES ('quality:sin-evaluacion', 'Estudio', 'test', '2026-11-06.1');
    `)).rejects.toMatchObject({ code: '23514' });
  });

  it('deduplica prospectos por dedupe_key y email normalizado', async () => {
    await db.exec(`
      INSERT INTO public.prospects (dedupe_key, email, firm_name, source)
      VALUES ('email:juan@estudio.cl', 'juan@estudio.cl', 'Estudio', 'test');
    `);
    await expect(db.exec(`
      INSERT INTO public.prospects (dedupe_key, email, firm_name, source)
      VALUES ('email:juan@estudio.cl', 'otro@estudio.cl', 'Estudio', 'test');
    `)).rejects.toMatchObject({ code: '23505' });
    await expect(db.exec(`
      INSERT INTO public.prospects (dedupe_key, email, firm_name, source)
      VALUES ('email:otro@estudio.cl', 'JUAN@ESTUDIO.CL', 'Estudio', 'test');
    `)).rejects.toMatchObject({ code: '23505' });
  });

  it('permite un solo envío por prospecto', async () => {
    const prospect = await db.query("select id from public.prospects where dedupe_key = 'email:juan@estudio.cl'");
    const run = await db.query("insert into public.prospecting_runs (run_key, trigger, mode) values ('manual:test-send','manual','send') returning id");
    await db.query(
      `insert into public.prospecting_sends (run_id, prospect_id, to_email, subject, html, idempotency_key)
       values ($1,$2,'juan@estudio.cl','Asunto','<p>hola</p>','key-1')`,
      [run.rows[0].id, prospect.rows[0].id],
    );
    await expect(db.query(
      `insert into public.prospecting_sends (run_id, prospect_id, to_email, subject, html, idempotency_key)
       values ($1,$2,'juan@estudio.cl','Asunto 2','<p>hola</p>','key-2')`,
      [run.rows[0].id, prospect.rows[0].id],
    )).rejects.toMatchObject({ code: '23505' });
  });

  it('claim lock impide ejecuciones concurrentes y libera correctamente', async () => {
    const first = await claim('scheduled:2026-11-04', 'scheduled', 'send');
    expect(first.claimed).toBe(true);
    expect(first.lock_token).toBeTruthy();

    const second = await claim('manual:otro', 'manual', 'dry_run');
    expect(second).toMatchObject({ claimed: false, reason: 'locked' });

    await db.query('select public.prospecting_release_lock($1::uuid)', [first.lock_token]);
    const third = await claim('manual:otro', 'manual', 'dry_run');
    expect(third.claimed).toBe(true);

    await db.query('select public.prospecting_release_lock($1::uuid)', [third.lock_token]);
    const duplicate = await claim('scheduled:2026-11-04', 'scheduled', 'send');
    expect(duplicate).toMatchObject({ claimed: false, reason: 'already_exists' });
  });

  it('recupera runs atascados y libera locks vencidos', async () => {
    await db.exec(`
      INSERT INTO public.prospecting_runs (run_key, trigger, mode, status, started_at)
      VALUES ('stale:1', 'manual', 'dry_run', 'running', now() - interval '3 hours');
      UPDATE public.prospecting_settings SET lock_token = gen_random_uuid(), lock_until = now() - interval '1 minute' WHERE id = 1;
    `);
    const result = await db.query('select public.prospecting_recover_stale_runs($1) as recovered', ['America/Santiago']);
    expect(Number(result.rows[0].recovered)).toBeGreaterThanOrEqual(1);
    const stale = await db.query("select status, error from public.prospecting_runs where run_key = 'stale:1'");
    expect(stale.rows[0]).toMatchObject({ status: 'failed', error: 'stale_run_recovered' });
    const settings = await db.query('select lock_token, lock_until from public.prospecting_settings where id = 1');
    expect(settings.rows[0]).toMatchObject({ lock_token: null, lock_until: null });

    await db.exec(`UPDATE public.prospecting_sends SET status = 'sending', updated_at = now() - interval '3 hours';`);
    await db.query('select public.prospecting_recover_stale_runs($1)', ['America/Santiago']);
    const send = await db.query('select status, last_error_transient, last_error from public.prospecting_sends limit 1');
    expect(send.rows[0]).toMatchObject({ status: 'failed', last_error_transient: true, last_error: 'stale_sending_recovered' });

    const retry = await claim('stale:1', 'manual', 'dry_run');
    expect(retry.claimed).toBe(true);
    expect(retry.run.status).toBe('running');
    expect(retry.run.summary.retried_at).toBeTruthy();
    await db.query('select public.prospecting_release_lock($1::uuid)', [retry.lock_token]);
  });

  it('niega lectura a anon/authenticated y permite service_role', async () => {
    await db.exec('BEGIN; SET LOCAL ROLE anon;');
    await expect(db.query('select * from public.prospects')).rejects.toMatchObject({ code: '42501' });
    await db.exec('ROLLBACK;');

    await db.exec('BEGIN; SET LOCAL ROLE service_role;');
    const rows = await db.query('select count(*)::int as count from public.prospects');
    expect(rows.rows[0].count).toBeGreaterThanOrEqual(1);
    await db.exec('ROLLBACK;');
  });

  it('rechaza estados fuera de catálogo', async () => {
    await expect(db.exec(`
      INSERT INTO public.prospects (dedupe_key, firm_name, source, status)
      VALUES ('manual:invalido', 'Estudio', 'test', 'inventado');
    `)).rejects.toMatchObject({ code: '23514' });
  });
});
