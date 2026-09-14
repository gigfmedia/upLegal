// @vitest-environment node
// 4.34D — research/jurisprudence integrado al Caso Pro (mismo engine, con header vivo).
// Search externo + LLM mockeados; pipeline, gates, persistencia y contexto, reales.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { searchJurisprudence as _realSearch } from './jurisprudenceSources.mjs';
import {
  validateResearchQuery, classifyLegalQuery,
} from './jurisprudenceSources.mjs';
import {
  detectDocumentMode, selectDocumentEvidence, shouldAllowDocumentOnlyFallback,
} from './documentGrounding.mjs';
import {
  buildJurisprudenceSystemPrompt, buildJurisprudenceUserPrompt,
  buildJurisprudenceCaseContext, selectSourcesForContext, JURISPRUDENCE_LIMITS,
} from './jurisprudencePrompt.mjs';
import { allocateDynamicContextBudget } from './dynamicContextBudget.mjs';
import { buildJurisprudenceOutcome, runJurisprudenceWithRetry } from './jurisprudencePipeline.mjs';
import { getProCaseHeader, formatProCaseBlock } from './proCaseContext.mjs';
import { createLlmCallBudget } from './provider.mjs';

void _realSearch;

const src = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const user = id(1), foreign = id(2), caseId = id(3), workspaceId = id(4);

const TC_SOURCE = {
  id: 'tc-5174', kind: 'jurisprudencia', source_type: 'jurisprudencia',
  legal_authority: 'persuasiva', vigency: 'no_aplica',
  citation: 'Tribunal Constitucional — Rol 5174',
  title: 'TC Rol 5174', url: 'https://example.invalid/tc-5174',
  excerpt: 'Establece que el derecho a la protección de datos se reconoce como derecho fundamental.',
};
const LLM_OK = { data: {
  resumen: 'El TC reconoce la protección de datos como derecho fundamental.',
  normativa: [],
  jurisprudencia: [{ fuente_id: 'tc-5174',
    afirmacion: 'El tribunal sostuvo que la protección de datos es un derecho fundamental.',
    fragmento: 'se reconoce como derecho fundamental' }],
  doctrina: [],
  conclusion: 'Las fuentes respaldan el derecho.',
}, usage: { total_tokens: 500, input_tokens: 400, output_tokens: 100 } };

const names = ['getAIWorkspaceOwned','requireAIEntitlement','requireAIAccess','getAILawyerAccess','getAILawyerSubscription',
 'getProLawyerSubscription','getProLawyerAccess','getPlanForAccess','serverCanUseAIFeature','isAIOverRateLimit','checkAIProtectionLimits',
 'getAIUsagePeriod','recordAIUsage','AIResearchRequestSchema','AI_DEFAULT_MODEL','AI_CHAT_MAX_TOKENS','AI_FEATURES_ALL','PLAN_FEATURES_SERVER',
 'AI_PROTECT_MAX_MONTHLY_TOKENS','AI_PROTECT_MAX_MONTHLY_REQUESTS','AI_USAGE_CREDITS_PER_TOKEN','aiRateLimiter','AI_RATE_WINDOW_MS',
 'AI_PROTECT_RATE_LIMIT_PER_MINUTE','logDiagnostic'];

