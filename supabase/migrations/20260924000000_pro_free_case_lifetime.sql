-- FASE 4.36B — One free LAWYER_DIRECT case per lawyer, LIFETIME + atomic claim.
--
-- 4.36A finding: the first-case-free gate (20260917000000) counted LIVE rows
-- (NOT EXISTS over lawyer_cases), so deleting the free case restored the
-- allowance, and concurrent first-case INSERTs could both pass the check.
--
-- New authority: durable ledger public.pro_free_case_grants (at most one row
-- per lawyer, enforced by PRIMARY KEY). A BEFORE trigger on lawyer_cases
-- atomically claims the grant inside the SAME transaction as the case INSERT:
--   * first lifetime LAWYER_DIRECT case (free or Pro) claims exactly one row;
--   * second non-Pro LAWYER_DIRECT case aborts with FREE_CASE_ALLOWANCE_CONSUMED;
--   * rollback of the case INSERT rolls the claim back too (same transaction);
--   * case deletion never touches the ledger (case_id has NO FK on purpose).
-- Marketplace / UNKNOWN sources never claim. Founder status is irrelevant:
-- has_pro_access() remains the only paid authority.
--
-- Enforcement point: the trigger (single, deterministic error token). RLS
-- keeps ownership + client/booking checks. Direct
-- supabase.from('lawyer_cases').insert(...) keeps working; no RPC-for-write
-- is introduced (decision: a state-changing WITH CHECK would evaluate AFTER
-- the BEFORE trigger claims and reject the legitimate first case, so the
-- trigger is the single enforcement point instead).
--
-- LIMITATION (4.36B section 12): a lawyer who created AND hard-deleted their
-- only LAWYER_DIRECT case before this migration leaves no trace in the DB;
-- no history is fabricated, so they receive a fresh allowance from here on.
-- From this migration onward, lifetime semantics are durable.

BEGIN;

-- 1) Ledger ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pro_free_case_grants (
  lawyer_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id uuid NULL,
  consumed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pro_free_case_grants IS
  'FASE 4.36B: lifetime consumption of the one free LAWYER_DIRECT case per lawyer. PK guarantees at most one row per lawyer. case_id is audit-only with deliberately no FK, so case deletion never restores the allowance. No direct client access.';
COMMENT ON COLUMN public.pro_free_case_grants.lawyer_id IS
  'Lifetime authority. Profile deletion cascades (account gone); case deletion does not.';
COMMENT ON COLUMN public.pro_free_case_grants.case_id IS
  'First lifetime LAWYER_DIRECT case id when known (NULL for pre-ledger backfill). Audit only, never an entitlement input.';

ALTER TABLE public.pro_free_case_grants ENABLE ROW LEVEL SECURITY;
-- No policies: deny every direct path for anon/authenticated. service_role bypasses RLS.
REVOKE ALL ON TABLE public.pro_free_case_grants FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.pro_free_case_grants TO service_role;

-- 2) Backfill: every lawyer with a live LAWYER_DIRECT case is already consumed.
-- Earliest case id is kept as audit reference only.
INSERT INTO public.pro_free_case_grants AS g (lawyer_id, case_id, consumed_at)
SELECT DISTINCT ON (c.lawyer_id)
  c.lawyer_id,
  c.id,
  c.created_at
FROM public.lawyer_cases AS c
WHERE c.source = 'LAWYER_DIRECT'
ORDER BY c.lawyer_id, c.created_at ASC, c.id ASC
ON CONFLICT (lawyer_id) DO NOTHING;

-- 3) Read helpers (SECURITY DEFINER: sole readers of the ledger) -------------
CREATE OR REPLACE FUNCTION public.free_case_consumed(p_lawyer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pro_free_case_grants g WHERE g.lawyer_id = p_lawyer_id
  ) OR EXISTS (
    -- Belt-and-braces: a live direct case always means consumed, even if a
    -- grant row were ever removed out-of-band.
    SELECT 1 FROM public.lawyer_cases c
    WHERE c.lawyer_id = p_lawyer_id AND c.source = 'LAWYER_DIRECT'
  );
$$;

