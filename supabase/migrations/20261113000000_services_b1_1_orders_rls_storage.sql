BEGIN;

CREATE TABLE public.service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid UNIQUE REFERENCES public.service_inquiries(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  customer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  parent_order_id uuid REFERENCES public.service_orders(id) ON DELETE RESTRICT,
  order_kind text NOT NULL DEFAULT 'initial'
    CHECK (order_kind IN ('initial', 'additional_changes')),
  public_ref text NOT NULL UNIQUE,
  service_category text NOT NULL
    CHECK (service_category IN ('contratos', 'cobranza', 'documentacion-laboral')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 200),
  scope_summary text CHECK (char_length(scope_summary) <= 4000),
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN (
      'created', 'awaiting_quote', 'quote_sent', 'accepted', 'awaiting_payment',
      'awaiting_documents', 'in_analysis', 'in_review', 'ready_for_delivery',
      'delivered', 'revision_requested', 'additional_quote_required',
      'closed', 'cancelled', 'expired'
    )),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('baja', 'normal', 'alta', 'urgente')),
  first_response_at timestamptz,
  sla_due_at timestamptz,
  delivered_at timestamptz,
  closed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  revision_rounds_included integer NOT NULL DEFAULT 1
    CHECK (revision_rounds_included = 1),
  revision_window_ends_at timestamptz,
  retention_until timestamptz,
  legal_hold boolean NOT NULL DEFAULT false,
  purge_started_at timestamptz,
  purged_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_orders_parent_kind
    CHECK ((order_kind = 'initial' AND parent_order_id IS NULL)
      OR (order_kind = 'additional_changes' AND parent_order_id IS NOT NULL AND inquiry_id IS NULL)),
  CONSTRAINT service_orders_revision_window_after_delivery
    CHECK (revision_window_ends_at IS NULL OR delivered_at IS NOT NULL),
  CONSTRAINT service_orders_delivery_complete
    CHECK (status NOT IN ('delivered', 'closed')
      OR (delivered_at IS NOT NULL AND revision_window_ends_at IS NOT NULL)),
  CONSTRAINT service_orders_delivered_at_status
    CHECK (delivered_at IS NULL
      OR status IN ('in_review', 'ready_for_delivery', 'delivered', 'closed',
        'revision_requested', 'additional_quote_required', 'cancelled')),
  CONSTRAINT service_orders_purge_order
    CHECK (purged_at IS NULL OR purge_started_at IS NOT NULL),
  CONSTRAINT service_orders_purge_terminal
    CHECK (purge_started_at IS NULL
      OR status IN ('delivered', 'closed', 'cancelled', 'expired', 'additional_quote_required')),
  CONSTRAINT service_orders_hold_not_purged
    CHECK (legal_hold = false OR purged_at IS NULL),
  CONSTRAINT service_orders_closed_complete
    CHECK (status <> 'closed' OR closed_at IS NOT NULL),
  CONSTRAINT service_orders_cancelled_complete
    CHECK (status <> 'cancelled'
      OR (cancelled_at IS NOT NULL
        AND cancel_reason IS NOT NULL
        AND char_length(btrim(cancel_reason)) BETWEEN 3 AND 2000)),
  CONSTRAINT service_orders_closed_at_only
    CHECK (closed_at IS NULL OR status = 'closed'),
  CONSTRAINT service_orders_cancel_fields_only
    CHECK ((cancelled_at IS NULL AND cancel_reason IS NULL) OR status = 'cancelled')
);

CREATE INDEX service_orders_company_status
  ON public.service_orders(company_id, status, created_at DESC);

CREATE INDEX service_orders_retention_pending
  ON public.service_orders(retention_until)
  WHERE purged_at IS NULL AND legal_hold = false;

CREATE TABLE public.service_order_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('lead', 'reviewer')),
  assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  revoked_reason text
    CHECK (revoked_reason IS NULL OR char_length(btrim(revoked_reason)) BETWEEN 3 AND 2000),
  CHECK (revoked_by IS NULL OR revoked_at IS NOT NULL),
  CHECK (revoked_reason IS NULL OR revoked_at IS NOT NULL),
  CHECK (revoked_at IS NULL
    OR (revoked_by IS NOT NULL AND revoked_reason IS NOT NULL))
);

CREATE UNIQUE INDEX service_order_one_active_lead
  ON public.service_order_assignments(order_id)
  WHERE role = 'lead' AND revoked_at IS NULL;

CREATE UNIQUE INDEX service_order_one_active_assignment_per_professional
  ON public.service_order_assignments(order_id, professional_id)
  WHERE revoked_at IS NULL;

CREATE INDEX service_order_assignments_professional
  ON public.service_order_assignments(professional_id, assigned_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE public.service_order_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  amount_clp integer NOT NULL CHECK (amount_clp >= 0),
  currency text NOT NULL DEFAULT 'CLP' CHECK (currency = 'CLP'),
  scope text NOT NULL CHECK (char_length(btrim(scope)) BETWEEN 20 AND 8000),
  terms_version text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'superseded')),
  sent_at timestamptz,
  expires_at timestamptz,
  rejection_reason text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, version),
  CHECK (status <> 'sent'
    OR (sent_at IS NOT NULL AND expires_at IS NOT NULL AND expires_at > sent_at))
);

CREATE UNIQUE INDEX service_order_one_active_quote
  ON public.service_order_quotes(order_id)
  WHERE status = 'sent';

CREATE UNIQUE INDEX service_order_one_accepted_quote
  ON public.service_order_quotes(order_id)
  WHERE status = 'accepted';

CREATE TABLE public.service_order_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.service_orders(id) ON DELETE RESTRICT,
  quote_id uuid NOT NULL UNIQUE REFERENCES public.service_order_quotes(id) ON DELETE RESTRICT,
  quote_version integer NOT NULL CHECK (quote_version > 0),
  quoted_amount_clp integer NOT NULL CHECK (quoted_amount_clp >= 0),
  currency text NOT NULL DEFAULT 'CLP' CHECK (currency = 'CLP'),
  accepted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  ai_processing_version text NOT NULL,
  accepted_terms boolean NOT NULL CHECK (accepted_terms),
  accepted_privacy boolean NOT NULL CHECK (accepted_privacy),
  ai_processing_authorized boolean NOT NULL CHECK (ai_processing_authorized),
  acceptance_text_sha256 text NOT NULL
    CHECK (acceptance_text_sha256 ~ '^[a-f0-9]{64}$'),
  ip_hash text,
  user_agent_hash text
);

