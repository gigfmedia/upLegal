-- FASE 1A — Lawyer SaaS Foundation (SECURITY + DATA FOUNDATION ONLY)
-- Crea lawyer_clients, lawyer_cases, extiende bookings con source/client_id
-- No toca server.mjs, no crea lawyer_subscriptions, no duplica agenda
-- Idempotente y backward compatible (bookings existentes -> source='UNKNOWN')
-- Tenant: lawyer_id = profiles.id = auth.uid()

-- 0) Extension y helper ya existente (no duplicar si existe)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 1) TABLE lawyer_clients
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.lawyer_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text, -- NULL = sin email (permite Nombre+teléfono)
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  phone text,
  source text NOT NULL DEFAULT 'UNKNOWN' CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN')),
  first_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lawyer_clients_email_valid CHECK (
    email IS NULL OR email ~ '^[^@]+@[^@]+\.[^@]+$'
  )
);

-- Normaliza email vacío ('', '   ') a NULL y trim antes de constraints
CREATE OR REPLACE FUNCTION public.lawyer_clients_normalize_email()
RETURNS trigger AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := nullif(btrim(NEW.email), '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lawyer_clients_normalize_email ON public.lawyer_clients;
CREATE TRIGGER trg_lawyer_clients_normalize_email
  BEFORE INSERT OR UPDATE OF email ON public.lawyer_clients
  FOR EACH ROW EXECUTE FUNCTION public.lawyer_clients_normalize_email();

-- updated_at
DROP TRIGGER IF EXISTS trg_lawyer_clients_updated_at ON public.lawyer_clients;
CREATE TRIGGER trg_lawyer_clients_updated_at
  BEFORE UPDATE ON public.lawyer_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS lawyer_clients_unique_email_per_lawyer
  ON public.lawyer_clients (lawyer_id, lower(btrim(email)))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lawyer_clients_lawyer_created
  ON public.lawyer_clients (lawyer_id, created_at DESC);

-- Comentario para auditoría
COMMENT ON TABLE public.lawyer_clients IS 'FASE 1A: relación privada lawyer->client aislada por lawyer_id = auth.uid(). Deduplica por lower(trim(email)) parcial. Permite NULL para clientes sin email.';

-- RLS
ALTER TABLE public.lawyer_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lawyer_clients_owner_select" ON public.lawyer_clients;
CREATE POLICY "lawyer_clients_owner_select"
  ON public.lawyer_clients FOR SELECT
  USING (auth.uid() = lawyer_id);

DROP POLICY IF EXISTS "lawyer_clients_owner_insert" ON public.lawyer_clients;
CREATE POLICY "lawyer_clients_owner_insert"
  ON public.lawyer_clients FOR INSERT
  WITH CHECK (auth.uid() = lawyer_id);

DROP POLICY IF EXISTS "lawyer_clients_owner_update" ON public.lawyer_clients;
CREATE POLICY "lawyer_clients_owner_update"
  ON public.lawyer_clients FOR UPDATE
  USING (auth.uid() = lawyer_id)
  WITH CHECK (auth.uid() = lawyer_id);

DROP POLICY IF EXISTS "lawyer_clients_owner_delete" ON public.lawyer_clients;
CREATE POLICY "lawyer_clients_owner_delete"
  ON public.lawyer_clients FOR DELETE
  USING (auth.uid() = lawyer_id);

-- ===================================================================
-- 2) EXTEND bookings: source + client_id
-- ===================================================================

-- source: backward compatible DEFAULT UNKNOWN
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'UNKNOWN'
    CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN'));

-- client_id: nullable FK a lawyer_clients (lawyer_clients ya existe arriba)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='client_id'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN client_id uuid REFERENCES public.lawyer_clients(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_lawyer_source
  ON public.bookings (lawyer_id, source);

CREATE INDEX IF NOT EXISTS idx_bookings_lawyer_client
  ON public.bookings (lawyer_id, client_id)
  WHERE client_id IS NOT NULL;

COMMENT ON COLUMN public.bookings.source IS 'FASE 1A: origen LAWYER_DIRECT (SaaS) vs LEGALUP_MARKETPLACE (marketplace) vs UNKNOWN (backfill). DEFAULT UNKNOWN para compat.';
COMMENT ON COLUMN public.bookings.client_id IS 'FASE 1A: FK opcional a lawyer_clients. Permite historial cliente sin denormalizar email.';

-- ===================================================================
-- 3) TABLE lawyer_cases
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.lawyer_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.lawyer_clients(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  quote_request_id uuid, -- sin FK estricta para no romper si service_quote_requests no existe como tabla con ese nombre exacto; validado por RLS EXISTS si existe
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  description text,
  practice_area text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','quoted','paid','in_progress','delivered','closed','cancelled')),
  source text NOT NULL DEFAULT 'UNKNOWN' CHECK (source IN ('LAWYER_DIRECT','LEGALUP_MARKETPLACE','UNKNOWN')),
  ai_workspace_id uuid REFERENCES public.ai_workspaces(id) ON DELETE SET NULL,
  price_clp numeric CHECK (price_clp IS NULL OR price_clp >= 0),
  currency text NOT NULL DEFAULT 'CLP',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lawyer_cases_single_source CHECK (
    (CASE WHEN booking_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN quote_request_id IS NOT NULL THEN 1 ELSE 0 END) <= 1
  )
);