COMMENT ON FUNCTION public.free_case_consumed(uuid) IS
  'FASE 4.36B: lifetime free-direct-case consumption. Ledger first, live rows as backstop. No direct grants.';

CREATE OR REPLACE FUNCTION public.can_create_lawyer_case(p_lawyer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_pro_access(p_lawyer_id)
  OR NOT public.free_case_consumed(p_lawyer_id)
$$;

COMMENT ON FUNCTION public.can_create_lawyer_case(uuid) IS
  'FASE 4.36B: read helper kept for compatibility. Live enforcement is the BEFORE trigger trg_claim_free_case_grant (single point), because a WITH CHECK would evaluate after the trigger claims and reject the legitimate first case.';

-- Lock down direct execution: only the read RPC and service_role use these.
REVOKE ALL ON FUNCTION public.free_case_consumed(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.free_case_consumed(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.can_create_lawyer_case(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_lawyer_case(uuid) TO service_role;

-- 4) Atomic claim trigger (THE enforcement point) ---------------------------
CREATE OR REPLACE FUNCTION public.claim_free_case_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only canonical direct cases interact with the lifetime allowance.
  IF NEW.source IS DISTINCT FROM 'LAWYER_DIRECT' THEN
    RETURN NEW;
  END IF;

  -- Edits to an already-direct case never re-claim and never restore.
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
  -- auth.uid() NULL (service_role) and skip this check; they stay audited.
  IF auth.uid() IS NOT NULL AND NEW.lawyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cross-tenant case creation denied. [FREE_CASE_CROSS_TENANT]'
      USING ERRCODE = 'P0001';
  END IF;

  -- Atomic lifetime claim: the PK serializes concurrent first-case INSERTs.
  -- The race loser blocks on the unique index, then sees the winner's row
  -- and is rejected below. If the winner rolls back, the row disappears and
  -- a retry succeeds (same-transaction rollback safety).
  INSERT INTO public.pro_free_case_grants AS g (lawyer_id, case_id)
    VALUES (NEW.lawyer_id, NEW.id)
    ON CONFLICT (lawyer_id) DO NOTHING;

  -- Paid access never needs the grant; the row above is history only, so a
  -- former Pro customer is still blocked after expiry (first direct case
  -- experience, not a saved coupon).
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
  'FASE 4.36B: single enforcement point for the lifetime free direct case. BEFORE trigger; same-transaction claim+insert gives atomicity and rollback safety.';

REVOKE ALL ON FUNCTION public.claim_free_case_grant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_claim_free_case_grant ON public.lawyer_cases;
CREATE TRIGGER trg_claim_free_case_grant
  BEFORE INSERT OR UPDATE OF source, lawyer_id ON public.lawyer_cases
  FOR EACH ROW EXECUTE FUNCTION public.claim_free_case_grant();

-- 5) RLS: ownership stays here; entitlement lives in the trigger -------------
DROP POLICY IF EXISTS "lawyer_cases_owner_insert" ON public.lawyer_cases;
CREATE POLICY "lawyer_cases_owner_insert"
ON public.lawyer_cases FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = lawyer_id
  AND (
    (client_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_clients WHERE id = client_id AND lawyer_id = auth.uid()))
    AND (booking_id IS NULL OR EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND lawyer_id = auth.uid()))
  )
);

COMMENT ON POLICY "lawyer_cases_owner_insert" ON public.lawyer_cases IS
  'FASE 4.36B: ownership/client/booking checks. Free-case entitlement is enforced by trg_claim_free_case_grant (BEFORE trigger), which must run before any ledger-reading check could evaluate.';

-- 6) Canonical read authority for UI (single object, no billing internals) ---
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
    'can_create_direct_case', CASE
      WHEN auth.uid() IS NULL THEN false
      ELSE (public.has_pro_access(auth.uid()) OR NOT public.free_case_consumed(auth.uid()))
    END
  );
$$;

COMMENT ON FUNCTION public.get_my_case_entitlement() IS
  'FASE 4.36B: canonical UI read authority. Fail-closed for anonymous callers. Frontend must not infer lifetime consumption from visible rows.';

REVOKE ALL ON FUNCTION public.get_my_case_entitlement() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_case_entitlement() TO authenticated;

COMMIT;
