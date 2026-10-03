// @vitest-environment node
// FASE 4.59D — Draft from Case V1 a nivel ruta: grounding, versiones,
// proveniencia, ownership, idempotencia, gates, cuotas.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { createAIMetering } from './metering.mjs';
import { commercialQuotaForPlan } from './proAllowance.mjs';
import { getProCaseHeader } from './proCaseContext.mjs';
import {
  buildSourceManifest, fingerprintManifest, readLatestSnapshot, persistSnapshotIfNew,
  resolveSnapshotCase, formatSnapshotBlock, computeCaseIntelligence, assembleIntelligencePayload,
} from './caseSnapshots.mjs';
import {
  buildDraftSystemPrompt, buildDraftContext, selectDraftEvidence, validateDraftSources,
  DRAFT_LIMITS, DRAFT_TYPES,
} from './caseDrafting.mjs';
import { selectDocumentEvidence } from './documentGrounding.mjs';

const src = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const user = id(1), foreign = id(2), caseId = id(3), workspaceId = id(4), docId = id(10);

const names = ['getAIWorkspaceOwned', 'requireAIAccess', 'getAILawyerAccess', 'getAILawyerSubscription', 'getFreeCaseAccess',
  'getProLawyerSubscription', 'getProLawyerAccess', 'getPlanForAccess', 'serverCanUseAIFeature', 'isAIOverRateLimit', 'checkAIProtectionLimits',
  'getAIUsagePeriod', 'AI_FEATURES_ALL', 'PLAN_FEATURES_SERVER', 'AI_PROTECT_MAX_MONTHLY_TOKENS', 'AI_PROTECT_MAX_MONTHLY_REQUESTS',
  'aiRateLimiter', 'AI_RATE_WINDOW_MS', 'AI_PROTECT_RATE_LIMIT_PER_MINUTE',
  'AIDraftRequestSchema', 'AIDraftResponseSchema', 'DRAFTING_ALLOWED_PLANS', 'AI_DEFAULT_MODEL', 'freeQuotaForEntitlement'];

const DOC_TEXT = 'Contrato de arrendamiento. La cláusula quinta establece la obligación de pagar la renta antes del día diez de cada mes. Las partes son Ana Arrendadora y Beto Arrendatario.';
const EVIDENCE = 'la obligación de pagar la renta antes del día diez';

function llmDraft(over = {}) {
  return { data: {
    title: 'Borrador de contestación',
    content: '# Borrador\n\nEn atención a la cláusula quinta del contrato, que establece la obligación de pagar la renta antes del día diez, se contesta la demanda. [POR COMPLETAR: número de rol de la causa]',
    sources: [{ kind: 'document', document_id: docId, file_name: 'contrato.pdf', fragment_id: `document::${docId}::0`, evidence: EVIDENCE }],
    missing_info: ['Número de rol de la causa'],
    warnings: [],
    ...over,
  }, usage: { total_tokens: 3000, input_tokens: 2000, output_tokens: 1000 } };
}

