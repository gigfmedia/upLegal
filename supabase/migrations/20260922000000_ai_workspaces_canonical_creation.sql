-- 4.33D: new workspaces are created only by the owned-case server endpoint.
-- Remote audit: authenticated INSERT + ai_workspaces_insert_own allowed direct
-- standalone creation. Preserve legacy SELECT/UPDATE/DELETE policies and data.
BEGIN;
DROP POLICY IF EXISTS ai_workspaces_insert_own ON public.ai_workspaces;
REVOKE INSERT ON TABLE public.ai_workspaces FROM anon, authenticated;
-- service_role already has INSERT; it remains the canonical provisioning writer.
COMMIT;
