// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const id = n => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`;
const A = id(1), B = id(2), OWNER_A = id(3), OWNER_B = id(4), MEMBER = id(5), VIEWER = id(6), ADMIN = id(7), LAWYER = id(8);
let db;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
      $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'role' $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
    CREATE TABLE companies(id uuid PRIMARY KEY, user_id uuid NOT NULL, name text);
    CREATE TABLE company_members(id uuid PRIMARY KEY, company_id uuid NOT NULL, user_id uuid NOT NULL, role text, joined_at timestamptz, created_at timestamptz DEFAULT now());
    CREATE TABLE company_requests(id uuid PRIMARY KEY, company_id uuid NOT NULL, user_id uuid, lawyer_id uuid, assigned_by uuid, status text);
    CREATE TABLE company_budgets(id uuid PRIMARY KEY, company_id uuid NOT NULL, request_id uuid, status text);
    CREATE TABLE legal_folders(id uuid PRIMARY KEY, company_id uuid NOT NULL, parent_id uuid, name text);
    CREATE TABLE legal_documents(id uuid PRIMARY KEY, company_id uuid NOT NULL, folder_id uuid, name text);
    INSERT INTO companies VALUES ('${A}', '${OWNER_A}', 'A'), ('${B}', '${OWNER_B}', 'B');
    INSERT INTO company_members(id, company_id, user_id, role, joined_at) VALUES
      ('${id(50)}', '${A}', '${MEMBER}', 'member', now()),
      ('${id(51)}', '${A}', '${VIEWER}', 'viewer', now()),
      ('${id(52)}', '${A}', '${ADMIN}', 'admin', now());
    INSERT INTO company_requests VALUES ('${id(11)}', '${A}', '${OWNER_A}', '${LAWYER}', NULL, 'nueva'), ('${id(12)}', '${B}', '${OWNER_B}', NULL, NULL, 'nueva');
    INSERT INTO company_budgets VALUES ('${id(21)}', '${A}', '${id(11)}', 'pending'), ('${id(22)}', '${B}', '${id(12)}', 'pending');
    INSERT INTO legal_folders VALUES ('${id(41)}', '${A}', NULL, 'A'), ('${id(42)}', '${B}', NULL, 'B');
    INSERT INTO legal_documents VALUES ('${id(31)}', '${A}', '${id(41)}', 'A'), ('${id(32)}', '${B}', '${id(42)}', 'B');
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    DO $$ DECLARE t text; BEGIN
      FOREACH t IN ARRAY ARRAY['companies', 'company_members', 'company_requests', 'company_budgets', 'legal_folders', 'legal_documents'] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('CREATE POLICY legacy_permissive ON %I FOR ALL USING (true) WITH CHECK (true)', t);
      END LOOP;
    END $$;
  `);
  // Execute the real migration, not a recreation or text-pattern test.
  await db.exec(readFileSync(new URL('../../supabase/migrations/20260913000000_company_authorization_authorities.sql', import.meta.url), 'utf8'));
}, 30000);
afterAll(async () => { await db?.close(); });

async function asUser(userId, run, metadata = {}, role = 'authenticated') {
  await db.exec(`BEGIN; SET LOCAL ROLE ${role};`);
  await db.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role, ...metadata })]);
  try { return await run(); } finally { await db.exec('ROLLBACK'); }
}

describe('PostgreSQL: authorization authorities remain safe with permissive legacy RLS', () => {
  it('owner can update their company', async () => {
    const { rows } = await asUser(OWNER_A, () => db.query("UPDATE companies SET name='Changed' WHERE id=$1 RETURNING id", [A]));
    expect(rows).toEqual([{ id: A }]);
  });
  it('known company B UUID cannot be updated by A', async () => {
    const { rows } = await asUser(OWNER_A, () => db.query("UPDATE companies SET name='Changed' WHERE id=$1 RETURNING id", [B]));
    expect(rows).toEqual([]);
  });
  it('owner cannot transfer company ownership from the browser', async () => {
    await expect(asUser(OWNER_A, () => db.query('UPDATE companies SET user_id=$1 WHERE id=$2', [OWNER_B, A]))).rejects.toMatchObject({ code: '42501' });
  });
  it('normal company registration under own identity still works', async () => {
    const { rows } = await asUser(OWNER_A, () => db.query('INSERT INTO companies(id,user_id) VALUES ($1,$2) RETURNING id', [id(100), OWNER_A]));
    expect(rows).toHaveLength(1);
  });
  it('cannot register a company under someone else’s identity', async () => {
    await expect(asUser(OWNER_A, () => db.query('INSERT INTO companies(id,user_id) VALUES ($1,$2)', [id(100), OWNER_B]))).rejects.toMatchObject({ code: '42501' });
  });
  it('cannot self-join company B', async () => {
    await expect(asUser(OWNER_A, () => db.query("INSERT INTO company_members(id,company_id,user_id,role,joined_at) VALUES ($1,$2,$3,'admin',now())", [id(100), B, OWNER_A]))).rejects.toMatchObject({ code: '42501' });
  });
  it('member cannot elevate their company role', async () => {
    await expect(asUser(MEMBER, () => db.query("UPDATE company_members SET role='admin' WHERE user_id=$1", [MEMBER]))).rejects.toMatchObject({ code: '42501' });
  });
  it('owner can approve their own budget; member and viewer cannot', async () => {
    for (const [userId, count] of [[OWNER_A, 1], [ADMIN, 1], [MEMBER, 0], [VIEWER, 0]]) {
      const { rows } = await asUser(userId, () => db.query("UPDATE company_budgets SET status='approved' WHERE id=$1 RETURNING id", [id(21)]));
      expect(rows).toHaveLength(count);
    }
  });
  it('A cannot read B requests despite a legacy USING(true) policy', async () => {
    const { rows } = await asUser(OWNER_A, () => db.query('SELECT * FROM company_requests WHERE id=$1', [id(12)]));
    expect(rows).toEqual([]);
  });
  it('cannot re-parent own request to a different tenant', async () => {
    await expect(asUser(OWNER_A, () => db.query('UPDATE company_requests SET company_id=$1 WHERE id=$2', [B, id(11)]))).rejects.toMatchObject({ code: '42501' });
  });
  it('cannot self-assign lawyer authority to a request', async () => {
    await expect(asUser(OWNER_A, () => db.query('UPDATE company_requests SET lawyer_id=$1 WHERE id=$2', [OWNER_A, id(11)]))).rejects.toMatchObject({ code: '42501' });
  });
  it('member can create a request with their own identity, without assignment', async () => {
    const { rows } = await asUser(MEMBER, () => db.query('INSERT INTO company_requests(id,company_id,user_id) VALUES ($1,$2,$3) RETURNING id', [id(100), A, MEMBER]));
    expect(rows).toHaveLength(1);
  });
  it('cannot create a request with a forged actor or lawyer', async () => {
    await expect(asUser(MEMBER, () => db.query('INSERT INTO company_requests(id,company_id,user_id,lawyer_id) VALUES ($1,$2,$3,$4)', [id(100), A, OWNER_A, MEMBER]))).rejects.toMatchObject({ code: '42501' });
  });
  it('assigned lawyer can see only their assigned request', async () => {
    const { rows } = await asUser(LAWYER, () => db.query('SELECT id FROM company_requests'));
    expect(rows).toEqual([{ id: id(11) }]);
  });
  it('cannot move a document to a folder in B', async () => {
    await expect(asUser(OWNER_A, () => db.query('UPDATE legal_documents SET folder_id=$1 WHERE id=$2', [id(42), id(31)]))).rejects.toMatchObject({ code: '42501' });
  });
  it('user_metadata admin does not bypass policies', async () => {
    const { rows } = await asUser(OWNER_A, () => db.query('SELECT * FROM companies WHERE id=$1', [B]), { user_metadata: { role: 'admin', is_admin: true } });
    expect(rows).toEqual([]);
  });
  it('server-managed app_metadata admin is authorized by policies', async () => {
    const { rows } = await asUser(ADMIN, () => db.query('SELECT id FROM companies WHERE id=$1', [B]), { app_metadata: { role: 'admin' } });
    expect(rows).toEqual([{ id: B }]);
  });
  it('service role can provision memberships', async () => {
    const { rows } = await asUser(ADMIN, () => db.query("INSERT INTO company_members(id,company_id,user_id,role,joined_at) VALUES ($1,$2,$3,'member',now()) RETURNING id", [id(100), B, MEMBER]), {}, 'service_role');
    expect(rows).toHaveLength(1);
  });
});
