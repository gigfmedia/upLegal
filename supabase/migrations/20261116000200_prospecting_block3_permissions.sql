-- Bloque 3 / Fase 2: cierre append-only posterior al despliegue del runtime.
-- Las grants base, RLS, funciones y la vista viven en el guard para que el
-- runtime nuevo pueda operar en staging antes de esta migración.

-- 13. Revocación append-only
-- ---------------------------------------------------------------------------
revoke delete, truncate on public.prospecting_send_attempts from service_role;
revoke delete, truncate on public.prospecting_events from service_role;

revoke delete, truncate on public.prospecting_send_attempts from public, anon, authenticated;
revoke delete, truncate on public.prospecting_events from public, anon, authenticated;
