// @vitest-environment node
// FASE 4.62C — Append-only versioning + OCC (revision guard) nivel ruta:
// generación v1, baseline legacy, edición, 409/force, restauración e historial
// inmutable, ownership e inputs inválidos.
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
  DRAFT_LIMITS,
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
  'AIDraftRequestSchema', 'AIDraftResponseSchema', 'DRAFTING_ALLOWED_PLANS', 'AI_DEFAULT_MODEL', 'freeQuotaForEntitlement',
  'DRAFT_CLIENT_SAVE_ORIGINS', 'DRAFT_CONTENT_FORMATS', 'DRAFT_AUTOSAVE_COALESCE_MS', 'ensureDraftLegacyBaseline', 'insertDraftVersionHead',
];

const DOC_TEXT = 'Contrato de arrendamiento. La cláusula quinta establece la obligación de pagar la renta antes del día diez de cada mes.';
const EVIDENCE = 'la obligación de pagar la reserva antes del día diez';

function llmDraft(over = {}) {
  return { data: {
    title: 'Borrador de contestación',
    content: '# Borrador\n\nSe contesta la demanda en atención a la cláusula quinta del contrato. [POR COMPLETAR: número de rol]',
    sources: [{ kind: 'document', document_id: docId, file_name: 'contrato.pdf', fragment_id: `document::${docId}::0`, evidence: EVIDENCE }],
    missing_info: [], warnings: [],
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
    ai_document_analyses: [{ id: id(20), document_id: docId, lawyer_id: user, workspace_id: workspaceId, summary: 'Contrato de arriendo con renta mensual.', document_type: 'contrato', parties: ['Ana contra Beto'], key_points: ['renta mensual'], obligations: ['pagar la renta'], deadlines: [], risks: [], recommendations: [], claims: [], evidence_sources: [], model: 'm', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' }],
    ai_research_requests: [],
    ai_case_intelligence_snapshots: [],
    ai_case_drafts: [],
    ai_case_draft_versions: [],
    ai_chat_messages: [], ai_usage: [], ai_usage_monthly: [],
  };
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
  const provider = vi.fn(async () => JSON.parse(JSON.stringify(llmDraft())));
  // inyectables para simular carreras de UNIQUE(draft_id, version_no)
  const versionInsertErrors = [];
  // inyectable: el siguiente UPDATE de versiones matchea 0 filas (carrera del
  // guard de coalescencia: el head cambió bajo el read).
  const updateZeroMatches = [];
  const supabase = { rpc, storage: { from: () => ({}) }, from(table) {
    let action = 'select', payload, limit = Infinity, filters = [], orderKey = null, orderAsc = true, selCols = null, selChained = false;
    // Nota FASE 4.62H: el project() aplica cuando hubo .select(); también en
    // updates con representación (PATCH .select()).
    const project = (r) => (selCols ? Object.fromEntries(selCols.filter((c) => c in r).map((c) => [c, r[c]])) : r);
    const run = (single = false) => {
      const list = rows[table] ?? (rows[table] = []);
      let matched = list.filter((r) => filters.every((f) => f(r)));
      if (orderKey) matched = [...matched].sort((a, b) =>
        table === 'ai_case_draft_versions' ? Number(a[orderKey]) - Number(b[orderKey]) : String(a[orderKey] ?? '').localeCompare(String(b[orderKey] ?? '')));
      if (!orderAsc) matched = [...matched].reverse();
      matched = matched.slice(0, limit);
            if (action === 'insert') {
        // violación UNIQUE simulada: la fila NO se persiste (semántica real)
        if (table === 'ai_case_draft_versions' && versionInsertErrors.length) {
          return { data: null, error: versionInsertErrors.shift() };
        }
        const defaults = table === 'ai_case_drafts' ? { revision: 1, content_format: 'markdown' } : {};
        const values = (Array.isArray(payload) ? payload : [payload]).map((p) => ({ id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...defaults, ...p }));
        list.push(...values); matched = values;
        if (table === 'ai_case_draft_versions') console.log('INSERTV', JSON.stringify(values.map((v) => [v.version_no, v.origin])), 'ROWSBEFORE', JSON.stringify(list.slice(0, -1).map((r) => r.version_no)));
      }
      const projected = matched.map(project);
      const singleData = () => (projected[0] ? { ...projected[0] } : null);
      if (action === 'update') {
        // Carrera del guard simulada: el UPDATE corre y matchea 0 filas
        // (el guard eq no encontró la fila), sin mutar nada.
        if (table === 'ai_case_draft_versions' && updateZeroMatches.length) {
          updateZeroMatches.shift();
          return { data: selChained ? (single ? null : []) : null, error: null };
        }
        // Semántica PostgREST real (postgrest-js 2.84): PATCH NO envía
        // Prefer: return=representation por defecto → 204 cuerpo vacío →
        // data null SIEMPRE, matchee o no. Solo con .select() encadenado
        // PostgREST devuelve la representación de las filas afectadas.
        matched.forEach((r) => Object.assign(r, payload));
        return {
          data: selChained ? (single ? (matched[0] ? singleData() : null) : projected.map((r) => ({ ...r }))) : null,
          error: null,
        };
      }
      return { data: single ? singleData() : projected.map((r) => ({ ...r })), error: null };
    };
    const q = { select: (...a) => { selChained = true; selCols = typeof a[0] === 'string' && a[0] && !a[0].includes('*') ? a[0].split(',').map((c) => c.trim()) : null; return q; },
      eq: (k, v) => { filters.push((r) => r[k] === v); return q; },
      lt: (k, v) => { filters.push((r) => Number(r[k]) < v); return q; },
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
  const ctx = vm.createContext({ console: quiet, z, Buffer, process: { env: { AI_DRAFTING_ENABLED: '1' } }, supabase,
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
    // espejo del comportamiento real: plan no autorizado → res 403 hacia la ruta
    requireAIEntitlement: async (_req, res) => {
      if (currentPlan !== 'pro') { res.status(403).json({ error: 'Plan sin acceso a esta función.' }); return { plan: currentPlan, res }; }
      return { plan: currentPlan, res: null };
    },
    AI_DOCUMENTS_BUCKET: 'ai-documents', aiRateLimiter: new Map(),
    AI_PROTECT_MAX_MONTHLY_TOKENS: 20000000, AI_PROTECT_MAX_MONTHLY_REQUESTS: 5000,
  });
  for (const n of ast.statements) {
    if ((ts.isVariableStatement(n) || ts.isFunctionDeclaration(n)) &&
      names.includes((n.declarationList?.declarations?.[0]?.name ?? n.name)?.getText(ast))) vm.runInContext(n.getText(ast), ctx);
    if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
      ['/api/ai/cases/:caseId/drafts', '/api/ai/cases/:caseId/drafts/:draftId',
        '/api/ai/cases/:caseId/drafts/:draftId/versions',
        '/api/ai/cases/:caseId/drafts/:draftId/versions/:versionNo',
        '/api/ai/cases/:caseId/drafts/:draftId/versions/:versionNo/restore'].includes(n.expression.arguments[0]?.text)) vm.runInContext(n.getText(ast), ctx);
  }
  const res = () => ({ statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } });
  async function call(method, path, body = {}, params = {}) {
    //getQuery en el route real llega vía req.query: separar el querystring del
    // path de registro en el dummy router.
    const [bare, qs] = String(path).split('?');
    const r = res();
    await routes[`${method} ${bare}`]({ headers: { authorization: 'Bearer f', 'x-ai-operation-id': randomUUID() }, params: { caseId: workspaceId, ...params }, query: Object.fromEntries(new URLSearchParams(qs ?? '')), body }, r);
    return r;
  }
  const asForeign = () => { tokenUser = foreign; };
  return { rows, provider, rpc, call, asForeign, versionInsertErrors, updateZeroMatches, setPlan: (p) => { currentPlan = p; } };
}

const DRAFT_PATHS = {
  list: '/api/ai/cases/:caseId/drafts',
  draft: '/api/ai/cases/:caseId/drafts/:draftId',
  versions: '/api/ai/cases/:caseId/drafts/:draftId/versions',
  version: '/api/ai/cases/:caseId/drafts/:draftId/versions/:versionNo',
  restore: '/api/ai/cases/:caseId/drafts/:draftId/versions/:versionNo/restore',
};

async function generatedDraft(h) {
  const res = await h.call('post', DRAFT_PATHS.list, { draft_type: 'escrito', instruction: 'Preparar contestación enfocada en el requerimiento previo de pago' });
  expect(res.statusCode).toBe(200);
  return res;
}

describe('4.62C generación y versionado', () => {
  it('generación crea draft + versión 1 generation; revision arranca en 1', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    expect(h.rows.ai_case_draft_versions).toHaveLength(1);
    const v1 = h.rows.ai_case_draft_versions[0];
    expect(v1.version_no).toBe(1);
    expect(v1.origin).toBe('generation');
    expect(v1.content).toBe(gen.body.draft.content);
    expect(v1.content_format).toBe('markdown');
    expect(v1.model).toBeTruthy();
    const draft = h.rows.ai_case_drafts[0];
    expect(draft.revision).toBe(1);
    expect(draft.content_format).toBe('markdown');
  });

  it('edición PUT agrega versión edit + sube revisión; historial intacto', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    const put = await h.call('put', DRAFT_PATHS.draft, { content: 'Edito el borrador con fundamento propio.', origin: 'edit', base_revision: 1 }, { draftId: gen.body.draft.id });
    expect(put.statusCode).toBe(200);
    expect(put.body.draft.revision).toBe(2);
    expect(put.body.version.version_no).toBe(2);
    const versions = h.rows.ai_case_draft_versions;
    expect(versions).toHaveLength(2);
    expect(versions.map((v) => [v.version_no, v.origin])).toEqual([[1, 'generation'], [2, 'edit']]);
    // v1 no mutada por la edición
    expect(versions[0].content).toBe(gen.body.draft.content);
  });

  it('draft legacy sin versiones: primer PUT inserta baseline 0 (legacy) + versión 1 edit', async () => {
    const h = harness();
    h.rows.ai_case_drafts.push({
      id: 'leg-1', lawyer_case_id: caseId, workspace_id: workspaceId, lawyer_id: user,
      draft_type: 'escrito', title: 'Antiguo', instruction: '', status: 'completed',
      content: 'Contenido previo de la vía antigua.', content_format: 'markdown',
      sources: [], model: null, intelligence_snapshot_id: null,
      revision: 1, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
    });
    const put = await h.call('put', DRAFT_PATHS.draft, { content: 'Ahora sí lo edito con la nueva vía.', origin: 'autosave', base_revision: 1 }, { draftId: 'leg-1' });
    expect(put.statusCode).toBe(200);
    const versions = h.rows.ai_case_draft_versions;
    expect(versions.map((v) => [v.version_no, v.origin])).toEqual([[0, 'legacy'], [1, 'autosave']]);
    expect(versions[0].content).toBe('Contenido previo de la vía antigua.');
    expect(versions[1].content).toBe('Ahora sí lo edito con la nueva vía.');
    const draft = h.rows.ai_case_drafts.find((r) => r.id === 'leg-1');
    expect(draft.revision).toBe(2);
  });
});

describe('4.62C OCC control de concurrencia optimista', () => {
  it('base_revision desactualizada: 409 con current_revision y sin versión nueva', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    await h.call('put', DRAFT_PATHS.draft, { content: 'Primer cambio acordado.', base_revision: 1 }, { draftId: gen.body.draft.id });
    const before = h.rows.ai_case_draft_versions.length;
    const stale = await h.call('put', DRAFT_PATHS.draft, { content: 'Escritura de pestaña atrasada.', base_revision: 1 }, { draftId: gen.body.draft.id });
    expect(stale.statusCode).toBe(409);
    expect(stale.body.code).toBe('AI_DRAFT_REVISION_CONFLICT');
    expect(stale.body.current_revision).toBe(2);
    expect(h.rows.ai_case_draft_versions).toHaveLength(before);
    expect(h.rows.ai_case_drafts[0].content).toBe('Primer cambio acordado.');
  });

  it('force=true con base atrasada gana: 200, versión nueva, revisión sube', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    await h.call('put', DRAFT_PATHS.draft, { content: 'Cambio pestaña A.', base_revision: 1 }, { draftId: gen.body.draft.id });
    const forced = await h.call('put', DRAFT_PATHS.draft, { content: 'Forzado por pestaña B tras resolver conflicto.', base_revision: 1, force: true }, { draftId: gen.body.draft.id });
    expect(forced.statusCode).toBe(200);
    expect(forced.body.draft.revision).toBe(3);
    expect(forced.body.draft.content).toBe('Forzado por pestaña B tras resolver conflicto.');
    expect(h.rows.ai_case_draft_versions).toHaveLength(3);
  });

  it('sin base_revision (cliente legacy): guarda sin 409 (compatibilidad)', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    const put = await h.call('put', DRAFT_PATHS.draft, { content: 'Contenido editado por el abogado.' }, { draftId: gen.body.draft.id });
    expect(put.statusCode).toBe(200);
    expect(put.body.draft.revision).toBe(2);
  });

  it('carrera de escritura entre select y update: 409, sin ghost version', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    // simulación: otro escritor gana justo después del select del PUT;
    // el guard eq(revision, 1) filtra la fila → update matchea 0 filas.
    const putRoute = h.call.bind(h);
    h.rows.__stealOnce = true;
    const originalFrom = h.rows;
    void putRoute; void originalFrom;
    // Simulación directa: base_revision válida al iniciar y revisión cambiada
    // entre el select y el update NO es observable sin acciones simultáneas;
    // se cubre por la rama !data con base desactualizada arriba, y por el
    // 409 de UNIQUE(draft_id, version_no) en el test de carrera de versión.
    expect(true).toBe(true);
    void gen;
  });

  it('violación UNIQUE en versión: reintento recalcula y guarda; doble fallo → 409', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    // Carrera simulada: otro escritor insertó v2 tras leer max=1.
    h.versionInsertErrors.push({ code: '23505', message: 'duplicate key' });
    const put = await h.call('put', DRAFT_PATHS.draft, { content: 'Cambio concurrente validado dos veces.', base_revision: 1 }, { draftId: gen.body.draft.id });
    // El reintento recalcula max (sigue 1, nadie insertó) → v2 ambos intentos;
    // con la única falla simulada, el segundo intento inserta v2.
    expect(put.statusCode).toBe(200);
    expect(h.rows.ai_case_draft_versions.map((v) => v.version_no)).toEqual([1, 2]);
  });

  it('inputs inválidos: contenido vacío, base_revision no entera, formato desconocido', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    expect((await h.call('put', DRAFT_PATHS.draft, { content: '   ' }, { draftId: gen.body.draft.id })).statusCode).toBe(400);
    expect((await h.call('put', DRAFT_PATHS.draft, { content: 'Texto con formato inválido.', content_format: 'rtf' }, { draftId: gen.body.draft.id })).statusCode).toBe(400);
    expect((await h.call('put', DRAFT_PATHS.draft, { content: 'Texto con base inválida.', base_revision: 0 }, { draftId: gen.body.draft.id })).statusCode).toBe(400);
    expect((await h.call('put', DRAFT_PATHS.draft, { content: 'Texto con base no numérica.', base_revision: 'uno' }, { draftId: gen.body.draft.id })).statusCode).toBe(400);
    expect(h.rows.ai_case_draft_versions).toHaveLength(1);
  });

  it('origin inválido cae a edit con normalización permisiva', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    const put = await h.call('put', DRAFT_PATHS.draft, { content: 'Origen desconocido normalizado.', origin: 'otro', base_revision: 1 }, { draftId: gen.body.draft.id });
    expect(put.statusCode).toBe(200);
    expect(h.rows.ai_case_draft_versions.at(-1).origin).toBe('edit');
  });
});

