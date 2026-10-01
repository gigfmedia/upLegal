-- FASE 4.58A.5 — paid SaaS entitlement dominates legacy AI access (docs).
--
-- Canonical precedence: PLUS > PRO > LEGACY > FREE. Previously the
-- document-capacity trigger gave legacy-paid lawyers an early RETURN NEW
-- (uncapped) even with a live Pro/Plus subscription, disagreeing with the
-- API/metering layers. This replacement preserves every existing branch and
-- adds ONLY paid-priority branches:
--   free workspace → 2 (first, unchanged, incl. scope + invalid-scope)
--   paid Plus      → 150
--   paid Pro       → 50
--   legacy trial   → 10 (unchanged)
--   legacy-paid-only / no-entitlement → early RETURN NEW (unchanged)
-- Workspaces: paid (incl. dual) uncapped like Pro-only; trial keeps 3;
-- free-workspace uncapped (unchanged).
-- Additive, non-breaking. No data migration, no destructive change.

BEGIN;

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
  v_has_paid boolean;
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
  -- capacity path only (ver explicación en 20260930000100; sin cambios).
  IF TG_TABLE_NAME = 'ai_documents'
     AND NOT v_is_trial AND NOT v_is_pro_limited AND NOT v_is_ai_active
     AND v_free_workspace IS NULL
     AND EXISTS (SELECT 1 FROM public.pro_free_case_grants g WHERE g.lawyer_id = NEW.lawyer_id) THEN
    RAISE EXCEPTION 'AI_FREE_CASE_INVALID_SCOPE: no se pudo identificar tu primer caso. Actualiza a Pro para seguir usando documentos con IA.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 4.58A.5: paid SaaS dominates legacy. has_plus_access / has_pro_access
  -- require live paid rows, so legacy-only lawyers are unaffected below.
  v_is_plus := public.has_plus_access(NEW.lawyer_id);
  v_has_paid := public.has_pro_access(NEW.lawyer_id);

  -- Only limit if trial, paid, pro_limited, or free_case plan.
  -- Legacy-paid-only and no-entitlement lawyers keep the legacy no-cap path.
  IF NOT v_is_trial AND NOT v_is_pro_limited AND NOT v_has_paid AND v_free_workspace IS NULL THEN
    RETURN NEW;
  END IF;

  -- Serialize concurrent inserts per lawyer so the last slot admits one winner.
  PERFORM pg_advisory_xact_lock(hashtextextended('ai-doc-limit:' || NEW.lawyer_id::text, 0));

  IF TG_TABLE_NAME = 'ai_workspaces' THEN
    -- 4.38C: workspace is internal architecture, not a Pro commercial quota.
    -- 4.58A.5: any paid SaaS (incl. dual legacy+paid) uncapped, like Pro-only.
    IF v_is_pro_limited OR v_has_paid THEN
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
    -- 4.44A: 2 current stored documents scoped to the free Case workspace
    -- (scope check + cap + RETURN NEW, sin cambios).
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
    -- 4.58A.5: 150 paid Plus / 50 paid Pro (incl. dual legacy+paid) /
    -- 50 pro_limited / 10 trial. Stable machine-readable marker kept.
    v_max := CASE WHEN v_is_plus THEN 150 WHEN v_has_paid OR v_is_pro_limited THEN 50 ELSE 10 END;
    SELECT count(*) INTO v_count FROM public.ai_documents WHERE lawyer_id = NEW.lawyer_id;
    IF v_count >= v_max THEN
      IF v_is_plus THEN
        RAISE EXCEPTION 'AI_DOCUMENT_CAPACITY_REACHED: Alcanzaste el límite de 150 documentos almacenados de tu plan.'
          USING ERRCODE = 'P0001';
      ELSIF v_has_paid OR v_is_pro_limited THEN
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
