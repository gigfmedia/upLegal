// @vitest-environment node
// FASE 4.59B — intelligence.legalContext: lectura acotada de research
// exitoso, sin mezclar hechos; hechos siguen evidenciados.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import {
  selectRelevantResearch,
  formatResearchLegalContext,
} from './researchMemory.mjs';
import { getProCaseHeader } from './proCaseContext.mjs';

const src = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const user = id(1), workspaceId = id(4), docId = id(10);

const names = ['getAIWorkspaceOwned', 'requireAIEntitlement', 'requireAIAccess', 'getAILawyerAccess', 'getAILawyerSubscription', 'getFreeCaseAccess',
  'getProLawyerSubscription', 'getProLawyerAccess', 'getPlanForAccess', 'serverCanUseAIFeature', 'isAIOverRateLimit', 'checkAIProtectionLimits',
  'getAIUsagePeriod', 'AI_FEATURES_ALL', 'PLAN_FEATURES_SERVER', 'AI_PROTECT_MAX_MONTHLY_TOKENS', 'AI_PROTECT_MAX_MONTHLY_REQUESTS',
  'aiRateLimiter', 'AI_RATE_WINDOW_MS', 'AI_PROTECT_RATE_LIMIT_PER_MINUTE',
  'selectRelevantResearch', 'formatResearchLegalContext'];

function harness() {
  let tokenUser = user;
  const rows = {
    lawyer_cases: [{ id: id(3), lawyer_id: user, title: 'Caso QA', description: 'd', status: 'abierto', practice_area: 'Civil', client_id: null, ai_workspace_id: workspaceId }],
    ai_workspaces: [{ id: workspaceId, lawyer_id: user, name: 'Caso QA' }],
    ai_subscriptions: [{ lawyer_id: user, status: 'active', plan: 'essential', current_period_end: '2099-01-01' }],
    ai_documents: [{ id: docId, lawyer_id: user, workspace_id: workspaceId, original_filename: 'c.pdf', status: 'ready', analysis_status: 'ready', extracted_text: 'texto' }],
    ai_document_analyses: [{ document_id: docId, lawyer_id: user, workspace_id: workspaceId, summary: 'Síntesis del contrato.', document_type: 'contrato', parties: ['Ana contra Beto'], key_points: [], obligations: [], deadlines: [], risks: [], recommendations: [], claims: [], evidence_sources: [] }],
    ai_research_requests: [{
      id: id(50), workspace_id: workspaceId, lawyer_id: user,
      query: 'Jurisprudencia sobre resolución de arriendos',
      answer: 'La jurisprudencia exige requerimiento previo.',
      sources: [{ id: 'bcn-1', title: 'Ley 18.101', kind: 'normativa', url: 'https://example.invalid/l18101' }],
      model: 'm', created_at: '2026-09-01T00:00:00Z',
    }],
  };
  const supabase = { rpc: async () => ({ data: null, error: null }), storage: { from: () => ({}) }, from(table) {
    let filters = [], orderKey = null, limit = Infinity;
    const run = (single = false) => {
      const list = rows[table] ?? [];
      let found = list.filter((r) => filters.every((f) => f(r)));
      if (orderKey) found = [...found].sort((a, b) => String(a[orderKey] ?? '').localeCompare(String(b[orderKey] ?? '')));
      found = found.slice(0, limit);
      return { data: single ? (found[0] || null) : found.map((r) => ({ ...r })), error: null };
    };
    const q = { select: () => q,
      eq: (k, v) => { filters.push((r) => r[k] === v); return q; },
      order: (k) => { orderKey = k; return q; },
      limit: (n) => { limit = n; return q; },
      single: async () => run(true), maybeSingle: async () => run(true),
      then: (a, b) => Promise.resolve(run()).then(a, b) };
    return q;
  } };
  const routes = {};
  const quiet = { log() {}, warn() {}, error() {} };
  const ctx = vm.createContext({ console: quiet, z, Buffer, process: { env: {} }, supabase,
    selectRelevantResearch, formatResearchLegalContext, getProCaseHeader,
    app: { get: (p, h) => { routes[`get ${p}`] = h; } },
    getUserIdFromToken: async () => tokenUser,
    requireAILawyer: async (_req, res) => { if (!tokenUser) { res.status(401).json({ error: 'x' }); return null; } return tokenUser; },
  });
  for (const n of ast.statements) {
    if ((ts.isVariableStatement(n) || ts.isFunctionDeclaration(n)) &&
      names.includes((n.declarationList?.declarations?.[0]?.name ?? n.name)?.getText(ast))) vm.runInContext(n.getText(ast), ctx);
    if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
      ['/api/ai/cases/:caseId/intelligence'].includes(n.expression.arguments[0]?.text)) vm.runInContext(n.getText(ast), ctx);
  }
  async function call() {
    const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } };
    await routes['get /api/ai/cases/:caseId/intelligence']({ headers: {}, params: { caseId: workspaceId } }, res);
    return res;
  }
  return { rows, call };
}

describe('4.59B intelligence legalContext', () => {
  it('incluye research como contexto legal separado; hechos siguen evidenciados', async () => {
    const h = harness();
    const res = await h.call();
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.legalContext)).toBe(true);
    expect(res.body.legalContext).toHaveLength(1);
    expect(res.body.legalContext[0].research_id).toBe(id(50));
    expect(res.body.legalContext[0].source_titles).toEqual(['Ley 18.101']);
    // Hechos intactos desde documentos
    expect(res.body.parties).toContain('Ana contra Beto');
    expect(JSON.stringify(res.body.facts)).not.toContain('requerimiento previo');
  });

  it('sin research: legalContext vacío, resto intacto', async () => {
    const h = harness();
    h.rows.ai_research_requests.length = 0;
    const res = await h.call();
    expect(res.statusCode).toBe(200);
    expect(res.body.legalContext).toEqual([]);
    expect(res.body.parties).toContain('Ana contra Beto');
  });
});