CREATE TABLE public.service_order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE RESTRICT,
  quote_id uuid NOT NULL REFERENCES public.service_order_quotes(id) ON DELETE RESTRICT,
  amount_clp integer NOT NULL CHECK (amount_clp >= 0),
  currency text NOT NULL DEFAULT 'CLP' CHECK (currency = 'CLP'),
  method text CHECK (method IS NULL OR method IN ('transferencia', 'deposito', 'otro')),
  reference text CHECK (reference IS NULL OR char_length(btrim(reference)) BETWEEN 1 AND 200),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'proof_submitted', 'confirmed', 'rejected')),
  proof_bucket text CHECK (proof_bucket IS NULL OR proof_bucket = 'service-payment-proofs'),
  proof_path text UNIQUE,
  proof_original_filename text,
  proof_mime_type text
    CHECK (proof_mime_type IS NULL
      OR proof_mime_type IN ('application/pdf', 'image/png', 'image/jpeg')),
  proof_size_bytes bigint
    CHECK (proof_size_bytes IS NULL OR (proof_size_bytes > 0 AND proof_size_bytes <= 10485760)),
  proof_sha256 text
    CHECK (proof_sha256 IS NULL OR proof_sha256 ~ '^[a-f0-9]{64}$'),
  proof_validation_status text
    CHECK (proof_validation_status IS NULL
      OR proof_validation_status IN ('pending', 'quarantined', 'validated', 'rejected')),
  proof_scan_status text
    CHECK (proof_scan_status IS NULL
      OR proof_scan_status IN ('pending', 'scanning', 'clean', 'infected', 'failed', 'unavailable')),
  proof_scan_provider text,
  proof_scan_result text,
  proof_scanned_at timestamptz,
  proof_uploaded_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  proof_uploaded_at timestamptz,
  proof_deleted_at timestamptz,
  proof_purged_at timestamptz,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  rejected_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'proof_submitted'
    OR (proof_path IS NOT NULL
      AND proof_uploaded_by IS NOT NULL
      AND proof_uploaded_at IS NOT NULL
      AND proof_validation_status = 'validated'
      AND proof_scan_status = 'clean'
      AND submitted_at IS NOT NULL)),
  CHECK (status <> 'confirmed'
    OR (confirmed_at IS NOT NULL
      AND confirmed_by IS NOT NULL
      AND proof_path IS NOT NULL
      AND proof_scan_status = 'clean'
      AND proof_validation_status = 'validated')),
  CHECK (status <> 'rejected'
    OR (rejected_at IS NOT NULL
      AND rejection_reason IS NOT NULL
      AND char_length(btrim(rejection_reason)) BETWEEN 3 AND 2000)),
  CHECK (proof_path IS NULL OR proof_bucket IS NOT NULL),
  CHECK (proof_validation_status <> 'validated' OR proof_scan_status = 'clean'),
  CHECK (status NOT IN ('proof_submitted', 'confirmed') OR method IS NOT NULL),
  CHECK (proof_purged_at IS NULL OR proof_deleted_at IS NOT NULL),
  CONSTRAINT service_order_payments_proof_prefix
    CHECK (proof_path IS NULL
      OR proof_path LIKE 'quarantine/%'
      OR proof_path LIKE 'clean/%')
);

CREATE UNIQUE INDEX service_order_one_open_payment
  ON public.service_order_payments(order_id)
  WHERE status IN ('pending', 'proof_submitted');

CREATE UNIQUE INDEX service_order_one_confirmed_payment
  ON public.service_order_payments(order_id)
  WHERE status = 'confirmed';

CREATE INDEX service_order_payments_order
  ON public.service_order_payments(order_id, created_at DESC);

CREATE TABLE public.service_order_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  document_kind text NOT NULL CHECK (document_kind IN ('input', 'annex', 'deliverable')),
  storage_bucket text NOT NULL DEFAULT 'service-documents'
    CHECK (storage_bucket = 'service-documents'),
  storage_path text NOT NULL UNIQUE,
  original_filename text NOT NULL CHECK (char_length(btrim(original_filename)) BETWEEN 1 AND 255),
  mime_type text NOT NULL DEFAULT 'application/pdf'
    CHECK (mime_type = 'application/pdf'),
  size_bytes bigint CHECK (size_bytes IS NULL OR (size_bytes > 0 AND size_bytes <= 20971520)),
  sha256 text CHECK (sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$'),
  page_count integer CHECK (page_count IS NULL OR page_count > 0),
  validation_status text NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'quarantined', 'validated', 'rejected')),
  validation_error text,
  scan_status text NOT NULL DEFAULT 'pending'
    CHECK (scan_status IN ('pending', 'scanning', 'clean', 'infected', 'failed', 'unavailable')),
  scan_provider text,
  scan_result text,
  scanned_at timestamptz,
  published_at timestamptz,
  deleted_at timestamptz,
  purged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (validation_status <> 'validated' OR scan_status = 'clean'),
  CHECK (validation_status <> 'validated'
    OR (size_bytes IS NOT NULL
      AND sha256 IS NOT NULL
      AND page_count IS NOT NULL
      AND page_count <= 200)),
  CHECK (document_kind = 'deliverable' OR published_at IS NULL),
  CHECK (published_at IS NULL OR (validation_status = 'validated' AND scan_status = 'clean')),
  CHECK (purged_at IS NULL OR deleted_at IS NOT NULL),
  CONSTRAINT service_order_documents_storage_prefix
    CHECK (storage_path LIKE 'quarantine/%'
      OR storage_path LIKE 'clean/%'
      OR storage_path LIKE 'purged/%')
);