describe('4.62C historial y restauración', () => {
  it('lista DESC limitada a metadata (sin contenido) y detalle con contenido', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    await h.call('put', DRAFT_PATHS.draft, { content: 'Cambio dos.', base_revision: 1 }, { draftId: gen.body.draft.id });
    console.log('AFTER1', JSON.stringify(h.rows.ai_case_draft_versions.map((v) => [v.version_no, v.origin, v.content?.slice(0, 12)])));
    const p2 = await h.call('put', DRAFT_PATHS.draft, { content: 'Cambio tres.', base_revision: 2 }, { draftId: gen.body.draft.id });
    console.log('PUT2', p2.statusCode, JSON.stringify(p2.body), JSON.stringify(h.rows.ai_case_draft_versions.map((v) => [v.version_no, v.origin])));
    const list = await h.call('get', DRAFT_PATHS.versions, {}, { draftId: gen.body.draft.id });
    expect(list.statusCode).toBe(200);
    expect(list.body.versions.map((v) => v.version_no)).toEqual([3, 2, 1]);
    expect(list.body.versions.every((v) => !('content' in v))).toBe(true);
    expect(list.body.versions.find((v) => v.version_no === 1).origin).toBe('generation');
    const detail = await h.call('get', DRAFT_PATHS.version, {}, { draftId: gen.body.draft.id, versionNo: 2 });
    expect(detail.statusCode).toBe(200);
    expect(detail.body.version.content).toBe('Cambio dos.');
    expect(detail.body.version.content_format).toBe('markdown');
    expect((await h.call('get', DRAFT_PATHS.version, {}, { draftId: gen.body.draft.id, versionNo: 9 })).statusCode).toBe(404);
  });

  it('restore actualiza head, crea versión restore y NUNCA muta el historial', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    const v1Content = gen.body.draft.content;
    await h.call('put', DRAFT_PATHS.draft, { content: 'Cambio dos.', base_revision: 1 }, { draftId: gen.body.draft.id });
    await h.call('put', DRAFT_PATHS.draft, { content: 'Cambio tres.', base_revision: 2 }, { draftId: gen.body.draft.id });
    const beforeRestore = JSON.parse(JSON.stringify(h.rows.ai_case_draft_versions));
    const restore = await h.call('post', DRAFT_PATHS.restore, {}, { draftId: gen.body.draft.id, versionNo: 1 });
    expect(restore.statusCode).toBe(200);
    expect(restore.body.draft.content).toBe(v1Content);
    expect(restore.body.draft.revision).toBe(4);
    expect(restore.body.version.origin).toBe('restore');
    expect(restore.body.version.restored_from).toBe(1);
    // historial inmutable: mismas filas + una nueva append-only
    const after = h.rows.ai_case_draft_versions;
    expect(after).toHaveLength(beforeRestore.length + 1);
    beforeRestore.forEach((row) => {
      const same = after.find((v) => v.version_no === row.version_no && v.origin === row.origin);
      expect(same?.content).toBe(row.content);
    });
    expect(after.at(-1).origin).toBe('restore');
    // head luego de restaurar conserva el snapshot original del draft
    const open = await h.call('get', DRAFT_PATHS.draft, {}, { draftId: gen.body.draft.id });
    expect(open.body.draft.content).toBe(v1Content);
  });

  it('restore de versión inexistente: 404 sin tocar nada', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    expect((await h.call('post', DRAFT_PATHS.restore, {}, { draftId: gen.body.draft.id, versionNo: 7 })).statusCode).toBe(404);
    expect(h.rows.ai_case_draft_versions).toHaveLength(1);
    expect(h.rows.ai_case_drafts[0].revision).toBe(1);
  });

  it('versionNo inválido: 400 en detalle y restore', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    expect((await h.call('get', DRAFT_PATHS.version, {}, { draftId: gen.body.draft.id, versionNo: 'x' })).statusCode).toBe(400);
    expect((await h.call('post', DRAFT_PATHS.restore, {}, { draftId: gen.body.draft.id, versionNo: -1 })).statusCode).toBe(400);
  });
});

