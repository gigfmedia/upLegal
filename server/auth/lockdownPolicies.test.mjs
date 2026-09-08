// @vitest-environment node
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const id=n=>`00000000-0000-4000-a000-${String(n).padStart(12,'0')}`;
const user=id(1), lawyer=id(2), other=id(3), admin=id(4), member=id(5), company=id(10), sub=id(11);
let db;
const migration=name=>readFileSync(new URL(`../../supabase/migrations/${name}.sql`,import.meta.url),'utf8');
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT (auth.jwt()->>'sub')::uuid$$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT auth.jwt()->>'role'$$;
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
 CREATE TABLE profiles(id uuid PRIMARY KEY,user_id uuid,role text,display_name text);
 CREATE TABLE payments(id uuid PRIMARY KEY,user_id uuid,lawyer_id uuid,amount integer);
 CREATE TABLE platform_settings(id uuid PRIMARY KEY,client_surcharge_percent numeric);
 CREATE TABLE payout_logs(id uuid PRIMARY KEY,status text);
 CREATE TABLE companies(id uuid PRIMARY KEY,user_id uuid,status text,updated_at timestamptz);
 CREATE TABLE company_members(id uuid PRIMARY KEY,company_id uuid,user_id uuid,role text,joined_at timestamptz,created_at timestamptz);
 CREATE TABLE company_requests(id uuid PRIMARY KEY,company_id uuid,user_id uuid,lawyer_id uuid,assigned_by uuid);
 CREATE TABLE company_budgets(id uuid PRIMARY KEY,company_id uuid,request_id uuid);
 CREATE TABLE legal_documents(id uuid PRIMARY KEY,company_id uuid,folder_id uuid);
 CREATE TABLE legal_folders(id uuid PRIMARY KEY,company_id uuid,parent_id uuid);
 CREATE TABLE company_subscriptions(id uuid PRIMARY KEY,company_id uuid,mercadopago_preapproval_id text,status text,cancel_at_period_end boolean,updated_at timestamptz);
 INSERT INTO profiles VALUES('${user}','${user}','client','User'),('${lawyer}','${lawyer}','lawyer','Lawyer'),('${other}','${other}','admin','Forged legacy admin'),('${admin}','${admin}','client','Trusted admin');
 INSERT INTO payments VALUES('${id(20)}','${user}','${lawyer}',55000),('${id(21)}','${other}','${other}',55000);
 INSERT INTO platform_settings VALUES('${id(30)}',0.1);
 INSERT INTO payout_logs VALUES('${id(31)}','completed');
 INSERT INTO companies VALUES('${company}','${user}','active',now());
 INSERT INTO company_members VALUES('${id(40)}','${company}','${admin}','admin',now(),now()),('${id(41)}','${company}','${member}','member',now(),now());
 INSERT INTO company_subscriptions VALUES('${sub}','${company}','MP1','active',false,now());
 GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;
 ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
 ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
 ALTER TABLE payout_logs ENABLE ROW LEVEL SECURITY;
 CREATE POLICY platform_settings_select_public ON platform_settings FOR SELECT USING(true);
 CREATE POLICY legacy_subscriptions ON company_subscriptions USING(true) WITH CHECK(true);
 DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['companies','company_members','company_requests','company_budgets','legal_documents','legal_folders'] LOOP
 EXECUTE format('CREATE POLICY legacy ON %I USING(true) WITH CHECK(true)',t); END LOOP; END $$;
 `);
 await db.exec(migration('20240927000100_fix_profiles_rls_conditions'));
 const payments=migration('20240927020000_create_payments_tables');
 await db.exec(payments.slice(payments.indexOf('CREATE POLICY "Users'),payments.indexOf('-- Create a function to update')));
 await db.exec(migration('20260913000000_company_authorization_authorities'));
 await db.exec(migration('20260915000000_authorization_lockdown'));
 // Simulate a legacy SECURITY DEFINER RPC: role trigger must still protect callers.
 await db.exec(`CREATE FUNCTION test_profile_rpc() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$UPDATE public.profiles SET role='admin' WHERE id=auth.uid()$$; GRANT EXECUTE ON FUNCTION test_profile_rpc() TO authenticated;`);
},30000);
afterAll(async()=>db?.close());
async function as(uid,run,app={},role='authenticated'){
 await db.exec(`BEGIN; SET LOCAL ROLE ${role}`);
 await db.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:uid,role,app_metadata:app,user_metadata:{role:'admin',is_admin:true},email:'gigfmedia@icloud.com'})]);
 try{return await run()}finally{await db.exec('ROLLBACK')}
}
describe('4B-1 real PostgreSQL authorization',()=>{
 for(const role of ['admin','superadmin',' ADMIN '])it(`profile escalation to ${role} denied`,async()=>{
  await expect(as(user,()=>db.query('UPDATE profiles SET role=$1 WHERE id=$2',[role,user]))).rejects.toMatchObject({code:'42501'});
 });
 it('insert privileged profile denied',async()=>{await expect(as(id(9),()=>db.query("INSERT INTO profiles(id,user_id,role) VALUES($1,$1,'admin')",[id(9)]))).rejects.toMatchObject({code:'42501'})});
 it('upsert privileged profile denied',async()=>{await expect(as(user,()=>db.query("INSERT INTO profiles(id,user_id,role) VALUES($1,$1,'superadmin') ON CONFLICT(id) DO UPDATE SET role=excluded.role",[user]))).rejects.toMatchObject({code:'42501'})});
 it('SECURITY DEFINER RPC cannot bypass role trigger',async()=>{await expect(as(user,()=>db.exec('SELECT test_profile_rpc()'))).rejects.toMatchObject({code:'42501'})});
 it('legitimate profile updates and nonprivileged classification preserved',async()=>{
  const r=await as(user,()=>db.query("UPDATE profiles SET display_name='Updated',role='company' WHERE id=$1 RETURNING role,display_name",[user]));expect(r.rows).toEqual([{role:'company',display_name:'Updated'}]);
 });
 it('legacy admin profile can edit ordinary metadata without being demoted',async()=>{const r=await as(other,()=>db.query("UPDATE profiles SET display_name='Updated' WHERE id=$1 RETURNING role",[other]));expect(r.rows[0].role).toBe('admin')});
 for(const uid of [user,lawyer])it(`legitimate payment owner ${uid} sees own row only`,async()=>{const r=await as(uid,()=>db.query('SELECT id FROM payments'));expect(r.rows).toEqual([{id:id(20)}])});
 it('profiles.role admin cannot read/update another payment',async()=>{
  const r=await as(other,()=>db.query('SELECT id FROM payments'));expect(r.rows).toEqual([{id:id(21)}]);
  const w=await as(other,()=>db.query('UPDATE payments SET amount=1 WHERE id=$1 RETURNING id',[id(20)]));expect(w.rows).toEqual([]);
 });
 it('ordinary owner cannot mutate financial amount',async()=>{const r=await as(user,()=>db.query('UPDATE payments SET amount=1 RETURNING id'));expect(r.rows).toEqual([])});
 for(const role of ['admin','superadmin'])it(`trusted ${role} reads and updates payments`,async()=>{
  const r=await as(admin,()=>db.query('SELECT id FROM payments'),{role});expect(r.rows).toHaveLength(2);
  const w=await as(admin,()=>db.query('UPDATE payments SET amount=100 RETURNING id'),{role});expect(w.rows).toHaveLength(2);
 });
 it('public cannot read payments',async()=>{const r=await as(null,()=>db.query('SELECT * FROM payments'),{},'anon');expect(r.rows).toEqual([])});
 it('settings public reads preserved, forged admin writes denied',async()=>{
  expect((await as(null,()=>db.query('SELECT * FROM platform_settings'),{},'anon')).rows).toHaveLength(1);
  expect((await as(other,()=>db.query('UPDATE platform_settings SET client_surcharge_percent=0 RETURNING id'))).rows).toEqual([]);
  expect((await as(admin,()=>db.query('UPDATE platform_settings SET client_surcharge_percent=0 RETURNING id'),{role:'admin'})).rows).toHaveLength(1);
 });
 it('payout logs require trusted admin claims',async()=>{
  expect((await as(other,()=>db.query('SELECT * FROM payout_logs'))).rows).toEqual([]);
  expect((await as(admin,()=>db.query('SELECT * FROM payout_logs'),{role:'admin'})).rows).toHaveLength(1);
 });
 for(const uid of [user,admin])it(`company billing owner/admin ${uid} reads own subscription`,async()=>expect((await as(uid,()=>db.query('SELECT * FROM company_subscriptions'))).rows).toHaveLength(1));
 for(const uid of [other,member])it(`company non-admin ${uid} cannot read subscription`,async()=>expect((await as(uid,()=>db.query('SELECT * FROM company_subscriptions'))).rows).toEqual([]));
 it('browser cannot self-activate subscription even as company owner',async()=>{await expect(as(user,()=>db.exec("UPDATE company_subscriptions SET status='active'"))).rejects.toMatchObject({code:'42501'})});
 it('browser cannot call cancellation RPC',async()=>{await expect(as(user,()=>db.query('SELECT cancel_company_subscription_confirmed($1,$2,$3)',[sub,company,'MP1']))).rejects.toMatchObject({code:'42501'})});
 it('service-role cancellation atomically updates both records',async()=>{
  await as(null,async()=>{await db.query('SELECT cancel_company_subscription_confirmed($1,$2,$3)',[sub,company,'MP1']);expect((await db.query('SELECT status FROM company_subscriptions')).rows[0].status).toBe('cancelled');expect((await db.query('SELECT status FROM companies')).rows[0].status).toBe('cancelled')},{},'service_role');
 });
 it('wrong company/provider identity is rejected',async()=>{await expect(as(null,()=>db.query('SELECT cancel_company_subscription_confirmed($1,$2,$3)',[sub,company,'OTHER']),{},'service_role')).rejects.toMatchObject({code:'40001'})});
 it('failure updating company rolls back subscription cancellation too',async()=>{
  await db.exec("ALTER TABLE companies ADD CONSTRAINT test_company_failure CHECK(status <> 'cancelled')");
  await expect(as(null,()=>db.query('SELECT cancel_company_subscription_confirmed($1,$2,$3)',[sub,company,'MP1']),{},'service_role')).rejects.toMatchObject({code:'23514'});
  expect((await db.query('SELECT status FROM company_subscriptions')).rows[0].status).toBe('active');
  await db.exec('ALTER TABLE companies DROP CONSTRAINT test_company_failure');
 });
});