CREATE INDEX service_order_documents_order
  ON public.service_order_documents(order_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX service_order_documents_unique_sha
  ON public.service_order_documents(order_id, sha256)
  WHERE deleted_at IS NULL AND validation_status <> 'rejected';

CREATE TABLE public.service_order_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.service_order_documents(id) ON DELETE CASCADE,
  analysis_version integer NOT NULL CHECK (analysis_version > 0),
  is_current boolean NOT NULL DEFAULT true,
  superseded_at timestamptz,
  superseded_by uuid REFERENCES public.service_order_analyses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'superseded')),
  provider text,
  model text,
  prompt_version text NOT NULL,
  schema_version text NOT NULL,
  input_chars integer CHECK (input_chars IS NULL OR input_chars >= 0),
  input_truncated boolean NOT NULL DEFAULT false,
  result_json jsonb,
  evidence_json jsonb,
  reviewed_payload jsonb,
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'in_review', 'approved')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  review_notes text,
  prompt_tokens integer CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  completion_tokens integer CHECK (completion_tokens IS NULL OR completion_tokens >= 0),
  estimated_cost_usd numeric(12, 6)
    CHECK (estimated_cost_usd IS NULL OR estimated_cost_usd >= 0),
  error_code text,
  error_message_sanitized text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(document_id, analysis_version),
  CHECK (status <> 'superseded' OR (is_current = false AND superseded_at IS NOT NULL)),
  CHECK (is_current OR superseded_at IS NOT NULL),
  CHECK (status <> 'completed' OR (result_json IS NOT NULL AND completed_at IS NOT NULL)),
  CHECK (status <> 'failed' OR (error_code IS NOT NULL AND completed_at IS NOT NULL)),
  CHECK (review_status <> 'approved'
    OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND reviewed_payload IS NOT NULL)),
  CHECK (review_status <> 'approved' OR status IN ('completed', 'superseded'))
);

CREATE UNIQUE INDEX service_order_one_current_analysis
  ON public.service_order_analyses(document_id)
  WHERE is_current;

CREATE INDEX service_order_analyses_order_gate
  ON public.service_order_analyses(order_id, is_current, review_status);

CREATE UNIQUE INDEX service_order_one_running_analysis
  ON public.service_order_analyses(document_id)
  WHERE status IN ('queued', 'processing');

CREATE TABLE public.service_order_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE RESTRICT,
  round_number integer NOT NULL CHECK (round_number > 0),
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'in_review', 'completed', 'declined')),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL DEFAULT now(),
  window_ends_at_snapshot timestamptz NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 2000),
  decision_reason text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, round_number),
  CHECK (status <> 'completed' OR completed_at IS NOT NULL),
  CHECK (status <> 'declined'
    OR (decision_reason IS NOT NULL
      AND char_length(btrim(decision_reason)) BETWEEN 3 AND 2000))
);

CREATE UNIQUE INDEX service_order_one_active_revision
  ON public.service_order_revisions(order_id)
  WHERE status IN ('requested', 'in_review');

CREATE TABLE public.service_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  from_state text,
  to_state text,
  audience text NOT NULL DEFAULT 'internal'
    CHECK (audience IN ('customer', 'internal', 'admin')),
  actor_type text NOT NULL
    CHECK (actor_type IN ('customer', 'professional', 'admin', 'system', 'ai')),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX service_order_events_order
  ON public.service_order_events(order_id, created_at);

CREATE TABLE public.service_order_retention_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE RESTRICT,
  document_id uuid REFERENCES public.service_order_documents(id) ON DELETE RESTRICT,
  payment_id uuid REFERENCES public.service_order_payments(id) ON DELETE RESTRICT,
  action text NOT NULL
    CHECK (action IN (
      'retention_set', 'hold_set', 'hold_released', 'purge_started', 'purged', 'purge_failed'
    )),
  from_retention_until timestamptz,
  to_retention_until timestamptz,
  legal_hold boolean NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 2000),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(document_id, payment_id) <= 1),
  CHECK (action <> 'retention_set' OR to_retention_until IS NOT NULL),
  CHECK (action <> 'hold_set' OR legal_hold = true),
  CHECK (action <> 'hold_released' OR legal_hold = false),
  CHECK (action NOT IN ('purge_started', 'purged') OR legal_hold = false)
);

CREATE INDEX service_order_retention_actions_order
  ON public.service_order_retention_actions(order_id, created_at DESC);

CREATE TRIGGER set_service_orders_updated_at
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_service_order_payments_updated_at
  BEFORE UPDATE ON public.service_order_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.service_order_events_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'service_order_events is append-only' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER service_order_events_append_only
  BEFORE UPDATE OR DELETE ON public.service_order_events
  FOR EACH ROW EXECUTE FUNCTION public.service_order_events_forbid_mutation();

CREATE OR REPLACE FUNCTION public.service_order_retention_actions_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'service_order_retention_actions is append-only' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER service_order_retention_actions_append_only
  BEFORE UPDATE OR DELETE ON public.service_order_retention_actions
  FOR EACH ROW EXECUTE FUNCTION public.service_order_retention_actions_forbid_mutation();

CREATE OR REPLACE FUNCTION public.service_order_revisions_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  target_order public.service_orders%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'service_order_revisions is append-only' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'requested' THEN
      RAISE EXCEPTION 'revisions must start requested' USING ERRCODE = '23514';
    END IF;

    SELECT * INTO target_order
    FROM public.service_orders o
    WHERE o.id = NEW.order_id;

    IF NOT FOUND
      OR target_order.status <> 'delivered'
      OR target_order.delivered_at IS NULL
      OR target_order.revision_window_ends_at IS NULL
      OR NEW.window_ends_at_snapshot IS DISTINCT FROM target_order.revision_window_ends_at
      OR now() > target_order.revision_window_ends_at THEN
      RAISE EXCEPTION 'revision requires a delivered order inside the revision window' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.order_id IS DISTINCT FROM OLD.order_id
    OR NEW.round_number IS DISTINCT FROM OLD.round_number
    OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
    OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
    OR NEW.window_ends_at_snapshot IS DISTINCT FROM OLD.window_ends_at_snapshot
    OR NEW.reason IS DISTINCT FROM OLD.reason
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'revision identity fields are immutable' USING ERRCODE = '23514';
  END IF;

  IF OLD.status IN ('completed', 'declined') THEN
    RAISE EXCEPTION 'completed or declined revisions are immutable' USING ERRCODE = '23514';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status = 'requested' AND NEW.status IN ('in_review', 'completed', 'declined'))
    OR (OLD.status = 'in_review' AND NEW.status IN ('completed', 'declined'))
  ) THEN
    RAISE EXCEPTION 'invalid revision status transition' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER service_order_revisions_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.service_order_revisions
  FOR EACH ROW EXECUTE FUNCTION public.service_order_revisions_guard();

