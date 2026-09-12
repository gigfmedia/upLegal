// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const src=readFileSync(new URL('../../server.mjs',import.meta.url),'utf8');
const ast=ts.createSourceFile('server.mjs',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['getLawyerCaseOwned','getAIWorkspaceOwned','getAIDocumentOwned','requireAIEntitlement','AI_FEATURES_ALL','PLAN_FEATURES_SERVER','serverCanUseAIFeature','getPlanForAccess'];
const paths=['/api/lawyer/cases/:caseId/ai-workspace','/api/ai/documents/:id/analyze','/api/ai/cases/:caseId/jurisprudence','/api/ai/cases/:caseId/workflow/sync'];
function harness({access={isProLimited:true},user='L1'}={}){
 const rows={lawyer_cases:[{id:'C1',lawyer_id:'L1',title:'Case',ai_workspace_id:null}],ai_workspaces:[],ai_documents:[{id:'D1',lawyer_id:'L1',workspace_id:'W1',status:'ready',analysis_status:'pending',extracted_text:'This is a sufficiently long legal document for the test.'}],ai_document_analyses:[]};
 let seq=0;const routes={};
 const provider=vi.fn(async()=>({data:{summary:'Summary',parties:[],key_points:[],obligations:[],risks:[],recommendations:[],deadlines:[]}}));
 const supabase={from(table){let action='select',payload;const filters=[];const run=()=>{
  const list=rows[table]??[];const selected=list.filter(r=>filters.every(([key,value,op])=>op==='neq'?r[key]!==value:r[key]===value));
  if(action==='insert'){const row={id:`NEW${++seq}`,...payload};list.push(row);return {data:row,error:null};}
  if(action==='update')selected.forEach(r=>Object.assign(r,payload));
  if(action==='delete')rows[table]=list.filter(r=>!selected.includes(r));
  return {data:selected[0]?{...selected[0]}:null,error:null,count:list.length};
 };const q={select:()=>q,eq:(k,v)=>{filters.push([k,v]);return q;},is:(k,v)=>{filters.push([k,v]);return q;},neq:(k,v)=>{filters.push([k,v,'neq']);return q;},insert:p=>{action='insert';payload=p;return q;},update:p=>{action='update';payload=p;return q;},delete:()=>{action='delete';return q;},single:async()=>run(),maybeSingle:async()=>run(),then:(a,b)=>Promise.resolve(run()).then(a,b)};return q;}};
 const ctx=vm.createContext({supabase,console:{log(){},error(){},warn(){}},app:{post:(p,h)=>routes[p]=h,get(){}},
  requireAILawyer:async(_req,res)=>{if(!user){res.status(401).json({error:'unauthorized'});return null;}return user;},requireAIAccess:async()=>access,
  checkAILimits:async()=>null,isAIOverRateLimit:()=>false,checkAIProtectionLimits:async()=>null,
  getAILawyerAccess:async()=>access,isAIProviderConfigured:()=>true,chatCompletion:provider,AI_DEFAULT_MODEL:'existing',
  buildAnalysisSystemPrompt:()=>'',buildAnalysisUserPrompt:()=>'',AIDocumentAnalysisSchema:{parse:v=>v},recordAIUsage:vi.fn(),
  capturePostHog:async()=>{},notificationsService:{notifyUser:async()=>{}},AIResearchRequestSchema:{safeParse:()=>({success:true,data:{query:'Legal research'}})},validateResearchQuery:()=>({valid:true}),
 });
 for(const n of ast.statements){
  if(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>names.includes(d.name.getText(ast))))vm.runInContext(n.getText(ast),ctx);
  if(ts.isFunctionDeclaration(n)&&names.includes(n.name?.text))vm.runInContext(n.getText(ast),ctx);
  if(ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&paths.includes(n.expression.arguments[0]?.text))vm.runInContext(n.getText(ast),ctx);
 }
 async function call(path,body={}){const res={statusCode:200,status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};await routes[path]({params:{caseId:'C1',id:'D1'},body},res);return res;}
 return {rows,provider,call,ctx};
}
const provision=paths[0],analyze=paths[1];
describe('4.30B actual server routes, unchanged authorities',()=>{
 it('owned case provisions once, reuses link, no provider even without entitlement',async()=>{const h=harness({access:null});expect((await h.call(provision)).statusCode).toBe(200);expect((await h.call(provision)).body.created).toBe(false);expect(h.rows.ai_workspaces).toHaveLength(1);expect(h.rows.lawyer_cases[0].ai_workspace_id).toBe(h.rows.ai_workspaces[0].id);expect(h.provider).not.toHaveBeenCalled();expect((await h.call(analyze)).statusCode).toBe(402);expect(h.provider).not.toHaveBeenCalled();});
 it('concurrent provisioning leaves exactly one linked workspace',async()=>{const h=harness();const results=await Promise.all([h.call(provision),h.call(provision)]);expect(results.every(r=>r.statusCode===200)).toBe(true);expect(h.rows.ai_workspaces).toHaveLength(1);expect(new Set(results.map(r=>r.body.workspace.id)).size).toBe(1);expect(h.rows.lawyer_cases[0].ai_workspace_id).toBe(h.rows.ai_workspaces[0].id);expect(h.provider).not.toHaveBeenCalled();});
 it('cross-lawyer case provisioning denied',async()=>{const h=harness({user:'L2'});expect((await h.call(provision)).statusCode).toBe(404);expect(h.rows.ai_workspaces).toHaveLength(0);expect(h.provider).not.toHaveBeenCalled();});
 it('anonymous provisioning denied',async()=>{const h=harness({user:null});expect((await h.call(provision)).statusCode).toBe(401);});
 it('foreign linked workspace rejected without replacement',async()=>{const h=harness();h.rows.lawyer_cases[0].ai_workspace_id='FOREIGN';h.rows.ai_workspaces.push({id:'FOREIGN',lawyer_id:'L2'});expect((await h.call(provision)).statusCode).toBe(409);expect(h.rows.ai_workspaces).toHaveLength(1);});
 it('cross-lawyer document access denied before provider',async()=>{const h=harness({user:'L2'});expect((await h.call(analyze)).statusCode).toBe(404);expect(h.provider).not.toHaveBeenCalled();});
 it.each([{isProLimited:true},{isActive:true},{isTrialing:true}])('Pro and legacy active/trial analyze explicitly',async access=>{const h=harness({access});expect((await h.call(analyze)).statusCode).toBe(200);expect(h.provider).toHaveBeenCalledTimes(1);});
 it('4.29E simultaneous same-document analysis returns busy and one provider call',async()=>{const h=harness();let finish;h.provider.mockImplementation(()=>new Promise(r=>{finish=r;}));const first=h.call(analyze);await vi.waitFor(()=>expect(h.provider).toHaveBeenCalledTimes(1));const second=await h.call(analyze);expect(second.statusCode).toBe(409);expect(second.body.code).toBe('AI_DOCUMENT_ANALYSIS_IN_PROGRESS');finish({data:{summary:'ok'}});expect((await first).statusCode).toBe(200);expect(h.provider).toHaveBeenCalledTimes(1);});
 it('4.29E stale processing recovers',async()=>{const h=harness();Object.assign(h.rows.ai_documents[0],{analysis_status:'processing',updated_at:new Date(Date.now()-360000).toISOString()});expect((await h.call(analyze)).statusCode).toBe(200);expect(h.provider).toHaveBeenCalledTimes(1);});
 it('4.29E provider failure preserves previous analysis and permits retry',async()=>{const h=harness();h.rows.ai_document_analyses.push({document_id:'D1',summary:'previous'});h.provider.mockRejectedValueOnce(new Error('provider unavailable'));expect((await h.call(analyze)).statusCode).toBe(500);expect(h.rows.ai_document_analyses[0].summary).toBe('previous');expect(h.rows.ai_documents[0].analysis_status).toBe('failed');expect((await h.call(analyze)).statusCode).toBe(200);});
 it('4.29D Pro core allowed; advanced features remain denied',()=>{const h=harness();for(const feature of ['document_analysis','case_chat','case_analysis'])expect(vm.runInContext(`serverCanUseAIFeature('${feature}', 'pro_limited')`,h.ctx)).toBe(true);for(const feature of ['jurisprudence','research','workflow_generation','document_drafting'])expect(vm.runInContext(`serverCanUseAIFeature('${feature}', 'pro_limited')`,h.ctx)).toBe(false);});
});

describe('4.29D actual advanced routes',()=>{
 it.each(paths.slice(2))('%s denies Pro before provider',async path=>{const h=harness();h.rows.ai_workspaces.push({id:'C1',lawyer_id:'L1'});const res=await h.call(path);expect(res.statusCode).toBe(403);expect(res.body.code).toBe('AI_FEATURE_NOT_AVAILABLE');expect(h.provider).not.toHaveBeenCalled();});
});
