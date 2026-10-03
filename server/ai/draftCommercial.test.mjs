// @vitest-environment node
// FASE 4.59E — contrato comercial de drafting: cuotas 30/75, gates,
// kill switch, usage, mes UTC, upgrade/downgrade, idempotencia, costos.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { createAIMetering } from './metering.mjs';
import {
  commercialQuotaForPlan,
  PRO_AI_ALLOWANCE, PLUS_AI_ALLOWANCE,
} from './proAllowance.mjs';
import { resolvePlanAllowance } from './plans.mjs';
import {
  buildDraftSystemPrompt, buildDraftContext, selectDraftEvidence, validateDraftSources,
  DRAFT_LIMITS,
} from './caseDrafting.mjs';
import { CHAT_LIMITS } from './legalChatPrompt.mjs';
import { selectDocumentEvidence } from './documentGrounding.mjs';
import {
  buildSourceManifest, fingerprintManifest, readLatestSnapshot, persistSnapshotIfNew,
  resolveSnapshotCase, formatSnapshotBlock, computeCaseIntelligence, assembleIntelligencePayload,
} from './caseSnapshots.mjs';

const src = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const user = id(1), foreign = id(2), caseId = id(3), workspaceId = id(4), docId = id(10);

const names = ['getAIWorkspaceOwned', 'requireAIAccess', 'getAILawyerSubscription',
  'getProLawyerSubscription', 'getProLawyerAccess', 'getPlanForAccess', 'serverCanUseAIFeature', 'isAIOverRateLimit', 'checkAIProtectionLimits',
  'getAIUsagePeriod', 'recordAIUsage', 'getAIConversationOwned', 'getAIDocumentOwned',
  'AIChatRequestSchema', 'AIChatResponseSchema', 'AIDraftRequestSchema', 'AIDraftResponseSchema', 'DRAFTING_ALLOWED_PLANS', 'AI_DEFAULT_MODEL', 'AI_CHAT_MAX_TOKENS',
  'AI_PROTECT_MAX_MONTHLY_TOKENS', 'AI_PROTECT_MAX_MONTHLY_REQUESTS', 'AI_DOCUMENTS_BUCKET', 'aiRateLimiter', 'AI_RATE_WINDOW_MS', 'AI_PROTECT_RATE_LIMIT_PER_MINUTE',
  'AI_FEATURES_ALL', 'PLAN_FEATURES_SERVER', 'PLUS_AI_ALLOWANCE', 'PRO_AI_ALLOWANCE', 'FREE_CASE_ALLOWANCE', 'freeQuotaForEntitlement', 'freeQuotaForPlan',
  'getAIUsagePeriod'];

const DOC_TEXT = 'Contrato de arriendo con renta mensual.';
const EVIDENCE = 'renta mensual';

function llmDraft() {
  return { data: {
    title: 'Borrador', content: 'Contenido del borrador con [POR COMPLETAR: rol].',
    sources: [], missing_info: ['rol'], warnings: [],
  }, usage: { total_tokens: 2500, input_tokens: 1800, output_tokens: 700 } };
}

