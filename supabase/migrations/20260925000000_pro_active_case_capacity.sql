-- FASE 4.36D — Pro active-case capacity (20) + lifecycle enforcement.
--
-- Product contract:
--   FREE: one LAWYER_DIRECT case per lawyer, lifetime (4.36B ledger, untouched).
--   PRO:  max 20 ACTIVE LAWYER_DIRECT cases. ACTIVE = new, quoted, paid,
--         in_progress, delivered. HISTORICAL (zero capacity) = closed, cancelled.
--   Founder: same capacity (is_founder never read here).
--   Marketplace/UNKNOWN: never counted.
--
-- Enforcement architecture (exact under concurrency):
--   * BEFORE trigger (claim_free_case_grant, 4.36B logic): lifetime grant
--     claim (PK-serialized) + free-consumed fast fail + tenant guards.
--   * DEFERRABLE constraint trigger (enforce_case_write_admission): runs at
--     COMMIT with a fresh snapshot and re-verifies admission — lifetime grant
--     (closes any first-claim race) and Pro capacity (COUNT-based checks
--     cannot serialize on a unique index, and advisory locks do NOT refresh
--     MVCC snapshots, so only a commit-time check is exact).
--   Both layers raise the same deterministic tokens; observable behavior is
--   identical for sequential and concurrent writers.
--
-- Grandfathering: the deferred check only fires on admission-equivalent
-- writes (active INSERT, transition into direct, reopen). Title edits,
-- active→active moves, and closes of already-over-limit lawyers never trip
-- it. No status data migration. No closed_at. No Ultra/Unlimited. No billing.

BEGIN;

-- 1) Canonical limit: ONE authority, no scattered literal --------------------
CREATE OR REPLACE FUNCTION public.pro_active_case_limit()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT 20 $$;

COMMENT ON FUNCTION public.pro_active_case_limit() IS
  'FASE 4.36D: canonical Pro active LAWYER_DIRECT case limit. Single authority; founder-independent (no inputs); UI receives it via get_my_case_entitlement.';

REVOKE ALL ON FUNCTION public.pro_active_case_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pro_active_case_limit() TO service_role;