function harness({ plan = 'pro' } = {}) {
  let tokenUser = user;
  let currentPlan = plan;
  const rows = {
    lawyer_cases: [{ id: caseId, lawyer_id: user, title: 'Caso QA', description: 'Arriendo impago', status: 'abierto', practice_area: 'Civil', stage: null, client_id: null, ai_workspace_id: workspaceId }],
    ai_workspaces: [{ id: workspaceId, lawyer_id: user, name: 'Caso QA' }],
    ai_documents: [{ id: docId, lawyer_id: user, workspace_id: workspaceId, original_filename: 'contrato.pdf', file_path: 'x', status: 'ready', page_count: 2, extracted_text: DOC_TEXT, created_at: '2026-09-01T00:00:00Z' }],
    ai_document_analyses: [{ id: id(20), document_id: docId, lawyer_id: user, workspace_id: workspaceId, summary: 'Contrato de arriendo con renta mensual.', document_type: 'contrato', parties: ['Ana Arrendadora contra Beto Arrendatario'], key_points: ['renta mensual'], obligations: ['pagar la renta'], deadlines: [{ date: '', description: 'pago mensual' }], risks: [], recommendations: [], claims: [], evidence_sources: [], model: 'm', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' }],
    ai_research_requests: [{
      id: id(50), workspace_id: workspaceId, lawyer_id: user,
      query: 'Resolución de arriendos por no pago',
      answer: 'La jurisprudencia exige requerimiento previo antes de resolver el arriendo.',
      sources: [{ id: 'bcn-1', title: 'Ley 18.101', kind: 'normativa', url: 'https://example.invalid/l18101' }],
      model: 'm', created_at: '2026-09-02T00:00:00Z',
    }],
    ai_case_intelligence_snapshots: [],
    ai_case_drafts: [],
    ai_chat_messages: [], ai_usage: [], ai_usage_monthly: [],
  };
  // Fake con idempotencia realista: repetir (key+hash) replays sin recrear.
  const seenKeys = new Map();
  const rpc = vi.fn(async (name, args) => {
    if (name === 'ai_begin_operation') {
      const k = `${args.p_key}|${args.p_hash}|${args.p_capability}`;
      if (seenKeys.has(k)) {
        return { data: { operation_id: args.p_key, created: false, status: 'succeeded', response_status: 200, response_body: seenKeys.get(k) }, error: null };
      }
      seenKeys.set(k, null);
      return { data: { operation_id: args.p_key, created: true }, error: null };
    }
    if (name === 'ai_finish_operation') return { data: { id: args.p_operation, status: 'succeeded', terminal: true }, error: null };
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
      return { data: single ? (found[0] || null) : found.map((r) => ({ ...r })), error: null };
    };
    const q = { select: () => q,
      eq: (k, v) => { filters.push((r) => r[k] === v); return q; },
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
  const ctx = vm.createContext({ console: quiet, z, Buffer, process: { env: {} }, supabase,
    createAIMetering: (options) => createAIMetering({ ...options, log: () => {} }),
    commercialQuotaForPlan,
    buildDraftSystemPrompt, buildDraftContext, selectDraftEvidence, validateDraftSources, DRAFT_LIMITS,
    selectDocumentEvidence, getProCaseHeader,
    buildSourceManifest, fingerprintManifest, readLatestSnapshot, persistSnapshotIfNew,
    resolveSnapshotCase, formatSnapshotBlock, computeCaseIntelligence, assembleIntelligencePayload,
    chatCompletion: provider, isAIProviderConfigured: () => true,
    capturePostHog: async () => {},
    app: { get: (p, h) => { routes[`get ${p}`] = h; }, post: (p, h) => { routes[`post ${p}`] = h; }, put: (p, h) => { routes[`put ${p}`] = h; } },
    getUserIdFromToken: async () => tokenUser,
    requireAILawyer: async (_req, res) => { if (!tokenUser) { res.status(401).json({ error: 'x' }); return null; } return tokenUser; },
    requireAIEntitlement: async () => ({ plan: currentPlan, res: null }),
    AI_DOCUMENTS_BUCKET: 'ai-documents', aiRateLimiter: new Map(),
    AI_PROTECT_MAX_MONTHLY_TOKENS: 20000000, AI_PROTECT_MAX_MONTHLY_REQUESTS: 5000,
  });
  for (const n of ast.statements) {
    if ((ts.isVariableStatement(n) || ts.isFunctionDeclaration(n)) &&
      names.includes((n.declarationList?.declarations?.[0]?.name ?? n.name)?.getText(ast))) vm.runInContext(n.getText(ast), ctx);
    if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
      ['/api/ai/cases/:caseId/drafts', '/api/ai/cases/:caseId/drafts/:draftId'].includes(n.expression.arguments[0]?.text)) vm.runInContext(n.getText(ast), ctx);
  }
  async function call(method, path, body = {}, draftId = null) {
    const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } };
    const key = `${method} ${path}`;
    await routes[key]({ headers: { authorization: 'Bearer f', 'x-ai-operation-id': randomUUID() }, params: { caseId: workspaceId, draftId }, body }, res);
    return res;
  }
  return { rows, provider, providerCalls, rpc, call,
    callWithKey: async (key, body = {}) => {
      const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } };
      await routes['post /api/ai/cases/:caseId/drafts']({ headers: { authorization: 'Bearer f', 'x-ai-operation-id': key }, params: { caseId: workspaceId }, body }, res);
      return res;
    },
    asForeign: () => { tokenUser = foreign; }, setPlan: (p) => { currentPlan = p; } };
}

