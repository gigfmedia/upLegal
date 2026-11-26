// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const USER = {
  ownerA: '11111111-1111-4111-8111-111111111111',
  memberA: '22222222-2222-4222-8222-222222222222',
  professional: '33333333-3333-4333-8333-333333333333',
  ownerB: '44444444-4444-4444-8444-444444444444',
  admin: '55555555-5555-4555-8555-555555555555',
};

const COMPANY_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const COMPANY_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const INQUIRY_A = 'c1111111-1111-4111-8111-111111111111';
const ORDER_A = 'a1111111-1111-4111-8111-111111111111';
const ORDER_B = 'b1111111-1111-4111-8111-111111111111';
const ORDER_C = 'c1111111-1111-4111-8111-111111111112';
const ORDER_D = 'd1111111-1111-4111-8111-111111111111';
const ASSIGNMENT_A = 'a2222222-2222-4222-8222-222222222222';
const QUOTE_A = 'a3333333-3333-4333-8333-333333333333';
const ACCEPTANCE_A = 'a4444444-4444-4444-8444-444444444444';
const PAYMENT_A = 'a5555555-5555-4555-8555-555555555555';
const INPUT_DOC = 'a6666666-6666-4666-8666-666666666666';
const DELIVERABLE_DOC = 'a7777777-7777-4777-8777-777777777777';
const ANALYSIS_A = 'a8888888-8888-4888-8888-888888888888';
const REVISION_A = 'a9999999-9999-4999-8999-999999999999';
const EVENT_CUSTOMER = 'e1111111-1111-4111-8111-111111111111';
const EVENT_INTERNAL = 'e2222222-2222-4222-8222-222222222222';
const EVENT_ADMIN = 'e3333333-3333-4333-8333-333333333333';
const RETENTION_A = 'f1111111-1111-4111-8111-111111111111';
const DELIVERED_AT = '2027-01-10T12:00:00.000Z';
const WINDOW_END = '2027-01-20T12:00:00.000Z';
const HASH = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);

