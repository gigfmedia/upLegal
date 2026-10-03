-- FASE 4.59D: borradores legales del caso (V1, aditivo, sin DML).
-- 1) Tabla canónica ai_case_drafts: solo borradores exitosos + fallos marcados.
--    Cada borrador enlaza el snapshot exacto usado (provenance estable).
-- 2) Operación 'case_drafting': CHECKs + overload de ai_begin_operation con
--    p_drafting_limit (conteo directo sobre ai_operations; sin contador
--    mensual dedicado en V1). Sin cuota certificada: el límite es NULL hasta
--    decisión comercial; rigen los topes de protección globales.

CREATE TABLE IF NOT EXISTS public.ai_case_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  lawyer_case_id uuid NOT NULL REFERENCES public.lawyer_cases (id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.ai_workspaces (id) ON DELETE CASCADE,
  intelligence_snapshot_id uuid REFERENCES public.ai_case_intelligence_snapshots (id),
  draft_type text NOT NULL CHECK (draft_type IN ('escrito', 'informe', 'carta', 'otro')),
  instruction text NOT NULL CHECK (length(btrim(instruction)) > 0),
  title text NOT NULL,
  content text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_drafts_case_created
  ON public.ai_case_drafts (lawyer_case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_drafts_lawyer
  ON public.ai_case_drafts (lawyer_id);

ALTER TABLE public.ai_case_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_case_drafts_owner_select" ON public.ai_case_drafts;
CREATE POLICY "ai_case_drafts_owner_select"
  ON public.ai_case_drafts
  FOR SELECT
  USING (auth.uid() = lawyer_id);

-- Escrituras solo service_role (la ruta valida ownership caso/workspace).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.ai_case_drafts FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ai_case_drafts FROM authenticated;
  END IF;
END
$$;

-- Operación case_drafting en constraints existentes (patrón 20260805000000).
ALTER TABLE public.ai_operations DROP CONSTRAINT IF EXISTS ai_operations_capability_check;
ALTER TABLE public.ai_operations
  ADD CONSTRAINT ai_operations_capability_check
  CHECK (capability IN ('case_chat', 'document_chat', 'document_analysis', 'research', 'case_drafting'));

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_operation_check;
ALTER TABLE public.ai_usage
  ADD CONSTRAINT ai_usage_operation_check
  CHECK (operation IN ('document_analysis', 'case_chat', 'jurisprudence_research', 'case_drafting'));

-- Overload de ai_begin_operation con p_drafting_limit (patrón 20261001000000:
-- DROP de la firma exacta previa + CREATE con parámetro trailing).
-- El cuerpo es idéntico al vigente 20261001000000 más:
-- (a) 'case_drafting' en el allowlist de capability;
-- (b) validación de p_drafting_limit;
-- (c) conteo de cuota drafting (reservados+exitosos del mes, sin contador
--     dedicado; V1 no trae cuota certificada → el límite viaja NULL).
DROP FUNCTION IF EXISTS public.ai_begin_operation(uuid,uuid,text,uuid,uuid,text,bigint,integer,uuid,integer,integer,integer,uuid,uuid,integer,integer,integer);
CREATE FUNCTION public.ai_begin_operation(p_lawyer uuid,p_workspace uuid,p_capability text,p_resource uuid,p_key uuid,p_hash text,p_token_limit bigint,p_operation_limit integer,p_conversation uuid DEFAULT NULL,p_chat_limit integer DEFAULT NULL,p_analysis_limit integer DEFAULT NULL,p_research_limit integer DEFAULT NULL,p_free_case_id uuid DEFAULT NULL,p_free_workspace_id uuid DEFAULT NULL,p_free_chat_limit integer DEFAULT NULL,p_free_analysis_limit integer DEFAULT NULL,p_free_research_limit integer DEFAULT NULL,p_drafting_limit integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.ai_operations; m public.ai_usage_monthly; d date; linked uuid; links integer; v_used integer; v_is_free boolean;
BEGIN
 IF p_key IS NULL OR p_lawyer IS NULL OR p_hash IS NULL OR length(p_hash)<>64 OR p_token_limit<=0 OR p_operation_limit<=0 OR p_token_limit IS NULL OR p_operation_limit IS NULL OR p_capability NOT IN ('case_chat','document_chat','document_analysis','research','case_drafting') THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
 IF (p_chat_limit IS NOT NULL AND p_chat_limit<=0) OR (p_analysis_limit IS NOT NULL AND p_analysis_limit<=0) OR (p_research_limit IS NOT NULL AND p_research_limit<=0) OR (p_drafting_limit IS NOT NULL AND p_drafting_limit<=0) THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
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
 -- 4.59D drafting: misma semántica reserved+succeeded del mes. Sin cuota
 -- certificada en V1 (p_drafting_limit viaja NULL); rigen los topes de
 -- protección globales (tokens/operaciones).
 IF p_capability='case_drafting' AND p_drafting_limit IS NOT NULL THEN
  SELECT count(*) INTO v_used FROM public.ai_operations WHERE lawyer_id=p_lawyer AND period_start=d AND capability='case_drafting' AND status IN ('reserved','succeeded');
  IF v_used>=p_drafting_limit THEN RAISE EXCEPTION 'AI_MONTHLY_LIMIT_REACHED'; END IF;
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

-- Re-aplica grants a la nueva firma (patrón 20260928000000; con guarda de
-- roles para no romper en Postgres vanilla — en Supabase existen siempre).
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('ai_begin_operation') LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.sig);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.sig);
  END IF;
 END LOOP;
END $$;
