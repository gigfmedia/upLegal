-- FASE 3C.2B — Gate lawyer_services con LegalUp Pro
-- FREE puede leer (public SELECT), pero INSERT/UPDATE/DELETE requieren has_pro_access
-- No afecta service_role (bypass RLS), no afecta Marketplace (SELECT)

-- INSERT: owner + Pro
DROP POLICY IF EXISTS "lawyer_services_owner_insert" ON public.lawyer_services;
CREATE POLICY "lawyer_services_owner_insert"
ON public.lawyer_services
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid()::text = lawyer_user_id::text
  AND public.has_pro_access(auth.uid())
);

-- UPDATE: owner + Pro (USING y WITH CHECK para evitar bypass)
DROP POLICY IF EXISTS "lawyer_services_owner_update" ON public.lawyer_services;
CREATE POLICY "lawyer_services_owner_update"
ON public.lawyer_services
FOR UPDATE TO authenticated
USING (
  auth.uid()::text = lawyer_user_id::text
  AND public.has_pro_access(auth.uid())
)
WITH CHECK (
  auth.uid()::text = lawyer_user_id::text
  AND public.has_pro_access(auth.uid())
);

-- DELETE: owner + Pro
DROP POLICY IF EXISTS "lawyer_services_owner_delete" ON public.lawyer_services;
CREATE POLICY "lawyer_services_owner_delete"
ON public.lawyer_services
FOR DELETE TO authenticated
USING (
  auth.uid()::text = lawyer_user_id::text
  AND public.has_pro_access(auth.uid())
);

-- SELECT permanece público (no Pro): lawyer_services_public_select ya existe con USING (true) para anon,authenticated
