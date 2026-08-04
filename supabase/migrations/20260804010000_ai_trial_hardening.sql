-- Fase 3.7 — Capa 1: Hardening del Trial de LegalUp AI.
-- 1 persona / abogado = 1 trial · aplicado por backend + BD.
--
-- Partes:
--   1) Versiona la estructura de ai_subscriptions (hoy solo existe en la BD
--      remota, creada vía SQL editor) para que sea reproducible desde el repo.
--   2) Agrega `trial_email` (normalizado trim+lowercase) con un índice UNIQUE
--      parcial: un mismo email NO puede volver a obtener un trial aunque se
--      elimine/recree la cuenta o el perfil.
--   3) Trigger SECURITY DEFINER que rechaza en BD la creación de casos
--      (ai_workspaces) y documentos (ai_documents) cuando un abogado EN TRIAL
--      supera sus límites (3 casos / 10 documentos). Así el límite se aplica
--      incluso ante inserciones directas del cliente (RLS no marca la autoridad).

-- =========================================================
-- 1) Estructura reproducible de ai_subscriptions
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ai_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'base',
  status text NOT NULL DEFAULT 'trialing',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  provider text,
  provider_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  trial_reminder_day integer,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz
);

-- Protección existente: un solo trial por lawyer (no se elimina ni se reemplaza).
CREATE UNIQUE INDEX IF NOT EXISTS ai_subscriptions_one_trial_per_lawyer
  ON public.ai_subscriptions (lawyer_id);

-- Índice de búsqueda por periodo de trial (usado por recordatorios/expiración).
CREATE INDEX IF NOT EXISTS idx_ai_subscriptions_trial_ends_at
  ON public.ai_subscriptions (trial_ends_at);

-- =========================================================
-- 2) Deduplicación por email
-- =========================================================
ALTER TABLE public.ai_subscriptions
  ADD COLUMN IF NOT EXISTS trial_email text;

COMMENT ON COLUMN public.ai_subscriptions.trial_email IS
  'Email normalizado (trim+lowercase) con el que se inició el trial. UNIQUE parcial: impide re-obtener trial con el mismo email aunque se cree otra cuenta/perfil.';

-- UNIQUE parcial: solo las filas con trial_email se consideran para dedup, así
-- las suscripciones (que no pasan por trial_email) no rompen el índice por NULL.
CREATE UNIQUE INDEX IF NOT EXISTS ai_subscriptions_one_trial_per_email
  ON public.ai_subscriptions (trial_email)
  WHERE trial_email IS NOT NULL;

-- =========================================================
-- 3) Límites de trial aplicados en BD (3 casos / 10 documentos)
-- =========================================================
-- Marca si el abogado está EN TRIAL activo, reflejando la derivación de
-- `isTrialing` del backend (getAILawyerAccess):
--   - trialing con trial vigente              → trial
--   - active/cancelled/past_due SIN período pagado vigente pero con trial
--     vigente (p. ej. checkout abandonado)   → trial
--   - active con período pagado vigente       → NO trial (Pro sin límite comercial)
CREATE OR REPLACE FUNCTION public.ai_is_lawyer_on_trial(p_lawyer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ai_subscriptions s
    WHERE s.lawyer_id = p_lawyer_id
      AND s.trial_started_at IS NOT NULL
      AND s.trial_ends_at > now()
      AND (
        s.status = 'trialing'
        OR (
          s.status IN ('active', 'cancelled', 'past_due')
          AND (s.current_period_end IS NULL OR s.current_period_end <= now())
        )
      )
  );
$$;

-- Trigger que valida los límites de trial al crear un caso o subir un documento.
CREATE OR REPLACE FUNCTION public.ai_enforce_trial_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_on_trial boolean;
  v_count integer;
  v_max integer;
BEGIN
  v_on_trial := public.ai_is_lawyer_on_trial(NEW.lawyer_id);

  -- Solo se limita durante el trial; el plan Pro activo no tiene límite comercial.
  IF NOT v_on_trial THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'ai_workspaces' THEN
    v_max := 3;
    SELECT count(*) INTO v_count FROM public.ai_workspaces WHERE lawyer_id = NEW.lawyer_id;
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'Alcanzaste el límite de % casos de la prueba gratuita. Suscríbete a Pro para crear más.', v_max
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF TG_TABLE_NAME = 'ai_documents' THEN
    v_max := 10;
    SELECT count(*) INTO v_count FROM public.ai_documents WHERE lawyer_id = NEW.lawyer_id;
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'Alcanzaste el límite de % documentos de la prueba gratuita. Suscríbete a Pro para subir más.', v_max
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_enforce_trial_limits_workspaces ON public.ai_workspaces;
CREATE TRIGGER trg_ai_enforce_trial_limits_workspaces
  BEFORE INSERT ON public.ai_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.ai_enforce_trial_limits();

DROP TRIGGER IF EXISTS trg_ai_enforce_trial_limits_documents ON public.ai_documents;
CREATE TRIGGER trg_ai_enforce_trial_limits_documents
  BEFORE INSERT ON public.ai_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.ai_enforce_trial_limits();

-- Las funciones se ejecutan con permisos del owner (SECURITY DEFINER); no se
-- exponen como datos/RLS ni se necesita otorgárselas a anónimos.
REVOKE ALL ON FUNCTION public.ai_is_lawyer_on_trial(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ai_enforce_trial_limits() FROM PUBLIC;