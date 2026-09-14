// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { hasCanonicalDocumentReference, resolveAnalysisModel, honestEvidenceLocation, fragmentIndexFromId } from './coreAuthority.mjs';
import { buildChatContext, buildChatSystemPrompt, buildChatUserPrompt, CHAT_LIMITS } from './legalChatPrompt.mjs';
import { getProCaseHeader, formatProCaseBlock } from './proCaseContext.mjs';
import { verifyDocumentClaims } from './documentGrounding.mjs';
import { buildAnalysisSystemPrompt, buildAnalysisUserPrompt } from './legalPrompt.mjs';
const src = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const user = id(1), foreign = id(2), caseId = id(3), workspaceId = id(4), conversationId = id(5);
const names = ['requireAILawyer','getAIDocumentOwned','getAIWorkspaceOwned','getLawyerCaseOwned','requireAIEntitlement','getAIConversationOwned','getOrCreateAIConversation','AIChatRequestSchema','AIChatResponseSchema','AIDocumentAnalysisSchema','getAIUsagePeriod','recordAIUsage','isAIOverRateLimit','checkAIProtectionLimits','getAILawyerSubscription','getAILawyerAccess','getProLawyerSubscription','getProLawyerAccess','requireAIAccess','AI_FEATURES_ALL','PLAN_FEATURES_SERVER','getPlanForAccess','serverCanUseAIFeature','extractTextFromStoredPdf'];
const paths = {
 provision:['post','/api/lawyer/cases/:caseId/ai-workspace'], process:['post','/api/ai/documents/:id/process'], analyze:['post','/api/ai/documents/:id/analyze'],
 del:['delete','/api/ai/documents/:id'], open:['get','/api/ai/documents/:id/open'],
 chatGet:['get','/api/ai/cases/:caseId/chat'], chat:['post','/api/ai/cases/:caseId/chat'], intelligence:['get','/api/ai/cases/:caseId/intelligence'],
 research:['post','/api/ai/cases/:caseId/jurisprudence'], sync:['post','/api/ai/cases/:caseId/workflow/sync'],
};
function harness({paid=true, linked=true, count=3}={}) {
 let sequence=100, tokenUser=user;
 const rows={lawyer_cases:[{id:caseId,lawyer_id:user,title:'Fixture',ai_workspace_id:linked?workspaceId:null}],
 ai_workspaces:linked?[{id:workspaceId,lawyer_id:user,name:'Fixture'}]:[],
 lawyer_subscriptions:paid?[{lawyer_id:user,status:'active',current_period_end:'2099-01-01'}]:[], ai_subscriptions:[],
 ai_documents:Array.from({length:count},(_,i)=>({id:id(10+i),lawyer_id:user,workspace_id:workspaceId,file_path:`${user}/${workspaceId}/${id(10+i)}/original.pdf`,original_filename:'fixture.pdf',status:'pending',analysis_status:'none',extracted_text:null})),
 ai_document_analyses:[],ai_conversations:[],ai_chat_messages:[],ai_usage:[],ai_usage_monthly:[]};
  const rpc=vi.fn(async()=>({error:null}));
  const download=vi.fn(async()=>({data:{arrayBuffer:async()=>new ArrayBuffer(0)},error:null}));
  const remove=vi.fn(async()=>({data:[{name:'f'}],error:null}));
  const createSignedUrl=vi.fn(async()=>({data:{signedUrl:'https://signed.example/doc.pdf'},error:null}));
  const supabase={rpc,storage:{from:()=>({download,remove,createSignedUrl})},from(table){
  let action='select',payload,limit=Infinity,filters=[];
  const run=(single=false)=>{const list=rows[table]??(rows[table]=[]);let found=list.filter(r=>filters.every(f=>f(r))).slice(0,limit);
   if(action==='insert'){const values=(Array.isArray(payload)?payload:[payload]).map(p=>({id:id(sequence++),created_at:new Date().toISOString(),...p}));list.push(...values);found=values;}
   if(action==='update')found.forEach(r=>Object.assign(r,payload));
   if(action==='delete')rows[table]=list.filter(r=>!found.includes(r));
   return {data:single?(found[0]?{...found[0]}:null):found.map(r=>({...r})),error:null,count:found.length};};
  const q={select:()=>q,eq:(k,v)=>{filters.push(r=>r[k]===v);return q;},neq:(k,v)=>{filters.push(r=>r[k]!==v);return q;},is:(k,v)=>{filters.push(r=>r[k]===v);return q;},in:(k,v)=>{filters.push(r=>v.includes(r[k]));return q;},order:()=>q,limit:n=>{limit=n;return q;},insert:p=>{action='insert';payload=p;return q;},update:p=>{action='update';payload=p;return q;},delete:()=>{action='delete';return q;},single:async()=>run(true),maybeSingle:async()=>run(true),then:(a,b)=>Promise.resolve(run()).then(a,b)};return q;
 }};
 const provider=vi.fn(async()=>({data:{answer:'Respuesta documental.',sources:[],summary:'Resumen',document_type:'contrato',parties:[],key_points:[],obligations:[],deadlines:[],risks:[],recommendations:[]},usage:{total_tokens:100,input_tokens:80,output_tokens:20}}));
 const routes={}, quiet={log(){},warn(){},error(){}};
  const ctx=vm.createContext({console:quiet,z,Buffer,supabase,hasCanonicalDocumentReference,resolveAnalysisModel,honestEvidenceLocation,buildChatContext,buildChatSystemPrompt,buildChatUserPrompt,CHAT_LIMITS,getProCaseHeader,formatProCaseBlock,verifyDocumentClaims,buildAnalysisSystemPrompt,buildAnalysisUserPrompt,
  app:{get:(p,h)=>routes[`get ${p}`]=h,post:(p,h)=>routes[`post ${p}`]=h,delete:(p,h)=>routes[`delete ${p}`]=h},getUserIdFromToken:async()=>tokenUser,
 chatCompletion:provider,isAIProviderConfigured:()=>true,AI_DEFAULT_MODEL:'gpt-4o-mini',AI_CHAT_MAX_TOKENS:2400,AI_DOCUMENTS_BUCKET:'ai-documents',MAX_EXTRACTED_TEXT_CHARS:80000,
 pdfParse:async()=>({text:'Contrato documental de prueba con obligaciones entre partes.',numpages:1}),
 aiRateLimiter:new Map(),AI_RATE_WINDOW_MS:60000,AI_PROTECT_RATE_LIMIT_PER_MINUTE:30,AI_PROTECT_MAX_MONTHLY_TOKENS:20000000,AI_PROTECT_MAX_MONTHLY_REQUESTS:5000,AI_USAGE_CREDITS_PER_TOKEN:1000,
 capturePostHog:async()=>{},notificationsService:{notifyUser:async()=>{}},AIResearchRequestSchema:z.object({query:z.string()}),validateResearchQuery:()=>({valid:true})});
 for(const n of ast.statements){
  if(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>names.includes(d.name.getText(ast))))vm.runInContext(n.getText(ast),ctx);
  if(ts.isFunctionDeclaration(n)&&names.includes(n.name?.text))vm.runInContext(n.getText(ast),ctx);
  if(ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&Object.values(paths).some(([,p])=>p===n.expression.arguments[0]?.text))vm.runInContext(n.getText(ast),ctx);
 }
 async function call(name,body={},params={}){const [method,path]=paths[name];const res={statusCode:200,status(n){this.statusCode=n;return this;},json(b){this.body=b;return this;}};await routes[`${method} ${path}`]({headers:{authorization:'Bearer fixture'},params:{caseId:name==='provision'?caseId:workspaceId,id:id(10),...params},body},res);return res;}
  return {rows,provider,download,remove,createSignedUrl,rpc,call,ctx,supabase,asForeign:()=>{tokenUser=foreign;}};
}
describe('4.34B actual Core handlers and real entitlement/metering helpers',()=>{
 it('paid Pro uses its existing workspace at 3 documents: process/analyze/chat twice/reanalyze/intelligence',async()=>{
  const h=harness();
  expect((await h.call('process')).statusCode).toBe(200);
  expect(h.provider).toHaveBeenCalledTimes(0);
  expect((await h.call('analyze')).statusCode).toBe(200);
  expect((await h.call('intelligence')).statusCode).toBe(200);
  const conversation=await h.call('chatGet');expect(conversation.statusCode).toBe(200);
  for(const message of ['Primera pregunta sobre el contrato','Segunda pregunta sobre el contrato'])expect((await h.call('chat',{conversation_id:conversation.body.conversation.id,message})).statusCode).toBe(200);
  expect((await h.call('analyze')).statusCode).toBe(200);
  expect((await h.call('intelligence')).statusCode).toBe(200);
  expect(h.provider).toHaveBeenCalledTimes(4);
  expect(h.rows.ai_usage.map(r=>r.operation)).toEqual(['document_analysis','case_chat','case_chat','document_analysis']);
  expect(h.rpc).toHaveBeenCalledTimes(4);
  expect(h.rpc.mock.calls.every(([name,args])=>name==='increment_ai_usage_monthly'&&args.p_lawyer_id===user&&args.p_total_tokens===100)).toBe(true);
 });
 it('first canonical lazy provision without AI entitlement; workspace alone never grants analysis',async()=>{const h=harness({paid:false,linked:false,count:0});expect((await h.call('provision')).statusCode).toBe(200);expect(h.rows.lawyer_cases[0].ai_workspace_id).toBe(h.rows.ai_workspaces[0].id);expect(h.provider).not.toHaveBeenCalled();});
 it('free case with existing document cannot analyze',async()=>{const h=harness({paid:false});expect((await h.call('analyze')).statusCode).toBe(402);expect(h.provider).not.toHaveBeenCalled();});
 it.each(['process','analyze'])('forged storage prefix blocked before download: %s',async route=>{const h=harness();h.rows.ai_documents[0].file_path=`${foreign}/${workspaceId}/${id(10)}/original.pdf`;expect((await h.call(route)).statusCode).toBe(404);expect(h.download).not.toHaveBeenCalled();expect(h.provider).not.toHaveBeenCalled();});
 it('foreign workspace reference is denied',async()=>{const h=harness();h.rows.ai_workspaces[0].lawyer_id=foreign;expect((await h.call('process')).statusCode).toBe(404);expect(h.download).not.toHaveBeenCalled();});
 it.each(['provision','process','analyze','intelligence'])('cross-tenant %s denied',async route=>{const h=harness();h.asForeign();expect((await h.call(route)).statusCode).toBe(404);expect(h.download).not.toHaveBeenCalled();expect(h.provider).not.toHaveBeenCalled();});
 it('unknown model never reaches provider',async()=>{const h=harness();expect((await h.call('analyze',{model:'attacker/expensive-model'})).statusCode).toBe(400);expect(h.provider).not.toHaveBeenCalled();});
 it('existing selector model accepted',async()=>{const h=harness();expect((await h.call('analyze',{model:'openai/gpt-4o-mini'})).statusCode).toBe(200);expect(h.provider.mock.calls[0][0].model).toBe('openai/gpt-4o-mini');});
 it.each(['research'])('Pro advanced %s remains denied without provider',async route=>{const h=harness();expect((await h.call(route,{query:'Contrato y normativa aplicable'})).statusCode).toBe(403);expect(h.provider).not.toHaveBeenCalled();});
 // 4.34E: workflow/sync is deterministic Core for Pro (no gate, 0 provider); see workflowCore.test.mjs.
  it('monthly provider quota blocks analysis but not deterministic intelligence',async()=>{const h=harness();h.rows.ai_usage_monthly.push({lawyer_id:user,period_start:new Date().toISOString().slice(0,7)+'-01',total_tokens:20000000});expect((await h.call('analyze')).statusCode).toBe(429);expect((await h.call('intelligence')).statusCode).toBe(200);expect(h.provider).not.toHaveBeenCalled();});
  it('workspace 1/1 → CREATE SECOND denied at handler with quota code and no orphan',async()=>{
   const h=harness();const secondCase=id(50);
   h.rows.lawyer_cases.push({id:secondCase,lawyer_id:user,title:'Segundo',ai_workspace_id:null});
   const origFrom=h.supabase.from.bind(h.supabase);
   h.supabase.from=(table)=>{const q=origFrom(table);if(table!=='ai_workspaces')return q;
    q.insert=()=>({select:()=>({single:async()=>({data:null,error:{code:'P0001',message:'Alcanzaste el límite de 1 caso(s) de tu plan.'}})})});return q;};
   const res=await h.call('provision',{},{caseId:secondCase});
   expect(res.statusCode).toBe(403);expect(res.body.code).toBe('AI_LIMIT_REACHED');
   expect(h.rows.ai_workspaces.filter(w=>w.lawyer_id===user)).toHaveLength(1);
  });
  it('workspace 1/1 → USE EXISTING chat post passes at document limit',async()=>{
   const h=harness();
   h.rows.ai_documents.forEach(d=>{d.status='ready';d.extracted_text='Contrato con obligaciones y plazos suficientes para el test.';});
   const conversation=await h.call('chatGet');expect(conversation.statusCode).toBe(200);
   const res=await h.call('chat',{conversation_id:conversation.body.conversation.id,message:'Pregunta sobre el contrato'});
   expect(res.statusCode).toBe(200);expect(h.provider).toHaveBeenCalledTimes(1);
  });
  it('chat post with forged document_id blocked before provider',async()=>{
   const h=harness();
   h.rows.ai_documents.forEach(d=>{d.status='ready';d.extracted_text='Contrato con obligaciones y plazos suficientes para el test.';});
   h.rows.ai_documents[0].file_path=`${foreign}/${workspaceId}/${id(10)}/original.pdf`;
   const conversation=await h.call('chatGet');expect(conversation.statusCode).toBe(200);
   const res=await h.call('chat',{conversation_id:conversation.body.conversation.id,message:'Pregunta sobre el contrato',document_id:id(10)});
   expect(res.statusCode).toBe(403);expect(h.provider).not.toHaveBeenCalled();
  });
  it('chat post cross-tenant denied',async()=>{
   const h=harness();
   h.rows.ai_documents.forEach(d=>{d.status='ready';d.extracted_text='Contrato con obligaciones y plazos suficientes para el test.';});
   h.asForeign();
   const res=await h.call('chat',{conversation_id:id(60),message:'Pregunta sobre el contrato'});
   expect(res.statusCode).toBe(404);expect(h.provider).not.toHaveBeenCalled();
  });
  it('honest evidence locations are pure and never fabricate pages',()=>{
   expect(honestEvidenceLocation('document::abc::6')).toEqual({fragment_index:6,page_number:null});
   expect(honestEvidenceLocation(null)).toEqual({fragment_index:null,page_number:null});
   expect(honestEvidenceLocation('garbage')).toEqual({fragment_index:null,page_number:null});
   expect(fragmentIndexFromId('document::abc::0')).toBe(0);
  });
  it('analysis claims carry honest locations, never page numbers',async()=>{
   const h=harness();
   h.rows.ai_documents.forEach(d=>{d.status='ready';d.extracted_text='Contrato documental de prueba con obligaciones entre partes.';});
   h.provider.mockResolvedValueOnce({data:{answer:'Respuesta documental.',sources:[],summary:'Resumen',document_type:'contrato',parties:['partes del contrato documental'],key_points:['obligaciones entre partes'],obligations:['obligaciones entre partes'],deadlines:[],risks:[],recommendations:[]},usage:{total_tokens:100,input_tokens:80,output_tokens:20}});
   const analyzeRes = await h.call('analyze');
   expect(analyzeRes.statusCode).toBe(200);
   const claims=h.rows.ai_document_analyses[0].claims;
   expect(claims.length).toBeGreaterThan(0);
   expect(claims.every(c=>c.page_number===null&&Number.isInteger(c.fragment_index))).toBe(true);
  });
  it('reanalysis success replaces without duplicates',async()=>{
   const h=harness();
   h.rows.ai_documents.forEach(d=>{d.status='ready';d.extracted_text='Contrato documental de prueba con obligaciones entre partes.';});
   h.rows.ai_document_analyses.push({id:id(70),document_id:id(10),lawyer_id:user,workspace_id:workspaceId,summary:'previous'});
   expect((await h.call('analyze')).statusCode).toBe(200);
   const remaining=h.rows.ai_document_analyses.filter(a=>a.document_id===id(10));
   expect(remaining).toHaveLength(1);expect(remaining[0].summary).not.toBe('previous');
  });
  it('reanalysis DB failure preserves previous good analysis',async()=>{
   const h=harness();
   h.rows.ai_documents.forEach(d=>{d.status='ready';d.extracted_text='Contrato documental de prueba con obligaciones entre partes.';});
   h.rows.ai_document_analyses.push({id:id(70),document_id:id(10),lawyer_id:user,workspace_id:workspaceId,summary:'previous'});
   const origFrom=h.supabase.from.bind(h.supabase);
   h.supabase.from=(table)=>{const q=origFrom(table);if(table!=='ai_document_analyses')return q;
    q.insert=()=>({select:()=>({single:async()=>({data:null,error:{code:'XX000',message:'db down'}})})});return q;};
   const res=await h.call('analyze');
   expect(res.statusCode).toBe(500);expect(h.provider).toHaveBeenCalledTimes(1);
   const remaining=h.rows.ai_document_analyses.filter(a=>a.document_id===id(10));
   expect(remaining).toHaveLength(1);expect(remaining[0].summary).toBe('previous');
  });
  it('delete own document removes row and storage object',async()=>{
   const h=harness();
   const res=await h.call('del');
   expect(res.statusCode).toBe(200);expect(res.body).toMatchObject({deleted:true,storageCleaned:true});
   expect(h.remove).toHaveBeenCalledWith([`${user}/${workspaceId}/${id(10)}/original.pdf`]);
   expect(h.rows.ai_documents.some(d=>d.id===id(10))).toBe(false);
  });
  it('delete tolerates already-missing storage object and still cleans row',async()=>{
   const h=harness();
   h.remove.mockResolvedValueOnce({data:null,error:{message:'Not Found'}});
   const res=await h.call('del');
   expect(res.statusCode).toBe(200);expect(res.body).toMatchObject({deleted:true,storageCleaned:true});
   expect(h.rows.ai_documents.some(d=>d.id===id(10))).toBe(false);
  });
  it('delete storage hard failure keeps row and reports 502, no false success',async()=>{
   const h=harness();
   h.remove.mockResolvedValueOnce({data:null,error:{message:'Bucket unavailable'}});
   const res=await h.call('del');
   expect(res.statusCode).toBe(502);expect(res.body.code).toBe('AI_DOCUMENT_STORAGE_DELETE_FAILED');
   expect(h.rows.ai_documents.some(d=>d.id===id(10))).toBe(true);
  });
  it('delete cross-tenant denied without touching storage',async()=>{
   const h=harness();h.asForeign();
   const res=await h.call('del');
   expect(res.statusCode).toBe(404);expect(h.remove).not.toHaveBeenCalled();
   expect(h.rows.ai_documents.some(d=>d.id===id(10))).toBe(true);
  });
  it('open own document returns signed url for canonical path',async()=>{
   const h=harness();
   const res=await h.call('open');
   expect(res.statusCode).toBe(200);expect(res.body.signedUrl).toContain('https://');
   expect(h.createSignedUrl).toHaveBeenCalledWith(`${user}/${workspaceId}/${id(10)}/original.pdf`,3600);
  });
  it.each(['open','del'])('forged storage prefix denied before storage: %s',async route=>{
   const h=harness();h.rows.ai_documents[0].file_path=`${foreign}/${workspaceId}/${id(10)}/original.pdf`;
   const res=await h.call(route);
   expect(res.statusCode).toBe(404);expect(h.remove).not.toHaveBeenCalled();expect(h.createSignedUrl).not.toHaveBeenCalled();
  });
});
