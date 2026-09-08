-- FASE 4B-6: durable email idempotency for booking/payment events
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_event_id text NOT NULL,
  notification_type text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  provider_message_id text,
  error text,
  attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_event_id, notification_type, recipient)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_business_event ON public.notification_deliveries(business_event_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON public.notification_deliveries(status);

COMMENT ON TABLE public.notification_deliveries IS 'FASE 4B-6: idempotent delivery log for booking/payment emails';