CREATE OR REPLACE FUNCTION public.service_order_acceptances_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  accepted_quote public.service_order_quotes%ROWTYPE;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'service_order_acceptances is append-only' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO accepted_quote
  FROM public.service_order_quotes q
  WHERE q.id = NEW.quote_id AND q.order_id = NEW.order_id;

  IF NOT FOUND
    OR accepted_quote.status <> 'sent'
    OR accepted_quote.expires_at <= now()
    OR accepted_quote.version <> NEW.quote_version
    OR accepted_quote.amount_clp <> NEW.quoted_amount_clp
    OR accepted_quote.currency <> NEW.currency
    OR accepted_quote.terms_version <> NEW.terms_version THEN
    RAISE EXCEPTION 'acceptance does not match the active sent quote' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER service_order_acceptances_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.service_order_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.service_order_acceptances_guard();

CREATE OR REPLACE FUNCTION public.service_order_quotes_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('accepted', 'superseded') THEN
      RAISE EXCEPTION 'accepted or superseded quotes cannot be deleted' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'quotes must be created as draft' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('accepted', 'superseded') THEN
    RAISE EXCEPTION 'accepted or superseded quotes are immutable' USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'sent' AND (
    NEW.order_id IS DISTINCT FROM OLD.order_id
    OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.amount_clp IS DISTINCT FROM OLD.amount_clp
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.scope IS DISTINCT FROM OLD.scope
    OR NEW.terms_version IS DISTINCT FROM OLD.terms_version
    OR NEW.sent_at IS DISTINCT FROM OLD.sent_at
    OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
  ) THEN
    RAISE EXCEPTION 'sent quote commercial fields are immutable' USING ERRCODE = '23514';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status = 'draft' AND NEW.status IN ('sent', 'superseded'))
    OR (OLD.status = 'sent' AND NEW.status IN ('accepted', 'rejected', 'expired', 'superseded'))
    OR (OLD.status IN ('rejected', 'expired') AND NEW.status = 'superseded')
  ) THEN
    RAISE EXCEPTION 'invalid quote status transition' USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'accepted' AND OLD.status = 'sent' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.service_order_acceptances a
      WHERE a.order_id = NEW.order_id
        AND a.quote_id = NEW.id
        AND a.quote_version = NEW.version
        AND a.quoted_amount_clp = NEW.amount_clp
        AND a.currency = NEW.currency
        AND a.terms_version = NEW.terms_version
    ) THEN
      RAISE EXCEPTION 'accepted quote requires a matching acceptance' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER service_order_quotes_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.service_order_quotes
  FOR EACH ROW EXECUTE FUNCTION public.service_order_quotes_guard();

