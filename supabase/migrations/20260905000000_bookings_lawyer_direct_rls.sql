-- FASE 1B.2 — Minimal RLS for lawyer_direct bookings
-- Allows authenticated lawyer to INSERT/UPDATE own bookings with source=LAWYER_DIRECT
-- Marketplace (service_role) bypasses RLS, so existing POST /api/bookings/create unchanged
-- Idempotent

-- Ensure RLS is enabled (already enabled via earlier migrations, but ensure)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- DROP existing policies if they exist with same name (idempotent)
DROP POLICY IF EXISTS "Lawyers can insert own LAWYER_DIRECT bookings" ON public.bookings;
DROP POLICY IF EXISTS "Lawyers can update own bookings" ON public.bookings;

-- INSERT: only LAWYER_DIRECT and own lawyer_id and valid client_id if supplied
CREATE POLICY "Lawyers can insert own LAWYER_DIRECT bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = lawyer_id
    AND source = 'LAWYER_DIRECT'
    AND (client_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_clients WHERE id = client_id AND lawyer_id = auth.uid()))
  );

-- UPDATE: only own bookings, cannot change lawyer_id to another, and client_id must belong to own lawyer
CREATE POLICY "Lawyers can update own bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = lawyer_id)
  WITH CHECK (
    auth.uid() = lawyer_id
    AND (client_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_clients WHERE id = client_id AND lawyer_id = auth.uid()))
  );

-- Note: SELECT policy for lawyers already exists (implied by useLawyerJobs working), no change.
-- No DELETE policy added (cancel via status update, not delete).

COMMENT ON POLICY "Lawyers can insert own LAWYER_DIRECT bookings" ON public.bookings IS 'FASE 1B.2: allows SaaS lawyer_direct creation, source must be LAWYER_DIRECT, client_id must belong to same lawyer';
