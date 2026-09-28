-- FASE 4.57D — LegalUp Plus v1: plan-aware capacity + transition state.
--
-- Additive, non-breaking. No data migration, no destructive change.
-- Pro/Free/Founder behavior byte-identical for non-Plus lawyers.
--
-- 1) lawyer_subscriptions transition columns (upgrade/downgrade lifecycle).
--    Table RLS posture unchanged: no authenticated INSERT/UPDATE/DELETE
--    policies exist, so only service_role (backend) can write these.
-- 2) pro_subscription_payments.plan marker (NULL = historical Pro). Plus
--    payments must never consume Founder slots nor feed the Founder ledger.
-- 3) reconcile_pro_founders: Pro payments only.
-- 4) has_plus_access(uuid): paid Plus access mirror of has_pro_access.
-- 5) lawyer_active_case_limit(uuid): 40 for Plus, else pro_active_case_limit().
--    pro_active_case_limit() itself stays 20 (Pro contract untouched).
-- 6) enforce_case_write_admission + get_my_case_entitlement use the
--    plan-aware limit. Grandfathering semantics preserved.
-- 7) ai_enforce_trial_limits: stored-document cap 150 for Plus (Pro 50,
--    trial 10 unchanged), same advisory-lock concurrency protection.
--
-- Rollback: DROP new columns/function branches (data preserved).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Transition state columns.
-- ---------------------------------------------------------------------------
ALTER TABLE public.lawyer_subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan text
    CHECK (pending_plan IN ('pro', 'plus')),
  ADD COLUMN IF NOT EXISTS plan_change_status text
    CHECK (plan_change_status IN ('upgrade_pending', 'downgrade_scheduled')),
  ADD COLUMN IF NOT EXISTS plan_change_effective_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_provider_subscription_id text,
  ADD COLUMN IF NOT EXISTS pending_init_point text,
  ADD COLUMN IF NOT EXISTS previous_provider_subscription_id text;

COMMENT ON COLUMN public.lawyer_subscriptions.pending_plan IS
  '4.57D: upgrade/downgrade target (pro|plus). Backend/service-role only.';
COMMENT ON COLUMN public.lawyer_subscriptions.plan_change_status IS
  '4.57D: upgrade_pending (Plus confirming) or downgrade_scheduled (Plus→Pro at period end). NULL = steady state.';
COMMENT ON COLUMN public.lawyer_subscriptions.plan_change_effective_at IS
  '4.57D: when a scheduled downgrade takes effect (Plus current_period_end).';
COMMENT ON COLUMN public.lawyer_subscriptions.pending_provider_subscription_id IS
  '4.57D: in-flight Plus preapproval during upgrade_pending (idempotency key).';
COMMENT ON COLUMN public.lawyer_subscriptions.pending_init_point IS
  '4.57D: checkout URL of the in-flight Plus preapproval (safe retry reuses it).';
COMMENT ON COLUMN public.lawyer_subscriptions.previous_provider_subscription_id IS
  '4.57D: retired Pro preapproval after a confirmed upgrade (must be cancelled; never silently dropped).';

-- ---------------------------------------------------------------------------
-- 2) Payment ledger plan marker.
-- ---------------------------------------------------------------------------
ALTER TABLE public.pro_subscription_payments
  ADD COLUMN IF NOT EXISTS plan text
    CHECK (plan IN ('pro', 'plus'));

COMMENT ON COLUMN public.pro_subscription_payments.plan IS
  '4.57D: which tier the approved payment belongs to. NULL = historical Pro. Plus payments never feed Founder logic.';

-- ---------------------------------------------------------------------------
-- 3) Founder reconciliation: Pro payments only (NULL legacy = Pro).
-- ---------------------------------------------------------------------------
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
      AND (p.plan IS NULL OR p.plan = 'pro')
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

-- ---------------------------------------------------------------------------
-- 4) Plus paid-access predicate (mirrors has_pro_access status semantics).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_plus_access(p_lawyer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lawyer_subscriptions s
    WHERE s.lawyer_id = p_lawyer_id
      AND s.plan = 'plus'
      AND s.status = 'active'
      AND s.current_period_end > now()
  ) OR EXISTS (
    SELECT 1 FROM public.lawyer_subscriptions s
    WHERE s.lawyer_id = p_lawyer_id
      AND s.plan = 'plus'
      AND s.status = 'cancelled'
      AND s.current_period_end > now()
  );
$$;

COMMENT ON FUNCTION public.has_plus_access(uuid) IS
  '4.57D: paid Plus access (active, or cancelled within the paid period). Plan-scoped mirror of has_pro_access.';