CREATE OR REPLACE FUNCTION public.service_order_payments_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  acceptance public.service_order_acceptances%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('confirmed', 'rejected') THEN
      RAISE EXCEPTION 'confirmed or rejected payments cannot be deleted' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'payments must be created as pending' USING ERRCODE = '23514';
    END IF;

    IF NEW.method IS NOT NULL
      OR NEW.proof_sha256 IS NOT NULL
      OR NEW.proof_size_bytes IS NOT NULL
      OR NEW.proof_uploaded_by IS NOT NULL
      OR NEW.proof_uploaded_at IS NOT NULL
      OR NEW.submitted_at IS NOT NULL
      OR NEW.confirmed_at IS NOT NULL
      OR NEW.confirmed_by IS NOT NULL
      OR NEW.rejected_at IS NOT NULL
      OR NEW.rejected_by IS NOT NULL
      OR NEW.proof_deleted_at IS NOT NULL
      OR NEW.proof_purged_at IS NOT NULL THEN
      RAISE EXCEPTION 'payments must be created without method or proof' USING ERRCODE = '23514';
    END IF;

    IF NEW.proof_validation_status IS NOT NULL
      AND NEW.proof_validation_status NOT IN ('pending', 'quarantined') THEN
      RAISE EXCEPTION 'payment proof must start pending or quarantined' USING ERRCODE = '23514';
    END IF;

    IF NEW.proof_scan_status IS NOT NULL
      AND NEW.proof_scan_status NOT IN ('pending', 'scanning') THEN
      RAISE EXCEPTION 'payment proof must start unscanned' USING ERRCODE = '23514';
    END IF;

    IF NEW.proof_path IS NOT NULL AND NEW.proof_path NOT LIKE 'quarantine/%' THEN
      RAISE EXCEPTION 'payment proof must start in quarantine' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW.order_id IS DISTINCT FROM OLD.order_id
      OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
      OR NEW.amount_clp IS DISTINCT FROM OLD.amount_clp
      OR NEW.currency IS DISTINCT FROM OLD.currency THEN
      RAISE EXCEPTION 'payment economic fields are immutable' USING ERRCODE = '23514';
    END IF;

    IF OLD.method IS NOT NULL AND NEW.method IS DISTINCT FROM OLD.method THEN
      RAISE EXCEPTION 'payment method is immutable once set' USING ERRCODE = '23514';
    END IF;

    IF OLD.status IN ('confirmed', 'rejected') THEN
      IF NEW.status IS DISTINCT FROM OLD.status
        OR NEW.method IS DISTINCT FROM OLD.method
        OR NEW.reference IS DISTINCT FROM OLD.reference
        OR NEW.proof_bucket IS DISTINCT FROM OLD.proof_bucket
        OR NEW.proof_original_filename IS DISTINCT FROM OLD.proof_original_filename
        OR NEW.proof_mime_type IS DISTINCT FROM OLD.proof_mime_type
        OR NEW.proof_size_bytes IS DISTINCT FROM OLD.proof_size_bytes
        OR NEW.proof_sha256 IS DISTINCT FROM OLD.proof_sha256
        OR NEW.proof_validation_status IS DISTINCT FROM OLD.proof_validation_status
        OR NEW.proof_scan_status IS DISTINCT FROM OLD.proof_scan_status
        OR NEW.proof_scan_provider IS DISTINCT FROM OLD.proof_scan_provider
        OR NEW.proof_scan_result IS DISTINCT FROM OLD.proof_scan_result
        OR NEW.proof_scanned_at IS DISTINCT FROM OLD.proof_scanned_at
        OR NEW.proof_uploaded_by IS DISTINCT FROM OLD.proof_uploaded_by
        OR NEW.proof_uploaded_at IS DISTINCT FROM OLD.proof_uploaded_at
        OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
        OR NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at
        OR NEW.confirmed_by IS DISTINCT FROM OLD.confirmed_by
        OR NEW.rejected_at IS DISTINCT FROM OLD.rejected_at
        OR NEW.rejected_by IS DISTINCT FROM OLD.rejected_by
        OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
        RAISE EXCEPTION 'confirmed or rejected payments are immutable' USING ERRCODE = '23514';
      END IF;

      IF NEW.proof_path IS DISTINCT FROM OLD.proof_path AND NEW.proof_path IS NOT NULL THEN
        RAISE EXCEPTION 'terminal payment proof path cannot be replaced' USING ERRCODE = '23514';
      END IF;

      IF NEW.proof_deleted_at IS DISTINCT FROM OLD.proof_deleted_at
        AND OLD.proof_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'payment proof deletion is immutable' USING ERRCODE = '23514';
      END IF;

      IF NEW.proof_purged_at IS DISTINCT FROM OLD.proof_purged_at
        AND OLD.proof_purged_at IS NOT NULL THEN
        RAISE EXCEPTION 'payment proof purge is immutable' USING ERRCODE = '23514';
      END IF;

      RETURN NEW;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (OLD.status = 'pending' AND NEW.status IN ('proof_submitted', 'rejected'))
      OR (OLD.status = 'proof_submitted' AND NEW.status IN ('confirmed', 'rejected'))
    ) THEN
      RAISE EXCEPTION 'invalid payment status transition' USING ERRCODE = '23514';
    END IF;

    IF OLD.proof_path IS NULL
      AND NEW.proof_path IS NOT NULL
      AND NEW.proof_path NOT LIKE 'quarantine/%' THEN
      RAISE EXCEPTION 'payment proof must start in quarantine' USING ERRCODE = '23514';
    END IF;

    IF OLD.proof_path IS NOT NULL
      AND NEW.proof_path IS DISTINCT FROM OLD.proof_path
      AND NOT (OLD.proof_path LIKE 'quarantine/%' AND NEW.proof_path LIKE 'clean/%') THEN
      RAISE EXCEPTION 'payment proof must move from quarantine to clean' USING ERRCODE = '23514';
    END IF;

    IF NEW.status IN ('proof_submitted', 'confirmed')
      AND NEW.proof_path NOT LIKE 'clean/%' THEN
      RAISE EXCEPTION 'submitted or confirmed payment requires a clean proof' USING ERRCODE = '23514';
    END IF;
  END IF;

  SELECT * INTO acceptance
  FROM public.service_order_acceptances a
  WHERE a.order_id = NEW.order_id AND a.quote_id = NEW.quote_id;

  IF NOT FOUND
    OR acceptance.quoted_amount_clp <> NEW.amount_clp
    OR acceptance.currency <> NEW.currency THEN
    RAISE EXCEPTION 'payment does not match the accepted quote' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER service_order_payments_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.service_order_payments
  FOR EACH ROW EXECUTE FUNCTION public.service_order_payments_guard();

CREATE OR REPLACE FUNCTION public.service_order_documents_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'service documents cannot be deleted' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.validation_status NOT IN ('pending', 'quarantined')
      OR NEW.scan_status NOT IN ('pending', 'scanning')
      OR NEW.published_at IS NOT NULL
      OR NEW.storage_path NOT LIKE 'quarantine/%' THEN
      RAISE EXCEPTION 'documents must start quarantined and unscanned' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.order_id IS DISTINCT FROM OLD.order_id
    OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by
    OR NEW.document_kind IS DISTINCT FROM OLD.document_kind
    OR NEW.original_filename IS DISTINCT FROM OLD.original_filename
    OR NEW.mime_type IS DISTINCT FROM OLD.mime_type
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'document identity fields are immutable' USING ERRCODE = '23514';
  END IF;

  IF NEW.storage_path IS DISTINCT FROM OLD.storage_path
    AND NOT (
      (OLD.storage_path LIKE 'quarantine/%' AND NEW.storage_path LIKE 'clean/%')
      OR (OLD.storage_path LIKE 'clean/%' AND NEW.storage_path = 'purged/' || NEW.id::text)
    ) THEN
    RAISE EXCEPTION 'document storage path must move from quarantine to clean or clean to purged' USING ERRCODE = '23514';
  END IF;

  IF OLD.sha256 IS NOT NULL AND NEW.sha256 IS DISTINCT FROM OLD.sha256 THEN
    RAISE EXCEPTION 'document hash is immutable once set' USING ERRCODE = '23514';
  END IF;

  IF OLD.size_bytes IS NOT NULL AND NEW.size_bytes IS DISTINCT FROM OLD.size_bytes THEN
    RAISE EXCEPTION 'document size is immutable once set' USING ERRCODE = '23514';
  END IF;

  IF OLD.page_count IS NOT NULL AND NEW.page_count IS DISTINCT FROM OLD.page_count THEN
    RAISE EXCEPTION 'document page count is immutable once set' USING ERRCODE = '23514';
  END IF;

  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'document deletion is immutable' USING ERRCODE = '23514';
  END IF;

  IF OLD.purged_at IS NOT NULL AND NEW.purged_at IS DISTINCT FROM OLD.purged_at THEN
    RAISE EXCEPTION 'document purge is immutable' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER service_order_documents_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.service_order_documents
  FOR EACH ROW EXECUTE FUNCTION public.service_order_documents_guard();

