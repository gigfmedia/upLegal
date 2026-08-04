-- Fase 3.6: Cost tracking interno del consumo de IA.
-- Unidad interna: 1 crédito = 1.000 tokens (credits_used = ceil(total_tokens / 1000)).
-- Las tablas ya existen en la BD remota (creadas vía SQL editor); se mantienen
-- idempotentes para poder ejecutarse en cualquier entorno.

-- Registro detallado por llamada (document_analysis | case_chat).
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  workspace_id uuid,
  document_id uuid,
  conversation_id uuid,
  operation text NOT NULL CHECK (operation IN ('document_analysis', 'case_chat')),
  provider text,
  model text,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Resumen mensual por abogado, actualizado atómicamente vía RPC.
CREATE TABLE IF NOT EXISTS public.ai_usage_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_credits integer NOT NULL DEFAULT 0,
  document_analysis_count integer NOT NULL DEFAULT 0,
  chat_message_count integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lawyer_id, period_start)
);

-- La migración solo permite al dueño leer su propio consumo.
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_monthly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_owner_select" ON public.ai_usage;
CREATE POLICY "ai_usage_owner_select"
  ON public.ai_usage
  FOR SELECT
  USING (auth.uid() = lawyer_id);

DROP POLICY IF EXISTS "ai_usage_monthly_owner_select" ON public.ai_usage_monthly;
CREATE POLICY "ai_usage_monthly_owner_select"
  ON public.ai_usage_monthly
  FOR SELECT
  USING (auth.uid() = lawyer_id);

-- Índice para consultas de protección por período.
CREATE INDEX IF NOT EXISTS idx_ai_usage_monthly_lawyer_period
  ON public.ai_usage_monthly (lawyer_id, period_start);

-- RPC idempotente: actualiza el resumen mensual de forma atómica.
CREATE OR REPLACE FUNCTION public.increment_ai_usage_monthly(
  p_lawyer_id uuid,
  p_period_start date,
  p_period_end date,
  p_total_tokens integer DEFAULT 0,
  p_total_credits integer DEFAULT 0,
  p_document_analysis_count integer DEFAULT 0,
  p_chat_message_count integer DEFAULT 0,
  p_estimated_cost_usd numeric DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.ai_usage_monthly (
    lawyer_id, period_start, period_end, total_tokens, total_credits,
    document_analysis_count, chat_message_count, estimated_cost_usd
  )
  VALUES (
    p_lawyer_id, p_period_start, p_period_end, p_total_tokens, p_total_credits,
    p_document_analysis_count, p_chat_message_count, p_estimated_cost_usd
  )
  ON CONFLICT (lawyer_id, period_start) DO UPDATE SET
    total_tokens = public.ai_usage_monthly.total_tokens + EXCLUDED.total_tokens,
    total_credits = public.ai_usage_monthly.total_credits + EXCLUDED.total_credits,
    document_analysis_count = public.ai_usage_monthly.document_analysis_count + EXCLUDED.document_analysis_count,
    chat_message_count = public.ai_usage_monthly.chat_message_count + EXCLUDED.chat_message_count,
    estimated_cost_usd = public.ai_usage_monthly.estimated_cost_usd + EXCLUDED.estimated_cost_usd,
    updated_at = now();
END;
$$;

-- La función se ejecuta con permisos del owner pero no se expone a PUBLIC.
REVOKE ALL ON FUNCTION public.increment_ai_usage_monthly(uuid, date, date, integer, integer, integer, integer, numeric) FROM PUBLIC;
