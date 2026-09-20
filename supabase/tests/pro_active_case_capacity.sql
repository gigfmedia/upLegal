-- FASE 4.36D — Pro active capacity (20) + lifecycle enforcement battery.
-- Run AFTER the 4.36D migration on an isolated/local DB or the linked DB.
-- All fixtures and writes roll back. Existing rows are never updated.
-- Requires pristine lawyer identities (no cases/grants/subscriptions).
-- Concurrency duels (§§51,54) run as live two-session scripts (see report),
-- not in this single-session file.
BEGIN;
-- Deferred admission triggers only fire on COMMIT; forcing IMMEDIATE makes
-- them fire per-statement so EXCEPTION blocks can assert tokens while the
-- file keeps its rollback-only convention. True commit-time + concurrency
-- behavior is proven by the live duel scripts (see 4.36D report).
SET CONSTRAINTS ALL IMMEDIATE;
DO $$
DECLARE
  p1 uuid; f1 uuid; m1 uuid;
  c_closed_1 uuid; c_closed_2 uuid;
  n integer;
  ent jsonb;
  clean uuid[];
  i integer;
BEGIN
  -- S0 — canonical authorities ------------------------------------------------
  IF public.pro_active_case_limit() <> 20 THEN
    RAISE EXCEPTION 'Canonical limit must be 20';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_case_write_admission' AND tgdeferrable AND tginitdeferred
  ) THEN
    RAISE EXCEPTION 'Deferred admission trigger missing/misconfigured';
  END IF;
  FOR i IN 1..5 LOOP
    IF NOT public.is_active_case_status((ARRAY['new','quoted','paid','in_progress','delivered'])[i]) THEN
      RAISE EXCEPTION 'ACTIVE set wrong';
    END IF;
  END LOOP;
  IF public.is_active_case_status('closed') OR public.is_active_case_status('cancelled') THEN
    RAISE EXCEPTION 'closed/cancelled must be historical';
  END IF;

  SELECT coalesce(array_agg(id ORDER BY created_at), '{}') INTO clean
  FROM (
    SELECT p.id, p.created_at FROM public.profiles p
    WHERE p.role = 'lawyer'
      AND NOT EXISTS (SELECT 1 FROM public.lawyer_cases c WHERE c.lawyer_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.pro_free_case_grants g WHERE g.lawyer_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.lawyer_subscriptions s WHERE s.lawyer_id = p.id)
    ORDER BY p.created_at LIMIT 3
  ) s;
  IF coalesce(array_length(clean, 1), 0) < 3 THEN
    RAISE EXCEPTION 'Test requires 3 pristine lawyer identities';
  END IF;
  p1 := clean[1]; f1 := clean[2]; m1 := clean[3];

  -- P1 setup (service_role): active Pro sub + 17 active + 2 marketplace + 2 closed.
  SET LOCAL ROLE service_role;
  INSERT INTO public.lawyer_subscriptions(lawyer_id, status, current_period_start, current_period_end)
    VALUES (p1, 'active', now() - interval '1 day', now() + interval '30 days');
  FOR i IN 1..5 LOOP
    INSERT INTO public.lawyer_cases(lawyer_id, title, source, status) VALUES
      (p1, 'cap new ' || i, 'LAWYER_DIRECT', 'new'),
      (p1, 'cap quoted ' || i, 'LAWYER_DIRECT', 'quoted'),
      (p1, 'cap paid ' || i, 'LAWYER_DIRECT', 'paid');
  END LOOP;
  INSERT INTO public.lawyer_cases(lawyer_id, title, source, status) VALUES
    (p1, 'cap prog 1', 'LAWYER_DIRECT', 'in_progress'),
    (p1, 'cap delivered 1', 'LAWYER_DIRECT', 'delivered'),
    (p1, 'cap mp 1', 'LEGALUP_MARKETPLACE', 'new'),
    (p1, 'cap mp 2', 'LEGALUP_MARKETPLACE', 'paid'),
    (p1, 'cap closed 1', 'LAWYER_DIRECT', 'closed'),
    (p1, 'cap cancelled 1', 'LAWYER_DIRECT', 'cancelled');
  -- 17 active + 2 marketplace + 2 historical = 21 rows, active count 17.
  IF public.active_direct_case_count(p1) <> 17 THEN
    RAISE EXCEPTION 'Setup active count wrong';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', p1::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', p1, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- S50 — boundary: 17→18→19→20 succeed; 21st blocked.
  FOR i IN 1..3 LOOP
    INSERT INTO public.lawyer_cases(lawyer_id, title, source)
      VALUES (p1, 'cap fill ' || i, 'LAWYER_DIRECT');
  END LOOP;
  SELECT public.get_my_case_entitlement() INTO ent;
  IF (ent->>'active_case_count')::integer <> 20 THEN
    RAISE EXCEPTION 'RPC active count must be 20';
  END IF;
  -- (superseded single-line check folded into RPC assertion above)
  BEGIN
    INSERT INTO public.lawyer_cases(lawyer_id, title, source)
      VALUES (p1, 'cap twentyone must fail', 'LAWYER_DIRECT');
    RAISE EXCEPTION 'Case #21 unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF position('ACTIVE_CASE_LIMIT_REACHED' in SQLERRM) = 0 THEN RAISE; END IF;
  END;
  SELECT count(*) INTO n FROM public.lawyer_cases WHERE lawyer_id = p1 AND source = 'LAWYER_DIRECT';
  IF n <> 22 THEN RAISE EXCEPTION 'Expected 22 direct rows (20 active + 2 historical), got %', n; END IF;

  -- Pro may still insert a historical status directly (consumes no slot).
  INSERT INTO public.lawyer_cases(lawyer_id, title, source, status)
    VALUES (p1, 'cap direct-closed ok', 'LAWYER_DIRECT', 'closed');
  SELECT public.get_my_case_entitlement() INTO ent;
  IF (ent->>'active_case_count')::integer <> 20 THEN
    RAISE EXCEPTION 'RPC active count must be 20';
  END IF;
  -- (superseded single-line check folded into RPC assertion above)

  -- S55 — active→active at capacity: in_progress → delivered succeeds, still 20.
  UPDATE public.lawyer_cases SET status = 'delivered'
    WHERE lawyer_id = p1 AND title = 'cap prog 1';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Active transition regressed'; END IF;
  SELECT public.get_my_case_entitlement() INTO ent;
  IF (ent->>'active_case_count')::integer <> 20 THEN
    RAISE EXCEPTION 'RPC active count must be 20';
  END IF;
  -- (superseded single-line check folded into RPC assertion above)

  -- S56 — historical→historical: closed → cancelled succeeds, still 20.
  UPDATE public.lawyer_cases SET status = 'cancelled'
    WHERE lawyer_id = p1 AND title = 'cap closed 1';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Historical transition regressed'; END IF;

  -- S52 — close releases: 20 → close one → 19 → create → 20.
  UPDATE public.lawyer_cases SET status = 'closed'
    WHERE lawyer_id = p1 AND title = 'cap fill 1';
  SELECT public.get_my_case_entitlement() INTO ent;
  IF (ent->>'active_case_count')::integer <> 19 THEN
    RAISE EXCEPTION 'RPC active count must be 19';
  END IF;
  -- (superseded single-line check folded into RPC assertion above)
  INSERT INTO public.lawyer_cases(lawyer_id, title, source)
    VALUES (p1, 'cap refill ok', 'LAWYER_DIRECT');
  SELECT public.get_my_case_entitlement() INTO ent;
  IF (ent->>'active_case_count')::integer <> 20 THEN
    RAISE EXCEPTION 'RPC active count must be 20';
  END IF;
  -- (superseded single-line check folded into RPC assertion above)

  -- S53 — reopen at 19 succeeds; reopen at 20 fails.
  UPDATE public.lawyer_cases SET status = 'closed'
    WHERE lawyer_id = p1 AND title = 'cap refill ok';
  SELECT id INTO c_closed_1 FROM public.lawyer_cases
    WHERE lawyer_id = p1 AND title = 'cap refill ok';
  UPDATE public.lawyer_cases SET status = 'in_progress' WHERE id = c_closed_1;
  SELECT public.get_my_case_entitlement() INTO ent;
  IF (ent->>'active_case_count')::integer <> 20 THEN
    RAISE EXCEPTION 'RPC active count must be 20';
  END IF;
  -- (superseded single-line check folded into RPC assertion above)
  SELECT id INTO c_closed_2 FROM public.lawyer_cases
    WHERE lawyer_id = p1 AND title = 'cap fill 1';
  BEGIN
    UPDATE public.lawyer_cases SET status = 'in_progress' WHERE id = c_closed_2;
    RAISE EXCEPTION 'Reopen at 20 unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF position('ACTIVE_CASE_LIMIT_REACHED' in SQLERRM) = 0 THEN RAISE; END IF;
  END;
  -- Cancelled → active is the same admission gate.
  BEGIN
    UPDATE public.lawyer_cases SET status = 'paid'
      WHERE lawyer_id = p1 AND title = 'cap cancelled 1';
    RAISE EXCEPTION 'Cancelled reopen at 20 unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF position('ACTIVE_CASE_LIMIT_REACHED' in SQLERRM) = 0 THEN RAISE; END IF;
  END;

  -- Entitlement shape at capacity.
  SELECT public.get_my_case_entitlement() INTO ent;
  IF NOT (ent->>'has_pro_access')::boolean THEN RAISE EXCEPTION 'P1 must have Pro'; END IF;
  IF (ent->>'active_case_count')::integer <> 20 THEN RAISE EXCEPTION 'RPC count must be 20'; END IF;
  IF (ent->>'active_case_limit')::integer <> 20 THEN RAISE EXCEPTION 'RPC limit must be 20'; END IF;
  IF (ent->>'can_create_direct_case')::boolean THEN RAISE EXCEPTION 'RPC must deny at 20'; END IF;

  -- Cross-tenant status change stays blocked (RLS).
  PERFORM set_config('request.jwt.claim.sub', f1::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', f1, 'role', 'authenticated')::text, true);
  UPDATE public.lawyer_cases SET status = 'closed'
    WHERE lawyer_id = p1 AND title = 'cap new 1';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'Cross-tenant UPDATE leak'; END IF;

  -- S57 — free regression: first ok; close/cancel/delete keep grant; next FREE token.
  INSERT INTO public.lawyer_cases(lawyer_id, title, source)
    VALUES (f1, 'free first', 'LAWYER_DIRECT');
  UPDATE public.lawyer_cases SET status = 'closed'
    WHERE lawyer_id = f1 AND title = 'free first';
  UPDATE public.lawyer_cases SET status = 'cancelled'
    WHERE lawyer_id = f1 AND title = 'free first';
  DELETE FROM public.lawyer_cases WHERE lawyer_id = f1 AND title = 'free first';
  BEGIN
    INSERT INTO public.lawyer_cases(lawyer_id, title, source)
      VALUES (f1, 'free second must fail', 'LAWYER_DIRECT');
    RAISE EXCEPTION 'Free second unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF position('FREE_CASE_ALLOWANCE_CONSUMED' in SQLERRM) = 0 THEN RAISE; END IF;
  END;
  SELECT public.get_my_case_entitlement() INTO ent;
  IF NOT (ent->>'free_case_consumed')::boolean THEN RAISE EXCEPTION 'Free must be consumed'; END IF;
  IF (ent->>'can_create_direct_case')::boolean THEN RAISE EXCEPTION 'Free must be denied'; END IF;

  -- S58 — marketplace contributes zero for anyone.
  PERFORM set_config('request.jwt.claim.sub', m1::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', m1, 'role', 'authenticated')::text, true);
  INSERT INTO public.lawyer_cases(lawyer_id, title, source, status) VALUES
    (m1, 'mp a', 'LEGALUP_MARKETPLACE', 'new'),
    (m1, 'mp b', 'LEGALUP_MARKETPLACE', 'paid'),
    (m1, 'mp c', 'UNKNOWN', 'closed');
  SELECT public.get_my_case_entitlement() INTO ent;
  IF (ent->>'active_case_count')::integer <> 0 THEN
    RAISE EXCEPTION 'Marketplace must contribute zero';
  END IF;

  RESET ROLE;
END $$;
ROLLBACK;
SELECT 'PASS: 20/21 boundary, close-release, reopen admission, active/historical transitions, free regression, marketplace zero, cross-tenant denial, entitlement shape' AS result;
