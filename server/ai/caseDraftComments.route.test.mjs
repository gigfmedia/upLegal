// @vitest-environment node
// UA-5.2 — comentarios anclados: CRUD por ruta, ownership, límites y garantía
// de que los comentarios no mutan el borrador ni crean versiones.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import {
  DraftCommentCreateSchema,
  DraftCommentUpdateSchema,
  DRAFT_COMMENT_LIMITS,
} from './draftAgentActions.mjs';

const src = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const user = id(1), foreign = id(2), caseId = id(3), workspaceId = id(4), draftId = id(5), commentId = id(6);

function harness() {
  let tokenUser = user;
  let nextInsertError = null;
  let nextUpdateError = null;
  const rows = {
    ai_case_drafts: [{
      id: draftId, lawyer_id: user, lawyer_case_id: caseId, workspace_id: workspaceId,
      revision: 3, title: 'Borrador QA', content: '<p>Hola mundo</p>', content_format: 'html',
      created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z',
    }],
    ai_case_drafts_versions: [],
    ai_case_draft_comments: [],
  };
  const supabase = { from(table) {
    let action = 'select', payload, limit = Infinity, filters = [], orderKey = null, orderAsc = true;
    const run = (single = false) => {
      const list = rows[table] ?? (rows[table] = []);
      let found = list.filter((r) => filters.every((f) => f(r)));
      if (orderKey) found = [...found].sort((a, b) => String(a[orderKey] ?? '').localeCompare(String(b[orderKey] ?? '')));
      if (!orderAsc) found = [...found].reverse();
      found = found.slice(0, limit);
      if (action === 'insert') {
        if (nextInsertError) {
          const error = nextInsertError;
          nextInsertError = null;
          return { data: null, error };
        }
        const values = (Array.isArray(payload) ? payload : [payload]).map((p) => ({
          id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...p,
        }));
        list.push(...values); found = values;
      }
      if (action === 'update') {
        if (nextUpdateError) {
          const error = nextUpdateError;
          nextUpdateError = null;
          return { data: null, error };
        }
        found.forEach((r) => Object.assign(r, payload));
      }
      if (action === 'delete') {
        const removed = new Set(found.map((r) => r.id));
        rows[table] = list.filter((r) => !removed.has(r.id));
        found = [];
      }
      return { data: single ? ((found[0] && { ...found[0] }) || null) : found.map((r) => ({ ...r })), error: null };
    };
    const q = { select: () => q,
      eq: (k, v) => { filters.push((r) => r[k] === v); return q; },
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
  const ctx = vm.createContext({
    console: { log() {}, warn() {}, error() {} }, z, Buffer, supabase,
    DraftCommentCreateSchema, DraftCommentUpdateSchema, DRAFT_COMMENT_LIMITS,
    app: {
      get: (p, h) => { routes[`get ${p}`] = h; },
      post: (p, h) => { routes[`post ${p}`] = h; },
      patch: (p, h) => { routes[`patch ${p}`] = h; },
      delete: (p, h) => { routes[`delete ${p}`] = h; },
    },
    getUserIdFromToken: async () => tokenUser,
    requireAILawyer: async (_req, res) => { if (!tokenUser) { res.status(401).json({ error: 'x' }); return null; } return tokenUser; },
    requireAIEntitlement: async () => ({ plan: 'pro', res: null }),
    getAIWorkspaceOwned: async (workspace, lawyer) => (
      workspace === workspaceId && lawyer === tokenUser
        ? { id: workspaceId, lawyer_id: user, name: 'Caso QA' }
        : null
    ),
  });
  const names = new Set([
    'getDraftCommentContextOwned', 'draftCommentLimitPayload', 'isDraftCommentLimitError',
  ]);
  const paths = new Set([
    '/api/ai/cases/:caseId/drafts/:draftId/comments',
    '/api/ai/cases/:caseId/drafts/:draftId/comments/:commentId',
  ]);
  for (const n of ast.statements) {
    if (ts.isFunctionDeclaration(n) && names.has(n.name?.getText(ast))) vm.runInContext(n.getText(ast), ctx);
    if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
      paths.has(n.expression.arguments[0]?.text)) vm.runInContext(n.getText(ast), ctx);
  }
  async function call(method, path, body = {}, extraParams = {}) {
    const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } };
    await routes[`${method} ${path}`]({
      headers: { authorization: 'Bearer f' },
      params: { caseId: workspaceId, draftId, ...extraParams },
      body,
    }, res);
    return res;
  }
  return {
    rows,
    call,
    asForeign: () => { tokenUser = foreign; },
    failNextInsert: (error) => { nextInsertError = error; },
    failNextUpdate: (error) => { nextUpdateError = error; },
  };
}

const anchor = { quote: 'mundo', prefix: 'Hola ', suffix: '', start_hint: 6, end_hint: 11 };
const commentsPath = '/api/ai/cases/:caseId/drafts/:draftId/comments';
const commentPath = '/api/ai/cases/:caseId/drafts/:draftId/comments/:commentId';

