-- Fase 1: protect the DB relationships used by server authorization.
-- No tables/columns/data are created or rewritten. Apply before the server change.
-- Existing company migrations are absent from this repository; these restrictive
-- policies remain effective even alongside legacy permissive policies.
BEGIN;

CREATE OR REPLACE FUNCTION public.security_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT COALESCE(auth.jwt()->'app_metadata'->>'role' IN ('admin', 'superadmin'), false);
$$;

CREATE OR REPLACE FUNCTION public.security_company_role(p_company_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN c.user_id = auth.uid() THEN 'owner'
    ELSE (
      SELECT m.role FROM public.company_members m
      WHERE m.company_id = c.id AND m.user_id = auth.uid()
        AND m.joined_at IS NOT NULL AND m.role IN ('admin', 'member', 'viewer')
      ORDER BY m.created_at, m.id LIMIT 1
    )
  END FROM public.companies c WHERE c.id = p_company_id;
$$;

CREATE OR REPLACE FUNCTION public.security_company_access(p_company_id uuid, p_write boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT public.security_platform_admin() OR COALESCE(
    public.security_company_role(p_company_id) = ANY(
      CASE WHEN p_write THEN ARRAY['owner', 'admin', 'member']
      ELSE ARRAY['owner', 'admin', 'member', 'viewer'] END), false);
$$;

CREATE OR REPLACE FUNCTION public.security_request_assignment(p_request_id uuid, p_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_requests r
    WHERE r.id = p_request_id AND r.company_id = p_company_id AND r.lawyer_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.security_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.security_company_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.security_company_access(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.security_request_assignment(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.security_platform_admin(), public.security_company_role(uuid),
  public.security_company_access(uuid, boolean), public.security_request_assignment(uuid, uuid)
  TO anon, authenticated, service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Membership administration is server-only. There is no membership-management
-- client flow in this repository. Users cannot join B or promote themselves.
REVOKE INSERT, UPDATE, DELETE ON public.company_members FROM anon, authenticated;
CREATE POLICY security_members_insert ON public.company_members AS RESTRICTIVE
  FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY security_members_update ON public.company_members AS RESTRICTIVE
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY security_members_delete ON public.company_members AS RESTRICTIVE
  FOR DELETE TO anon, authenticated USING (false);
CREATE POLICY security_members_select ON public.company_members AS RESTRICTIVE
  FOR SELECT TO anon, authenticated USING (
    user_id = auth.uid() OR public.security_company_role(company_id) = 'owner' OR public.security_platform_admin()
  );

CREATE POLICY security_companies_select ON public.companies AS RESTRICTIVE
  FOR SELECT TO anon, authenticated USING (user_id = auth.uid() OR public.security_company_access(id));
CREATE POLICY security_companies_insert ON public.companies AS RESTRICTIVE
  FOR INSERT TO anon, authenticated WITH CHECK (user_id = auth.uid() OR public.security_platform_admin());
CREATE POLICY security_companies_update ON public.companies AS RESTRICTIVE
  FOR UPDATE TO anon, authenticated USING (
    public.security_company_role(id) IN ('owner', 'admin') OR public.security_platform_admin()
  ) WITH CHECK (public.security_company_role(id) IN ('owner', 'admin') OR public.security_platform_admin());
CREATE POLICY security_companies_delete ON public.companies AS RESTRICTIVE
  FOR DELETE TO anon, authenticated USING (user_id = auth.uid() OR public.security_platform_admin());

-- Keep resource tenant IDs immutable for browser callers; otherwise changing
-- company_id would defeat a subsequent server-side ownership lookup.
CREATE OR REPLACE FUNCTION public.security_preserve_company_authority()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  new_row jsonb := to_jsonb(NEW);
  old_row jsonb;
  target_company uuid;
BEGIN
  IF auth.role() = 'service_role' OR current_user = 'postgres' OR public.security_platform_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    old_row := to_jsonb(OLD);
    IF new_row->'id' IS DISTINCT FROM old_row->'id'
      OR new_row->'company_id' IS DISTINCT FROM old_row->'company_id'
      OR (TG_TABLE_NAME = 'companies' AND new_row->'user_id' IS DISTINCT FROM old_row->'user_id')
      OR (TG_TABLE_NAME = 'company_requests' AND (
        new_row->'lawyer_id' IS DISTINCT FROM old_row->'lawyer_id'
        OR new_row->'user_id' IS DISTINCT FROM old_row->'user_id'
        OR new_row->'assigned_by' IS DISTINCT FROM old_row->'assigned_by')) THEN
      RAISE EXCEPTION 'Company ownership and assignment are server-managed' USING ERRCODE = '42501';
    END IF;
  ELSIF TG_TABLE_NAME = 'company_requests' THEN
    IF (new_row->>'user_id')::uuid IS DISTINCT FROM auth.uid()
      OR new_row->>'lawyer_id' IS NOT NULL OR new_row->>'assigned_by' IS NOT NULL THEN
      RAISE EXCEPTION 'Request identity and assignment cannot be supplied by the client' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'company_budgets' AND new_row->>'request_id' IS NOT NULL THEN
    SELECT r.company_id INTO target_company FROM public.company_requests r WHERE r.id = (new_row->>'request_id')::uuid;
    IF target_company IS DISTINCT FROM (new_row->>'company_id')::uuid THEN
      RAISE EXCEPTION 'Request belongs to another company' USING ERRCODE = '42501';
    END IF;
  ELSIF TG_TABLE_NAME IN ('legal_documents', 'legal_folders') THEN
    IF COALESCE(new_row->>'folder_id', new_row->>'parent_id') IS NOT NULL THEN
      SELECT f.company_id INTO target_company FROM public.legal_folders f
        WHERE f.id = COALESCE(new_row->>'folder_id', new_row->>'parent_id')::uuid;
      IF target_company IS DISTINCT FROM (new_row->>'company_id')::uuid THEN
        RAISE EXCEPTION 'Folder belongs to another company' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies', 'company_requests', 'company_budgets', 'legal_documents', 'legal_folders'] LOOP
    EXECUTE format('CREATE TRIGGER security_preserve_company_authority BEFORE INSERT OR UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.security_preserve_company_authority()', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['company_requests', 'company_budgets', 'legal_documents', 'legal_folders'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY security_tenant_select ON public.%I AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (
      public.security_company_access(company_id) %s)', t,
      CASE WHEN t = 'company_requests' THEN 'OR lawyer_id = auth.uid()'
        WHEN t = 'company_budgets' THEN 'OR public.security_request_assignment(request_id, company_id)' ELSE '' END);
    EXECUTE format('CREATE POLICY security_tenant_insert ON public.%I AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (%s)', t,
      CASE WHEN t = 'company_budgets' THEN '(public.security_company_role(company_id) IN (''owner'', ''admin'') OR public.security_platform_admin())'
        ELSE 'public.security_company_access(company_id, true)' END);
    EXECUTE format('CREATE POLICY security_tenant_update ON public.%I AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (%s) WITH CHECK (%s)', t,
      CASE WHEN t = 'company_budgets' THEN '(public.security_company_role(company_id) IN (''owner'', ''admin'') OR public.security_platform_admin())'
        WHEN t = 'company_requests' THEN '(public.security_company_access(company_id, true) OR lawyer_id = auth.uid())'
        ELSE 'public.security_company_access(company_id, true)' END,
      CASE WHEN t = 'company_budgets' THEN '(public.security_company_role(company_id) IN (''owner'', ''admin'') OR public.security_platform_admin())'
        WHEN t = 'company_requests' THEN '(public.security_company_access(company_id, true) OR lawyer_id = auth.uid())'
        ELSE 'public.security_company_access(company_id, true)' END);
    EXECUTE format('CREATE POLICY security_tenant_delete ON public.%I AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (
      public.security_company_role(company_id) IN (''owner'', ''admin'') OR public.security_platform_admin())', t);
  END LOOP;
END;
$$;

COMMIT;