let db;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('test.uid', true), '')::uuid
    $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
      SELECT COALESCE(NULLIF(current_setting('test.role', true), ''), 'authenticated')
    $$;

    CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id));
    CREATE TABLE public.companies (
      id uuid PRIMARY KEY,
      user_id uuid REFERENCES auth.users(id)
    );
    CREATE TABLE public.company_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES public.companies(id),
      user_id uuid NOT NULL REFERENCES auth.users(id),
      role text NOT NULL,
      joined_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$;

    CREATE OR REPLACE FUNCTION public.security_platform_admin()
    RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT COALESCE(current_setting('test.platform_admin', true), '') = 'true'
    $$;

    CREATE OR REPLACE FUNCTION public.security_company_role(p_company_id uuid)
    RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
      SELECT CASE
        WHEN c.user_id = auth.uid() THEN 'owner'
        ELSE (
          SELECT m.role FROM public.company_members m
          WHERE m.company_id = c.id AND m.user_id = auth.uid()
            AND m.joined_at IS NOT NULL AND m.role IN ('admin', 'member', 'viewer')
          ORDER BY m.created_at, m.id LIMIT 1
        )
      END FROM public.companies c WHERE c.id = p_company_id;
    $$;

    CREATE OR REPLACE FUNCTION public.security_company_access(
      p_company_id uuid, p_write boolean DEFAULT false
    )
    RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
      SELECT public.security_platform_admin() OR COALESCE(
        public.security_company_role(p_company_id) = ANY(
          CASE WHEN p_write THEN ARRAY['owner', 'admin', 'member']
          ELSE ARRAY['owner', 'admin', 'member', 'viewer'] END), false);
    $$;

    CREATE SCHEMA storage;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    CREATE TABLE storage.buckets (
      id text PRIMARY KEY,
      name text NOT NULL,
      public boolean NOT NULL DEFAULT false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    CREATE TABLE storage.objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id text NOT NULL,
      name text NOT NULL,
      owner uuid
    );
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
    GRANT ALL ON storage.objects TO service_role;
  `);

  for (const file of [
    '20261108231852_service_inquiries.sql',
    '20261113000000_services_b1_1_orders_rls_storage.sql',
  ]) {
    await db.exec(readFileSync(new URL(`../../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }

  await db.exec(`
    INSERT INTO auth.users (id) VALUES
      ('${USER.ownerA}'), ('${USER.memberA}'), ('${USER.professional}'),
      ('${USER.ownerB}'), ('${USER.admin}');
    INSERT INTO public.profiles (id) VALUES ('${USER.professional}');
    INSERT INTO public.companies (id, user_id) VALUES
      ('${COMPANY_A}', '${USER.ownerA}'), ('${COMPANY_B}', '${USER.ownerB}');
    INSERT INTO public.company_members (id, company_id, user_id, role, joined_at) VALUES
      ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', '${COMPANY_A}', '${USER.memberA}', 'member', now());

    INSERT INTO public.service_inquiries (
      id, contact_name, company_name, email, service_category, description
    ) VALUES (
      '${INQUIRY_A}', 'Camila Rojas', 'Comercial Andes SpA', 'camila@andes.cl',
      'contratos', 'Necesitamos revisar un contrato de servicios antes de firmarlo.'
    );

    INSERT INTO public.service_orders (
      id, inquiry_id, company_id, customer_user_id, public_ref, service_category,
      title, status, created_by
    ) VALUES
      ('${ORDER_A}', '${INQUIRY_A}', '${COMPANY_A}', '${USER.ownerA}', 'ORD-A1', 'contratos',
       'Revisión de contrato de servicios', 'created', '${USER.ownerA}'),
      ('${ORDER_B}', NULL, '${COMPANY_B}', '${USER.ownerB}', 'ORD-B1', 'cobranza',
       'Cobranza de facturas', 'created', '${USER.ownerB}'),
      ('${ORDER_C}', NULL, '${COMPANY_A}', '${USER.ownerA}', 'ORD-C1', 'documentacion-laboral',
       'Revisión de expediente laboral', 'created', '${USER.ownerA}'),
      ('${ORDER_D}', NULL, '${COMPANY_A}', '${USER.ownerA}', 'ORD-D1', 'contratos',
       'Orden sin pago confirmado', 'created', '${USER.ownerA}');

    INSERT INTO public.service_order_assignments (
      id, order_id, professional_id, role, assigned_by
    ) VALUES ('${ASSIGNMENT_A}', '${ORDER_A}', '${USER.professional}', 'lead', '${USER.admin}');

    INSERT INTO public.service_order_quotes (
      id, order_id, version, amount_clp, scope, terms_version, created_by
    ) VALUES (
      '${QUOTE_A}', '${ORDER_A}', 1, 150000,
      'Revisión integral del contrato, observaciones y versión final.',
      'terms-v1', '${USER.ownerA}'
    );
    UPDATE public.service_order_quotes
      SET status = 'sent', sent_at = now(), expires_at = now() + interval '30 days'
      WHERE id = '${QUOTE_A}';
    UPDATE public.service_orders SET status = 'quote_sent' WHERE id = '${ORDER_A}';

    INSERT INTO public.service_order_acceptances (
      id, order_id, quote_id, quote_version, quoted_amount_clp, accepted_by,
      terms_version, privacy_version, ai_processing_version,
      accepted_terms, accepted_privacy, ai_processing_authorized, acceptance_text_sha256
    ) VALUES (
      '${ACCEPTANCE_A}', '${ORDER_A}', '${QUOTE_A}', 1, 150000, '${USER.ownerA}',
      'terms-v1', 'privacy-v1', 'ai-v1', true, true, true, '${HASH}'
    );
    UPDATE public.service_order_quotes SET status = 'accepted' WHERE id = '${QUOTE_A}';

    INSERT INTO public.service_order_payments (
      id, order_id, quote_id, amount_clp, status
    ) VALUES ('${PAYMENT_A}', '${ORDER_A}', '${QUOTE_A}', 150000, 'pending');
    UPDATE public.service_orders SET status = 'awaiting_payment' WHERE id = '${ORDER_A}';
    UPDATE public.service_order_payments SET
      proof_bucket = 'service-payment-proofs',
      proof_path = 'quarantine/${COMPANY_A}/${ORDER_A}/payments/${PAYMENT_A}/proof.pdf',
      proof_original_filename = 'comprobante.pdf',
      proof_mime_type = 'application/pdf'
    WHERE id = '${PAYMENT_A}';
    UPDATE public.service_order_payments SET
      status = 'proof_submitted',
      method = 'transferencia',
      proof_path = 'clean/${COMPANY_A}/${ORDER_A}/payments/${PAYMENT_A}/proof.pdf',
      proof_size_bytes = 1024,
      proof_sha256 = '${HASH_B}',
      proof_validation_status = 'validated',
      proof_scan_status = 'clean',
      proof_uploaded_by = '${USER.ownerA}',
      proof_uploaded_at = now(),
      submitted_at = now()
    WHERE id = '${PAYMENT_A}';
    UPDATE public.service_order_payments SET
      status = 'confirmed',
      confirmed_at = now(),
      confirmed_by = '${USER.admin}'
    WHERE id = '${PAYMENT_A}';
    UPDATE public.service_orders SET status = 'awaiting_documents' WHERE id = '${ORDER_A}';

    INSERT INTO public.service_order_documents (
      id, order_id, uploaded_by, document_kind, storage_path, original_filename
    ) VALUES (
      '${INPUT_DOC}', '${ORDER_A}', '${USER.ownerA}', 'input',
      'quarantine/${COMPANY_A}/${ORDER_A}/documents/${INPUT_DOC}/contrato.pdf', 'contrato.pdf'
    );
    UPDATE public.service_order_documents SET
      storage_path = 'clean/${COMPANY_A}/${ORDER_A}/documents/${INPUT_DOC}/contrato.pdf',
      size_bytes = 2048,
      sha256 = '${HASH_C}',
      page_count = 3,
      validation_status = 'validated',
      scan_status = 'clean'
    WHERE id = '${INPUT_DOC}';

    INSERT INTO public.service_order_documents (
      id, order_id, uploaded_by, document_kind, storage_path, original_filename
    ) VALUES (
      '${DELIVERABLE_DOC}', '${ORDER_A}', '${USER.professional}', 'deliverable',
      'quarantine/${COMPANY_A}/${ORDER_A}/documents/${DELIVERABLE_DOC}/informe.pdf', 'informe.pdf'
    );
    UPDATE public.service_order_documents SET
      storage_path = 'clean/${COMPANY_A}/${ORDER_A}/documents/${DELIVERABLE_DOC}/informe.pdf',
      size_bytes = 4096,
      sha256 = '${HASH}',
      page_count = 5,
      validation_status = 'validated',
      scan_status = 'clean',
      published_at = '${DELIVERED_AT}'
    WHERE id = '${DELIVERABLE_DOC}';

    INSERT INTO public.service_order_analyses (
      id, order_id, document_id, analysis_version, status, prompt_version, schema_version
    ) VALUES (
      '${ANALYSIS_A}', '${ORDER_A}', '${INPUT_DOC}', 1, 'queued', 'prompt-v1', 'schema-v1'
    );
    UPDATE public.service_orders SET status = 'in_analysis' WHERE id = '${ORDER_A}';
    UPDATE public.service_order_analyses SET
      status = 'completed',
      result_json = '{"summary":"ok"}'::jsonb,
      evidence_json = '{"summary":"ok"}'::jsonb,
      reviewed_payload = '{"summary":"ok"}'::jsonb,
      completed_at = now(),
      review_status = 'approved',
      reviewed_by = '${USER.professional}',
      reviewed_at = now()
    WHERE id = '${ANALYSIS_A}';

    UPDATE public.service_orders SET status = 'in_review' WHERE id = '${ORDER_A}';
    UPDATE public.service_orders SET status = 'ready_for_delivery' WHERE id = '${ORDER_A}';
    UPDATE public.service_orders SET
      status = 'delivered',
      delivered_at = '${DELIVERED_AT}',
      revision_window_ends_at = '${WINDOW_END}'
    WHERE id = '${ORDER_A}';

    INSERT INTO public.service_order_revisions (
      id, order_id, round_number, status, requested_by, window_ends_at_snapshot, reason
    ) VALUES (
      '${REVISION_A}', '${ORDER_A}', 1, 'requested', '${USER.ownerA}',
      '${WINDOW_END}', 'Solicitud de ajuste sobre el documento revisado.'
    );
    UPDATE public.service_orders SET status = 'revision_requested' WHERE id = '${ORDER_A}';

    INSERT INTO public.service_order_events (
      id, order_id, event_type, audience, actor_type, actor_user_id
    ) VALUES
      ('${EVENT_CUSTOMER}', '${ORDER_A}', 'order.delivered', 'customer', 'system', NULL),
      ('${EVENT_INTERNAL}', '${ORDER_A}', 'analysis.completed', 'internal', 'professional', '${USER.professional}'),
      ('${EVENT_ADMIN}', '${ORDER_A}', 'payment.confirmed', 'admin', 'admin', '${USER.admin}');

    INSERT INTO public.service_order_retention_actions (
      id, order_id, action, legal_hold, reason, actor_user_id
    ) VALUES (
      '${RETENTION_A}', '${ORDER_A}', 'hold_set', true, 'Requerimiento legal en curso', '${USER.admin}'
    );
  `);
}, 30000);

