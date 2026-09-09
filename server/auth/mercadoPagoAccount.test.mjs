// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createAuthorization } from './authorization.mjs';

const A = '00000000-0000-4000-a000-000000000001';
const B = '00000000-0000-4000-a000-000000000002';
const paths = { save: '/api/mercadopago/save-account', get: '/api/mercadopago/account/:userId', disconnect: '/api/mercadopago/disconnect/:userId' };
const source = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const fakeSecrets = { access_token: 'fake-access-secret', refresh_token: 'fake-refresh-secret', client_secret: 'fake-client-secret' };

function setup(role) {
  const rows = [A, B].map(id => ({ id, user_id: id, mercadopago_user_id: `mp-${id}`, email: `${id}@example.test`, ...fakeSecrets }));
  const db = { mercadopago_accounts: rows, profiles: [A, B].map(id => ({ id, mercado_pago_connected: true })) };
  const operations = [];
  let failure = false;
  const supabase = {
    auth: { getUser: vi.fn(async token => ({ data: { user: token === 'valid' ? { id: A, app_metadata: { role }, user_metadata: { role: 'admin' } } : null }, error: token === 'valid' ? null : Error('invalid') })) },
    from: vi.fn(table => {
      let operation = 'select', payload, columns, filters = [];
      const q = {
        select(value) { columns = value; return q; }, single() { return q; },
        eq(key, value) { filters.push(r => r[key] === value); return q; },
        upsert(value) { operation = 'upsert'; payload = value; return q; },
        update(value) { operation = 'update'; payload = value; return q; },
        delete() { operation = 'delete'; return q; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            operations.push({ table, operation });
            if (failure) return { error: { message: JSON.stringify(fakeSecrets) }, data: null };
            let matches = db[table].filter(r => filters.every(f => f(r)));
            if (operation === 'upsert') {
              let row = db[table].find(r => r.user_id === payload.user_id);
              if (!row) { row = { id: 'new' }; db[table].push(row); }
              Object.assign(row, payload); matches = [row];
            }
            if (operation === 'update') matches.forEach(r => Object.assign(r, payload));
            if (operation === 'delete') db[table] = db[table].filter(r => !matches.includes(r));
            const row = matches[0];
            const data = row && columns ? Object.fromEntries(columns.split(',').map(k => k.trim()).map(k => [k, row[k]])) : null;
            return { data, error: !row && operation === 'select' ? { code: 'PGRST116' } : null };
          }).then(resolve, reject);
        },
      };
      return q;
    }),
  };
  const routes = new Map();
  const app = Object.fromEntries(['post', 'get', 'delete'].map(method => [method, (path, ...handlers) => routes.set(path, handlers)]));
  const log = { error: vi.fn(), warn: vi.fn() };
  const context = { app, supabase, ...createAuthorization({ supabase }), console: log };
  for (const statement of ast.statements) {
    const call = ts.isExpressionStatement(statement) ? statement.expression : null;
    if (call && ts.isCallExpression(call) && Object.values(paths).includes(call.arguments[0]?.text)) vm.runInNewContext(statement.getText(ast), context);
  }
  async function run(action, target = A, authorization = 'Bearer valid', body = {}) {
    const req = { headers: { authorization }, params: { userId: target }, body: { userId: target, mercadopagoUserId: 'fake-mp-id', accessToken: fakeSecrets.access_token, refreshToken: fakeSecrets.refresh_token, ...body } };
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.body = data; return this; } };
    let index = 0;
    const next = async () => { const handler = routes.get(paths[action])[index++]; if (handler) await handler(req, res, next); };
    await next(); return res;
  }
  return { db, operations, supabase, log, run, fail() { failure = true; } };
}

