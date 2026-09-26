-- ===========================================================================
-- FASE 4.49A — one lifetime free Research/Jurisprudence operation.
--
-- Extends the 4.44A free first-Case allowance (chat 3 lifetime, analysis 1
-- lifetime, 2 current docs) with: research 1 lifetime, case-scoped, no
-- monthly reset, no rollover. All other 4.44A semantics unchanged.
--
-- IMPORTANT: 20260930000100 is already applied in production. This file only
-- ADDS to it; it never edits or replays production history.
--
-- Design:
-- 1) ai_operations gains is_free_allowance (boolean, default false): TRUE
--    only for research operations authorized under the free allowance at
--    begin time (free params present + research cap). Chat/analysis free
--    semantics from 4.44A are preserved byte-for-byte (their checks do not
--    read the flag, so existing consumed allowances never resurrect).
-- 2) Free research check: reserved+succeeded, scoped by BOTH lawyer_case_id
--    AND is_free_allowance. A Pro-era research op inside the free Case
--    (flag false) therefore never consumes the free 1/1 after downgrade
--    (§12), and only the canonical free Case scope counts (§2, §5).
-- 3) Commercial (Pro 10/month) research check excludes free-scoped ops, so
--    a consumed free Research does not appear as Pro consumption after a
--    same-month upgrade (§11). Chat/analysis commercial checks are untouched
--    (shared-ledger conservative behavior certified in 4.44B stays).
-- 4) Concurrency/failure/idempotency inherit 4.38C exactly: same advisory
--    lock (last slot admits one), failed ops quota 0, replays return before
--    any check, attempts never double-charge (§6, §7, §8).
-- 5) ai_begin_operation gains ONE trailing param with default
--    (p_free_research_limit): existing 12/16-arg calls keep working with the
--    free-research check disabled (legacy + Pro paths intact, §10, §13).
-- 6) No trigger changes (ai_enforce_trial_limits is documents-only),
--    no can_delete changes, no RLS/grant changes beyond the new signature
--    (service_role only).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) Free-allowance attribution on the shared ledger.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_operations
  ADD COLUMN IF NOT EXISTS is_free_allowance boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.ai_operations.is_free_allowance IS
  'FASE 4.49A: TRUE only for research ops authorized under the free first-Case allowance at begin time. Free lifetime checks require it (Pro-era ops never count as free); Pro monthly checks exclude it (free ops never count as Pro). Chat/analysis checks ignore it (4.44A semantics preserved).';

-- ---------------------------------------------------------------------------
-- 2) Lifetime free-Case research quota in ai_begin_operation.
-- Adding a parameter changes the signature, so DROP + CREATE is required.
-- The new param is trailing with a default: existing calls keep working
-- unchanged with the free-research check disabled.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ai_begin_operation(uuid,uuid,text,uuid,uuid,text,bigint,integer,uuid,integer,integer,integer,uuid,uuid,integer,integer);

