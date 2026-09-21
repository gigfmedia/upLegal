-- FASE 4.37E — marketplace services must NOT require Pro.
--
-- Services are lawyer profile/acquisition supply, not a paid operational
-- entitlement. Any authenticated lawyer manages ONLY their own rows.
--
-- This migration removes ONLY the has_pro_access() condition from the three
-- write policies, preserving verbatim:
--   - authenticated role
--   - ownership (auth.uid()::text = lawyer_user_id::text) in USING and
--     WITH CHECK (no takeover, no cross-tenant writes)
--   - public SELECT (lawyer_services_public_select, untouched)
--   - service_role bypass (untouched)
-- No validation, pricing, or marketplace-read changes.

BEGIN;

-- INSERT: owner only (Pro condition removed)
DROP POLICY IF EXISTS "lawyer_services_owner_insert" ON public.lawyer_services;
CREATE POLICY "lawyer_services_owner_insert"
ON public.lawyer_services
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid()::text = lawyer_user_id::text
);

-- UPDATE: owner only in USING and WITH CHECK (Pro condition removed)
DROP POLICY IF EXISTS "lawyer_services_owner_update" ON public.lawyer_services;
CREATE POLICY "lawyer_services_owner_update"
ON public.lawyer_services
FOR UPDATE TO authenticated
USING (
  auth.uid()::text = lawyer_user_id::text
)
WITH CHECK (
  auth.uid()::text = lawyer_user_id::text
);

-- DELETE: owner only (Pro condition removed)
DROP POLICY IF EXISTS "lawyer_services_owner_delete" ON public.lawyer_services;
CREATE POLICY "lawyer_services_owner_delete"
ON public.lawyer_services
FOR DELETE TO authenticated
USING (
  auth.uid()::text = lawyer_user_id::text
);

-- SELECT stays public (marketplace discovery + owner reads, no Pro).
-- has_pro_access() remains the authority for Pro features elsewhere;
-- it is simply no longer consulted for service CRUD.

COMMIT;
