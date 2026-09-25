import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {
  normalizeEmail,
  isValidEmail,
  splitName,
  decideInvitePath,
  buildInviteMarker,
  buildInviteEmail,
  buildInviteAudit,
  createCooldownStore,
  checkInviteCooldown,
  ownsInviteIdentity,
  __resetRouteCooldowns,
  INVITE_MARKER,
  INVITE_VERSION,
  CONFLICT_CODE,
} from './lawyerInvite.mjs';

// ---------------------------------------------------------------------------
// §31-42 (sin proveedores reales): módulo puro.
// ---------------------------------------------------------------------------
describe('lawyerInvite helpers (pure)', () => {
  it('normalize: trim + lowercase; validate rechaza malformados', () => {
    expect(normalizeEmail('  Abogado@Example.COM ')).toBe('abogado@example.com');
    expect(normalizeEmail(null)).toBe('');
    expect(isValidEmail('abogado@example.com')).toBe(true);
    expect(isValidEmail('no-es-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('splitName best-effort sin validar', () => {
    expect(splitName('Ana María López')).toEqual({ displayName: 'Ana María López', firstName: 'Ana', lastName: 'María López' });
    expect(splitName('  Solo  ')).toEqual({ displayName: 'Solo', firstName: 'Solo', lastName: null });
    expect(splitName(null)).toEqual({ displayName: '', firstName: null, lastName: null });
    expect(splitName('')).toEqual({ displayName: '', firstName: null, lastName: null });
  });

  it('decideInvitePath: create / resend-con-marcador / conflict', () => {
    expect(decideInvitePath({ authUser: null, profile: null })).toBe('create');
    expect(decideInvitePath({ authUser: { id: 'u1' }, profile: null })).toBe('conflict');
    expect(decideInvitePath({ authUser: null, profile: { id: 'u1' } })).toBe('conflict');
    expect(
      decideInvitePath({ authUser: { id: 'u1', user_metadata: { [INVITE_MARKER]: { v: INVITE_VERSION } } }, profile: { id: 'u1' } })
    ).toBe('resend');
    // Marcador ajeno/versión distinta no habilita resend.
    expect(
      decideInvitePath({ authUser: { id: 'u1', user_metadata: { [INVITE_MARKER]: { v: 999 } } }, profile: null })
    ).toBe('conflict');
  });

  it('buildInviteMarker es server-side con versión', () => {
    const m = buildInviteMarker('admin-1');
    expect(m[INVITE_MARKER].v).toBe(INVITE_VERSION);
    expect(m[INVITE_MARKER].by).toBe('admin-1');
    expect(m.role).toBeUndefined();
  });

  it('cooldown anti-doble-click con store inyectable', () => {
    const store = createCooldownStore();
    const t0 = 1_000_000;
    expect(checkInviteCooldown(store, 'a@x.cl', t0)).toBe(true);
    expect(checkInviteCooldown(store, 'a@x.cl', t0 + 1000)).toBe(false);
    expect(checkInviteCooldown(store, 'b@x.cl', t0 + 1000)).toBe(true);
    expect(checkInviteCooldown(store, 'a@x.cl', t0 + 30_000)).toBe(true);
  });

  it('buildInviteEmail: template del owner + variables, sin sintaxis Supabase', () => {
    const payload = buildInviteEmail({ templateId: 'tmpl_1', magicLink: 'https://auth/verify?token=abc', lawyerName: 'Ana' });
    expect(payload.from).toContain('hola@mg.legalup.cl');
    expect(payload.reply_to).toContain('hola@mg.legalup.cl');
    expect(payload.template.id).toBe('tmpl_1');
    expect(payload.template.variables.MAGIC_LINK).toBe('https://auth/verify?token=abc');
    expect(payload.template.variables.LAWYER_NAME).toBe('Ana');
    expect(JSON.stringify(payload)).not.toContain('ConfirmationURL');
    expect(payload.html).toBeUndefined();
    expect(payload.react).toBeUndefined();
  });

  it('ownsInviteIdentity exige 4 pruebas (id + email + ventana + sin perfil)', () => {
    const reqStart = 1_000_000;
    const fresh = { id: 'u1', email: 'a@x.cl', created_at: new Date(reqStart + 1000).toISOString() };
    const ok = { userId: 'u1', freshUser: fresh, email: 'a@x.cl', profile: null, reqStart };
    expect(ownsInviteIdentity(ok)).toBe(true);
    expect(ownsInviteIdentity({ ...ok, userId: 'u2' })).toBe(false);
    expect(ownsInviteIdentity({ ...ok, email: 'b@x.cl' })).toBe(false);
    expect(ownsInviteIdentity({ ...ok, freshUser: { ...fresh, created_at: new Date(reqStart - 999_999).toISOString() } })).toBe(false);
    expect(ownsInviteIdentity({ ...ok, profile: { id: 'u1' } })).toBe(false);
    expect(ownsInviteIdentity({ ...ok, freshUser: null })).toBe(false);
  });

  it('buildInviteAudit nunca incluye link ni token', () => {
    const audit = buildInviteAudit({ adminUserId: 'a1', email: 'x@y.cl', status: 'sent', resent: false });
    expect(JSON.stringify(audit)).not.toMatch(/action_link|token|magiclink|verify/i);
    expect(audit.target_email).toBe('x@y.cl');
  });
});

// ---------------------------------------------------------------------------
// Ruta: harness vm con fakes (0 mutaciones/proveedores reales).
// ---------------------------------------------------------------------------
const src = readFileSync(resolve(process.cwd(), 'server.mjs'), 'utf8');
const ast = ts.createSourceFile('server.mjs', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const ROUTE = '/api/admin/invite-lawyer-magic-link';
const names = ['sendEmailIdempotent'];

function makeSupabaseMock(state) {
  const table = (name) => {
    state.tables[name] = state.tables[name] || [];
    return state.tables[name];
  };
  const from = (name) => {
    if (name === 'lawyer_subscriptions' || name === 'ai_subscriptions' || name === 'ai_trial_subscriptions') {
      state.forbiddenReads.push(name);
      return { select: () => { throw new Error(`forbidden table ${name}`); } };
    }
    let filters = [];
    let pendingInsert = null;
    let pendingUpdate = null;
    const q = {
      select: () => q,
      insert: (row) => { pendingInsert = row; return q; },
      update: (row) => { pendingUpdate = row; return q; },
      upsert: async (row) => {
        const rows = table(name);
        const i = rows.findIndex((r) => r.id === row.id);
        if (i >= 0) rows[i] = { ...rows[i], ...row };
        else rows.push({ ...row });
        return { data: row, error: null };
      },
      eq: (k, v) => { filters.push((r) => r[k] === v); return q; },
      ilike: (k, v) => { filters.push((r) => String(r[k] || '').toLowerCase() === String(v).toLowerCase()); return q; },
      maybeSingle: async () => {
        if (pendingInsert) {
          const rows = table(name);
          rows.push({ ...pendingInsert });
          pendingInsert = null;
          return { data: null, error: { code: 'none', message: 'insert-ok' } };
        }
        const found = table(name).filter((r) => filters.every((f) => f(r)));
        return { data: found[0] || null, error: null };
      },
      single: async () => {
        const r = await q.maybeSingle();
        return r;
      },
      then: (resolve) => {
        // terminal await without maybeSingle (update/select chains)
        if (pendingUpdate) {
          table(name).forEach((r) => { if (filters.every((f) => f(r))) Object.assign(r, pendingUpdate); });
          pendingUpdate = null;
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (pendingInsert) {
          table(name).push({ ...pendingInsert });
          pendingInsert = null;
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        const found = table(name).filter((r) => filters.every((f) => f(r)));
        return Promise.resolve({ data: found, error: null }).then(resolve);
      },
    };
    return q;
  };
  return {
    from,
    auth: {
      admin: {
        listUsers: async ({ page } = {}) => {
          state.listCalls.push(page || 1);
          const perPage = 200;
          const start = ((page || 1) - 1) * perPage;
          return { data: { users: state.authUsers.slice(start, start + perPage) }, error: null };
        },
        generateLink: async ({ type, email, options }) => {
          state.genCalls.push({ type, email, redirectTo: options?.redirectTo });
          if (state.genFails) return { data: null, error: { message: 'gen failed' } };
          let user = state.authUsers.find((u) => String(u.email || '').toLowerCase() === String(email).toLowerCase());
          if (!user) {
            user = { id: `user-${state.authUsers.length + 1}`, email, created_at: new Date().toISOString(), user_metadata: {} };
            state.authUsers.push(user);
          }
          return { data: { properties: { action_link: `https://auth.test/verify?token=t${state.genCalls.length}` }, user: { ...user } }, error: null };
        },
        updateUserById: async (id, attrs) => {
          state.updateCalls.push({ id, attrs });
          if (state.updateFails) return { data: null, error: { message: 'update failed' } };
          const u = state.authUsers.find((x) => x.id === id);
          if (u) {
            if (attrs.email_confirm !== undefined) u.email_confirmed_at = new Date().toISOString();
            u.user_metadata = { ...(u.user_metadata || {}), ...(attrs.user_metadata || {}) };
          }
          return { data: { user: u }, error: null };
        },
        getUserById: async (id) => {
          const u = state.authUsers.find((x) => x.id === id);
          return { data: { user: u ? { ...u } : null }, error: null };
        },
        deleteUser: async (id) => {
          state.deleteCalls.push(id);
          state.authUsers = state.authUsers.filter((u) => u.id !== id);
          return { data: {}, error: null };
        },
      },
    },
  };
}

function harness({ admin = true, seed = {}, resendFails = false } = {}) {
  const state = {
    tables: { profiles: [], notification_deliveries: [] },
    authUsers: [...(seed.authUsers || [])],
    forbiddenReads: [],
    listCalls: [],
    genCalls: [],
    updateCalls: [],
    deleteCalls: [],
    sentEmails: [],
  };
  if (seed.profiles) state.tables.profiles = [...seed.profiles];
  const supabase = makeSupabaseMock(state);
  const resend = {
    emails: {
      send: async (payload) => {
        state.sentEmails.push(payload);
        if (resendFails) throw new Error('resend down');
        return { id: 're_1' };
      },
    },
  };
  const routes = {};
  const ctx = vm.createContext({
    requireAdmin: async (req, res, next) => {
      if (!admin) {
        res.status(401).json({ success: false, message: 'unauthorized' });
        return;
      }
      req.adminUser = { id: 'admin-1' };
      return next();
    },
    supabase,
    resend,
    appUrl: 'https://legalup.test',
    process: { env: { RESEND_LAWYER_INVITE_TEMPLATE_ID: 'tmpl_1' } },
    console: { log() {}, info() {}, warn() {}, error() {} },
    app: { post: (p, ...handlers) => { routes[p] = handlers; }, get: () => {}, put: () => {}, delete: () => {} },
  });
  // Real helpers + real sendEmailIdempotent from server.mjs.
  return { state, routes, ctx, supabase, resend };
}

describe('POST /api/admin/invite-lawyer-magic-link (harness vm)', () => {
  beforeEach(() => { __resetRouteCooldowns(); });

  function load(ctx) {
    for (const n of ast.statements) {
      if (ts.isVariableStatement(n) && n.declarationList.declarations.some((d) => names.includes(d.name.getText(ast)))) vm.runInContext(n.getText(ast), ctx);
      if (ts.isFunctionDeclaration(n) && names.includes(n.name?.text)) vm.runInContext(n.getText(ast), ctx);
      if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) && n.expression.arguments[0]?.text === ROUTE) vm.runInContext(n.getText(ast), ctx);
    }
  }

  async function call(h, body) {
    await load(h.ctx);
    // Inject real helper implementations (imports are not vm-extracted).
    const mod = await import('./lawyerInvite.mjs');
    Object.assign(h.ctx, {
      normalizeEmail: mod.normalizeEmail,
      isValidEmail: mod.isValidEmail,
      splitName: mod.splitName,
      decideInvitePath: mod.decideInvitePath,
      buildInviteMarker: mod.buildInviteMarker,
      buildInviteEmail: mod.buildInviteEmail,
      buildInviteAudit: mod.buildInviteAudit,
      checkRouteCooldown: mod.checkRouteCooldown,
      ownsInviteIdentity: mod.ownsInviteIdentity,
      CONFLICT_CODE: mod.CONFLICT_CODE,
    });
    await load(h.ctx);
    const handlers = h.routes[ROUTE];
    const [mw, handler] = handlers;
    const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } };
    const req = { body, adminUser: undefined };
    await mw(req, res, async () => { await handler(req, res); });
    // If middleware ended the response without next(), handler never ran.
    return res;
  }

  it('§31 nuevo email: link magiclink + rol lawyer + 1 Resend + sin Pro', async () => {
    const h = harness();
    const res = await call(h, { email: '  Nueva@Example.CL ', name: 'Ana María' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, invited: true, email: 'nueva@example.cl', resent: false, email_sent: true });
    expect(res.body.action_link).toBeUndefined();
    expect(h.state.genCalls).toHaveLength(1);
    expect(h.state.genCalls[0]).toMatchObject({ type: 'magiclink', email: 'nueva@example.cl', redirectTo: 'https://legalup.test/auth/callback' });
    const upd = h.state.updateCalls[0];
    expect(upd.attrs.email_confirm).toBe(true);
    expect(upd.attrs.user_metadata.role).toBe('lawyer');
    expect(upd.attrs.user_metadata.admin_lawyer_magic_link.v).toBe(1);
    expect(h.state.tables.profiles).toHaveLength(1);
    expect(h.state.tables.profiles[0]).toMatchObject({ email: 'nueva@example.cl', role: 'lawyer' });
    expect(h.state.sentEmails).toHaveLength(1);
    const payload = h.state.sentEmails[0];
    expect(payload.template.id).toBe('tmpl_1');
    expect(payload.template.variables.MAGIC_LINK).toContain('https://auth.test/verify');
    expect(payload.template.variables.LAWYER_NAME).toBe('Ana María');
    expect(payload.subject).toBe('Tu acceso a LegalUp Pro está listo');
    expect(JSON.stringify(payload)).not.toContain('ConfirmationURL');
    expect(h.state.forbiddenReads).toHaveLength(0);
    const deliveries = h.state.tables.notification_deliveries;
    expect(deliveries.filter((d) => d.status === 'sent')).toHaveLength(1);
  });

  it('§32 email existente (auth): 409 sin generateLink ni Resend', async () => {
    const h = harness({ seed: { authUsers: [{ id: 'u9', email: 'Abogado@Example.com', user_metadata: {} }] } });
    const res = await call(h, { email: 'abogado@example.com' });
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('LAWYER_EMAIL_ALREADY_EXISTS');
    expect(h.state.genCalls).toHaveLength(0);
    expect(h.state.sentEmails).toHaveLength(0);
    expect(h.state.tables.profiles).toHaveLength(0);
  });

  it('§19 rollback solo con ownership verificada (update falla → borra lo propio)', async () => {
    const h = harness();
    h.supabase.auth.admin.updateUserById = async (id, attrs) => {
      h.state.updateCalls.push({ id, attrs });
      return { data: null, error: { message: 'update failed' } };
    };
    // Rebuild ctx supabase reference is live (same object) — call directly.
    const res = await call(h, { email: 'rollback@example.cl' });
    expect(res.statusCode).toBe(500);
    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('INVITE_PROVISION_FAILED');
    expect(res.body.rolled_back).toBe(true);
    expect(h.state.deleteCalls).toHaveLength(1);
    expect(h.state.authUsers.filter((u) => u.email === 'rollback@example.cl')).toHaveLength(0);
  });
  it('§33 case-insensitive + perfil huérfano también bloquea', async () => {
    const h = harness({ seed: { profiles: [{ id: 'u8', email: 'ABOGADO@EXAMPLE.COM' }] } });
    const res = await call(h, { email: 'abogado@example.com' });
    expect(res.statusCode).toBe(409);
    expect(h.state.genCalls).toHaveLength(0);
    expect(h.state.sentEmails).toHaveLength(0);
  });

  it('§34 no-admin: 401 sin side effects', async () => {
    const h = harness({ admin: false });
    const res = await call(h, { email: 'x@y.cl' });
    expect(res.statusCode).toBe(401);
    expect(h.state.genCalls).toHaveLength(0);
    expect(h.state.sentEmails).toHaveLength(0);
  });

  it('§35 Resend falla: 502 recuperable, sin duplicados; retry reenvía', async () => {
    const h = harness({ resendFails: true });
    const first = await call(h, { email: 'retry@example.cl', name: 'Re' });
    expect(first.statusCode).toBe(502);
    expect(first.body).toMatchObject({ invited: true, email_sent: false, retryable: true });
    expect(first.body.action_link).toBeUndefined();
    expect(h.state.authUsers.filter((u) => u.email === 'retry@example.cl')).toHaveLength(1);
    expect(h.state.tables.profiles.filter((p) => p.email === 'retry@example.cl')).toHaveLength(1);
    // Retry: encuentra marcador → resend path (mock sigue fallando → 502, misma identidad).
    const h2 = { ...h, resend: h.resend };
    __resetRouteCooldowns();
    const second = await call(h, { email: 'retry@example.cl' });
    expect(second.statusCode).toBe(502);
    expect(h.state.authUsers.filter((u) => u.email === 'retry@example.cl')).toHaveLength(1);
  });

  it('§36 doble submit: sin identidad ni perfil duplicados', async () => {
    const h = harness();
    const first = await call(h, { email: 'doble@example.cl' });
    expect(first.statusCode).toBe(200);
    const second = await call(h, { email: 'doble@example.cl' });
    // Cooldown (429) o resend: en ambos casos una sola identidad y un perfil.
    expect([200, 429]).toContain(second.statusCode);
    expect(h.state.authUsers.filter((u) => u.email === 'doble@example.cl')).toHaveLength(1);
    expect(h.state.tables.profiles.filter((p) => p.email === 'doble@example.cl')).toHaveLength(1);
  });

  it('§37 rol lawyer canónico, sin admin; §38 sin Pro/Founder/trial', async () => {
    const h = harness();
    await call(h, { email: 'rol@example.cl', name: 'R L' });
    const user = h.state.authUsers.find((u) => u.email === 'rol@example.cl');
    expect(user.user_metadata.role).toBe('lawyer');
    expect(user.app_metadata?.role).toBeUndefined();
    expect(h.state.tables.profiles[0].role).toBe('lawyer');
    expect(h.state.forbiddenReads).toHaveLength(0);
  });

  it('§39 redirect usa el callback canónico; §40 sin sintaxis Supabase', async () => {
    const h = harness();
    await call(h, { email: 'redir@example.cl' });
    expect(h.state.genCalls[0].redirectTo).toBe('https://legalup.test/auth/callback');
    expect(h.state.genCalls[0].redirectTo).not.toContain('ConfirmationURL');
  });

  it('§41 seguridad estática: service_role y Resend solo servidor, sin link en logs', () => {
    expect(src).not.toMatch(/VITE_.*SERVICE_ROLE|SERVICE_ROLE.*import\.meta/i);
    const start = src.indexOf(ROUTE);
    const end = src.indexOf('LEGALUP EMPRESAS ENDPOINTS', start);
    const region = src.slice(start, end);
    expect(region).not.toMatch(/console\.(log|info|warn|error)\([^)]*action_?[Ll]ink/i);
    expect(region).not.toContain('inviteUserByEmail');
    expect(region).toContain('requireAdmin');
  });
});
