import { createAIMetering } from './metering.mjs';
import { commercialQuotaForPlan, PRO_AI_ALLOWANCE } from './proAllowance.mjs';
import { randomUUID } from 'node:crypto';
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
const names = ['requireAILawyer','getAIDocumentOwned','getAIWorkspaceOwned','getLawyerCaseOwned','requireAIEntitlement','getAIConversationOwned','getOrCreateAIConversation','AIChatRequestSchema','AIChatResponseSchema','AIDocumentAnalysisSchema','getAIUsagePeriod','recordAIUsage','isAIOverRateLimit','checkAIProtectionLimits','getAILawyerSubscription','getAILawyerAccess','getProLawyerSubscription','getProLawyerAccess','requireAIAccess','AI_FEATURES_ALL','PLAN_FEATURES_SERVER','getPlanForAccess','serverCanUseAIFeature','extractTextFromStoredPdf','commercialQuotaForPlan'];
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
  const rpc=vi.fn(async(name,args)=>({data:name==='ai_begin_operation'?{operation_id:args.p_key,created:true}:name==='ai_finish_operation'?{id:args.p_operation,status:args.p_status<300?'succeeded':'failed',terminal:true}:null,error:null}));
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
  const ctx=vm.createContext({createAIMetering:options=>createAIMetering({...options,log:()=>{}}),commercialQuotaForPlan,PRO_AI_ALLOWANCE,AI_PROTECT_MAX_MONTHLY_TOKENS:20000000,AI_PROTECT_MAX_MONTHLY_REQUESTS:5000,console:quiet,z,Buffer,supabase,hasCanonicalDocumentReference,resolveAnalysisModel,honestEvidenceLocation,buildChatContext,buildChatSystemPrompt,buildChatUserPrompt,CHAT_LIMITS,getProCaseHeader,formatProCaseBlock,verifyDocumentClaims,buildAnalysisSystemPrompt,buildAnalysisUserPrompt,
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
 async function call(name,body={},params={}){const [method,path]=paths[name];const res={statusCode:200,status(n){this.statusCode=n;return this;},json(b){this.body=b;return this;}};await routes[`${method} ${path}`]({headers:{authorization:'Bearer fixture','x-ai-operation-id':randomUUID()},params:{caseId:name==='provision'?caseId:workspaceId,id:id(10),...params},body},res);return res;}
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
  expect(h.rpc.mock.calls.filter(([name])=>name==='ai_begin_operation').map(([,args])=>args.p_capability)).toEqual(['document_analysis','case_chat','case_chat','document_analysis']);
  expect(h.rpc.mock.calls.filter(([name])=>name==='ai_finish_operation')).toHaveLength(4);
 });
 it('first canonical lazy provision without AI entitlement; workspace alone never grants analysis',async()=>{const h=harness({paid:false,linked:false,count:0});expect((await h.call('provision')).statusCode).toBe(200);expect(h.rows.lawyer_cases[0].ai_workspace_id).toBe(h.rows.ai_workspaces[0].id);expect(h.provider).not.toHaveBeenCalled();});
 it('free case with existing document cannot analyze',async()=>{const h=harness({paid:false});expect((await h.call('analyze')).statusCode).toBe(402);expect(h.provider).not.toHaveBeenCalled();});
 it.each(['process','analyze'])('forged storage prefix blocked before download: %s',async route=>{const h=harness();h.rows.ai_documents[0].file_path=`${foreign}/${workspaceId}/${id(10)}/original.pdf`;expect((await h.call(route)).statusCode).toBe(404);expect(h.download).not.toHaveBeenCalled();expect(h.provider).not.toHaveBeenCalled();});
 it('foreign workspace reference is denied',async()=>{const h=harness();h.rows.ai_workspaces[0].lawyer_id=foreign;expect((await h.call('process')).statusCode).toBe(404);expect(h.download).not.toHaveBeenCalled();});
 it.each(['provision','process','analyze','intelligence'])('cross-tenant %s denied',async route=>{const h=harness();h.asForeign();expect((await h.call(route)).statusCode).toBe(404);expect(h.download).not.toHaveBeenCalled();expect(h.provider).not.toHaveBeenCalled();});
 it('unknown model never reaches provider',async()=>{const h=harness();expect((await h.call('analyze',{model:'attacker/expensive-model'})).statusCode).toBe(400);expect(h.provider).not.toHaveBeenCalled();});
 it('existing selector model accepted',async()=>{const h=harness();expect((await h.call('analyze',{model:'openai/gpt-4o-mini'})).statusCode).toBe(200);expect(h.provider.mock.calls[0][0].model).toBe('openai/gpt-4o-mini');});
  it.each(['research'])('4.38C Pro %s passes the entitlement gate (pipeline runs past 403)',async route=>{const h=harness();const res=await h.call(route,{query:'Contrato y normativa aplicable'});expect(res.statusCode).not.toBe(403);expect(res.body?.code).not.toBe('AI_FEATURE_NOT_AVAILABLE');});
  it('4.38C pro_limited includes jurisprudence; research/workflow/drafting stay gated',()=>{const h=harness();expect(vm.runInContext(`serverCanUseAIFeature('jurisprudence', 'pro_limited')`,h.ctx)).toBe(true);for(const feature of ['research','workflow_generation','document_drafting'])expect(vm.runInContext(`serverCanUseAIFeature('${feature}', 'pro_limited')`,h.ctx)).toBe(false);});
  it('4.38C pro routes pass commercial quotas to ai_begin_operation',async()=>{const h=harness();await h.call('analyze');h.rows.ai_documents.forEach(d=>{d.status='ready';d.extracted_text='Contrato con obligaciones y plazos suficientes para el test.';});const conversation=await h.call('chatGet');await h.call('chat',{conversation_id:conversation.body.conversation.id,message:'Pregunta sobre el contrato'});const begins=h.rpc.mock.calls.filter(([name])=>name==='ai_begin_operation').map(([,args])=>args);expect(begins).toHaveLength(2);expect(begins[0].p_analysis_limit).toBe(40);expect(begins[1].p_chat_limit).toBe(300);expect(begins[0].p_chat_limit).toBe(300);});
 // 4.34E: workflow/sync is deterministic Core for Pro (no gate, 0 provider); see workflowCore.test.mjs.
  it('monthly provider quota blocks analysis but not deterministic intelligence',async()=>{const h=harness();h.rpc.mockResolvedValueOnce({error:{message:'AI_MONTHLY_LIMIT_REACHED'}});expect((await h.call('analyze')).statusCode).toBe(429);expect((await h.call('intelligence')).statusCode).toBe(200);expect(h.provider).not.toHaveBeenCalled();});
  it('4.38C commercial chat limit maps to 429 with typed code before provider',async()=>{const h=harness();h.rows.ai_documents.forEach(d=>{d.status='ready';d.extracted_text='Contrato con obligaciones y plazos suficientes para el test.';});const conversation=await h.call('chatGet');h.rpc.mockResolvedValueOnce({error:{message:'AI_CHAT_LIMIT_REACHED'}});const res=await h.call('chat',{conversation_id:conversation.body.conversation.id,message:'Pregunta sobre el contrato'});expect(res.statusCode).toBe(429);expect(res.body.code).toBe('AI_CHAT_LIMIT_REACHED');expect(h.provider).not.toHaveBeenCalled();});
  it('4.39B document chat on processing doc fails typed with 0 provider/quota',async()=>{
   const h=harness();
   const conversation=await h.call('chatGet');expect(conversation.statusCode).toBe(200);
   const docId=h.rows.ai_documents[0].id;
   const res=await h.call('chat',{conversation_id:conversation.body.conversation.id,message:'¿De qué trata este documento?',document_id:docId});
   expect(res.statusCode).toBe(422);expect(res.body.code).toBe('AI_DOCUMENT_NOT_READY');
   expect(h.provider).not.toHaveBeenCalled();
  });
  it('4.39B document chat on ready-but-empty doc fails typed without provider',async()=>{
   const h=harness();
   h.rows.ai_documents.forEach(d=>{d.status='ready';d.extracted_text='  ';});
   const conversation=await h.call('chatGet');expect(conversation.statusCode).toBe(200);
   const res=await h.call('chat',{conversation_id:conversation.body.conversation.id,message:'¿De qué trata este documento?',document_id:h.rows.ai_documents[0].id});
   expect(res.statusCode).toBe(422);expect(res.body.code).toBe('AI_DOCUMENT_NOT_READY');
   expect(h.provider).not.toHaveBeenCalled();
  });
  it('4.39B document chat excludes shared history and carries selected authority; case chat keeps both',async()=>{
   const h=harness();
   h.rows.ai_documents.forEach(d=>{d.status='ready';d.extracted_text='Contrato con obligaciones y plazos suficientes para el test.';});
   const conversation=await h.call('chatGet');expect(conversation.statusCode).toBe(200);
   const cid=conversation.body.conversation.id;
   h.rows.ai_chat_messages.push({id:id(70),conversation_id:cid,workspace_id:workspaceId,lawyer_id:user,role:'user',content:'Pregunta previa sobre otro documento'},
    {id:id(71),conversation_id:cid,workspace_id:workspaceId,lawyer_id:user,role:'assistant',content:'Respuesta previa sobre otro documento'});
   const docRes=await h.call('chat',{conversation_id:cid,message:'¿De qué trata este documento?',document_id:h.rows.ai_documents[0].id});
   expect(docRes.statusCode).toBe(200);
   const docPrompt=h.provider.mock.calls[0][0].messages[0].content;
   expect(docPrompt).toContain('DOCUMENTO SELECCIONADO');
   expect(docPrompt).not.toContain('HISTORIAL RECIENTE');
   expect(docPrompt).not.toContain('Pregunta previa sobre otro documento');
   expect(h.provider.mock.calls[0][0].system).toContain('autoridad primaria');
   const caseRes=await h.call('chat',{conversation_id:cid,message:'Resume el caso'});
   expect(caseRes.statusCode).toBe(200);
   const casePrompt=h.provider.mock.calls[1][0].messages[0].content;
   expect(casePrompt).toContain('HISTORIAL RECIENTE');
   expect(casePrompt).not.toContain('DOCUMENTO SELECCIONADO');
   expect(h.provider.mock.calls[1][0].system).not.toContain('autoridad primaria');
  });
  it('4.38C pro provisions a second workspace (no commercial workspace cap), trial P0001 still 403',async()=>{
   const h=harness();const secondCase=id(50);
   h.rows.lawyer_cases.push({id:secondCase,lawyer_id:user,title:'Segundo',ai_workspace_id:null});
   const res=await h.call('provision',{},{caseId:secondCase});
   expect(res.statusCode).toBe(200);expect(res.body.created).toBe(true);
   expect(h.rows.ai_workspaces.filter(w=>w.lawyer_id===user)).toHaveLength(2);
   const h2=harness();const secondCase2=id(50);
   h2.rows.lawyer_cases.push({id:secondCase2,lawyer_id:user,title:'Segundo',ai_workspace_id:null});
   const origFrom=h2.supabase.from.bind(h2.supabase);
   h2.supabase.from=(table)=>{const q=origFrom(table);if(table!=='ai_workspaces')return q;
    q.insert=()=>({select:()=>({single:async()=>({data:null,error:{code:'P0001',message:'Alcanzaste el límite de 3 caso(s) de tu plan.'}})})});return q;};
   const res2=await h2.call('provision',{},{caseId:secondCase2});
   expect(res2.statusCode).toBe(403);expect(res2.body.code).toBe('AI_LIMIT_REACHED');
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

describe('4.35D corrected production model', () => {
 it('accepts the replacement for analysis and rejects the retired explicit slug', async () => {
  const h=harness();
  expect((await h.call('analyze',{model:'openai/gpt-oss-20b:free'})).statusCode).toBe(400);
  expect(h.provider).not.toHaveBeenCalled();
  expect(resolveAnalysisModel('openai/gpt-oss-20b:free','openai/gpt-oss-20b:free')).toBeNull();
  expect((await h.call('analyze',{model:'openai/gpt-oss-20b'})).statusCode).toBe(200);
  expect(h.provider.mock.calls[0][0].model).toBe('openai/gpt-oss-20b');
 });
 it.each([false,true])('Chat uses the configured default; document context=%s', async documentContext => {
  const h=harness();h.ctx.AI_DEFAULT_MODEL='openai/gpt-oss-20b';
  expect((await h.call('process')).statusCode).toBe(200);
  const conversation=await h.call('chatGet');
  const body={conversation_id:conversation.body.conversation.id,message:'Pregunta sobre el contrato',...(documentContext?{document_id:id(10)}:{})};
  expect((await h.call('chat',body)).statusCode).toBe(200);
  expect(h.provider).toHaveBeenCalledTimes(1);
  expect(h.provider.mock.calls[0][0].model).toBe('openai/gpt-oss-20b');
 });
});