CREATE OR REPLACE FUNCTION public.service_order_analyses_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  analyzed_document public.service_order_documents%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'analyses cannot be deleted' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'queued'
      OR NEW.review_status <> 'pending' THEN
      RAISE EXCEPTION 'analyses must start queued and pending review' USING ERRCODE = '23514';
    END IF;

    SELECT * INTO analyzed_document
    FROM public.service_order_documents d
    WHERE d.id = NEW.document_id;

    IF NOT FOUND
      OR analyzed_document.order_id IS DISTINCT FROM NEW.order_id
      OR analyzed_document.document_kind NOT IN ('input', 'annex')
      OR analyzed_document.validation_status <> 'validated'
      OR analyzed_document.scan_status <> 'clean'
      OR analyzed_document.deleted_at IS NOT NULL
      OR analyzed_document.purged_at IS NOT NULL THEN
      RAISE EXCEPTION 'analysis requires a clean validated input document from the same order' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.review_status = 'approved' THEN
    IF NEW.review_status IS DISTINCT FROM OLD.review_status THEN
      RAISE EXCEPTION 'approved analysis review status is immutable' USING ERRCODE = '23514';
    END IF;

    IF (NEW.result_json IS DISTINCT FROM OLD.result_json
      OR NEW.evidence_json IS DISTINCT FROM OLD.evidence_json
      OR NEW.reviewed_payload IS DISTINCT FROM OLD.reviewed_payload)
      AND NOT (
        NEW.result_json = '{"purged":true}'::jsonb
        AND NEW.evidence_json = '{"purged":true}'::jsonb
        AND NEW.reviewed_payload = '{"purged":true}'::jsonb
      ) THEN
      RAISE EXCEPTION 'approved analysis evidence is immutable' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.review_status = 'approved' AND NEW.is_current = false THEN
    RAISE EXCEPTION 'only the current analysis can be approved' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER service_order_analyses_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.service_order_analyses
  FOR EACH ROW EXECUTE FUNCTION public.service_order_analyses_guard();

CREATE OR REPLACE FUNCTION public.service_orders_status_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'service orders cannot be deleted' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('created', 'awaiting_quote') THEN
      RAISE EXCEPTION 'orders must start created or awaiting_quote' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.company_id IS DISTINCT FROM OLD.company_id
    OR NEW.inquiry_id IS DISTINCT FROM OLD.inquiry_id
    OR NEW.customer_user_id IS DISTINCT FROM OLD.customer_user_id
    OR NEW.public_ref IS DISTINCT FROM OLD.public_ref
    OR NEW.order_kind IS DISTINCT FROM OLD.order_kind
    OR NEW.parent_order_id IS DISTINCT FROM OLD.parent_order_id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'order identity fields are immutable' USING ERRCODE = '23514';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'created' AND NEW.status IN ('awaiting_quote', 'quote_sent', 'cancelled'))
      OR (OLD.status = 'awaiting_quote' AND NEW.status IN ('quote_sent', 'cancelled'))
      OR (OLD.status = 'quote_sent' AND NEW.status IN ('accepted', 'awaiting_payment', 'expired', 'cancelled'))
      OR (OLD.status = 'accepted' AND NEW.status IN ('awaiting_payment', 'cancelled'))
      OR (OLD.status = 'awaiting_payment' AND NEW.status IN ('awaiting_documents', 'cancelled'))
      OR (OLD.status = 'awaiting_documents' AND NEW.status IN ('in_analysis', 'cancelled'))
      OR (OLD.status = 'in_analysis' AND NEW.status IN ('in_review', 'cancelled'))
      OR (OLD.status = 'in_review' AND NEW.status IN ('ready_for_delivery', 'delivered', 'cancelled'))
      OR (OLD.status = 'ready_for_delivery' AND NEW.status IN ('in_review', 'delivered', 'cancelled'))
      OR (OLD.status = 'delivered' AND NEW.status IN ('revision_requested', 'additional_quote_required', 'closed'))
      OR (OLD.status = 'revision_requested' AND NEW.status IN ('in_review', 'additional_quote_required', 'cancelled', 'closed'))
      OR (OLD.status IN ('expired', 'additional_quote_required', 'cancelled') AND NEW.status = 'closed')
    ) THEN
      RAISE EXCEPTION 'invalid service order status transition' USING ERRCODE = '23514';
    END IF;

    IF NEW.status = 'quote_sent' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.service_order_quotes q
        WHERE q.order_id = NEW.id AND q.status = 'sent'
      ) THEN
        RAISE EXCEPTION 'quote_sent requires a sent quote' USING ERRCODE = '23514';
      END IF;
    ELSIF NEW.status = 'accepted' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.service_order_acceptances a WHERE a.order_id = NEW.id
      ) THEN
        RAISE EXCEPTION 'accepted order requires an acceptance' USING ERRCODE = '23514';
      END IF;
    ELSIF NEW.status = 'awaiting_payment' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.service_order_acceptances a WHERE a.order_id = NEW.id
      ) OR NOT EXISTS (
        SELECT 1 FROM public.service_order_payments p
        WHERE p.order_id = NEW.id AND p.status = 'pending'
      ) THEN
        RAISE EXCEPTION 'awaiting_payment requires an acceptance and a pending payment' USING ERRCODE = '23514';
      END IF;
    ELSIF NEW.status = 'awaiting_documents' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.service_order_payments p
        WHERE p.order_id = NEW.id AND p.status = 'confirmed'
      ) THEN
        RAISE EXCEPTION 'awaiting_documents requires a confirmed payment' USING ERRCODE = '23514';
      END IF;
    ELSIF NEW.status = 'in_analysis' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.service_order_analyses a
        WHERE a.order_id = NEW.id AND a.status IN ('queued', 'processing', 'completed')
      ) THEN
        RAISE EXCEPTION 'in_analysis requires an analysis run' USING ERRCODE = '23514';
      END IF;
    ELSIF NEW.status = 'in_review' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.service_order_assignments a
        WHERE a.order_id = NEW.id AND a.revoked_at IS NULL
      ) THEN
        RAISE EXCEPTION 'in_review requires an active assignment' USING ERRCODE = '23514';
      END IF;
    ELSIF NEW.status = 'ready_for_delivery' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.service_order_analyses a
        WHERE a.order_id = NEW.id AND a.is_current AND a.review_status = 'approved'
      ) THEN
        RAISE EXCEPTION 'ready_for_delivery requires an approved current analysis' USING ERRCODE = '23514';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.service_order_documents d
        WHERE d.order_id = NEW.id
          AND d.document_kind IN ('input', 'annex')
          AND d.deleted_at IS NULL
          AND d.purged_at IS NULL
          AND d.validation_status = 'validated'
          AND d.scan_status = 'clean'
          AND NOT EXISTS (
            SELECT 1
            FROM public.service_order_analyses a
            WHERE a.document_id = d.id
              AND a.is_current
              AND a.review_status = 'approved'
          )
      ) THEN
        RAISE EXCEPTION 'ready_for_delivery requires all analyzable documents approved' USING ERRCODE = '23514';
      END IF;
    ELSIF NEW.status = 'delivered' THEN
      IF NEW.delivered_at IS NULL OR NEW.revision_window_ends_at IS NULL THEN
        RAISE EXCEPTION 'delivered requires delivery and revision window timestamps' USING ERRCODE = '23514';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM public.service_order_documents d
        WHERE d.order_id = NEW.id
          AND d.document_kind = 'deliverable'
          AND d.deleted_at IS NULL
          AND d.purged_at IS NULL
          AND d.validation_status = 'validated'
          AND d.scan_status = 'clean'
          AND d.published_at IS NOT DISTINCT FROM NEW.delivered_at
      ) THEN
        RAISE EXCEPTION 'delivered requires a published clean deliverable' USING ERRCODE = '23514';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF EXISTS (
        SELECT 1 FROM public.service_order_payments p
        WHERE p.order_id = NEW.id AND p.status IN ('pending', 'proof_submitted')
      ) THEN
        RAISE EXCEPTION 'cancelled order cannot have open payments' USING ERRCODE = '23514';
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.service_order_revisions r
        WHERE r.order_id = NEW.id AND r.status IN ('requested', 'in_review')
      ) THEN
        RAISE EXCEPTION 'cancelled order cannot have active revisions' USING ERRCODE = '23514';
      END IF;
    ELSIF NEW.status = 'revision_requested' THEN
      IF NEW.revision_window_ends_at IS NULL
        OR now() > NEW.revision_window_ends_at
        OR NOT EXISTS (
          SELECT 1 FROM public.service_order_revisions r
          WHERE r.order_id = NEW.id AND r.status IN ('requested', 'in_review')
        ) THEN
        RAISE EXCEPTION 'revision_requested requires an active revision inside the window' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  IF OLD.delivered_at IS NOT NULL AND NEW.delivered_at IS DISTINCT FROM OLD.delivered_at THEN
    IF NEW.delivered_at IS NULL OR NEW.delivered_at <= OLD.delivered_at THEN
      RAISE EXCEPTION 'redelivery must use a later delivered_at' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF OLD.revision_window_ends_at IS NOT NULL
    AND NEW.revision_window_ends_at IS DISTINCT FROM OLD.revision_window_ends_at THEN
    RAISE EXCEPTION 'the original revision window is immutable' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER service_orders_status_gate
  BEFORE INSERT OR UPDATE OR DELETE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.service_orders_status_gate();

