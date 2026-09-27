import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const src = readFileSync(resolve(process.cwd(), 'server.mjs'), 'utf8');
const ast = ts.createSourceFile('server.mjs', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const ROUTE = '/api/auth/password-setup-complete';

function harness({ tokenUser = 'user-A', users = {}, updateFails = false } = {}) {
  const routes = {};
  const updateCalls = [];
  const store = {
    'user-A': { id: 'user-A', email: 'a@example.cl', app_metadata: { provider: 'email', role: 'lawyer' } },
    'user-B': { id: 'user-B', email: 'b@example.cl', app_metadata: { provider: 'email', role: 'lawyer', password_setup: false } },
    ...users,
  };
  const supabase = {
    auth: {
      admin: {
        getUserById: async (id) => ({ data: { user: store[id] ? { ...store[id] } : null }, error: null }),
        updateUserById: async (id, attrs) => {
          updateCalls.push({ id, attrs });
          if (updateFails) return { data: null, error: { message: 'db down' } };
          if (!store[id]) return { data: null, error: { message: 'not found' } };
          store[id] = { ...store[id], app_metadata: { ...attrs.app_metadata } };
          return { data: { user: store[id] }, error: null };
        },
      },
    },
  };
  const ctx = vm.createContext({
    app: { post: (p, h) => { routes[p] = h; }, get() {}, delete() {}, patch() {} },
    supabase,
    console: { log() {}, info() {}, warn() {}, error() {} },
    getUserIdFromToken: async (t) => (t === 'good-token' ? tokenUser : null),
  });
  for (const n of ast.statements) {
    if (ts.isVariableStatement(n) && n.declarationList.declarations.some((d) => d.name.getText(ast) === 'requireAILawyer')) vm.runInContext(n.getText(ast), ctx);
    if (ts.isFunctionDeclaration(n) && n.name?.text === 'requireAILawyer') vm.runInContext(n.getText(ast), ctx);
    if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) && n.expression.arguments[0]?.text === ROUTE) vm.runInContext(n.getText(ast), ctx);
  }
  return { routes, updateCalls, store, supabase };
}

async function call(h, { token = 'Bearer good-token', body = {} } = {}) {
  const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } };
  await h.routes[ROUTE]({ headers: { authorization: token }, body }, res);
  return res;
}

describe('POST /api/auth/password-setup-complete (4.53D)', () => {
  it('401 without valid token, no side effects', async () => {
    const h = harness();
    const res = await call(h, { token: 'Bearer bad' });
    expect(res.statusCode).toBe(401);
    expect(h.updateCalls).toHaveLength(0);
  });

  it('marks ONLY the token owner, preserving existing app_metadata', async () => {
    const h = harness();
    const res = await call(h, { body: { user_id: 'user-B', email: 'b@example.cl' } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
    // cross-user impossible: body params ignored, owner marked
    expect(h.updateCalls).toHaveLength(1);
    expect(h.updateCalls[0].id).toBe('user-A');
    expect(h.updateCalls[0].attrs.app_metadata).toMatchObject({ provider: 'email', role: 'lawyer', password_setup: true });
    expect(typeof h.updateCalls[0].attrs.app_metadata.password_setup_at).toBe('string');
    expect(h.store['user-B'].app_metadata).not.toHaveProperty('password_setup_at');
  });

  it('no password travels through the endpoint', async () => {
    const h = harness();
    await call(h, { body: { password: 'Aa1!bbbb', newPassword: 'x' } });
    const serialized = JSON.stringify(h.updateCalls);
    expect(serialized).not.toContain('Aa1!bbbb');
    expect(h.updateCalls[0].attrs).not.toHaveProperty('password');
  });

  it('unknown user → 404; update failure → 502 recoverable', async () => {
    const h = harness({ tokenUser: 'ghost' });
    expect((await call(h)).statusCode).toBe(404);
    const h2 = harness({ updateFails: true });
    const res = await call(h2);
    expect(res.statusCode).toBe(502);
    expect(res.body.code).toBe('MARKER_FAILED');
  });

  it('static contract: JWT-derived target, service-role update, no sensitive response', () => {
    expect(src).toContain("app.post('/api/auth/password-setup-complete'");
    const start = src.indexOf("app.post('/api/auth/password-setup-complete'");
    const region = src.slice(start, start + 2200);
    expect(region).toContain('requireAILawyer');
    expect(region).toContain('updateUserById');
    expect(region).not.toMatch(/req\.body\.(user_id|email|password)/);
    expect(region).not.toContain('encrypted_password');
  });
});
