// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const A = '00000000-0000-4000-a000-000000000001';
const B = '00000000-0000-4000-a000-000000000002';
const P1 = '00000000-0000-4000-a000-000000000011';
const P2 = '00000000-0000-4000-a000-000000000012';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const source = read('supabase/functions/process-weekly-payouts/index.ts');
const ast = ts.createSourceFile('edge.ts', source, ts.ScriptTarget.Latest, true);
// Evaluate the actual Edge module, replacing only remote imports/runtime dependencies.
const executable = ts.transpileModule(ast.statements.filter(s => !ts.isImportDeclaration(s)).map(s => s.getText(ast)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
let pg;
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec('CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid primary key); CREATE TABLE public.services(id uuid primary key);');
  const payments = read('supabase/migrations/20240927020000_create_payments_tables.sql').match(/CREATE TABLE[\s\S]*?\n\);/)[0];
  const extensions = read('supabase/migrations/20241125150000_platform_settings_and_payouts.sql');
  await pg.exec(payments.replaceAll('uuid_generate_v4()', 'gen_random_uuid()'));
  await pg.exec(extensions.match(/ALTER TABLE public.payments[\s\S]*?;/)[0]);
  await pg.exec(extensions.match(/CREATE TABLE IF NOT EXISTS public.payout_logs[\s\S]*?\n\);/)[0].replaceAll('uuid_generate_v4()', 'gen_random_uuid()'));
  // Account fixture follows the existing save-account contract; not a production schema assertion.
  await pg.exec('CREATE TABLE mercadopago_accounts(user_id uuid primary key, mercadopago_user_id text, access_token text);');
  await pg.query('INSERT INTO auth.users VALUES ($1), ($2)', [A, B]);
}, 20000);
afterAll(async () => { await pg?.close(); });
beforeEach(async () => {
  await pg.exec('TRUNCATE payments, payout_logs, mercadopago_accounts;');
  await pg.query("INSERT INTO payments (id,user_id,lawyer_id,amount,platform_fee,lawyer_amount,status,created_at) VALUES ($1,$3,$3,50000,10000,40000,'succeeded','2020-01-01'), ($2,$3,$3,50000,10000,40000,'succeeded','2020-01-01')", [P1,P2,A]);
  await pg.query("INSERT INTO mercadopago_accounts VALUES ($1,'provider-987','fake-lawyer-token')", [A]);
});

