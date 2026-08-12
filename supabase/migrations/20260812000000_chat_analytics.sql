-- ---------------------------------------------------------------------------
-- Analytics del chat/agente (LegalUpAssistant) para /admin/analytics.
--
-- El asistente público es stateless: no persistía nada. Esta tabla guarda SOLO
-- metadata de uso del agente (sin contenido de conversaciones, sin mensajes,
-- sin datos personales) para responder "¿cuánta gente usa el agente y cuántos
-- leads genera?". La escritura la hace el backend (service_role); el cliente
-- anónimo/autenticado NO tiene acceso.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.chat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  visitor_id text,
  conversation_id text,
  -- 'conversation_started' | 'message_sent'
  event_type text NOT NULL,
  source text,
  category text,
  subcategory text,
  commercial_intent text,
  urgency text,
  -- true cuando la petición vino de localhost/dev: se excluye de los agregados
  is_local boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_chat_events_created_at ON public.chat_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_events_conversation ON public.chat_events (conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_visitor ON public.chat_events (visitor_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_event_type ON public.chat_events (event_type);

ALTER TABLE public.chat_events ENABLE ROW LEVEL SECURITY;

-- Solo el service_role (backend) lee/escribe. El cliente NO: los eventos son
-- navegación anónima del chat y no deben exponerse al SDK del frontend.
-- Idempotente: si se re-ejecuta la migración (p. ej. en el editor SQL), evita
-- el error 42710 "policy already exists" sin tocar la de producción.
DROP POLICY IF EXISTS "service_role_full_access_chat_events" ON public.chat_events;
CREATE POLICY "service_role_full_access_chat_events"
  ON public.chat_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- booking_leads: origen del flujo (widget/directo/empresa) para el tab de leads.
ALTER TABLE public.booking_leads ADD COLUMN IF NOT EXISTS source text;