import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAIMetering, operationHash } from './metering.mjs';
import { normalizeCostModel, modelCosts, estimateAICostUsd, providerUsage } from './modelCosts.mjs';
vi.mock('node-fetch', () => ({ default: vi.fn() }));
import fetch from 'node-fetch';
import { chatCompletion, createLlmCallBudget } from './provider.mjs';
import { runJurisprudenceWithRetry } from './jurisprudencePipeline.mjs';
const key='00000000-0000-4000-8000-000000000001';
const input={lawyerId:key,workspaceId:key,capability:'case_chat',resourceId:key,input:{message:'fixture'}};
const response=()=>({statusCode:200,status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}});
function harness() {
 const rpc=vi.fn(async(name)=>({data:name==='ai_begin_operation'?{operation_id:key,created:true}:name==='ai_begin_attempt'?{attempt_id:key}:name==='ai_finish_operation'?{id:key,status:'succeeded',terminal:true}:null,error:null}));
 return {rpc,meter:createAIMetering({supabase:{rpc},tokenLimit:20000000,operationLimit:5000,log:()=>{}})};
}
const ok=(data)=>({ok:true,status:200,headers:{get:()=>null},json:async()=>data});
const usage={prompt_tokens:10,completion_tokens:5,total_tokens:15,cost:0.003};
const answer={id:'generation-fixture',model:'openai/gpt-4o-mini',usage,choices:[{message:{content:'{"answer":"ok"}'}}]};
beforeEach(()=>{vi.mocked(fetch).mockReset();process.env.AI_PROVIDER_API_KEY='test';process.env.AI_PROVIDER_RETRY_BACKOFF_MS='1';delete process.env.AI_MODEL_COSTS_JSON;});
describe('cost authority',()=>{
 it('explicit aliases preserve the existing estimate, unknown catalog models stay unknown',()=>{
  expect(normalizeCostModel('gpt-4o-mini')).toBe('openai/gpt-4o-mini');
  expect(estimateAICostUsd('openai/gpt-4o-mini',1000,1000)).toBeCloseTo(0.00075,12);
  for(const model of ['z-ai/glm-5.2:free','openai/gpt-oss-20b','openai/gpt-oss-120b:fastest','deepseek-ai/DeepSeek-R1:fastest','other/gpt-4o-mini']) expect(estimateAICostUsd(model,1000,1000)).toBeNull();
 });
 it('validated override; invalid entries/config ignored without logging values',()=>{
  const warn=vi.fn();expect(modelCosts('{secret',warn)['openai/gpt-4o-mini']).toBeTruthy();expect(warn.mock.calls.flat().join()).not.toContain('secret');
  const prices=modelCosts(JSON.stringify({'z-ai/glm-5.2:free':{input:0,output:0},default:{input:100,output:100},bad:{input:-1,output:1}}),warn);
  expect(prices['z-ai/glm-5.2:free']).toEqual({input:0,output:0});expect(prices.bad).toBeUndefined();expect(prices.default).toBeUndefined();
 });
 it('actual cost independent; absent is null; requested and actual model independent',()=>{
  const value=providerUsage(answer,'openai/gpt-oss-20b','openrouter');expect(value.provider_cost_actual).toBe(0.003);expect(value.model).toBe('openai/gpt-oss-20b');expect(value.actual_model).toBe(answer.model);
  expect(providerUsage({},'unknown','openrouter')).toMatchObject({total_tokens:null,provider_cost_actual:null,estimated_cost_usd:null});
 });
});
describe('critical metering failures and identity',()=>{
 it.each(['rejection','error','empty'])('reservation %s fails closed with no provider call',async mode=>{
  const h=harness();if(mode==='rejection')h.rpc.mockRejectedValueOnce(new Error('db'));else h.rpc.mockResolvedValueOnce(mode==='error'?{error:{message:'db'}}:{data:null});
  await expect(h.meter.begin({headers:{'x-ai-operation-id':key}},response(),input)).rejects.toMatchObject({code:'AI_USAGE_UNAVAILABLE'});expect(fetch).not.toHaveBeenCalled();
 });
 it('invalid identity never reserves',async()=>{const h=harness();expect(await h.meter.begin({headers:{'x-ai-operation-id':'attacker'}},response(),input)).toBe(false);expect(h.rpc).not.toHaveBeenCalled();});
 it('completed duplicate returns persisted result, pending duplicate never executes provider',async()=>{
  for(const status of ['succeeded','failed','reserved']){const h=harness();h.rpc.mockResolvedValueOnce({data:{operation_id:key,created:false,status,response_status:status==='failed'?502:200,response_body:{answer:'saved'}}});const res=response();expect(await h.meter.begin({headers:{'x-ai-operation-id':key}},res,input)).toBe(false);expect(res.statusCode).toBe(status==='reserved'?409:status==='failed'?502:200);}expect(fetch).not.toHaveBeenCalled();
 });
 it('fingerprint includes model/content and is stable across property ordering',()=>{expect(operationHash({b:2,a:1})).toBe(operationHash({a:1,b:2}));expect(operationHash({model:'A'})).not.toBe(operationHash({model:'B'}));});
 it('settlement failure returns explicit 503, never false success',async()=>{const h=harness();await h.meter.begin({headers:{'x-ai-operation-id':key}},response(),input);h.rpc.mockResolvedValueOnce({error:{message:'db failure'}});const res=response();await h.meter.respond(res,200,{answer:'ok'});expect(res.statusCode).toBe(503);expect(res.body.ai_operation.terminal).toBe(false);});
});
describe('real adapter attempts, mocked network only',()=>{
 async function run(h){await h.meter.begin({headers:{'x-ai-operation-id':key}},response(),input);return chatCompletion({model:'openai/gpt-4o-mini',system:'fixture',user:'fixture',metering:h.meter});}
 it('first success records request/model/tokens/cost/latency independently',async()=>{
  const h=harness();vi.mocked(fetch).mockResolvedValueOnce(ok(answer));await run(h);
  const data=h.rpc.mock.calls.find(([n])=>n==='ai_finish_attempt')[1].p_data;
  expect(data).toMatchObject({provider_request_id:'generation-fixture',actual_model:answer.model,total_tokens:15,provider_cost_actual:0.003,status:'succeeded'});expect(data.latency_ms).toBeGreaterThanOrEqual(0);
 });
 it('temporary failure WITH usage then success = one operation, two attempts',async()=>{
  const h=harness();vi.mocked(fetch).mockResolvedValueOnce({ok:false,status:503,headers:{get:()=>null},text:async()=>JSON.stringify({...answer,error:{message:'fixture'}})}).mockResolvedValueOnce(ok(answer));await run(h);
  const finishes=h.rpc.mock.calls.filter(([n])=>n==='ai_finish_attempt');expect(finishes).toHaveLength(2);expect(finishes.map(([,a])=>a.p_data.total_tokens)).toEqual([15,15]);expect(h.rpc.mock.calls.filter(([n])=>n==='ai_begin_operation')).toHaveLength(1);
 });
 it('JSON fallback is another attempt within same operation',async()=>{
  const h=harness();vi.mocked(fetch).mockResolvedValueOnce({ok:false,status:400,headers:{get:()=>null},text:async()=>JSON.stringify({usage})}).mockResolvedValueOnce(ok(answer));await run(h);expect(h.rpc.mock.calls.filter(([n])=>n==='ai_finish_attempt')).toHaveLength(2);
 });
 it('schema/product invalid output still preserves provider usage',async()=>{const h=harness();vi.mocked(fetch).mockResolvedValueOnce(ok({...answer,choices:[{message:{content:'not structured'}}]}));const result=await run(h);expect(result.data).toBeNull();expect(h.rpc.mock.calls.find(([n])=>n==='ai_finish_attempt')[1].p_data.total_tokens).toBe(15);});
 it('empty output with reasoning preserves cost before throwing',async()=>{const h=harness();vi.mocked(fetch).mockResolvedValueOnce(ok({...answer,choices:[{finish_reason:'length',message:{content:'',reasoning:'fixture'}}]}));await expect(run(h)).rejects.toMatchObject({code:'OUTPUT_TOKEN_LIMIT'});expect(h.rpc.mock.calls.find(([n])=>n==='ai_finish_attempt')[1].p_data).toMatchObject({total_tokens:15,status:'failed'});});
 it('all network attempts fail with unknown usage, not invented zero cost',async()=>{const h=harness();vi.mocked(fetch).mockRejectedValue(new Error('network'));await expect(run(h)).rejects.toMatchObject({code:'AI_PROVIDER_NETWORK'});const attempts=h.rpc.mock.calls.filter(([n])=>n==='ai_finish_attempt');expect(attempts).toHaveLength(3);for(const [,a] of attempts)expect(a.p_data).toMatchObject({total_tokens:null,provider_cost_actual:null,status:'failed'});});
 it('structured-output retry preserves every successful HTTP attempt even when product fails',async()=>{
  const h=harness();await h.meter.begin({headers:{'x-ai-operation-id':key}},response(),{...input,capability:'research'});
  vi.mocked(fetch).mockImplementation(async()=>ok({...answer,choices:[{message:{content:'invalid structured response'}}]}));
  const budget=createLlmCallBudget();
  const result=await runJurisprudenceWithRetry({llmCall:()=>chatCompletion({model:'openai/gpt-4o-mini',system:'fixture',user:'fixture',metering:h.meter,budget}),sources:[],intent:'jurisprudencia',query:'fixture'});
  expect(result.outcome.status).toBe('invalid_response');
  expect(h.rpc.mock.calls.filter(([n])=>n==='ai_begin_operation')).toHaveLength(1);
  const attempts=h.rpc.mock.calls.filter(([n])=>n==='ai_finish_attempt');expect(attempts).toHaveLength(3);expect(attempts.reduce((n,[,a])=>n+a.p_data.total_tokens,0)).toBe(45);
  const res=response();await h.meter.respond(res,502,{error:'invalid result'});
  expect(h.rpc.mock.calls.at(-1)[1].p_status).toBe(502);
 });
 it('optional logger failure cannot break authoritative accounting',async()=>{
  const h=harness();const meter=createAIMetering({supabase:{rpc:h.rpc},tokenLimit:10000,operationLimit:5,log:()=>{throw new Error('logger');}});
  await expect(meter.begin({headers:{'x-ai-operation-id':key}},response(),input)).resolves.toBe(true);
 });
 it('attempt reservation fails before network',async()=>{const h=harness();h.rpc.mockImplementation(async n=>n==='ai_begin_operation'?{data:{operation_id:key,created:true}}:{error:{message:'db down'}});await expect(run(h)).rejects.toMatchObject({code:'AI_USAGE_UNAVAILABLE'});expect(fetch).not.toHaveBeenCalled();});
 it('attempt persistence failure never retries provider or reports success',async()=>{const h=harness();const original=h.rpc.getMockImplementation();h.rpc.mockImplementation(async(n,a)=>n==='ai_finish_attempt'?{error:{message:'db'}}:original(n,a));vi.mocked(fetch).mockResolvedValueOnce(ok(answer));await expect(run(h)).rejects.toMatchObject({code:'AI_USAGE_UNAVAILABLE'});expect(fetch).toHaveBeenCalledTimes(1);const res=response();await h.meter.respond(res,200,{answer:'unsafe'});expect(res.statusCode).toBe(503);});
});