describe('Actual MP account handlers: authenticate -> ownership -> service-role', () => {
  for (const action of Object.keys(paths)) {
    for (const token of ['', 'Bearer invalid', 'Bearer expired', 'Basic valid']) {
      it(`${action}: rejects missing/invalid authentication (${token || 'missing'}) before DB`, async () => {
        const s = setup(); const before = structuredClone(s.db);
        expect((await s.run(action, B, token)).code).toBe(401);
        expect(s.supabase.from).not.toHaveBeenCalled(); expect(s.db).toEqual(before);
      });
    }
    for (const role of [undefined, 'admin', 'superadmin']) {
      it(`${action}: cross-user denied, including trusted role ${role}`, async () => {
        const s = setup(role); const before = structuredClone(s.db);
        const res = await s.run(action, B);
        expect(res.code).toBe(403); expect(res.body).toEqual({ error: 'Forbidden' });
        expect(s.supabase.from).not.toHaveBeenCalled(); expect(s.db).toEqual(before);
      });
    }
    it(`${action}: owner succeeds without returning credentials`, async () => {
      const s = setup(); const victim = structuredClone(s.db.mercadopago_accounts[1]);
      const res = await s.run(action);
      expect(res.code).toBe(200); expect(s.db.mercadopago_accounts.find(r => r.user_id === B)).toEqual(victim);
      for (const [key, value] of Object.entries(fakeSecrets)) { expect(JSON.stringify(res.body)).not.toContain(key); expect(JSON.stringify(res.body)).not.toContain(value); }
      if (action === 'save') { expect(s.db.mercadopago_accounts[0].mercadopago_user_id).toBe('fake-mp-id'); expect(s.db.profiles[0].mercado_pago_connected).toBe(true); }
      if (action === 'get') expect(res.body.connected).toBe(true);
      if (action === 'disconnect') { expect(s.db.mercadopago_accounts.find(r => r.user_id === A)).toBeUndefined(); expect(s.db.profiles[0]).toMatchObject({ mercado_pago_connected: false, mercado_pago_user_id: null, mercado_pago_email: null, mercado_pago_nickname: null, mercado_pago_connected_at: null }); }
    });
    it(`${action}: DB failure does not leak credentials through response/logs`, async () => {
      const s = setup(); s.fail(); const res = await s.run(action);
      expect(res.code).toBe(500);
      const output = JSON.stringify([res.body, s.log.error.mock.calls, s.log.warn.mock.calls]);
      for (const value of Object.values(fakeSecrets)) expect(output).not.toContain(value);
    });
  }
  it('save derives ownership from Auth when optional body.userId is omitted', async () => {
    const s = setup(); expect((await s.run('save', A, 'Bearer valid', { userId: undefined })).code).toBe(200);
    expect(s.db.mercadopago_accounts[0].user_id).toBe(A);
  });
  it('save rejects a malformed ownership identifier before DB', async () => {
    const s = setup(); expect((await s.run('save', A, 'Bearer valid', { userId: [A] })).code).toBe(403);
    expect(s.supabase.from).not.toHaveBeenCalled();
  });
  it('GET preserves sanitized profile fallback and disconnected response', async () => {
    const s = setup(); s.db.mercadopago_accounts = [];
    s.db.profiles[0].mercado_pago_email = 'owner@example.test';
    expect((await s.run('get')).body).toMatchObject({ connected: true, account: { email: 'owner@example.test' } });
    s.db.profiles[0].mercado_pago_connected = false;
    expect((await s.run('get')).body).toEqual({ connected: false });
  });
  it('full owner lifecycle: save, read, disconnect, read', async () => {
    const s = setup(); s.db.mercadopago_accounts = [];
    expect((await s.run('save')).code).toBe(200);
    expect((await s.run('get')).body.connected).toBe(true);
    expect((await s.run('disconnect')).code).toBe(200);
    expect((await s.run('get')).body.connected).toBe(false);
  });
});

// Execute the actual component's request functions, without mounting OAuth or contacting providers.
const uiSource = readFileSync(new URL('../../src/components/dashboard/MercadoPagoConnect.tsx', import.meta.url), 'utf8');
const uiAst = ts.createSourceFile('component.tsx', uiSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function uiFunctions() {
  const functions = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ['accountAuthorization', 'checkConnection', 'saveAccount', 'handleDisconnect'].includes(node.name.getText(uiAst))) functions.push(`const ${node.getText(uiAst)};`);
    ts.forEachChild(node, visit);
  }
  visit(uiAst);
  return ts.transpileModule(functions.join('\n').replaceAll('import.meta.env.VITE_API_BASE_URL', "'https://example.test'"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}
describe('Actual frontend MP account request functions', () => {
  for (const [name, method] of [['checkConnection', 'GET'], ['saveAccount', 'POST'], ['handleDisconnect', 'DELETE']]) {
    for (const authenticated of [true, false]) it(`${name}: ${authenticated ? 'sends current Bearer' : 'does not fetch without session'}`, async () => {
      const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ connected: true, account: { id: A } }) }));
      const noop = () => {};
      const ctx = { supabase: { auth: { getSession: async () => ({ data: { session: authenticated ? { access_token: 'fake-session-current' } : null }, error: null }) } }, fetch, user: { id: A }, setIsLoading: noop, setIsConnected: noop, setAccount: noop, setIsDisconnecting: noop, toast: noop };
      vm.createContext(ctx); vm.runInContext(uiFunctions() + `\nglobalThis.execute = ${name};`, ctx);
      await ctx.execute({ userId: A, mercadopagoUserId: 'fake-mp', email: 'owner@example.test' });
      if (!authenticated) expect(fetch).not.toHaveBeenCalled();
      else { expect(fetch).toHaveBeenCalledTimes(1); const [, options] = fetch.mock.calls[0]; expect(options.headers.Authorization).toBe('Bearer fake-session-current'); expect(options.method || 'GET').toBe(method); }
    });
  }
});
