// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createAuthorization } from './authorization.mjs';
import { createCompanyAuthorization, COMPANY_ROUTE_POLICIES } from './companyAuthorization.mjs';

const id = n => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`;
const A = id(1), B = id(2), USER_A = id(3), USER_B = id(4), MEMBER = id(5), VIEWER = id(6), ADMIN = id(7), LAWYER = id(8);
const REQUEST_A = id(11), REQUEST_B = id(12), BUDGET_A = id(21), BUDGET_B = id(22), DOC_A = id(31), DOC_B = id(32), FOLDER_A = id(41), FOLDER_B = id(42);

function fixture(user = { id: USER_A, app_metadata: {}, user_metadata: {} }) {
  const tables = {
    companies: [{ id: A, user_id: USER_A }, { id: B, user_id: USER_B }],
    company_members: [
      { company_id: A, user_id: MEMBER, role: 'member', joined_at: '2026-09-01' },
      { company_id: A, user_id: VIEWER, role: 'viewer', joined_at: '2026-09-01' },
      { company_id: A, user_id: ADMIN, role: 'admin', joined_at: '2026-09-01' },
    ],
    company_requests: [{ id: REQUEST_A, company_id: A, lawyer_id: LAWYER }, { id: REQUEST_B, company_id: B, lawyer_id: USER_B }],
    company_budgets: [{ id: BUDGET_A, company_id: A, request_id: REQUEST_A }, { id: BUDGET_B, company_id: B, request_id: REQUEST_B }],
    legal_documents: [{ id: DOC_A, company_id: A }, { id: DOC_B, company_id: B }],
    legal_folders: [{ id: FOLDER_A, company_id: A }, { id: FOLDER_B, company_id: B }],
    company_request_documents: [],
    company_subscriptions: [{ id: id(51), company_id: A }, { id: id(52), company_id: B }],
  };
  const writes = [], reads = [];
  const supabase = {
    auth: { getUser: vi.fn(async token => token === 'valid' ? { data: { user }, error: null } : { data: { user: null }, error: new Error('Invalid token') }) },
    from: vi.fn(table => {
      let filters = [], operation, values, single = false;
      const builder = {
        select() { return builder; },
        eq(key, value) { filters.push([key, value]); return builder; },
        update(payload) { operation = 'update'; values = payload; return builder; },
        insert(payload) { operation = 'insert'; values = payload; return builder; },
        single() { single = true; return builder; },
        maybeSingle() { single = true; return builder; },
        order() { return builder; },
        then(resolve, reject) {
          let rows = (tables[table] || []).filter(row => filters.every(([k, v]) => row[k] === v));
          if (operation) {
            writes.push({ table, operation, values, filters });
            rows = operation === 'insert' ? [{ id: id(99), ...values }] : rows.map(row => ({ ...row, ...values }));
          } else reads.push(table);
          return Promise.resolve({ data: single ? rows[0] || null : rows, error: null }).then(resolve, reject);
        },
      };
      return builder;
    }),
  };
  return { supabase, tables, writes, reads };
}
const response = () => ({ code: 200, body: undefined, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const req = (overrides = {}) => ({ headers: { authorization: 'Bearer valid' }, params: {}, query: {}, body: {}, ...overrides });

// Load the actual registrations and handlers, without starting server.mjs's
// network listeners, cron jobs, or live external clients. No string assertions.
const source = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
function registrations(context) {
  const routes = new Map();
  const app = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(method => [method, (path, ...handlers) => routes.set(`${method.toUpperCase()} ${path}`, handlers)]));
  for (const node of ast.statements) {
    const call = ts.isExpressionStatement(node) ? node.expression : null;
    if (!call || !ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression)
      || call.expression.expression.getText(ast) !== 'app' || !ts.isStringLiteral(call.arguments[0])) continue;
    const path = call.arguments[0].text;
    if (path.startsWith('/api/empresas/') || path.startsWith('/api/admin/') || path === '/api/lawyer/empresas/requests') {
      vm.runInNewContext(node.getText(ast), { app, console, ...context });
    }
  }
  return routes;
}
function setup(user) {
  const f = fixture(user);
  const auth = createAuthorization(f);
  const companyAuthorization = createCompanyAuthorization({ ...f, authenticate: auth.authenticate });
  const routes = registrations({ ...f, ...auth, companyAuthorization });
  async function execute(route, request) {
    const res = response();
    const handlers = routes.get(route);
    expect(handlers, route).toBeDefined();
    const dispatch = async i => handlers[i]?.(request, res, () => dispatch(i + 1));
    await dispatch(0);
    return res;
  }
  return { ...f, ...auth, companyAuthorization, routes, execute };
}

describe('Actual requireAdmin middleware', () => {
  it.each([
    ['CLIENT + user_metadata.is_admin=true', { user_metadata: { is_admin: true } }, 'Bearer valid', 403],
    ['CLIENT + user_metadata.role=admin', { user_metadata: { role: 'admin' } }, 'Bearer valid', 403],
    ['Editable profile role / top-level role does not authorize', { role: 'admin' }, 'Bearer valid', 403],
    ['Former email bypass does not authorize', { email: 'gigfmedia@icloud.com' }, 'Bearer valid', 403],
    ['Server-managed admin', { app_metadata: { role: 'admin' } }, 'Bearer valid', 200],
    ['Server-managed superadmin', { app_metadata: { role: 'superadmin' } }, 'Bearer valid', 200],
    ['Missing token', {}, undefined, 401],
    ['Invalid token', {}, 'Bearer invalid', 401],
    ['Wrong scheme', {}, 'Basic valid', 401],
  ])('%s', async (_name, fields, authorization, expected) => {
    const f = fixture({ id: USER_A, app_metadata: {}, user_metadata: {}, ...fields });
    const { requireAdmin } = createAuthorization(f);
    const res = response(), next = vi.fn();
    await requireAdmin(req({ headers: { authorization } }), res, next);
    expect(res.code).toBe(expected);
    expect(next).toHaveBeenCalledTimes(expected === 200 ? 1 : 0);
    expect(f.supabase.from).not.toHaveBeenCalled();
  });
  it('real admin route rejects metadata forgery before its handler reads private data', async () => {
    const s = setup({ id: USER_A, user_metadata: { is_admin: true } });
    const res = await s.execute('GET /api/admin/empresas', req());
    expect(res.code).toBe(403);
    expect(s.supabase.from).not.toHaveBeenCalled();
  });
  it('Auth outage fails closed', async () => {
    const s = setup();
    s.supabase.auth.getUser.mockRejectedValueOnce(new Error('offline'));
    const res = await s.execute('POST /api/empresas/budgets/:id/approve', req({ params: { id: BUDGET_A } }));
    expect(res.code).toBe(401);
    expect(s.writes).toEqual([]);
  });
  it.each([
    'GET /api/lawyer/empresas/requests',
    'GET /api/empresas/lawyers',
    'POST /api/empresas/ratings',
    'POST /api/empresas/sla/check-breached',
  ])('%s rejects a non-Bearer token before DB', async route => {
    const s = setup();
    const res = await s.execute(route, req({ headers: { authorization: 'valid' } }));
    expect(res.code).toBe(401);
    expect(s.supabase.from).not.toHaveBeenCalled();
  });
});

describe('IDOR: actual protected route + actual handler', () => {
  it.each(['approve', 'reject'])('Owner A can %s a budget of A', async action => {
    const s = setup();
    const res = await s.execute(`POST /api/empresas/budgets/:id/${action}`, req({ params: { id: BUDGET_A } }));
    expect(res.code).toBe(200);
    expect(s.writes[0].table).toBe('company_budgets');
    expect(s.writes[0].filters).toContainEqual(['id', BUDGET_A]);
  });
  it('A with known valid UUID of B gets 403 and no mutation', async () => {
    const s = setup();
    const res = await s.execute('POST /api/empresas/budgets/:id/approve', req({ params: { id: BUDGET_B } }));
    expect(res.code).toBe(403);
    expect(s.writes).toEqual([]);
  });
  it.each([MEMBER, VIEWER])('Insufficient company role %s cannot approve', async userId => {
    const s = setup({ id: userId, user_metadata: { role: 'admin', company_id: A } });
    const res = await s.execute('POST /api/empresas/budgets/:id/approve', req({ params: { id: BUDGET_A }, body: { role: 'admin', user_id: USER_A } }));
    expect(res.code).toBe(403);
    expect(s.writes).toEqual([]);
  });
  it('Company admin membership permits approval', async () => {
    const s = setup({ id: ADMIN });
    const res = await s.execute('POST /api/empresas/budgets/:id/approve', req({ params: { id: BUDGET_A } }));
    expect(res.code).toBe(200);
    expect(s.writes).toHaveLength(1);
  });
  it('Pending invitation is not active membership', async () => {
    const s = setup({ id: ADMIN });
    s.tables.company_members.find(m => m.user_id === ADMIN).joined_at = null;
    const res = await s.execute('POST /api/empresas/budgets/:id/approve', req({ params: { id: BUDGET_A } }));
    expect(res.code).toBe(403);
    expect(s.writes).toEqual([]);
  });
  it('Uploads use the authenticated user, never the supplied uploadedBy', async () => {
    const s = setup();
    const res = await s.execute('POST /api/empresas/requests/:requestId/documents', req({
      params: { requestId: REQUEST_A }, body: { companyId: A, uploadedBy: USER_B, fileName: 'test.pdf', fileUrl: 'https://example.invalid/test.pdf' },
    }));
    expect(res.code).toBe(200);
    expect(s.writes[0].values.uploaded_by).toBe(USER_A);
    expect(s.writes[0].values.company_id).toBe(A);
  });
  it('A cannot upload to request B by claiming company A', async () => {
    const s = setup();
    const res = await s.execute('POST /api/empresas/requests/:requestId/documents', req({ params: { requestId: REQUEST_B }, body: { companyId: A } }));
    expect(res.code).toBe(403);
    expect(s.writes).toEqual([]);
  });
  it('Document A cannot be linked to request B', async () => {
    const s = setup();
    const res = await s.execute('POST /api/empresas/legal-documents/:id/link-request', req({ params: { id: DOC_A }, body: { requestId: REQUEST_B } }));
    expect(res.code).toBe(403);
    expect(s.writes).toEqual([]);
  });
  it('Ownership lookup failure does not authorize', async () => {
    const s = setup();
    s.supabase.from.mockImplementationOnce(() => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: null, error: new Error('offline') }) }));
    const res = await s.execute('POST /api/empresas/budgets/:id/approve', req({ params: { id: BUDGET_A } }));
    expect(res.code).toBe(503);
    expect(s.writes).toEqual([]);
  });
  it('Assigned lawyer may attach to their request, but cannot approve client budget', async () => {
    const s = setup({ id: LAWYER });
    const res = await s.execute('POST /api/empresas/requests/:requestId/documents', req({ params: { requestId: REQUEST_A }, body: { fileName: 'test.pdf', fileUrl: 'https://example.invalid/file' } }));
    expect(res.code).toBe(200);
    const denied = await s.execute('POST /api/empresas/budgets/:id/approve', req({ params: { id: BUDGET_A } }));
    expect(denied.code).toBe(403);
    expect(s.writes).toHaveLength(1);
  });
  it('lawyer request list ignores a different userId supplied in the query', async () => {
    const s = setup({ id: LAWYER });
    const res = await s.execute('GET /api/lawyer/empresas/requests', req({ query: { userId: USER_B } }));
    expect(res.code).toBe(200);
    expect(res.body.requests.map(r => r.id)).toEqual([REQUEST_A]);
  });
});

describe('Every company policy is wired into the real route', () => {
  for (const [route, policy] of Object.entries(COMPANY_ROUTE_POLICIES)) {
    it(`${route}: missing/invalid token rejected before DB`, async () => {
      for (const authorization of [undefined, 'Bearer invalid']) {
        const s = setup();
        const res = await s.execute(route, req({ headers: { authorization } }));
        expect(res.code).toBe(401);
        expect(s.supabase.from).not.toHaveBeenCalled();
      }
    });
    it(`${route}: user A / resource B → 403`, async () => {
      const s = setup();
      const ids = { companies: B, company_subscriptions: id(52), company_requests: REQUEST_B, company_budgets: BUDGET_B, legal_documents: DOC_B, legal_folders: FOLDER_B };
      const r = req(); r[policy.resource.location][policy.resource.key] = ids[policy.resource.table];
      const res = await s.execute(route, r);
      expect(res.code).toBe(403);
      expect(s.writes).toEqual([]);
    });
    if (policy.action !== 'read') it(`${route}: viewer cannot mutate`, async () => {
      const s = setup({ id: VIEWER });
      const ids = { companies: A, company_subscriptions: id(51), company_requests: REQUEST_A, company_budgets: BUDGET_A, legal_documents: DOC_A, legal_folders: FOLDER_A };
      const r = req(); r[policy.resource.location][policy.resource.key] = ids[policy.resource.table];
      const res = await s.execute(route, r);
      expect(res.code).toBe(403);
      expect(s.writes).toEqual([]);
    });
  }
});