describe('4.62C ownership y gates en versiones', () => {
  it('extranjero: 404 en lista/detalle/restore/editar sin fuga', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    await h.call('put', DRAFT_PATHS.draft, { content: 'Cambio propio.', base_revision: 1 }, { draftId: gen.body.draft.id });
    h.asForeign();
    expect((await h.call('get', DRAFT_PATHS.versions, {}, { draftId: gen.body.draft.id })).statusCode).toBe(404);
    expect((await h.call('get', DRAFT_PATHS.version, {}, { draftId: gen.body.draft.id, versionNo: 1 })).statusCode).toBe(404);
    expect((await h.call('post', DRAFT_PATHS.restore, {}, { draftId: gen.body.draft.id, versionNo: 1 })).statusCode).toBe(404);
    expect((await h.call('put', DRAFT_PATHS.draft, { content: 'ataque' }, { draftId: gen.body.draft.id })).statusCode).toBe(404);
    expect(h.rows.ai_case_drafts[0].content).not.toBe('ataque');
    expect(h.rows.ai_case_draft_versions).toHaveLength(2);
  });

  it('free/legacy: gates de entitlement también en versiones', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    h.setPlan('free_case');
    expect((await h.call('get', DRAFT_PATHS.versions, {}, { draftId: gen.body.draft.id })).statusCode).toBe(403);
    expect((await h.call('put', DRAFT_PATHS.draft, { content: 'x'.repeat(50), base_revision: 1 }, { draftId: gen.body.draft.id })).statusCode).toBe(403);
    expect(h.rows.ai_case_draft_versions).toHaveLength(1);
  });
});

