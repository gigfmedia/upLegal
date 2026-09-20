-- LOCAL/STAGING ISOLATED DB ONLY. All identities are freshly generated, all writes roll back.
-- Requires current migrations and the real FK relationships; never selects existing lawyers.
\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.expect_blocked(p_id uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF (public.get_case_delete_eligibility(p_id)->>'can_delete')::boolean THEN
    RAISE EXCEPTION 'Unexpected eligible case %',p_id;
  END IF;
  BEGIN
    DELETE FROM public.lawyer_cases WHERE id=p_id;
    RAISE EXCEPTION 'Unexpected successful deletion';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%CASE_NOT_DELETABLE%' THEN RAISE; END IF;
  END;
  IF NOT EXISTS(SELECT 1 FROM public.lawyer_cases WHERE id=p_id) THEN RAISE EXCEPTION 'Case lost'; END IF;
END $$;
DO $$
DECLARE
  l uuid := gen_random_uuid(); stranger uuid := gen_random_uuid(); free_l uuid := gen_random_uuid();
  c uuid; w uuid; d uuid; conv uuid; origin uuid; target uuid; worked uuid;
  signal text; s text; n int; service_id uuid;
BEGIN
  INSERT INTO auth.users(id) VALUES(l),(stranger),(free_l);
  INSERT INTO public.profiles(id,role) VALUES(l,'lawyer'),(stranger,'lawyer'),(free_l,'lawyer') ON CONFLICT(id) DO NOTHING;
  INSERT INTO public.lawyer_subscriptions(lawyer_id,status,plan,current_period_end) VALUES(l,'active','saas_essential',now()+interval '1 month');
  IF has_function_privilege('anon','public.get_case_delete_eligibility(uuid)','EXECUTE')
    OR has_function_privilege('authenticated','public.can_delete_lawyer_case(uuid)','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.get_case_delete_eligibility(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Unsafe grants';
  END IF;
  FOREACH signal IN ARRAY ARRAY['empty','empty_workspace','document','analysis','chat','note','research','workflow_pending','usage','booking','quote','operational_booking','marketplace','unknown','foreign_workspace','shared_workspace'] LOOP
    RESET ROLE;
    PERFORM set_config('request.jwt.claim.sub','',true);
    w:=NULL; origin:=NULL;
    IF signal IN ('empty_workspace','document','analysis','chat','note','research','workflow_pending','usage','foreign_workspace','shared_workspace') THEN
      INSERT INTO public.ai_workspaces(lawyer_id,name) VALUES(CASE WHEN signal='foreign_workspace' THEN stranger ELSE l END,'QA 4.36E') RETURNING id INTO w;
    END IF;
    INSERT INTO public.lawyer_cases(lawyer_id,title,source,status,ai_workspace_id)
      VALUES(l,'QA '||signal,CASE signal WHEN 'marketplace' THEN 'LEGALUP_MARKETPLACE' WHEN 'unknown' THEN 'UNKNOWN' ELSE 'LAWYER_DIRECT' END,'closed',w) RETURNING id INTO c;
    IF signal='shared_workspace' THEN
      INSERT INTO public.lawyer_cases(lawyer_id,title,source,status,ai_workspace_id) VALUES(l,'Shared','LAWYER_DIRECT','closed',w);
    END IF;
    IF signal IN ('document','analysis') THEN
      d:=gen_random_uuid();
      INSERT INTO public.ai_documents(id,lawyer_id,workspace_id,original_filename,file_path,file_size_bytes,mime_type)
        VALUES(d,l,w,'qa.pdf',l||'/'||w||'/'||d||'/original.pdf',10,'application/pdf');
    END IF;
    IF signal='analysis' THEN
      -- Analysis independent of the TARGET workspace's document: verifies explicit analysis guard.
      INSERT INTO public.ai_workspaces(lawyer_id,name) VALUES(l,'QA analysis target') RETURNING id INTO w;
      UPDATE public.lawyer_cases SET ai_workspace_id=w WHERE id=c;
      INSERT INTO public.ai_document_analyses(lawyer_id,workspace_id,document_id,summary,document_type) VALUES(l,w,d,'QA','other');
    ELSIF signal IN ('empty_workspace','chat') THEN
      INSERT INTO public.ai_conversations(lawyer_id,workspace_id) VALUES(l,w) RETURNING id INTO conv;
      IF signal='chat' THEN
        INSERT INTO public.ai_chat_messages(id,lawyer_id,workspace_id,conversation_id,role,content) VALUES(gen_random_uuid(),l,w,conv,'user','QA');
      ELSE
        INSERT INTO public.ai_case_timeline_events(lawyer_id,workspace_id,event_type,title) VALUES(l,w,'case_created','Creación');
      END IF;
    ELSIF signal='note' THEN
      INSERT INTO public.ai_case_timeline_events(lawyer_id,workspace_id,event_type,title) VALUES(l,w,'note','QA');
    ELSIF signal='research' THEN
      INSERT INTO public.ai_research_requests(lawyer_id,workspace_id,query,answer) VALUES(l,w,'QA','QA');
    ELSIF signal='workflow_pending' THEN
      INSERT INTO public.ai_case_workflow_items(lawyer_id,workspace_id,case_id,action_id,title,status) VALUES(l,w,w,'qa','QA','pending');
    ELSIF signal='usage' THEN
      INSERT INTO public.ai_usage(lawyer_id,workspace_id,operation) VALUES(l,w,'case_chat');
    ELSIF signal IN ('booking','operational_booking') THEN
      INSERT INTO public.bookings(lawyer_id,price,user_name,user_email) VALUES(l,0,'QA','qa@example.invalid') RETURNING id INTO origin;
      IF signal='booking' THEN UPDATE public.lawyer_cases SET booking_id=origin WHERE id=c;
      ELSE UPDATE public.bookings SET case_id=c WHERE id=origin; END IF;
    ELSIF signal='quote' THEN
      INSERT INTO public.lawyer_services(lawyer_user_id,title,price_clp) VALUES(l,'QA service',0) RETURNING id INTO service_id;
      INSERT INTO public.service_quote_requests(lawyer_id,user_id,service_id,service_title,description,user_name,user_email)
        VALUES(l,l,service_id,'QA','QA','QA','qa@example.invalid') RETURNING id INTO origin;
      UPDATE public.lawyer_cases SET quote_request_id=origin WHERE id=c;
    END IF;
    SET CONSTRAINTS ALL IMMEDIATE;
    PERFORM set_config('request.jwt.claim.sub',l::text,true);
    SET LOCAL ROLE authenticated;
    IF signal IN ('empty','empty_workspace') THEN
      IF NOT (public.get_case_delete_eligibility(c)->>'can_delete')::boolean THEN RAISE EXCEPTION 'Empty denied'; END IF;
      DELETE FROM public.lawyer_cases WHERE id=c;
      GET DIAGNOSTICS n=ROW_COUNT;
      IF n<>1 THEN RAISE EXCEPTION 'Empty not deleted'; END IF;
      RESET ROLE;
      IF w IS NOT NULL AND EXISTS(SELECT 1 FROM public.ai_workspaces WHERE id=w) THEN RAISE EXCEPTION 'Empty workspace orphaned'; END IF;
    ELSE
      FOREACH s IN ARRAY ARRAY['new','in_progress','closed','cancelled'] LOOP
        UPDATE public.lawyer_cases SET status=s WHERE id=c;
        PERFORM pg_temp.expect_blocked(c);
      END LOOP;
      BEGIN
        UPDATE public.lawyer_cases SET ai_workspace_id=NULL,booking_id=NULL,quote_request_id=NULL,source='LAWYER_DIRECT' WHERE id=c;
        IF w IS NOT NULL OR (origin IS NOT NULL AND signal='booking') OR signal IN ('quote','marketplace','unknown') THEN RAISE EXCEPTION 'History detached'; END IF;
      EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%CASE_HISTORY_LINK_PROTECTED%' THEN RAISE; END IF;
      END;
      PERFORM set_config('request.jwt.claim.sub',stranger::text,true);
      IF (public.get_case_delete_eligibility(c)->>'can_delete')::boolean THEN RAISE EXCEPTION 'Cross-tenant disclosure'; END IF;
      DELETE FROM public.lawyer_cases WHERE id=c;
      GET DIAGNOSTICS n=ROW_COUNT;
      IF n<>0 THEN RAISE EXCEPTION 'Cross-tenant delete'; END IF;
    END IF;
    RAISE NOTICE 'PASS signal % (status-independent, ownership)',signal;
  END LOOP;
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub',free_l::text,true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.lawyer_cases(lawyer_id,title,source) VALUES(free_l,'Free','LAWYER_DIRECT') RETURNING id INTO c;
  DELETE FROM public.lawyer_cases WHERE id=c;
  BEGIN
    INSERT INTO public.lawyer_cases(lawyer_id,title,source) VALUES(free_l,'Second','LAWYER_DIRECT');
    RAISE EXCEPTION 'Free reset by delete';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%FREE_CASE_ALLOWANCE_CONSUMED%' THEN RAISE; END IF;
  END;
  RESET ROLE;
  IF NOT EXISTS(SELECT 1 FROM public.pro_free_case_grants WHERE lawyer_id=free_l AND case_id=c) THEN RAISE EXCEPTION 'Lost free ledger'; END IF;
  RAISE NOTICE 'PASS durable free grant after delete';

  -- Start fresh Pro identity for exact active capacity accounting.
  l:=gen_random_uuid();
  PERFORM set_config('request.jwt.claim.sub','',true);
  INSERT INTO auth.users(id) VALUES(l);
  INSERT INTO public.profiles(id,role) VALUES(l,'lawyer') ON CONFLICT(id) DO NOTHING;
  INSERT INTO public.lawyer_subscriptions(lawyer_id,status,plan,current_period_end) VALUES(l,'active','saas_essential',now()+interval '1 month');
  INSERT INTO public.ai_workspaces(lawyer_id,name) VALUES(l,'Worked') RETURNING id INTO w;
  INSERT INTO public.ai_case_timeline_events(lawyer_id,workspace_id,event_type,title) VALUES(l,w,'note','QA');
  PERFORM set_config('request.jwt.claim.sub',l::text,true);
  SET LOCAL ROLE authenticated;
  FOR n IN 1..20 LOOP
    INSERT INTO public.lawyer_cases(lawyer_id,title,source,ai_workspace_id) VALUES(l,'Capacity','LAWYER_DIRECT',CASE WHEN n=1 THEN w ELSE NULL END) RETURNING id INTO c;
    IF n=1 THEN worked:=c; END IF;
  END LOOP;
  PERFORM pg_temp.expect_blocked(worked);
  DELETE FROM public.lawyer_cases WHERE id=c;
  IF (SELECT count(*) FROM public.lawyer_cases WHERE lawyer_id=l)<>19 THEN RAISE EXCEPTION 'Wrong delete count'; END IF;
  INSERT INTO public.lawyer_cases(lawyer_id,title,source) VALUES(l,'Replacement','LAWYER_DIRECT');
  BEGIN
    INSERT INTO public.lawyer_cases(lawyer_id,title,source) VALUES(l,'21','LAWYER_DIRECT');
    RAISE EXCEPTION 'Capacity not enforced';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%ACTIVE_CASE_LIMIT_REACHED%' THEN RAISE; END IF;
  END;
  UPDATE public.lawyer_cases SET status='closed' WHERE id=worked;
  IF (SELECT count(*) FROM public.lawyer_cases WHERE lawyer_id=l AND status IN ('new','quoted','paid','in_progress','delivered'))<>19 THEN RAISE EXCEPTION 'Close failed'; END IF;
  RESET ROLE;
  IF NOT EXISTS(SELECT 1 FROM public.ai_case_timeline_events WHERE workspace_id=w AND event_type='note') THEN RAISE EXCEPTION 'Close lost work'; END IF;
  RAISE NOTICE 'PASS capacity: empty delete releases, worked delete denied, close preserves history';
END $$;
ROLLBACK;
