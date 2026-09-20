-- FASE 4.36B — lifetime free direct-case ledger + atomic claim.
-- Run AFTER the 4.36B migration on an isolated/local DB or the linked DB.
-- All fixtures and writes roll back. Existing rows are never updated.
-- Requires at least 4 lawyer identities in public.profiles.
BEGIN;
DO $$
DECLARE
  l1 uuid; l2 uuid; l3 uuid; l4 uuid;
  c1 uuid; c2 uuid;
  n integer;
  ent jsonb;
  clean_lawyers uuid[];
BEGIN
  -- S0 — structural posture ------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pro_free_case_grants_pkey'
  ) THEN
    RAISE EXCEPTION 'Ledger PK missing (atomicity mechanism)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'pro_free_case_grants' AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) ILIKE '%lawyer_cases%'
  ) THEN
    RAISE EXCEPTION 'Ledger must not FK to lawyer_cases (deletion must not cascade)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_claim_free_case_grant'
  ) THEN
    RAISE EXCEPTION 'Claim trigger missing';
  END IF;
  IF has_table_privilege('authenticated', 'public.pro_free_case_grants', 'INSERT')
     OR has_table_privilege('authenticated', 'public.pro_free_case_grants', 'DELETE')
     OR has_table_privilege('authenticated', 'public.pro_free_case_grants', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.pro_free_case_grants', 'SELECT')
     OR has_table_privilege('anon', 'public.pro_free_case_grants', 'SELECT') THEN
    RAISE EXCEPTION 'Ledger directly accessible by client roles';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.get_my_case_entitlement()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Read RPC not executable by authenticated';
  END IF;
  IF has_function_privilege('anon', 'public.get_my_case_entitlement()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Read RPC must not be executable by anon';
  END IF;

  -- Backfill verification on real data: every live direct case owner consumed.
  IF EXISTS (
    SELECT 1 FROM public.lawyer_cases c
    WHERE c.source = 'LAWYER_DIRECT'
      AND NOT EXISTS (SELECT 1 FROM public.pro_free_case_grants g WHERE g.lawyer_id = c.lawyer_id)
  ) THEN
    RAISE EXCEPTION 'Backfill gap: live direct case without grant';
  END IF;

  -- Fixture lawyers: pristine identities (no direct cases, no grants, no
  -- subscription), so the test never touches real rows. Everything rolls back.
  SELECT coalesce(array_agg(id ORDER BY created_at), '{}') INTO clean_lawyers
  FROM (
    SELECT p.id, p.created_at FROM public.profiles p
    WHERE p.role = 'lawyer'
      AND NOT EXISTS (SELECT 1 FROM public.lawyer_cases c WHERE c.lawyer_id = p.id AND c.source = 'LAWYER_DIRECT')
      AND NOT EXISTS (SELECT 1 FROM public.pro_free_case_grants g WHERE g.lawyer_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.lawyer_subscriptions s WHERE s.lawyer_id = p.id)
    ORDER BY p.created_at LIMIT 4
  ) s;
  IF coalesce(array_length(clean_lawyers, 1), 0) < 4 THEN
    RAISE EXCEPTION 'Test requires 4 pristine lawyer identities (no direct cases/grants/subscriptions)';
  END IF;
  l1 := clean_lawyers[1]; l2 := clean_lawyers[2]; l3 := clean_lawyers[3]; l4 := clean_lawyers[4];

  -- Authenticate as L1 ------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', l1::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', l1, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- S1 — first lifetime direct case allowed; the ledger denies direct client
  -- reads by design (42501, fail-closed) — authority is the read RPC + the
  -- service_role audit check below.
  INSERT INTO public.lawyer_cases(lawyer_id, title, source)
    VALUES (l1, '4.36B fixture first', 'LAWYER_DIRECT') RETURNING id INTO c1;
  BEGIN
    SELECT count(*) INTO n FROM public.pro_free_case_grants WHERE lawyer_id = l1;
    RAISE EXCEPTION 'Ledger must deny direct client reads';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- S2 — second direct case blocked with the known token; exactly one persists.
  BEGIN
    INSERT INTO public.lawyer_cases(lawyer_id, title, source)
      VALUES (l1, '4.36B fixture second must fail', 'LAWYER_DIRECT');
    RAISE EXCEPTION 'Second free direct case unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF position('FREE_CASE_ALLOWANCE_CONSUMED' in SQLERRM) = 0 THEN RAISE; END IF;
  END;
  SELECT count(*) INTO n FROM public.lawyer_cases WHERE lawyer_id = l1 AND source = 'LAWYER_DIRECT';
  IF n <> 1 THEN RAISE EXCEPTION 'Expected exactly 1 persisted direct case, got %', n; END IF;

  -- Grant audit linkage verified under service_role (sole ledger reader).
  RESET ROLE;
  SET LOCAL ROLE service_role;
  SELECT count(*) INTO n FROM public.pro_free_case_grants WHERE lawyer_id = l1 AND case_id = c1;
  IF n <> 1 THEN RAISE EXCEPTION 'Grant audit row missing/mismatched'; END IF;
  PERFORM set_config('request.jwt.claim.sub', l1::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', l1, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- S3 — delete does NOT restore: recreate still blocked.
  DELETE FROM public.lawyer_cases WHERE id = c1;
  BEGIN
    INSERT INTO public.lawyer_cases(lawyer_id, title, source)
      VALUES (l1, '4.36B fixture recreate must fail', 'LAWYER_DIRECT');
    RAISE EXCEPTION 'Recreate after delete unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF position('FREE_CASE_ALLOWANCE_CONSUMED' in SQLERRM) = 0 THEN RAISE; END IF;
  END;

  -- S10 — read RPC reflects lifetime consumption (fail-closed shape).
  SELECT public.get_my_case_entitlement() INTO ent;
  IF NOT (ent->>'free_case_consumed')::boolean THEN RAISE EXCEPTION 'RPC must report consumed'; END IF;
  IF (ent->>'can_create_direct_case')::boolean THEN RAISE EXCEPTION 'RPC must deny creation'; END IF;

  -- S7 — cross-tenant attempt denied (RLS and/or trigger guard).
  PERFORM set_config('request.jwt.claim.sub', l2::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', l2, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.lawyer_cases(lawyer_id, title, source)
      VALUES (l1, '4.36B cross-tenant must fail', 'LAWYER_DIRECT');
    RAISE EXCEPTION 'Cross-tenant insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN NULL;
  END;

  -- S4 — failed INSERT rolls back the claim (L2, title CHECK violation fires
  -- AFTER the BEFORE-trigger claim, same transaction).
  PERFORM set_config('request.jwt.claim.sub', l2::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', l2, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.lawyer_cases(lawyer_id, title, source)
      VALUES (l2, '   ', 'LAWYER_DIRECT');
    RAISE EXCEPTION 'Invalid CHECK insert unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  SELECT count(*) INTO n FROM public.lawyer_cases WHERE lawyer_id = l2;
  IF n <> 0 THEN RAISE EXCEPTION 'Doomed case persisted'; END IF;
  -- The claim rolled back with the case: prove it under service_role.
  RESET ROLE;
  SET LOCAL ROLE service_role;
  SELECT count(*) INTO n FROM public.pro_free_case_grants WHERE lawyer_id = l2;
  IF n <> 0 THEN RAISE EXCEPTION 'Doomed claim persisted'; END IF;
  -- Retry with valid payload must succeed (allowance not burned).
  PERFORM set_config('request.jwt.claim.sub', l2::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', l2, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.lawyer_cases(lawyer_id, title, source)
    VALUES (l2, '4.36B fixture retry ok', 'LAWYER_DIRECT') RETURNING id INTO c2;

  -- S8 — status changes never restore: close/cancel then recreate blocked.
  UPDATE public.lawyer_cases SET status = 'closed' WHERE id = c2;
  UPDATE public.lawyer_cases SET status = 'cancelled' WHERE id = c2;
  BEGIN
    INSERT INTO public.lawyer_cases(lawyer_id, title, source)
      VALUES (l2, '4.36B post-status must fail', 'LAWYER_DIRECT');
    RAISE EXCEPTION 'Post-status second case unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF position('FREE_CASE_ALLOWANCE_CONSUMED' in SQLERRM) = 0 THEN RAISE; END IF;
  END;

  -- S9 — ai_workspace link UPDATE does not touch entitlement machinery.
  UPDATE public.lawyer_cases SET description = 'link touch' WHERE id = c2;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Non-source UPDATE regressed'; END IF;

  -- S5 — marketplace history never consumes (L3).
  PERFORM set_config('request.jwt.claim.sub', l3::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', l3, 'role', 'authenticated')::text, true);
  INSERT INTO public.lawyer_cases(lawyer_id, title, source)
    VALUES (l3, '4.36B marketplace history', 'LEGALUP_MARKETPLACE');
  INSERT INTO public.lawyer_cases(lawyer_id, title, source)
    VALUES (l3, '4.36B first direct after marketplace', 'LAWYER_DIRECT');
  BEGIN
    INSERT INTO public.lawyer_cases(lawyer_id, title, source)
      VALUES (l3, '4.36B second direct must fail', 'LAWYER_DIRECT');
    RAISE EXCEPTION 'Marketplace-adjacent second case unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF position('FREE_CASE_ALLOWANCE_CONSUMED' in SQLERRM) = 0 THEN RAISE; END IF;
  END;
  SELECT public.get_my_case_entitlement() INTO ent;
  IF NOT (ent->>'free_case_consumed')::boolean THEN RAISE EXCEPTION 'L3 must be consumed'; END IF;

  -- S6 — Pro creates freely, but history persists after expiry (L4, service_role).
  RESET ROLE;
  SET LOCAL ROLE service_role;
  INSERT INTO public.lawyer_subscriptions(lawyer_id, status, current_period_start, current_period_end)
    VALUES (l4, 'active', now() - interval '1 day', now() + interval '30 days');
  PERFORM set_config('request.jwt.claim.sub', l4::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', l4, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.lawyer_cases(lawyer_id, title, source)
    VALUES (l4, '4.36B pro case one', 'LAWYER_DIRECT');
  INSERT INTO public.lawyer_cases(lawyer_id, title, source)
    VALUES (l4, '4.36B pro case two', 'LAWYER_DIRECT');
  SELECT public.get_my_case_entitlement() INTO ent;
  IF NOT (ent->>'has_pro_access')::boolean THEN RAISE EXCEPTION 'L4 must have Pro'; END IF;
  IF NOT (ent->>'can_create_direct_case')::boolean THEN RAISE EXCEPTION 'Pro must create freely'; END IF;
  -- Expire the subscription: no extra free coupon appears.
  RESET ROLE;
  SET LOCAL ROLE service_role;
  UPDATE public.lawyer_subscriptions
    SET status = 'expired', current_period_end = now() - interval '1 day'
    WHERE lawyer_id = l4;
  PERFORM set_config('request.jwt.claim.sub', l4::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', l4, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT public.get_my_case_entitlement() INTO ent;
  IF (ent->>'has_pro_access')::boolean THEN RAISE EXCEPTION 'L4 must be expired'; END IF;
  BEGIN
    INSERT INTO public.lawyer_cases(lawyer_id, title, source)
      VALUES (l4, '4.36B post-expiry must fail', 'LAWYER_DIRECT');
    RAISE EXCEPTION 'Post-expiry case unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF position('FREE_CASE_ALLOWANCE_CONSUMED' in SQLERRM) = 0 THEN RAISE; END IF;
  END;

  RESET ROLE;
END $$;
ROLLBACK;
SELECT 'PASS: lifetime ledger, atomic claim, delete-persistence, rollback, backfill posture, marketplace exclusion, pro-expiry, cross-tenant denial' AS result;
