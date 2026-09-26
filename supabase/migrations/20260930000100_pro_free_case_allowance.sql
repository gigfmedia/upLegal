-- ===========================================================================
-- DRAFT — DO NOT APPLY TO PRODUCTION WITHOUT A CERTIFICATION PHASE.
-- FASE 4.44A — free first-Case AI allowance (lifetime, case-scoped).
--
-- Status: architecture proposal + local-verification draft. Requires a
-- dedicated production migration + certification phase before any apply
-- (supabase db push). No data migration, no destructive change.
--
-- Design (see phase report):
-- 1) Free-Case identity = pro_free_case_grants.case_id (durable ledger;
--    NULL case_id = consumed-but-unidentified = NO free AI, fail-closed).
-- 2) Lifetime usage = ai_operations rows scoped by lawyer_case_id
--    (reserved+succeeded; failed never counts). No new counter tables.
-- 3) ai_begin_operation gains optional free params (all-or-nothing):
--    p_free_case_id, p_free_workspace_id, p_free_chat_limit,
--    p_free_analysis_limit. NULL disables each check (legacy paths intact).
--    Same advisory lock => last-slot concurrency safe.
-- 4) ai_enforce_trial_limits: free_case plan gets 2 docs scoped to the free
--    workspace; other workspaces blocked for free-plan users (new plan, no
--    legacy behavior to preserve). Trial/Pro/legacy branches untouched.
-- 5) can_delete_lawyer_case: reserved ai_operations block deletion, closing
--    the settle-after-delete undercount hole (lifetime never resurrects).
--    Cases WITH settled usage were already undeletable (ai_usage check).
-- 6) Pro upgrade accounting: shared ai_operations ledger means same-month
--    free ops also count in Pro monthly pools. Conservative by design;
--    documented, no dual ledger.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) Resource limits trigger: free first-Case document authority.
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
  v_is_ai_active boolean;
  v_free_workspace uuid;
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
  -- 4.44A: legacy explicit AI entitlement outranks the free-Case plan.
  v_is_ai_active := EXISTS (
    SELECT 1 FROM public.ai_subscriptions s
    WHERE s.lawyer_id = NEW.lawyer_id
      AND s.status IN ('active','trialing')
      AND (
        (s.status = 'trialing' AND s.trial_ends_at > now())
        OR (s.status = 'active' AND s.current_period_end > now())
      )
  );

  -- 4.44A: free-Case plan = consumed grant + identified case + workspace,
  -- with no trial/Pro/legacy entitlement. NULL case_id = unidentified = no plan.
  v_free_workspace := NULL;
  IF NOT v_is_trial AND NOT v_is_pro_limited AND NOT v_is_ai_active THEN
    SELECT c.ai_workspace_id INTO v_free_workspace
    FROM public.pro_free_case_grants g
    JOIN public.lawyer_cases c ON c.id = g.case_id AND c.lawyer_id = NEW.lawyer_id
    WHERE g.lawyer_id = NEW.lawyer_id
      AND g.case_id IS NOT NULL;
  END IF;

  -- Only limit if trial, pro_limited, or free_case plan.
  IF NOT v_is_trial AND NOT v_is_pro_limited AND v_free_workspace IS NULL THEN
    RETURN NEW;
  END IF;

  -- Serialize concurrent inserts per lawyer so the last slot admits one winner.
  PERFORM pg_advisory_xact_lock(hashtextextended('ai-doc-limit:' || NEW.lawyer_id::text, 0));

  IF TG_TABLE_NAME = 'ai_workspaces' THEN
    -- 4.38C: workspace is internal architecture, not a Pro commercial quota.
    IF v_is_pro_limited THEN
      RETURN NEW;
    END IF;
    -- 4.44A: workspaces are not counted for the free plan (only docs capped).
    IF v_free_workspace IS NOT NULL THEN
      RETURN NEW;
    END IF;
    v_max := 3;
    SELECT count(*) INTO v_count FROM public.ai_workspaces WHERE lawyer_id = NEW.lawyer_id;
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'Alcanzaste el límite de % caso(s) de tu plan. Actualiza a AI Full para más.', v_max
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF TG_TABLE_NAME = 'ai_documents' THEN
    -- 4.44A: 2 current stored documents scoped to the free Case workspace.
    -- Deleting frees a slot (count is current rows). Other workspaces are
    -- blocked for free-plan users (no legacy behavior exists for this plan).
    IF v_free_workspace IS NOT NULL THEN
      IF NEW.workspace_id IS DISTINCT FROM v_free_workspace THEN
        RAISE EXCEPTION 'AI_FREE_CASE_DOCUMENT_SCOPE: este documento debe pertenecer a tu primer caso.'
          USING ERRCODE = 'P0001';
      END IF;
      SELECT count(*) INTO v_count FROM public.ai_documents
      WHERE lawyer_id = NEW.lawyer_id AND workspace_id = v_free_workspace;
      IF v_count >= 2 THEN
        RAISE EXCEPTION 'FREE_CASE_DOCUMENT_LIMIT_REACHED: tu primer caso incluye hasta 2 documentos.'
          USING ERRCODE = 'P0001';
      END IF;
      RETURN NEW;
    END IF;
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
-- 2) Lifetime free-Case quotas in ai_begin_operation.
-- Adding parameters changes the signature, so DROP + CREATE is required
-- (CREATE OR REPLACE cannot change the argument list). All new params are
-- trailing with defaults: existing 12-arg calls keep working unchanged.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ai_begin_operation(uuid,uuid,text,uuid,uuid,text,bigint,integer,uuid,integer,integer,integer);

