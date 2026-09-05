-- FASE 2B — Payment traceability: payments.booking_id → bookings.id
-- Adds deterministic financial traceability without breaking legacy appointment flow

-- 1. Add column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments' AND column_name='booking_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;
    COMMENT ON COLUMN public.payments.booking_id IS 'Modern traceability: booking that generated this payment (null for legacy appointment-only payments)';
  END IF;
END $$;

-- 2. Index for joins
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);

-- 3. Helpful composite index for lawyer isolation via booking
CREATE INDEX IF NOT EXISTS idx_payments_lawyer_booking ON public.payments(lawyer_id, booking_id);

-- 4. Backfill deterministic only: where payment_events has unambiguous booking_id and payment id matches external_reference or payment_id?
-- At this stage, payments has no metadata.booking_id (5 rows), so backfill will find 0.
-- We implement a safe, idempotent backfill that only links when:
--   a) payment_events.metadata->>'booking_id' = bookings.id
--   AND payment_events.metadata->>'payment_id' = payments.id (text comparison)
--   AND bookings.id exists and payments.booking_id IS NULL
-- This ensures 1:1 unambiguous link via payment_events.

DO $$
BEGIN
  -- Only attempt if payment_events has payment_id in metadata
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payment_events') THEN
    UPDATE public.payments p
    SET booking_id = b.id
    FROM public.payment_events pe
    JOIN public.bookings b ON b.id::text = pe.metadata->>'booking_id'
    WHERE p.id::text = pe.metadata->>'payment_id'
      AND p.booking_id IS NULL
      AND pe.metadata->>'booking_id' IS NOT NULL
      AND pe.metadata->>'payment_id' IS NOT NULL
      AND b.id IS NOT NULL
      -- Ensure lawyer consistency: only link if same lawyer (prevent cross-tenant mislink)
      AND p.lawyer_id::text = b.lawyer_id::text;

    RAISE NOTICE 'Backfill payments.booking_id via payment_events completed';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Backfill skipped: %', SQLERRM;
END $$;

-- 5. Second backfill path: bookings.payment_id = payments.id (text = uuid) where booking has payment_id
DO $$
BEGIN
  UPDATE public.payments p
  SET booking_id = b.id
  FROM public.bookings b
  WHERE b.payment_id::text = p.id::text
    AND p.booking_id IS NULL
    AND b.payment_id IS NOT NULL
    AND p.lawyer_id::text = b.lawyer_id::text;

  RAISE NOTICE 'Backfill payments.booking_id via bookings.payment_id completed';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Backfill via bookings.payment_id skipped: %', SQLERRM;
END $$;

-- Diagnostic view (not stored, just for manual verification)
-- SELECT count(*) as total,
--        count(booking_id) as linked,
--        count(*) - count(booking_id) as unresolved
-- FROM payments;