describe('4.59D draft grounded (documentos + snapshot + research)', () => {
  it('genera, persiste con snapshot y proveniencia válida', async () => {
    const h = harness();
    const res = await h.call('post', '/api/ai/cases/:caseId/drafts', { draft_type: 'escrito', instruction: 'Preparar contestación centrada en el requerimiento previo de pago de la renta' });
    expect(res.statusCode).toBe(200);
    expect(res.body.draft.title).toContain('contestación');
    expect(res.body.draft.intelligence_snapshot_id).toBeTruthy();
    expect(res.body.draft.status).toBe('completed');
    expect(res.body.snapshot.version).toBe(1);
    expect(h.rows.ai_case_drafts).toHaveLength(1);
    // Proveniencia: cita documental válida preservada
    expect(res.body.draft.sources.some((s) => s.document_id === docId)).toBe(true);
    // Prompt incluyó snapshot + evidencia (autoridad correcta)
    const prompt = h.providerCalls[0].messages.find((m) => m.role === 'user').content;
    expect(prompt).toContain('Ana Arrendadora');
    // Cuota: solo case_drafting
    const begins = h.rpc.mock.calls.filter(([n]) => n === 'ai_begin_operation').map(([, a]) => a);
    expect(begins).toHaveLength(1);
    expect(begins[0].p_capability).toBe('case_drafting');
  });

  it('400 con instrucción corta o tipo inválido; sin provider', async () => {
    const h = harness();
    expect((await h.call('post', '/api/ai/cases/:caseId/drafts', { draft_type: 'escrito', instruction: 'corto' })).statusCode).toBe(400);
    expect((await h.call('post', '/api/ai/cases/:caseId/drafts', { draft_type: 'demanda', instruction: 'instrucción suficientemente larga aquí' })).statusCode).toBe(400);
    expect(h.provider).not.toHaveBeenCalled();
    expect(h.rows.ai_case_drafts).toHaveLength(0);
  });
});

describe('4.59D versiones, inmutabilidad y doble click', () => {
  it('regenerar crea fila nueva; anterior intacta con su snapshot', async () => {
    const h = harness();
    const body = { draft_type: 'carta', instruction: 'Redactar carta al arrendador sobre la renta impaga del caso' };
    const r1 = await h.call('post', '/api/ai/cases/:caseId/drafts', body);
    // Nuevo análisis → snapshot v2
    h.rows.ai_document_analyses.push({ id: id(21), document_id: docId, lawyer_id: user, workspace_id: workspaceId, summary: 'Otro.', document_type: 'contrato', parties: ['X'], key_points: [], obligations: [], deadlines: [], risks: [], recommendations: [], claims: [], evidence_sources: [], model: 'm', created_at: '2026-09-05T00:00:00Z', updated_at: '2026-09-05T00:00:00Z' });
    const r2 = await h.call('post', '/api/ai/cases/:caseId/drafts', body);
    expect(h.rows.ai_case_drafts).toHaveLength(2);
    expect(r1.body.draft.intelligence_snapshot_id).not.toBe(r2.body.draft.intelligence_snapshot_id);
    expect(r2.body.snapshot.version).toBe(2);
    // Draft A inmutable
    const openA = await h.call('get', '/api/ai/cases/:caseId/drafts/:draftId', {}, r1.body.draft.id);
    expect(openA.body.draft.intelligence_snapshot_id).toBe(r1.body.draft.intelligence_snapshot_id);
  });

  it('doble click misma idempotencia: un provider, un draft', async () => {
    const h = harness();
    const key = randomUUID();
    const body = { draft_type: 'informe', instruction: 'Minuta de audiencia sobre obligaciones de pago del arriendo' };
    const r1 = await h.callWithKey(key, body);
    const r2 = await h.callWithKey(key, body);
    expect(r1.statusCode).toBe(200);
    expect(h.rows.ai_case_drafts).toHaveLength(1);
    expect(h.providerCalls.length).toBe(1);
    void r2;
  });
});

