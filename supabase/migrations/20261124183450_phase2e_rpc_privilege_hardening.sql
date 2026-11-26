-- FASE 2E — Endurecimiento de privilegios de RPC financieras y de fundador.
--
-- Contexto verificado en producción: las seis funciones son SECURITY DEFINER y
-- conservaban EXECUTE implícito de PUBLIC, además de grants explícitos a anon y
-- authenticated. Revocar solo anon/authenticated no elimina el acceso por PUBLIC.
--
-- Esta migración es idempotente, no modifica datos ni definiciones de funciones.
-- No debe aplicarse en producción desde esta fase.

BEGIN;

GRANT USAGE ON SCHEMA public TO service_role;

DO $$
DECLARE
  v_signature text;
  v_oid oid;
  v_signatures text[] := ARRAY[
    'public.create_payment_secure(uuid,integer,integer,integer,numeric,numeric,integer,integer,text,text,uuid,uuid,jsonb,timestamptz,timestamptz)',
    'public.update_payment_gateway_id(uuid,text)',
    'public.claim_pro_founder_slot(uuid)',
    'public.reserve_pro_founder_slot(uuid,integer)',
    'public.reconcile_pro_founders()'
  ];
BEGIN
  FOREACH v_signature IN ARRAY v_signatures LOOP
    v_oid := to_regprocedure(v_signature);

    IF v_oid IS NULL THEN
      RAISE NOTICE 'FASE 2E: función ausente, se omite: %', v_signature;
      CONTINUE;
    END IF;

    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      v_oid::regprocedure
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      v_oid::regprocedure
    );
  END LOOP;
END
$$;

-- get_company_metrics conserva uso legítimo desde el panel admin autenticado y
-- desde el endpoint admin server-side. Se elimina PUBLIC y anon.
DO $$
DECLARE
  v_oid oid;
BEGIN
  v_oid := to_regprocedure('public.get_company_metrics()');

  IF v_oid IS NULL THEN
    RAISE NOTICE 'FASE 2E: función ausente, se omite: public.get_company_metrics()';
  ELSE
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon',
      v_oid::regprocedure
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',
      v_oid::regprocedure
    );
  END IF;
END
$$;

COMMIT;
