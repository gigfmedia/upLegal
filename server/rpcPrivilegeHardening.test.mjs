// @vitest-environment node
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(
  new URL('../supabase/migrations/20261124183450_phase2e_rpc_privilege_hardening.sql', import.meta.url),
  'utf8'
);

const FINANCIAL_AND_FOUNDER = [
  'create_payment_secure',
  'update_payment_gateway_id',
  'claim_pro_founder_slot',
  'reserve_pro_founder_slot',
  'reconcile_pro_founders',
];

let db;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE ROLE other_caller;

    CREATE FUNCTION public.create_payment_secure(
      uuid, integer, integer, integer, numeric, numeric, integer, integer,
      text, text, uuid, uuid, jsonb, timestamptz, timestamptz
    ) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;

    CREATE FUNCTION public.update_payment_gateway_id(uuid, text)
      RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;

    CREATE FUNCTION public.claim_pro_founder_slot(uuid)
      RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;

    CREATE FUNCTION public.reserve_pro_founder_slot(uuid, integer DEFAULT 259200)
      RETURNS text LANGUAGE sql AS $$ SELECT 'reserved'::text $$;

    CREATE FUNCTION public.reconcile_pro_founders()
      RETURNS integer LANGUAGE sql AS $$ SELECT 0 $$;

    CREATE FUNCTION public.get_company_metrics()
      RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
  `);
}, 20000);

afterAll(async () => {
  await db?.close();
});

async function applyMigration() {
  await db.exec(migration);
}

async function privilege(role, name) {
  const result = await db.query(
    `SELECT has_function_privilege($1, p.oid, 'EXECUTE') AS allowed
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = $2
     ORDER BY p.oid`,
    [role, name]
  );
  expect(result.rows).toHaveLength(1);
  return result.rows[0].allowed;
}

describe('FASE 2E — privilegios RPC', () => {
  it('la migración es idempotente y elimina PUBLIC, anon y authenticated de las RPC financieras/de fundador', async () => {
    await applyMigration();
    await applyMigration();

    for (const name of FINANCIAL_AND_FOUNDER) {
      expect(await privilege('anon', name), `${name} anon`).toBe(false);
      expect(await privilege('authenticated', name), `${name} authenticated`).toBe(false);
      expect(await privilege('other_caller', name), `${name} PUBLIC`).toBe(false);
      expect(await privilege('service_role', name), `${name} service_role`).toBe(true);
    }
  });

  it('get_company_metrics conserva authenticated y service_role, pero no anon/PUBLIC', async () => {
    await applyMigration();

    expect(await privilege('anon', 'get_company_metrics')).toBe(false);
    expect(await privilege('other_caller', 'get_company_metrics')).toBe(false);
    expect(await privilege('authenticated', 'get_company_metrics')).toBe(true);
    expect(await privilege('service_role', 'get_company_metrics')).toBe(true);
  });

  it('un rol cliente no puede ejecutar create_payment_secure', async () => {
    await applyMigration();
    await db.exec('SET ROLE other_caller');
    try {
      await expect(
        db.query(
          `SELECT public.create_payment_secure(
            null::uuid, null::integer, null::integer, null::integer, null::numeric,
            null::numeric, null::integer, null::integer, null::text, null::text,
            null::uuid, null::uuid, null::jsonb, null::timestamptz, null::timestamptz
          )`
        )
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await db.exec('RESET ROLE');
    }
  });
});