describe('4.59D alucinaciones filtradas', () => {
  it('URL de research no suministrada se descarta con warning', async () => {
    const h = harness();
    h.provider.mockImplementationOnce(async () => ({ data: {
      title: 'Borrador', content: 'Contenido con cita falsa.',
      sources: [{ kind: 'research', research_id: id(50), title: 'Falsa', url: 'https://evil.invalid/x' }],
      missing_info: [], warnings: [],
    }, usage: { total_tokens: 10, input_tokens: 8, output_tokens: 2 } }));
    const res = await h.call('post', '/api/ai/cases/:caseId/drafts', { draft_type: 'carta', instruction: 'Carta formal sobre el pago de la renta adeudada' });
    expect(res.statusCode).toBe(200);
    expect(res.body.draft.sources.some((s) => String(s.url || '').includes('evil'))).toBe(false);
    expect(res.body.warnings.some((w) => String(w).includes('referencias'))).toBe(true);
  });

  it('fragmento documental inválido se descarta', async () => {
    const h = harness();
    h.provider.mockImplementationOnce(async () => ({ data: {
      title: 'Borrador', content: 'Contenido.',
      sources: [{ kind: 'document', document_id: '00000000-0000-4000-8000-000000000099', file_name: 'otro.pdf' }],
      missing_info: [], warnings: [],
    }, usage: { total_tokens: 10, input_tokens: 8, output_tokens: 2 } }));
    const res = await h.call('post', '/api/ai/cases/:caseId/drafts', { draft_type: 'carta', instruction: 'Carta formal sobre el pago de la renta adeudada' });
    expect(res.statusCode).toBe(200);
    expect(res.body.draft.sources).toHaveLength(0);
  });
});

describe('4.59D ownership, gates y casos borde', () => {
  it('extranjero: 404 generar/leer/editar sin fuga', async () => {
    const h = harness();
    const mine = await h.call('post', '/api/ai/cases/:caseId/drafts', { draft_type: 'carta', instruction: 'Carta formal sobre el pago de la renta adeudada' });
    expect(mine.statusCode).toBe(200);
    h.asForeign();
    expect((await h.call('post', '/api/ai/cases/:caseId/drafts', { draft_type: 'carta', instruction: 'Otra carta formal sobre la renta del caso' })).statusCode).toBe(404);
    const listRes = await h.call('get', '/api/ai/cases/:caseId/drafts');
    expect(listRes.statusCode === 404 || (listRes.body.drafts || []).length === 0).toBe(true);
    expect((await h.call('get', '/api/ai/cases/:caseId/drafts/:draftId', {}, mine.body.draft.id)).statusCode).toBe(404);
  });

  it('free/legacy: 403 sin provider', async () => {
    const h = harness();
    h.setPlan('free_case');
    const res = await h.call('post', '/api/ai/cases/:caseId/drafts', { draft_type: 'carta', instruction: 'Carta formal sobre el pago de la renta adeudada' });
    expect(res.statusCode).toBe(403);
    expect(h.provider).not.toHaveBeenCalled();
    expect(h.rows.ai_case_drafts).toHaveLength(0);
  });

  it('workspace huérfano: 404 CASE_REQUIRED', async () => {
    const h = harness();
    h.rows.lawyer_cases.length = 0;
    const res = await h.call('post', '/api/ai/cases/:caseId/drafts', { draft_type: 'carta', instruction: 'Carta formal sobre el pago de la renta adeudada' });
    expect(res.statusCode).toBe(404);
    expect(h.provider).not.toHaveBeenCalled();
  });

  it('lista/abre/edita: flujos owner completos', async () => {
    const h = harness();
    const gen = await h.call('post', '/api/ai/cases/:caseId/drafts', { draft_type: 'informe', instruction: 'Minuta de audiencia sobre el pago de la renta' });
    const list = await h.call('get', '/api/ai/cases/:caseId/drafts');
    expect(list.body.drafts).toHaveLength(1);
    expect(list.body.drafts[0].title).toBeTruthy();
    const put = await h.call('put', '/api/ai/cases/:caseId/drafts/:draftId', { content: 'Contenido editado por el abogado.' }, gen.body.draft.id);
    expect(put.statusCode).toBe(200);
    expect(put.body.draft.content).toBe('Contenido editado por el abogado.');
    const open = await h.call('get', '/api/ai/cases/:caseId/drafts/:draftId', {}, gen.body.draft.id);
    expect(open.body.draft.content).toBe('Contenido editado por el abogado.');
    // snapshot link intacto tras editar
    expect(open.body.draft.intelligence_snapshot_id).toBe(gen.body.draft.intelligence_snapshot_id);
  });

  it('fallo de provider: 502 sin fila de borrador', async () => {
    const h = harness();
    h.provider.mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }));
    const res = await h.call('post', '/api/ai/cases/:caseId/drafts', { draft_type: 'carta', instruction: 'Carta formal sobre el pago de la renta adeudada' });
    expect(res.statusCode).toBe(500);
    expect(h.rows.ai_case_drafts).toHaveLength(0);
  });
});
