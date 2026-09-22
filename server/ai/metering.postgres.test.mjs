import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createAIMetering } from './metering.mjs';
const exec=promisify(execFile);
// Explicit isolated container only. This suite cannot connect to Supabase/production.
const container=process.env.AI_METERING_TEST_CONTAINER;
if(container && container!=='legalup-ai-metering-438b') throw new Error('Use the dedicated disposable test container');
async function sql(query){const {stdout}=await exec('docker',['exec',container,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-Atq','-c',query],{maxBuffer:4*1024*1024});return stdout.trim();}
const quote=v=>v==null?'NULL':`'${String(v).replaceAll("'","''")}'`;
const lawyer='00000000-0000-4000-8000-000000000001',workspace='00000000-0000-4000-8000-000000000002',doc='00000000-0000-4000-8000-000000000003',caseId='00000000-0000-4000-8000-000000000004';
const begin=(key=randomUUID(),limit=5000,cap='document_analysis',owner=lawyer,hash='a'.repeat(64))=>`SELECT public.ai_begin_operation('${owner}','${workspace}','${cap}',${cap==='research'?'NULL':quote(doc)},'${key}','${hash}',20000000,${limit});`;
async function operation(){return JSON.parse(await sql(begin())).operation_id;}
async function attempt(op,budget=100){return JSON.parse(await sql(`SELECT ai_begin_attempt('${op}','fixture','openai/gpt-4o-mini',${budget})`)).attempt_id;}
const finishAttempt=(id,data)=>sql(`SELECT ai_finish_attempt('${id}',${quote(JSON.stringify(data))}::jsonb)`);
const finish=(op,status=200)=>sql(`SELECT ai_finish_operation('${op}',${status},'{"answer":"fixture"}'::jsonb)`);
const data={status:'succeeded',prompt_tokens:60,completion_tokens:40,total_tokens:100,provider_cost_actual:0.01,provider_cost_estimated:0.02,latency_ms:1};
describe.skipIf(!container)('PostgreSQL real atomic metering (isolated local)', { timeout: 30000 },()=>{
 beforeAll(async()=>{
 await sql(`DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO PUBLIC; DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; END IF; END $$; CREATE EXTENSION IF NOT EXISTS pgcrypto;
 CREATE TABLE public.profiles(id uuid PRIMARY KEY);
 CREATE TABLE public.ai_workspaces(id uuid PRIMARY KEY,lawyer_id uuid);
 CREATE TABLE public.lawyer_cases(id uuid PRIMARY KEY,lawyer_id uuid,ai_workspace_id uuid);
 CREATE TABLE public.ai_documents(id uuid PRIMARY KEY,lawyer_id uuid,workspace_id uuid);
 CREATE TABLE public.ai_conversations(id uuid PRIMARY KEY,lawyer_id uuid,workspace_id uuid);`);
 await sql(readFileSync('supabase/migrations/20260804000000_ai_usage_cost_tracking.sql','utf8').replaceAll('auth.uid()',"null::uuid"));
 await sql(`ALTER TABLE public.ai_usage DROP CONSTRAINT ai_usage_operation_check; ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_operation_check CHECK(operation IN ('case_chat','document_analysis','jurisprudence_research')); ALTER TABLE public.ai_usage_monthly ADD COLUMN jurisprudence_research_count integer NOT NULL DEFAULT 0;`);
 await sql(readFileSync('supabase/migrations/20260928000000_ai_operation_metering.sql','utf8'));
 // Reapplication cannot fabricate historical records or replace the baseline.
 await sql(readFileSync('supabase/migrations/20260928000000_ai_operation_metering.sql','utf8'));
 },30000);
 beforeEach(async()=>{
 await sql(`TRUNCATE ai_usage,ai_provider_attempts,ai_operations,ai_usage_monthly,ai_documents,ai_conversations,lawyer_cases,ai_workspaces,profiles CASCADE;
 INSERT INTO profiles VALUES('${lawyer}');INSERT INTO ai_workspaces VALUES('${workspace}','${lawyer}');INSERT INTO lawyer_cases VALUES('${caseId}','${lawyer}','${workspace}');INSERT INTO ai_documents VALUES('${doc}','${lawyer}','${workspace}');INSERT INTO ai_conversations VALUES('${doc}','${lawyer}','${workspace}');`);
 });
 it('one remaining unit: concurrent reservations admit exactly one provider mock',async()=>{
  const provider=vi.fn();const results=await Promise.allSettled([sql(begin(randomUUID(),1)),sql(begin(randomUUID(),1))]);
  for(const r of results)if(r.status==='fulfilled'&&JSON.parse(r.value).created)provider();
  expect(provider).toHaveBeenCalledTimes(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
  expect(await sql('SELECT count(*) FROM ai_operations')).toBe('1');
 });
 it('concurrent identical key: one operation/provider; changed payload conflicts',async()=>{
  const key=randomUUID();const provider=vi.fn();const results=await Promise.all([sql(begin(key)),sql(begin(key))]);
  for(const r of results)if(JSON.parse(r).created)provider();expect(provider).toHaveBeenCalledTimes(1);
  await expect(sql(begin(key,5000,'document_analysis',lawyer,'b'.repeat(64)))).rejects.toThrow('AI_IDEMPOTENCY_CONFLICT');
 });
 it('retries aggregate cost/tokens but charge one successful operation, replay is idempotent',async()=>{
  const key=randomUUID();const op=JSON.parse(await sql(begin(key))).operation_id;
  for(const status of ['failed','succeeded']){const id=await attempt(op,100);await finishAttempt(id,{...data,status});await finishAttempt(id,{...data,status});}
  await finish(op);await finish(op);
  expect(await sql('SELECT total_tokens||\',\'||document_analysis_count||\',\'||reserved_operations||\',\'||reserved_tokens FROM ai_usage_monthly')).toBe('200,1,0,0');
  expect(await sql('SELECT count(*) FROM ai_usage')).toBe('1');expect(await sql('SELECT count(*) FROM ai_provider_attempts')).toBe('2');
  const replay=JSON.parse(await sql(begin(key)));expect(replay.created).toBe(false);expect(replay.response_body.answer).toBe('fixture');
  expect(await sql(`SELECT count(*) FROM ai_metering_reconciliation WHERE token_delta<>0 OR chat_delta<>0 OR analysis_delta<>0 OR research_delta<>0 OR actual_cost_delta<>0 OR estimated_cost_delta<>0 OR reservation_delta<>0 OR reserved_token_delta<>0 OR terminal_operations_without_ledger<>0`)).toBe('0');
 });
 it('failure charges no operation; known provider cost remains; reanalysis is new operation',async()=>{
  const op=await operation();const a=await attempt(op);await finishAttempt(a,{...data,status:'failed'});await finish(op,502);
  expect(await sql('SELECT document_analysis_count||\',\'||total_tokens FROM ai_usage_monthly')).toBe('0,100');
  expect(await operation()).not.toBe(op);
 });
 it('pre-provider rejection leaves no fabricated legacy AI activity',async()=>{
  const op=await operation();await finish(op,400);
  expect(await sql('SELECT count(*) FROM ai_usage')).toBe('0');
  expect(await sql('SELECT status FROM ai_operations')).toBe('failed');
  expect(await sql('SELECT reserved_operations FROM ai_usage_monthly')).toBe('0');
  expect(await sql('SELECT terminal_operations_without_ledger FROM ai_metering_reconciliation')).toBe('0');
 });
 it('unknown usage is NULL, unknown counters explicit',async()=>{
  const op=await operation();const a=await attempt(op);await finishAttempt(a,{status:'failed',latency_ms:1});await finish(op,502);
  expect(await sql('SELECT provider_cost_actual IS NULL FROM ai_provider_attempts')).toBe('t');
  expect(await sql('SELECT provider_cost_actual IS NULL AND unknown_actual_cost_attempts=1 AND unknown_token_attempts=1 FROM ai_usage_monthly')).toBe('t');
 });
 it.each(['case_chat','document_chat','document_analysis','research'])('production NOT NULL compatibility: %s unknown estimate settles once',async cap=>{
  await sql('ALTER TABLE ai_usage ALTER COLUMN estimated_cost_usd SET DEFAULT 0; ALTER TABLE ai_usage ALTER COLUMN estimated_cost_usd SET NOT NULL');
  const key=randomUUID();const op=JSON.parse(await sql(begin(key,5000,cap))).operation_id;
  const id=await attempt(op);
  await finishAttempt(id,{...data,provider_cost_estimated:null});
  await expect(finish(op)).rejects.toThrow('null value in column "estimated_cost_usd"');
  expect(await sql('SELECT status FROM ai_operations')).toBe('reserved');
  expect(await sql('SELECT count(*) FROM ai_usage')).toBe('0');
  await sql(readFileSync('supabase/migrations/20260929000000_ai_usage_unknown_estimated_cost.sql','utf8'));
  await finish(op);await finish(op);
  expect(await sql('SELECT estimated_cost_usd IS NULL FROM ai_usage')).toBe('t');
  expect(await sql('SELECT provider_cost_actual=0.01 FROM ai_provider_attempts')).toBe('t');
  expect(await sql('SELECT quota_units FROM ai_operations')).toBe('1');
  expect(await sql('SELECT count(*) FROM ai_provider_attempts')).toBe('1');
  expect(JSON.parse(await sql(begin(key,5000,cap))).created).toBe(false);
  expect(await sql("SELECT count(*) FROM ai_metering_reconciliation WHERE token_delta<>0 OR chat_delta<>0 OR analysis_delta<>0 OR research_delta<>0 OR actual_cost_delta<>0 OR estimated_cost_delta<>0 OR reservation_delta<>0 OR reserved_token_delta<>0 OR pending_operations<>0")).toBe('0');
 });
 it('compatibility migration preserves numeric history and omitted legacy default',async()=>{
  await sql(`ALTER TABLE ai_usage ALTER COLUMN estimated_cost_usd SET DEFAULT 0; ALTER TABLE ai_usage ALTER COLUMN estimated_cost_usd SET NOT NULL;
   INSERT INTO ai_usage(lawyer_id,operation,estimated_cost_usd) VALUES('${lawyer}','case_chat',0.123);`);
  await sql(readFileSync('supabase/migrations/20260929000000_ai_usage_unknown_estimated_cost.sql','utf8'));
  expect(await sql('SELECT estimated_cost_usd FROM ai_usage')).toBe('0.123');
  await sql(`INSERT INTO ai_usage(lawyer_id,operation) VALUES('${lawyer}','case_chat');`);
  expect(await sql('SELECT count(*) FROM ai_usage WHERE estimated_cost_usd=0')).toBe('1');
 });
 it('tokens reserved atomically across separate operations',async()=>{
  const a=await operation(),b=await operation();const results=await Promise.allSettled([attempt(a,15000000),attempt(b,15000000)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 });
 it('ledger failure rolls back monthly settlement and operation state',async()=>{
  const op=await operation();const a=await attempt(op);await finishAttempt(a,data);
  await sql(`ALTER TABLE ai_usage ADD CONSTRAINT fixture_failure CHECK(operation_id IS NULL)`);
  try{await expect(finish(op)).rejects.toThrow('fixture_failure');expect(await sql('SELECT status FROM ai_operations')).toBe('reserved');expect(await sql('SELECT document_analysis_count FROM ai_usage_monthly')).toBe('0');}finally{await sql('ALTER TABLE ai_usage DROP CONSTRAINT fixture_failure');}
  await finish(op);expect(await sql('SELECT document_analysis_count FROM ai_usage_monthly')).toBe('1');
 });
 it('pending attempt prevents blind release; no new duplicate provider after crash',async()=>{
  const key=randomUUID();const op=JSON.parse(await sql(begin(key))).operation_id;await attempt(op);
  await expect(finish(op,500)).rejects.toThrow('AI_RECONCILIATION_REQUIRED');
  expect(JSON.parse(await sql(begin(key))).created).toBe(false);
 });
 it('normal clients cannot write/reserve/settle/read other ledger; resource ownership checked',async()=>{
  for(const role of ['anon','authenticated']){
   await expect(sql(`SET ROLE ${role}; ${begin()}`)).rejects.toThrow('permission denied');
   await expect(sql(`SET ROLE ${role}; SELECT * FROM ai_operations`)).rejects.toThrow('permission denied');
   await expect(sql(`SET ROLE ${role}; SELECT ai_finish_operation('${randomUUID()}',200,'{}')`)).rejects.toThrow('permission denied');
  }
  await expect(sql(begin(randomUUID(),5000,'document_analysis',randomUUID()))).rejects.toThrow('AI_RESOURCE_FORBIDDEN');
 });
 it('canonical link and orphan compatibility; no invented linkage',async()=>{const op=await operation();expect(await sql(`SELECT lawyer_case_id FROM ai_operations WHERE id='${op}'`)).toBe(caseId);await sql('DELETE FROM lawyer_cases');const orphan=await operation();expect(await sql(`SELECT lawyer_case_id IS NULL FROM ai_operations WHERE id='${orphan}'`)).toBe('t');});
 it.each(['case_chat','document_chat','research'])('%s increments proper logical counter',async cap=>{const op=JSON.parse(await sql(begin(randomUUID(),5000,cap))).operation_id;await finishAttempt(await attempt(op),data);await finish(op);expect(await sql(`SELECT ${cap==='research'?'jurisprudence_research_count':'chat_message_count'} FROM ai_usage_monthly`)).toBe('1');});
 it('real JS coordinator + concurrent SQL reservations invoke provider once',async()=>{
  const rpc=async(name,args)=>{try{const values=Object.values(args).map(v=>typeof v==='number'?v:quote(v&&typeof v==='object'?JSON.stringify(v):v));return {data:JSON.parse(await sql(`SELECT public.${name}(${values.join(',')})`))};}catch(error){return {error:{message:error.stderr?.split('\n')[0] || error.message}};}};
  const provider=vi.fn(async()=>({answer:'fixture'}));
  const key=randomUUID();
  const run=async()=>{const meter=createAIMetering({supabase:{rpc},tokenLimit:20000000,operationLimit:1,log:()=>{}});const res={statusCode:200,status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};if(await meter.begin({headers:{'x-ai-operation-id':key}},res,{lawyerId:lawyer,workspaceId:workspace,capability:'document_analysis',resourceId:doc,input:{}})){await meter.respond(res,200,await provider());}return res;};
  await Promise.all([run(),run()]);expect(provider).toHaveBeenCalledTimes(1);
  expect(await sql('SELECT count(*) FROM ai_operations')).toBe('1');expect(await sql('SELECT document_analysis_count FROM ai_usage_monthly')).toBe('1');
 });
 it('real RPC adapter: reservation missing DB state is fail-closed',async()=>{
  const rpc=async(name,args)=>{try{const values=Object.values(args).map(v=>typeof v==='number'?v:quote(v));return {data:JSON.parse(await sql(`SELECT public.${name}(${values.join(',')})`))};}catch(error){return {error:{message:error.stderr?.split('\n')[0] || error.message}};}};
  await sql('ALTER TABLE ai_usage_monthly RENAME TO fixture_unavailable');
  try{const meter=createAIMetering({supabase:{rpc},tokenLimit:20000000,operationLimit:5000,log:()=>{}});const res={status(){return this;},json(){}};await expect(meter.begin({headers:{'x-ai-operation-id':randomUUID()}},res,{lawyerId:lawyer,workspaceId:workspace,capability:'document_analysis',resourceId:doc,input:{}})).rejects.toMatchObject({code:'AI_USAGE_UNAVAILABLE'});}finally{await sql('ALTER TABLE fixture_unavailable RENAME TO ai_usage_monthly');}
 });
});