function harness({ plan = 'pro_limited', draftingEnv = '1' } = {}) {
  let tokenUser = user;
  let currentPlan = plan;
  const rows = {
    lawyer_cases: [{ id: caseId, lawyer_id: user, title: 'Caso QA', description: 'd', status: 'abierto', practice_area: 'Civil', stage: null, client_id: null, ai_workspace_id: workspaceId }],
    ai_workspaces: [{ id: workspaceId, lawyer_id: user, name: 'Caso QA' }],
    ai_documents: [{ id: docId, lawyer_id: user, workspace_id: workspaceId, original_filename: 'c.pdf', file_path: 'x', status: 'ready', page_count: 1, extracted_text: DOC_TEXT, created_at: '2026-09-01T00:00:00Z' }],
    ai_document_analyses: [{ id: id(20), document_id: docId, lawyer_id: user, workspace_id: workspaceId, summary: 'S.', document_type: 'contrato', parties: ['A'], key_points: [], obligations: [], deadlines: [], risks: [], recommendations: [], claims: [], evidence_sources: [], model: 'm', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' }],
    ai_research_requests: [],
    ai_case_intelligence_snapshots: [],
    ai_case_drafts: [],
    ai_chat_messages: [], ai_usage: [], ai_usage_monthly: [],
    ai_operations: [],
  };
  const seenKeys = new Map();
  const monthStart = () => { const n = new Date(); return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}-01`; };
  const rpc = vi.fn(async (name, args) => {
    if (name === 'ai_begin_operation') {
      const k = `${args.p_key}|${args.p_hash}|${args.p_capability}`;
      if (seenKeys.has(k)) {
        return { data: { operation_id: args.p_key, created: false, status: 'succeeded', response_status: 200, response_body: seenKeys.get(k) }, error: null };
      }
      // Emula el bloque de cuota drafting del RPC real (mismo predicado).
      if (args.p_capability === 'case_drafting' && args.p_drafting_limit != null) {
        const used = (rows.ai_operations || []).filter((o) =>
          o.lawyer_id === args.p_lawyer && o.capability === 'case_drafting' &&
          (o.status === 'reserved' || o.status === 'succeeded') &&
          String(o.period_start || '') >= monthStart()).length;
        if (used >= args.p_drafting_limit) {
          return { data: null, error: { message: 'AI_MONTHLY_LIMIT_REACHED' } };
        }
      }
      seenKeys.set(k, null);
      (rows.ai_operations || (rows.ai_operations = [])).push({
        id: args.p_key, lawyer_id: args.p_lawyer, lawyer_case_id: caseId,
        workspace_id: args.p_workspace, capability: args.p_capability,
        status: 'reserved', period_start: new Date().toISOString().slice(0, 10),
      });
      return { data: { operation_id: args.p_key, created: true }, error: null };
    }
    if (name === 'ai_finish_operation') {
      const op = (rows.ai_operations || []).find((o) => o.id === args.p_operation);
      if (op) op.status = 'succeeded';
      return { data: { id: args.p_operation, status: 'succeeded', terminal: true }, error: null };
    }
    return { data: null, error: null };
  });

  const providerCalls = [];
  const provider = vi.fn(async (opts) => { providerCalls.push(opts); return JSON.parse(JSON.stringify(llmDraft())); });
  const supabase = { rpc, storage: { from: () => ({}) }, from(table) {
    let action = 'select', payload, limit = Infinity, filters = [], orderKey = null, orderAsc = true;
    const run = (single = false) => {
      const list = rows[table] ?? (rows[table] = []);
      let found = list.filter((r) => filters.every((f) => f(r)));
      if (orderKey) found = [...found].sort((a, b) => String(a[orderKey] ?? '').localeCompare(String(b[orderKey] ?? '')));
      if (!orderAsc) found = [...found].reverse();
      found = found.slice(0, limit);
      if (action === 'insert') {
        const values = (Array.isArray(payload) ? payload : [payload]).map((p) => ({ id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...p }));
        list.push(...values); found = values;
      }
      if (action === 'update') found.forEach((r) => Object.assign(r, payload));
      return { data: single ? (found[0] || null) : found.map((r) => ({ ...r })), error: null, count: found.length };
    };
    const q = { select: (_s, o) => q,
      eq: (k, v) => { filters.push((r) => r[k] === v); return q; },
      gte: (k, v) => { filters.push((r) => r[k] >= v); return q; },
      order: (k, o) => { orderKey = k; orderAsc = !o || o.ascending !== false; return q; },
      limit: (n) => { limit = n; return q; },
      insert: (p) => { action = 'insert'; payload = p; return q; },
      update: (p) => { action = 'update'; payload = p; return q; },
      single: async () => run(true), maybeSingle: async () => run(true),
      then: (a, b) => Promise.resolve(run()).then(a, b) };
    return q;
  } };
  const routes = {};
  const quiet = { log() {}, warn() {}, error() {} };
  const ctx = vm.createContext({ console: quiet, z, Buffer, process: { env: { AI_DRAFTING_ENABLED: draftingEnv } }, supabase,
    createAIMetering: (options) => createAIMetering({ ...options, log: () => {} }),
    commercialQuotaForPlan, PRO_AI_ALLOWANCE, PLUS_AI_ALLOWANCE,
    buildDraftSystemPrompt, buildDraftContext, selectDraftEvidence, validateDraftSources, DRAFT_LIMITS,
    CHAT_LIMITS,
    selectDocumentEvidence, getProCaseHeader: async () => ({ status: 'legacy' }),
    buildSourceManifest, fingerprintManifest, readLatestSnapshot,
    persistSnapshotIfNew, resolveSnapshotCase, formatSnapshotBlock,
    computeCaseIntelligence, assembleIntelligencePayload,
    chatCompletion: provider, isAIProviderConfigured: () => true,
    capturePostHog: async () => {},
    app: { get: (p, h) => { routes[`get ${p}`] = h; }, post: (p, h) => { routes[`post ${p}`] = h; }, put: (p, h) => { routes[`put ${p}`] = h; } },
    getUserIdFromToken: async () => tokenUser,
    requireAILawyer: async (_req, res) => { if (!tokenUser) { res.status(401).json({ error: 'x' }); return null; } return tokenUser; },
    requireAIEntitlement: async () => ({ plan: currentPlan, res: null }),
    getAILawyerAccess: async () => ({ plan: currentPlan, hasAccess: !['free', 'free_case', 'legacy'].includes(currentPlan) }),
    getFreeCaseAccess: async () => null,
    AI_DOCUMENTS_BUCKET: 'ai-documents', aiRateLimiter: new Map(),
    AI_PROTECT_MAX_MONTHLY_TOKENS: 20000000, AI_PROTECT_MAX_MONTHLY_REQUESTS: 5000,
  });
  for (const n of ast.statements) {
    if ((ts.isVariableStatement(n) || ts.isFunctionDeclaration(n)) &&
      names.includes((n.declarationList?.declarations?.[0]?.name ?? n.name)?.getText(ast))) vm.runInContext(n.getText(ast), ctx);
    if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
      ['/api/ai/cases/:caseId/drafts', '/api/ai/cases/:caseId/drafts/:draftId', '/api/ai/usage'].includes(n.expression.arguments[0]?.text)) vm.runInContext(n.getText(ast), ctx);
  }
  return { rows, provider, providerCalls, rpc, routes, ctx, ast,
    async call(method, path, body = {}, draftId = null) {
      const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } };
      await routes[`${method} ${path}`]({ headers: { authorization: 'Bearer f', 'x-ai-operation-id': randomUUID() }, params: { caseId: workspaceId, draftId }, body }, res);
      return res;
    },
    asForeign: () => { tokenUser = foreign; }, setPlan: (p) => { currentPlan = p; },
    seedOps(n, periodStart) {
      for (let i = 0; i < n; i++) {
        rows.ai_operations.push({ id: randomUUID(), lawyer_id: user, lawyer_case_id: caseId, workspace_id: workspaceId, capability: 'case_drafting', status: 'succeeded', period_start: periodStart });
      }
    },
  };
}

const BODY = { draft_type: 'carta', instruction: 'Carta formal sobre el pago de la renta adeudada en el caso' };

describe('4.59E contrato: cuotas canónicas', () => {
  it('PRO 30 / PLUS 75 / resto sin drafting; FREE/legacy sin drafting', () => {
    expect(PRO_AI_ALLOWANCE.draftsPerMonth).toBe(30);
    expect(PLUS_AI_ALLOWANCE.draftsPerMonth).toBe(75);
    expect(commercialQuotaForPlan('plus')?.drafting).toBe(75);
    expect(commercialQuotaForPlan('pro_limited')?.drafting).toBe(30);
    expect(commercialQuotaForPlan('essential')).toBeNull();
    expect(commercialQuotaForPlan('free')).toBeNull();
  });

  it('plans.mjs expone drafting 30/75 misma feature', () => {
    expect(resolvePlanAllowance('pro', 'drafting')).toEqual({ limit: 30, period: 'calendar_month_utc', scope: 'monthly' });
    expect(resolvePlanAllowance('plus', 'drafting')).toEqual({ limit: 75, period: 'calendar_month_utc', scope: 'monthly' });
    expect(resolvePlanAllowance('free_case', 'drafting')).toBeNull();
  });
});

describe('4.59E matriz de entitlement', () => {
  it('PRO 0/30 y 29/30 permitido; 30/30 bloqueado antes de provider', async () => {
    const h = harness({ plan: 'pro_limited' });
    expect((await h.call('post', '/api/ai/cases/:caseId/drafts', BODY)).statusCode).toBe(200);
    // 1 creada + 28 sembradas = 29 usadas → la 30ª permitida
    h.seedOps(28, new Date().toISOString().slice(0, 10));
    expect((await h.call('post', '/api/ai/cases/:caseId/drafts', BODY)).statusCode).toBe(200);
    const callsBefore = h.providerCalls.length;
    const blocked = await h.call('post', '/api/ai/cases/:caseId/drafts', BODY);
    expect([429, 503]).toContain(blocked.statusCode);
    expect(h.providerCalls.length).toBe(callsBefore);
  });

  it('PLUS 74/75 permitido; 75/75 bloqueado', async () => {
    const h = harness({ plan: 'plus' });
    h.seedOps(74, new Date().toISOString().slice(0, 10));
    expect((await h.call('post', '/api/ai/cases/:caseId/drafts', BODY)).statusCode).toBe(200);
    const callsBefore = h.providerCalls.length;
    expect((await h.call('post', '/api/ai/cases/:caseId/drafts', BODY)).statusCode).not.toBe(200);
    expect(h.providerCalls.length).toBe(callsBefore);
  });

  it('FREE/free_case/legacy: 403 sin provider', async () => {
    for (const plan of ['free', 'free_case', 'legacy']) {
      const h = harness({ plan });
        const res = await h.call('post', '/api/ai/cases/:caseId/drafts', BODY);
      expect(res.statusCode).toBe(403);
      expect(h.providerCalls.length).toBe(0);
      expect(h.rows.ai_case_drafts).toHaveLength(0);
    }
  });

  it('upgrade PRO→PLUS: uso vigente se mantiene, tope sube a 75', async () => {
    const h = harness({ plan: 'pro_limited' });
    h.seedOps(30, new Date().toISOString().slice(0, 10));
    expect((await h.call('post', '/api/ai/cases/:caseId/drafts', BODY)).statusCode).not.toBe(200);
    h.setPlan('plus');
    expect((await h.call('post', '/api/ai/cases/:caseId/drafts', BODY)).statusCode).toBe(200);
  });

  it('downgrade PLUS→PRO con uso >30: bloquea hasta próximo mes', async () => {
    const h = harness({ plan: 'plus' });
    h.seedOps(40, new Date().toISOString().slice(0, 10));
    expect((await h.call('post', '/api/ai/cases/:caseId/drafts', BODY)).statusCode).toBe(200);
    h.setPlan('pro_limited');
    expect((await h.call('post', '/api/ai/cases/:caseId/drafts', BODY)).statusCode).not.toBe(200);
  });

  it('reset mensual: ops del mes pasado no cuentan', async () => {
    const h = harness({ plan: 'pro_limited' });
    const last = new Date(Date.UTC(2020, 0, 15)).toISOString().slice(0, 10);
    h.seedOps(30, last);
    const res = await h.call('post', '/api/ai/cases/:caseId/drafts', BODY);
    expect(res.statusCode).toBe(200);
  });

  it('kill switch OFF: 403 AI_DRAFTING_DISABLED sin provider; lectura intacta', async () => {
    const h = harness({ plan: 'pro_limited', draftingEnv: '0' });
    const res = await h.call('post', '/api/ai/cases/:caseId/drafts', BODY);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('AI_DRAFTING_DISABLED');
    expect(h.providerCalls.length).toBe(0);
    expect((await h.call('get', '/api/ai/cases/:caseId/drafts')).statusCode).toBe(200);
  });
});

describe('4.59E usage endpoint con drafting', () => {
  it('paid: drafting {used, limit} del mes UTC desde ai_operations', async () => {
    const h = harness({ plan: 'pro_limited' });
    h.seedOps(12, new Date().toISOString().slice(0, 10));
    const res = await h.call('get', '/api/ai/usage');
    expect(res.statusCode).toBe(200);
    expect(res.body.allowance.drafting).toMatchObject({ used: 12, limit: 30 });
  });

  it('idempotencia no duplica cuota ni drafts', async () => {
    const h = harness({ plan: 'pro_limited' });
    const key = randomUUID();
    const once = async () => {
      const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } };
      await h.routes['post /api/ai/cases/:caseId/drafts']({ headers: { authorization: 'Bearer f', 'x-ai-operation-id': key }, params: { caseId: workspaceId }, body: BODY }, res);
      return res;
    };
    await once();
    await once();
    expect(h.rows.ai_case_drafts).toHaveLength(1);
    expect(h.providerCalls.length).toBe(1);
  });
});
