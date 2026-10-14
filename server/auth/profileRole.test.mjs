// @vitest-environment node
// H5 — tests directos de POST /api/profile/role (onboarding de rol).
// Reutiliza el patrón existente: registra el handler real desde server.mjs
// (AST + vm, sin levantar el servidor) con supabase mockeado en memoria.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createAuthorization, isPlatformAdmin } from './authorization.mjs';

const id = n => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`;
const USER = id(1), OTHER = id(2);

// Misma semántica que el helper de server.mjs (se inyecta al contexto vm).
const safeTrim = (value) => {
  if (typeof value !== 'string') return value ?? null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

function fixture({ user, profiles }) {
  const tables = { profiles: profiles.map(p => ({ ...p })) };
  const writes = [];
  const supabase = {
    auth: {
      getUser: vi.fn(async token =>
        token === 'valid'
          ? { data: { user }, error: null }
          : { data: { user: null }, error: new Error('Invalid token') }),
    },
    from: vi.fn(table => {
      const filters = [];
      let operation, values;
      const builder = {
        select() { return builder; },
        eq(key, value) { filters.push(row => row[key] === value); return builder; },
        // Soporta el OR de la lectura H3: id.eq.X,user_id.eq.X
        or(expr) {
          const clauses = String(expr).split(',').map(part => {
            const m = /^(\w+)\.eq\.(.+)$/.exec(part.trim());
            return row => row[m[1]] === m[2];
          });
          filters.push(row => clauses.some(fn => fn(row)));
          return builder;
        },
        update(payload) { operation = 'update'; values = payload; return builder; },
        insert(payload) { operation = 'insert'; values = payload; return builder; },
        maybeSingle() { return builder; },
        then(resolve, reject) {
          let rows = (tables[table] || []).filter(row => filters.every(fn => fn(row)));
          if (operation === 'update') {
            writes.push({ table, operation, values });
            rows = rows.map(row => ({ ...row, ...values }));
            tables[table] = tables[table].map(row =>
              filters.every(fn => fn(row)) ? { ...row, ...values } : row);
          }
          if (operation === 'insert') {
            writes.push({ table, operation, values });
            tables[table].push({ ...values });
            rows = [{ ...values }];
          }
          return Promise.resolve({ data: rows[0] || null, error: null }).then(resolve, reject);
        },
      };
      return builder;
    }),
  };
  return { supabase, tables, writes };
}

const source = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);

function loadRoleRoute(context) {
  const routes = new Map();
  const app = { post: (path, ...handlers) => routes.set(`POST ${path}`, handlers) };
  for (const node of ast.statements) {
    const call = ts.isExpressionStatement(node) ? node.expression : null;
    if (!call || !ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression)
      || call.expression.expression.getText(ast) !== 'app' || !ts.isStringLiteral(call.arguments[0])) continue;
    if (call.arguments[0].text !== '/api/profile/role') continue;
    vm.runInNewContext(node.getText(ast), { app, console, ...context });
  }
  return routes;
}

function setup({ user, profiles }) {
  const f = fixture({ user, profiles });
  const auth = createAuthorization(f);
  const routes = loadRoleRoute({ ...f, ...auth, isPlatformAdmin, safeTrim });
  async function execute(body, authorization = 'Bearer valid') {
    const res = { code: 200, body: undefined, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    // 'NO_HEADER' simula ausencia total del header (sin default del parámetro).
    const req = { headers: authorization === 'NO_HEADER' ? {} : { authorization }, body };
    const handlers = routes.get('POST /api/profile/role');
    expect(handlers, 'route').toBeDefined();
    const dispatch = async i => handlers[i]?.(req, res, () => dispatch(i + 1));
    await dispatch(0);
    return { res, tables: f.tables, writes: f.writes, supabase: f.supabase };
  }
  return { ...f, execute };
}

const baseUser = (overrides = {}) => ({
  id: USER,
  email: 'Nuevo@Gmail.com',
  app_metadata: {},
  user_metadata: { name: 'Nuevo Usuario' },
  ...overrides,
});

describe('POST /api/profile/role — autorización', () => {
  it('sin token o inválido: 401 sin tocar DB', async () => {
    const s = setup({ user: baseUser(), profiles: [] });
    for (const authorization of ['NO_HEADER', 'Bearer invalid', 'Basic valid']) {
      const { res, supabase } = await s.execute({ role: 'client' }, authorization);
      expect(res.code).toBe(401);
    }
    expect(s.supabase.from).not.toHaveBeenCalled();
  });

  it('usa exclusivamente el usuario autenticado: ignora IDs del cliente', async () => {
    const s = setup({ user: baseUser(), profiles: [] });
    // El body no tiene campo de ID; aunque se envíe uno extra, se ignora.
    const { res, tables } = await s.execute({ role: 'client', userId: OTHER, id: OTHER });
    expect(res.code).toBe(200);
    expect(res.body).toMatchObject({ success: true, role: 'client' });
    expect(tables.profiles).toHaveLength(1);
    expect(tables.profiles[0]).toMatchObject({ id: USER, user_id: USER });
  });

  it('administrador por app_metadata: 403 sin leer ni escribir perfiles', async () => {
    const s = setup({
      user: baseUser({ app_metadata: { role: 'admin' } }),
      profiles: [{ id: USER, user_id: USER, role: null }],
    });
    const { res, supabase, writes } = await s.execute({ role: 'client' });
    expect(res.code).toBe(403);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
  });

  it('perfil con rol admin legacy: 403 sin modificar', async () => {
    const s = setup({
      user: baseUser(),
      profiles: [{ id: USER, user_id: USER, role: 'admin' }],
    });
    const { res, tables, writes } = await s.execute({ role: 'client' });
    expect(res.code).toBe(403);
    expect(tables.profiles[0].role).toBe('admin');
    expect(writes).toEqual([]);
  });
});

describe('POST /api/profile/role — validación y persistencia', () => {
  it('rol inválido o ausente: 400 (nunca admin/superadmin/user)', async () => {
    const s = setup({ user: baseUser(), profiles: [] });
    for (const role of ['admin', 'superadmin', 'user', '', null, undefined, 'LAWYER', ' lawyer ']) {
      const { res } = await s.execute({ role });
      expect(res.code, String(role)).toBe(400);
    }
    expect(s.tables.profiles).toEqual([]);
  });

  it.each(['client', 'lawyer', 'company'])('rol ya definido (%s): 200 idempotente sin sobrescribir', async (current) => {
    const s = setup({
      user: baseUser(),
      profiles: [{ id: USER, user_id: USER, role: current, verified: true }],
    });
    const { res, tables, writes } = await s.execute({ role: current === 'client' ? 'lawyer' : 'client' });
    expect(res.code).toBe(200);
    expect(res.body).toMatchObject({ success: true, already: true, role: current });
    expect(tables.profiles[0].role).toBe(current);
    expect(writes).toEqual([]);
  });

  it('perfil legacy sin rol: actualiza SOLO role sin tocar verificación', async () => {
    const s = setup({
      user: baseUser(),
      profiles: [{
        id: USER, user_id: USER, role: null, display_name: 'Ya Existente',
        verified: false, pjud_verified: false, available_for_hire: true,
      }],
    });
    const { res, tables, writes } = await s.execute({ role: 'lawyer' });
    expect(res.code).toBe(200);
    expect(res.body).toMatchObject({ success: true, role: 'lawyer' });
    expect(tables.profiles[0]).toMatchObject({
      role: 'lawyer',
      display_name: 'Ya Existente',
      verified: false,
      pjud_verified: false,
      available_for_hire: true,
    });
    expect(writes).toHaveLength(1);
    expect(Object.keys(writes[0].values).sort()).toEqual(['role', 'updated_at']);
  });

  it('H3: encuentra por user_id aunque id difiera; actualiza por PK sin duplicar', async () => {
    const s = setup({
      user: baseUser(),
      profiles: [{ id: OTHER, user_id: USER, role: null }],
    });
    const { res, tables } = await s.execute({ role: 'client' });
    expect(res.code).toBe(200);
    expect(tables.profiles).toHaveLength(1);
    expect(tables.profiles[0]).toMatchObject({ id: OTHER, user_id: USER, role: 'client' });
  });

  it('sin fila: inserta mínima con datos de Google, sin verificación', async () => {
    const s = setup({ user: baseUser(), profiles: [] });
    const { res, tables } = await s.execute({ role: 'lawyer' });
    expect(res.code).toBe(200);
    expect(res.body).toMatchObject({ success: true, role: 'lawyer' });
    expect(tables.profiles).toHaveLength(1);
    const row = tables.profiles[0];
    expect(row).toMatchObject({
      id: USER,
      user_id: USER,
      email: 'nuevo@gmail.com',
      display_name: 'Nuevo Usuario',
      role: 'lawyer',
      has_used_free_consultation: false,
    });
    expect(row).not.toHaveProperty('verified');
    expect(row).not.toHaveProperty('pjud_verified');
    expect(row.rut ?? null).toBeNull();
  });
});
