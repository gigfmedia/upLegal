-- FASE 2F — Elegibilidad de payout y aislamiento legacy
-- Aditiva e idempotente. No hace backfill: toda fila histórica queda
-- payout_eligible=false hasta reconciliación explícita.
--
-- Objetivo:
--   1) Agregar columnas de confirmación/elegibilidad que exige el Edge corregido.
--   2) Impedir payout_eligible=true sin evidencia canónica completa.
--   3) Bloquear pending->processing para pagos no elegibles.
--   4) Reconciliar pagos canónicos futuros sin modificar el webhook:
--      - payment_gateway_id se deriva de metadata.provider_payment_id.
--      - payment_events.success(source=webhook) confirma y habilita el payout.
--
-- No modifica webhooks, Edge Functions, cron, RLS ni datos históricos.

BEGIN;

-- 1. Columnas de elegibilidad.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_source text,
  ADD COLUMN IF NOT EXISTS payout_eligible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.payments.confirmed_at IS
  'Timestamp de confirmación verificada por el webhook firmado.';
COMMENT ON COLUMN public.payments.confirmation_source IS
  'Origen de la confirmación; payout solo acepta mercadopago_webhook.';
COMMENT ON COLUMN public.payments.payout_eligible IS
  'Solo true cuando existe evidencia canónica completa y el pago es pagable.';

-- 2. Guardia de elegibilidad. NOT VALID evita escanear/bloquear históricos;
--    las filas nuevas o actualizadas sí se validan.
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_payout_eligible_guard;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_payout_eligible_guard
  CHECK (
    NOT payout_eligible
    OR (
      COALESCE(status, '') = 'succeeded'
      AND confirmed_at IS NOT NULL
      AND COALESCE(confirmation_source, '') = 'mercadopago_webhook'
      AND payment_gateway_id IS NOT NULL
      AND COALESCE(trim(payment_gateway_id), '') <> ''
      AND COALESCE(currency, '') = 'CLP'
      AND lawyer_id IS NOT NULL
      AND COALESCE(lawyer_amount, 0) > 0
      AND COALESCE(amount, 0) > 0
    )
  ) NOT VALID;

-- 3. Defensa en profundidad: llamadas cliente no pueden crear succeeded ni
--    tocar campos financieros/de payout. service_role y admin sí.
CREATE OR REPLACE FUNCTION public.zz_protect_payments_authority()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role'
     OR public.security_platform_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.payout_status := 'pending';
    NEW.payout_eligible := false;
    NEW.confirmed_at := NULL;
    NEW.confirmation_source := NULL;
    NEW.payment_gateway_id := NULL;
    NEW.payout_reference := NULL;
    NEW.payout_date := NULL;
    NEW.payout_error := NULL;
  ELSE
    NEW.status := OLD.status;
    NEW.payout_status := OLD.payout_status;
    NEW.payout_eligible := OLD.payout_eligible;
    NEW.confirmed_at := OLD.confirmed_at;
    NEW.confirmation_source := OLD.confirmation_source;
    NEW.payment_gateway_id := OLD.payment_gateway_id;
    NEW.payout_reference := OLD.payout_reference;
    NEW.payout_date := OLD.payout_date;
    NEW.payout_error := OLD.payout_error;

    NEW.amount := OLD.amount;
    NEW.total_amount := OLD.total_amount;
    NEW.lawyer_amount := OLD.lawyer_amount;
    NEW.platform_fee := OLD.platform_fee;
    NEW.original_amount := OLD.original_amount;
    NEW.client_surcharge := OLD.client_surcharge;
    NEW.client_surcharge_percent := OLD.client_surcharge_percent;
    NEW.platform_fee_percent := OLD.platform_fee_percent;
    NEW.currency := OLD.currency;
    NEW.user_id := OLD.user_id;
    NEW.lawyer_id := OLD.lawyer_id;
    NEW.booking_id := OLD.booking_id;
    NEW.appointment_id := OLD.appointment_id;
    NEW.consultation_id := OLD.consultation_id;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.zz_protect_payments_authority() IS
  'Fuerza pagos de clientes a pending y protege campos financieros/de payout.';

DROP TRIGGER IF EXISTS zz_protect_payments_authority ON public.payments;
CREATE TRIGGER zz_protect_payments_authority
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.zz_protect_payments_authority();

-- 4. Canonicalización del gateway. El webhook canónico guarda el ID de MP en
--    metadata.provider_payment_id; el Edge exige payment_gateway_id no vacío.
CREATE OR REPLACE FUNCTION public.zz_canonicalize_payment_gateway()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role'
     OR public.security_platform_admin() THEN
    IF COALESCE(trim(NEW.payment_gateway_id), '') = ''
       AND COALESCE(NEW.metadata->>'provider', '') = 'mercadopago'
       AND COALESCE(trim(NEW.metadata->>'provider_payment_id'), '') <> '' THEN
      NEW.payment_gateway_id := trim(NEW.metadata->>'provider_payment_id');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.zz_canonicalize_payment_gateway() IS
  'Deriva payment_gateway_id del metadata canónico de Mercado Pago.';

