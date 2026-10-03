// @vitest-environment node
// FASE 4.59B — Case Chat reuse de research a nivel ruta (harness VM):
// memoria incluida sin nuevo research, ownership, exclusión Document Chat,
// presupuesto, cuotas.。其次 persistence/ownership ya cubiertos en
// researchIntegration; aquí solo el consumo.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { createAIMetering } from './metering.mjs';
import { commercialQuotaForPlan, freeQuotaForEntitlement } from './proAllowance.mjs';
import {
  buildChatSystemPrompt, buildChatContext, buildChatUserPrompt, CHAT_LIMITS,
} from './legalChatPrompt.mjs';
import { hasCanonicalDocumentReference } from './coreAuthority.mjs';
import { getProCaseHeader } from './proCaseContext.mjs';

const src = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const user = id(1), foreign = id(2), caseId = id(3), workspaceId = id(4), convId = id(5), docId = id(10);

const DOC_TEXT = 'Contrato de prestación de servicios. La cláusula quinta establece la obligación de pagar la renta antes del día diez de cada mes.';
const EVIDENCE = 'la obligación de pagar la renta antes del día diez';

const names = ['getAIWorkspaceOwned', 'requireAIAccess', 'getAILawyerAccess', 'getAILawyerSubscription', 'getFreeCaseAccess', 'freeQuotaForEntitlement',
  'getProLawyerSubscription', 'getProLawyerAccess', 'getPlanForAccess', 'serverCanUseAIFeature', 'isAIOverRateLimit', 'checkAIProtectionLimits',
  'getAIUsagePeriod', 'recordAIUsage', 'getAIConversationOwned', 'getAIDocumentOwned',
  'AIChatRequestSchema', 'AIChatResponseSchema', 'AI_DEFAULT_MODEL', 'AI_CHAT_MAX_TOKENS',
  'AI_PROTECT_MAX_MONTHLY_TOKENS', 'AI_PROTECT_MAX_MONTHLY_REQUESTS'];

function llmAnswer() {
  return { data: {
    answer: 'Según el contrato, la renta se paga antes del día diez.',
    sources: [{ document_id: docId, file_name: 'contrato.pdf', fragment_id: `document::${docId}::0`, evidence: EVIDENCE }],
  }, usage: { total_tokens: 100, input_tokens: 80, output_tokens: 20 } };
}

