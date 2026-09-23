-- FASE 4.38C-B — canonical Pro AI allowance.
--
-- 1) ai_enforce_trial_limits: remove the commercial 1-workspace limit for Pro
--    (workspace stays internal architecture), raise Pro stored documents 3 -> 50
--    with a stable machine-readable marker. Trial behavior unchanged.
--    Concurrent inserts serialize per lawyer via advisory lock: N concurrent
--    uploads past the last slot admit exactly one winner.
-- 2) ai_begin_operation: optional per-pool commercial monthly quotas
--    (chat shared case_chat+document_chat, analysis, research). NULL disables a
--    pool check and preserves legacy behavior. Charged units are successful
--    operations (status succeeded) plus in-flight reservations; failed
--    operations never consume. Idempotent replays return before any check.
-- Metadata-only function replacement; no data migration, no destructive change.

-- ---------------------------------------------------------------------------
-- 1) Resource limits trigger.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ai_enforce_trial_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_trial boolean;
  v_is_pro_limited boolean;
  v_count integer;
  v_max integer;
BEGIN
  -- Check if on trial (existing)
  v_is_trial := public.ai_is_lawyer_on_trial(NEW.lawyer_id);
  -- Check if Pro Limited (Pro active without AI active/trial)
  v_is_pro_limited := public.has_pro_access(NEW.lawyer_id) AND NOT v_is_trial AND NOT EXISTS (
    SELECT 1 FROM public.ai_subscriptions s
    WHERE s.lawyer_id = NEW.lawyer_id
      AND s.status IN ('active','trialing')
      AND (
        (s.status = 'trialing' AND s.trial_ends_at > now())
        OR (s.status = 'active' AND s.current_period_end > now())
      )
  );

  -- Only limit if trial or pro_limited
  IF NOT v_is_trial AND NOT v_is_pro_limited THEN
    RETURN NEW;
  END IF;

  -- Serialize concurrent inserts per lawyer so the last slot admits one winner.
  PERFORM pg_advisory_xact_lock(hashtextextended('ai-doc-limit:' || NEW.lawyer_id::text, 0));

  IF TG_TABLE_NAME = 'ai_workspaces' THEN
    -- 4.38C: workspace is internal architecture, not a Pro commercial quota.
    IF v_is_pro_limited THEN
      RETURN NEW;
    END IF;
    v_max := 3;
    SELECT count(*) INTO v_count FROM public.ai_workspaces WHERE lawyer_id = NEW.lawyer_id;
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'Alcanzaste el límite de % caso(s) de tu plan. Actualiza a AI Full para más.', v_max
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF TG_TABLE_NAME = 'ai_documents' THEN
    -- 4.38C: 50 total current stored documents per lawyer for Pro; trial keeps 10.
    v_max := CASE WHEN v_is_pro_limited THEN 50 ELSE 10 END;
    SELECT count(*) INTO v_count FROM public.ai_documents WHERE lawyer_id = NEW.lawyer_id;
    IF v_count >= v_max THEN
      IF v_is_pro_limited THEN
        RAISE EXCEPTION 'AI_DOCUMENT_CAPACITY_REACHED: Alcanzaste el límite de 50 documentos almacenados de tu plan.'
          USING ERRCODE = 'P0001';
      END IF;
      RAISE EXCEPTION 'Alcanzaste el límite de % documento(s) de tu plan. Actualiza a AI Full para más.', v_max
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_enforce_trial_limits_workspaces ON public.ai_workspaces;
CREATE TRIGGER trg_ai_enforce_trial_limits_workspaces
  BEFORE INSERT ON public.ai_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.ai_enforce_trial_limits();

DROP TRIGGER IF EXISTS trg_ai_enforce_trial_limits_documents ON public.ai_documents;
CREATE TRIGGER trg_ai_enforce_trial_limits_documents
  BEFORE INSERT ON public.ai_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.ai_enforce_trial_limits();

-- ---------------------------------------------------------------------------
-- 2) Commercial monthly quotas in ai_begin_operation.
-- Adding parameters changes the signature, so DROP + CREATE is required
-- (CREATE OR REPLACE cannot change the argument list). All new params are
-- trailing with defaults: existing 8/9-arg calls keep working unchanged.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ai_begin_operation(uuid,uuid,text,uuid,uuid,text,bigint,integer,uuid);