CREATE FUNCTION public.ai_begin_operation(p_lawyer uuid,p_workspace uuid,p_capability text,p_resource uuid,p_key uuid,p_hash text,p_token_limit bigint,p_operation_limit integer,p_conversation uuid DEFAULT NULL,p_chat_limit integer DEFAULT NULL,p_analysis_limit integer DEFAULT NULL,p_research_limit integer DEFAULT NULL,p_free_case_id uuid DEFAULT NULL,p_free_workspace_id uuid DEFAULT NULL,p_free_chat_limit integer DEFAULT NULL,p_free_analysis_limit integer DEFAULT NULL,p_free_research_limit integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.ai_operations; m public.ai_usage_monthly; d date; linked uuid; links integer; v_used integer; v_is_free boolean;
BEGIN
 IF p_key IS NULL OR p_lawyer IS NULL OR p_hash IS NULL OR length(p_hash)<>64 OR p_token_limit<=0 OR p_operation_limit<=0 OR p_token_limit IS NULL OR p_operation_limit IS NULL OR p_capability NOT IN ('case_chat','document_chat','document_analysis','research') THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
 IF (p_chat_limit IS NOT NULL AND p_chat_limit<=0) OR (p_analysis_limit IS NOT NULL AND p_analysis_limit<=0) OR (p_research_limit IS NOT NULL AND p_research_limit<=0) THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
 IF (p_free_chat_limit IS NOT NULL AND p_free_chat_limit<=0) OR (p_free_analysis_limit IS NOT NULL AND p_free_analysis_limit<=0) OR (p_free_research_limit IS NOT NULL AND p_free_research_limit<=0) THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
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
  -- 4.49A: free-allowance research never counts as Pro consumption (§11).
  SELECT count(*) INTO v_used FROM public.ai_operations WHERE lawyer_id=p_lawyer AND period_start=d AND capability='research' AND status IN ('reserved','succeeded') AND NOT is_free_allowance;
  IF v_used>=p_research_limit THEN RAISE EXCEPTION 'AI_RESEARCH_LIMIT_REACHED'; END IF;
 END IF;
 -- 4.44A free first-Case lifetime quotas: same reserved+succeeded semantics,
 -- scoped by lawyer_case_id across ALL periods (no monthly reset, no rollover).
 -- The operation must target the free workspace; other resources are forbidden
 -- for free-quota reservations (wrong-Case requests are denied).
 IF p_free_case_id IS NOT NULL OR p_free_workspace_id IS NOT NULL OR p_free_chat_limit IS NOT NULL OR p_free_analysis_limit IS NOT NULL OR p_free_research_limit IS NOT NULL THEN
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
  -- 4.49A free lifetime Research (1 successful op, case-scoped). Requires the
  -- free-allowance flag so Pro-era research in the same Case never consumes
  -- the free 1/1 after a downgrade (§12). Failed ops never count (§7).
  IF p_capability='research' AND p_free_research_limit IS NOT NULL THEN
   SELECT count(*) INTO v_used FROM public.ai_operations WHERE lawyer_id=p_lawyer AND lawyer_case_id=p_free_case_id AND is_free_allowance AND capability='research' AND status IN ('reserved','succeeded');
   IF v_used>=p_free_research_limit THEN RAISE EXCEPTION 'FREE_CASE_RESEARCH_LIMIT_REACHED'; END IF;
  END IF;
 END IF;
 SELECT count(*), (array_agg(id))[1] INTO links,linked FROM public.lawyer_cases WHERE ai_workspace_id=p_workspace AND lawyer_id=p_lawyer;
 IF links>1 THEN RAISE EXCEPTION 'AI_CASE_LINK_AMBIGUOUS'; END IF;
 -- 4.49A: tag free-authorized research at insert (only free-quota research
 -- sets the flag; chat/analysis semantics from 4.44A are untouched).
 v_is_free := (p_capability='research' AND p_free_research_limit IS NOT NULL AND p_free_case_id IS NOT NULL);
 INSERT INTO public.ai_operations(lawyer_id,lawyer_case_id,workspace_id,conversation_id,capability,resource_id,idempotency_key,request_hash,period_start,token_limit,is_free_allowance)
 VALUES(p_lawyer,linked,p_workspace,p_conversation,p_capability,p_resource,p_key,p_hash,d,p_token_limit,v_is_free) RETURNING * INTO o;
 UPDATE public.ai_usage_monthly SET reserved_operations=reserved_operations+1 WHERE lawyer_id=p_lawyer AND period_start=d;
 RETURN jsonb_build_object('operation_id',o.id,'status',o.status,'created',true);
END $$;

REVOKE ALL ON FUNCTION public.ai_begin_operation(uuid,uuid,text,uuid,uuid,text,bigint,integer,uuid,integer,integer,integer,uuid,uuid,integer,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_begin_operation(uuid,uuid,text,uuid,uuid,text,bigint,integer,uuid,integer,integer,integer,uuid,uuid,integer,integer,integer) TO service_role;
