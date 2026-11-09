-- LegalUp Services — Sprint 0/1
-- Buzón privado de solicitudes provenientes de la landing /services.
--
-- Esta tabla NO almacena documentos. El formulario público solo recibe datos
-- de contacto y una descripción breve. La carga de antecedentes se incorporará
-- más adelante sobre un bucket privado con URLs firmadas.

CREATE TABLE IF NOT EXISTS public.service_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  company_name text NOT NULL,
  email text NOT NULL,
  phone text,
  service_category text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'nueva',
  origin text NOT NULL DEFAULT 'services_landing',
  privacy_accepted_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_inquiries_contact_name_check
    CHECK (char_length(btrim(contact_name)) BETWEEN 2 AND 120),
  CONSTRAINT service_inquiries_company_name_check
    CHECK (char_length(btrim(company_name)) BETWEEN 2 AND 160),
  CONSTRAINT service_inquiries_email_check
    CHECK (
      char_length(email) <= 254
      AND email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  CONSTRAINT service_inquiries_phone_check
    CHECK (phone IS NULL OR char_length(btrim(phone)) <= 40),
  CONSTRAINT service_inquiries_service_category_check
    CHECK (service_category IN ('contratos', 'cobranza', 'documentacion-laboral')),
  CONSTRAINT service_inquiries_description_check
    CHECK (char_length(btrim(description)) BETWEEN 20 AND 5000),
  CONSTRAINT service_inquiries_status_check
    CHECK (status IN ('nueva', 'en_evaluacion', 'contactada', 'convertida', 'descartada')),
  CONSTRAINT service_inquiries_origin_check
    CHECK (origin = 'services_landing')
);

COMMENT ON TABLE public.service_inquiries IS
  'Solicitudes entrantes de LegalUp Services. Dato privado: solo accesible con service_role o administradores.';
COMMENT ON COLUMN public.service_inquiries.privacy_accepted_at IS
  'Momento en que la persona aceptó la política de privacidad en el formulario.';
COMMENT ON COLUMN public.service_inquiries.idempotency_key IS
  'Evita duplicados cuando el formulario reintenta el envío.';

CREATE UNIQUE INDEX IF NOT EXISTS service_inquiries_idempotency_key_uidx
  ON public.service_inquiries (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS service_inquiries_status_created_at_idx
  ON public.service_inquiries (status, created_at DESC);

CREATE INDEX IF NOT EXISTS service_inquiries_category_created_at_idx
  ON public.service_inquiries (service_category, created_at DESC);

DROP TRIGGER IF EXISTS set_service_inquiries_updated_at ON public.service_inquiries;
CREATE TRIGGER set_service_inquiries_updated_at
  BEFORE UPDATE ON public.service_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.service_inquiries ENABLE ROW LEVEL SECURITY;

-- Sin acceso público. El backend escribe con service_role (bypassa RLS).
REVOKE ALL ON TABLE public.service_inquiries FROM anon, authenticated;
GRANT SELECT ON TABLE public.service_inquiries TO authenticated;
GRANT ALL ON TABLE public.service_inquiries TO service_role;

DROP POLICY IF EXISTS service_inquiries_admin_select ON public.service_inquiries;
CREATE POLICY service_inquiries_admin_select
  ON public.service_inquiries
  FOR SELECT
  TO authenticated
  USING (public.security_platform_admin());

-- No se crean políticas de INSERT/UPDATE/DELETE para anon ni authenticated.
