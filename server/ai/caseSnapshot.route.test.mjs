// @vitest-environment node
// FASE 4.59C — snapshot versionado de Case Intelligence a nivel ruta:
// primera versión, idempotencia, cambios (doc/research/caso), separación
// hecho/contexto, historial, ownership, ambigüedad, legacy, cuota, tamaño.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import {
  buildSourceManifest,
  fingerprintManifest,
  formatSnapshotBlock,
  readLatestSnapshot,
  persistSnapshotIfNew,
  resolveSnapshotCase,
  computeCaseIntelligence,
  assembleIntelligencePayload,
} from './caseSnapshots.mjs';
import {
  selectRelevantResearch,
  formatResearchLegalContext,
} from './researchMemory.mjs';

const src = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const user = id(1), foreign = id(2), caseId = id(3), workspaceId = id(4), docId = id(10);

const names = ['getAIWorkspaceOwned', 'requireAIEntitlement', 'requireAIAccess', 'getAILawyerAccess', 'getAILawyerSubscription', 'getFreeCaseAccess',
  'getProLawyerSubscription', 'getProLawyerAccess', 'getPlanForAccess', 'serverCanUseAIFeature', 'isAIOverRateLimit', 'checkAIProtectionLimits',
  'getAIUsagePeriod', 'AI_FEATURES_ALL', 'PLAN_FEATURES_SERVER', 'AI_PROTECT_MAX_MONTHLY_TOKENS', 'AI_PROTECT_MAX_MONTHLY_REQUESTS',
  'aiRateLimiter', 'AI_RATE_WINDOW_MS', 'AI_PROTECT_RATE_LIMIT_PER_MINUTE',
  'selectRelevantResearch', 'formatResearchLegalContext',
  'buildSourceManifest', 'fingerprintManifest', 'readLatestSnapshot', 'persistSnapshotIfNew', 'resolveSnapshotCase'];

function harness() {
  let tokenUser = user;
  const rows = {
    lawyer_cases: [{ id: caseId, lawyer_id: user, title: 'Caso QA', description: 'descripción inicial', status: 'abierto', practice_area: 'Civil', stage: null, client_id: null, ai_workspace_id: workspaceId }],
    ai_workspaces: [{ id: workspaceId, lawyer_id: user, name: 'Caso QA' }],
    ai_subscriptions: [{ lawyer_id: user, status: 'active', plan: 'essential', current_period_end: '2099-01-01' }],
    ai_documents: [{ id: docId, lawyer_id: user, workspace_id: workspaceId, original_filename: 'c.pdf', file_path: 'x', file_size_bytes: 10, mime_type: 'application/pdf', status: 'ready', page_count: 1, created_at: '2026-09-01T00:00:00Z' }],
    ai_document_analyses: [{ id: id(20), document_id: docId, lawyer_id: user, workspace_id: workspaceId, summary: 'Síntesis.', document_type: 'contrato', parties: ['Ana contra Beto'], key_points: ['pago'], obligations: ['pagar'], deadlines: [], risks: [], recommendations: [], claims: [], evidence_sources: [], model: 'm', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' }],
    ai_research_requests: [{
      id: id(50), workspace_id: workspaceId, lawyer_id: user,
      query: 'Jurisprudencia sobre resolución de arriendos',
      answer: 'La jurisprudencia exige requerimiento previo antes de resolver.',
      sources: [{ id: 'bcn-1', title: 'Ley 18.101', kind: 'normativa', url: 'https://example.invalid/l18101' }],
      model: 'm', created_at: '2026-09-02T00:00:00Z',
    }],
    ai_case_intelligence_snapshots: [],
  };
  const rpc = vi.fn(async () => ({ data: null, error: null }));
  const supabase = { rpc, storage: { from: () => ({}) }, from(table) {
    let action = 'select', payload, limit = Infinity, filters = [], orderKey = null, orderAsc = true;
    const run = (single = false) => {
      const list = rows[table] ?? (rows[table] = []);
      let found = list.filter((r) => filters.every((f) => f(r)));
      if (orderKey) found = [...found].sort((a, b) => String(a[orderKey] ?? '').localeCompare(String(b[orderKey] ?? '')));
      if (!orderAsc) found = [...found].reverse();
      found = found.slice(0, limit);
      if (action === 'insert') {
        const values = (Array.isArray(payload) ? payload : [payload]).map((p) => ({ ...p }));
        // Simula UNIQUE(lawyer_case_id, version|fingerprint): conflicto → 23505
        if (table === 'ai_case_intelligence_snapshots') {
          for (const v of values) {
            const clash = list.find((r) =>
              (r.lawyer_case_id === v.lawyer_case_id && r.version === v.version) ||
              (r.lawyer_case_id === v.lawyer_case_id && r.source_fingerprint === v.source_fingerprint));
            if (clash) return { data: null, error: { code: '23505', message: 'duplicate' } };
          }
        }
        list.push(...values); found = values;
      }
      return { data: single ? (found[0] || null) : found.map((r) => ({ ...r })), error: null };
    };
    const q = { select: () => q,
      eq: (k, v) => { filters.push((r) => r[k] === v); return q; },
      order: (k, o) => { orderKey = k; orderAsc = !o || o.ascending !== false; return q; },
      limit: (n) => { limit = n; return q; },
      insert: (p) => { action = 'insert'; payload = p; return q; },
      single: async () => run(true), maybeSingle: async () => run(true),
      then: (a, b) => Promise.resolve(run()).then(a, b) };
    return q;
  } };
  const routes = {};
  const quiet = { log() {}, warn() {}, error() {} };
  const ctx = vm.createContext({ console: quiet, z, Buffer, process: { env: {} }, supabase,
    buildSourceManifest, fingerprintManifest, computeCaseIntelligence, assembleIntelligencePayload,
    app: { get: (p, h) => { routes[`get ${p}`] = h; } },
    getUserIdFromToken: async () => tokenUser,
    requireAILawyer: async (_req, res) => { if (!tokenUser) { res.status(401).json({ error: 'x' }); return null; } return tokenUser; },
  });
  for (const n of ast.statements) {
    if ((ts.isVariableStatement(n) || ts.isFunctionDeclaration(n)) &&
      names.includes((n.declarationList?.declarations?.[0]?.name ?? n.name)?.getText(ast))) {
      if (['selectRelevantResearch', 'formatResearchLegalContext', 'buildSourceManifest', 'fingerprintManifest', 'readLatestSnapshot', 'persistSnapshotIfNew', 'resolveSnapshotCase'].includes(
        (n.declarationList?.declarations?.[0]?.name ?? n.name)?.getText(ast))) continue;
      vm.runInContext(n.getText(ast), ctx);
    }
    if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
      ['/api/ai/cases/:caseId/intelligence'].includes(n.expression.arguments[0]?.text)) vm.runInContext(n.getText(ast), ctx);
  }
  // readLatestSnapshot/persistSnapshotIfNew/resolveSnapshotCase se exponen
  // al ctx VM para que la ruta evaluada las resuelva (ver import arriba).
  ctx.readLatestSnapshot = readLatestSnapshot;
  ctx.persistSnapshotIfNew = persistSnapshotIfNew;
  ctx.resolveSnapshotCase = resolveSnapshotCase;
  ctx.selectRelevantResearch = selectRelevantResearch;
  ctx.formatResearchLegalContext = formatResearchLegalContext;
  async function call() {
    const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } };
    await routes['get /api/ai/cases/:caseId/intelligence']({ headers: {}, params: { caseId: workspaceId } }, res);
    return res;
  }
  return { rows, rpc, call, asForeign: () => { tokenUser = foreign; } };
}

