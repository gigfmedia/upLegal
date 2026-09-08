-- FASE 4B-3 C12: persist checkout-time economics snapshot for idempotent accounting
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;

COMMENT ON COLUMN public.bookings.pricing_snapshot IS 'Immutable snapshot of checkout economics: base, surcharge, platform_fee, lawyer_amount, percents, client_total';

CREATE INDEX IF NOT EXISTS idx_bookings_pricing_snapshot ON public.bookings USING GIN (pricing_snapshot);