afterAll(async () => {
  await db?.close();
});

async function asRole(role, run, user = null, platformAdmin = false) {
  await db.exec(`BEGIN; SET LOCAL ROLE ${role};`);
  await db.query('SELECT set_config($1, $2, true)', ['test.uid', user ?? '']);
  await db.query('SELECT set_config($1, $2, true)', [
    'test.platform_admin',
    platformAdmin ? 'true' : 'false',
  ]);
  await db.query('SELECT set_config($1, $2, true)', ['test.role', role]);
  try {
    return await run();
  } finally {
    await db.exec('ROLLBACK');
  }
}

async function idsAs(role, table, user, platformAdmin = false, orderBy = 'id') {
  const { rows } = await asRole(
    role,
    () => db.query(`SELECT id FROM public.${table} ORDER BY ${orderBy}`),
    user,
    platformAdmin,
  );
  return rows.map((row) => row.id);
}

describe('B1.1 storage', () => {
  it('crea ambos buckets privados con límites y MIME separados', async () => {
    const { rows } = await db.query(`
      SELECT id, public, file_size_limit, allowed_mime_types
      FROM storage.buckets ORDER BY id
    `);
    expect(rows).toEqual([
      {
        id: 'service-documents',
        public: false,
        file_size_limit: 20971520,
        allowed_mime_types: ['application/pdf'],
      },
      {
        id: 'service-payment-proofs',
        public: false,
        file_size_limit: 10485760,
        allowed_mime_types: ['application/pdf', 'image/png', 'image/jpeg'],
      },
    ]);
  });

  it('no crea policies de Storage para anon ni authenticated', async () => {
    const { rows } = await db.query(`
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
    `);
    expect(rows).toEqual([]);
  });

  it('oculta objetos de los buckets a usuarios autenticados', async () => {
    await db.exec(`
      INSERT INTO storage.objects (bucket_id, name) VALUES
        ('service-documents', 'quarantine/company/order/documents/doc/file.pdf'),
        ('service-payment-proofs', 'quarantine/company/order/payments/pay/proof.pdf');
    `);
    const authenticated = await asRole(
      'authenticated',
      () => db.query('SELECT id FROM storage.objects'),
      USER.ownerA,
    );
    expect(authenticated.rows).toEqual([]);
    const service = await asRole(
      'service_role',
      () => db.query('SELECT id FROM storage.objects'),
    );
    expect(service.rows).toHaveLength(2);
  });
});

