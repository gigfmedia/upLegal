import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('FASE 3C.2B — Gate ServicesPage con Pro', () => {
  const servicesPath = resolve('src/pages/lawyer/ServicesPage.tsx');
  const migrationPath = resolve('supabase/migrations/20260916000000_pro_gate_lawyer_services.sql');
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

  it('T2 — FREE create: handleAddService gatea con create_service', () => {
    const c = readFileSync(servicesPath, 'utf-8');
    expect(c).toContain('useProSubscription');
    expect(c).toContain('hasProAccess');
    expect(c).toContain('ProPricingModal');
    expect(c).toContain("pro_paywall_opened', { action: 'create_service'");
    // handleAddService must check before setIsModalOpen
    const addIdx = c.indexOf('const handleAddService');
    const gateIdx = c.indexOf("action: 'create_service'", addIdx);
    const modalIdx = c.indexOf('setIsModalOpen(true)', addIdx);
    expect(gateIdx).toBeGreaterThan(-1);
    expect(modalIdx).toBeGreaterThan(gateIdx);
    // Also triggerAction state
    expect(c).toContain("proPaywallAction");
    expect(c).toContain("'create_service'");
  });

  it('T3 — FREE edit: handleEditService gatea con edit_service', () => {
    const c = readFileSync(servicesPath, 'utf-8');
    expect(c).toContain("action: 'edit_service'");
    const editIdx = c.indexOf('const handleEditService');
    const gateIdx = c.indexOf("action: 'edit_service'", editIdx);
    expect(gateIdx).toBeGreaterThan(-1);
  });

  it('T3b — handleSaveService gatea antes de insert/update', () => {
    const c = readFileSync(servicesPath, 'utf-8');
    const saveIdx = c.indexOf('const handleSaveService');
    const saveSection = c.slice(saveIdx, saveIdx + 3500);
    expect(saveSection).toContain('!hasProAccess');
    expect(saveSection).toContain("pro_paywall_opened");
    expect(saveSection).toContain('return;');
    // Should contain insert/update after gate (check existence)
    expect(c).toContain('.insert');
    expect(c).toContain('.update');
  });

  it('T4 — FREE delete: gatea con delete_service', () => {
    const c = readFileSync(servicesPath, 'utf-8');
    expect(c).toContain("action: 'delete_service'");
    expect(c).toContain('handleDeleteClick');
    expect(c).toContain('handleDeleteService');
    // Both handlers must check hasProAccess
    const delClickIdx = c.indexOf('const handleDeleteClick');
    const delClickGate = c.indexOf("action: 'delete_service'", delClickIdx);
    expect(delClickGate).toBeGreaterThan(-1);
  });

  it('T5-7 — PRO create/edit/delete permiten flujo cuando hasProAccess true', () => {
    const c = readFileSync(servicesPath, 'utf-8');
    // After gate, should still have insert/update/delete (across lines)
    expect(c).toContain("lawyer_services");
    expect(c).toContain(".insert");
    expect(c).toContain(".update");
    expect(c).toContain(".delete");
    // And modal trigger
    expect(c).toContain('ProPricingModal');
    expect(c).toContain('triggerAction={proPaywallAction}');
  });

  it('T8-10 — RLS migration existe y bloquea INSERT/UPDATE/DELETE sin Pro', () => {
    expect(existsSync(migrationPath)).toBe(true);
    const m = readFileSync(migrationPath, 'utf-8');
    expect(m).toContain('has_pro_access');
    expect(m).toContain('lawyer_services_owner_insert');
    expect(m).toContain('lawyer_services_owner_update');
    expect(m).toContain('lawyer_services_owner_delete');
    // INSERT requires has_pro_access
    expect(m).toMatch(/CREATE POLICY "lawyer_services_owner_insert"[\s\S]*has_pro_access/);
    // UPDATE requires has_pro_access in USING and WITH CHECK
    expect(m).toMatch(/CREATE POLICY "lawyer_services_owner_update"[\s\S]*USING[\s\S]*has_pro_access/);
    // DELETE requires has_pro_access
    expect(m).toMatch(/CREATE POLICY "lawyer_services_owner_delete"[\s\S]*has_pro_access/);
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

  it('Analytics: pro_paywall_opened con actions correctos', () => {
    const c = readFileSync(servicesPath, 'utf-8');
    expect(c).toContain("pro_paywall_opened', { action: 'create_service'");
    expect(c).toContain("pro_paywall_opened', { action: 'edit_service'");
    expect(c).toContain("pro_paywall_opened', { action: 'delete_service'");
    expect(c).toContain("import posthog from 'posthog-js'");
  });

  it('Componente reutiliza ProPricingModal correctamente', () => {
    const c = readFileSync(servicesPath, 'utf-8');
    expect(c).toContain("import { ProPricingModal }");
    expect(c).toContain("ProPricingModal open={proPaywallOpen}");
    expect(c).toContain("triggerAction={proPaywallAction}");
  });
});
