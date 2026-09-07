-- FASE 3B-2.3 — Pro Limited AI enforcement (1 caso / 3 docs) — DB trigger
-- Extends ai_enforce_trial_limits to also enforce Pro Limited via has_pro_access
-- No new table, no new ai_subscriptions row for Pro

CREATE OR REPLACE FUNCTION public.ai_enforce_trial_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_trial boolean;
  v_is_pro_limited boolean;
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

  -- Only limit if trial or pro_limited
  IF NOT v_is_trial AND NOT v_is_pro_limited THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'ai_workspaces' THEN
    v_max := CASE WHEN v_is_pro_limited THEN 1 ELSE 3 END;
    SELECT count(*) INTO v_count FROM public.ai_workspaces WHERE lawyer_id = NEW.lawyer_id;
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'Alcanzaste el límite de % caso(s) de tu plan. Actualiza a AI Full para más.', v_max
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF TG_TABLE_NAME = 'ai_documents' THEN
    v_max := CASE WHEN v_is_pro_limited THEN 3 ELSE 10 END;
    SELECT count(*) INTO v_count FROM public.ai_documents WHERE lawyer_id = NEW.lawyer_id;
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'Alcanzaste el límite de % documento(s) de tu plan. Actualiza a AI Full para más.', v_max
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-apply triggers (already exists, but ensure they use new function)
DROP TRIGGER IF EXISTS trg_ai_enforce_trial_limits_workspaces ON public.ai_workspaces;
CREATE TRIGGER trg_ai_enforce_trial_limits_workspaces
  BEFORE INSERT ON public.ai_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.ai_enforce_trial_limits();

DROP TRIGGER IF EXISTS trg_ai_enforce_trial_limits_documents ON public.ai_documents;
CREATE TRIGGER trg_ai_enforce_trial_limits_documents
  BEFORE INSERT ON public.ai_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.ai_enforce_trial_limits();
