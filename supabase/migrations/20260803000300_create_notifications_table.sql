-- Tabla central de notificaciones in-app (server/notifications/service.mjs).
-- Ya existe en la BD remota (creada vía SQL editor); se mantiene idempotente.

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  event_id text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Deduplicación de eventos (retries/webhooks duplicados).
CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_id_unique
  ON public.notifications (event_id)
  WHERE event_id IS NOT NULL;

-- Consultas por destinatario (más leídas de la app).
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id)
  WHERE is_read = false;

-- El dueño solo lee/marca sus propias notificaciones.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_owner_select" ON public.notifications;
CREATE POLICY "notifications_owner_select"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_owner_update" ON public.notifications;
CREATE POLICY "notifications_owner_update"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);
