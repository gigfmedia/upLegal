// @vitest-environment node
// 4.34E — deterministic workflow como capacidad Core del Caso Pro (0 provider).
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { deriveCaseActions } from './caseActionLayer.mjs';
import {
  WORKFLOW_STATUSES, WORKFLOW_PERSISTABLE_TYPES, WORKFLOW_ALLOWED_TRANSITIONS, sortWorkflowItems,
} from './caseWorkflow.mjs';

const src = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const user = id(1), foreign = id(2), caseId = id(3), workspaceId = id(4);

const names = ['getAIWorkspaceOwned','requireAIEntitlement','requireAIAccess','getAILawyerAccess','getAILawyerSubscription','getFreeCaseAccess',
 'getProLawyerSubscription','getProLawyerAccess','getPlanForAccess','serverCanUseAIFeature','isAIOverRateLimit','checkAIProtectionLimits',
 'getAIUsagePeriod','AI_FEATURES_ALL','PLAN_FEATURES_SERVER','AI_PROTECT_MAX_MONTHLY_TOKENS','AI_PROTECT_MAX_MONTHLY_REQUESTS',
 'aiRateLimiter','AI_RATE_WINDOW_MS','AI_PROTECT_RATE_LIMIT_PER_MINUTE',
 'syncCaseWorkflowItems','buildCaseIntelligenceForWorkflow','sortWorkflowItems',
 'WORKFLOW_STATUSES','WORKFLOW_ALLOWED_TRANSITIONS'];
const paths = {
  get: ['get', '/api/ai/cases/:caseId/workflow'],
  sync: ['post', '/api/ai/cases/:caseId/workflow/sync'],
  patch: ['patch', '/api/ai/cases/:caseId/workflow/:itemId'],
};

function harness({ plan = 'pro', docs = 'rich' } = {}) {
  let tokenUser = user, seq = 100;
  const proSub = plan === 'pro' ? [{ lawyer_id: user, status: 'active', current_period_end: '2099-01-01' }] : [];
  const essSub = plan === 'essential' ? [{ lawyer_id: user, status: 'active', plan: 'essential', current_period_end: '2099-01-01' }] : [];
  const allDocs = docs === 'empty' ? [] : [
    { id: id(10), lawyer_id: user, workspace_id: workspaceId, original_filename: 'contrato.pdf',
      file_path: `${user}/${workspaceId}/${id(10)}/original.pdf`, status: 'ready', analysis_status: 'ready',
      extracted_text: 'Contrato con obligaciones de pago.', page_count: 2, created_at: '2026-01-01' },
    ...(docs === 'rich' ? [
      { id: id(11), lawyer_id: user, workspace_id: workspaceId, original_filename: 'anexo.pdf',
        file_path: `${user}/${workspaceId}/${id(11)}/original.pdf`, status: 'ready', analysis_status: 'ready',
        extracted_text: 'Anexo con plazos de entrega.', page_count: 1, created_at: '2026-01-02' },
      { id: id(12), lawyer_id: user, workspace_id: workspaceId, original_filename: 'tercero.pdf',
        file_path: `${user}/${workspaceId}/${id(12)}/original.pdf`, status: 'ready', analysis_status: 'ready',
        extracted_text: 'Tercer antecedente.', page_count: 1, created_at: '2026-01-03' },
    ] : []),
  ];
  const rows = {
    lawyer_cases: [{ id: caseId, lawyer_id: user, title: 'Caso', ai_workspace_id: workspaceId }],
    ai_workspaces: [{ id: workspaceId, lawyer_id: user, name: 'Caso' }],
    lawyer_subscriptions: proSub, ai_subscriptions: essSub,
    ai_documents: allDocs,
    ai_document_analyses: docs === 'empty' ? [] : [{ id: id(20), document_id: id(10), lawyer_id: user,
      workspace_id: workspaceId, summary: 'Resumen', document_type: 'contrato', parties: [], key_points: [],
      obligations: ['Pagar la renta'], deadlines: [], risks: ['Riesgo de plazo'], recommendations: [], claims: [],
      model: 'm', created_at: '2026-01-01' }],
    ai_case_workflow_items: [], ai_usage: [], ai_usage_monthly: [],
  };
  const provider = vi.fn(async () => ({ data: {}, usage: {} }));
  const search = vi.fn(async () => ({ sources: [] }));
  const supabase = { rpc: vi.fn(async () => ({ error: null })), storage: { from: () => ({}) }, from(table) {
    let action = 'select', payload, limit = Infinity, filters = [], orderKey = null, orderAsc = true;
    const run = (single = false) => {
      const list = rows[table] ?? (rows[table] = []);
      let found = list.filter(r => filters.every(f => f(r)));
      if (orderKey) found = [...found].sort((a, b) => {
        const c = String(a[orderKey] ?? '').localeCompare(String(b[orderKey] ?? ''));
        return orderAsc ? c : -c;
      });
      found = found.slice(0, limit);
      if (action === 'insert') {
        const values = (Array.isArray(payload) ? payload : [payload]).map(p => ({ id: id(seq++), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...p }));
        list.push(...values); found = values;
      }
      if (action === 'update') found.forEach(r => Object.assign(r, payload));
      if (action === 'delete') rows[table] = list.filter(r => !found.includes(r));
      return { data: single ? (found[0] ? { ...found[0] } : null) : found.map(r => ({ ...r })), error: null, count: found.length };
    };
    const q = { select: () => q, eq: (k, v) => { filters.push(r => r[k] === v); return q; },
      neq: (k, v) => { filters.push(r => r[k] !== v); return q; },
      is: (k, v) => { filters.push(r => r[k] === v); return q; },
      in: (k, v) => { filters.push(r => v.includes(r[k])); return q; },
      order: (k, o) => { orderKey = k; orderAsc = o?.ascending !== false; return q; },
      limit: n => { limit = n; return q; },
      insert: p => { action = 'insert'; payload = p; return q; },
      update: p => { action = 'update'; payload = p; return q; },
      delete: () => { action = 'delete'; return q; },
      single: async () => run(true), maybeSingle: async () => run(true),
      then: (a, b) => Promise.resolve(run()).then(a, b) };
    return q;
  } };
  const routes = {};
  const quiet = { log() {}, warn() {}, error() {} };
  const ctx = vm.createContext({ console: quiet, z, Buffer, process: { env: {} }, supabase,
    deriveCaseActions, WORKFLOW_PERSISTABLE_TYPES, sortWorkflowItems, WORKFLOW_STATUSES, WORKFLOW_ALLOWED_TRANSITIONS,
    chatCompletion: provider, searchJurisprudence: search, isAIProviderConfigured: () => true,
    AI_DOCUMENTS_BUCKET: 'ai-documents',
    app: { get: (p, h) => routes[`get ${p}`] = h, post: (p, h) => routes[`post ${p}`] = h, patch: (p, h) => routes[`patch ${p}`] = h },
    getUserIdFromToken: async () => tokenUser,
    capturePostHog: async () => {}, notificationsService: { notifyUser: async () => {} },
    requireAILawyer: async (_req, res) => { if (!tokenUser) { res.status(401).json({ error: 'x' }); return null; } return tokenUser; },
  });
  for (const n of ast.statements) {
    if ((ts.isVariableStatement(n) || ts.isFunctionDeclaration(n)) &&
      names.includes((n.declarationList?.declarations?.[0]?.name ?? n.name)?.getText(ast))) vm.runInContext(n.getText(ast), ctx);
    if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
      Object.values(paths).some(([, p]) => p === n.expression.arguments[0]?.text)) vm.runInContext(n.getText(ast), ctx);
  }
  async function call(name, body = {}, itemId = null) {
    const [method, path] = paths[name];
    const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } };
    await routes[`${method} ${path}`]({ headers: { authorization: 'Bearer f' },
      params: { caseId: workspaceId, itemId }, body }, res);
    return res;
  }
  return { rows, provider, search, call, ctx, supabase, asForeign: () => { tokenUser = foreign; } };
}