DROP TRIGGER IF EXISTS zz_canonicalize_payment_gateway ON public.payments;
CREATE TRIGGER zz_canonicalize_payment_gateway
  BEFORE INSERT OR UPDATE OF metadata, payment_gateway_id ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.zz_canonicalize_payment_gateway();

-- 5. Reconciliación de confirmación. Solo un success completado con
--    metadata.source='webhook' y el mismo payment_id del gateway confirma.
CREATE OR REPLACE FUNCTION public.zz_reconcile_payment_confirmation(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_event_at timestamptz;
BEGIN
  SELECT e.created_at
    INTO v_event_at
  FROM public.payment_events e
  JOIN public.payments p ON p.payment_gateway_id = e.payment_id
  WHERE p.id = p_payment_id
    AND e.event_type = 'success'
    AND e.status = 'completed'
    AND COALESCE(e.metadata->>'source', '') = 'webhook'
  ORDER BY e.created_at
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.payments p
  SET confirmed_at = COALESCE(p.confirmed_at, v_event_at, now()),
      confirmation_source = 'mercadopago_webhook',
      payout_eligible = (
        p.status = 'succeeded'
        AND COALESCE(p.currency, '') = 'CLP'
        AND p.lawyer_id IS NOT NULL
        AND COALESCE(p.lawyer_amount, 0) > 0
        AND COALESCE(p.amount, 0) > 0
        AND p.payment_gateway_id IS NOT NULL
        AND COALESCE(trim(p.payment_gateway_id), '') <> ''
      )
  WHERE p.id = p_payment_id
    AND p.confirmed_at IS NULL;
END;
$function$;

COMMENT ON FUNCTION public.zz_reconcile_payment_confirmation(uuid) IS
  'Confirma un pago solo con evidencia success/webhook ya persistida.';

REVOKE ALL ON FUNCTION public.zz_reconcile_payment_confirmation(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zz_reconcile_payment_confirmation(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.zz_confirm_payment_from_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_payment_id uuid;
BEGIN
  IF NEW.event_type = 'success'
     AND NEW.status = 'completed'
     AND COALESCE(NEW.metadata->>'source', '') = 'webhook'
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'payment confirmation events require service_role'
      USING ERRCODE = '42501';
  END IF;

  IF COALESCE(auth.role(), '') <> 'service_role'
     OR NEW.event_type <> 'success'
     OR NEW.status <> 'completed'
     OR NEW.payment_id IS NULL
     OR COALESCE(NEW.metadata->>'source', '') <> 'webhook' THEN
    RETURN NEW;
  END IF;

  SELECT p.id
    INTO v_payment_id
  FROM public.payments p
  WHERE p.payment_gateway_id = NEW.payment_id
  ORDER BY p.created_at
  LIMIT 1;

  IF v_payment_id IS NOT NULL THEN
    PERFORM public.zz_reconcile_payment_confirmation(v_payment_id);
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.zz_confirm_payment_from_event() IS
  'Reconcilia payment_events.success de webhook contra payments.';

DROP TRIGGER IF EXISTS zz_confirm_payment_from_event ON public.payment_events;
CREATE TRIGGER zz_confirm_payment_from_event
  AFTER INSERT ON public.payment_events
  FOR EACH ROW EXECUTE FUNCTION public.zz_confirm_payment_from_event();

CREATE OR REPLACE FUNCTION public.zz_reconcile_payment_after_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role'
     OR public.security_platform_admin() THEN
    PERFORM public.zz_reconcile_payment_confirmation(NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.zz_reconcile_payment_after_write() IS
  'Reconcilia un pago cuando cambia su evidencia canónica.';

DROP TRIGGER IF EXISTS zz_reconcile_payment_after_write ON public.payments;
CREATE TRIGGER zz_reconcile_payment_after_write
  AFTER INSERT OR UPDATE OF payment_gateway_id, status, currency, lawyer_id, lawyer_amount
  ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.zz_reconcile_payment_after_write();

-- 6. Un pago no elegible no puede pasar a processing.
CREATE OR REPLACE FUNCTION public.enforce_payout_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.payout_status = 'processing'
     AND OLD.payout_status = 'pending'
     AND NEW.payout_eligible IS NOT TRUE THEN
    RAISE EXCEPTION 'payout not eligible' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.enforce_payout_eligibility() IS
  'Bloquea pending->processing si el pago no fue confirmado y elegible.';

DROP TRIGGER IF EXISTS payments_require_payout_eligibility ON public.payments;
CREATE TRIGGER payments_require_payout_eligibility
  BEFORE UPDATE OF payout_status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_payout_eligibility();

-- 7. Índice para la cola de payouts elegibles.
CREATE INDEX IF NOT EXISTS payments_payout_queue_idx
  ON public.payments (lawyer_id, created_at)
  WHERE status = 'succeeded'
    AND payout_status = 'pending'
    AND payout_eligible;

COMMIT;
