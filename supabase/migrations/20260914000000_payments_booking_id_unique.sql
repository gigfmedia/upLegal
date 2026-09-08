-- FASE 3B: idempotencia payment accounting — un payment por booking moderno
CREATE UNIQUE INDEX IF NOT EXISTS uniq_payments_booking_id ON public.payments(booking_id) WHERE booking_id IS NOT NULL;