describe('4.59C snapshots a nivel ruta', () => {
  it('primera lectura crea v1 una vez; segunda idempotente', async () => {
    const h = harness();
    const r1 = await h.call();
    expect(r1.statusCode).toBe(200);
    expect(r1.body.snapshot.version).toBe(1);
    expect(r1.body.snapshot.is_stale).toBe(false);
    expect(h.rows.ai_case_intelligence_snapshots).toHaveLength(1);
    expect(r1.body.legalContext).toHaveLength(1);
    expect(r1.body.legalContext[0].research_id).toBe(id(50));
    const r2 = await h.call();
    expect(r2.body.snapshot.version).toBe(1);
    expect(h.rows.ai_case_intelligence_snapshots).toHaveLength(1);
  });

  it('nuevo análisis → v2 con fingerprint distinto; v1 preservada', async () => {
    const h = harness();
    await h.call();
    const fp1 = h.rows.ai_case_intelligence_snapshots[0].source_fingerprint;
    h.rows.ai_documents.push({ id: id(11), lawyer_id: user, workspace_id: workspaceId, original_filename: 'd2.pdf', status: 'ready', page_count: 1, created_at: '2026-09-03T00:00:00Z' });
    h.rows.ai_document_analyses.push({ id: id(21), document_id: id(11), lawyer_id: user, workspace_id: workspaceId, summary: 'Otra síntesis.', document_type: 'demanda', parties: ['Carlos contra Diana'], key_points: [], obligations: [], deadlines: [], risks: [], recommendations: [], claims: [], evidence_sources: [], model: 'm', created_at: '2026-09-03T00:00:00Z', updated_at: '2026-09-03T00:00:00Z' });
    const r = await h.call();
    expect(r.body.snapshot.version).toBe(2);
    expect(r.body.snapshot.source_fingerprint).not.toBe(fp1);
    expect(h.rows.ai_case_intelligence_snapshots).toHaveLength(2);
    expect(r.body.parties).toContain('Carlos contra Diana');
  });

  it('nuevo research → v+1 con legalContext actualizado; hechos sin proposiciones', async () => {
    const h = harness();
    await h.call();
    h.rows.ai_research_requests.push({
      id: id(51), workspace_id: workspaceId, lawyer_id: user,
      query: 'Plazos de prescripción en materia civil',
      answer: 'La prescripción extintiva ordinaria es de cinco años.',
      sources: [], model: 'm', created_at: '2026-09-04T00:00:00Z',
    });
    const r = await h.call();
    expect(r.body.snapshot.version).toBe(2);
    expect(r.body.legalContext.map((l) => l.research_id)).toContain(id(51));
    // Separación hecho/contexto: la proposición NO está en facts/parties
    const factsText = JSON.stringify(r.body.facts) + JSON.stringify(r.body.parties);
    expect(factsText).not.toContain('prescripción');
  });

  it('edición del caso (practice_area) → nueva versión', async () => {
    const h = harness();
    await h.call();
    h.rows.lawyer_cases[0].practice_area = 'Laboral';
    const r = await h.call();
    expect(r.body.snapshot.version).toBe(2);
  });

  it('ownership: extranjero 404 sin snapshot ajeno', async () => {
    const h = harness();
    await h.call();
    h.asForeign();
    const r = await h.call();
    expect(r.statusCode).toBe(404);
    expect(h.rows.ai_case_intelligence_snapshots.every((s) => s.lawyer_id === user)).toBe(true);
  });

  it('ambigüedad: dos casos mismo workspace → 409 sin snapshot nuevo', async () => {
    const h = harness();
    await h.call();
    h.rows.lawyer_cases.push({ id: id(6), lawyer_id: user, title: 'Otro', description: '', status: 'abierto', practice_area: 'Civil', stage: null, client_id: null, ai_workspace_id: workspaceId });
    const r = await h.call();
    expect(r.statusCode).toBe(409);
    expect(r.body.code).toBe('AI_CASE_LINK_AMBIGUOUS');
    expect(h.rows.ai_case_intelligence_snapshots).toHaveLength(1);
  });

  it('legacy huérfano: computa sin persistir, snapshot null', async () => {
    const h = harness();
    h.rows.lawyer_cases.length = 0;
    const r = await h.call();
    expect(r.statusCode).toBe(200);
    expect(r.body.snapshot).toBeNull();
    expect(h.rows.ai_case_intelligence_snapshots).toHaveLength(0);
    expect(r.body.parties).toContain('Ana contra Beto');
  });

  it('sin metering nuevo: intelligence GET no inicia operaciones', async () => {
    const h = harness();
    await h.call();
    const begins = h.rpc.mock.calls.filter(([n]) => n === 'ai_begin_operation');
    expect(begins).toHaveLength(0);
  });

  it('snapshot grande acotado: 150 docs sin extracted_text duplicado', async () => {
    const h = harness();
    for (let i = 0; i < 150; i++) {
      const did = `00000000-0000-4000-8000-${String(100 + i).padStart(12, '0')}`;
      h.rows.ai_documents.push({ id: did, lawyer_id: user, workspace_id: workspaceId, original_filename: `d${i}.pdf`, status: 'ready', page_count: 2, created_at: '2026-09-01T00:00:00Z' });
      h.rows.ai_document_analyses.push({ id: `00000000-0000-4000-9000-${String(100 + i).padStart(12, '0')}`, document_id: did, lawyer_id: user, workspace_id: workspaceId, summary: `Síntesis ${i}.`, document_type: 'otro', parties: [`P${i} contra Q${i}`], key_points: ['k'], obligations: ['o'], deadlines: [], risks: [], recommendations: [], claims: [], evidence_sources: [], model: 'm', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' });
    }
    const r = await h.call();
    expect(r.statusCode).toBe(200);
    const size = JSON.stringify(r.body.snapshot ? h.rows.ai_case_intelligence_snapshots[0].snapshot : {}).length;
    expect(size).toBeLessThan(400000);
    expect(JSON.stringify(h.rows.ai_case_intelligence_snapshots[0].snapshot)).not.toContain('extracted_text');
  });
});

describe('4.59C fingerprint y bloque de chat', () => {
  it('manifiesto estable ante orden distinto; sensible a cambios materiales', () => {
    const m1 = buildSourceManifest({ caseRow: { id: 'c', practice_area: 'Civil' }, docs: [{ id: 'd2' }, { id: 'd1' }], analyses: [], researchRows: [] });
    const m2 = buildSourceManifest({ caseRow: { id: 'c', practice_area: 'Civil' }, docs: [{ id: 'd1' }, { id: 'd2' }], analyses: [], researchRows: [] });
    expect(fingerprintManifest(m1)).toBe(fingerprintManifest(m2));
    const m3 = buildSourceManifest({ caseRow: { id: 'c', practice_area: 'Laboral' }, docs: [{ id: 'd1' }, { id: 'd2' }], analyses: [], researchRows: [] });
    expect(fingerprintManifest(m3)).not.toBe(fingerprintManifest(m1));
  });

  it('formatSnapshotBlock acotado con provenance', () => {
    const text = formatSnapshotBlock({
      snapshot: {
        caseSummary: 'Resumen del caso.',
        document_count: 2,
        facts: [{ text: 'Hecho probado.' }],
        legalContext: [{ research_id: 'r', query: 'q', created_at: '2026-01-01', synthesis: 'Síntesis legal.', source_titles: ['Ley X'] }],
      },
    });
    expect(text).toContain('RESUMEN DE INTELIGENCIA');
    expect(text).toContain('Hecho probado.');
    expect(text).toContain('Ley X');
    expect(text.length).toBeLessThanOrEqual(5000);
  });
});
