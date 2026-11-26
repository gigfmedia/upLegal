// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20261125120000_phase2f_payout_eligibility.sql');
const basePayments = read('supabase/migrations/20240927020000_create_payments_tables.sql')
  .match(/CREATE TABLE[\s\S]*?\n\);/)[0]
  .replaceAll('uuid_generate_v4()', 'gen_random_uuid()');
const extensions = read('supabase/migrations/20241125150000_platform_settings_and_payouts.sql');

const USER = '00000000-0000-4000-a000-000000000001';
const PAYMENT = '00000000-0000-4000-a000-000000000011';
const HISTORICAL = '00000000-0000-4000-a000-000000000012';
const INELIGIBLE = '00000000-0000-4000-a000-000000000013';
const ELIGIBLE = '00000000-0000-4000-a000-000000000014';

const databases = [];

async function createDatabase() {
  const db = new PGlite();
  databases.push(db);
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
      SELECT COALESCE(NULLIF(current_setting('test.role', true), ''), 'service_role')
    $$;
    CREATE FUNCTION public.security_platform_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT false
    $$;
    CREATE TABLE public.services (id uuid PRIMARY KEY);
  `);
  await db.exec(basePayments);
  await db.exec(extensions.match(/ALTER TABLE public.payments[\s\S]*?;/)[0]);
  await db.exec(`
    ALTER TABLE public.payments
      ADD COLUMN IF NOT EXISTS payment_gateway_id text,
      ADD COLUMN IF NOT EXISTS total_amount integer,
      ADD COLUMN IF NOT EXISTS appointment_id uuid,
      ADD COLUMN IF NOT EXISTS consultation_id uuid,
      ADD COLUMN IF NOT EXISTS booking_id uuid;
    CREATE TABLE public.payment_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type text NOT NULL,
      user_id uuid,
      payment_id text,
      status text,
      amount numeric,
      metadata jsonb DEFAULT '{}',
      created_at timestamptz DEFAULT now()
    );
    CREATE UNIQUE INDEX payment_events_success_payment_once
      ON public.payment_events (payment_id)
      WHERE event_type = 'success' AND payment_id IS NOT NULL;
  `);
  await db.query('INSERT INTO auth.users (id) VALUES ($1)', [USER]);
  return db;
}

async function insertPayment(db, {
  id = PAYMENT,
  providerPaymentId = 'mp_1001',
  status = 'succeeded',
  currency = 'CLP',
  amount = 50000,
  platformFee = 10000,
  lawyerAmount = 40000,
  payoutEligible = false,
  confirmedAt = null,
  confirmationSource = null,
  paymentGatewayId = null,
} = {}) {
  await db.query(
    `INSERT INTO public.payments (
       id, user_id, lawyer_id, amount, platform_fee, lawyer_amount, currency, status,
       metadata, payout_eligible, confirmed_at, confirmation_source, payment_gateway_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      id,
      USER,
      USER,
      amount,
      platformFee,
      lawyerAmount,
      currency,
      status,
      providerPaymentId
        ? JSON.stringify({ provider: 'mercadopago', provider_payment_id: providerPaymentId })
        : JSON.stringify({}),
      payoutEligible,
      confirmedAt,
      confirmationSource,
      paymentGatewayId,
    ]
  );
}

