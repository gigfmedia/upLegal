-- Pro gates for 3B-2 — enforce hasProAccess for LAWYER_DIRECT writes
-- Function to check Pro entitlement (shared with RLS)

CREATE OR REPLACE FUNCTION public.has_pro_access(p_lawyer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lawyer_subscriptions s
    WHERE s.lawyer_id = p_lawyer_id
      AND s.status = 'active'
      AND s.current_period_end > now()
  ) OR EXISTS (
    SELECT 1 FROM public.lawyer_subscriptions s
    WHERE s.lawyer_id = p_lawyer_id
      AND s.status = 'cancelled'
      AND s.current_period_end > now()
  );
$$;

-- Update lawyer_clients INSERT policy to require Pro
DROP POLICY IF EXISTS "lawyer_clients_owner_insert" ON public.lawyer_clients;
CREATE POLICY "lawyer_clients_owner_insert"
ON public.lawyer_clients FOR INSERT TO authenticated
WITH CHECK (auth.uid() = lawyer_id AND public.has_pro_access(auth.uid()));

-- Keep SELECT/UPDATE/DELETE as owner only (no Pro for reads)
-- lawyer_cases INSERT already has owner check, add Pro
DROP POLICY IF EXISTS "lawyer_cases_owner_insert" ON public.lawyer_cases;
CREATE POLICY "lawyer_cases_owner_insert"
ON public.lawyer_cases FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = lawyer_id
  AND public.has_pro_access(auth.uid())
  AND (
    (client_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_clients WHERE id = client_id AND lawyer_id = auth.uid()))
    AND (booking_id IS NULL OR EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND lawyer_id = auth.uid()))
  )
);

-- bookings LAWYER_DIRECT INSERT already has policy, add Pro check
DROP POLICY IF EXISTS "Lawyers can insert own LAWYER_DIRECT bookings" ON public.bookings;
CREATE POLICY "Lawyers can insert own LAWYER_DIRECT bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = lawyer_id
  AND source = 'LAWYER_DIRECT'
  AND public.has_pro_access(auth.uid())
  AND (
    (client_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_clients WHERE id = client_id AND lawyer_id = auth.uid()))
    AND (case_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_cases WHERE id = case_id AND lawyer_id = auth.uid()))
  )
);

-- Note: Marketplace bookings (UNKNOWN) via service_role bypass RLS, no Pro check needed
-- RequestsPage handleProcess also does bookings UPDATE + lawyer_cases INSERT, both now require Pro via RLS
