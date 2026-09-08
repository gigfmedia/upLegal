-- FASE 4B-1. Apply before deploying the API/Edge changes. No user promotions/demotions.
BEGIN;

-- Same authority as requireAdmin: signed Auth app_metadata, never profiles/email/user_metadata.
CREATE OR REPLACE FUNCTION public.security_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT COALESCE(auth.jwt()->'app_metadata'->>'role' IN ('admin', 'superadmin'), false);
$$;
REVOKE ALL ON FUNCTION public.security_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.security_platform_admin() TO anon, authenticated, service_role;

-- Runs even through SECURITY DEFINER profile-writing RPCs. Do not bypass based on
-- current_user (a definer function can run as postgres for an ordinary caller).
CREATE OR REPLACE FUNCTION public.security_preserve_profile_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS NOT DISTINCT FROM OLD.role THEN RETURN NEW; END IF;
  IF lower(btrim(NEW.role::text)) IN ('admin', 'superadmin')
    AND NOT public.security_platform_admin()
    AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Privileged profile roles are server-managed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER security_preserve_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.security_preserve_profile_role();

DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
CREATE POLICY payments_trusted_admin ON public.payments FOR ALL TO authenticated
  USING (public.security_platform_admin()) WITH CHECK (public.security_platform_admin());
-- Bound any additional legacy permissive policies without removing legitimate owner reads.
CREATE POLICY payments_authorized_read ON public.payments AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (auth.uid() = user_id OR auth.uid() = lawyer_id OR public.security_platform_admin());
CREATE POLICY payments_authorized_insert ON public.payments AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (public.security_platform_admin());
CREATE POLICY payments_authorized_update ON public.payments AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (public.security_platform_admin()) WITH CHECK (public.security_platform_admin());
CREATE POLICY payments_authorized_delete ON public.payments AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (public.security_platform_admin());

-- Replace the other versioned administrative policies using profiles.role.
DROP POLICY IF EXISTS platform_settings_select_admin ON public.platform_settings;
DROP POLICY IF EXISTS platform_settings_update_admin ON public.platform_settings;
DROP POLICY IF EXISTS platform_settings_insert_admin ON public.platform_settings;
CREATE POLICY platform_settings_trusted_admin ON public.platform_settings FOR ALL TO authenticated
  USING (public.security_platform_admin()) WITH CHECK (public.security_platform_admin());
-- The existing public settings SELECT policy is preserved.
DROP POLICY IF EXISTS payout_logs_select_admin ON public.payout_logs;
DROP POLICY IF EXISTS payout_logs_insert_admin ON public.payout_logs;
CREATE POLICY payout_logs_trusted_admin ON public.payout_logs FOR ALL TO authenticated
  USING (public.security_platform_admin()) WITH CHECK (public.security_platform_admin());
CREATE POLICY payout_logs_authority ON public.payout_logs AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (public.security_platform_admin()) WITH CHECK (public.security_platform_admin());
DO $$ DECLARE operation text; BEGIN
  FOREACH operation IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.platform_settings AS RESTRICTIVE FOR %s TO anon, authenticated %s',
      'platform_settings_authority_' || lower(operation), operation,
      CASE operation WHEN 'INSERT' THEN 'WITH CHECK (public.security_platform_admin())'
        WHEN 'UPDATE' THEN 'USING (public.security_platform_admin()) WITH CHECK (public.security_platform_admin())'
        ELSE 'USING (public.security_platform_admin())' END);
  END LOOP;
END $$;

-- Browser subscription writes must go through authenticated company API handlers.
-- Billing reads are restricted to company owner/admin; platform admin is not company membership.
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscription_billing_read ON public.company_subscriptions FOR SELECT TO authenticated
  USING (public.security_company_role(company_id) IN ('owner', 'admin'));
CREATE POLICY subscription_billing_authority ON public.company_subscriptions AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (public.security_company_role(company_id) IN ('owner', 'admin'));
REVOKE INSERT, UPDATE, DELETE ON public.company_subscriptions FROM anon, authenticated;
CREATE POLICY subscription_no_browser_insert ON public.company_subscriptions AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY subscription_no_browser_update ON public.company_subscriptions AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY subscription_no_browser_delete ON public.company_subscriptions AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- Atomic local reconciliation after provider confirmation. Execute only from the service-role API.
CREATE OR REPLACE FUNCTION public.cancel_company_subscription_confirmed(
  p_subscription_id uuid, p_company_id uuid, p_preapproval_id text
) RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE matched_subscription uuid;
BEGIN
  SELECT s.id INTO matched_subscription FROM public.company_subscriptions s
    WHERE s.id = p_subscription_id AND s.company_id = p_company_id
      AND s.mercadopago_preapproval_id::text = p_preapproval_id FOR UPDATE;
  IF matched_subscription IS NULL THEN
    RAISE EXCEPTION 'Subscription identity changed; reconcile required' USING ERRCODE = '40001';
  END IF;
  UPDATE public.company_subscriptions SET status = 'cancelled', cancel_at_period_end = true, updated_at = now()
    WHERE id = matched_subscription;
  UPDATE public.companies SET status = 'cancelled', updated_at = now() WHERE id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Company missing; reconcile required' USING ERRCODE = '40001'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_company_subscription_confirmed(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_company_subscription_confirmed(uuid, uuid, text) TO service_role;
COMMIT;
