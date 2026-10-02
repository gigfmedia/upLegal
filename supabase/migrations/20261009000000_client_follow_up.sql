-- FASE 5.4 — Client follow-up & communication tracking.
-- lawyer_client_communications: registro mínimo de que hubo comunicación
-- (canal + fecha + nota breve opcional). Asociada al cliente (requerido)
-- y al caso cuando ocurre en su contexto (nullable). NO guarda contenido
-- de conversaciones ni importa mensajes.
-- lawyer_cases.client_follow_up_due_at: recordatorio opcional definido por
-- el abogado ("recordarme actualizar al cliente el 10 oct"). Cumplir =
-- registrar comunicación (limpia la fecha) + programar nueva opcional.

CREATE TABLE IF NOT EXISTS public.lawyer_client_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.lawyer_clients(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.lawyer_cases(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email','phone','meeting','other')),
  note text CHECK (note IS NULL OR length(note) <= 500),
  communicated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lawyer_client_communications IS 'FASE 5.4: tracking de comunicación con cliente (canal+fecha+nota breve). Sin contenido de conversaciones.';

DROP TRIGGER IF EXISTS trg_lawyer_client_communications_updated_at ON public.lawyer_client_communications;
CREATE TRIGGER trg_lawyer_client_communications_updated_at
  BEFORE UPDATE ON public.lawyer_client_communications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_lawyer_client_comms_case
  ON public.lawyer_client_communications (case_id, communicated_at DESC)
  WHERE case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lawyer_client_comms_client
  ON public.lawyer_client_communications (lawyer_id, client_id, communicated_at DESC);

ALTER TABLE public.lawyer_client_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lawyer_client_comms_owner_select" ON public.lawyer_client_communications;
CREATE POLICY "lawyer_client_comms_owner_select"
  ON public.lawyer_client_communications FOR SELECT
  USING (auth.uid() = lawyer_id);

DROP POLICY IF EXISTS "lawyer_client_comms_owner_insert" ON public.lawyer_client_communications;
CREATE POLICY "lawyer_client_comms_owner_insert"
  ON public.lawyer_client_communications FOR INSERT
  WITH CHECK (
    auth.uid() = lawyer_id
    AND EXISTS (SELECT 1 FROM public.lawyer_clients c WHERE c.id = client_id AND c.lawyer_id = auth.uid())
    AND (case_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_cases c WHERE c.id = case_id AND c.lawyer_id = auth.uid()))
  );

DROP POLICY IF EXISTS "lawyer_client_comms_owner_update" ON public.lawyer_client_communications;
CREATE POLICY "lawyer_client_comms_owner_update"
  ON public.lawyer_client_communications FOR UPDATE
  USING (auth.uid() = lawyer_id)
  WITH CHECK (
    auth.uid() = lawyer_id
    AND EXISTS (SELECT 1 FROM public.lawyer_clients c WHERE c.id = client_id AND c.lawyer_id = auth.uid())
    AND (case_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_cases c WHERE c.id = case_id AND c.lawyer_id = auth.uid()))
  );

DROP POLICY IF EXISTS "lawyer_client_comms_owner_delete" ON public.lawyer_client_communications;
CREATE POLICY "lawyer_client_comms_owner_delete"
  ON public.lawyer_client_communications FOR DELETE
  USING (auth.uid() = lawyer_id);

-- Recordatorio opcional de seguimiento por caso.
ALTER TABLE public.lawyer_cases
  ADD COLUMN IF NOT EXISTS client_follow_up_due_at timestamptz;

COMMENT ON COLUMN public.lawyer_cases.client_follow_up_due_at IS 'FASE 5.4: recordatorio opcional definido por el abogado. Registrar comunicación lo cumple (NULL) salvo nueva fecha.';

CREATE INDEX IF NOT EXISTS idx_lawyer_cases_follow_up_due
  ON public.lawyer_cases (lawyer_id, client_follow_up_due_at)
  WHERE client_follow_up_due_at IS NOT NULL;