describe('UA-5.2 comentarios de borrador — rutas', () => {
  it('crea, lista y no toca el head ni crea versiones', async () => {
    const h = harness();
    const beforeRevision = h.rows.ai_case_drafts[0].revision;
    const created = await h.call('post', commentsPath, { body: 'Aclara el plazo.', anchor });
    expect(created.statusCode).toBe(201);
    expect(created.body.comment.body).toBe('Aclara el plazo.');
    expect(created.body.comment.status).toBe('open');
    expect(created.body.comment.author).toBe('lawyer');
    expect(created.body.comment.anchor).toEqual(anchor);

    const listed = await h.call('get', commentsPath);
    expect(listed.statusCode).toBe(200);
    expect(listed.body.comments).toHaveLength(1);
    expect(h.rows.ai_case_drafts[0].revision).toBe(beforeRevision);
    expect(h.rows.ai_case_drafts_versions).toHaveLength(0);
  });

  it('conserva el quote literal y admite autoría IA explícita', async () => {
    const h = harness();
    const spacedAnchor = { quote: ' mundo ', prefix: 'Hola', suffix: ' cruel', start_hint: 1, end_hint: 8 };
    const created = await h.call('post', commentsPath, { body: 'Comentario IA', anchor: spacedAnchor, author: 'ai' });
    expect(created.statusCode).toBe(201);
    expect(created.body.comment.anchor).toEqual(spacedAnchor);
    expect(created.body.comment.anchor.quote).toBe(' mundo ');
    expect(created.body.comment.author).toBe('ai');

    const invalid = await h.call('post', commentsPath, { body: 'Comentario', anchor, author: 'system' });
    expect(invalid.statusCode).toBe(400);
  });

  it('valida body, anchor y unicidad de ownership', async () => {
    const h = harness();
    expect((await h.call('post', commentsPath, { body: '   ', anchor })).statusCode).toBe(400);
    expect((await h.call('post', commentsPath, { body: 'ok', anchor: { quote: '' } })).statusCode).toBe(400);
    expect((await h.call('post', commentsPath, {
      body: 'x'.repeat(DRAFT_COMMENT_LIMITS.maxBodyChars + 1), anchor,
    })).statusCode).toBe(400);

    h.asForeign();
    const foreignCreate = await h.call('post', commentsPath, { body: 'Ajeno', anchor });
    expect(foreignCreate.statusCode).toBe(404);
    expect(h.rows.ai_case_draft_comments).toHaveLength(0);
  });

  it('limita solo comentarios abiertos y libera cupo al resolver o descartar', async () => {
    const h = harness();
    h.rows.ai_case_draft_comments = Array.from({ length: DRAFT_COMMENT_LIMITS.maxPerDraft }, (_, i) => ({
      id: id(100 + i), draft_id: draftId, lawyer_id: user, lawyer_case_id: caseId,
      workspace_id: workspaceId, body: `c${i}`, status: 'open', anchor,
    }));

    const blocked = await h.call('post', commentsPath, { body: 'Uno más', anchor });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body.code).toBe('AI_DRAFT_COMMENT_LIMIT_REACHED');
    expect(blocked.body.error).toContain('comentarios abiertos');

    const resolved = await h.call('patch', commentPath, { status: 'resolved' }, { commentId: id(100) });
    expect(resolved.statusCode).toBe(200);
    const afterResolve = await h.call('post', commentsPath, { body: 'Tras resolver', anchor });
    expect(afterResolve.statusCode).toBe(201);

    const dismissed = await h.call('patch', commentPath, { status: 'dismissed' }, { commentId: afterResolve.body.comment.id });
    expect(dismissed.statusCode).toBe(200);
    const afterDismiss = await h.call('post', commentsPath, { body: 'Tras descartar', anchor });
    expect(afterDismiss.statusCode).toBe(201);
  });

  it('mapea el rechazo atómico del trigger con el mismo 429', async () => {
    const h = harness();
    h.rows.ai_case_draft_comments = Array.from({ length: DRAFT_COMMENT_LIMITS.maxPerDraft - 1 }, (_, i) => ({
      id: id(500 + i), draft_id: draftId, lawyer_id: user, lawyer_case_id: caseId,
      workspace_id: workspaceId, body: `c${i}`, status: 'open', anchor,
    }));
    h.failNextInsert({ code: 'P0001', message: 'AI_DRAFT_COMMENT_LIMIT_REACHED' });
    const blocked = await h.call('post', commentsPath, { body: 'Carrera perdida', anchor });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body.code).toBe('AI_DRAFT_COMMENT_LIMIT_REACHED');
    expect(blocked.body.error).toContain('comentarios abiertos');
    expect(h.rows.ai_case_draft_comments).toHaveLength(DRAFT_COMMENT_LIMITS.maxPerDraft - 1);

    h.rows.ai_case_draft_comments.push({
      id: id(700), draft_id: draftId, lawyer_id: user, lawyer_case_id: caseId,
      workspace_id: workspaceId, body: 'cerrado', status: 'resolved', anchor,
    });
    h.failNextUpdate({ code: 'P0001', message: 'AI_DRAFT_COMMENT_LIMIT_REACHED' });
    const reopen = await h.call('patch', commentPath, { status: 'open' }, { commentId: id(700) });
    expect(reopen.statusCode).toBe(429);
    expect(reopen.body.code).toBe('AI_DRAFT_COMMENT_LIMIT_REACHED');
    expect(h.rows.ai_case_draft_comments.find((c) => c.id === id(700)).status).toBe('resolved');
  });

  it('los comentarios cerrados no consumen el cupo de 100 abiertos', async () => {
    const h = harness();
    h.rows.ai_case_draft_comments = [
      ...Array.from({ length: DRAFT_COMMENT_LIMITS.maxPerDraft - 1 }, (_, i) => ({
        id: id(200 + i), draft_id: draftId, lawyer_id: user, lawyer_case_id: caseId,
        workspace_id: workspaceId, body: `c${i}`, status: 'open', anchor,
      })),
      { id: id(400), draft_id: draftId, lawyer_id: user, lawyer_case_id: caseId, workspace_id: workspaceId, body: 'r', status: 'resolved', anchor },
      { id: id(401), draft_id: draftId, lawyer_id: user, lawyer_case_id: caseId, workspace_id: workspaceId, body: 'd', status: 'dismissed', anchor },
    ];
    const res = await h.call('post', commentsPath, { body: 'Cupo disponible', anchor });
    expect(res.statusCode).toBe(201);
  });

  it('resuelve, reabre, reancla y elimina sin tocar el borrador', async () => {
    const h = harness();
    const created = await h.call('post', commentsPath, { body: 'Comentario', anchor });
    const idComment = created.body.comment.id;
    const beforeRevision = h.rows.ai_case_drafts[0].revision;

    const resolved = await h.call('patch', commentPath, { status: 'resolved' }, { commentId: idComment });
    expect(resolved.statusCode).toBe(200);
    expect(resolved.body.comment.status).toBe('resolved');
    expect(resolved.body.comment.resolved_at).toBeTruthy();

    const reopened = await h.call('patch', commentPath, { status: 'open' }, { commentId: idComment });
    expect(reopened.body.comment.status).toBe('open');
    expect(reopened.body.comment.resolved_at).toBeNull();

    const newAnchor = { quote: 'Hola', prefix: '', suffix: ' mundo', start_hint: 1, end_hint: 5 };
    const reanchored = await h.call('patch', commentPath, { anchor: newAnchor }, { commentId: idComment });
    expect(reanchored.body.comment.anchor).toEqual(newAnchor);

    const removed = await h.call('delete', commentPath, {}, { commentId: idComment });
    expect(removed.statusCode).toBe(200);
    expect(h.rows.ai_case_draft_comments).toHaveLength(0);
    expect(h.rows.ai_case_drafts[0].revision).toBe(beforeRevision);
    expect(h.rows.ai_case_drafts_versions).toHaveLength(0);
  });

  it('404 para comentario inexistente o de otro borrador', async () => {
    const h = harness();
    expect((await h.call('patch', commentPath, { body: 'x' }, { commentId: commentId })).statusCode).toBe(404);
    expect((await h.call('delete', commentPath, {}, { commentId: commentId })).statusCode).toBe(404);
  });

  it('la migración es aditiva y protege escrituras con RLS', () => {
    const migration = readFileSync(new URL('../../supabase/migrations/20261101000000_ai_case_draft_comments.sql', import.meta.url), 'utf8');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.ai_case_draft_comments');
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('ai_case_draft_comments_owner_select');
    expect(migration).toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE');
    expect(migration).toContain('ON DELETE CASCADE');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('enforce_ai_case_draft_comment_limit');
    expect(migration).toContain('BEFORE INSERT OR UPDATE OF status');
    expect(migration).toContain('AI_DRAFT_COMMENT_LIMIT_REACHED');
    expect(migration).toContain(`open_count >= ${DRAFT_COMMENT_LIMITS.maxPerDraft}`);
    expect(migration).not.toContain('anchor_revision');
    expect(migration).not.toMatch(/\b(UPDATE|DELETE FROM|INSERT INTO)\s+public\.ai_case_drafts\b/i);
  });

  it('mantiene el límite de selección alineado entre cliente y servidor', () => {
    const clientAnchor = readFileSync(
      new URL('../../src/components/legalup-ai/draftCommentAnchor.ts', import.meta.url),
      'utf8',
    );
    expect(clientAnchor).toContain(`DRAFT_COMMENT_MAX_QUOTE_CHARS = ${DRAFT_COMMENT_LIMITS.maxAnchorQuoteChars}`);
  });
});
