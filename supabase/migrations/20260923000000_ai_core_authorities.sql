-- 4.34B: trusted legacy output/accounting writers; no product/tier changes.
BEGIN;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.ai_subscriptions, public.ai_document_analyses, public.ai_chat_messages
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ai_subscriptions, public.ai_document_analyses, public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_subscriptions, public.ai_document_analyses, public.ai_chat_messages TO service_role;
REVOKE ALL ON public.ai_lawyer_invites FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_lawyer_invites TO service_role;

DO $security$
DECLARE p record;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND
      ((tablename IN ('ai_subscriptions','ai_document_analyses','ai_chat_messages') AND cmd <> 'SELECT')
       OR tablename = 'ai_lawyer_invites')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END
$security$;

-- Clients upload metadata and delete owned documents; only the backend processes it.
-- Pin the defaults the INSERT policy below depends on (frontend omits both fields).
ALTER TABLE public.ai_documents ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.ai_documents ALTER COLUMN analysis_status SET DEFAULT 'none';
REVOKE UPDATE ON public.ai_documents FROM PUBLIC, anon, authenticated;
DO $documents$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='ai_documents' AND cmd IN ('INSERT','UPDATE','ALL')
  LOOP EXECUTE format('DROP POLICY %I ON public.ai_documents', p.policyname); END LOOP;
END
$documents$;
DROP POLICY IF EXISTS ai_documents_insert_owned_reference ON public.ai_documents;
CREATE POLICY ai_documents_insert_owned_reference ON public.ai_documents
FOR INSERT TO authenticated WITH CHECK (
  lawyer_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.ai_workspaces w WHERE w.id = workspace_id AND w.lawyer_id = auth.uid())
  AND file_path = lawyer_id::text || '/' || workspace_id::text || '/' || id::text || '/original.pdf'
  AND status = 'pending' AND analysis_status = 'none' AND extracted_text IS NULL
);

-- Harden EVERY deployed overload without changing its signature or accumulation logic.
-- Preserve older bigint callers as well as the current research-aware signature.
DO $usage$
DECLARE f record; definition text; validation text;
BEGIN
  FOR f IN SELECT p.oid, p.oid::regprocedure AS signature, pg_get_functiondef(p.oid) AS definition,
                  pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='increment_ai_usage_monthly'
  LOOP
    validation := $guard$
  IF p_lawyer_id IS NULL OR p_period_start IS NULL OR p_period_end IS NULL
     OR p_period_end <= p_period_start
     OR p_total_tokens IS NULL OR p_total_tokens < 0
     OR p_total_credits IS NULL OR p_total_credits < 0
     OR p_document_analysis_count IS NULL OR p_document_analysis_count < 0
     OR p_chat_message_count IS NULL OR p_chat_message_count < 0
     OR p_estimated_cost_usd IS NULL OR p_estimated_cost_usd < 0
     OR p_estimated_cost_usd::text IN ('NaN','Infinity','-Infinity') THEN
    RAISE EXCEPTION 'Invalid AI usage quantities or period' USING ERRCODE = '22023';
  END IF;
$guard$;
    IF position('p_jurisprudence_research_count' IN f.args) > 0 THEN
      validation := validation || $guard$
  IF p_jurisprudence_research_count IS NULL OR p_jurisprudence_research_count < 0 THEN
    RAISE EXCEPTION 'Invalid AI research usage' USING ERRCODE = '22023';
  END IF;
$guard$;
    END IF;
    IF position('BEGIN' IN f.definition) = 0 THEN RAISE EXCEPTION 'Unexpected usage RPC body'; END IF;
    definition := regexp_replace(f.definition, 'BEGIN', 'BEGIN' || validation);
    EXECUTE definition;
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
END
$usage$;
COMMIT;
