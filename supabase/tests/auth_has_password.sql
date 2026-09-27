-- 4.53B — has_auth_password() authority + security (synthetic identities, rolled back).
-- Run against a production-like DB (auth schema present). No fixture survives.
BEGIN;
DO $test$
DECLARE
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  v boolean;
  n_args integer;
  rtype text;
BEGIN
  -- Synthetic identities: A passwordless (empty hash, GoTrue default),
  -- B with a password credential (hash content opaque to the function).
  INSERT INTO auth.users(id, email, encrypted_password)
  VALUES (a, a::text || '@example.invalid', ''), (b, b::text || '@example.invalid', 'fake-bcrypt-hash$4.53B');
  DELETE FROM auth.identities WHERE user_id IN (a, b);

  -- A sees FALSE for self.
  PERFORM set_config('request.jwt.claim.sub', a::text, true);
  SET LOCAL ROLE authenticated;
  SELECT public.has_auth_password() INTO v;
  IF v IS NOT FALSE THEN RAISE EXCEPTION 'Passwordless user must read false'; END IF;
  RESET ROLE;

  -- B sees TRUE for self (cross-user probing impossible: no parameters,
  -- so A's call can never answer about B and vice versa).
  PERFORM set_config('request.jwt.claim.sub', b::text, true);
  SET LOCAL ROLE authenticated;
  SELECT public.has_auth_password() INTO v;
  IF v IS NOT TRUE THEN RAISE EXCEPTION 'Password user must read true'; END IF;
  RESET ROLE;

  -- No parameters exist to target another identity.
  SELECT count(*) INTO n_args FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'has_auth_password';
  IF n_args <> 1 THEN RAISE EXCEPTION 'Exactly one overload expected'; END IF;
  SELECT pronargs INTO n_args FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'has_auth_password';
  IF n_args <> 0 THEN RAISE EXCEPTION 'Function must take zero arguments'; END IF;

  -- Returns boolean only: hash/row never exposed.
  SELECT pg_typeof(public.has_auth_password())::text INTO rtype;
  IF rtype <> 'boolean' THEN RAISE EXCEPTION 'Must return boolean, got %', rtype; END IF;

  -- anon cannot execute.
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.has_auth_password();
    RAISE EXCEPTION 'anon must be denied';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  -- NULL caller (no JWT) reads false, never errors into true.
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SET LOCAL ROLE authenticated;
  SELECT public.has_auth_password() INTO v;
  IF v IS NOT FALSE THEN RAISE EXCEPTION 'Null caller must read false'; END IF;
  RESET ROLE;
END
$test$;
ROLLBACK;
SELECT 'PASS: 4.53B has_auth_password authority, caller-only boolean, anon denied; fixtures rolled back' AS result;
