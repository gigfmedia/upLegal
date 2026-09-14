-- 4.34B integration/security tests: new synthetic identities only, always rolled back.
BEGIN;
DO $test$
DECLARE
 a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); w uuid; c uuid; d uuid;
 f record; role_name text; table_name text; n integer; i integer; legacy uuid;
BEGIN
 INSERT INTO auth.users(id,email) VALUES(a,a::text||'@example.invalid'),(b,b::text||'@example.invalid');
 INSERT INTO public.profiles(id,user_id,role,email,first_name,last_name)
 VALUES(a,a,'lawyer',a::text||'@example.invalid','QA','4.34B'),(b,b,'lawyer',b::text||'@example.invalid','QA','4.34B')
 ON CONFLICT(id) DO UPDATE SET role='lawyer';
 SET LOCAL ROLE service_role;
 INSERT INTO public.lawyer_subscriptions(lawyer_id,status,current_period_start,current_period_end)
 VALUES(a,'active',now(),now()+interval '1 month');
 INSERT INTO public.ai_subscriptions(lawyer_id,status,plan,current_period_end)
 VALUES(b,'expired','essential',now()-interval '1 day') RETURNING id INTO legacy;
 INSERT INTO public.lawyer_cases(lawyer_id,title,source) VALUES(a,'4.34B rollback fixture','LAWYER_DIRECT') RETURNING id INTO c;
 INSERT INTO public.ai_workspaces(lawyer_id,name) VALUES(a,'4.34B rollback fixture') RETURNING id INTO w;
 UPDATE public.lawyer_cases SET ai_workspace_id=w WHERE id=c;
 BEGIN
   INSERT INTO public.ai_workspaces(lawyer_id,name) VALUES(a,'Must exceed quota');
   RAISE EXCEPTION 'Workspace #2 quota failed';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN
   IF SQLERRM='Workspace #2 quota failed' THEN RAISE; END IF;
 END;
 RESET ROLE;
 -- All overloads: client execution denied, valid trusted call works, negatives rejected.
 FOR f IN SELECT p.oid::regprocedure AS signature,pg_get_function_identity_arguments(p.oid) AS args
 FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
 WHERE ns.nspname='public' AND p.proname='increment_ai_usage_monthly'
 LOOP
  IF has_function_privilege('anon',f.signature,'EXECUTE') OR has_function_privilege('authenticated',f.signature,'EXECUTE') THEN RAISE EXCEPTION 'Usage EXECUTE leak'; END IF;
 END LOOP;
 SET LOCAL ROLE service_role;
 PERFORM public.increment_ai_usage_monthly(a,current_date,current_date+30,100,1,1,0,0,0.01);
 FOR i IN 1..6 LOOP
   BEGIN
    PERFORM public.increment_ai_usage_monthly(a,current_date,current_date+30,
      CASE WHEN i=1 THEN -1 ELSE 0 END,CASE WHEN i=2 THEN -1 ELSE 0 END,
      CASE WHEN i=3 THEN -1 ELSE 0 END,CASE WHEN i=4 THEN -1 ELSE 0 END,
      CASE WHEN i=5 THEN -1 ELSE 0 END,CASE WHEN i=6 THEN -1 ELSE 0 END::numeric);
    RAISE EXCEPTION 'Negative quantity accepted';
   EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 END LOOP;
 BEGIN
  PERFORM public.increment_ai_usage_monthly(a,current_date,current_date+30,-1::bigint,0::bigint,0,0,0::numeric);
  RAISE EXCEPTION 'Negative bigint usage accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 RESET ROLE;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
  PERFORM set_config('request.jwt.claim.sub',b::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',b,'role',role_name)::text,true);
  EXECUTE format('SET LOCAL ROLE %I',role_name);
  BEGIN
   PERFORM public.increment_ai_usage_monthly(a,current_date,current_date+30,1,1,1,0,0,0::numeric);
   RAISE EXCEPTION 'Client changed other usage';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   PERFORM public.increment_ai_usage_monthly(b,current_date,current_date+30,-1,0,0,0,0,0::numeric);
   RAISE EXCEPTION 'Client reduced own usage';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   INSERT INTO public.ai_subscriptions(lawyer_id,plan,status,current_period_end) VALUES(b,'essential','active',now()+interval '1 year');
   RAISE EXCEPTION 'Client self grant';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   UPDATE public.ai_subscriptions SET status='active',current_period_end=now()+interval '1 year' WHERE id=legacy;
   RAISE EXCEPTION 'Client self promotion';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  FOREACH table_name IN ARRAY ARRAY['ai_lawyer_invites','ai_document_analyses','ai_chat_messages'] LOOP
   BEGIN EXECUTE format('INSERT INTO public.%I DEFAULT VALUES',table_name); RAISE EXCEPTION 'Client fabricated output'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
   BEGIN EXECUTE format('DELETE FROM public.%I WHERE false',table_name); RAISE EXCEPTION 'Client deleted output'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  END LOOP;
  BEGIN PERFORM 1 FROM public.ai_lawyer_invites LIMIT 1; RAISE EXCEPTION 'Public invite read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
 END LOOP;
 -- Own legacy SELECT remains, trusted promotion/demotion remains (fixture only).
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 SET LOCAL ROLE authenticated;
 SELECT count(*) INTO n FROM public.ai_subscriptions WHERE id=legacy;
 IF n<>1 THEN RAISE EXCEPTION 'Legacy read lost'; END IF;
 RESET ROLE;
 SET LOCAL ROLE service_role;
 UPDATE public.ai_subscriptions SET status='active',current_period_end=now()+interval '1 day' WHERE id=legacy;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trusted legacy update lost'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  -- Client upload→delete round-trip still works under hardened policies.
  -- Also pins the DEFAULT 'none'/'pending' assumption: the INSERT omits both.
  d:=gen_random_uuid();
  INSERT INTO public.ai_documents(id,lawyer_id,workspace_id,original_filename,file_path,file_size_bytes,mime_type,status)
  VALUES(d,a,w,'roundtrip.pdf',a::text||'/'||w::text||'/'||d::text||'/original.pdf',100,'application/pdf','pending');
  SELECT count(*) INTO n FROM public.ai_documents WHERE id=d;
  IF n<>1 THEN RAISE EXCEPTION 'Client canonical insert lost'; END IF;
  DELETE FROM public.ai_documents WHERE id=d;
  SELECT count(*) INTO n FROM public.ai_documents WHERE lawyer_id=a;
  IF n<>0 THEN RAISE EXCEPTION 'Client own delete lost'; END IF;
  FOR i IN 1..3 LOOP
  d:=gen_random_uuid();
  INSERT INTO public.ai_documents(id,lawyer_id,workspace_id,original_filename,file_path,file_size_bytes,mime_type,status)
  VALUES(d,a,w,'fixture.pdf',a::text||'/'||w::text||'/'||d::text||'/original.pdf',100,'application/pdf','pending');
 END LOOP;
 BEGIN
  d:=gen_random_uuid();
  INSERT INTO public.ai_documents(id,lawyer_id,workspace_id,original_filename,file_path,file_size_bytes,mime_type,status)
  VALUES(d,a,w,'fixture.pdf',a::text||'/'||w::text||'/'||d::text||'/original.pdf',100,'application/pdf','pending');
  RAISE EXCEPTION 'Document #4 quota failed';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM='Document #4 quota failed' THEN RAISE; END IF; END;
 RESET ROLE;
 -- Foreign workspace/path metadata must fail RLS even for an entitled legacy owner.
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 BEGIN
  d:=gen_random_uuid();
  INSERT INTO public.ai_documents(id,lawyer_id,workspace_id,original_filename,file_path,file_size_bytes,mime_type,status)
  VALUES(d,b,w,'forged.pdf',a::text||'/'||w::text||'/'||d::text||'/original.pdf',100,'application/pdf','pending');
  RAISE EXCEPTION 'Forged document accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 SELECT count(*) INTO n FROM public.ai_documents WHERE workspace_id=w;
 IF n<>0 THEN RAISE EXCEPTION 'Cross-tenant document read'; END IF;
 BEGIN UPDATE public.ai_documents SET file_path='forged' WHERE workspace_id=w; RAISE EXCEPTION 'Metadata mutation allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RESET ROLE;
 IF (SELECT count(*) FROM public.ai_workspaces WHERE lawyer_id=a)<>1 THEN RAISE EXCEPTION 'Orphan from rejected creation'; END IF;
 IF (SELECT count(*) FROM public.ai_documents WHERE lawyer_id=a)<>3 THEN RAISE EXCEPTION 'Document count wrong'; END IF;
END
$test$;
ROLLBACK;
SELECT 'PASS: 4.34B authorities, trusted usage, ownership and creation quotas; all fixtures rolled back' AS result;
