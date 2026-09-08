-- Promote existing profiles.role admins to server-managed app_metadata.
-- Deterministic, idempotent, service_role-only authority. No emails hardcoded.
-- Run once before deploying server/auth/authorization.mjs (app_metadata-only checks).
BEGIN;
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
FROM public.profiles p
WHERE p.id = u.id
  AND p.role IN ('admin', 'superadmin')
  AND COALESCE(u.raw_app_meta_data->>'role', '') NOT IN ('admin', 'superadmin');
COMMIT;