CREATE OR REPLACE FUNCTION public.service_order_domain_forbid_truncate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'service_order domain tables cannot be truncated' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER service_orders_forbid_truncate
  BEFORE TRUNCATE ON public.service_orders
  FOR EACH STATEMENT EXECUTE FUNCTION public.service_order_domain_forbid_truncate();
CREATE TRIGGER service_order_assignments_forbid_truncate
  BEFORE TRUNCATE ON public.service_order_assignments
  FOR EACH STATEMENT EXECUTE FUNCTION public.service_order_domain_forbid_truncate();
CREATE TRIGGER service_order_quotes_forbid_truncate
  BEFORE TRUNCATE ON public.service_order_quotes
  FOR EACH STATEMENT EXECUTE FUNCTION public.service_order_domain_forbid_truncate();
CREATE TRIGGER service_order_acceptances_forbid_truncate
  BEFORE TRUNCATE ON public.service_order_acceptances
  FOR EACH STATEMENT EXECUTE FUNCTION public.service_order_domain_forbid_truncate();
CREATE TRIGGER service_order_payments_forbid_truncate
  BEFORE TRUNCATE ON public.service_order_payments
  FOR EACH STATEMENT EXECUTE FUNCTION public.service_order_domain_forbid_truncate();
CREATE TRIGGER service_order_documents_forbid_truncate
  BEFORE TRUNCATE ON public.service_order_documents
  FOR EACH STATEMENT EXECUTE FUNCTION public.service_order_domain_forbid_truncate();
CREATE TRIGGER service_order_analyses_forbid_truncate
  BEFORE TRUNCATE ON public.service_order_analyses
  FOR EACH STATEMENT EXECUTE FUNCTION public.service_order_domain_forbid_truncate();
CREATE TRIGGER service_order_revisions_forbid_truncate
  BEFORE TRUNCATE ON public.service_order_revisions
  FOR EACH STATEMENT EXECUTE FUNCTION public.service_order_domain_forbid_truncate();
CREATE TRIGGER service_order_events_forbid_truncate
  BEFORE TRUNCATE ON public.service_order_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.service_order_domain_forbid_truncate();
CREATE TRIGGER service_order_retention_actions_forbid_truncate
  BEFORE TRUNCATE ON public.service_order_retention_actions
  FOR EACH STATEMENT EXECUTE FUNCTION public.service_order_domain_forbid_truncate();