-- 2) Canonical status semantics (explicit sets; cancelled excluded) -----------
CREATE OR REPLACE FUNCTION public.is_active_case_status(s text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT s IN ('new', 'quoted', 'paid', 'in_progress', 'delivered') $$;

COMMENT ON FUNCTION public.is_active_case_status(text) IS
  'FASE 4.36D: ACTIVE = new/quoted/paid/in_progress/delivered. HISTORICAL = closed/cancelled. Explicit set, never status <> closed.';

REVOKE ALL ON FUNCTION public.is_active_case_status(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_case_status(text) TO service_role;

-- 3) Active direct count (Pro capacity input; marketplace/unknown excluded) --
CREATE OR REPLACE FUNCTION public.active_direct_case_count(p_lawyer_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.lawyer_cases c
  WHERE c.lawyer_id = p_lawyer_id
    AND c.source = 'LAWYER_DIRECT'
    AND public.is_active_case_status(c.status)
$$;

COMMENT ON FUNCTION public.active_direct_case_count(uuid) IS
  'FASE 4.36D: live active LAWYER_DIRECT count. Historical closed/cancelled and non-direct sources contribute zero.';

REVOKE ALL ON FUNCTION public.active_direct_case_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.active_direct_case_count(uuid) TO service_role;

-- 4) BEFORE trigger: lifetime grant claim + tenant guards (4.36B semantics) ---
-- Capacity is NOT decided here: COUNT-based admission cannot serialize on a
-- unique index, and advisory locks never refresh MVCC snapshots, so any
-- statement-time COUNT is race-blind. The deferred trigger below is exact.
CREATE OR REPLACE FUNCTION public.claim_free_case_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only canonical direct cases interact with case authorities.
  IF NEW.source IS DISTINCT FROM 'LAWYER_DIRECT' THEN
    RETURN NEW;
  END IF;

  -- Updates to an already-direct case never re-claim and never restore.
  -- Downgrading a case away from LAWYER_DIRECT also keeps history.
  -- Moving a case across tenants is rejected (RLS blocks it too).
  IF TG_OP = 'UPDATE' THEN
    IF OLD.source = 'LAWYER_DIRECT' THEN
      IF NEW.lawyer_id IS DISTINCT FROM OLD.lawyer_id THEN
        RAISE EXCEPTION 'Cross-tenant case move denied. [FREE_CASE_CROSS_TENANT]'
          USING ERRCODE = 'P0001';
      END IF;
      RETURN NEW;
    END IF;
    -- UPDATE transitioning INTO LAWYER_DIRECT falls through to the claim path.
  END IF;

  -- Caller must own the target lawyer identity. Server paths run with
  -- auth.uid() NULL (service_role) and skip this check; audited server paths only.
  IF auth.uid() IS NOT NULL AND NEW.lawyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cross-tenant case creation denied. [FREE_CASE_CROSS_TENANT]'
      USING ERRCODE = 'P0001';
  END IF;

  -- Atomic lifetime claim: the PK serializes concurrent first-case INSERTs.
  INSERT INTO public.pro_free_case_grants AS g (lawyer_id, case_id)
    VALUES (NEW.lawyer_id, NEW.id)
    ON CONFLICT (lawyer_id) DO NOTHING;

  IF NOT public.has_pro_access(NEW.lawyer_id)
     AND EXISTS (
       SELECT 1 FROM public.pro_free_case_grants AS g
       WHERE g.lawyer_id = NEW.lawyer_id
         AND g.case_id IS DISTINCT FROM NEW.id
     ) THEN
    RAISE EXCEPTION
      'LegalUp Pro required: free direct-case allowance already consumed. [FREE_CASE_ALLOWANCE_CONSUMED]'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.claim_free_case_grant() IS
  'FASE 4.36D: lifetime free-grant claim (4.36B) + tenant guards. Capacity admission lives in the deferred enforce_case_write_admission trigger (commit-time exact).';

REVOKE ALL ON FUNCTION public.claim_free_case_grant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_claim_free_case_grant ON public.lawyer_cases;
CREATE TRIGGER trg_claim_free_case_grant
  BEFORE INSERT OR UPDATE OF source, lawyer_id ON public.lawyer_cases
  FOR EACH ROW EXECUTE FUNCTION public.claim_free_case_grant();

-- 5) Deferred admission check: exact at COMMIT -------------------------------
-- Fires only on admission-equivalent writes: active-status INSERT,
-- transition into LAWYER_DIRECT, or historical→active reopen. Pure edits
-- (active→active), closes, and historical→historical moves never trip it,
-- so grandfathered >20-active lawyers keep full edit/close ability.
CREATE OR REPLACE FUNCTION public.enforce_case_write_admission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source IS DISTINCT FROM 'LAWYER_DIRECT' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.source = 'LAWYER_DIRECT'
     AND public.is_active_case_status(OLD.status) THEN
    RETURN NEW;
  END IF;

  -- Creation-equivalent from here (INSERT, transition into direct, reopen).
  -- Lifetime grant re-verification with a fresh snapshot: closes any
  -- first-claim race the BEFORE trigger could not see.
  IF (TG_OP = 'INSERT' OR OLD.source IS DISTINCT FROM 'LAWYER_DIRECT')
     AND NOT public.has_pro_access(NEW.lawyer_id)
     AND EXISTS (
       SELECT 1 FROM public.pro_free_case_grants AS g
       WHERE g.lawyer_id = NEW.lawyer_id
         AND g.case_id IS DISTINCT FROM NEW.id
     ) THEN
    RAISE EXCEPTION
      'LegalUp Pro required: free direct-case allowance already consumed. [FREE_CASE_ALLOWANCE_CONSUMED]'
      USING ERRCODE = 'P0001';
  END IF;

  -- Pro capacity admission (active statuses only; reopen included).
  -- Non-Pro reopening their own historical case is allowed: the lifetime
  -- ledger already governs creation, and no new case exists.
  IF public.is_active_case_status(NEW.status)
     AND public.has_pro_access(NEW.lawyer_id)
     AND public.active_direct_case_count(NEW.lawyer_id) > public.pro_active_case_limit() THEN
    RAISE EXCEPTION
      'LegalUp Pro active case limit reached. Close a finished case to open a new one. [ACTIVE_CASE_LIMIT_REACHED]'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_case_write_admission() IS
  'FASE 4.36D: commit-time exact admission — lifetime re-check + Pro capacity. Same tokens as statement-time checks.';

REVOKE ALL ON FUNCTION public.enforce_case_write_admission() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_case_write_admission ON public.lawyer_cases;
CREATE CONSTRAINT TRIGGER trg_case_write_admission
  AFTER INSERT OR UPDATE OF source, status ON public.lawyer_cases
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.enforce_case_write_admission();

-- 6) Canonical read authority: capacity state for UI (no local counting) -----
CREATE OR REPLACE FUNCTION public.get_my_case_entitlement()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'has_pro_access', public.has_pro_access(auth.uid()),
    'free_case_consumed', CASE
      WHEN auth.uid() IS NULL THEN true
      ELSE public.free_case_consumed(auth.uid())
    END,
    'active_case_count', CASE
      WHEN auth.uid() IS NULL THEN 0
      ELSE public.active_direct_case_count(auth.uid())
    END,
    'active_case_limit', public.pro_active_case_limit(),
    'can_create_direct_case', CASE
      WHEN auth.uid() IS NULL THEN false
      WHEN public.has_pro_access(auth.uid()) THEN
        public.active_direct_case_count(auth.uid()) < public.pro_active_case_limit()
      ELSE NOT public.free_case_consumed(auth.uid())
    END
  );
$$;

COMMENT ON FUNCTION public.get_my_case_entitlement() IS
  'FASE 4.36D: canonical UI authority — Pro capacity (count < limit) or free lifetime grant. Frontend must not count cases locally.';

REVOKE ALL ON FUNCTION public.get_my_case_entitlement() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_case_entitlement() TO authenticated;

COMMIT;