function harness() {
  let tokenUser = user;
  const rows = {
    lawyer_cases: [{ id: caseId, lawyer_id: user, title: 'Caso QA', description: 'desc', status: 'abierto', practice_area: 'Civil', client_id: null, ai_workspace_id: workspaceId }],
    ai_workspaces: [{ id: workspaceId, lawyer_id: user, name: 'Caso QA' }],
    ai_conversations: [{ id: convId, workspace_id: workspaceId, lawyer_id: user, title: null }],
    ai_documents: [{ id: docId, lawyer_id: user, workspace_id: workspaceId, original_filename: 'contrato.pdf', file_path: `${user}/${workspaceId}/${docId}/original.pdf`, status: 'ready', analysis_status: 'ready', extracted_text: DOC_TEXT }],
    ai_document_analyses: [{ document_id: docId, lawyer_id: user, workspace_id: workspaceId, summary: 'Resumen del contrato.', document_type: 'contrato', parties: ['Ana contra Beto'], key_points: ['pago de renta'], obligations: ['pagar la renta'], deadlines: [{ date: '', description: 'pago mensual' }], risks: [], recommendations: [], claims: [], evidence_sources: [] }],
    ai_research_requests: [{
      id: id(50), workspace_id: workspaceId, lawyer_id: user,
      query: '¿Qué dice la jurisprudencia sobre pago de rentas en arriendos?',
      answer: 'La jurisprudencia exige requerimiento previo antes de resolver el arriendo por no pago.',
      sources: [{ id: 'bcn-1', title: 'Ley 18.101', kind: 'normativa', url: 'https://example.invalid/ley18101' }],
      model: 'm', created_at: '2026-09-01T00:00:00Z',
    }],
    ai_chat_messages: [], ai_usage: [], ai_usage_monthly: [],
  };
  const rpc = vi.fn(async (name, args) => ({ data: name === 'ai_begin_operation' ? { operation_id: args.p_key, created: true } : name === 'ai_finish_operation' ? { id: args.p_operation, status: 'succeeded', terminal: true } : null, error: null }));
  const providerCalls = [];
  const provider = vi.fn(async (opts) => { providerCalls.push(opts); return JSON.parse(JSON.stringify(llmAnswer())); });
  const supabase = { rpc, storage: { from: () => ({}) }, from(table) {
    let action = 'select', payload, limit = Infinity, filters = [], orderKey = null, orderAsc = true, wantCount = false, wantHead = false;
    const run = (single = false) => {
      const list = rows[table] ?? (rows[table] = []);
      let found = list.filter((r) => filters.every((f) => f(r)));
      if (orderKey) found = [...found].sort((a, b) => String(a[orderKey] ?? '').localeCompare(String(b[orderKey] ?? '')));
      if (!orderAsc) found = [...found].reverse();
      found = found.slice(0, limit);
      if (action === 'insert') {
        const values = (Array.isArray(payload) ? payload : [payload]).map((p) => ({ id: randomUUID(), created_at: new Date().toISOString(), ...p }));
        list.push(...values); found = values;
      }
      if (action === 'update') found.forEach((r) => Object.assign(r, payload));
      if (action === 'delete') rows[table] = list.filter((r) => !found.includes(r));
      const out = { data: single ? (found[0] ? { ...found[0] } : null) : found.map((r) => ({ ...r })), error: null };
      if (wantCount) out.count = found.length;
      return out;
    };
    const q = { select: (_s, o) => { if (o && o.count === 'exact') wantCount = true; if (o && o.head) wantHead = true; return q; },
      eq: (k, v) => { filters.push((r) => r[k] === v); return q; },
      neq: (k, v) => { filters.push((r) => r[k] !== v); return q; },
      is: (k, v) => { filters.push((r) => r[k] === v); return q; },
      gte: (k, v) => { filters.push((r) => r[k] >= v); return q; },
      in: (k, v) => { filters.push((r) => v.includes(r[k])); return q; },
      order: (k, o) => { orderKey = k; orderAsc = !o || o.ascending !== false; return q; },
      limit: (n) => { limit = n; return q; },
      insert: (p) => { action = 'insert'; payload = p; return q; },
      update: (p) => { action = 'update'; payload = p; return q; },
      delete: () => { action = 'delete'; return q; },
      single: async () => run(true), maybeSingle: async () => run(true),
      then: (a, b) => Promise.resolve(run()).then(a, b) };
    return q;
  } };
  const routes = {};
  const quiet = { log() {}, warn() {}, error() {} };
  const ctx = vm.createContext({
    createAIMetering: (options) => createAIMetering({ ...options, log: () => {} }),
    commercialQuotaForPlan, freeQuotaForEntitlement, CHAT_LIMITS,
    buildChatSystemPrompt, buildChatContext, buildChatUserPrompt,
    buildChatSystemPrompt, buildChatContext, buildChatUserPrompt, CHAT_LIMITS,
    getProCaseHeader, honestEvidenceLocation: () => ({}), hasCanonicalDocumentReference,
    AI_PROTECT_MAX_MONTHLY_TOKENS: 20000000, AI_PROTECT_MAX_MONTHLY_REQUESTS: 5000,
    console: quiet, z, Buffer, process: { env: {} }, supabase,
    chatCompletion: provider, isAIProviderConfigured: () => true,
    capturePostHog: async () => {},
    app: { get: (p, h) => { routes[`get ${p}`] = h; }, post: (p, h) => { routes[`post ${p}`] = h; } },
    getUserIdFromToken: async () => tokenUser,
    requireAILawyer: async (_req, res) => { if (!tokenUser) { res.status(401).json({ error: 'x' }); return null; } return tokenUser; },
    requireAIEntitlement: async () => ({ plan: 'pro', res: null }),
    AI_DOCUMENTS_BUCKET: 'ai-documents', aiRateLimiter: new Map(),
  });
  for (const n of ast.statements) {
    if ((ts.isVariableStatement(n) || ts.isFunctionDeclaration(n)) &&
      names.includes((n.declarationList?.declarations?.[0]?.name ?? n.name)?.getText(ast))) vm.runInContext(n.getText(ast), ctx);
    if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
      ['/api/ai/cases/:caseId/chat'].includes(n.expression.arguments[0]?.text)) vm.runInContext(n.getText(ast), ctx);
  }
  async function call(body = {}) {
    const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } };
    await routes['post /api/ai/cases/:caseId/chat']({ headers: { authorization: 'Bearer f', 'x-ai-operation-id': randomUUID() }, params: { caseId: workspaceId }, body }, res);
    return res;
  }
  return { rows, provider, providerCalls, rpc, call, asForeign: () => { tokenUser = foreign; } };
}

