// @vitest-environment node
import { describe,it,expect,vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import express from 'express';
import ts from 'typescript';
import { createAuthorization,isPlatformAdmin } from './authorization.mjs';
import { createCompanyAuthorization } from './companyAuthorization.mjs';
import { confirmCompanyCancellation } from '../subscriptions/companyCancellation.mjs';
import { verifyPlatformAdmin } from '../../supabase/functions/_shared/adminAuthority.mjs';
const id=n=>`00000000-0000-4000-a000-${String(n).padStart(12,'0')}`;
const A=id(1),B=id(2),OWNER=id(3),OTHER=id(4),ADMIN=id(5),MEMBER=id(6),VIEWER=id(7),LAWYER=id(8),SUB=id(10),PLAN=id(11);
const src=readFileSync(new URL('../../server.mjs',import.meta.url),'utf8');
const ast=ts.createSourceFile('server.mjs',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const response=()=>({code:200,status(c){this.code=c;return this},json(body){this.body=body;return this}});
function setup(user={id:OWNER,app_metadata:{},user_metadata:{}}){
 const db={companies:[{id:A,user_id:OWNER,name:'A',contact_email:'a@example.test'},{id:B,user_id:OTHER,name:'B'}],company_members:[{company_id:A,user_id:ADMIN,role:'admin',joined_at:'2026-09-01'},{company_id:A,user_id:MEMBER,role:'member',joined_at:'2026-09-01'},{company_id:A,user_id:VIEWER,role:'viewer',joined_at:'2026-09-01'}],company_subscriptions:[{id:SUB,company_id:A,status:'active',mercadopago_preapproval_id:'MP1',company:{name:'A',contact_email:'a@example.test'},plan:{name:'Plan'}}],subscription_plans:[{id:PLAN,name:'Plan',price_clp:10000}],profiles:[{id:user.id,user_id:user.id,role:'admin'}],subscription_payment_events:[],booking_leads:[]};
 const writes=[],reads=[];
 const supabase={auth:{getUser:vi.fn(async t=>({data:{user:t==='valid'?user:null},error:t==='valid'?null:Error('invalid')})),admin:{getUserById:vi.fn(async()=>({data:{user:{email:'a@example.test'}}}))}},from:vi.fn(table=>{
  let operation='select',payload,single=false,filters=[];
  const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},order(){return q},limit(){return q},single(){single=true;return q},maybeSingle(){single=true;return q},update(v){operation='update';payload=v;return q},insert(v){operation='insert';payload=v;return q},upsert(v){operation='upsert';payload=v;return q},then(resolve,reject){return Promise.resolve().then(()=>{
   db[table]??=[];let rows=db[table].filter(r=>filters.every(f=>f(r)));
   if(operation==='select')reads.push(table);else{writes.push({table,operation,payload});if(operation==='update')rows.forEach(r=>Object.assign(r,payload));else{rows=[{id:id(90),...payload}];db[table].push(...rows)}}
   return{data:structuredClone(single?rows[0]??null:rows),error:null,count:rows.length};
  }).then(resolve,reject)}};return q;
 }),rpc:vi.fn(async(name,args)=>{const sub=db.company_subscriptions.find(s=>s.id===args.p_subscription_id);sub.status='cancelled';db.companies.find(c=>c.id===args.p_company_id).status='cancelled';return{error:null}})};
 const provider=vi.fn(async(url,options)=>({ok:true,status:200,json:async()=>options?.method==='POST'?{id:'MP2',init_point:'https://mp.example.test'}:{status:'cancelled'}}));
 const emails=vi.fn(async()=>({data:{id:'mail'}}));const auth=createAuthorization({supabase});const companyAuthorization=createCompanyAuthorization({supabase,authenticate:auth.authenticate});
 const routes=new Map();const app=Object.fromEntries(['get','post','put','patch','delete'].map(m=>[m,(path,...handlers)=>routes.set(`${m.toUpperCase()} ${path}`,handlers)]));
 const ctx={app,supabase,...auth,isPlatformAdmin,companyAuthorization,confirmCompanyCancellation,fetch:provider,resend:{emails:{send:emails}},sendSubscriptionEmail:emails,subscriptionEmailTemplates:{cancelled:()=>''},mercadopagoAccessToken:'mock',resolveWebhookUrl:()=>null,appUrl:'https://local.test',safeTrim:x=>x?.trim()||null,console:{log(){},error(){},warn(){}}};
 for(const node of ast.statements){const call=ts.isExpressionStatement(node)?node.expression:null;if(!call||!ts.isCallExpression(call)||!ts.isPropertyAccessExpression(call.expression)||call.expression.expression.getText(ast)!=='app'||!ts.isStringLiteral(call.arguments[0]))continue;const path=call.arguments[0].text;
 if(path==='/api/profiles'||path.startsWith('/api/admin/')||path.startsWith('/api/empresas/'))vm.runInNewContext(node.getText(ast),ctx);
 }
 async function execute(route,overrides={}){const req={headers:{authorization:'Bearer valid'},body:{},query:{},params:{},...overrides};const res=response();let index=0;const next=async()=>{const h=routes.get(route)[index++];if(h)await h(req,res,next)};await next();return res}
 return{db,supabase,provider,emails,writes,reads,execute,routes};
}
const subscriptionRoutes=[['GET /api/empresas/subscription/:companyId',{params:{companyId:A}}],['POST /api/empresas/subscription/create',{body:{companyId:A,planId:PLAN}}],['POST /api/empresas/subscription/:subscriptionId/cancel',{params:{subscriptionId:SUB}}]];
describe('Actual Express registrations: Empresas billing authorization',()=>{
 for(const [route,request]of subscriptionRoutes){
  for(const token of [undefined,'Bearer invalid','Basic valid'])it(`${route} rejects ${token} before DB/provider`,async()=>{const s=setup();const r=await s.execute(route,{...request,headers:{authorization:token}});expect(r.code).toBe(401);expect(s.supabase.from).not.toHaveBeenCalled();expect(s.provider).not.toHaveBeenCalled()});
  for(const uid of [OTHER,MEMBER,VIEWER,LAWYER])it(`${route} rejects non-admin company user ${uid}`,async()=>{const s=setup({id:uid,app_metadata:{},user_metadata:{role:'admin',company_id:A}});const r=await s.execute(route,request);expect(r.code).toBe(403);expect(s.writes).toEqual([]);expect(s.provider).not.toHaveBeenCalled()});
  for(const uid of [OWNER,ADMIN])it(`${route} allows owner/company admin ${uid}`,async()=>{const s=setup({id:uid});if(route.endsWith('/create'))s.db.company_subscriptions=[];const r=await s.execute(route,request);expect(r.code).toBe(200)});
  it(`${route} rejects forged companyId B`,async()=>{const s=setup();const r=await s.execute(route,{...request,body:{...request.body,companyId:B},query:{companyId:B}});expect(r.code).toBe(403);expect(s.provider).not.toHaveBeenCalled()});
 }
 it('platform admin without membership cannot administer company subscriptions',async()=>{const s=setup({id:OTHER,app_metadata:{role:'admin'}});expect((await s.execute(subscriptionRoutes[2][0],subscriptionRoutes[2][1])).code).toBe(403)});
});
describe('Actual Empresas cancel handler: provider and local integrity',()=>{
 const cancel=s=>s.execute(subscriptionRoutes[2][0],subscriptionRoutes[2][1]);
 for(const status of [400,401,404,503])it(`MP ${status} preserves active and no local writes`,async()=>{const s=setup();s.provider.mockResolvedValue({ok:false,status,json:async()=>({error:'failed'})});const r=await cancel(s);expect(r.code).toBe(502);expect(s.db.company_subscriptions[0].status).toBe('active');expect(s.supabase.rpc).not.toHaveBeenCalled();expect(s.emails).not.toHaveBeenCalled()});
 it('network error preserves active',async()=>{const s=setup();s.provider.mockRejectedValue(Error('network'));expect((await cancel(s)).body.code).toBe('PROVIDER_UNREACHABLE');expect(s.supabase.rpc).not.toHaveBeenCalled()});
 it('unconfirmed 200 does not cancel',async()=>{const s=setup();s.provider.mockResolvedValue({ok:true,status:200,json:async()=>({status:'authorized'})});expect((await cancel(s)).code).toBe(502);expect(s.supabase.rpc).not.toHaveBeenCalled()});
 it('confirmed cancellation persists through service-only atomic RPC',async()=>{const s=setup();expect((await cancel(s)).code).toBe(200);expect(s.supabase.rpc).toHaveBeenCalledWith('cancel_company_subscription_confirmed',{p_subscription_id:SUB,p_company_id:A,p_preapproval_id:'MP1'});expect(s.db.company_subscriptions[0].status).toBe('cancelled');expect(s.db.companies[0].status).toBe('cancelled')});
 it('provider confirmation followed by DB failure exposes reconciliation, retry repairs',async()=>{const s=setup();s.supabase.rpc.mockResolvedValueOnce({error:{code:'08006'}});const r=await cancel(s);expect(r.code).toBe(503);expect(r.body.code).toBe('RECONCILIATION_REQUIRED');expect(r.body.provider_cancelled).toBe(true);expect(s.emails).not.toHaveBeenCalled();expect(s.db.company_subscriptions[0].status).toBe('active');s.provider.mockResolvedValueOnce({ok:false,status:400,json:async()=>({message:'already cancelled'})}).mockResolvedValueOnce({ok:true,status:200,json:async()=>({status:'cancelled'})});expect((await cancel(s)).code).toBe(200);expect(s.db.company_subscriptions[0].status).toBe('cancelled')});
 it('RPC exception after provider success returns reconciliation failure',async()=>{const s=setup();s.supabase.rpc.mockRejectedValueOnce(Error('connection lost'));const r=await cancel(s);expect(r.code).toBe(503);expect(r.body.code).toBe('RECONCILIATION_REQUIRED');expect(s.emails).not.toHaveBeenCalled()});
 it('already locally cancelled returns success without provider or emails',async()=>{const s=setup();s.db.company_subscriptions[0].status='cancelled';expect((await cancel(s)).body.already_cancelled).toBe(true);expect(s.provider).not.toHaveBeenCalled();expect(s.emails).not.toHaveBeenCalled()});
 it('missing provider identity requires reconciliation',async()=>{const s=setup();s.db.company_subscriptions[0].mercadopago_preapproval_id=null;expect((await cancel(s)).body.code).toBe('RECONCILIATION_REQUIRED');expect(s.supabase.rpc).not.toHaveBeenCalled()});
});
describe('Actual admin and profile endpoints',()=>{
 for(const route of ['GET /api/admin/booking-leads-count','POST /api/admin/notify-lawyers']){
  for(const fields of [{user_metadata:{role:'admin'}},{user_metadata:{is_admin:true}},{profile:{role:'admin'}},{email:'gigfmedia@icloud.com'}])it(`${route} rejects editable authority ${JSON.stringify(fields)}`,async()=>{const s=setup({id:OWNER,...fields});expect((await s.execute(route)).code).toBe(403);expect(s.supabase.from).not.toHaveBeenCalled();expect(s.emails).not.toHaveBeenCalled()});
  for(const token of [undefined,'Bearer invalid'])it(`${route} rejects missing/invalid token ${token}`,async()=>{const s=setup();expect((await s.execute(route,{headers:{authorization:token}})).code).toBe(401)});
  for(const role of ['admin','superadmin'])it(`${route} allows trusted ${role}`,async()=>{const s=setup({id:OWNER,app_metadata:{role}});const r=await s.execute(route,{body:{testMode:true,testEmail:'test@example.test'}});expect(r.code).toBe(200);if(route.includes('notify'))expect(s.emails).toHaveBeenCalledTimes(1)});
 }
 it('public profile repair requires token',async()=>{const s=setup();expect((await s.execute('POST /api/profiles',{headers:{}})).code).toBe(401)});
 for(const role of ['admin','superadmin',' ADMIN '])it(`profile endpoint rejects ${role}`,async()=>{const s=setup();expect((await s.execute('POST /api/profiles',{body:{userId:OWNER,email:'u@example.test',role}})).code).toBe(403);expect(s.writes).toEqual([])});
 it('profile endpoint rejects another userId',async()=>{const s=setup();expect((await s.execute('POST /api/profiles',{body:{userId:OTHER,email:'u@example.test',role:'client'}})).code).toBe(403)});
 it('own ordinary profile update preserved',async()=>{const s=setup();expect((await s.execute('POST /api/profiles',{body:{userId:OWNER,email:'u@example.test',role:'lawyer',firstName:'Updated'}})).code).toBe(200);expect(s.writes[0].payload.first_name).toBe('Updated')});
});

