-- FASE 4.28A.2 — First direct case free / second case Pro
-- has_pro_access remains paid-only. New narrow helper for case creation.
CREATE OR REPLACE FUNCTION public.can_create_lawyer_case(p_lawyer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_pro_access(p_lawyer_id)
  OR NOT EXISTS (
    SELECT 1 FROM public.lawyer_cases
    WHERE lawyer_id = p_lawyer_id
      AND source = 'LAWYER_DIRECT'
  )
$$;

-- Replace lawyer_cases INSERT policy: keep ownership checks, replace has_pro_access with can_create
DROP POLICY IF EXISTS "lawyer_cases_owner_insert" ON public.lawyer_cases;
CREATE POLICY "lawyer_cases_owner_insert"
ON public.lawyer_cases FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = lawyer_id
  AND public.can_create_lawyer_case(auth.uid())
  AND (
    (client_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_clients WHERE id = client_id AND lawyer_id = auth.uid()))
    AND (booking_id IS NULL OR EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND lawyer_id = auth.uid()))
  )
);
