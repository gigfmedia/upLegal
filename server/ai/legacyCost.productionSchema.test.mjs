import { beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
const exec = promisify(execFile);
const container = process.env.AI_RESTORED_SCHEMA_CONTAINER;
if (container && container !== 'legalup-recovery-438b2') throw new Error('Dedicated offline restore required');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
async function sql(query) {
  const { stdout } = await exec('docker', ['exec', container, 'sh', '-c',
    'PGPASSWORD="$POSTGRES_PASSWORD" exec psql -X -U supabase_admin -d postgres -Atq -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -c "$1"', 'psql', query], { maxBuffer: 8 * 1024 * 1024 });
  return stdout.trim();
}
const lawyer = '438b2a00-0000-4000-8000-000000000001';
const workspace = '438b2a00-0000-4000-8000-000000000002';
const conversation = '438b2a00-0000-4000-8000-000000000003';
const key = '438b2a00-0000-4000-8000-000000000004';
const begin = k => `SELECT ai_begin_operation('${lawyer}','${workspace}','case_chat','${conversation}','${k}',repeat('a',64),20000000,5000)`;
const finish = id => sql(`SELECT ai_finish_operation('${id}',200,'{"answer":"synthetic local fixture"}')`);
const column = () => sql("SELECT json_build_object('nullable',is_nullable,'default',column_default) FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_usage' AND column_name='estimated_cost_usd'");
const history = () => sql(`SELECT md5(jsonb_agg(to_jsonb(u) ORDER BY id)::text) FROM ai_usage u WHERE lawyer_id<>'${lawyer}'`);
const catalog = () => sql(`SELECT jsonb_agg(jsonb_build_object('table',c.oid::regclass::text,'column',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY c.oid,a.attnum) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped AND c.relkind IN ('r','v')`);
let operation, beforeHistory, beforeCatalog, relationFile;
describe.skipIf(!container).sequential('Verified production restore: legacy estimated cost compatibility', { timeout: 30000 }, () => {
  beforeAll(async () => {
    const { stdout } = await exec('docker', ['inspect', container, '--format', '{{json .}}']);
    const info = JSON.parse(stdout);
    expect(info.HostConfig.NetworkMode).toBe('none');
    expect(Object.keys(info.HostConfig.PortBindings || {})).toHaveLength(0);
    expect(info.Config.Image).toBe('public.ecr.aws/supabase/postgres:17.4.1.054');
    expect(await sql('SHOW server_version')).toMatch(/^17\.4/);
    expect(await sql("SELECT to_regclass('public.ai_operations') IS NULL")).toBe('t');
    expect(JSON.parse(await column())).toEqual({ nullable: 'NO', default: '0' });
    await sql(readFileSync('supabase/migrations/20260928000000_ai_operation_metering.sql', 'utf8'));
    // Local fixture seed only. No restored user/content is used in test operations.
    await sql(`BEGIN; SET LOCAL session_replication_role=replica;
      INSERT INTO auth.users(id) VALUES('${lawyer}');
      INSERT INTO profiles(id,user_id,role) VALUES('${lawyer}','${lawyer}','lawyer');
      INSERT INTO ai_workspaces(id,lawyer_id,name) VALUES('${workspace}','${lawyer}','Synthetic local QA');
      INSERT INTO ai_conversations(id,lawyer_id,workspace_id) VALUES('${conversation}','${lawyer}','${workspace}'); COMMIT;`);
    beforeHistory = await history();
    beforeCatalog = JSON.parse(await catalog());
    relationFile = await sql("SELECT pg_relation_filenode('ai_usage'::regclass)");
  });
  it('reproduces SQLSTATE 23502 with one succeeded attempt and unknown estimate', async () => {
    operation = JSON.parse(await sql(begin(key))).operation_id;
    const attempt = JSON.parse(await sql(`SELECT ai_begin_attempt('${operation}','fixture','openai/gpt-oss-20b',10000)`)).attempt_id;
    await sql(`SELECT ai_finish_attempt('${attempt}','{"status":"succeeded","prompt_tokens":6495,"completion_tokens":2400,"total_tokens":8895,"provider_cost_actual":0.0003699,"provider_cost_estimated":null}')`);
    try { await finish(operation); throw new Error('Expected NOT NULL failure'); }
    catch (error) { expect(error.stderr).toContain('23502'); expect(error.stderr).toContain('null value in column "estimated_cost_usd"'); }
    expect(await sql(`SELECT status||','||quota_units FROM ai_operations WHERE id='${operation}'`)).toBe('reserved,0');
    expect(await sql(`SELECT count(*) FROM ai_usage WHERE operation_id='${operation}'`)).toBe('0');
  });
  it('applies only nullability correction; same settlement succeeds without rewriting history', async () => {
    await sql(readFileSync('supabase/migrations/20260929000000_ai_usage_unknown_estimated_cost.sql', 'utf8'));
    expect(JSON.parse(await column())).toEqual({ nullable: 'YES', default: '0' });
    const expected = beforeCatalog.map(c => c.table === 'ai_usage' && c.column === 'estimated_cost_usd' ? { ...c, notnull: false } : c);
    expect(JSON.parse(await catalog())).toEqual(expected);
    expect(await history()).toBe(beforeHistory);
    expect(await sql("SELECT pg_relation_filenode('ai_usage'::regclass)")).toBe(relationFile);
    await finish(operation);
    expect(await sql(`SELECT status||','||quota_units FROM ai_operations WHERE id='${operation}'`)).toBe('succeeded,1');
    expect(await sql(`SELECT estimated_cost_usd IS NULL AND input_tokens=6495 AND output_tokens=2400 AND total_tokens=8895 FROM ai_usage WHERE operation_id='${operation}'`)).toBe('t');
    expect(await sql(`SELECT provider_cost_actual=0.0003699 AND provider_cost_estimated IS NULL FROM ai_provider_attempts WHERE operation_id='${operation}'`)).toBe('t');
  });
  it('replays terminal operation without another attempt, ledger row or quota charge', async () => {
    await finish(operation);
    const replay = JSON.parse(await sql(begin(key)));
    expect(replay).toMatchObject({ created: false, status: 'succeeded', response_body: { answer: 'synthetic local fixture' } });
    expect(await sql(`SELECT count(*) FROM ai_usage WHERE operation_id='${operation}'`)).toBe('1');
    expect(await sql(`SELECT count(*) FROM ai_provider_attempts WHERE operation_id='${operation}'`)).toBe('1');
    expect(await sql(`SELECT chat_message_count||','||reserved_operations FROM ai_usage_monthly WHERE lawyer_id='${lawyer}'`)).toBe('1,0');
  });
  it('omitted legacy estimate remains zero; explicit NULL remains unknown', async () => {
    expect(await sql(`BEGIN; INSERT INTO ai_usage(lawyer_id,operation) VALUES('${lawyer}','case_chat') RETURNING estimated_cost_usd=0; ROLLBACK;`)).toBe('t');
    expect(await sql(`SELECT estimated_cost_usd IS NULL FROM ai_usage WHERE operation_id='${operation}'`)).toBe('t');
  });
  it('known estimate settles normally and all reconciliation deltas stay zero', async () => {
    const op = JSON.parse(await sql(begin('438b2a00-0000-4000-8000-000000000005'))).operation_id;
    const attempt = JSON.parse(await sql(`SELECT ai_begin_attempt('${op}','fixture','fixture-model',100)`)).attempt_id;
    await sql(`SELECT ai_finish_attempt('${attempt}',${quote(JSON.stringify({ status: 'succeeded', prompt_tokens: 60, completion_tokens: 40, total_tokens: 100, provider_cost_actual: 0.01, provider_cost_estimated: 0.02 }))})`);
    await finish(op);
    expect(await sql(`SELECT estimated_cost_usd=0.02 FROM ai_usage WHERE operation_id='${op}'`)).toBe('t');
    expect(await sql(`SELECT chat_message_count||','||total_tokens||','||reserved_operations FROM ai_usage_monthly WHERE lawyer_id='${lawyer}'`)).toBe('2,8995,0');
    expect(await sql(`SELECT count(*) FROM ai_metering_reconciliation WHERE token_delta<>0 OR chat_delta<>0 OR analysis_delta<>0 OR research_delta<>0 OR actual_cost_delta<>0 OR estimated_cost_delta<>0 OR estimated_provider_cost_delta<>0 OR reservation_delta<>0 OR reserved_token_delta<>0 OR pending_operations<>0 OR terminal_operations_without_ledger<>0`)).toBe('0');
    expect(await history()).toBe(beforeHistory);
  });
});
