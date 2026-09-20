-- 4.36E: accidental/empty case deletion only. No retention system or billing change.
BEGIN;

-- These parent FKs serialize concurrent booking/link writes with case/workspace deletion.
-- Fail the deployment instead of silently assuming a manually-created column has its FK.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('public.bookings'::regclass, 'case_id', 'public.lawyer_cases'::regclass),
    ('public.lawyer_cases'::regclass, 'ai_workspace_id', 'public.ai_workspaces'::regclass)
  ) AS required(child_table, child_column, parent_table) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint fk
      WHERE fk.contype = 'f' AND fk.conrelid = r.child_table AND fk.confrelid = r.parent_table
        AND NOT fk.condeferrable
        AND fk.conkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute
          WHERE attrelid = r.child_table AND attname = r.child_column)]
        AND fk.confkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute
          WHERE attrelid = r.parent_table AND attname = 'id')]
    ) THEN
      RAISE EXCEPTION 'Safe case deletion requires the immediate parent FK on %.%', r.child_table, r.child_column;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_delete_lawyer_case(p_case_id uuid)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lawyer_cases c
    WHERE c.id = p_case_id AND c.lawyer_id = auth.uid()
      AND c.source = 'LAWYER_DIRECT'
      AND c.booking_id IS NULL AND c.quote_request_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.case_id = c.id)
      AND (c.ai_workspace_id IS NULL OR (
        EXISTS (SELECT 1 FROM public.ai_workspaces w
                WHERE w.id = c.ai_workspace_id AND w.lawyer_id = c.lawyer_id)
        AND NOT EXISTS (SELECT 1 FROM public.lawyer_cases other
                        WHERE other.ai_workspace_id = c.ai_workspace_id AND other.id <> c.id)
        AND NOT EXISTS (
          SELECT 1 FROM public.ai_documents WHERE workspace_id = c.ai_workspace_id
          UNION ALL SELECT 1 FROM public.ai_document_analyses WHERE workspace_id = c.ai_workspace_id
          UNION ALL SELECT 1 FROM public.ai_chat_messages WHERE workspace_id = c.ai_workspace_id
          UNION ALL SELECT 1 FROM public.ai_research_requests WHERE workspace_id = c.ai_workspace_id
          UNION ALL SELECT 1 FROM public.ai_usage WHERE workspace_id = c.ai_workspace_id
          -- Pending can mean reset by the lawyer: there is no trustworthy untouched marker.
          UNION ALL SELECT 1 FROM public.ai_case_workflow_items WHERE workspace_id = c.ai_workspace_id
          UNION ALL SELECT 1 FROM public.ai_case_timeline_events
            WHERE workspace_id = c.ai_workspace_id AND event_type IS DISTINCT FROM 'case_created'
        )
      ))
  );
$$;
REVOKE ALL ON FUNCTION public.can_delete_lawyer_case(uuid) FROM PUBLIC, anon, authenticated, service_role;

-- Child writes take a parent lock even on non-FK updates (e.g. creation event -> note).
-- It conflicts with deletion's FOR UPDATE. A deleted parent rejects the write.
-- Existing legacy orphan workspaces are unaffected: no lawyer_case is required here.
CREATE OR REPLACE FUNCTION public.lock_case_workspace_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.workspace_id IS NOT NULL THEN
    PERFORM 1 FROM public.ai_workspaces WHERE id = NEW.workspace_id FOR KEY SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Workspace no longer exists' USING ERRCODE = '23503';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lock_case_workspace_write() FROM PUBLIC, anon, authenticated, service_role;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ai_documents','ai_document_analyses','ai_chat_messages',
    'ai_conversations','ai_research_requests','ai_usage','ai_case_workflow_items','ai_case_timeline_events']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_case_workspace_write BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.lock_case_workspace_write()', t);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_case_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Explicit trusted maintenance only; a missing JWT by itself is NOT a bypass.
  IF current_setting('role', true) = 'service_role'
     OR (current_setting('role', true) = 'none' AND session_user IN ('postgres','supabase_admin')) THEN
    RETURN OLD;
  END IF;
  -- Fresh snapshots are required for the post-lock content check (PostgREST default).
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'CASE_NOT_DELETABLE' USING ERRCODE = 'P0001';
  END IF;
  -- DELETE already locks the case. Lock workspace before a FRESH predicate snapshot.
  -- VOLATILE is intentional: after waiting, see child/business writes that committed.
  IF OLD.ai_workspace_id IS NOT NULL THEN
    PERFORM 1 FROM public.ai_workspaces WHERE id = OLD.ai_workspace_id FOR UPDATE;
  END IF;
  IF NOT public.can_delete_lawyer_case(OLD.id) THEN
    RAISE EXCEPTION 'CASE_NOT_DELETABLE' USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_case_delete() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS trg_guard_case_delete ON public.lawyer_cases;
CREATE TRIGGER trg_guard_case_delete BEFORE DELETE ON public.lawyer_cases
  FOR EACH ROW EXECUTE FUNCTION public.guard_case_delete();

-- Run AFTER the case is gone, so ON DELETE SET NULL cannot update its deleting tuple.
-- Only self-deletes certified by the guard clean up the empty technical workspace.
CREATE OR REPLACE FUNCTION public.cleanup_empty_case_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated' AND OLD.ai_workspace_id IS NOT NULL THEN
    DELETE FROM public.ai_workspaces WHERE id = OLD.ai_workspace_id;
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_empty_case_workspace() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER trg_cleanup_empty_case_workspace AFTER DELETE ON public.lawyer_cases
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_empty_case_workspace();

-- Prevent clearing/rewriting the evidence links to bypass delete eligibility.
-- Initial lazy linkage remains allowed; trusted provisioning/maintenance stays intact.
CREATE OR REPLACE FUNCTION public.guard_case_history_links()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated' AND (
    NEW.lawyer_id IS DISTINCT FROM OLD.lawyer_id
    OR NEW.source IS DISTINCT FROM OLD.source
    OR (OLD.ai_workspace_id IS NOT NULL AND NEW.ai_workspace_id IS DISTINCT FROM OLD.ai_workspace_id)
    OR (OLD.booking_id IS NOT NULL AND NEW.booking_id IS DISTINCT FROM OLD.booking_id)
    OR (OLD.quote_request_id IS NOT NULL AND NEW.quote_request_id IS DISTINCT FROM OLD.quote_request_id)
  ) THEN
    RAISE EXCEPTION 'CASE_HISTORY_LINK_PROTECTED' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_case_history_links() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER trg_guard_case_history_links BEFORE UPDATE ON public.lawyer_cases
  FOR EACH ROW EXECUTE FUNCTION public.guard_case_history_links();

CREATE OR REPLACE FUNCTION public.get_case_delete_eligibility(p_case_id uuid)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('can_delete', public.can_delete_lawyer_case(p_case_id));
$$;
REVOKE ALL ON FUNCTION public.get_case_delete_eligibility(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_case_delete_eligibility(uuid) TO authenticated;
COMMIT;
