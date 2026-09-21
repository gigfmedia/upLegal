import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// NOTE 4.37E: service management no longer requires Pro (UI or DB).
// The 20260916 migration below is historical evidence only; authority is
// 20260927000000_services_no_pro.sql (owner-only, no has_pro_access).

describe('FASE 3C.2B — ServicesPage sin gate Pro (4.37E)', () => {
  const servicesPath = resolve('src/pages/lawyer/ServicesPage.tsx');
  const migrationPath = resolve('supabase/migrations/20260916000000_pro_gate_lawyer_services.sql');
  const newMigrationPath = resolve('supabase/migrations/20260927000000_services_no_pro.sql');
  const serverPath = resolve('server.mjs');

  it('T1 — FREE read: ServicesPage existe y fetch SELECT no requiere Pro', () => {
    expect(existsSync(servicesPath)).toBe(true);
    const c = readFileSync(servicesPath, 'utf-8');
    expect(c).toContain("from('lawyer_services')");
    expect(c).toContain("select('*')");
    // No gate en fetchServices (useEffect)
    const fetchSection = c.split('const fetchServices')[1]?.split('}, [user, toast]')[0] || '';
    expect(fetchSection).not.toContain('hasProAccess');
    expect(fetchSection).not.toContain('pro_paywall_opened');
  });

  it('T2 — create: handleAddService abre el form sin paywall', () => {
    const c = readFileSync(servicesPath, 'utf-8');
    expect(c).not.toContain('useProSubscription');
    expect(c).not.toContain('hasProAccess');
    expect(c).not.toContain('ProPricingModal');
    expect(c).not.toContain('pro_paywall_opened');
    expect(c).not.toContain('proPaywallAction');
    const addIdx = c.indexOf('const handleAddService');
    const modalIdx = c.indexOf('setIsModalOpen(true)', addIdx);
    expect(addIdx).toBeGreaterThan(-1);
    expect(modalIdx).toBeGreaterThan(addIdx);
  });

  it('T3 — edit/save/delete: sin gates de entitlement, mutaciones intactas', () => {
    const c = readFileSync(servicesPath, 'utf-8');
    expect(c).toContain('const handleEditService');
    expect(c).toContain('const handleSaveService');
    expect(c).toContain('const handleDeleteClick');
    expect(c).toContain('const handleDeleteService');
    expect(c).toContain('.insert');
    expect(c).toContain('.update');
    expect(c).toContain('.delete');
    // Delete confirmation preserved
    expect(c).toContain('¿Eliminar servicio?');
  });

  it('T8-10 — RLS histórico exigía Pro; la autoridad vigente es owner-only', () => {
    expect(existsSync(migrationPath)).toBe(true);
    const m = readFileSync(migrationPath, 'utf-8');
    // Historical evidence unchanged (proves what was removed and where).
    expect(m).toContain('has_pro_access');
    expect(m).toContain('lawyer_services_owner_insert');
    expect(m).toContain('lawyer_services_owner_update');
    expect(m).toContain('lawyer_services_owner_delete');
    // Current authority: new migration without Pro, same ownership.
    expect(existsSync(newMigrationPath)).toBe(true);
    const n = readFileSync(newMigrationPath, 'utf-8');
    const code = n.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n');
    expect(code).not.toContain('has_pro_access');
    expect(n).toContain('lawyer_services_owner_insert');
    expect(n).toContain('lawyer_services_owner_update');
    expect(n).toContain('lawyer_services_owner_delete');
    expect(n).toContain('auth.uid()::text = lawyer_user_id::text');
  });

  it('T11 — cross-tenant: RLS usa auth.uid() = lawyer_user_id', () => {
    const m = readFileSync(migrationPath, 'utf-8');
    expect(m).toContain('auth.uid()::text = lawyer_user_id::text');
    // Original gap closure also had this, preserved
    const original = readFileSync(resolve('supabase/migrations/20260907000000_rls_gap_closure.sql'), 'utf-8');
    expect(original).toContain('lawyer_services_owner_insert');
  });

  it('T12 — SELECT gratis permanece (public true)', () => {
    const m = readFileSync(migrationPath, 'utf-8');
    // Migration should not drop/create SELECT policy, only insert/update/delete (comment mentions but not DDL)
    expect(m).not.toContain('DROP POLICY IF EXISTS "lawyer_services_public_select"');
    expect(m).not.toContain('CREATE POLICY "lawyer_services_public_select"');
    // Original SELECT policy remains true
    const orig = readFileSync(resolve('supabase/migrations/20260907000000_rls_gap_closure.sql'), 'utf-8');
    expect(orig).toContain('CREATE POLICY "lawyer_services_public_select"');
    expect(orig).toContain('USING (true)');
    // Verify ServicesPage fetch still works (no hasProAccess in SELECT)
  });

  it('T13 — Marketplace regression: /api/bookings/create no requiere Pro', () => {
    const s = readFileSync(serverPath, 'utf-8');
    expect(s).toContain("/api/bookings/create");
    // Ensure lawyer_services gate does not affect bookings
    const m = readFileSync(migrationPath, 'utf-8');
    expect(m).not.toContain('bookings');
  });

  it('T14 — Pro pricing sigue 19990', () => {
    const s = readFileSync(serverPath, 'utf-8');
    expect(s).toContain('PRO_SUBSCRIPTION_PRICE_CLP');
    expect(s).toContain('19990');
    const c = readFileSync(servicesPath, 'utf-8');
    expect(c).not.toContain('19990'); // ServicesPage no hardcodea precio
  });

  it('Sin analytics de paywall en gestión de servicios (4.37E)', () => {
    const c = readFileSync(servicesPath, 'utf-8');
    expect(c).not.toContain("pro_paywall_opened', { action: 'create_service'");
    expect(c).not.toContain("pro_paywall_opened', { action: 'edit_service'");
    expect(c).not.toContain("pro_paywall_opened', { action: 'delete_service'");
    expect(c).not.toContain("import posthog from 'posthog-js'");
  });

  it('Sin modal Pro en ServicesPage (4.37E)', () => {
    const c = readFileSync(servicesPath, 'utf-8');
    expect(c).not.toContain("import { ProPricingModal }");
    expect(c).not.toContain("ProPricingModal open={proPaywallOpen}");
    expect(c).not.toContain("triggerAction={proPaywallAction}");
  });
});
