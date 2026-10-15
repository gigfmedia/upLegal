-- FASE — primer cliente gratuito (lifetime, uno por abogado).
--
-- Regla comercial: Pro crea clientes ilimitados; sin Pro, exactamente un
-- cliente de por vida (el segundo requiere Pro). Espejo de
-- trg_claim_free_case_grant (casos): RLS conserva ownership; el trigger es
-- el punto de enforcement (atómico, sin conteos). No toca casos,
-- documentos, IA, bookings ni otras policies.
--
-- ROLLBACK MANUAL (las migraciones Supabase no tienen down automático;
-- ejecutar solo con autorización explícita):
--   DROP TRIGGER IF EXISTS trg_claim_free_client_grant ON public.lawyer_clients;
--   DROP FUNCTION IF EXISTS public.claim_free_client_grant();
--   DROP TABLE IF EXISTS public.pro_free_client_grants;
--   DROP POLICY IF EXISTS "lawyer_clients_owner_insert" ON public.lawyer_clients;
--   CREATE POLICY "lawyer_clients_owner_insert"
--     ON public.lawyer_clients FOR INSERT TO authenticated
--     WITH CHECK (auth.uid() = lawyer_id AND public.has_pro_access(auth.uid()));

BEGIN;

-- 1) Ledger: como máximo una fila por abogado (PK). client_id es auditoría
-- sin FK a propósito: borrar el cliente NO restaura el cupo (lifetime).
-- Borrado de cuenta (profiles) sí limpia vía CASCADE.
CREATE TABLE IF NOT EXISTS public.pro_free_client_grants (
  lawyer_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid NULL,
  consumed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pro_free_client_grants IS
  'Primer cliente gratuito: consumo lifetime de un cliente por abogado sin Pro. PK garantiza como máximo una fila por abogado. client_id es auditoría sin FK: borrar el cliente no restaura el cupo. Sin acceso directo de clientes.';
COMMENT ON COLUMN public.pro_free_client_grants.lawyer_id IS
  'Autoridad lifetime. Borrado de perfil cascada (cuenta eliminada); borrado de cliente no.';
COMMENT ON COLUMN public.pro_free_client_grants.client_id IS
  'Primer client_id conocido (puede ser NULL en backfill). Solo auditoría, nunca input de entitlement.';

ALTER TABLE public.pro_free_client_grants ENABLE ROW LEVEL SECURITY;
-- Sin policies: denegar todo acceso directo anon/authenticated.
-- service_role bypass RLS; SECURITY DEFINER bypass (trigger).
REVOKE ALL ON TABLE public.pro_free_client_grants FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.pro_free_client_grants TO service_role;

-- 2) Backfill: abogados que YA tienen clientes consumieron su cupo
-- (era ilimitado pre-gate y Pro). Se registra el más antiguo como
-- referencia de auditoría. Sin esto, un gratuito con clientes heredados
-- obtendría uno extra. Pro con filas no se ve afectado: el trigger los
-- exime igual (el grant queda como historial para un futuro downgrade:
-- con N clientes heredados, el siguiente exige Pro).
INSERT INTO public.pro_free_client_grants AS g (lawyer_id, client_id)
SELECT DISTINCT ON (lawyer_id) lawyer_id, id
FROM public.lawyer_clients ORDER BY lawyer_id, created_at ASC, id ASC
ON CONFLICT (lawyer_id) DO NOTHING;

-- 3) Claim trigger (punto de enforcement) --------------------------------
CREATE OR REPLACE FUNCTION public.claim_free_client_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- El llamante debe ser dueño de la identidad destino. Los paths de
  -- servidor corren con auth.uid() NULL (service_role) y omiten este
  -- chequeo; quedan auditados por caller.
  IF auth.uid() IS NOT NULL AND NEW.lawyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cross-tenant client creation denied. [FREE_CLIENT_CROSS_TENANT]'
      USING ERRCODE = 'P0001';
  END IF;

  -- Pro nunca necesita el grant, pero se registra igual (historial): un
  -- ex-Pro con N clientes sigue bloqueado al bajar (tiene fila con otro id).
  -- Atomicidad: la PK serializa INSERTs concurrentes; el perdedor bloquea en
  -- el índice único, ve la fila del ganador y es rechazado. Rollback de la
  -- inserción revierte el claim (misma transacción).
  INSERT INTO public.pro_free_client_grants AS g (lawyer_id, client_id)
    VALUES (NEW.lawyer_id, NEW.id)
    ON CONFLICT (lawyer_id) DO NOTHING;

  IF NOT public.has_pro_access(NEW.lawyer_id)
     AND EXISTS (
       SELECT 1 FROM public.pro_free_client_grants AS g
       WHERE g.lawyer_id = NEW.lawyer_id
         AND g.client_id IS DISTINCT FROM NEW.id
     ) THEN
    RAISE EXCEPTION
      'LegalUp Pro required: free client allowance already consumed. [FREE_CLIENT_ALLOWANCE_CONSUMED]'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.claim_free_client_grant() IS
  'Punto único de enforcement del primer cliente gratuito. BEFORE trigger; claim+insert atómicos con rollback seguro. RLS conserva ownership (igual que casos).';

REVOKE ALL ON FUNCTION public.claim_free_client_grant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_claim_free_client_grant ON public.lawyer_clients;
CREATE TRIGGER trg_claim_free_client_grant
  BEFORE INSERT ON public.lawyer_clients
  FOR EACH ROW EXECUTE FUNCTION public.claim_free_client_grant();

-- 4) RLS: ownership se queda aquí; el entitlement vive en el trigger ------
-- (espejo de lawyer_cases_owner_insert: sin has_pro_access en la policy).
DROP POLICY IF EXISTS "lawyer_clients_owner_insert" ON public.lawyer_clients;
CREATE POLICY "lawyer_clients_owner_insert"
ON public.lawyer_clients FOR INSERT TO authenticated
WITH CHECK (auth.uid() = lawyer_id);

COMMENT ON POLICY "lawyer_clients_owner_insert" ON public.lawyer_clients IS
  'Ownership; el cupo (Pro ilimitado / primer cliente gratuito lifetime) lo impone trg_claim_free_client_grant.';

COMMIT;