describe('B1.1 privileges and RLS', () => {
  it('no tiene policies DELETE, INSERT ni UPDATE para clientes', async () => {
    const { rows } = await db.query(`
      SELECT tablename, cmd FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename LIKE 'service_order%'
        AND cmd IN ('DELETE', 'INSERT', 'UPDATE', 'ALL')
    `);
    expect(rows).toEqual([]);
  });

  it('deniega SELECT anónimo sobre el dominio', async () => {
    await expect(
      asRole('anon', () => db.query('SELECT id FROM public.service_orders')),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('deniega escrituras autenticadas sobre el dominio', async () => {
    await expect(
      asRole(
        'authenticated',
        () => db.exec(`
          INSERT INTO public.service_orders (
            company_id, customer_user_id, public_ref, service_category, title, created_by
          ) VALUES (
            '${COMPANY_A}', '${USER.ownerA}', 'ORD-WRITE', 'contratos', 'Intento cliente', '${USER.ownerA}'
          )
        `),
        USER.ownerA,
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('no expone columnas comerciales, de archivo ni de auditoría', async () => {
    for (const [table, column, user] of [
      ['service_orders', 'legal_hold', USER.ownerA],
      ['service_order_quotes', 'amount_clp', USER.ownerA],
      ['service_order_payments', 'proof_path', USER.ownerA],
      ['service_order_documents', 'storage_path', USER.ownerA],
      ['service_order_documents', 'sha256', USER.ownerA],
      ['service_order_analyses', 'result_json', USER.professional],
      ['service_order_events', 'metadata', USER.ownerA],
    ]) {
      await expect(
        asRole('authenticated', () => db.query(`SELECT ${column} FROM public.${table}`), user),
      ).rejects.toMatchObject({ code: '42501' });
    }
  });

  it('aísla órdenes por empresa y asignación', async () => {
    expect(await idsAs('authenticated', 'service_orders', USER.ownerA)).toEqual([
      ORDER_A, ORDER_C, ORDER_D,
    ]);
    expect(await idsAs('authenticated', 'service_orders', USER.memberA)).toEqual([
      ORDER_A, ORDER_C, ORDER_D,
    ]);
    expect(await idsAs('authenticated', 'service_orders', USER.ownerB)).toEqual([ORDER_B]);
    expect(await idsAs('authenticated', 'service_orders', USER.professional)).toEqual([ORDER_A]);
    expect(await idsAs('authenticated', 'service_orders', USER.admin, true)).toEqual([
      ORDER_A, ORDER_B, ORDER_C, ORDER_D,
    ]);
  });

  it('limita asignaciones a empresa, profesional o admin', async () => {
    expect(await idsAs('authenticated', 'service_order_assignments', USER.ownerA)).toEqual([
      ASSIGNMENT_A,
    ]);
    expect(await idsAs('authenticated', 'service_order_assignments', USER.memberA)).toEqual([
      ASSIGNMENT_A,
    ]);
    expect(await idsAs('authenticated', 'service_order_assignments', USER.professional)).toEqual([
      ASSIGNMENT_A,
    ]);
    expect(await idsAs('authenticated', 'service_order_assignments', USER.ownerB)).toEqual([]);
    expect(await idsAs('authenticated', 'service_order_assignments', USER.admin, true)).toEqual([
      ASSIGNMENT_A,
    ]);
  });

  it('reserva cotizaciones, aceptaciones y pagos a owner/admin', async () => {
    expect(await idsAs('authenticated', 'service_order_quotes', USER.ownerA)).toEqual([QUOTE_A]);
    expect(await idsAs('authenticated', 'service_order_quotes', USER.memberA)).toEqual([]);
    expect(await idsAs('authenticated', 'service_order_quotes', USER.professional)).toEqual([]);
    expect(await idsAs('authenticated', 'service_order_quotes', USER.ownerB)).toEqual([]);
    expect(await idsAs('authenticated', 'service_order_acceptances', USER.ownerA)).toEqual([
      ACCEPTANCE_A,
    ]);
    expect(await idsAs('authenticated', 'service_order_acceptances', USER.professional)).toEqual([]);
    expect(await idsAs('authenticated', 'service_order_payments', USER.ownerA)).toEqual([PAYMENT_A]);
    expect(await idsAs('authenticated', 'service_order_payments', USER.professional)).toEqual([]);
    expect(await idsAs('authenticated', 'service_order_payments', USER.admin, true)).toEqual([
      PAYMENT_A,
    ]);
  });

  it('muestra al cliente solo entregables publicados y al profesional documentos clean', async () => {
    expect(await idsAs('authenticated', 'service_order_documents', USER.ownerA)).toEqual([
      DELIVERABLE_DOC,
    ]);
    expect(await idsAs('authenticated', 'service_order_documents', USER.memberA)).toEqual([
      DELIVERABLE_DOC,
    ]);
    expect(await idsAs('authenticated', 'service_order_documents', USER.professional)).toEqual([
      INPUT_DOC, DELIVERABLE_DOC,
    ]);
    expect(await idsAs('authenticated', 'service_order_documents', USER.ownerB)).toEqual([]);
    expect(await idsAs('authenticated', 'service_order_documents', USER.admin, true)).toEqual([
      INPUT_DOC, DELIVERABLE_DOC,
    ]);
  });

  it('reserva análisis a profesional asignado o admin', async () => {
    expect(await idsAs('authenticated', 'service_order_analyses', USER.ownerA)).toEqual([]);
    expect(await idsAs('authenticated', 'service_order_analyses', USER.professional)).toEqual([
      ANALYSIS_A,
    ]);
    expect(await idsAs('authenticated', 'service_order_analyses', USER.admin, true)).toEqual([
      ANALYSIS_A,
    ]);
  });

  it('comparte revisiones con empresa, profesional asignado o admin', async () => {
    expect(await idsAs('authenticated', 'service_order_revisions', USER.ownerA)).toEqual([
      REVISION_A,
    ]);
    expect(await idsAs('authenticated', 'service_order_revisions', USER.memberA)).toEqual([
      REVISION_A,
    ]);
    expect(await idsAs('authenticated', 'service_order_revisions', USER.professional)).toEqual([
      REVISION_A,
    ]);
    expect(await idsAs('authenticated', 'service_order_revisions', USER.admin, true)).toEqual([
      REVISION_A,
    ]);
  });

  it('filtra eventos por audiencia y rol', async () => {
    expect(await idsAs('authenticated', 'service_order_events', USER.ownerA)).toEqual([
      EVENT_CUSTOMER,
    ]);
    expect(await idsAs('authenticated', 'service_order_events', USER.professional)).toEqual([
      EVENT_CUSTOMER, EVENT_INTERNAL,
    ]);
    expect(await idsAs('authenticated', 'service_order_events', USER.admin, true)).toEqual([
      EVENT_CUSTOMER, EVENT_INTERNAL, EVENT_ADMIN,
    ]);
    expect(await idsAs('authenticated', 'service_order_events', USER.ownerB)).toEqual([]);
  });

  it('reserva acciones de retención a admin', async () => {
    expect(await idsAs('authenticated', 'service_order_retention_actions', USER.ownerA)).toEqual([]);
    expect(await idsAs('authenticated', 'service_order_retention_actions', USER.professional)).toEqual([]);
    expect(await idsAs('authenticated', 'service_order_retention_actions', USER.admin, true)).toEqual([
      RETENTION_A,
    ]);
  });
});

describe('B1.1 constraints and uniqueness', () => {
  it('rechaza comprobantes sobre 10 MB', async () => {
    await expect(db.exec(`
      INSERT INTO public.service_order_payments (
        order_id, quote_id, amount_clp, status, proof_size_bytes
      ) VALUES ('${ORDER_A}', '${QUOTE_A}', 150000, 'pending', 10485761)
    `)).rejects.toMatchObject({ code: '23514' });
  });

  it('rechaza documentos sobre 20 MB', async () => {
    await expect(db.exec(`
      INSERT INTO public.service_order_documents (
        order_id, uploaded_by, document_kind, storage_path, original_filename, size_bytes
      ) VALUES (
        '${ORDER_A}', '${USER.ownerA}', 'input',
        'quarantine/${COMPANY_A}/${ORDER_A}/documents/oversize/doc.pdf', 'doc.pdf', 20971521
      )
    `)).rejects.toMatchObject({ code: '23514' });
  });

  it('exige prefijos quarantine, clean o purged', async () => {
    await expect(db.exec(`
      INSERT INTO public.service_order_documents (
        order_id, uploaded_by, document_kind, storage_path, original_filename
      ) VALUES (
        '${ORDER_A}', '${USER.ownerA}', 'input',
        'public/${COMPANY_A}/${ORDER_A}/documents/doc/doc.pdf', 'doc.pdf'
      )
    `)).rejects.toMatchObject({ code: '23514' });
  });

  it('permite una sola asignación lead activa por orden', async () => {
    await expect(db.exec(`
      INSERT INTO public.service_order_assignments (
        order_id, professional_id, role, assigned_by
      ) VALUES ('${ORDER_A}', '${USER.professional}', 'lead', '${USER.admin}')
    `)).rejects.toMatchObject({ code: '23505' });
  });

  it('permite un solo análisis current por documento', async () => {
    await expect(db.exec(`
      INSERT INTO public.service_order_analyses (
        order_id, document_id, analysis_version, is_current, status,
        prompt_version, schema_version
      ) VALUES (
        '${ORDER_A}', '${INPUT_DOC}', 2, true, 'queued', 'prompt-v1', 'schema-v1'
      )
    `)).rejects.toMatchObject({ code: '23505' });
  });
});

describe('B1.1 immutable records', () => {
  it('bloquea UPDATE y DELETE de aceptaciones', async () => {
    await expect(
      asRole('service_role', () =>
        db.exec(`UPDATE public.service_order_acceptances SET quoted_amount_clp = 1 WHERE id = '${ACCEPTANCE_A}'`),
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      asRole('service_role', () =>
        db.exec(`DELETE FROM public.service_order_acceptances WHERE id = '${ACCEPTANCE_A}'`),
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('bloquea UPDATE y DELETE de eventos', async () => {
    await expect(
      asRole('service_role', () =>
        db.exec(`UPDATE public.service_order_events SET event_type = 'changed' WHERE id = '${EVENT_CUSTOMER}'`),
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      asRole('service_role', () =>
        db.exec(`DELETE FROM public.service_order_events WHERE id = '${EVENT_CUSTOMER}'`),
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('bloquea UPDATE y DELETE de acciones de retención', async () => {
    await expect(
      asRole('service_role', () =>
        db.exec(`UPDATE public.service_order_retention_actions SET reason = 'changed' WHERE id = '${RETENTION_A}'`),
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      asRole('service_role', () =>
        db.exec(`DELETE FROM public.service_order_retention_actions WHERE id = '${RETENTION_A}'`),
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('bloquea cambios comerciales de una cotización sent', async () => {
    await expect(asRole('service_role', async () => {
      await db.exec(`
        INSERT INTO public.service_order_quotes (
          id, order_id, version, amount_clp, scope, terms_version, created_by
        ) VALUES (
          'dddddddd-dddd-4ddd-8ddd-dddddddddddd', '${ORDER_D}', 1, 90000,
          'Cotización de prueba con alcance suficientemente descriptivo.',
          'terms-v1', '${USER.ownerA}'
        )
      `);
      await db.exec(`
        UPDATE public.service_order_quotes SET
          status = 'sent', sent_at = now(), expires_at = now() + interval '30 days'
        WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      `);
      await db.exec(`
        UPDATE public.service_order_quotes SET amount_clp = 1
        WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      `);
    })).rejects.toMatchObject({ code: '23514' });
  });

  it('bloquea DELETE de registros terminales y de evidencia documental', async () => {
    for (const [table, predicate] of [
      ['service_orders', `id = '${ORDER_A}'`],
      ['service_order_quotes', `id = '${QUOTE_A}'`],
      ['service_order_payments', `id = '${PAYMENT_A}'`],
      ['service_order_documents', `id = '${INPUT_DOC}'`],
      ['service_order_analyses', `id = '${ANALYSIS_A}'`],
    ]) {
      await expect(
        asRole('service_role', () => db.exec(`DELETE FROM public.${table} WHERE ${predicate}`)),
      ).rejects.toMatchObject({ code: '23514' });
    }
  });

  it('impide mutar la identidad de una orden', async () => {
    await expect(
      asRole('service_role', () =>
        db.exec(`UPDATE public.service_orders SET company_id = '${COMPANY_B}' WHERE id = '${ORDER_A}'`),
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('protege el historial de revisiones', async () => {
    await expect(
      asRole('service_role', () =>
        db.exec(`
          INSERT INTO public.service_order_revisions (
            order_id, round_number, requested_by, window_ends_at_snapshot, reason
          ) VALUES (
            '${ORDER_D}', 1, '${USER.ownerA}', '${WINDOW_END}',
            'Intento de revisión sobre una orden no entregada.'
          )
        `),
      ),
    ).rejects.toMatchObject({ code: '23514' });

    await expect(
      asRole('service_role', () =>
        db.exec(`UPDATE public.service_order_revisions SET reason = 'Motivo modificado' WHERE id = '${REVISION_A}'`),
      ),
    ).rejects.toMatchObject({ code: '23514' });

    await expect(
      asRole('service_role', () =>
        db.exec(`DELETE FROM public.service_order_revisions WHERE id = '${REVISION_A}'`),
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('revoca TRUNCATE y bloquea truncados del dominio', async () => {
    await expect(
      asRole('service_role', () => db.exec('TRUNCATE public.service_order_payments CASCADE')),
    ).rejects.toMatchObject({ code: '42501' });

    await expect(
      db.exec('TRUNCATE public.service_order_payments CASCADE'),
    ).rejects.toMatchObject({ code: '23514' });
  });
});

describe('B1.1 database gates', () => {
  it('impide crear órdenes en estados avanzados', async () => {
    await expect(db.exec(`
      INSERT INTO public.service_orders (
        company_id, customer_user_id, public_ref, service_category, title, status, created_by
      ) VALUES (
        '${COMPANY_A}', '${USER.ownerA}', 'ORD-ACCEPTED', 'contratos',
        'Orden aceptada directa', 'accepted', '${USER.ownerA}'
      )
    `)).rejects.toMatchObject({ code: '23514' });
  });

  it('impide saltar de created a awaiting_documents', async () => {
    await expect(db.exec(`
      UPDATE public.service_orders SET status = 'awaiting_documents' WHERE id = '${ORDER_D}'
    `)).rejects.toMatchObject({ code: '23514' });
  });

  it('impide saltar de created a in_review', async () => {
    await expect(db.exec(`
      UPDATE public.service_orders SET status = 'in_review' WHERE id = '${ORDER_D}'
    `)).rejects.toMatchObject({ code: '23514' });
  });

  it('impide saltar de created a ready_for_delivery', async () => {
    await expect(db.exec(`
      UPDATE public.service_orders SET status = 'ready_for_delivery' WHERE id = '${ORDER_D}'
    `)).rejects.toMatchObject({ code: '23514' });
  });

  it('impide saltar de created a delivered', async () => {
    await expect(db.exec(`
      UPDATE public.service_orders SET
        status = 'delivered',
        delivered_at = '${DELIVERED_AT}',
        revision_window_ends_at = '${WINDOW_END}'
      WHERE id = '${ORDER_D}'
    `)).rejects.toMatchObject({ code: '23514' });
  });

  it('impide inserts directos de cotización sent, pago confirmed, documento validated y análisis approved', async () => {
    await expect(db.exec(`
      INSERT INTO public.service_order_quotes (
        order_id, version, amount_clp, scope, terms_version, status,
        sent_at, expires_at, created_by
      ) VALUES (
        '${ORDER_D}', 2, 100000,
        'Cotización directa con alcance suficientemente descriptivo.',
        'terms-v1', 'sent', now(), now() + interval '30 days', '${USER.ownerA}'
      )
    `)).rejects.toMatchObject({ code: '23514' });

    await expect(db.exec(`
      INSERT INTO public.service_order_payments (
        order_id, quote_id, amount_clp, status
      ) VALUES ('${ORDER_D}', '${QUOTE_A}', 150000, 'confirmed')
    `)).rejects.toMatchObject({ code: '23514' });

    await expect(db.exec(`
      INSERT INTO public.service_order_documents (
        order_id, uploaded_by, document_kind, storage_path, original_filename,
        size_bytes, sha256, page_count, validation_status, scan_status
      ) VALUES (
        '${ORDER_D}', '${USER.ownerA}', 'input',
        'clean/${COMPANY_A}/${ORDER_D}/documents/direct/doc.pdf', 'doc.pdf',
        1024, '${HASH}', 1, 'validated', 'clean'
      )
    `)).rejects.toMatchObject({ code: '23514' });

    await expect(db.exec(`
      INSERT INTO public.service_order_analyses (
        order_id, document_id, analysis_version, status, prompt_version, schema_version,
        review_status, reviewed_by, reviewed_at, reviewed_payload
      ) VALUES (
        '${ORDER_A}', '${INPUT_DOC}', 2, 'queued', 'prompt-v1', 'schema-v1',
        'approved', '${USER.professional}', now(), '{"summary":"ok"}'::jsonb
      )
    `)).rejects.toMatchObject({ code: '23514' });
  });
});