-- updated_at
DROP TRIGGER IF EXISTS trg_lawyer_cases_updated_at ON public.lawyer_cases;
CREATE TRIGGER trg_lawyer_cases_updated_at
  BEFORE UPDATE ON public.lawyer_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices únicos parciales: un booking/quote solo un caso activo (excepto cancelled/closed si se quiere permitir reuso, pero por ahora estricto 1:1)
CREATE UNIQUE INDEX IF NOT EXISTS lawyer_cases_unique_booking
  ON public.lawyer_cases (booking_id) WHERE booking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS lawyer_cases_unique_quote
  ON public.lawyer_cases (quote_request_id) WHERE quote_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lawyer_cases_lawyer_status_created
  ON public.lawyer_cases (lawyer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lawyer_cases_lawyer_client
  ON public.lawyer_cases (lawyer_id, client_id) WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lawyer_cases_lawyer_source
  ON public.lawyer_cases (lawyer_id, source);

COMMENT ON TABLE public.lawyer_cases IS 'FASE 1A: wrapper SaaS sobre booking/quote. No es ai_workspaces. status y source CHECK. booking_id/quote_request_id mutuamente excluyentes. ai_workspace_id nullable link futuro.';

-- RLS
ALTER TABLE public.lawyer_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lawyer_cases_owner_select" ON public.lawyer_cases;
CREATE POLICY "lawyer_cases_owner_select"
  ON public.lawyer_cases FOR SELECT
  USING (auth.uid() = lawyer_id);

DROP POLICY IF EXISTS "lawyer_cases_owner_insert" ON public.lawyer_cases;
CREATE POLICY "lawyer_cases_owner_insert"
  ON public.lawyer_cases FOR INSERT
  WITH CHECK (
    auth.uid() = lawyer_id
    AND (client_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_clients WHERE id = client_id AND lawyer_id = auth.uid()))
    AND (booking_id IS NULL OR EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND lawyer_id = auth.uid()))
  );

DROP POLICY IF EXISTS "lawyer_cases_owner_update" ON public.lawyer_cases;
CREATE POLICY "lawyer_cases_owner_update"
  ON public.lawyer_cases FOR UPDATE
  USING (auth.uid() = lawyer_id)
  WITH CHECK (
    auth.uid() = lawyer_id
    AND (client_id IS NULL OR EXISTS (SELECT 1 FROM public.lawyer_clients WHERE id = client_id AND lawyer_id = auth.uid()))
    AND (booking_id IS NULL OR EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND lawyer_id = auth.uid()))
  );

DROP POLICY IF EXISTS "lawyer_cases_owner_delete" ON public.lawyer_cases;
CREATE POLICY "lawyer_cases_owner_delete"
  ON public.lawyer_cases FOR DELETE
  USING (auth.uid() = lawyer_id);

-- ===================================================================
-- 4) Intentar añadir FK para quote_request_id solo si tabla existe (no romper si no)
-- ===================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_quote_requests') THEN
    -- ¿Ya existe constraint?
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name='lawyer_cases_quote_request_id_fkey'
        AND table_name='lawyer_cases'
    ) THEN
      -- No podemos ADD CONSTRAINT IF NOT EXISTS directamente para FK con nombre, usamos ALTER
      BEGIN
        ALTER TABLE public.lawyer_cases
          ADD CONSTRAINT lawyer_cases_quote_request_id_fkey
          FOREIGN KEY (quote_request_id) REFERENCES public.service_quote_requests(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END IF;
  END IF;
END $$;

-- ===================================================================
-- 5) NOTA: lawyer_subscriptions NO se crea en Fase 1A (DEFERRED_TO_POST_PILOT)
-- 6) NOTA: appointments NO se modifica (legacy, solo documentado)
-- ===================================================================
