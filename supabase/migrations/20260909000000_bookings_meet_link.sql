-- FASE 2C — Deprecación segura appointments: agregar meet_link a bookings
-- No DROP, no heurística, solo columna para que bookings sea fuente operacional

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS meet_link text;
COMMENT ON COLUMN public.bookings.meet_link IS 'Meet link per-booking (future SaaS); legacy appointments.meet_link retained for historic compatibility';

CREATE INDEX IF NOT EXISTS idx_bookings_meet_link ON public.bookings(meet_link) WHERE meet_link IS NOT NULL;

-- No backfill heurístico: appointments 6 filas quedan UNRESOLVED sin FK determinística
-- Futuro backfill determinístico solo si existe FK/ID explícito (no email/fecha)