CREATE FUNCTION public.ai_begin_operation(p_lawyer uuid,p_workspace uuid,p_capability text,p_resource uuid,p_key uuid,p_hash text,p_token_limit bigint,p_operation_limit integer,p_conversation uuid DEFAULT NULL,p_chat_limit integer DEFAULT NULL,p_analysis_limit integer DEFAULT NULL,p_research_limit integer DEFAULT NULL,p_free_case_id uuid DEFAULT NULL,p_free_workspace_id uuid DEFAULT NULL,p_free_chat_limit integer DEFAULT NULL,p_free_analysis_limit integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.ai_operations; m public.ai_usage_monthly; d date; linked uuid; links integer; v_used integer;
BEGIN
 IF p_key IS NULL OR p_lawyer IS NULL OR p_hash IS NULL OR length(p_hash)<>64 OR p_token_limit<=0 OR p_operation_limit<=0 OR p_token_limit IS NULL OR p_operation_limit IS NULL OR p_capability NOT IN ('case_chat','document_chat','document_analysis','research') THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
 IF (p_chat_limit IS NOT NULL AND p_chat_limit<=0) OR (p_analysis_limit IS NOT NULL AND p_analysis_limit<=0) OR (p_research_limit IS NOT NULL AND p_research_limit<=0) THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
 IF (p_free_chat_limit IS NOT NULL AND p_free_chat_limit<=0) OR (p_free_analysis_limit IS NOT NULL AND p_free_analysis_limit<=0) THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
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
 -- 4.44A free first-Case lifetime quotas: same reserved+succeeded semantics,
 -- scoped by lawyer_case_id across ALL periods (no monthly reset, no rollover).
 -- The operation must target the free workspace; other resources are forbidden
 -- for free-quota reservations (wrong-Case requests are denied, §28).
 IF p_free_case_id IS NOT NULL OR p_free_workspace_id IS NOT NULL OR p_free_chat_limit IS NOT NULL OR p_free_analysis_limit IS NOT NULL THEN
  IF p_free_case_id IS NULL OR p_free_workspace_id IS NULL THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
  IF p_workspace IS DISTINCT FROM p_free_workspace_id THEN RAISE EXCEPTION 'AI_RESOURCE_FORBIDDEN'; END IF;
  IF p_capability IN ('case_chat','document_chat') AND p_free_chat_limit IS NOT NULL THEN
   SELECT count(*) INTO v_used FROM public.ai_operations WHERE lawyer_id=p_lawyer AND lawyer_case_id=p_free_case_id AND capability IN ('case_chat','document_chat') AND status IN ('reserved','succeeded');
   IF v_used>=p_free_chat_limit THEN RAISE EXCEPTION 'FREE_CASE_CHAT_LIMIT_REACHED'; END IF;
  END IF;
  IF p_capability='document_analysis' AND p_free_analysis_limit IS NOT NULL THEN
   SELECT count(*) INTO v_used FROM public.ai_operations WHERE lawyer_id=p_lawyer AND lawyer_case_id=p_free_case_id AND capability='document_analysis' AND status IN ('reserved','succeeded');
   IF v_used>=p_free_analysis_limit THEN RAISE EXCEPTION 'FREE_CASE_ANALYSIS_LIMIT_REACHED'; END IF;
  END IF;
 END IF;
 SELECT count(*), (array_agg(id))[1] INTO links,linked FROM public.lawyer_cases WHERE ai_workspace_id=p_workspace AND lawyer_id=p_lawyer;
 IF links>1 THEN RAISE EXCEPTION 'AI_CASE_LINK_AMBIGUOUS'; END IF;
 INSERT INTO public.ai_operations(lawyer_id,lawyer_case_id,workspace_id,conversation_id,capability,resource_id,idempotency_key,request_hash,period_start,token_limit)
 VALUES(p_lawyer,linked,p_workspace,p_conversation,p_capability,p_resource,p_key,p_hash,d,p_token_limit) RETURNING * INTO o;
 UPDATE public.ai_usage_monthly SET reserved_operations=reserved_operations+1 WHERE lawyer_id=p_lawyer AND period_start=d;
 RETURN jsonb_build_object('operation_id',o.id,'status',o.status,'created',true);
END $$;

REVOKE ALL ON FUNCTION public.ai_begin_operation(uuid,uuid,text,uuid,uuid,text,bigint,integer,uuid,integer,integer,integer,uuid,uuid,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_begin_operation(uuid,uuid,text,uuid,uuid,text,bigint,integer,uuid,integer,integer,integer,uuid,uuid,integer,integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Deletion guard: in-flight (reserved) operations block Case deletion.
-- Cases WITH settled usage were already undeletable (ai_usage check); this
-- closes the settle-after-delete lifetime-undercount hole, so free lifetime
-- allowance (and metering reconciliation) can never resurrect. Transient-only:
-- deletion succeeds again once the operation settles.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_delete_lawyer_case(p_case_id uuid)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.lawyer_cases c
  WHERE c.id = p_case_id AND c.lawyer_id = auth.uid()
   AND c.source = 'LAWYER_DIRECT'
   AND c.booking_id IS NULL AND c.quote_request_id IS NULL
   AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.case_id = c.id)
   AND (c.ai_workspace_id IS NULL OR (
     EXISTS (SELECT 1 FROM public.ai_workspaces w
             WHERE w.id = c.ai_workspace_id AND w.lawyer_id = c.lawyer_id)
     AND NOT EXISTS (SELECT 1 FROM public.lawyer_cases other
                     WHERE other.ai_workspace_id = c.ai_workspace_id AND other.id <> c.id)
     AND NOT EXISTS (
       SELECT 1 FROM public.ai_documents WHERE workspace_id = c.ai_workspace_id
       UNION ALL SELECT 1 FROM public.ai_document_analyses WHERE workspace_id = c.ai_workspace_id
       UNION ALL SELECT 1 FROM public.ai_chat_messages WHERE workspace_id = c.ai_workspace_id
       UNION ALL SELECT 1 FROM public.ai_research_requests WHERE workspace_id = c.ai_workspace_id
       UNION ALL SELECT 1 FROM public.ai_usage WHERE workspace_id = c.ai_workspace_id
       -- 4.44A: reserved operations have no usage row yet; deleting now would
       -- strand them unscopable (lawyer_case_id SET NULL) and resurrect quota.
       UNION ALL SELECT 1 FROM public.ai_operations
         WHERE lawyer_case_id = c.id AND status = 'reserved'
       -- Pending can mean reset by the lawyer: there is no trustworthy untouched marker.
       UNION ALL SELECT 1 FROM public.ai_case_workflow_items WHERE workspace_id = c.ai_workspace_id
       UNION ALL SELECT 1 FROM public.ai_case_timeline_events
         WHERE workspace_id = c.ai_workspace_id AND event_type IS DISTINCT FROM 'case_created'
     )
   ))
 );
$$;
REVOKE ALL ON FUNCTION public.can_delete_lawyer_case(uuid) FROM PUBLIC, anon, authenticated, service_role;