REVOKE ALL ON FUNCTION public.has_plus_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_plus_access(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 5) Plan-aware active-case limit. pro_active_case_limit() stays 20.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lawyer_active_case_limit(p_lawyer_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_plus_access(p_lawyer_id) THEN 40
    ELSE public.pro_active_case_limit()
  END;
$$;

COMMENT ON FUNCTION public.lawyer_active_case_limit(uuid) IS
  '4.57D: canonical active LAWYER_DIRECT limit — 40 for Plus, else Pro 20. Single authority for trigger + UI entitlement.';

REVOKE ALL ON FUNCTION public.lawyer_active_case_limit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lawyer_active_case_limit(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 6) Case admission trigger + UI entitlement go plan-aware.
--    (Function bodies re-created; trigger definitions unchanged.)
-- ---------------------------------------------------------------------------
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

  -- 4.57D: plan-aware capacity (20 Pro / 40 Plus). has_pro_access is
  -- plan-agnostic (any paid tier), so Plus lawyers keep flowing through.
  IF public.is_active_case_status(NEW.status)
     AND public.has_pro_access(NEW.lawyer_id)
     AND public.active_direct_case_count(NEW.lawyer_id) > public.lawyer_active_case_limit(NEW.lawyer_id) THEN
    RAISE EXCEPTION
      'LegalUp Pro active case limit reached. Close a finished case to open a new one. [ACTIVE_CASE_LIMIT_REACHED]'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_case_write_admission() FROM PUBLIC, anon, authenticated;

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
    'active_case_limit', public.lawyer_active_case_limit(auth.uid()),
    'can_create_direct_case', CASE
      WHEN auth.uid() IS NULL THEN false
      WHEN public.has_pro_access(auth.uid()) THEN
        public.active_direct_case_count(auth.uid()) < public.lawyer_active_case_limit(auth.uid())
      ELSE NOT public.free_case_consumed(auth.uid())
    END
  );
$$;

-- ---------------------------------------------------------------------------
-- 7) Stored-document trigger: Plus 150, everything else byte-identical.
-- 4.57D.2: this function is reconstructed from the authoritative hardened
-- version (20260930000100, 4.44A/4.44C) — NOT from the older 4.38C body.
-- The ONLY Plus change is the v_is_plus flag + CASE branch + marker text.
-- Free scope / limit=2 / invalid-scope / trial / legacy paths untouched.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ai_enforce_trial_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_trial boolean;
  v_is_pro_limited boolean;
  v_is_ai_active boolean;
  v_free_workspace uuid;
  v_is_plus boolean;
  v_count integer;
  v_max integer;