function harness({ plan = 'essential', docs = false } = {}) {
  let tokenUser = user;
  const aiSub = plan === 'essential'
    ? [{ lawyer_id: user, status: 'active', plan: 'essential', current_period_end: '2099-01-01' }]
    : [];
  const proSub = plan === 'pro'
    ? [{ lawyer_id: user, status: 'active', current_period_end: '2099-01-01' }]
    : [];
  const rows = {
    lawyer_cases: [{ id: caseId, lawyer_id: user, title: 'Caso laboral QA', description: 'Descripción inicial',
      status: 'abierto', practice_area: 'Laboral', client_id: null, ai_workspace_id: workspaceId }],
    ai_workspaces: [{ id: workspaceId, lawyer_id: user, name: 'Caso laboral QA' }],
    lawyer_subscriptions: proSub, ai_subscriptions: aiSub,
    ai_documents: docs ? [{ id: id(10), lawyer_id: user, workspace_id: workspaceId, original_filename: 'contrato.pdf',
      file_path: `${user}/${workspaceId}/${id(10)}/original.pdf`, status: 'ready', analysis_status: 'ready',
      extracted_text: 'Contrato con cláusula quinta sobre obligaciones de pago de la renta y plazos de entrega.' }] : [],
    ai_research_requests: [], ai_usage: [], ai_usage_monthly: [],
  };
  const rpc = vi.fn(async () => ({ error: null }));
  const search = vi.fn(async () => ({ sources: [TC_SOURCE], warnings: [], intent: 'jurisprudencia',
    intentClass: '', queryHash: 'q', classification: null, strategy: null }));
  const provider = vi.fn(async () => JSON.parse(JSON.stringify(LLM_OK)));
  const supabase = { rpc, storage: { from: () => ({}) }, from(table) {
    let action = 'select', payload, limit = Infinity, filters = [], orderKey = null;
    const run = (single = false) => {
      const list = rows[table] ?? (rows[table] = []);
      let found = list.filter(r => filters.every(f => f(r)));
      if (orderKey) found = [...found].sort((a, b) => String(a[orderKey] ?? '').localeCompare(String(b[orderKey] ?? '')));
      found = found.slice(0, limit);
      if (action === 'insert') {
        const values = (Array.isArray(payload) ? payload : [payload]).map(p => ({ id: id(900 + Math.floor(Math.random() * 90)), created_at: new Date().toISOString(), ...p }));
        list.push(...values); found = values;
      }
      if (action === 'update') found.forEach(r => Object.assign(r, payload));
      if (action === 'delete') rows[table] = list.filter(r => !found.includes(r));
      return { data: single ? (found[0] ? { ...found[0] } : null) : found.map(r => ({ ...r })), error: null, count: found.length };
    };
    const q = { select: () => q,
      eq: (k, v) => { filters.push(r => r[k] === v); return q; },
      neq: (k, v) => { filters.push(r => r[k] !== v); return q; },
      is: (k, v) => { filters.push(r => r[k] === v); return q; },
      gte: (k, v) => { filters.push(r => r[k] >= v); return q; },
      in: (k, v) => { filters.push(r => v.includes(r[k])); return q; },
      order: (k) => { orderKey = k; return q; },
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
    searchJurisprudence: search, chatCompletion: provider, isAIProviderConfigured: () => true,
    validateResearchQuery, classifyLegalQuery, detectDocumentMode, selectDocumentEvidence,
    shouldAllowDocumentOnlyFallback, buildJurisprudenceSystemPrompt, buildJurisprudenceUserPrompt,
    buildJurisprudenceCaseContext, selectSourcesForContext, JURISPRUDENCE_LIMITS,
    allocateDynamicContextBudget, buildJurisprudenceOutcome, runJurisprudenceWithRetry,
    getProCaseHeader, formatProCaseBlock, createLlmCallBudget,
    app: { get: (p, h) => routes[`get ${p}`] = h, post: (p, h) => routes[`post ${p}`] = h },
    getUserIdFromToken: async () => tokenUser,
    AI_DOCUMENTS_BUCKET: 'ai-documents', aiRateLimiter: new Map(),
    capturePostHog: async () => {}, notificationsService: { notifyUser: async () => {} },
    requireAILawyer: async (_req, res) => { if (!tokenUser) { res.status(401).json({ error: 'x' }); return null; } return tokenUser; },
  });
  for (const n of ast.statements) {
    if ((ts.isVariableStatement(n) || ts.isFunctionDeclaration(n)) &&
      names.includes((n.declarationList?.declarations?.[0]?.name ?? n.name)?.getText(ast))) vm.runInContext(n.getText(ast), ctx);
    if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
      ['/api/ai/cases/:caseId/jurisprudence'].includes(n.expression.arguments[0]?.text)) vm.runInContext(n.getText(ast), ctx);
  }
  async function call(method, body = {}) {
    const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } };
    await routes[`${method} /api/ai/cases/:caseId/jurisprudence`]({ headers: { authorization: 'Bearer f' }, params: { caseId: workspaceId }, body }, res);
    return res;
  }
  return { rows, provider, search, rpc, call, ctx, asForeign: () => { tokenUser = foreign; } };
}

