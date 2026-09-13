-- Run AFTER the 4.33D migration on an isolated/local DB or the linked DB.
-- All fixtures and writes roll back. Existing workspace rows are never updated.
BEGIN;
DO $$
DECLARE
  owner_id uuid;
  workspace_id uuid;
  case_id uuid;
  n integer;
BEGIN
  IF has_table_privilege('authenticated', 'public.ai_workspaces', 'INSERT')
     OR has_table_privilege('anon', 'public.ai_workspaces', 'INSERT') THEN
    RAISE EXCEPTION 'Direct INSERT is still granted';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.ai_workspaces', 'INSERT') THEN
    RAISE EXCEPTION 'Canonical writer lost INSERT';
  END IF;
  SELECT lawyer_id INTO owner_id FROM public.ai_workspaces LIMIT 1;
  IF owner_id IS NULL THEN
    SELECT id INTO owner_id FROM public.profiles WHERE role = 'lawyer' LIMIT 1;
  END IF;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Test requires an existing lawyer identity'; END IF;

  -- Canonical order, under the server database role, using rollback-only fixtures.
  SET LOCAL ROLE service_role;
  INSERT INTO public.lawyer_cases(lawyer_id, title, source)
    VALUES(owner_id, '4.33D rollback-only security fixture', 'LAWYER_DIRECT') RETURNING id INTO case_id;
  INSERT INTO public.ai_workspaces(lawyer_id, name)
    VALUES(owner_id, '4.33D rollback-only workspace') RETURNING id INTO workspace_id;
  UPDATE public.lawyer_cases SET ai_workspace_id = workspace_id WHERE id = case_id;
  IF NOT EXISTS(SELECT 1 FROM public.lawyer_cases WHERE id = case_id AND ai_workspace_id = workspace_id) THEN
    RAISE EXCEPTION 'Canonical link failed';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', owner_id::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.ai_workspaces(lawyer_id, name) VALUES(owner_id, 'Must be denied');
    RAISE EXCEPTION 'Authenticated direct INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  SELECT count(*) INTO n FROM public.ai_workspaces WHERE id = workspace_id;
  IF n <> 1 THEN RAISE EXCEPTION 'Owner SELECT regressed'; END IF;
  UPDATE public.ai_workspaces SET name = '4.33D owner update on fixture' WHERE id = workspace_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Owner UPDATE regressed'; END IF;

  -- A different authenticated identity cannot see or edit this owner's workspace.
  PERFORM set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('request.jwt.claim.sub'), 'role', 'authenticated')::text, true);
  SELECT count(*) INTO n FROM public.ai_workspaces WHERE id = workspace_id;
  IF n <> 0 THEN RAISE EXCEPTION 'Cross-tenant SELECT leak'; END IF;
  UPDATE public.ai_workspaces SET name = 'Must not change' WHERE id = workspace_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'Cross-tenant UPDATE leak'; END IF;
  BEGIN
    INSERT INTO public.ai_workspaces(lawyer_id, name) VALUES(owner_id, 'Foreign insert must be denied');
    RAISE EXCEPTION 'Cross-tenant INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;
ROLLBACK;
SELECT 'PASS: direct INSERT denied; canonical service-role link and legacy ownership preserved; fixtures rolled back' AS result;
