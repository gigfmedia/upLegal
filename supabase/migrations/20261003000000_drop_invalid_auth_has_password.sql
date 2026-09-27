-- ===========================================================================
-- FASE 4.53D — compensating migration: drop the invalid has-password RPC.
--
-- 20261002000000_auth_has_password.sql introduced public.has_auth_password()
-- reading auth.users.encrypted_password. Production evidence proved that
-- GoTrue generates a random unknown password hash on admin.createUser
-- without an explicit password, so non-empty encrypted_password does NOT
-- mean "user knows a password" for admin-invited Magic Link lawyers.
-- The function was never called by deployed UI (frontend undeployed) and is
-- removed before any rollout. Authority moves to server-controlled
-- app_metadata.password_setup (see 4.53D report).
-- ===========================================================================

DROP FUNCTION IF EXISTS public.has_auth_password();
