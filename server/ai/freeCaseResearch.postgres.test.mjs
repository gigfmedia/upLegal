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
const L = '20000000-0000-4000-8000-000000000001', C = '20000000-0000-4000-8000-000000000002', W = '20000000-0000-4000-8000-000000000003';
// Free research begin (16 trailing params incl. p_free_research_limit).
const beginFree = (key = randomUUID(), { chat = 3, analysis = 1, research = 1 } = {}) =>
  `SELECT public.ai_begin_operation('${L}','${W}','research',NULL,'${key}','${'a'.repeat(64)}',20000000,5000,NULL,NULL,NULL,NULL,'${C}','${W}',${chat},${analysis},${research});`;
const finish = (op, status = 200) => sql(`SELECT ai_finish_operation('${op}',${status},'{"answer":"fixture"}'::jsonb)`);

describe.skipIf(!container)('PostgreSQL free first-Case research (4.49A, isolated local)', { timeout: 120000 }, () => {
  beforeAll(async () => {
    await sql(`DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO PUBLIC; DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; END IF; END $$; CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE SCHEMA IF NOT EXISTS auth; CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY);
    CREATE TABLE public.lawyer_subscriptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,status text,current_period_end timestamptz,created_at timestamptz DEFAULT now());
    CREATE TABLE public.ai_subscriptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,status text,trial_started_at timestamptz,trial_ends_at timestamptz,current_period_end timestamptz);
    CREATE TABLE public.lawyer_clients(id uuid PRIMARY KEY,lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE);
    CREATE TABLE public.bookings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,case_id uuid);
    CREATE TABLE public.ai_workspaces(id uuid PRIMARY KEY,lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE);
    CREATE TABLE public.lawyer_cases(id uuid PRIMARY KEY,lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,source text,booking_id uuid,quote_request_id uuid,client_id uuid,ai_workspace_id uuid REFERENCES public.ai_workspaces(id),created_at timestamptz DEFAULT now());
    CREATE TABLE public.ai_documents(id uuid PRIMARY KEY,lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,workspace_id uuid NOT NULL REFERENCES public.ai_workspaces(id) ON DELETE CASCADE);
    CREATE TABLE public.ai_document_analyses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid,document_id uuid);
    CREATE TABLE public.ai_chat_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid);
    CREATE TABLE public.ai_conversations(id uuid PRIMARY KEY,lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,workspace_id uuid NOT NULL REFERENCES public.ai_workspaces(id) ON DELETE CASCADE);
    CREATE TABLE public.ai_research_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid);
    CREATE TABLE public.ai_usage(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,workspace_id uuid,operation_id uuid,document_id uuid,conversation_id uuid,operation text,provider text,model text,input_tokens integer NOT NULL DEFAULT 0,output_tokens integer NOT NULL DEFAULT 0,total_tokens integer NOT NULL DEFAULT 0,credits_used integer NOT NULL DEFAULT 0,estimated_cost_usd numeric);
    CREATE TABLE public.ai_case_workflow_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid);
    CREATE TABLE public.ai_case_timeline_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid,event_type text);
    CREATE TABLE public.ai_usage_monthly(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,period_start date NOT NULL,period_end date NOT NULL,total_tokens bigint NOT NULL DEFAULT 0,total_credits integer NOT NULL DEFAULT 0,document_analysis_count integer NOT NULL DEFAULT 0,chat_message_count integer NOT NULL DEFAULT 0,jurisprudence_research_count integer NOT NULL DEFAULT 0,estimated_cost_usd numeric NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(lawyer_id,period_start));
    CREATE OR REPLACE FUNCTION public.ai_is_lawyer_on_trial(uuid) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT false $$;
    CREATE OR REPLACE FUNCTION public.has_pro_access(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;`);
    await sql(readFileSync('supabase/migrations/20260924000000_pro_free_case_lifetime.sql', 'utf8'));
    await sql(readFileSync('supabase/migrations/20260928000000_ai_operation_metering.sql', 'utf8'));
    await sql(readFileSync('supabase/migrations/20260929000000_ai_usage_unknown_estimated_cost.sql', 'utf8').replace('ALTER TABLE public.ai_usage ALTER COLUMN estimated_cost_usd DROP NOT NULL;', 'SELECT 1;'));
    await sql(readFileSync('supabase/migrations/20260930000000_pro_ai_allowance.sql', 'utf8'));
    await sql(readFileSync('supabase/migrations/20260930000100_pro_free_case_allowance.sql', 'utf8'));
    await sql(readFileSync('supabase/migrations/20261001000000_free_case_research_allowance.sql', 'utf8'));
  }, 120000);
  beforeEach(async () => {
    await sql(`TRUNCATE ai_usage,ai_provider_attempts,ai_operations,ai_usage_monthly,ai_documents,ai_conversations,ai_research_requests,ai_document_analyses,ai_chat_messages,ai_case_workflow_items,ai_case_timeline_events,lawyer_cases,ai_workspaces,ai_subscriptions,lawyer_subscriptions,pro_free_case_grants,profiles CASCADE;
    INSERT INTO profiles VALUES('${L}');INSERT INTO ai_workspaces VALUES('${W}','${L}');INSERT INTO lawyer_cases VALUES('${C}','${L}','LAWYER_DIRECT',NULL,NULL,NULL,'${W}',now());`);
  });

  it('first research succeeds with free flag; second blocked pre-provider', async () => {
    const first = JSON.parse(await sql(beginFree()));
    expect(first.created).toBe(true);
    await finish(first.operation_id);
    expect(await sql(`SELECT is_free_allowance FROM ai_operations WHERE id='${first.operation_id}'`)).toBe('t');
    await expect(sql(beginFree())).rejects.toThrow('FREE_CASE_RESEARCH_LIMIT_REACHED');
    expect(await sql(`SELECT count(*) FROM ai_operations WHERE lawyer_id='${L}' AND capability='research'`)).toBe('1');
    expect(await sql(`SELECT count(*) FROM ai_provider_attempts`)).toBe('0');
  });

  it('failed research releases 0/1; retries consume one unit', async () => {
    const op = JSON.parse(await sql(beginFree())).operation_id;
    const att = JSON.parse(await sql(`SELECT ai_begin_attempt('${op}','fixture','m',100)`)).attempt_id;
    await sql(`SELECT ai_finish_attempt('${att}','{"status":"failed","total_tokens":5}'::jsonb)`);
    await finish(op, 502);
    expect(await sql(`SELECT status||','||quota_units FROM ai_operations WHERE id='${op}'`)).toBe('failed,0');
    const retry = JSON.parse(await sql(beginFree()));
    expect(retry.created).toBe(true);
  });

  it('last slot race admits exactly one, pre-provider', async () => {
    const results = await Promise.allSettled([sql(beginFree()), sql(beginFree())]);
    expect(results.filter(r => r.status === 'fulfilled' && JSON.parse(r.value).created)).toHaveLength(1);
    expect(String(results.find(r => r.status === 'rejected').reason)).toContain('FREE_CASE_RESEARCH_LIMIT_REACHED');
    expect(await sql(`SELECT count(*) FROM ai_provider_attempts`)).toBe('0');
  });

  it('wrong workspace denied; legacy 12-arg path intact', async () => {
    await sql(`INSERT INTO ai_workspaces VALUES('${randomUUID()}','${L}')`);
    const other = await sql(`SELECT id FROM ai_workspaces WHERE lawyer_id='${L}' AND id<>'${W}' LIMIT 1`);
    await expect(sql(`SELECT public.ai_begin_operation('${L}','${other}','research',NULL,gen_random_uuid(),repeat('a',64),20000000,5000,NULL,NULL,NULL,NULL,'${C}','${W}',3,1,1);`)).rejects.toThrow('AI_RESOURCE_FORBIDDEN');
    const legacy = JSON.parse(await sql(`SELECT public.ai_begin_operation('${L}','${W}','research',NULL,gen_random_uuid(),repeat('a',64),20000000,5000);`));
    expect(legacy.created).toBe(true);
    expect(await sql(`SELECT is_free_allowance FROM ai_operations WHERE id='${legacy.operation_id}'`)).toBe('f');
  });

  it('pro-era research in free case does not consume free 1/1 (§12)', async () => {
    // commercial research (no free params) inside the free workspace, then free begin still available
    const pro = JSON.parse(await sql(`SELECT public.ai_begin_operation('${L}','${W}','research',NULL,gen_random_uuid(),repeat('a',64),20000000,5000,NULL,NULL,NULL,10,NULL,NULL,NULL,NULL,NULL);`));
    await finish(pro.operation_id);
    const free = JSON.parse(await sql(beginFree()));
    expect(free.created).toBe(true);
  });

  it('free research excluded from commercial monthly count (§11)', async () => {
    const free = JSON.parse(await sql(beginFree()));
    await finish(free.operation_id);
    expect(await sql(`SELECT count(*) FROM ai_operations WHERE lawyer_id='${L}' AND capability='research' AND status IN ('reserved','succeeded') AND NOT is_free_allowance`)).toBe('0');
  });
});