describe('4.34D research integrado al Caso Pro', () => {
  it('Pro base: CREATE denegado con 0 llamadas search/LLM/usage', async () => {
    const h = harness({ plan: 'pro' });
    const res = await h.call('post', { query: '¿Qué dice la jurisprudencia sobre protección de datos?' });
    expect(res.statusCode).toBe(403);
    expect(h.search).not.toHaveBeenCalled();
    expect(h.provider).not.toHaveBeenCalled();
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it('Pro base: historial legible (0 provider) aunque crear esté bloqueado', async () => {
    const h = harness({ plan: 'pro' });
    h.rows.ai_research_requests.push({ id: id(50), workspace_id: workspaceId, lawyer_id: user,
      query: 'previa', answer: 'r', sources: [], model: 'm', created_at: '2026-01-01' });
    const res = await h.call('get');
    expect(res.statusCode).toBe(200);
    expect(res.body.research).toHaveLength(1);
    expect(h.provider).not.toHaveBeenCalled();
  });

  it('legacy entitled: ejecuta engine, persiste, registra uso y cita fuentes', async () => {
    const h = harness({ plan: 'essential' });
    const res = await h.call('post', { query: '¿Qué dice la jurisprudencia sobre la protección de datos personales?' });
    expect(res.statusCode).toBe(200);
    expect(res.body.research_type).toBe('jurisprudence');
    expect(h.search).toHaveBeenCalledTimes(1);
    expect(h.provider.mock.calls.length).toBeLessThanOrEqual(3);
    expect(res.body.research.workspace_id).toBe(workspaceId);
    expect(h.rows.ai_research_requests).toHaveLength(1);
    expect(h.rpc).toHaveBeenCalled();
    expect(JSON.stringify(res.body.sources)).toContain('tc-5174');
  });

  it('contexto incluye header vivo del Caso Pro (título + descripción)', async () => {
    const h = harness({ plan: 'essential' });
    await h.call('post', { query: '¿Qué dice la jurisprudencia sobre la protección de datos personales?' });
    const prompt = JSON.stringify(h.provider.mock.calls[0][0]);
    expect(prompt).toContain('Caso laboral QA');
    expect(prompt).toContain('Descripción inicial');
  });

  it('edición del caso se refleja en la siguiente request; historial intacto', async () => {
    const h = harness({ plan: 'essential' });
    const q = '¿Qué dice la jurisprudencia sobre la protección de datos personales?';
    expect((await h.call('post', { query: q })).statusCode).toBe(200);
    h.rows.lawyer_cases[0].title = 'Despido injustificado';
    h.rows.lawyer_cases[0].description = 'Nueva descripción del caso';
    expect((await h.call('post', { query: q })).statusCode).toBe(200);
    const prompt2 = JSON.stringify(h.provider.mock.calls[1][0]);
    expect(prompt2).toContain('Despido injustificado');
    expect(prompt2).toContain('Nueva descripción del caso');
    expect(prompt2).not.toContain('Descripción inicial');
    expect(h.rows.ai_research_requests).toHaveLength(2);
  });

  it('modo documento no consulta fuentes públicas y persiste', async () => {
    const h = harness({ plan: 'essential', docs: true });
    const res = await h.call('post', { query: 'Según los documentos del caso, ¿qué dice la cláusula quinta del contrato?' });
    expect(res.statusCode).toBe(200);
    expect(['document', 'mixed']).toContain(res.body.research_type);
    if (res.body.research_type === 'document') expect(h.search).not.toHaveBeenCalled();
    expect(h.rows.ai_research_requests).toHaveLength(1);
  });

  it('cross-tenant: workspace, historial y documento forjado denegados', async () => {
    const h = harness({ plan: 'essential' });
    h.asForeign();
    expect((await h.call('get')).statusCode).toBe(404);
    expect((await h.call('post', { query: '¿Qué dice la jurisprudencia?' })).statusCode).toBe(404);
    expect(h.search).not.toHaveBeenCalled();
    expect(h.provider).not.toHaveBeenCalled();
  });

  it('historial limitado al workspace (scope por caso)', async () => {
    const h = harness({ plan: 'essential' });
    h.rows.ai_research_requests.push(
      { id: id(50), workspace_id: workspaceId, lawyer_id: user, query: 'a', answer: 'r', sources: [], model: 'm', created_at: '2026-01-02' },
      { id: id(51), workspace_id: id(60), lawyer_id: user, query: 'otro caso', answer: 'r', sources: [], model: 'm', created_at: '2026-01-03' },
    );
    const res = await h.call('get');
    expect(res.statusCode).toBe(200);
    expect(res.body.research.map(r => r.query)).toEqual(['a']);
  });
});
