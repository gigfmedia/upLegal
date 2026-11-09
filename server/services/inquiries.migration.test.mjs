// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

let db;

const SEED_ID = '11111111-1111-4111-8111-111111111111';

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

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

  `);

  await db.exec(
    readFileSync(
      new URL('../../supabase/migrations/20261108231852_service_inquiries.sql', import.meta.url),
      'utf8',
    ),
  );

  await db.exec(`
    INSERT INTO public.service_inquiries (
      id, contact_name, company_name, email, phone, service_category, description
    ) VALUES (
      '${SEED_ID}', 'Camila Rojas', 'Comercial Andes SpA', 'camila@andes.cl',
      NULL, 'contratos', 'Necesitamos revisar un contrato de servicios antes de firmarlo.'
    );
  `);
}, 30000);

afterAll(async () => {
  await db?.close();
});

async function asRole(role, run, config = {}) {
  await db.exec(`BEGIN; SET LOCAL ROLE ${role};`);
  for (const [key, value] of Object.entries(config)) {
    await db.query('SELECT set_config($1, $2, true)', [key, value]);
  }
  try {
    return await run();
  } finally {
    await db.exec('ROLLBACK');
  }
}

const validInsert = `
  INSERT INTO public.service_inquiries (
    contact_name, company_name, email, service_category, description
  ) VALUES (
    'Ana Pérez', 'Andes SpA', 'ana@andes.cl', 'cobranza',
    'Tenemos facturas impagas y necesitamos ordenar los antecedentes.'
  )
`;

describe('service_inquiries: privacidad y RLS', () => {
  it('no permite INSERT anónimo', async () => {
    await expect(asRole('anon', () => db.query(validInsert))).rejects.toMatchObject({ code: '42501' });
  });

  it('no permite INSERT desde una sesión autenticada normal', async () => {
    await expect(asRole('authenticated', () => db.query(validInsert))).rejects.toMatchObject({
      code: '42501',
    });
  });

  it('no permite SELECT anónimo', async () => {
    await expect(asRole('anon', () => db.query('SELECT * FROM public.service_inquiries'))).rejects.toMatchObject({
      code: '42501',
    });
  });

  it('oculta las solicitudes a usuarios autenticados que no son admin', async () => {
    const { rows } = await asRole('authenticated', () =>
      db.query('SELECT * FROM public.service_inquiries'),
    );
    expect(rows).toEqual([]);
  });

  it('permite SELECT a un administrador de plataforma', async () => {
    const { rows } = await asRole(
      'authenticated',
      () => db.query('SELECT id FROM public.service_inquiries'),
      { 'test.platform_admin': 'true' },
    );
    expect(rows).toEqual([{ id: SEED_ID }]);
  });

  it('permite escribir al service_role del backend', async () => {
    const { rows } = await asRole('service_role', () =>
      db.query(`${validInsert} RETURNING contact_name, origin, status`),
    );
    expect(rows).toEqual([{ contact_name: 'Ana Pérez', origin: 'services_landing', status: 'nueva' }]);
  });

  it('hace única la idempotency_key cuando está presente', async () => {
    await db.exec(`
      INSERT INTO public.service_inquiries (
        contact_name, company_name, email, service_category, description, idempotency_key
      ) VALUES (
        'Ana Pérez', 'Andes SpA', 'ana@andes.cl', 'cobranza',
        'Tenemos facturas impagas y necesitamos ordenar los antecedentes.',
        '22222222-2222-4222-8222-222222222222'
      );
    `);

    await expect(
      db.exec(`
        INSERT INTO public.service_inquiries (
          contact_name, company_name, email, service_category, description, idempotency_key
        ) VALUES (
          'Ana Pérez', 'Andes SpA', 'ana@andes.cl', 'cobranza',
          'Tenemos facturas impagas y necesitamos ordenar los antecedentes.',
          '22222222-2222-4222-8222-222222222222'
        );
      `),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('no almacena documentos ni URLs de archivos', async () => {
    const { rows } = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'service_inquiries'
    `);
    const columns = rows.map((row) => row.column_name);
    expect(columns).not.toEqual(expect.arrayContaining(['document', 'document_url', 'file', 'file_url']));
  });
});
