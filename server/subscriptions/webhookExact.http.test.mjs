// @vitest-environment node
//
// FASE 4.65 — exact server.mjs HTTP route against the isolated PostgreSQL
// sandbox. The child server uses the real route/handlers/Supabase client; only
// MercadoPago API reads are intercepted by mpFetchPreload.mjs.
//
// Skipped unless sandbox env vars are set. Never production.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const URL_SBX = process.env.SANDBOX_SUPABASE_URL;
const KEY = process.env.SANDBOX_SERVICE_ROLE_KEY;
const suite = URL_SBX && KEY ? describe : describe.skip;
const supabase = URL_SBX && KEY ? createClient(URL_SBX, KEY, { auth: { persistSession: false } }) : null;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const SECRET = 'fase-4-65-sandbox-secret';
const MOCK_FILE = path.join(os.tmpdir(), `lu-mp-mock-${process.pid}.json`);

const IDS = {
  proSub: '00000000-0000-4000-8000-000000000201',
  proLawyer: '00000000-0000-4000-8000-000000000202',
  aiSub: '00000000-0000-4000-8000-000000000211',
  aiLawyer: '00000000-0000-4000-8000-000000000212',
  company: '00000000-0000-4000-8000-000000000221',
  plan: '00000000-0000-4000-8000-000000000222',
  companySub: '00000000-0000-4000-8000-000000000223',
};
const PRO_PRE = 'PRE-ALNUM-ABC';
const AI_PRE = 'PRE-HTTP-AI';
const EMP_PRE = 'PRE-HTTP-EMP';

let child;
let port;
let serverLog = '';

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}

function mock(responses) {
  fs.writeFileSync(MOCK_FILE, JSON.stringify({ responses }));
}

function signedHeaders(dataId, requestId = 'req-4-65') {
  const ts = String(Date.now());
  const parts = [];
  if (dataId) parts.push(`id:${String(dataId).toLowerCase()}`);
  parts.push(`request-id:${requestId}`);
  parts.push(`ts:${ts}`);
  const manifest = `${parts.join(';')};`;
  const v1 = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex');
  return {
    'content-type': 'application/json',
    'x-request-id': requestId,
    'x-signature': `ts=${ts},v1=${v1}`,
  };
}

