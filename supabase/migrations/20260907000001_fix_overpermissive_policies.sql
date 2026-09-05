-- Fix over-permissive legacy policies that bypass tenant isolation
-- Keeps only minimal policies from 20260907000000 plus legitimate admin/service_role

-- appointments: drop permissive true policies (keep lawyer/client specific)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.appointments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.appointments;
DROP POLICY IF EXISTS "Enable update for own appointments" ON public.appointments;
-- keep: appointments_lawyer_select, appointments_client_select, appointments_client_insert, appointments_lawyer_update, appointments_client_update, appointments_owner_delete, Admins can view all appointments

-- service_quote_requests: drop public true insert and public role policies that are redundant/over-permissive
-- Keep only our new authenticated lawyer/client select (tenant isolated)
DROP POLICY IF EXISTS "Users can insert quote requests" ON public.service_quote_requests;
DROP POLICY IF EXISTS "Lawyers can view their quote requests" ON public.service_quote_requests;
DROP POLICY IF EXISTS "Users can view their quote requests" ON public.service_quote_requests;
DROP POLICY IF EXISTS "Lawyers can update their quote requests" ON public.service_quote_requests;
-- keep: service_quote_requests_lawyer_select, service_quote_requests_client_select (authenticated)

-- lawyer_services: drop legacy public role duplicate (keep new anon+authenticated public and authenticated owner)
DROP POLICY IF EXISTS "Lawyers can manage their own services" ON public.lawyer_services;
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.lawyer_services;
-- keep: lawyer_services_public_select (anon,authenticated true), owner insert/update/delete (authenticated)

-- booking_leads / payment_events: keep existing admin/service_role/user_select_own as they provide some isolation; no change
-- If strict deny desired, would drop user_select_own/admin, but retain for now as they are not over-permissive for cross-tenant (user_select_own checks email)