// Execute each fluent Supabase operation as parameterized PostgreSQL SQL.
function setup(options = {}) {
  const statements = [];
  const supabase = { from(table) {
    let action = 'select', value, projection = '*', returning = false, single = false, predicates = [];
    const q = {
      select(columns = '*') { projection = columns; returning = true; return q; },
      eq(key, value) { predicates.push([key, '=', value]); return q; },
      lt(key, value) { predicates.push([key, '<', value]); return q; },
      in(key, values) { predicates.push([key, 'IN', values]); return q; },
      update(payload) { action = 'update'; value = payload; return q; },
      insert(payload) { action = 'insert'; value = payload; return q; },
      single() { single = true; return q; },
      then(resolve, reject) {
        return (async () => {
          if (options.failCompletion && value?.payout_status === 'completed') return { data: null, error: { message: 'injected completion failure' } };
          if (options.throwCompletion && value?.payout_status === 'completed') throw Error('injected transport failure');
          if (options.failLog && table === 'payout_logs') return { data: null, error: { message: 'injected log failure' } };
          if (options.failClaim && value?.payout_status === 'processing') return { data: null, error: { message: 'injected claim failure' } };
          const params = [];
          const param = v => { params.push(v); return `$${params.length}`; };
          const fields = Object.keys(value || {});
          let sql = action === 'select' ? `SELECT ${projection} FROM ${table}` : action === 'update' ? `UPDATE ${table} SET ${fields.map(k => `${k}=${param(value[k])}`).join(',')}` : `INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map(k => param(value[k])).join(',')})`;
          if (predicates.length) sql += ' WHERE ' + predicates.map(([k,op,v]) => op === 'IN' ? `${k} IN (${v.map(param).join(',')})` : `${k} ${op} ${param(v)}`).join(' AND ');
          if (action !== 'select' && returning) sql += ` RETURNING ${projection}`;
          statements.push(sql);
          try {
            let { rows } = await pg.query(sql, params);
            if (value?.payout_status === 'processing' && options.corruptClaim) rows = options.corruptClaim(rows);
            return { data: single ? rows[0] || null : rows, error: single && !rows.length ? { message: 'not found' } : null };
          } catch (error) { return { data: null, error }; }
        })().then(resolve, reject);
      },
    };
    return q;
  } };
  let handler;
  const provider = vi.fn(async () => {
    if (options.networkFailure) throw Error('network unavailable');
    return { ok: !options.providerFailure, status: options.providerFailure ? 503 : 200, json: async () => options.receipt ?? { id: 'transfer-1', status: 'completed' } };
  });
  const env = { PAYOUT_CRON_SECRET: 'fake-cron', MERCADOPAGO_ACCESS_TOKEN: 'fake-platform', ...options.env };
  const context = { createClient: () => supabase, serve: fn => { handler = fn; }, Deno: { env: { get: key => env[key] } }, fetch: provider, Response, Date, console: { log(){}, warn(){}, error(){} } };
  vm.createContext(context); vm.runInContext(executable, context);
  const group = () => ({ lawyerId: A, totalAmount: 80000, currency: 'CLP', paymentIds: [P1,P2] });
  return { statements, provider, run: () => context.processPayout(supabase, group()), handler: (headers = { 'x-cron-secret': 'fake-cron' }, body = {}) => handler({ method: 'POST', headers: new Headers(headers), json: async () => body }), amounts: () => provider.mock.calls.map(([,request]) => JSON.parse(request.body)), group };
}
const states = async () => (await pg.query('SELECT id,payout_status FROM payments ORDER BY id')).rows;
const logs = async () => (await pg.query('SELECT * FROM payout_logs')).rows;

