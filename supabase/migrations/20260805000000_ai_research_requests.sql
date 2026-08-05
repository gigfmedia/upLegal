-- Fase 4.0: Investigación de jurisprudencia (fuentes verificables).
-- Cada investigación se guarda por caso (workspace) y abogado, con su respuesta
-- y las fuentes reales que la sustentan. Idempotente para cualquier entorno.

CREATE TABLE IF NOT EXISTS public.ai_research_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.ai_workspaces (id) ON DELETE CASCADE,
  query text NOT NULL,
  answer text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]',
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_research_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_research_requests_owner_select" ON public.ai_research_requests;
CREATE POLICY "ai_research_requests_owner_select"
  ON public.ai_research_requests
  FOR SELECT
  USING (auth.uid() = lawyer_id);

DROP POLICY IF EXISTS "ai_research_requests_owner_insert" ON public.ai_research_requests;
CREATE POLICY "ai_research_requests_owner_insert"
  ON public.ai_research_requests
  FOR INSERT
  WITH CHECK (auth.uid() = lawyer_id);

CREATE INDEX IF NOT EXISTS idx_ai_research_requests_workspace_created
  ON public.ai_research_requests (workspace_id, created_at DESC);

-- La tabla ai_usage solo aceptaba document_analysis y case_chat. Se amplía la
-- operación para registrar la investigación de jurisprudencia. El CHECK original
-- se auto-nombró ai_usage_operation_check (Postgres: tabla_columna_check).
ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_operation_check;
ALTER TABLE public.ai_usage
  ADD CONSTRAINT ai_usage_operation_check
  CHECK (operation IN ('document_analysis', 'case_chat', 'jurisprudence_research'));

-- Contador mensual de investigaciones (Fase 3.6 style).
ALTER TABLE public.ai_usage_monthly
  ADD COLUMN IF NOT EXISTS jurisprudence_research_count integer NOT NULL DEFAULT 0;

-- RPC idempotente ampliada: acepta el contador de investigaciones.
CREATE OR REPLACE FUNCTION public.increment_ai_usage_monthly(
  p_lawyer_id uuid,
  p_period_start date,
  p_period_end date,
  p_total_tokens integer DEFAULT 0,
  p_total_credits integer DEFAULT 0,
  p_document_analysis_count integer DEFAULT 0,
  p_chat_message_count integer DEFAULT 0,
  p_jurisprudence_research_count integer DEFAULT 0,
  p_estimated_cost_usd numeric DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.ai_usage_monthly (
    lawyer_id, period_start, period_end, total_tokens, total_credits,
    document_analysis_count, chat_message_count, jurisprudence_research_count,
    estimated_cost_usd
  )
  VALUES (
    p_lawyer_id, p_period_start, p_period_end, p_total_tokens, p_total_credits,
    p_document_analysis_count, p_chat_message_count, p_jurisprudence_research_count,
    p_estimated_cost_usd
  )
  ON CONFLICT (lawyer_id, period_start) DO UPDATE SET
    total_tokens = public.ai_usage_monthly.total_tokens + EXCLUDED.total_tokens,
    total_credits = public.ai_usage_monthly.total_credits + EXCLUDED.total_credits,
    document_analysis_count = public.ai_usage_monthly.document_analysis_count + EXCLUDED.document_analysis_count,
    chat_message_count = public.ai_usage_monthly.chat_message_count + EXCLUDED.chat_message_count,
    jurisprudence_research_count = public.ai_usage_monthly.jurisprudence_research_count + EXCLUDED.jurisprudence_research_count,
    estimated_cost_usd = public.ai_usage_monthly.estimated_cost_usd + EXCLUDED.estimated_cost_usd,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_ai_usage_monthly(uuid, date, date, integer, integer, integer, integer, integer, numeric) FROM PUBLIC;