BEGIN
  -- Check if on trial (existing)
  v_is_trial := public.ai_is_lawyer_on_trial(NEW.lawyer_id);
  -- Check if Pro Limited (Pro active without AI active/trial)
  v_is_pro_limited := public.has_pro_access(NEW.lawyer_id) AND NOT v_is_trial AND NOT EXISTS (
    SELECT 1 FROM public.ai_subscriptions s
    WHERE s.lawyer_id = NEW.lawyer_id
      AND s.status IN ('active','trialing')
      AND (
        (s.status = 'trialing' AND s.trial_ends_at > now())
        OR (s.status = 'active' AND s.current_period_end > now())
      )
  );
  -- 4.44A: legacy explicit AI entitlement outranks the free-Case plan.
  v_is_ai_active := EXISTS (
    SELECT 1 FROM public.ai_subscriptions s
    WHERE s.lawyer_id = NEW.lawyer_id
      AND s.status IN ('active','trialing')
      AND (
        (s.status = 'trialing' AND s.trial_ends_at > now())
        OR (s.status = 'active' AND s.current_period_end > now())
      )
  );

  -- 4.44A: free-Case plan = consumed grant + identified case + workspace,
  -- with no trial/Pro/legacy entitlement. NULL case_id = unidentified = no plan.
  v_free_workspace := NULL;
  IF NOT v_is_trial AND NOT v_is_pro_limited AND NOT v_is_ai_active THEN
    SELECT c.ai_workspace_id INTO v_free_workspace
    FROM public.pro_free_case_grants g
    JOIN public.lawyer_cases c ON c.id = g.case_id AND c.lawyer_id = NEW.lawyer_id
    WHERE g.lawyer_id = NEW.lawyer_id
      AND g.case_id IS NOT NULL;
  END IF;

  -- 4.44C: consumed-but-unidentified grant fails closed on the DOCUMENT
  -- capacity path only. A grant row with no resolvable free Case workspace
  -- (NULL case_id backfill or deleted free Case) means the lifetime allowance
  -- is consumed but its scope is gone: allowing RETURN NEW below would permit
  -- unlimited inserts. Trial/Pro/legacy resolve before this point and are
  -- unaffected; lawyers with NO grant row keep the legacy no-plan path;
  -- ai_workspaces inserts are untouched (never a commercial quota, and
  -- entitlement-free provisioning must not regress). Never auto-repairs
  -- case_id, never reinterprets as Pro.
  IF TG_TABLE_NAME = 'ai_documents'
     AND NOT v_is_trial AND NOT v_is_pro_limited AND NOT v_is_ai_active
     AND v_free_workspace IS NULL
     AND EXISTS (SELECT 1 FROM public.pro_free_case_grants g WHERE g.lawyer_id = NEW.lawyer_id) THEN
    RAISE EXCEPTION 'AI_FREE_CASE_INVALID_SCOPE: no se pudo identificar tu primer caso. Actualiza a Pro para seguir usando documentos con IA.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 4.57D: Plus paid access dominates stale legacy trial compatibility on
  -- the document path (a paying Plus lawyer keeps 150 even with a legacy
  -- trial row). No trial/legacy exclusion: has_plus_access already requires
  -- a live paid Plus row. Non-Plus lawyers are byte-identical below.
  v_is_plus := public.has_plus_access(NEW.lawyer_id);

  -- Only limit if trial, pro_limited, or free_case plan.
  IF NOT v_is_trial AND NOT v_is_pro_limited AND v_free_workspace IS NULL THEN
    RETURN NEW;
  END IF;

  -- Serialize concurrent inserts per lawyer so the last slot admits one winner.
  PERFORM pg_advisory_xact_lock(hashtextextended('ai-doc-limit:' || NEW.lawyer_id::text, 0));

  IF TG_TABLE_NAME = 'ai_workspaces' THEN
    -- 4.38C: workspace is internal architecture, not a Pro commercial quota.
    IF v_is_pro_limited THEN
      RETURN NEW;
    END IF;
    -- 4.44A: workspaces are not counted for the free plan (only docs capped).
    IF v_free_workspace IS NOT NULL THEN
      RETURN NEW;
    END IF;
    v_max := 3;
    SELECT count(*) INTO v_count FROM public.ai_workspaces WHERE lawyer_id = NEW.lawyer_id;
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'Alcanzaste el límite de % caso(s) de tu plan. Actualiza a AI Full para más.', v_max
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF TG_TABLE_NAME = 'ai_documents' THEN
    -- 4.44A: 2 current stored documents scoped to the free Case workspace.
    -- Deleting frees a slot (count is current rows). Other workspaces are
    -- blocked for free-plan users (no legacy behavior exists for this plan).
    IF v_free_workspace IS NOT NULL THEN
      IF NEW.workspace_id IS DISTINCT FROM v_free_workspace THEN
        RAISE EXCEPTION 'AI_FREE_CASE_DOCUMENT_SCOPE: este documento debe pertenecer a tu primer caso.'
          USING ERRCODE = 'P0001';
      END IF;
      SELECT count(*) INTO v_count FROM public.ai_documents
      WHERE lawyer_id = NEW.lawyer_id AND workspace_id = v_free_workspace;
      IF v_count >= 2 THEN
        RAISE EXCEPTION 'FREE_CASE_DOCUMENT_LIMIT_REACHED: tu primer caso incluye hasta 2 documentos.'
          USING ERRCODE = 'P0001';
      END IF;
      RETURN NEW;
    END IF;
    -- 4.57D: 150 Plus / 50 Pro / 10 trial. Stable machine-readable marker
    -- kept; Pro/trial messages byte-identical to the hardened version.
    v_max := CASE WHEN v_is_plus THEN 150 WHEN v_is_pro_limited THEN 50 ELSE 10 END;
    SELECT count(*) INTO v_count FROM public.ai_documents WHERE lawyer_id = NEW.lawyer_id;
    IF v_count >= v_max THEN
      IF v_is_plus THEN
        RAISE EXCEPTION 'AI_DOCUMENT_CAPACITY_REACHED: Alcanzaste el límite de 150 documentos almacenados de tu plan.'
          USING ERRCODE = 'P0001';
      ELSIF v_is_pro_limited THEN
        RAISE EXCEPTION 'AI_DOCUMENT_CAPACITY_REACHED: Alcanzaste el límite de 50 documentos almacenados de tu plan.'
          USING ERRCODE = 'P0001';
      END IF;
      RAISE EXCEPTION 'Alcanzaste el límite de % documento(s) de tu plan. Actualiza a AI Full para más.', v_max
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