describe('Actual Edge payouts + versioned PostgreSQL payment/log schema', () => {
  it('C9: scheduled handler reads canonical schema, ignores public amount/ID inputs, resolves linked provider destination', async () => {
    const s = setup(); const res = await s.handler(undefined, { lawyer_id: B, paymentIds: ['injected'], amount: 99999999 });
    expect(res.status).toBe(200); expect((await res.json()).processed[0].status).toBe('completed');
    expect(s.amounts()[0]).toMatchObject({ amount: 80000, user_id: 'provider-987', currency_id: 'CLP' });
    expect(s.amounts()[0].metadata.payment_ids.sort()).toEqual([P1,P2]);
    expect(s.statements[0]).toContain('SELECT id, lawyer_id, lawyer_amount, currency, created_at FROM payments');
  });
  it('INV-2 full claim transfers 80k and logs 80k', async () => {
    const s = setup(); expect((await s.run()).status).toBe('completed');
    expect(s.amounts()[0].amount).toBe(80000); expect((await logs())[0]).toMatchObject({ total_amount: 80000, payment_ids: [P1,P2] });
  });
  it('C10 / INV-2,3,5 partial claim transfers and logs exactly 40k; other worker untouched', async () => {
    await pg.query("UPDATE payments SET payout_status='processing' WHERE id=$1", [P2]);
    const s = setup(); await s.run();
    expect(s.amounts()[0]).toMatchObject({ amount: 40000, metadata: { payment_ids: [P1] } });
    expect((await logs())[0]).toMatchObject({ total_amount: 40000, payment_ids: [P1] });
    expect(await states()).toEqual([{ id: P1, payout_status: 'completed' }, { id: P2, payout_status: 'processing' }]);
  });
  it('INV-4 zero claim sends nothing and writes no success log', async () => {
    await pg.exec("UPDATE payments SET payout_status='processing'");
    const s = setup(); expect((await s.run()).status).toBe('skipped'); expect(s.provider).not.toHaveBeenCalled(); expect(await logs()).toEqual([]);
  });
  it('INV-1 concurrent executions use conditional PostgreSQL claims: each payment transferred once', async () => {
    const a = setup(), b = setup();
    const results = await Promise.all([a.run(), b.run()]);
    expect(results.map(r => r.status).sort()).toEqual(['completed','skipped']);
    const transfers = [...a.amounts(), ...b.amounts()];
    expect(transfers).toHaveLength(1); expect(transfers[0].amount).toBe(80000);
    expect(new Set(transfers.flatMap(t => t.metadata.payment_ids)).size).toBe(2);
  });
  it('mixed lawyer guard rejects inconsistent returned rows', async () => {
    const s = setup({ corruptClaim: rows => rows.map((r,i) => ({...r, lawyer_id: i ? B : A})) });
    expect((await s.run()).status).toBe('failed'); expect(s.provider).not.toHaveBeenCalled();
    expect((await states()).every(r => r.payout_status !== 'completed')).toBe(true);
  });
  for (const amount of [null, 0, -1, NaN, 1.5, '40000', Infinity]) it(`invalid amount ${amount} cannot complete`, async () => {
    const s = setup({ corruptClaim: rows => rows.map(r => ({...r, lawyer_amount: amount})) });
    expect((await s.run()).status).toBe('failed'); expect(s.provider).not.toHaveBeenCalled();
    expect((await states()).every(r => r.payout_status === 'error')).toBe(true);
  });
  it('invalid currency fails safely', async () => {
    await pg.exec("UPDATE payments SET currency='USD'");
    const s = setup(); expect((await s.run()).status).toBe('failed'); expect(s.provider).not.toHaveBeenCalled();
  });
  it('total exceeding payout_logs INTEGER range never reaches provider', async () => {
    const s = setup({ corruptClaim: rows => rows.map(r => ({...r, lawyer_amount: 2147483647})) });
    expect((await s.run()).status).toBe('failed'); expect(s.provider).not.toHaveBeenCalled();
  });
  for (const options of [{providerFailure:true}, {networkFailure:true}, {receipt:{id:'pending-transfer',status:'pending'}}, {receipt:{}}]) it(`INV-6 provider failure or unconfirmed receipt ${JSON.stringify(options)}`, async () => {
    const s = setup(options); expect((await s.run()).status).toBe('failed');
    expect((await states()).every(r => r.payout_status === 'error')).toBe(true);
    expect((await logs())[0]).toMatchObject({ status:'failed',total_amount:80000 });
    await s.run(); expect(s.provider).toHaveBeenCalledTimes(1);
  });
  for (const options of [{failCompletion:true}, {throwCompletion:true}, {failLog:true}]) it(`INV-7 confirmed transfer + local failure: ${JSON.stringify(options)}`, async () => {
    const s = setup(options); expect((await s.run()).status).toBe('reconciliation_required');
    expect((await states()).every(r => ['processing','completed'].includes(r.payout_status))).toBe(true);
    await s.run(); expect(s.provider).toHaveBeenCalledTimes(1);
  });
  it('missing linked account fails instead of consulting legacy profile token', async () => {
    await pg.exec('TRUNCATE mercadopago_accounts'); const s = setup();
    expect((await s.run()).status).toBe('failed'); expect(s.provider).not.toHaveBeenCalled();
  });
  it('claim DB error is not disguised as a normal empty claim', async () => {
    const s = setup({failClaim:true}); await expect(s.run()).rejects.toThrow('claim failed'); expect(s.provider).not.toHaveBeenCalled();
  });
  for (const secret of [undefined, 'wrong-secret']) it(`internal boundary rejects ${secret}`, async () => {
    const s = setup(); const res = await s.handler(secret ? {'x-cron-secret':secret} : {});
    expect(res.status).toBe(401); expect(s.statements).toEqual([]); expect(s.provider).not.toHaveBeenCalled();
    expect(await res.text()).not.toContain('wrong-secret');
  });
  it('missing configured secret fails closed', async () => {
    const s = setup({env:{PAYOUT_CRON_SECRET:undefined}}); expect((await s.handler()).status).toBe(401); expect(s.provider).not.toHaveBeenCalled();
  });
});