describe('Real Edge handlers, all dependencies local',()=>{
 for(const name of ['delete-user-admin','delete-user-v2'])for(const [label,fields,token,expected]of [
 ['no token',{},null,401],['invalid token',{},'Bearer invalid',401],['normal user',{},'Bearer valid',403],['profile admin',{profile:{role:'admin'}},'Bearer valid',403],['profile lawyer',{profile:{role:'lawyer'}},'Bearer valid',403],['metadata admin',{user_metadata:{role:'admin'}},'Bearer valid',403],['metadata flag',{user_metadata:{is_admin:true}},'Bearer valid',403],['email',{email:'gigfmedia@icloud.com'},'Bearer valid',403],['admin',{app_metadata:{role:'admin'}},'Bearer valid',200],['superadmin',{app_metadata:{role:'superadmin'}},'Bearer valid',200],
 ])it(`${name}: ${label}`,async()=>{
  const edgeSource=readFileSync(new URL(`../../supabase/functions/${name}/index.ts`,import.meta.url),'utf8');const a=ts.createSourceFile('edge.ts',edgeSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);const withoutImports=a.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(a)).join('\n');let handler;
  const deleteUser=vi.fn(async()=>({error:null})),from=vi.fn(()=>{const q={delete:()=>q,eq:()=>q,then:resolve=>Promise.resolve({error:null}).then(resolve)};return q});
  const client={auth:{getUser:vi.fn(async t=>({data:{user:t==='valid'?{id:OWNER,...fields}:null},error:t==='valid'?null:Error('invalid')})),admin:{deleteUser}},from};
  vm.runInNewContext(ts.transpileModule(withoutImports,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText,{serve:h=>{handler=h},createClient:()=>client,Deno:{env:{get:()=> 'mock-config'}},verifyPlatformAdmin,isPlatformAdmin,Response,Headers,console:{error(){},log(){}}});
  const r=await handler(new Request('https://edge.example.test',{method:'POST',headers:token?{Authorization:token}:{},body:JSON.stringify({userId:OTHER})}));expect(r.status).toBe(expected);expect(deleteUser).toHaveBeenCalledTimes(expected===200?1:0);if(expected!==200)expect(from).not.toHaveBeenCalled();
 });
});

describe('Express routing preserves static empresa endpoints',()=>{
 for(const path of ['/api/admin/empresas/metrics','/api/admin/empresas/requests','/api/admin/empresas/abc'])it(path,()=>{
  const {routes}=setup();const router=express.Router();
  for(const [key]of routes)if(key.startsWith('GET /api/admin/empresas')){const registered=key.slice(4);router.get(registered,(_req,res)=>res.json({registered}));}
  const res=response();router.handle({method:'GET',url:path,headers:{}},res,()=>{});
  expect(res.body.registered).toBe(path.endsWith('/abc')?'/api/admin/empresas/:id':path);
 });
});
