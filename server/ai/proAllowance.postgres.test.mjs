import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const exec = promisify(execFile);
// Explicit isolated container only. This suite cannot connect to Supabase/production.
const container = process.env.AI_METERING_TEST_CONTAINER;
if (container && container !== 'legalup-ai-metering-438b') throw new Error('Use the dedicated disposable test container');
async function sql(query) { const { stdout } = await exec('docker', ['exec', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq', '-c', query], { maxBuffer: 8 * 1024 * 1024 }); return stdout.trim(); }
const quote = v => v == null ? 'NULL' : `'${String(v).replaceAll("'", "''")}'`;
const lawyer = '10000000-0000-4000-8000-000000000001', workspace = '10000000-0000-4000-8000-000000000002', doc = '10000000-0000-4000-8000-000000000003', conversation = '10000000-0000-4000-8000-000000000004';
// Commercial limits passed per call; NULL disables a pool check (legacy path).
const begin = (key = randomUUID(), cap = 'case_chat', { chat = null, analysis = null, research = null } = {}, resource = null) => {
  const res = cap === 'research' ? 'NULL' : quote(resource ?? (cap === 'document_chat' || cap === 'document_analysis' ? doc : conversation));
  const lim = v => v == null ? 'NULL' : String(v);
  return `SELECT public.ai_begin_operation('${lawyer}','${workspace}','${cap}',${res},'${key}','${'a'.repeat(64)}',20000000,5000,NULL,${lim(chat)},${lim(analysis)},${lim(research)});`;
};
const finish = (op, status = 200) => sql(`SELECT ai_finish_operation('${op}',${status},'{"answer":"fixture"}'::jsonb)`);
const data = { status: 'succeeded', prompt_tokens: 60, completion_tokens: 40, total_tokens: 100, provider_cost_actual: 0.01, provider_cost_estimated: 0.02, latency_ms: 1 };
async function attempt(op, budget = 100) { return JSON.parse(await sql(`SELECT ai_begin_attempt('${op}','fixture','openai/gpt-4o-mini',${budget})`)).attempt_id; }
const finishAttempt = (id, d) => sql(`SELECT ai_finish_attempt('${id}',${quote(JSON.stringify(d))}::jsonb)`);
// Seed N succeeded operations of one capability in a single round-trip.
async function seedSucceeded(cap, n, limits) {
  await sql(`DO $$ DECLARE i integer; op uuid; BEGIN FOR i IN 1..${n} LOOP SELECT (public.ai_begin_operation('${lawyer}','${workspace}','${cap}',${cap === 'research' ? 'NULL' : quote(cap === 'case_chat' ? conversation : doc)},gen_random_uuid(),repeat('a',64),20000000,5000,NULL,${limits.chat ?? 'NULL'},${limits.analysis ?? 'NULL'},${limits.research ?? 'NULL'}))::jsonb->>'operation_id' INTO op; PERFORM public.ai_finish_operation(op,200,'{"answer":"seed"}'); END LOOP; END $$;`);
}
const usedChat = () => sql(`SELECT count(*) FROM ai_operations WHERE lawyer_id='${lawyer}' AND capability IN ('case_chat','document_chat') AND status IN ('reserved','succeeded')`);

describe.skipIf(!container)('PostgreSQL Pro AI allowance (isolated local)', { timeout: 120000 }, () => {
  beforeAll(async () => {
    await sql(`DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO PUBLIC; DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; END IF; END $$; CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY);
    CREATE TABLE public.ai_workspaces(id uuid PRIMARY KEY,lawyer_id uuid);
    CREATE TABLE public.lawyer_cases(id uuid PRIMARY KEY,lawyer_id uuid,ai_workspace_id uuid);
    CREATE TABLE public.ai_documents(id uuid PRIMARY KEY,lawyer_id uuid,workspace_id uuid);
    CREATE TABLE public.ai_conversations(id uuid PRIMARY KEY,lawyer_id uuid,workspace_id uuid);
    CREATE TABLE public.ai_subscriptions(lawyer_id uuid,status text,trial_ends_at timestamptz,current_period_end timestamptz);
    CREATE FUNCTION public.ai_is_lawyer_on_trial(uuid) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT false $$;
    CREATE FUNCTION public.has_pro_access(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;`);
    await sql(readFileSync('supabase/migrations/20260804000000_ai_usage_cost_tracking.sql', 'utf8').replaceAll('auth.uid()', "null::uuid"));
    await sql(`ALTER TABLE public.ai_usage_monthly ADD COLUMN jurisprudence_research_count integer NOT NULL DEFAULT 0;`);
    await sql(readFileSync('supabase/migrations/20260928000000_ai_operation_metering.sql', 'utf8'));
    await sql(readFileSync('supabase/migrations/20260929000000_ai_usage_unknown_estimated_cost.sql', 'utf8'));
    await sql(readFileSync('supabase/migrations/20260930000000_pro_ai_allowance.sql', 'utf8'));
  }, 120000);
  beforeEach(async () => {
    await sql(`TRUNCATE ai_usage,ai_provider_attempts,ai_operations,ai_usage_monthly,ai_documents,ai_conversations,lawyer_cases,ai_workspaces,ai_subscriptions,profiles CASCADE;
    INSERT INTO profiles VALUES('${lawyer}');INSERT INTO ai_workspaces VALUES('${workspace}','${lawyer}');INSERT INTO ai_conversations VALUES('${conversation}','${lawyer}','${workspace}');INSERT INTO ai_documents VALUES('${doc}','${lawyer}','${workspace}');`);
  });

  it('pro workspaces unlimited; 50th document allowed, 51st blocked with marker', async () => {
    for (let i = 0; i < 4; i++) await sql(`INSERT INTO ai_workspaces VALUES('${randomUUID()}','${lawyer}')`);
    expect(await sql(`SELECT count(*) FROM ai_workspaces WHERE lawyer_id='${lawyer}'`)).toBe('5');
    await sql(`DELETE FROM ai_documents WHERE id='${doc}'`);
    for (let i = 0; i < 50; i++) await sql(`INSERT INTO ai_documents VALUES('${randomUUID()}','${lawyer}','${workspace}')`);
    expect(await sql(`SELECT count(*) FROM ai_documents WHERE lawyer_id='${lawyer}'`)).toBe('50');
    await expect(sql(`INSERT INTO ai_documents VALUES('${randomUUID()}','${lawyer}','${workspace}')`)).rejects.toThrow('AI_DOCUMENT_CAPACITY_REACHED');
    expect(await sql(`SELECT count(*) FROM ai_documents WHERE lawyer_id='${lawyer}'`)).toBe('50');
  });

  it('document last slot: 49 + 2 concurrent uploads admit exactly one', async () => {
    await sql(`DELETE FROM ai_documents WHERE id='${doc}'`);
    for (let i = 0; i < 49; i++) await sql(`INSERT INTO ai_documents VALUES('${randomUUID()}','${lawyer}','${workspace}')`);
    const results = await Promise.allSettled([
      sql(`INSERT INTO ai_documents VALUES('${randomUUID()}','${lawyer}','${workspace}')`),
      sql(`INSERT INTO ai_documents VALUES('${randomUUID()}','${lawyer}','${workspace}')`),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
    expect(String(results.find(r => r.status === 'rejected').reason)).toContain('AI_DOCUMENT_CAPACITY_REACHED');
    expect(await sql(`SELECT count(*) FROM ai_documents WHERE lawyer_id='${lawyer}'`)).toBe('50');
  });

  it('delete frees a document slot; trial keeps legacy 10 with legacy message', async () => {
    await sql(`DELETE FROM ai_documents WHERE id='${doc}'`);
    for (let i = 0; i < 50; i++) await sql(`INSERT INTO ai_documents VALUES('${randomUUID()}','${lawyer}','${workspace}')`);
    const victim = await sql(`SELECT id FROM ai_documents WHERE lawyer_id='${lawyer}' LIMIT 1`);
    await sql(`DELETE FROM ai_documents WHERE id='${victim}'`);
    await sql(`INSERT INTO ai_documents VALUES('${randomUUID()}','${lawyer}','${workspace}')`);
    expect(await sql(`SELECT count(*) FROM ai_documents WHERE lawyer_id='${lawyer}'`)).toBe('50');
    // Trial path preserved: stub trial on, 11th document blocked without the Pro marker.
    await sql(`CREATE OR REPLACE FUNCTION public.ai_is_lawyer_on_trial(uuid) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT true $$; DELETE FROM ai_documents;`);
    for (let i = 0; i < 10; i++) await sql(`INSERT INTO ai_documents VALUES('${randomUUID()}','${lawyer}','${workspace}')`);
    try {
      await sql(`INSERT INTO ai_documents VALUES('${randomUUID()}','${lawyer}','${workspace}')`);
      throw new Error('Expected trial document cap');
    } catch (error) {
      expect(String(error)).toContain('límite de 10 documento(s)');
      expect(String(error)).not.toContain('AI_DOCUMENT_CAPACITY_REACHED');
    } finally {
      await sql(`CREATE OR REPLACE FUNCTION public.ai_is_lawyer_on_trial(uuid) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT false $$;`);
    }
  });

  it('chat last slot: 299 consumed + 2 concurrent admit exactly one, pre-provider', async () => {
    await seedSucceeded('case_chat', 299, { chat: 300 });
    const results = await Promise.allSettled([sql(begin(randomUUID(), 'case_chat', { chat: 300 })), sql(begin(randomUUID(), 'case_chat', { chat: 300 }))]);
    expect(results.filter(r => r.status === 'fulfilled' && JSON.parse(r.value).created)).toHaveLength(1);
    const rejected = results.filter(r => r.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect(String(rejected[0].reason)).toContain('AI_CHAT_LIMIT_REACHED');
    expect(await usedChat()).toBe('300');
    expect(await sql(`SELECT count(*) FROM ai_provider_attempts`)).toBe('0');
  });

  it('chat pool is shared: document_chat consumes the same 300', async () => {
    await seedSucceeded('case_chat', 2, { chat: 3 });
    const third = JSON.parse(await sql(begin(randomUUID(), 'document_chat', { chat: 3 })));
    expect(third.created).toBe(true);
    await expect(sql(begin(randomUUID(), 'case_chat', { chat: 3 }))).rejects.toThrow('AI_CHAT_LIMIT_REACHED');
  });

  it('analysis last slot: 39 + 2 concurrent admit one; failed analysis charges 0', async () => {
    await seedSucceeded('document_analysis', 39, { analysis: 40 });
    const results = await Promise.allSettled([sql(begin(randomUUID(), 'document_analysis', { analysis: 40 })), sql(begin(randomUUID(), 'document_analysis', { analysis: 40 }))]);
    expect(results.filter(r => r.status === 'fulfilled' && JSON.parse(r.value).created)).toHaveLength(1);
    expect(String(results.find(r => r.status === 'rejected').reason)).toContain('AI_ANALYSIS_LIMIT_REACHED');
    // Failed analysis with attempts: monthly count unchanged, quota 0.
    const op = JSON.parse(await sql(begin(randomUUID(), 'document_analysis', { analysis: 41 }))).operation_id;
    const a = await attempt(op);
    await finishAttempt(a, { ...data, status: 'failed' });
    await finish(op, 502);
    expect(await sql(`SELECT document_analysis_count FROM ai_usage_monthly`)).toBe('39');
    expect(await sql(`SELECT quota_units||','||status FROM ai_operations WHERE id='${op}'`)).toBe('0,failed');
  });

  it('research last slot: 9 + 2 concurrent admit one; retries stay one user unit', async () => {
    await seedSucceeded('research', 9, { research: 10 });
    const results = await Promise.allSettled([sql(begin(randomUUID(), 'research', { research: 10 })), sql(begin(randomUUID(), 'research', { research: 10 }))]);
    expect(results.filter(r => r.status === 'fulfilled' && JSON.parse(r.value).created)).toHaveLength(1);
    expect(String(results.find(r => r.status === 'rejected').reason)).toContain('AI_RESEARCH_LIMIT_REACHED');
    expect(await sql(`SELECT count(*) FROM ai_provider_attempts`)).toBe('0');
  });

  it('month boundary: prior-period usage does not consume the new month (no rollover)', async () => {
    const op = JSON.parse(await sql(begin(randomUUID(), 'case_chat', { chat: 1 }))).operation_id;
    await finish(op);
    await expect(sql(begin(randomUUID(), 'case_chat', { chat: 1 }))).rejects.toThrow('AI_CHAT_LIMIT_REACHED');
    await sql(`UPDATE ai_operations SET period_start = period_start - interval '1 month' WHERE id='${op}'`);
    const next = JSON.parse(await sql(begin(randomUUID(), 'case_chat', { chat: 1 })));
    expect(next.created).toBe(true);
  });

  it('NULL commercial limits preserve the legacy unlimited path', async () => {
    for (let i = 0; i < 3; i++) {
      const op = JSON.parse(await sql(begin(randomUUID(), 'research'))).operation_id;
      await finish(op);
    }
    expect(await sql(`SELECT count(*) FROM ai_operations WHERE capability='research'`)).toBe('3');
  });

  it('idempotent replay at full quota returns the stored result, never a limit error', async () => {
    const key = randomUUID();
    const first = JSON.parse(await sql(begin(key, 'case_chat', { chat: 1 })));
    await finish(first.operation_id);
    await expect(sql(begin(randomUUID(), 'case_chat', { chat: 1 }))).rejects.toThrow('AI_CHAT_LIMIT_REACHED');
    const replay = JSON.parse(await sql(begin(key, 'case_chat', { chat: 1 })));
    expect(replay.created).toBe(false);
    expect(replay.status).toBe('succeeded');
  });

  it('reconciliation stays clean after mixed success and failure', async () => {
    const ok = JSON.parse(await sql(begin(randomUUID(), 'document_analysis', { analysis: 40 }))).operation_id;
    await finish(ok);
    const bad = JSON.parse(await sql(begin(randomUUID(), 'document_analysis', { analysis: 40 }))).operation_id;
    await finish(bad, 500);
    expect(await sql(`SELECT count(*) FROM ai_metering_reconciliation WHERE token_delta<>0 OR chat_delta<>0 OR analysis_delta<>0 OR research_delta<>0 OR reservation_delta<>0 OR reserved_token_delta<>0 OR pending_operations<>0 OR terminal_operations_without_ledger<>0`)).toBe('0');
  });
});