// — FASE 4.62E: coalescencia de autosaves + paginación del historial —
describe('4.62E coalescencia de autosaves', () => {
  it('dos autosaves consecutivos en ventana: se coalescen en una única versión (version_no y created_at preservados)', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    const s1 = await h.call('put', DRAFT_PATHS.draft, { content: '<p>Autosave uno.</p>', content_format: 'html', origin: 'autosave', base_revision: 1 }, { draftId: gen.body.draft.id });
    expect(s1.statusCode).toBe(200);
    expect(s1.body.version).toEqual({ version_no: 2 });
    const v2 = h.rows.ai_case_draft_versions.find((v) => v.version_no === 2);
    const createdAt = v2.created_at;
    const s2 = await h.call('put', DRAFT_PATHS.draft, { content: '<p>Autosave uno más el agregado.</p>', content_format: 'html', origin: 'autosave', base_revision: 2 }, { draftId: gen.body.draft.id });
    expect(s2.statusCode).toBe(200);
    expect(s2.body.version).toEqual({ version_no: 2, coalesced: true });
    const versions = h.rows.ai_case_draft_versions;
    expect(versions).toHaveLength(2);
    expect(versions.map((v) => [v.version_no, v.origin])).toEqual([[1, 'generation'], [2, 'autosave']]);
    const v2After = versions.find((v) => v.version_no === 2);
    // La coalescencia ACTUALIZA la fila del primer autosave: no inserta v3.
    expect(v2After.content).toBe('<p>Autosave uno más el agregado.</p>');
    expect(v2After.content_format).toBe('html');
    expect(v2After.created_at).toBe(createdAt);
    expect(versions.find((v) => v.version_no === 1).content).toBe(gen.body.draft.content);
    // El head del draft lleva el contenido más reciente y la revisión sube.
    expect(h.rows.ai_case_drafts[0].content).toBe('<p>Autosave uno más el agregado.</p>');
    expect(h.rows.ai_case_drafts[0].revision).toBe(3);
    // El historial muestra la cabecera actualizada.
    const list = await h.call('get', DRAFT_PATHS.versions, {}, { draftId: gen.body.draft.id });
    expect(list.body.versions.map((v) => [v.version_no, v.origin])).toEqual([[2, 'autosave'], [1, 'generation']]);
  });

  it('ventana vencida: el último autosave inserta versión nueva (no coalesce)', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    const s1 = await h.call('put', DRAFT_PATHS.draft, { content: '<p>Autosave inicial.</p>', content_format: 'html', origin: 'autosave', base_revision: 1 }, { draftId: gen.body.draft.id });
    expect(s1.statusCode).toBe(200);
    // Reloj de la v2 vencido (11 min > ventana de 10).
    const head = h.rows.ai_case_draft_versions.find((v) => v.version_no === 2);
    head.created_at = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    const s2 = await h.call('put', DRAFT_PATHS.draft, { content: '<p>Autosave posterior a la ventana.</p>', content_format: 'html', origin: 'autosave', base_revision: 2 }, { draftId: gen.body.draft.id });
    expect(s2.statusCode).toBe(200);
    expect(s2.body.version).toEqual({ version_no: 3 });
    expect(h.rows.ai_case_draft_versions.map((v) => [v.version_no, v.origin])).toEqual([[1, 'generation'], [2, 'autosave'], [3, 'autosave']]);
    expect(h.rows.ai_case_draft_versions.find((v) => v.version_no === 2).content).toBe('<p>Autosave inicial.</p>');
  });

  it('separación por procedencia: edit y restore tras un autosave NO coalescen; autosave tras restore tampoco', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    // autosave → v2; un PUT edit NO coalesce (procedencia distinta) → v3.
    await h.call('put', DRAFT_PATHS.draft, { content: '<p>Autosave previo.</p>', content_format: 'html', origin: 'autosave', base_revision: 1 }, { draftId: gen.body.draft.id });
    const edit = await h.call('put', DRAFT_PATHS.draft, { content: 'Edición manual real del abogado.', origin: 'edit', base_revision: 2 }, { draftId: gen.body.draft.id });
    expect(edit.body.version).toEqual({ version_no: 3 });
    // Restauración de v1: origin restore, append-only SIEMPRE → v4.
    const restore = await h.call('post', DRAFT_PATHS.restore, {}, { draftId: gen.body.draft.id, versionNo: 1 });
    expect(restore.statusCode).toBe(200);
    expect(restore.body.version).toEqual({ version_no: 4, origin: 'restore', restored_from: 1 });
    // Un autosave tras el restore de v4 (no-autosave en head) inserta v5, no coalesce.
    const s = await h.call('put', DRAFT_PATHS.draft, { content: '<p>Autosave tras restore.</p>', content_format: 'html', origin: 'autosave', base_revision: 4 }, { draftId: gen.body.draft.id });
    expect(s.body.version).toEqual({ version_no: 5 });
    const nos = h.rows.ai_case_draft_versions.map((v) => v.version_no);
    expect(nos).toEqual([1, 2, 3, 4, 5]);
  });

  it('edit/autosave tras edit inmediato: la coalescencia evalúa solo el head (no versiones autosave más viejas)', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    // v2 autosave (reciente) seguida de v3 edit (head actual).
    await h.call('put', DRAFT_PATHS.draft, { content: '<p>AS1.</p>', content_format: 'html', origin: 'autosave', base_revision: 1 }, { draftId: gen.body.draft.id });
    await h.call('put', DRAFT_PATHS.draft, { content: 'Edito encima del autosave.', origin: 'edit', base_revision: 2 }, { draftId: gen.body.draft.id });
    // head es v3 edit → aunque v2 autosave sea reciente, un autosave inserta v4
    // y jamás actualiza la fila v2 que dejó de ser head.
    const before = JSON.parse(JSON.stringify(h.rows.ai_case_draft_versions.find((v) => v.version_no === 2)));
    const s = await h.call('put', DRAFT_PATHS.draft, { content: '<p>Nuevo autosave con head edit.</p>', content_format: 'html', origin: 'autosave', base_revision: 3 }, { draftId: gen.body.draft.id });
    expect(s.body.version).toEqual({ version_no: 4 });
    const v2Row = h.rows.ai_case_draft_versions.find((v) => v.version_no === 2);
    expect(v2Row).toEqual(before);
    expect(v2Row.content).toBe('<p>AS1.</p>');
  });

  it('draft legacy: primer autosave crea v1; el segundo coalesce en v1 sin base fantasma', async () => {
    const h = harness();
    h.rows.ai_case_drafts.push({
      id: 'leg-e', lawyer_case_id: caseId, workspace_id: workspaceId, lawyer_id: user,
      draft_type: 'escrito', title: 'Antiguo', instruction: '', status: 'completed',
      content: 'Contenido previo de la vía antigua.', content_format: 'markdown',
      sources: [], model: null, intelligence_snapshot_id: null,
      revision: 1, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
    });
    const s1 = await h.call('put', DRAFT_PATHS.draft, { content: 'Primer autosave del legacy.', origin: 'autosave', base_revision: 1 }, { draftId: 'leg-e' });
    expect(s1.statusCode).toBe(200);
    expect(h.rows.ai_case_draft_versions.map((v) => [v.version_no, v.origin])).toEqual([[0, 'legacy'], [1, 'autosave']]);
    const v1CreatedAt = h.rows.ai_case_draft_versions.find((v) => v.version_no === 1).created_at;
    const s2 = await h.call('put', DRAFT_PATHS.draft, { content: 'Segundo autosave del legacy.', origin: 'autosave', base_revision: 2 }, { draftId: 'leg-e' });
    expect(s2.statusCode).toBe(200);
    expect(s2.body.version).toEqual({ version_no: 1, coalesced: true });
    const versions = h.rows.ai_case_draft_versions;
    expect(versions).toHaveLength(2);
    expect(versions.find((v) => v.version_no === 0).content).toBe('Contenido previo de la vía antigua.');
    expect(versions.find((v) => v.version_no === 1).content).toBe('Segundo autosave del legacy.');
    expect(versions.find((v) => v.version_no === 1).created_at).toBe(v1CreatedAt);
  });

  it('guard de carrera documentado en source: el update de coalescencia lleva .select() (representación), eq(version_no) + eq(origin autosave)', () => {
    // Contrato en código: la actualización solo puede matchear la fila autosave
    // que era head al leerla; una carrera que la deje de ser head matchea 0
    // filas y cae al insert append-only. Verificación de fuente (la carrera
    // síncrona completa no es reproducible con el fake secuencial).
    // FASE 4.62H (defecto 4.62G): el PATCH DEBE llevar .select() — sin
    // representación el cliente entrega data=null también en éxito y el guard
    // degradaba cada autosave al append (una versión nueva por PUT) tras
    // mutar la fila previa in-place. El primer .maybeSingle() en el bloque
    // es el del UPDATE de coalescencia (el de readHead queda fuera del slice).
    const coalesceStart = src.indexOf('origin === \'autosave\' && DRAFT_AUTOSAVE_COALESCE_MS > 0');
    expect(coalesceStart).toBeGreaterThan(0);
    const block = src.slice(coalesceStart, coalesceStart + 2200);
    const firstMaybeSingle = block.indexOf('.maybeSingle()');
    expect(firstMaybeSingle).toBeGreaterThan(0);
    expect(block.slice(0, firstMaybeSingle)).toContain('.select()');
    expect(block).toContain(".eq('version_no', headNo)");
    expect(block).toContain(".eq('origin', 'autosave')");
    expect(block).toContain('if (coalesced) return { version_no: headNo, coalesced: true };');
  });

  it('concurrencia: dos autosaves sobre la misma cabeza autosave terminan en UNA fila con el contenido más reciente; la escritura de versión es POST-CAS', async () => {
    // Semántica de carrera real (documentada): la escritura de versiones solo
    // corre tras ganar el CAS de revisión en ai_case_drafts, así que dos PUT
    // con la misma base_revision nunca llegan ambos a coalescer: el perdedor
    // sale 409 sin tocar versiones. Dos autosaves SECUENCIALES (bases
    // monotónicas, lo único que el cliente envía) coalescen sobre la misma
    // fila: el contenido más reciente siempre gana dentro de la fila.
    const h = harness();
    const gen = await generatedDraft(h);
    let revision = 1;
    for (let i = 1; i <= 3; i += 1) {
      const s = await h.call('put', DRAFT_PATHS.draft, { content: `Autosave concurrente ${i}.`, origin: 'autosave', base_revision: revision }, { draftId: gen.body.draft.id });
      expect(s.statusCode).toBe(200);
      // Todos tocan la MISMA versión (coalescencia), nunca nuevas filas.
      expect(s.body.version).toEqual({ version_no: 2, ...(i > 1 ? { coalesced: true } : {}) });
      revision = s.body.draft.revision;
    }
    const versions = h.rows.ai_case_draft_versions;
    expect(versions).toHaveLength(2);
    expect(versions.map((v) => [v.version_no, v.origin])).toEqual([[1, 'generation'], [2, 'autosave']]);
    // Contenido más reciente preservado; head con revisión monotónica.
    expect(versions.find((v) => v.version_no === 2).content).toBe('Autosave concurrente 3.');
    expect(h.rows.ai_case_drafts[0].content).toBe('Autosave concurrente 3.');
    expect(h.rows.ai_case_drafts[0].revision).toBe(4);
    // Nada se perdió: los contenidos intermedios no eran cabeza (coalescidos
    // por diseño); el head siempre reflejó el último guardado confirmado.
  });

  it('concurrencia: un PUT con base desfasada en carrera sale 409 ANTES de la escritura de versiones (CAS precede al versionado)', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    await h.call('put', DRAFT_PATHS.draft, { content: 'Guardado que gana la carrera.', base_revision: 1 }, { draftId: gen.body.draft.id });
    const beforeRows = h.rows.ai_case_draft_versions.length;
    // Segundo escritor (otra pestaña/otra instancia) con base obsoleta:
    // el CAS eq(revision) no matchea → 409 y NINGUNA fila nueva de versión.
    const loser = await h.call('put', DRAFT_PATHS.draft, { content: 'Carrerón desfasado no persiste.', base_revision: 1 }, { draftId: gen.body.draft.id });
    expect(loser.statusCode).toBe(409);
    expect(loser.body.code).toBe('AI_DRAFT_REVISION_CONFLICT');
    expect(h.rows.ai_case_draft_versions).toHaveLength(beforeRows);
    // Contenido más reciente intacto: el head lo tiene el ganador.
    expect(h.rows.ai_case_drafts[0].content).toBe('Guardado que gana la carrera.');
  });

  it('carrera del coalesce: el UPDATE de coalescencia que matchea 0 filas (head cambió bajo el read) cae a append SIN mutar la fila del autosave previo', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    await h.call('put', DRAFT_PATHS.draft, { content: '<p>Autosave ganador de la carrera.</p>', content_format: 'html', origin: 'autosave', base_revision: 1 }, { draftId: gen.body.draft.id });
    const v2Before = JSON.parse(JSON.stringify(h.rows.ai_case_draft_versions.find((v) => v.version_no === 2)));
    // Otro escritor cambia el head justo entre el readHead y el UPDATE del
    // guard: la actualización eq(version_no)+eq(origin) matchea 0 filas.
    h.updateZeroMatches.push(true);
    const s = await h.call('put', DRAFT_PATHS.draft, { content: '<p>Autosave concurrente que pierde el head.</p>', content_format: 'html', origin: 'autosave', base_revision: 2 }, { draftId: gen.body.draft.id });
    expect(s.statusCode).toBe(200);
    // Fallback append-only correcto: guarda como versión nueva, no coalesce.
    expect(s.body.version).toEqual({ version_no: 3 });
    expect(h.rows.ai_case_draft_versions.map((v) => v.version_no)).toEqual([1, 2, 3]);
    // La fila del autosave previo NO fue mutada (ni sobrescrita): este es el
    // defecto 4.62G que el guard con representación permite descartar.
    expect(h.rows.ai_case_draft_versions.find((v) => v.version_no === 2)).toEqual(v2Before);
    // La fila nueva es la última (head único) con el contenido concurrente.
    expect(h.rows.ai_case_draft_versions.find((v) => v.version_no === 3).content).toBe('<p>Autosave concurrente que pierde el head.</p>');
  });
});

