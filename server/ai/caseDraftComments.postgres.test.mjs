// @vitest-environment node
// UA-5.2 — límite atómico de comentarios abiertos ejercitando la migración real
// en PostgreSQL (PGlite). Las llamadas se lanzan en paralelo; PGlite serializa
// una única conexión, pero el trigger y el advisory lock son los de producción.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const lawyer = id(1), otherLawyer = id(2), caseId = id(3), workspace = id(4);
const draft = id(5), otherDraft = id(6);
const anchor = { quote: 'mundo', prefix: 'Hola ', suffix: '', start_hint: 6, end_hint: 11 };
const migration = readFileSync(
  new URL('../../supabase/migrations/20261101000000_ai_case_draft_comments.sql', import.meta.url),
  'utf8',
);

let pg;
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY);
    CREATE TABLE public.lawyer_cases(id uuid PRIMARY KEY, lawyer_id uuid);
    CREATE TABLE public.ai_workspaces(id uuid PRIMARY KEY, lawyer_id uuid);
    CREATE TABLE public.ai_case_drafts(
      id uuid PRIMARY KEY,
      lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      lawyer_case_id uuid NOT NULL REFERENCES public.lawyer_cases(id) ON DELETE CASCADE,
      workspace_id uuid NOT NULL REFERENCES public.ai_workspaces(id) ON DELETE CASCADE
    );
  `);
  await pg.exec(migration);
}, 30000);

afterAll(async () => { await pg?.close(); });

beforeEach(async () => {
  await pg.exec('TRUNCATE public.ai_case_draft_comments, public.ai_case_drafts, public.lawyer_cases, public.ai_workspaces, public.profiles CASCADE;');
  await pg.query('INSERT INTO public.profiles(id) VALUES ($1), ($2)', [lawyer, otherLawyer]);
  await pg.query('INSERT INTO public.lawyer_cases(id, lawyer_id) VALUES ($1, $2)', [caseId, lawyer]);
  await pg.query('INSERT INTO public.ai_workspaces(id, lawyer_id) VALUES ($1, $2)', [workspace, lawyer]);
  await pg.query(
    'INSERT INTO public.ai_case_drafts(id, lawyer_id, lawyer_case_id, workspace_id) VALUES ($1, $2, $3, $4), ($5, $2, $3, $4)',
    [draft, lawyer, caseId, workspace, otherDraft],
  );
});

async function insertComment(body, { draftId = draft, status = 'open', lawyerId = lawyer } = {}) {
  return pg.query(
    `INSERT INTO public.ai_case_draft_comments
      (draft_id, lawyer_id, lawyer_case_id, workspace_id, body, status, anchor)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id`,
    [draftId, lawyerId, caseId, workspace, body, status, JSON.stringify(anchor)],
  );
}

async function openCount(draftId = draft) {
  const result = await pg.query(
    'SELECT count(*)::int AS n FROM public.ai_case_draft_comments WHERE draft_id = $1 AND status = $2',
    [draftId, 'open'],
  );
  return result.rows[0].n;
}

describe('UA-5.2 límite atómico en PostgreSQL', () => {
  it('120 inserciones simultáneas dejan exactamente 100 abiertas', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 120 }, (_, i) => insertComment(`concurrente-${i}`)),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(100);
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(rejected).toHaveLength(20);
    for (const result of rejected) {
      expect(String(result.reason)).toContain('AI_DRAFT_COMMENT_LIMIT_REACHED');
    }
    expect(await openCount()).toBe(100);
  }, 30000);

  it('con 99 abiertas, varias carreras por el último cupo admiten solo una', async () => {
    for (let i = 0; i < 99; i += 1) await insertComment(`base-${i}`);
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) => insertComment(`carrera-${i}`)),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(4);
    expect(await openCount()).toBe(100);
  }, 30000);

  it('resolver y descartar liberan cupos; los cerrados no consumen', async () => {
    const inserted = [];
    for (let i = 0; i < 100; i += 1) inserted.push(await insertComment(`abierto-${i}`));
    const ids = inserted.map((result) => result.rows[0].id);
    await pg.query('UPDATE public.ai_case_draft_comments SET status = $1, resolved_at = now() WHERE id = $2', ['resolved', ids[0]]);
    await pg.query('UPDATE public.ai_case_draft_comments SET status = $1 WHERE id = $2', ['dismissed', ids[1]]);
    expect(await openCount()).toBe(98);

    const freed = await Promise.allSettled([insertComment('reemplazo-1'), insertComment('reemplazo-2')]);
    expect(freed.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
    expect(await openCount()).toBe(100);

    await expect(insertComment('sin-cupo')).rejects.toThrow('AI_DRAFT_COMMENT_LIMIT_REACHED');
  }, 30000);

  it('reabrir un cerrado respeta el tope y funciona al liberar un cupo', async () => {
    for (let i = 0; i < 100; i += 1) await insertComment(`abierto-${i}`);
    const closed = await insertComment('cerrado', { status: 'resolved' });

    await expect(
      pg.query('UPDATE public.ai_case_draft_comments SET status = $1 WHERE id = $2', ['open', closed.rows[0].id]),
    ).rejects.toThrow('AI_DRAFT_COMMENT_LIMIT_REACHED');

    const victim = await pg.query(
      "SELECT id FROM public.ai_case_draft_comments WHERE draft_id = $1 AND status = 'open' LIMIT 1",
      [draft],
    );
    await pg.query('UPDATE public.ai_case_draft_comments SET status = $1, resolved_at = now() WHERE id = $2', ['resolved', victim.rows[0].id]);
    await pg.query('UPDATE public.ai_case_draft_comments SET status = $1 WHERE id = $2', ['open', closed.rows[0].id]);
    expect(await openCount()).toBe(100);
  }, 30000);

  it('el lock es por borrador y no bloquea el cupo de otro borrador', async () => {
    for (let i = 0; i < 100; i += 1) await insertComment(`abierto-${i}`);
    await insertComment('otro borrador', { draftId: otherDraft });
    expect(await openCount(draft)).toBe(100);
    expect(await openCount(otherDraft)).toBe(1);

    const functionDef = await pg.query(
      "SELECT prosrc FROM pg_proc WHERE proname = 'enforce_ai_case_draft_comment_limit'",
    );
    expect(functionDef.rows[0].prosrc).toContain('pg_advisory_xact_lock');
    const trigger = await pg.query(
      "SELECT tgname FROM pg_trigger WHERE tgname = 'enforce_ai_case_draft_comment_limit' AND NOT tgisinternal",
    );
    expect(trigger.rows).toHaveLength(1);
  }, 30000);
});
