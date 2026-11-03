// @vitest-environment node
// UA-5.2 — concurrencia real contra PostgreSQL local efímero.
// Se salta salvo que UA52_POSTGRES_TEST_URL apunte a una base desechable.
// Nunca usa Supabase ni producción.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const url = process.env.UA52_POSTGRES_TEST_URL;
const psqlBin = process.env.PSQL_BIN || 'psql';
const migrationPath = fileURLToPath(new URL('../../supabase/migrations/20261101000000_ai_case_draft_comments.sql', import.meta.url));
const anchor = JSON.stringify({ quote: 'mundo', prefix: 'Hola ', suffix: '', start_hint: 6, end_hint: 11 });

async function sql(query) {
  const { stdout } = await exec(psqlBin, ['-X', '-v', 'ON_ERROR_STOP=1', '-Atq', '-d', url, '-c', query], { maxBuffer: 4 * 1024 * 1024 });
  return stdout.trim();
}
async function applyFile(path) {
  await exec(psqlBin, ['-X', '-v', 'ON_ERROR_STOP=1', '-Atq', '-d', url, '-f', path], { maxBuffer: 4 * 1024 * 1024 });
}
const insert = (body) => `INSERT INTO public.ai_case_draft_comments
  (draft_id, lawyer_id, lawyer_case_id, workspace_id, body, status, anchor)
  VALUES ('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001',
          '00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004',
          '${body}','open','${anchor}'::jsonb);`;

describe.skipIf(!url)('UA-5.2 concurrencia real PostgreSQL', { timeout: 60000 }, () => {
  beforeAll(async () => {
    await sql(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY);
      CREATE TABLE public.lawyer_cases(id uuid PRIMARY KEY, lawyer_id uuid);
      CREATE TABLE public.ai_workspaces(id uuid PRIMARY KEY, lawyer_id uuid);
      CREATE TABLE public.ai_case_drafts(
        id uuid PRIMARY KEY,
        lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        lawyer_case_id uuid NOT NULL REFERENCES public.lawyer_cases(id) ON DELETE CASCADE,
        workspace_id uuid NOT NULL REFERENCES public.ai_workspaces(id) ON DELETE CASCADE
      );
      INSERT INTO public.profiles VALUES ('00000000-0000-4000-8000-000000000001');
      INSERT INTO public.lawyer_cases VALUES ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001');
      INSERT INTO public.ai_workspaces VALUES ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001');
      INSERT INTO public.ai_case_drafts VALUES ('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004');
    `);
    await applyFile(migrationPath);
  }, 60000);

  afterAll(async () => {
    if (!url) return;
    await sql("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;").catch(() => {});
  });

  it('99 abiertas + 5 procesos concurrentes: solo una inserta, nunca hay 101', async () => {
    await sql("TRUNCATE public.ai_case_draft_comments;");
    await sql(`INSERT INTO public.ai_case_draft_comments
      (draft_id, lawyer_id, lawyer_case_id, workspace_id, body, status, anchor)
      SELECT '00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001',
             '00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004',
             'seed-' || g,'open','${anchor}'::jsonb FROM generate_series(1,99) g;`);
    const results = await Promise.allSettled(Array.from({ length: 5 }, (_, i) => sql(insert(`race-${i}`))));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(4);
    for (const result of results.filter((item) => item.status === 'rejected')) {
      expect(String(result.reason)).toContain('AI_DRAFT_COMMENT_LIMIT_REACHED');
    }
    expect(await sql("SELECT count(*) FROM public.ai_case_draft_comments WHERE status = 'open';")).toBe('100');
  });

  it('resolver un comentario libera exactamente un cupo bajo concurrencia', async () => {
    await sql("UPDATE public.ai_case_draft_comments SET status='resolved', resolved_at=now() WHERE id=(SELECT id FROM public.ai_case_draft_comments WHERE status='open' LIMIT 1);");
    const results = await Promise.allSettled([sql(insert('free-1')), sql(insert('free-2'))]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(await sql("SELECT count(*) FROM public.ai_case_draft_comments WHERE status = 'open';")).toBe('100');
  });
});
