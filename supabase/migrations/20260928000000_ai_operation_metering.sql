-- 4.38B: service-owned logical operations and provider attempts. No plan changes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ai_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lawyer_case_id uuid REFERENCES public.lawyer_cases(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.ai_workspaces(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  capability text NOT NULL CHECK (capability IN ('case_chat','document_chat','document_analysis','research')),
  resource_id uuid,
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL CHECK (length(request_hash)=64),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','succeeded','failed')),
  quota_units integer NOT NULL DEFAULT 0 CHECK (quota_units IN (0,1)),
  period_start date NOT NULL,
  token_limit bigint NOT NULL CHECK (token_limit>0),
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(lawyer_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS ai_operations_lawyer_period ON public.ai_operations(lawyer_id,period_start,capability);
CREATE INDEX IF NOT EXISTS ai_operations_workspace_created ON public.ai_operations(workspace_id,created_at);
CREATE INDEX IF NOT EXISTS ai_operations_case ON public.ai_operations(lawyer_case_id) WHERE lawyer_case_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.ai_provider_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL REFERENCES public.ai_operations(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL CHECK (attempt_number>0),
  provider text NOT NULL,
  requested_model text NOT NULL,
  actual_model text,
  provider_request_id text,
  prompt_tokens bigint CHECK (prompt_tokens>=0),
  completion_tokens bigint CHECK (completion_tokens>=0),
  total_tokens bigint CHECK (total_tokens>=0),
  provider_cost_actual numeric CHECK (provider_cost_actual>=0 AND provider_cost_actual::text NOT IN ('NaN','Infinity')),
  provider_cost_estimated numeric CHECK (provider_cost_estimated>=0 AND provider_cost_estimated::text NOT IN ('NaN','Infinity')),
  currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
  usage_details jsonb,
  reserved_tokens bigint NOT NULL CHECK (reserved_tokens>=0),
  latency_ms bigint CHECK (latency_ms>=0),
  status text NOT NULL DEFAULT 'started' CHECK(status IN ('started','succeeded','failed')),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(operation_id,attempt_number)
);
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS operation_id uuid REFERENCES public.ai_operations(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_operation ON public.ai_usage(operation_id) WHERE operation_id IS NOT NULL;
ALTER TABLE public.ai_usage_monthly ADD COLUMN IF NOT EXISTS reserved_operations integer NOT NULL DEFAULT 0 CHECK(reserved_operations>=0);
ALTER TABLE public.ai_usage_monthly ADD COLUMN IF NOT EXISTS reserved_tokens bigint NOT NULL DEFAULT 0 CHECK(reserved_tokens>=0);
ALTER TABLE public.ai_usage_monthly ADD COLUMN IF NOT EXISTS provider_cost_actual numeric;
ALTER TABLE public.ai_usage_monthly ADD COLUMN IF NOT EXISTS provider_cost_estimated numeric;
ALTER TABLE public.ai_usage_monthly ADD COLUMN IF NOT EXISTS unknown_actual_cost_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public.ai_usage_monthly ADD COLUMN IF NOT EXISTS unknown_estimated_cost_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public.ai_usage_monthly ADD COLUMN IF NOT EXISTS unknown_token_attempts integer NOT NULL DEFAULT 0;
-- Preserve the old accumulator as an explicit baseline, never fabricate attempts.
ALTER TABLE public.ai_usage_monthly ADD COLUMN IF NOT EXISTS metering_baseline jsonb;
UPDATE public.ai_usage_monthly SET metering_baseline=jsonb_build_object(
 'tokens',total_tokens,'credits',total_credits,'chat',chat_message_count,'analysis',document_analysis_count,
 'research',jurisprudence_research_count,'estimated_cost',estimated_cost_usd) WHERE metering_baseline IS NULL;
ALTER TABLE public.ai_usage_monthly ALTER COLUMN metering_baseline SET DEFAULT '{}'::jsonb;

ALTER TABLE public.ai_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_operations,public.ai_provider_attempts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.ai_operations,public.ai_provider_attempts TO service_role;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.ai_usage,public.ai_usage_monthly FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.ai_begin_operation(p_lawyer uuid,p_workspace uuid,p_capability text,p_resource uuid,p_key uuid,p_hash text,p_token_limit bigint,p_operation_limit integer,p_conversation uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.ai_operations; m public.ai_usage_monthly; d date; linked uuid; links integer;
BEGIN
 IF p_key IS NULL OR p_lawyer IS NULL OR p_hash IS NULL OR length(p_hash)<>64 OR p_token_limit<=0 OR p_operation_limit<=0 OR p_token_limit IS NULL OR p_operation_limit IS NULL OR p_capability NOT IN ('case_chat','document_chat','document_analysis','research') THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
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
 SELECT count(*), (array_agg(id))[1] INTO links,linked FROM public.lawyer_cases WHERE ai_workspace_id=p_workspace AND lawyer_id=p_lawyer;
 IF links>1 THEN RAISE EXCEPTION 'AI_CASE_LINK_AMBIGUOUS'; END IF;
 INSERT INTO public.ai_operations(lawyer_id,lawyer_case_id,workspace_id,conversation_id,capability,resource_id,idempotency_key,request_hash,period_start,token_limit)
 VALUES(p_lawyer,linked,p_workspace,p_conversation,p_capability,p_resource,p_key,p_hash,d,p_token_limit) RETURNING * INTO o;
 UPDATE public.ai_usage_monthly SET reserved_operations=reserved_operations+1 WHERE lawyer_id=p_lawyer AND period_start=d;
 RETURN jsonb_build_object('operation_id',o.id,'status',o.status,'created',true);
END $$;

CREATE OR REPLACE FUNCTION public.ai_begin_attempt(p_operation uuid,p_provider text,p_model text,p_budget bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.ai_operations; m public.ai_usage_monthly; a public.ai_provider_attempts; n integer;
BEGIN
 SELECT * INTO STRICT o FROM public.ai_operations WHERE id=p_operation;
 PERFORM pg_advisory_xact_lock(hashtextextended('ai-meter:'||o.lawyer_id::text,0));
 SELECT * INTO STRICT o FROM public.ai_operations WHERE id=p_operation FOR UPDATE;
 IF o.status<>'reserved' OR p_budget IS NULL OR p_budget<=0 THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
 IF EXISTS(SELECT 1 FROM public.ai_provider_attempts WHERE operation_id=o.id AND status='started') THEN RAISE EXCEPTION 'AI_OPERATION_IN_PROGRESS'; END IF;
 SELECT * INTO STRICT m FROM public.ai_usage_monthly WHERE lawyer_id=o.lawyer_id AND period_start=o.period_start FOR UPDATE;
 IF m.total_tokens+m.reserved_tokens+p_budget>o.token_limit THEN RAISE EXCEPTION 'AI_MONTHLY_LIMIT_REACHED'; END IF;
 SELECT coalesce(max(attempt_number),0)+1 INTO n FROM public.ai_provider_attempts WHERE operation_id=o.id;
 INSERT INTO public.ai_provider_attempts(operation_id,attempt_number,provider,requested_model,reserved_tokens) VALUES(o.id,n,p_provider,p_model,p_budget) RETURNING * INTO a;
 UPDATE public.ai_usage_monthly SET reserved_tokens=reserved_tokens+p_budget WHERE id=m.id;
 RETURN jsonb_build_object('attempt_id',a.id,'attempt_number',n);
END $$;

CREATE OR REPLACE FUNCTION public.ai_finish_attempt(p_attempt uuid,p_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.ai_provider_attempts; o public.ai_operations;
BEGIN
 SELECT * INTO STRICT a FROM public.ai_provider_attempts WHERE id=p_attempt;
 SELECT * INTO STRICT o FROM public.ai_operations WHERE id=a.operation_id;
 PERFORM pg_advisory_xact_lock(hashtextextended('ai-meter:'||o.lawyer_id::text,0));
 SELECT * INTO STRICT a FROM public.ai_provider_attempts WHERE id=p_attempt FOR UPDATE;
 IF a.status<>'started' THEN RETURN; END IF;
 IF o.status<>'reserved' OR p_data->>'status' NOT IN ('succeeded','failed') OR p_data->>'status' IS NULL THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
 UPDATE public.ai_provider_attempts SET
 actual_model=p_data->>'actual_model',provider_request_id=p_data->>'provider_request_id',
 prompt_tokens=(p_data->>'prompt_tokens')::bigint,completion_tokens=(p_data->>'completion_tokens')::bigint,total_tokens=(p_data->>'total_tokens')::bigint,
 provider_cost_actual=(p_data->>'provider_cost_actual')::numeric,provider_cost_estimated=(p_data->>'provider_cost_estimated')::numeric,
 usage_details=p_data->'usage_details',latency_ms=(p_data->>'latency_ms')::bigint,status=p_data->>'status',error_code=p_data->>'error_code',completed_at=now()
 WHERE id=a.id RETURNING * INTO a;
 UPDATE public.ai_usage_monthly SET reserved_tokens=reserved_tokens-a.reserved_tokens,
 total_tokens=total_tokens+coalesce(a.total_tokens,0),
 provider_cost_actual=CASE WHEN a.provider_cost_actual IS NULL THEN provider_cost_actual ELSE coalesce(provider_cost_actual,0)+a.provider_cost_actual END,
 provider_cost_estimated=CASE WHEN a.provider_cost_estimated IS NULL THEN provider_cost_estimated ELSE coalesce(provider_cost_estimated,0)+a.provider_cost_estimated END,
 estimated_cost_usd=CASE WHEN a.provider_cost_estimated IS NULL THEN estimated_cost_usd ELSE coalesce(estimated_cost_usd,0)+a.provider_cost_estimated END,
 unknown_actual_cost_attempts=unknown_actual_cost_attempts+(a.provider_cost_actual IS NULL)::integer,
 unknown_estimated_cost_attempts=unknown_estimated_cost_attempts+(a.provider_cost_estimated IS NULL)::integer,
 unknown_token_attempts=unknown_token_attempts+(a.total_tokens IS NULL)::integer,updated_at=now()
 WHERE lawyer_id=o.lawyer_id AND period_start=o.period_start;
 IF NOT FOUND THEN RAISE EXCEPTION 'AI_USAGE_UNAVAILABLE'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.ai_finish_operation(p_operation uuid,p_status integer,p_body jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.ai_operations; u record; ok boolean; credits bigint;
BEGIN
 SELECT * INTO STRICT o FROM public.ai_operations WHERE id=p_operation;
 PERFORM pg_advisory_xact_lock(hashtextextended('ai-meter:'||o.lawyer_id::text,0));
 SELECT * INTO STRICT o FROM public.ai_operations WHERE id=p_operation FOR UPDATE;
 IF o.status<>'reserved' THEN RETURN jsonb_build_object('id',o.id,'status',o.status,'terminal',true); END IF;
 IF p_status IS NULL OR p_status<200 OR p_status>599 OR p_body IS NULL THEN RAISE EXCEPTION 'AI_INVALID_OPERATION'; END IF;
 IF EXISTS(SELECT 1 FROM public.ai_provider_attempts WHERE operation_id=o.id AND status='started') THEN RAISE EXCEPTION 'AI_RECONCILIATION_REQUIRED'; END IF;
 ok:=p_status<300;
 SELECT count(*) AS attempts,sum(prompt_tokens) AS input_tokens,sum(completion_tokens) AS output_tokens,sum(total_tokens) AS tokens,
 CASE WHEN count(*)=count(provider_cost_estimated) THEN sum(provider_cost_estimated) END AS estimated,
 max(requested_model) AS model,max(provider) AS provider INTO u FROM public.ai_provider_attempts WHERE operation_id=o.id;
 credits:=ceil(coalesce(u.tokens,0)::numeric/1000);
 IF u.attempts>0 THEN
 INSERT INTO public.ai_usage(operation_id,lawyer_id,workspace_id,document_id,conversation_id,operation,provider,model,input_tokens,output_tokens,total_tokens,credits_used,estimated_cost_usd)
 VALUES(o.id,o.lawyer_id,o.workspace_id,CASE WHEN o.capability IN ('document_analysis','document_chat') THEN o.resource_id END,
 coalesce(o.conversation_id,CASE WHEN o.capability='case_chat' THEN o.resource_id END),
 CASE WHEN o.capability='research' THEN 'jurisprudence_research' WHEN o.capability='document_chat' THEN 'case_chat' ELSE o.capability END,
 u.provider,u.model,coalesce(u.input_tokens,0),coalesce(u.output_tokens,0),coalesce(u.tokens,0),credits,u.estimated);
 END IF;
 UPDATE public.ai_usage_monthly SET reserved_operations=reserved_operations-1,total_credits=total_credits+credits,
 chat_message_count=chat_message_count+(ok AND o.capability IN ('case_chat','document_chat'))::integer,
 document_analysis_count=document_analysis_count+(ok AND o.capability='document_analysis')::integer,
 jurisprudence_research_count=jurisprudence_research_count+(ok AND o.capability='research')::integer,updated_at=now()
 WHERE lawyer_id=o.lawyer_id AND period_start=o.period_start;
 IF NOT FOUND THEN RAISE EXCEPTION 'AI_USAGE_UNAVAILABLE'; END IF;
 UPDATE public.ai_operations SET status=CASE WHEN ok THEN 'succeeded' ELSE 'failed' END,quota_units=ok::integer,response_status=p_status,response_body=p_body,completed_at=now() WHERE id=o.id RETURNING * INTO o;
 RETURN jsonb_build_object('id',o.id,'status',o.status,'terminal',true);
END $$;

-- Read-only reconciliation includes an explicit pre-migration baseline. In-flight
-- attempts retain their reservation until reconciled; they must never be rerun blindly.
CREATE OR REPLACE VIEW public.ai_metering_reconciliation AS
SELECT m.lawyer_id,m.period_start,
 m.total_tokens-coalesce((m.metering_baseline->>'tokens')::bigint,0)-coalesce(a.tokens,0) AS token_delta,
 m.chat_message_count-coalesce((m.metering_baseline->>'chat')::bigint,0)-coalesce(o.chat,0) AS chat_delta,
 m.document_analysis_count-coalesce((m.metering_baseline->>'analysis')::bigint,0)-coalesce(o.analysis,0) AS analysis_delta,
 m.jurisprudence_research_count-coalesce((m.metering_baseline->>'research')::bigint,0)-coalesce(o.research,0) AS research_delta,
 m.reserved_operations-coalesce(o.pending,0) AS reservation_delta,
 m.reserved_tokens-coalesce(a.reserved,0) AS reserved_token_delta,
 coalesce(m.provider_cost_actual,0)-coalesce(a.actual,0) AS actual_cost_delta,
 coalesce(m.provider_cost_estimated,0)-coalesce(a.estimated,0) AS estimated_provider_cost_delta,
 coalesce(m.estimated_cost_usd,0)-coalesce((m.metering_baseline->>'estimated_cost')::numeric,0)-coalesce(a.estimated,0) AS estimated_cost_delta,
 coalesce(o.pending,0) AS pending_operations,coalesce(a.unknown,0) AS unknown_cost_attempts,
 coalesce(o.missing_ledger,0) AS terminal_operations_without_ledger
FROM public.ai_usage_monthly m
LEFT JOIN LATERAL (SELECT sum(quota_units) FILTER(WHERE capability IN ('case_chat','document_chat')) AS chat,
 sum(quota_units) FILTER(WHERE capability='document_analysis') AS analysis,sum(quota_units) FILTER(WHERE capability='research') AS research,
 count(*) FILTER(WHERE status='reserved') AS pending,
 count(*) FILTER(WHERE status<>'reserved' AND EXISTS(SELECT 1 FROM public.ai_provider_attempts t WHERE t.operation_id=x.id) AND NOT EXISTS(SELECT 1 FROM public.ai_usage u WHERE u.operation_id=x.id)) AS missing_ledger
 FROM public.ai_operations x WHERE lawyer_id=m.lawyer_id AND period_start=m.period_start) o ON true
LEFT JOIN LATERAL (SELECT sum(t.total_tokens) FILTER(WHERE t.status<>'started') AS tokens,
 sum(t.provider_cost_actual) AS actual,sum(t.provider_cost_estimated) AS estimated,
 sum(t.reserved_tokens) FILTER(WHERE t.status='started') AS reserved,
 count(*) FILTER(WHERE t.status<>'started' AND t.provider_cost_actual IS NULL) AS unknown
 FROM public.ai_provider_attempts t JOIN public.ai_operations x ON x.id=t.operation_id WHERE x.lawyer_id=m.lawyer_id AND x.period_start=m.period_start) a ON true;
REVOKE ALL ON public.ai_metering_reconciliation FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ai_metering_reconciliation TO service_role;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('ai_begin_operation','ai_begin_attempt','ai_finish_attempt','ai_finish_operation') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.sig);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.sig);
 END LOOP;
END $$;
COMMIT;
