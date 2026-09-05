-- FASE 2A — RLS Gap Closure & Tenant Isolation
-- Minimal, no schema changes, preserve marketplace / service_role

-- =============================================================================
-- 1. service_quote_requests
-- Actor matrix: Anonymous DENY, Client SELECT own (user_id), Lawyer SELECT own (lawyer_id),
-- Admin/service_role via bypass, INSERT/UPDATE via service_role only (Edge Functions)
-- =============================================================================
ALTER TABLE public.service_quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_quote_requests_lawyer_select" ON public.service_quote_requests;
DROP POLICY IF EXISTS "service_quote_requests_client_select" ON public.service_quote_requests;

CREATE POLICY "service_quote_requests_lawyer_select"
ON public.service_quote_requests
FOR SELECT TO authenticated
USING (auth.uid()::text = lawyer_id::text);

CREATE POLICY "service_quote_requests_client_select"
ON public.service_quote_requests
FOR SELECT TO authenticated
USING (auth.uid()::text = user_id::text);

-- No INSERT/UPDATE/DELETE for authenticated: service_role only via Edge Functions
-- Default deny covers them.

-- =============================================================================
-- 2. lawyer_services — public read for marketplace, owner write
-- =============================================================================
ALTER TABLE public.lawyer_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lawyer_services_public_select" ON public.lawyer_services;
DROP POLICY IF EXISTS "lawyer_services_owner_insert" ON public.lawyer_services;
DROP POLICY IF EXISTS "lawyer_services_owner_update" ON public.lawyer_services;
DROP POLICY IF EXISTS "lawyer_services_owner_delete" ON public.lawyer_services;

CREATE POLICY "lawyer_services_public_select"
ON public.lawyer_services
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "lawyer_services_owner_insert"
ON public.lawyer_services
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = lawyer_user_id::text);

CREATE POLICY "lawyer_services_owner_update"
ON public.lawyer_services
FOR UPDATE TO authenticated
USING (auth.uid()::text = lawyer_user_id::text)
WITH CHECK (auth.uid()::text = lawyer_user_id::text);

CREATE POLICY "lawyer_services_owner_delete"
ON public.lawyer_services
FOR DELETE TO authenticated
USING (auth.uid()::text = lawyer_user_id::text);

-- =============================================================================
-- 3. appointments — lawyer and client isolation
-- =============================================================================
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_lawyer_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_client_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_client_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_lawyer_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_client_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_owner_delete" ON public.appointments;

CREATE POLICY "appointments_lawyer_select"
ON public.appointments
FOR SELECT TO authenticated
USING (auth.uid()::text = lawyer_id::text);

CREATE POLICY "appointments_client_select"
ON public.appointments
FOR SELECT TO authenticated
USING (auth.uid()::text = user_id::text);

CREATE POLICY "appointments_client_insert"
ON public.appointments
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "appointments_lawyer_update"
ON public.appointments
FOR UPDATE TO authenticated
USING (auth.uid()::text = lawyer_id::text)
WITH CHECK (auth.uid()::text = lawyer_id::text);

CREATE POLICY "appointments_client_update"
ON public.appointments
FOR UPDATE TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "appointments_owner_delete"
ON public.appointments
FOR DELETE TO authenticated
USING (auth.uid()::text = lawyer_id::text OR auth.uid()::text = user_id::text);

-- =============================================================================
-- 4. booking_leads — service_role only (deny authenticated/anon)
-- =============================================================================
ALTER TABLE public.booking_leads ENABLE ROW LEVEL SECURITY;
-- No policies → DENY for anon/authenticated, service_role bypasses

-- =============================================================================
-- 5. payment_events — service_role only
-- =============================================================================
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
-- No policies → DENY for anon/authenticated, service_role bypasses

-- Note: payments and bookings already ENABLED with policies; no change.
-- bookings remains DENY for SELECT (no SELECT policy) by design.