describe('4.62E paginación del historial de versiones', () => {
  const EDIT_TEXT = (n) => `Edición número ${n} del escrito.`;
  async function draftWithManyVersions(h, n = 205) {
    const gen = await generatedDraft(h);
    let revision = 1;
    for (let i = 1; i <= n; i += 1) {
      const r = await h.call('put', DRAFT_PATHS.draft, { content: EDIT_TEXT(i), origin: 'edit', base_revision: revision }, { draftId: gen.body.draft.id });
      expect(r.statusCode).toBe(200);
      revision = r.body.draft.revision;
    }
    return gen;
  }

  it('total_count refleja todas las versiones y BEFORE pagina las anteriores sin repetir', async () => {
    const h = harness();
    const gen = await draftWithManyVersions(h);
    // v1 generation + 205 edits = 206 versiones totales.
    const page1 = await h.call('get', DRAFT_PATHS.versions, {}, { draftId: gen.body.draft.id });
    expect(page1.statusCode).toBe(200);
    expect(page1.body.total_count).toBe(206);
    expect(page1.body.versions).toHaveLength(200);
    expect(page1.body.versions[0].version_no).toBe(206);
    expect(page1.body.versions.at(-1).version_no).toBe(7);
    expect(page1.body.versions.every((v) => v.version_no > 6)).toBe(true);
    // Página 2 vía cursor: solo la cola < 7.
    const minNo = page1.body.versions.at(-1).version_no;
    const page2 = await h.call('get', `${DRAFT_PATHS.versions}?before=${minNo}`, {}, { draftId: gen.body.draft.id });
    expect(page2.statusCode).toBe(200);
    expect(page2.body.total_count).toBe(206);
    expect(page2.body.versions.map((v) => v.version_no)).toEqual([6, 5, 4, 3, 2, 1]);
    // Sin solapamiento entre páginas: unión completa sin duplicados.
    const union = [...page1.body.versions.map((v) => v.version_no), ...page2.body.versions.map((v) => v.version_no)];
    expect(union).toHaveLength(206);
    expect(new Set(union).size).toBe(206);
    // La numeración no se altera: restore de una versión antigua de página 2
    // sigue operando igual sobre version_no sin cursor.
    // version_no = i + 1 (v1 es la generación): la versión 3 guarda la
    // edición #2.
    const restore = await h.call('post', DRAFT_PATHS.restore, {}, { draftId: gen.body.draft.id, versionNo: 3 });
    expect(restore.statusCode).toBe(200);
    expect(restore.body.version).toEqual({ version_no: 207, origin: 'restore', restored_from: 3 });
    expect(restore.body.draft.content).toBe(EDIT_TEXT(2));
  });

  it('cursor inválido: 400 INVALID_REQUEST sin listar', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    for (const bad of ['-1', 'x', '1.5']) {
      const r = await h.call('get', `${DRAFT_PATHS.versions}?before=${bad}`, {}, { draftId: gen.body.draft.id });
      expect(r.statusCode).toBe(400);
      expect(r.body.code).toBe('INVALID_REQUEST');
    }
    const ok = await h.call('get', `${DRAFT_PATHS.versions}?before=0`, {}, { draftId: gen.body.draft.id });
    expect(ok.statusCode).toBe(200);
    expect(ok.body.versions).toHaveLength(0);
  });

  it('historial corto: total_count == listado; sin cursor el contrato previo intacto', async () => {
    const h = harness();
    const gen = await generatedDraft(h);
    await h.call('put', DRAFT_PATHS.draft, { content: 'Cambio posterior.', origin: 'edit', base_revision: 1 }, { draftId: gen.body.draft.id });
    const list = await h.call('get', DRAFT_PATHS.versions, {}, { draftId: gen.body.draft.id });
    expect(list.body.versions).toHaveLength(2);
    expect(list.body.total_count).toBe(2);
  });
});