CREATE FUNCTION public.ai_begin_operation(p_lawyer uuid,p_workspace uuid,p_capability text,p_resource uuid,p_key uuid,p_hash text,p_token_limit bigint,p_operation_limit integer,p_conversation uuid DEFAULT NULL,p_chat_limit integer DEFAULT NULL,p_analysis_limit integer DEFAULT NULL,p_research_limit integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.ai_operations; m public.ai_usage_monthly; d date; linked uuid; links integer; v_used integer;
BEGIN
 IF p_key IS NULL OR p_lawyer IS NULL OR p_hash IS NULL OR length(p_hash)<>64 OR p_token_limit<=0 OR p_operation_limit<=0 OR p_token_limit IS NULL OR p_operation_limit IS NULL OR p_capability NOT IN ('case_chat','document_chat','document_analysis','research') THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
 IF (p_chat_limit IS NOT NULL AND p_chat_limit<=0) OR (p_analysis_limit IS NOT NULL AND p_analysis_limit<=0) OR (p_research_limit IS NOT NULL AND p_research_limit<=0) THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.ai_workspaces WHERE id=p_workspace AND lawyer_id=p_lawyer) THEN RAISE EXCEPTION 'AI_RESOURCE_FORBIDDEN'; END IF;
 IF p_capability IN ('document_analysis','document_chat') AND NOT EXISTS(SELECT 1 FROM public.ai_documents WHERE id=p_resource AND workspace_id=p_workspace AND lawyer_id=p_lawyer) THEN RAISE EXCEPTION 'AI_RESOURCE_FORBIDDEN'; END IF;
 IF p_capability='case_chat' AND NOT EXISTS(SELECT 1 FROM public.ai_conversations WHERE id=p_resource AND workspace_id=p_workspace AND lawyer_id=p_lawyer) THEN RAISE EXCEPTION 'AI_RESOURCE_FORBIDDEN'; END IF;
 IF p_conversation IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.ai_conversations WHERE id=p_conversation AND workspace_id=p_workspace AND lawyer_id=p_lawyer) THEN RAISE EXCEPTION 'AI_RESOURCE_FORBIDDEN'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('ai-meter:'||p_lawyer::text,0));
 SELECT * INTO o FROM public.ai_operations WHERE lawyer_id=p_lawyer AND idempotency_key=p_key;
 IF FOUND THEN
  IF o.request_hash<>p_hash OR o.workspace_id<>p_workspace OR o.capability<>p_capability OR o.resource_id IS DISTINCT FROM p_resource OR o.conversation_id IS DISTINCT FROM p_conversation THEN RAISE EXCEPTION 'AI_IDEMPOTENCY_CONFLICT'; END IF;
  RETURN jsonb_build_object('operation_id',o.id,'status',o.status,'created',false,'response_status',o.response_status,'response_body',o.response_body);
 END IF;
 d:=date_trunc('month',now() AT TIME ZONE 'UTC')::date;
 INSERT INTO public.ai_usage_monthly(lawyer_id,period_start,period_end) VALUES(p_lawyer,d,(d+interval '1 month')::date) ON CONFLICT(lawyer_id,period_start) DO NOTHING;
 SELECT * INTO STRICT m FROM public.ai_usage_monthly WHERE lawyer_id=p_lawyer AND period_start=d FOR UPDATE;
 IF m.total_tokens+m.reserved_tokens>=p_token_limit OR m.document_analysis_count+m.chat_message_count+m.jurisprudence_research_count+m.reserved_operations>=p_operation_limit THEN RAISE EXCEPTION 'AI_MONTHLY_LIMIT_REACHED'; END IF;
 -- 4.38C commercial quotas: charged units are succeeded operations plus
 -- in-flight reservations in the current UTC month. Failed operations never
 -- consume. Serialized by the same advisory lock, so the last slot admits
 -- exactly one reservation. Chat pool shares case_chat + document_chat.
 IF p_capability IN ('case_chat','document_chat') AND p_chat_limit IS NOT NULL THEN
  SELECT count(*) INTO v_used FROM public.ai_operations WHERE lawyer_id=p_lawyer AND period_start=d AND capability IN ('case_chat','document_chat') AND status IN ('reserved','succeeded');
  IF v_used>=p_chat_limit THEN RAISE EXCEPTION 'AI_CHAT_LIMIT_REACHED'; END IF;
 END IF;
 IF p_capability='document_analysis' AND p_analysis_limit IS NOT NULL THEN
  SELECT count(*) INTO v_used FROM public.ai_operations WHERE lawyer_id=p_lawyer AND period_start=d AND capability='document_analysis' AND status IN ('reserved','succeeded');
  IF v_used>=p_analysis_limit THEN RAISE EXCEPTION 'AI_ANALYSIS_LIMIT_REACHED'; END IF;
 END IF;
 IF p_capability='research' AND p_research_limit IS NOT NULL THEN
  SELECT count(*) INTO v_used FROM public.ai_operations WHERE lawyer_id=p_lawyer AND period_start=d AND capability='research' AND status IN ('reserved','succeeded');
  IF v_used>=p_research_limit THEN RAISE EXCEPTION 'AI_RESEARCH_LIMIT_REACHED'; END IF;
 END IF;
 SELECT count(*), (array_agg(id))[1] INTO links,linked FROM public.lawyer_cases WHERE ai_workspace_id=p_workspace AND lawyer_id=p_lawyer;
 IF links>1 THEN RAISE EXCEPTION 'AI_CASE_LINK_AMBIGUOUS'; END IF;
 INSERT INTO public.ai_operations(lawyer_id,lawyer_case_id,workspace_id,conversation_id,capability,resource_id,idempotency_key,request_hash,period_start,token_limit)
 VALUES(p_lawyer,linked,p_workspace,p_conversation,p_capability,p_resource,p_key,p_hash,d,p_token_limit) RETURNING * INTO o;
 UPDATE public.ai_usage_monthly SET reserved_operations=reserved_operations+1 WHERE lawyer_id=p_lawyer AND period_start=d;
 RETURN jsonb_build_object('operation_id',o.id,'status',o.status,'created',true);
END $$;

REVOKE ALL ON FUNCTION public.ai_begin_operation(uuid,uuid,text,uuid,uuid,text,bigint,integer,uuid,integer,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_begin_operation(uuid,uuid,text,uuid,uuid,text,bigint,integer,uuid,integer,integer,integer) TO service_role;