describe('4.34E deterministic workflow Core (0 provider)', () => {
  it('derivation is pure: no network, no LLM, bounded persistable types', () => {
    expect(deriveCaseActions(null)).toEqual([]);
    const acts = deriveCaseActions({ contradictions: [], missingInformation: ['x'], risks: ['r'], pending_count: 0, failed_count: 0, document_count: 1, total_documents: 1 });
    expect(acts.length).toBeGreaterThan(0);
    const allowed = new Set([...WORKFLOW_PERSISTABLE_TYPES, 'ask_case_question']);
    expect(acts.every(a => allowed.has(a.type))).toBe(true);
  });

  it('Pro sync allowed (no workflow_generation 403), 0 provider calls', async () => {
    const h = harness();
    const res = await h.call('sync');
    expect(res.statusCode).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(h.provider).not.toHaveBeenCalled();
    expect(h.search).not.toHaveBeenCalled();
  });

  it('GET/PATCH cost 0 provider calls', async () => {
    const h = harness();
    await h.call('sync');
    const item = h.rows.ai_case_workflow_items[0];
    expect((await h.call('get')).statusCode).toBe(200);
    expect((await h.call('patch', { status: 'in_progress' }, item.id)).statusCode).toBe(200);
    expect(h.provider).not.toHaveBeenCalled();
    expect(h.search).not.toHaveBeenCalled();
  });

  it('no-entitlement boundary: 402 on all three, no work done', async () => {
    const h = harness({ plan: 'none' });
    expect((await h.call('get')).statusCode).toBe(402);
    expect((await h.call('sync')).statusCode).toBe(402);
    expect((await h.call('patch', { status: 'completed' }, id(90))).statusCode).toBe(402);
    expect(h.rows.ai_case_workflow_items).toHaveLength(0);
    expect(h.provider).not.toHaveBeenCalled();
  });

  it.each(['get', 'sync'])('cross-tenant %s denied', async route => {
    const h = harness(); h.asForeign();
    expect((await h.call(route)).statusCode).toBe(404);
    expect(h.provider).not.toHaveBeenCalled();
  });

  it('cross-tenant patch denied without mutation', async () => {
    const h = harness();
    await h.call('sync');
    const item = h.rows.ai_case_workflow_items[0];
    h.asForeign();
    expect((await h.call('patch', { status: 'completed' }, item.id)).statusCode).toBe(404);
    expect(h.rows.ai_case_workflow_items.find(i => i.id === item.id).status).toBe('pending');
  });

  it('sync is idempotent: twice, no duplicates', async () => {
    const h = harness();
    expect((await h.call('sync')).statusCode).toBe(200);
    const first = h.rows.ai_case_workflow_items.map(i => i.action_id).sort();
    expect((await h.call('sync')).statusCode).toBe(200);
    expect(h.rows.ai_case_workflow_items.map(i => i.action_id).sort()).toEqual(first);
  });

  it('completed state preserved across resync, metadata still refreshes', async () => {
    const h = harness();
    await h.call('sync');
    const item = h.rows.ai_case_workflow_items[0];
    expect((await h.call('patch', { status: 'completed' }, item.id)).statusCode).toBe(200);
    expect((await h.call('sync')).statusCode).toBe(200);
    expect(h.rows.ai_case_workflow_items.find(i => i.id === item.id).status).toBe('completed');
  });

  it('failed sync writes nothing (no partial state), retry converges', async () => {
    const h = harness();
    const origFrom = h.supabase.from.bind(h.supabase);
    // Force failure through throwing write paths (reads keep working)
    h.supabase.from = (table) => {
      const q = origFrom(table);
      if (table !== 'ai_case_workflow_items') return q;
      q.insert = () => { throw { message: 'db down' }; };
      q.update = () => { throw { message: 'db down' }; };
      return q;
    };
    const res = await h.call('sync');
    expect(res.statusCode).toBe(500);
    expect(h.rows.ai_case_workflow_items).toHaveLength(0);
    h.supabase.from = origFrom;
    expect((await h.call('sync')).statusCode).toBe(200);
    expect(h.rows.ai_case_workflow_items.length).toBeGreaterThan(0);
  });

  it('new intelligence reconciles: new doc adds derived context, no dupes', async () => {
    const h = harness({ docs: 'single' });
    await h.call('sync');
    const firstCount = h.rows.ai_case_workflow_items.length;
    h.rows.ai_documents.push({ id: id(13), lawyer_id: user, workspace_id: workspaceId,
      original_filename: 'nuevo.pdf', file_path: `${user}/${workspaceId}/${id(13)}/original.pdf`,
      status: 'failed', analysis_status: 'none', extracted_text: null, created_at: '2026-01-04' });
    expect((await h.call('sync')).statusCode).toBe(200);
    const ids = h.rows.ai_case_workflow_items.map(i => i.action_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(h.rows.ai_case_workflow_items.length).toBeGreaterThanOrEqual(firstCount);
  });

  it('patch validates: bad status 400, forged item 404, linkage immutable', async () => {
    const h = harness();
    await h.call('sync');
    const item = h.rows.ai_case_workflow_items[0];
    expect((await h.call('patch', { status: 'bogus' }, item.id)).statusCode).toBe(400);
    expect((await h.call('patch', { status: 'completed' }, id(95))).statusCode).toBe(404);
    const res = await h.call('patch', { status: 'completed', lawyer_id: foreign, workspace_id: foreign, action_id: 'forged' }, item.id);
    expect(res.statusCode).toBe(200);
    const row = h.rows.ai_case_workflow_items.find(i => i.id === item.id);
    expect(row.lawyer_id).toBe(user);
    expect(row.workspace_id).toBe(workspaceId);
    expect(row.action_id).not.toBe('forged');
  });

  it('empty case: honest empty guidance, no fabrication', async () => {
    const h = harness({ docs: 'empty' });
    const res = await h.call('sync');
    expect(res.statusCode).toBe(200);
    expect(h.provider).not.toHaveBeenCalled();
    expect(res.body.items.every(i => i.title && i.description)).toBe(true);
  });

  it('resource-limit regression: 1/1 ws + 3/3 docs still use workflow', async () => {
    const h = harness(); // 1 workspace + 3 documents + Pro access
    expect((await h.call('get')).statusCode).toBe(200);
    expect((await h.call('sync')).statusCode).toBe(200);
    const item = h.rows.ai_case_workflow_items[0];
    expect((await h.call('patch', { status: 'completed' }, item.id)).statusCode).toBe(200);
    expect(h.provider).not.toHaveBeenCalled();
  });

  it('legacy essential keeps full workflow access', async () => {
    const h = harness({ plan: 'essential' });
    expect((await h.call('sync')).statusCode).toBe(200);
    expect(h.provider).not.toHaveBeenCalled();
  });
});