describe('4.59B chat reuse a nivel ruta', () => {
  it('Case Chat incluye memoria sin nuevo research y persiste mensajes', async () => {
    const h = harness();
    const res = await h.call({ conversation_id: convId, message: '¿Qué dice la jurisprudencia sobre el pago de rentas?' });
    expect(res.statusCode).toBe(200);
    const userPrompt = h.providerCalls[0].messages.find((m) => m.role === 'user').content;
    expect(userPrompt).toContain('MEMORIA DE INVESTIGACIÓN');
    expect(userPrompt).toContain('requerimiento previo antes de resolver');
    // Sin operación research nueva: solo case_chat
    const begins = h.rpc.mock.calls.filter(([n]) => n === 'ai_begin_operation').map(([, a]) => a);
    expect(begins).toHaveLength(1);
    expect(begins[0].p_capability).toBe('case_chat');
    // Research intacto: sin fila duplicada
    expect(h.rows.ai_research_requests).toHaveLength(1);
    // Mensajes user+assistant persistidos
    expect(h.rows.ai_chat_messages.filter((m) => m.role === 'user')).toHaveLength(1);
    expect(h.rows.ai_chat_messages.filter((m) => m.role === 'assistant')).toHaveLength(1);
  });

  it('ownership: extranjero no ve memoria ni gasta proveedor', async () => {
    const h = harness();
    h.asForeign();
    const res = await h.call({ conversation_id: convId, message: 'pregunta' });
    expect([403, 404]).toContain(res.statusCode);
    expect(h.provider).not.toHaveBeenCalled();
  });

  it('Document Chat excluye memoria aunque exista', async () => {
    const h = harness();
    const res = await h.call({ conversation_id: convId, message: '¿Qué dice el contrato?', document_id: docId });
    expect(res.statusCode).toBe(200);
    const userPrompt = h.providerCalls[0].messages.find((m) => m.role === 'user').content;
    expect(userPrompt).not.toContain('MEMORIA DE INVESTIGACIÓN');
    expect(userPrompt).toContain('DOCUMENTO SELECCIONADO');
    const begins = h.rpc.mock.calls.filter(([n]) => n === 'ai_begin_operation').map(([, a]) => a);
    expect(begins[0].p_capability).toBe('document_chat');
  });

  it('citas de research validadas contra memoria; inventadas descartadas', async () => {
    const h = harness();
    // Reemplaza provider: cita válida + cita inventada
    h.provider.mockImplementationOnce(async () => ({ data: {
      answer: 'La jurisprudencia exige requerimiento previo.',
      sources: [
        { research_id: h.rows.ai_research_requests[0].id, research_query: 'q', title: 'Ley 18.101', url: 'https://example.invalid/ley18101' },
        { research_id: '00000000-0000-4000-8000-000000000099', title: 'Falsa', url: 'https://evil.invalid/x' },
      ],
    }, usage: { total_tokens: 10, input_tokens: 8, output_tokens: 2 } }));
    const res = await h.call({ conversation_id: convId, message: '¿Jurisprudencia sobre rentas?' });
    expect(res.statusCode).toBe(200);
    const saved = res.body.sources;
    expect(saved.some((s) => s.research_id === h.rows.ai_research_requests[0].id && s.url === 'https://example.invalid/ley18101')).toBe(true);
    expect(saved.some((s) => String(s.url || '').includes('evil'))).toBe(false);
    expect(saved.some((s) => String(s.research_id || '') === '00000000-0000-4000-8000-000000000099')).toBe(false);
  });
});
