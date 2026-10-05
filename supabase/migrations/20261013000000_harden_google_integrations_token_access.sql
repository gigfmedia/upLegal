-- FASE 4.60C.1 — blindar tokens OAuth de Google contra lectura del browser.
-- La tabla google_integrations (creada fuera de migraciones) tenía una policy
-- SELECT owner que permitía a cualquier dueño leer sus tokens vía API pública.
-- Todo el frontend ya usa el endpoint canónico google-auth/status (solo
-- {connected}), y las Edge Functions operan con service_role (bypass RLS).
-- Se elimina SOLO el SELECT autenticado; INSERT/UPDATE/DELETE se conservan.
-- RLS sigue habilitado. Sin cambios de schema ni datos (sin reconexión).

DROP POLICY IF EXISTS "Users can view their own google integration"
  ON public.google_integrations;

-- No hay policy SELECT de reemplazo: default-deny para anon/authenticated.
-- service_role no se ve afectado (bypass RLS).