async function webhook(body, dataId) {
  const res = await fetch(`http://127.0.0.1:${port}/api/mercadopago/webhook`, {
    method: 'POST',
    headers: signedHeaders(dataId),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, text, json };
}

function preapproval(id, status, externalReference, at = '2026-10-22T10:00:00.000Z') {
  return {
    id,
    status,
    external_reference: externalReference,
    date_created: at,
    last_modified: at,
    auto_recurring: { start_date: at, transaction_amount: 19990 },
    next_payment_date: '2026-11-22T00:00:00.000Z',
  };
}

function payment(id, status, preapprovalId, at, extra = {}) {
  return {
    id,
    status,
    preapproval_id: preapprovalId,
    transaction_amount: 19990,
    date_created: at,
    date_last_updated: at,
    ...extra,
  };
}

async function resetDb() {
  const subIds = [IDS.proSub, IDS.aiSub, IDS.companySub];
  await supabase.from('subscription_effects').delete().in('subscription_id', subIds);
  await supabase.from('subscription_events').delete().in('subscription_id', subIds);
  await supabase.from('pro_subscription_payments').delete().in('lawyer_id', [IDS.proLawyer, IDS.aiLawyer]);
  await supabase.from('pro_founder_reservations').delete().in('lawyer_id', [IDS.proLawyer, IDS.aiLawyer]);
  await supabase.from('lawyer_subscriptions').delete().in('id', subIds);
  await supabase.from('ai_subscriptions').delete().in('id', subIds);
  await supabase.from('company_usage').delete().eq('company_id', IDS.company);
  await supabase.from('subscription_payment_events').delete().eq('subscription_id', IDS.companySub);
  await supabase.from('company_subscriptions').delete().eq('id', IDS.companySub);
  await supabase.from('companies').delete().eq('id', IDS.company);
  await supabase.from('subscription_plans').delete().eq('id', IDS.plan);
  await supabase.from('profiles').delete().in('id', [IDS.proLawyer, IDS.aiLawyer]);

  await supabase.from('profiles').insert([
    { id: IDS.proLawyer, role: 'lawyer', is_founder: false },
    { id: IDS.aiLawyer, role: 'lawyer', is_founder: false },
  ]);
  await supabase.from('lawyer_subscriptions').insert({
    id: IDS.proSub,
    lawyer_id: IDS.proLawyer,
    plan: 'pro',
    status: 'pending',
    provider_subscription_id: PRO_PRE,
    amount_clp: 19990,
    cancelled_at: null,
  });
  await supabase.from('ai_subscriptions').insert({
    id: IDS.aiSub,
    lawyer_id: IDS.aiLawyer,
    plan: 'essential',
    status: 'pending',
    provider_subscription_id: AI_PRE,
    current_period_start: null,
  });
  await supabase.from('companies').insert({
    id: IDS.company,
    name: 'Sandbox Empresa',
    contact_email: 'sandbox@example.test',
    status: 'pending',
  });
  await supabase.from('subscription_plans').insert({
    id: IDS.plan,
    name: 'Empresas Sandbox',
    price_clp: 49990,
    consultations_limit: 10,
    reviews_limit: 10,
  });
  await supabase.from('company_subscriptions').insert({
    id: IDS.companySub,
    company_id: IDS.company,
    plan_id: IDS.plan,
    status: 'pending',
    mercadopago_preapproval_id: EMP_PRE,
  });
}

async function proRow() {
  const { data, error } = await supabase.from('lawyer_subscriptions').select('*').eq('id', IDS.proSub).single();
  if (error) throw error;
  return data;
}

async function proProvider(id) {
  const { error } = await supabase.from('lawyer_subscriptions').update({ provider_subscription_id: id }).eq('id', IDS.proSub);
  if (error) throw error;
}

async function events() {
  const { data, error } = await supabase.from('subscription_events').select('*').eq('subscription_id', IDS.proSub).order('created_at');
  if (error) throw error;
  return data;
}

async function ledger() {
  const { data, error } = await supabase.from('pro_subscription_payments').select('*').eq('lawyer_id', IDS.proLawyer).order('paid_at');
  if (error) throw error;
  return data;
}

async function effects() {
  const { data, error } = await supabase.from('subscription_effects').select('*').eq('subscription_id', IDS.proSub);
  if (error) throw error;
  return data;
}

async function waitHealthy() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited ${child.exitCode}\n${serverLog}`);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`server did not become healthy\n${serverLog}`);
}

suite('FASE 4.65 — exact server.mjs webhook route (sandbox)', () => {
  beforeAll(async () => {
    port = await freePort();
    child = spawn(process.execPath, ['--import', path.join(HERE, 'mpFetchPreload.mjs'), 'server.mjs'], {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(port),
        APP_URL: `http://127.0.0.1:${port}`,
        SUPABASE_URL: URL_SBX,
        SUPABASE_SERVICE_ROLE_KEY: KEY,
        MERCADOPAGO_WEBHOOK_SECRET: SECRET,
        MP_MOCK_FILE: MOCK_FILE,
        RESEND_API_KEY: '',
        POSTHOG_PROJECT_API_KEY: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (d) => { serverLog += d.toString(); });
    child.stderr.on('data', (d) => { serverLog += d.toString(); });
    await waitHealthy();
  }, 45_000);

  afterAll(async () => {
    if (child && child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise((resolve) => {
        const t = setTimeout(resolve, 3000);
        child.once('exit', () => { clearTimeout(t); resolve(); });
      });
    }
    try { fs.unlinkSync(MOCK_FILE); } catch {}
    await resetDb();
  }, 20_000);

  beforeEach(resetDb);

  it('H1 alphanumeric preapproval ID reaches the real Pro handler', async () => {
    mock({
      [`/preapproval/${PRO_PRE}`]: {
        status: 200,
        body: preapproval(PRO_PRE, 'authorized', `PRO_${IDS.proLawyer}`),
      },
    });
    const r = await webhook({ topic: 'subscription_preapproval', data: { id: PRO_PRE } }, PRO_PRE);
    expect(r.status).toBe(200);
    expect((await proRow()).status).toBe('active');
    const evs = await events();
    expect(evs).toHaveLength(1);
    expect(evs[0].provider_event_id).toBe(`${PRO_PRE}:authorized:2026-10-22T10:00:00.000Z`);
    expect(evs[0].status).toBe('processed');
    const fx = await effects();
    expect(fx).toHaveLength(2);
    expect(fx.every((e) => e.status === 'sent')).toBe(true);
  });

  it('H1 cancellation uses the authoritative preapproval status', async () => {
    await supabase.from('lawyer_subscriptions').update({ status: 'active', cancelled_at: null }).eq('id', IDS.proSub);
    mock({
      [`/preapproval/${PRO_PRE}`]: {
        status: 200,
        body: preapproval(PRO_PRE, 'cancelled', `PRO_${IDS.proLawyer}`),
      },
    });
    const r = await webhook({ topic: 'subscription_cancelled', data: { id: PRO_PRE } }, PRO_PRE);
    expect(r.status).toBe(200);
    const row = await proRow();
    expect(row.status).toBe('cancelled');
    expect(row.cancelled_at).toBeTruthy();
    expect(row.cancel_at_period_end).toBe(true);
    expect((await events())[0].status).toBe('processed');
  });

  it('H3 pending -> approved for the same payment, ledger stays unique', async () => {
    await proProvider('PRE-HTTP-PAY');
    mock({
      '/v1/payments/7101': { status: 200, body: payment(7101, 'pending', 'PRE-HTTP-PAY', '2026-10-22T10:00:00.000Z') },
    });
    let r = await webhook({ topic: 'subscription_authorized_payment', data: { id: '7101' } }, '7101');
    expect(r.status).toBe(200);
    expect((await proRow()).status).toBe('pending');
    expect((await ledger())[0].status).toBe('pending');

    mock({
      '/v1/payments/7101': { status: 200, body: payment(7101, 'approved', 'PRE-HTTP-PAY', '2026-10-22T11:00:00.000Z') },
    });
    r = await webhook({ topic: 'subscription_authorized_payment', data: { id: '7101' } }, '7101');
    expect(r.status).toBe(200);
    expect((await proRow()).status).toBe('active');
    const rows = await ledger();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('approved');
    expect((await effects()).filter((e) => e.effect_type === 'analytics')).toHaveLength(1);

    r = await webhook({ topic: 'subscription_authorized_payment', data: { id: '7101' } }, '7101');
    expect(r.status).toBe(200);
    expect(await ledger()).toHaveLength(1);
    expect((await effects()).filter((e) => e.effect_type === 'analytics')).toHaveLength(1);
  });

  it('H3 old refund/chargeback cannot revoke a reactivated subscription', async () => {
    await proProvider('PRE-HTTP-REF');
    await supabase.from('lawyer_subscriptions').update({ status: 'active', cancelled_at: null }).eq('id', IDS.proSub);
    mock({
      '/v1/payments/7201': { status: 200, body: payment(7201, 'refunded', 'PRE-HTTP-REF', '2026-01-01T00:00:00.000Z') },
      '/v1/payments/7202': { status: 200, body: payment(7202, 'approved', 'PRE-HTTP-REF', new Date(Date.now() + 60_000).toISOString(), { date_last_updated: undefined }) },
      '/v1/payments/7203': { status: 200, body: payment(7203, 'charged_back', 'PRE-HTTP-REF', '2026-01-02T00:00:00.000Z') },
    });
    let r = await webhook({ topic: 'subscription_authorized_payment', data: { id: '7201' } }, '7201');
    expect(r.status).toBe(200);
    expect((await proRow()).status).toBe('cancelled');

    r = await webhook({ topic: 'subscription_authorized_payment', data: { id: '7202' } }, '7202');
    expect(r.status).toBe(200);
    expect((await proRow()).status).toBe('active');

    r = await webhook({ topic: 'subscription_authorized_payment', data: { id: '7203' } }, '7203');
    expect(r.status).toBe(200);
    expect((await proRow()).status).toBe('active');
    expect((await ledger()).find((p) => p.provider_authorized_payment_id === '7203')).toBeUndefined();

    r = await webhook({ topic: 'subscription_authorized_payment', data: { id: '7201' } }, '7201');
    expect(r.status).toBe(200);
    expect((await proRow()).status).toBe('active');
  });

  it('H2 provider 429/500/404 are retryable 503; 403 is a permanent 200 ACK', async () => {
    await proProvider('PRE-HTTP-FETCH');
    const cases = [
      ['PRE-429', 429, 503],
      ['PRE-500', 500, 503],
      ['PRE-404', 404, 503],
      ['PRE-403', 403, 200],
    ];
    for (const [id, providerStatus, expected] of cases) {
      mock({ [`/preapproval/${id}`]: { status: providerStatus, body: { message: 'mock' } } });
      const r = await webhook({ topic: 'subscription_preapproval', data: { id } }, id);
      expect(r.status).toBe(expected);
      if (expected === 503) {
        expect(r.json).toMatchObject({ error: 'processing_in_progress', retry: true });
      } else {
        expect(r.json).toMatchObject({ ok: false, skipped: 'provider_fetch_failed', http_status: 403 });
      }
    }
  });

  it('H2 provider timeout is a retryable 503', async () => {
    await proProvider('PRE-HTTP-FETCH');
    mock({ '/preapproval/PRE-TIMEOUT': { timeout: true } });
    const r = await webhook({ topic: 'subscription_preapproval', data: { id: 'PRE-TIMEOUT' } }, 'PRE-TIMEOUT');
    expect(r.status).toBe(503);
    expect(r.json).toMatchObject({ error: 'processing_in_progress', retry: true });
  }, 20_000);

  it('A1 busy is 503; terminal duplicate is a 200 ACK', async () => {
    await proProvider(PRO_PRE);
    mock({ [`/preapproval/${PRO_PRE}`]: { status: 200, body: preapproval(PRO_PRE, 'authorized', `PRO_${IDS.proLawyer}`) } });
    const eventId = `${PRO_PRE}:authorized:2026-10-22T10:00:00.000Z`;
    const { error } = await supabase.from('subscription_events').insert({
      product_type: 'pro', subscription_id: IDS.proSub, provider: 'mercadopago',
      provider_event_id: eventId, provider_event_at: '2026-10-22T10:00:00.000Z',
      event_type: 'preapproval_authorized', provider_status: 'authorized',
      status: 'processing', claim_token: crypto.randomUUID(), attempts: 1,
      lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    if (error) throw error;
    let r = await webhook({ topic: 'subscription_preapproval', data: { id: PRO_PRE } }, PRO_PRE);
    expect(r.status).toBe(503);
    expect(r.json).toMatchObject({ error: 'processing_in_progress', retry: true });
    expect((await proRow()).status).toBe('pending');

    await supabase.from('subscription_events').update({ status: 'processed' }).eq('subscription_id', IDS.proSub).eq('provider_event_id', eventId);
    r = await webhook({ topic: 'subscription_preapproval', data: { id: PRO_PRE } }, PRO_PRE);
    expect(r.status).toBe(200);
    expect(r.text).toBe('OK');
    expect((await proRow()).status).toBe('pending');
  });

  it('unknown, ambiguous and missing resourceId topics are explicit 200 ACKs', async () => {
    await proProvider(PRO_PRE);
    let r = await webhook({ topic: 'unknown_topic_4_65', data: { id: PRO_PRE } }, PRO_PRE);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true, ignored: true, reason: 'unsupported_topic' });

    r = await webhook({ topic: 'subscription', data: { id: PRO_PRE } }, PRO_PRE);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true, ignored: true, reason: 'ambiguous_subscription_topic' });

    r = await webhook({ topic: 'preapproval' }, '');
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true, ignored: true, reason: 'missing_resource_id' });
  });

  it('AI success contract is preserved through the exact route', async () => {
    mock({
      [`/preapproval/${AI_PRE}`]: { status: 200, body: preapproval(AI_PRE, 'authorized', `AI_${IDS.aiLawyer}`) },
    });
    const r = await webhook({ topic: 'subscription_preapproval', data: { id: AI_PRE } }, AI_PRE);
    expect(r.status).toBe(200);
    const { data, error } = await supabase.from('ai_subscriptions').select('*').eq('id', IDS.aiSub).single();
    if (error) throw error;
    expect(data.status).toBe('active');
    expect(data.provider_subscription_id).toBe(AI_PRE);
    const { data: evs, error: evErr } = await supabase.from('subscription_events').select('*').eq('subscription_id', IDS.aiSub);
    if (evErr) throw evErr;
    expect(evs).toHaveLength(1);
    expect(evs[0].status).toBe('processed');
  });

  it('Empresas success contract is preserved through the exact route', async () => {
    mock({
      [`/preapproval/${EMP_PRE}`]: { status: 200, body: preapproval(EMP_PRE, 'authorized', IDS.company) },
    });
    const r = await webhook({ topic: 'subscription_preapproval', data: { id: EMP_PRE } }, EMP_PRE);
    expect(r.status).toBe(200);
    const { data: sub, error } = await supabase.from('company_subscriptions').select('*').eq('id', IDS.companySub).single();
    if (error) throw error;
    expect(sub.status).toBe('active');
    const { data: company, error: cErr } = await supabase.from('companies').select('*').eq('id', IDS.company).single();
    if (cErr) throw cErr;
    expect(company.status).toBe('active');
    const { data: usage, error: uErr } = await supabase.from('company_usage').select('*').eq('company_id', IDS.company);
    if (uErr) throw uErr;
    expect(usage).toHaveLength(1);
    const { data: pe, error: pErr } = await supabase.from('subscription_payment_events').select('*').eq('subscription_id', IDS.companySub);
    if (pErr) throw pErr;
    expect(pe).toHaveLength(1);
  });
});
