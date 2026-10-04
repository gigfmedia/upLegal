-- FASE 4.60C: historial operativo del caso (solo completions/cierre, sin ruido).
-- 1) Extensión aditiva del CHECK de event_type (sin backfill, sin DML destructivo).
ALTER TABLE public.ai_case_timeline_events DROP CONSTRAINT ai_case_timeline_events_event_type_check;
ALTER TABLE public.ai_case_timeline_events ADD CONSTRAINT ai_case_timeline_events_event_type_check CHECK (event_type = ANY (ARRAY['case_created'::text, 'document_uploaded'::text, 'document_analyzed'::text, 'risk_identified'::text, 'deadline_detected'::text, 'note'::text, 'task_completed'::text, 'next_action_completed'::text, 'case_closed'::text]));

-- 2) Pendiente completado: false->true genera UN evento (idempotente por task_id+completed_at).
CREATE OR REPLACE FUNCTION public.log_lawyer_case_task_completed()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_workspace uuid;
BEGIN
  IF btrim(NEW.title) = '' THEN RETURN NEW; END IF;
  SELECT ai_workspace_id INTO v_workspace FROM public.lawyer_cases WHERE id = NEW.case_id;
  IF v_workspace IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.ai_case_timeline_events
    WHERE workspace_id = v_workspace AND event_type = 'task_completed'
      AND metadata->>'task_id' = NEW.id::text
      AND event_date = NEW.completed_at) THEN RETURN NEW; END IF;
  INSERT INTO public.ai_case_timeline_events (workspace_id, lawyer_id, event_type, title, description, event_date, metadata)
  VALUES (v_workspace, NEW.lawyer_id, 'task_completed', 'Pendiente completado', NEW.title, COALESCE(NEW.completed_at, now()), jsonb_build_object('task_id', NEW.id));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_task_completed_timeline ON public.lawyer_case_tasks;
CREATE TRIGGER trg_task_completed_timeline
AFTER UPDATE ON public.lawyer_case_tasks
FOR EACH ROW
WHEN (OLD.completed = false AND NEW.completed = true AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION public.log_lawyer_case_task_completed();

-- 3) Próxima gestión completada (NULL->NOT NULL) y caso cerrado (->closed).
-- Idempotencia: existencia por (workspace, tipo, event_date); el cierre además
-- solo dispara en transición real de estado (reescritura del mismo estado no dispara).
CREATE OR REPLACE FUNCTION public.log_lawyer_case_operational()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.next_action_completed_at IS NULL AND NEW.next_action_completed_at IS NOT NULL AND NEW.ai_workspace_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.ai_case_timeline_events
      WHERE workspace_id = NEW.ai_workspace_id AND event_type = 'next_action_completed'
        AND event_date = NEW.next_action_completed_at) THEN
      INSERT INTO public.ai_case_timeline_events (workspace_id, lawyer_id, event_type, title, description, event_date, metadata)
      VALUES (NEW.ai_workspace_id, NEW.lawyer_id, 'next_action_completed', 'Próxima gestión completada', OLD.next_action, NEW.next_action_completed_at, jsonb_build_object('due_at', OLD.next_action_due_at));
    END IF;
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'closed' AND NEW.ai_workspace_id IS NOT NULL THEN
    INSERT INTO public.ai_case_timeline_events (workspace_id, lawyer_id, event_type, title, description, event_date, metadata)
    VALUES (NEW.ai_workspace_id, NEW.lawyer_id, 'case_closed', 'Caso cerrado', NULL, now(), jsonb_build_object('from_status', OLD.status, 'case_id', NEW.id));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_case_operational_timeline ON public.lawyer_cases;
CREATE TRIGGER trg_case_operational_timeline
AFTER UPDATE ON public.lawyer_cases
FOR EACH ROW
WHEN ((OLD.next_action_completed_at IS NULL AND NEW.next_action_completed_at IS NOT NULL) OR (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'closed'))
EXECUTE FUNCTION public.log_lawyer_case_operational();
