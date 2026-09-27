-- ===========================================================================
-- FASE 4.53B — authoritative has-password signal for password setup UX.
--
-- Lawyers onboarded via Magic Link have no password and therefore cannot
-- use a "current password" field. The Settings UX must split:
--   no password -> "Crear contraseña" (new + confirm only)
--   has password -> "Cambiar contraseña" (current genuinely verified)
--
-- Design:
-- 1) public.has_auth_password() returns boolean for the CALLER ONLY
--    (auth.uid()). Authority: auth.users.encrypted_password — a real
--    password exists iff the canonical value is non-empty. Client-visible
--    signals (providers, identities, user_metadata markers) can never
--    distinguish magic-link-only from password users.
-- 2) Hardened: SECURITY DEFINER, SET search_path = '', fully qualified
--    objects, no parameters (cross-user probing impossible by API design),
--    returns boolean only (hash/row never exposed).
-- 3) EXECUTE to authenticated only. No tables, no RLS changes, no data
--    migration. Reversible (DROP FUNCTION).
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.has_auth_password()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND COALESCE(u.encrypted_password, '') <> ''
  );
$$;

COMMENT ON FUNCTION public.has_auth_password() IS
  'FASE 4.53B: caller-only password existence for Settings UX split (Crear vs Cambiar). Authority is auth.users.encrypted_password; never exposed. Cross-user probing impossible (no parameters, auth.uid() only).';

REVOKE ALL ON FUNCTION public.has_auth_password() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_auth_password() TO authenticated;