CREATE OR REPLACE FUNCTION public.security_service_order_assigned(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_order_assignments a
    WHERE a.order_id = p_order_id
      AND a.professional_id = auth.uid()
      AND a.revoked_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.security_service_order_assigned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.security_service_order_assigned(uuid)
  TO authenticated, service_role;

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_retention_actions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.service_orders,
  public.service_order_assignments,
  public.service_order_quotes,
  public.service_order_acceptances,
  public.service_order_payments,
  public.service_order_documents,
  public.service_order_analyses,
  public.service_order_revisions,
  public.service_order_events,
  public.service_order_retention_actions
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT (
  id, company_id, parent_order_id, order_kind, public_ref, service_category,
  title, scope_summary, status, priority, first_response_at, sla_due_at,
  delivered_at, closed_at, cancelled_at, cancel_reason, revision_rounds_included,
  revision_window_ends_at, created_at, updated_at
) ON public.service_orders TO authenticated;
GRANT SELECT (
  id, order_id, professional_id, role, assigned_at, revoked_at
) ON public.service_order_assignments TO authenticated;
GRANT SELECT (
  id, order_id, scope, status, sent_at, expires_at, created_at
) ON public.service_order_quotes TO authenticated;
GRANT SELECT (
  id, order_id, accepted_at, terms_version, privacy_version,
  ai_processing_version, accepted_terms, accepted_privacy,
  ai_processing_authorized
) ON public.service_order_acceptances TO authenticated;
GRANT SELECT (
  id, order_id, currency, method, reference, status, created_at, updated_at,
  submitted_at, confirmed_at, rejected_at, rejection_reason
) ON public.service_order_payments TO authenticated;
GRANT SELECT (
  id, order_id, document_kind, original_filename, mime_type, size_bytes,
  page_count, validation_status, scan_status, published_at, deleted_at, created_at
) ON public.service_order_documents TO authenticated;
GRANT SELECT (
  id, order_id, document_id, analysis_version, is_current, status, provider,
  model, prompt_version, schema_version, input_chars, input_truncated,
  review_status, reviewed_at, completed_at, created_at, superseded_at
) ON public.service_order_analyses TO authenticated;
GRANT SELECT (
  id, order_id, round_number, status, requested_at, window_ends_at_snapshot,
  reason, decision_reason, completed_at, created_at
) ON public.service_order_revisions TO authenticated;
GRANT SELECT (
  id, order_id, event_type, from_state, to_state, audience, actor_type, created_at
) ON public.service_order_events TO authenticated;
GRANT SELECT (
  id, order_id, action, created_at
) ON public.service_order_retention_actions TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.service_orders,
  public.service_order_assignments,
  public.service_order_quotes,
  public.service_order_acceptances,
  public.service_order_payments,
  public.service_order_documents,
  public.service_order_analyses,
  public.service_order_revisions,
  public.service_order_events,
  public.service_order_retention_actions
TO service_role;

CREATE POLICY service_orders_select ON public.service_orders
  FOR SELECT TO authenticated
  USING (
    public.security_company_access(company_id)
    OR public.security_service_order_assigned(id)
    OR public.security_platform_admin()
  );

CREATE POLICY service_order_assignments_select ON public.service_order_assignments
  FOR SELECT TO authenticated
  USING (
    public.security_platform_admin()
    OR professional_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.service_orders o
      WHERE o.id = service_order_assignments.order_id
        AND public.security_company_access(o.company_id)
    )
  );

CREATE POLICY service_order_quotes_select ON public.service_order_quotes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders o
      WHERE o.id = service_order_quotes.order_id
        AND (
          public.security_company_role(o.company_id) IN ('owner', 'admin')
          OR public.security_platform_admin()
        )
    )
  );

CREATE POLICY service_order_acceptances_select ON public.service_order_acceptances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders o
      WHERE o.id = service_order_acceptances.order_id
        AND (
          public.security_company_role(o.company_id) IN ('owner', 'admin')
          OR public.security_platform_admin()
        )
    )
  );

CREATE POLICY service_order_payments_select ON public.service_order_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders o
      WHERE o.id = service_order_payments.order_id
        AND (
          public.security_company_role(o.company_id) IN ('owner', 'admin')
          OR public.security_platform_admin()
        )
    )
  );

CREATE POLICY service_order_documents_select ON public.service_order_documents
  FOR SELECT TO authenticated
  USING (
    public.security_platform_admin()
    OR (
      service_order_documents.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.service_orders o
        WHERE o.id = service_order_documents.order_id
          AND (
            (
              service_order_documents.document_kind = 'deliverable'
              AND service_order_documents.published_at IS NOT NULL
              AND service_order_documents.published_at <= o.delivered_at
              AND public.security_company_access(o.company_id)
            )
            OR public.security_service_order_assigned(o.id)
          )
      )
    )
  );

CREATE POLICY service_order_analyses_select ON public.service_order_analyses
  FOR SELECT TO authenticated
  USING (
    public.security_platform_admin()
    OR public.security_service_order_assigned(order_id)
  );

CREATE POLICY service_order_revisions_select ON public.service_order_revisions
  FOR SELECT TO authenticated
  USING (
    public.security_platform_admin()
    OR public.security_service_order_assigned(order_id)
    OR EXISTS (
      SELECT 1 FROM public.service_orders o
      WHERE o.id = service_order_revisions.order_id
        AND public.security_company_access(o.company_id)
    )
  );

CREATE POLICY service_order_events_select ON public.service_order_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders o
      WHERE o.id = service_order_events.order_id
        AND (
          (
            service_order_events.audience = 'customer'
            AND public.security_company_access(o.company_id)
          )
          OR (
            service_order_events.audience IN ('internal', 'customer')
            AND public.security_service_order_assigned(o.id)
          )
          OR public.security_platform_admin()
        )
    )
  );

CREATE POLICY service_order_retention_actions_select ON public.service_order_retention_actions
  FOR SELECT TO authenticated
  USING (public.security_platform_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-documents',
  'service-documents',
  false,
  20971520,
  ARRAY['application/pdf']
),
(
  'service-payment-proofs',
  'service-payment-proofs',
  false,
  10485760,
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

COMMIT;
