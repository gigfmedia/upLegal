-- FASE 4.32B.3 — Founder = first 15 DISTINCT lawyers with a successful Pro payment.
-- Atomic slot claim (advisory lock serializes concurrent first payments) +
-- deterministic reconciliation from the payment ledger.
-- NEVER read by billing, entitlement, or case-gate logic.

-- Atomic claim: idempotent, max 15 distinct founders, retries safe.
CREATE OR REPLACE FUNCTION public.claim_pro_founder_slot(p_lawyer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already boolean;
  v_filled integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('pro_founder_slots'));
  SELECT p.is_founder INTO v_already
    FROM public.profiles p WHERE p.id = p_lawyer_id AND p.role = 'lawyer';
  IF v_already IS NULL THEN
    RETURN false; -- unknown / non-lawyer profile
  END IF;
  IF v_already THEN
    RETURN true; -- already founder: idempotent, no new slot
  END IF;
  SELECT count(*) INTO v_filled
    FROM public.profiles WHERE role = 'lawyer' AND is_founder = true;
  IF v_filled >= 15 THEN
    RETURN false; -- lawyer #16+: no slot, no mutation
  END IF;
  UPDATE public.profiles SET is_founder = true
    WHERE id = p_lawyer_id AND is_founder = false;
  RETURN FOUND;
END;
$$;

-- Deterministic reconciliation from durable ledger truth.
-- Sets is_founder=true for the earliest 15 DISTINCT lawyers by first
-- approved payment (paid_at ASC, provider_authorized_payment_id ASC tiebreak).
-- Never unsets flags (cancellation/reactivation preserve Founder).
CREATE OR REPLACE FUNCTION public.reconcile_pro_founders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('pro_founder_slots'));
  WITH first_paid AS (
    SELECT DISTINCT ON (p.lawyer_id)
      p.lawyer_id AS lawyer_id,
      p.paid_at AS paid_at,
      p.provider_authorized_payment_id AS ap_id
    FROM public.pro_subscription_payments p
    JOIN public.profiles prof ON prof.id = p.lawyer_id AND prof.role = 'lawyer'
    WHERE p.status = 'approved'
    ORDER BY p.lawyer_id, p.paid_at ASC NULLS LAST, p.provider_authorized_payment_id ASC
  ),
  ranked AS (
    SELECT lawyer_id,
      row_number() OVER (ORDER BY paid_at ASC NULLS LAST, ap_id ASC) AS rn
    FROM first_paid
  )
  UPDATE public.profiles prof
    SET is_founder = true
    FROM ranked r
    WHERE prof.id = r.lawyer_id
      AND r.rn <= 15
      AND prof.is_founder = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