async function insertHistoricalPayment(db, { id = HISTORICAL, providerPaymentId = 'mp_1001' } = {}) {
  await db.query(
    `INSERT INTO public.payments (
       id, user_id, lawyer_id, amount, platform_fee, lawyer_amount, currency, status, metadata
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id,
      USER,
      USER,
      50000,
      10000,
      40000,
      'CLP',
      'succeeded',
      JSON.stringify({ provider: 'mercadopago', provider_payment_id: providerPaymentId }),
    ]
  );
}

async function insertEvent(db, {
  paymentId = 'mp_1001',
  eventType = 'success',
  status = 'completed',
  source = 'webhook',
} = {}) {
  await db.query(
    `INSERT INTO public.payment_events (event_type, payment_id, status, metadata)
     VALUES ($1,$2,$3,$4)`,
    [eventType, paymentId, status, JSON.stringify({ source })]
  );
}

async function payment(db, id) {
  return (await db.query(
    `SELECT payout_eligible, confirmed_at, confirmation_source, payment_gateway_id
     FROM public.payments WHERE id = $1`,
    [id]
  )).rows[0];
}

afterAll(async () => {
  await Promise.all(databases.map(db => db.close()));
});

describe('FASE 2F — migración de elegibilidad de payout', () => {
  it('es idempotente y no hace backfill de pagos históricos', async () => {
    const db = await createDatabase();
    await insertHistoricalPayment(db);
    await insertEvent(db, { paymentId: 'mp_1001', source: 'webhook' });

    await db.exec(migration);
    await db.exec(migration);

    await expect(payment(db, HISTORICAL)).resolves.toMatchObject({
      payout_eligible: false,
      confirmed_at: null,
      confirmation_source: null,
    });
    const acl = await db.query(`
      SELECT has_function_privilege(
        'authenticated',
        'public.zz_reconcile_payment_confirmation(uuid)',
        'EXECUTE'
      ) AS allowed
    `);
    expect(acl.rows[0].allowed).toBe(false);
  });

  it('deriva payment_gateway_id del metadata y confirma solo con success/webhook', async () => {
    const db = await createDatabase();
    await db.exec(migration);
    await insertPayment(db);

    expect(await payment(db, PAYMENT)).toMatchObject({
      payment_gateway_id: 'mp_1001',
      payout_eligible: false,
      confirmed_at: null,
    });

    await insertEvent(db);
    const row = await payment(db, PAYMENT);
    expect(row).toMatchObject({
      payment_gateway_id: 'mp_1001',
      payout_eligible: true,
      confirmation_source: 'mercadopago_webhook',
    });
    expect(row.confirmed_at).not.toBeNull();
  });

  it('no confirma eventos migration ni eventos insertados fuera de service_role', async () => {
    const db = await createDatabase();
    await db.exec(migration);
    await insertPayment(db, { id: HISTORICAL, providerPaymentId: 'mp_2001' });
    await insertEvent(db, { paymentId: 'mp_2001', source: 'migration' });
    expect((await payment(db, HISTORICAL)).payout_eligible).toBe(false);

    await insertPayment(db, { id: PAYMENT, providerPaymentId: 'mp_3001' });
    await db.exec("SET test.role = 'authenticated'");
    await expect(insertEvent(db, { paymentId: 'mp_3001' })).rejects.toThrow(
      /require service_role/
    );
    await db.exec('RESET test.role');

    expect(await payment(db, PAYMENT)).toMatchObject({
      payout_eligible: false,
      confirmed_at: null,
      confirmation_source: null,
    });
  });

  it('rechaza payout_eligible=true sin evidencia completa', async () => {
    const db = await createDatabase();
    await db.exec(migration);

    await expect(insertPayment(db, { payoutEligible: true })).rejects.toThrow(
      /payments_payout_eligible_guard|check constraint/i
    );
  });

  it('bloquea pending->processing no elegible y permite el pago elegible', async () => {
    const db = await createDatabase();
    await db.exec(migration);

    await insertPayment(db, { id: INELIGIBLE, providerPaymentId: null });
    await expect(
      db.query("UPDATE public.payments SET payout_status='processing' WHERE id=$1", [INELIGIBLE])
    ).rejects.toThrow(/payout not eligible/);

    await insertPayment(db, { id: ELIGIBLE });
    await insertEvent(db, { paymentId: 'mp_1001' });
    await expect(
      db.query("UPDATE public.payments SET payout_status='processing' WHERE id=$1", [ELIGIBLE])
    ).resolves.toBeDefined();
  });
});
