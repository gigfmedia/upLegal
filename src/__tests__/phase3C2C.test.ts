import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('FASE 3C.2C — Demo en LegalUp Pro dashboard', () => {
  const dashboardPath = resolve('src/pages/lawyer/DashboardPage.tsx');
  const demoPath = resolve('src/lib/demoData.ts');
  const migrationProServices = resolve('supabase/migrations/20260916000000_pro_gate_lawyer_services.sql');
  const migrationProGates = resolve('supabase/migrations/20260911000000_pro_gates.sql');

  it('T11 — demoData escribe exactamente 2 clients, 2 cases, 4 bookings', () => {
    const d = readFileSync(demoPath, 'utf-8');
    expect(d).toContain("from('lawyer_clients').insert");
    expect(d).toContain("from('lawyer_cases').insert");
    expect(d).toContain("from('bookings').insert");
    expect(d).toContain("maria.gonzalez@demo.legalup.cl");
    expect(d).toContain("pedro.soto@demo.legalup.cl");
    expect(d).toContain("source: 'LAWYER_DIRECT'");
    // No payments
    expect(d).not.toContain('payments');
    expect(d).not.toContain('payment_events');
    expect(d).not.toContain('payout');
  });

  it('T12 — no fake payments/revenue en demoData', () => {
    const d = readFileSync(demoPath, 'utf-8');
    expect(d).not.toMatch(/lawyer_amount|total_amount|price.*999/);
    expect(d).toContain('price: 0');
    expect(d).not.toContain('payments');
  });

  it('T1 — FREE empty dashboard NO muestra Cargar demo ejecutable (ahora Activar Pro)', () => {
    const c = readFileSync(dashboardPath, 'utf-8');
    // Should NOT have unconditional Cargar demo button without gate
    // New code has two branches: !hasProAccess and hasProAccess
    expect(c).toContain('!hasProAccess');
    expect(c).toContain('Empieza a organizar tu práctica con LegalUp Pro');
    // The old unconditional "Cargar demo" without hasProAccess check should be gone
    // Check that "Cargar demo" literal no longer exists (renamed to Cargar datos de ejemplo)
    expect(c).not.toContain('"Cargar demo"');
    expect(c).not.toContain("'Cargar demo'");
    expect(c).not.toContain('>Cargar demo<');
  });

  it('T2 — FREE muestra Activar LegalUp Pro', () => {
    const c = readFileSync(dashboardPath, 'utf-8');
    expect(c).toContain('Activar LegalUp Pro');
    expect(c).toContain('Gestiona clientes, casos, solicitudes y citas desde un solo lugar');
  });

  it('T3 — FREE CTA abre ProPricingModal', () => {
    const c = readFileSync(dashboardPath, 'utf-8');
    expect(c).toContain('ProPricingModal');
    expect(c).toContain('proPaywallOpen');
    expect(c).toContain('setProPaywallOpen(true)');
    expect(c).toContain('triggerAction="dashboard_get_started"');
  });

  it('T4 — analytics FREE emite pro_paywall_opened dashboard_get_started', () => {
    const c = readFileSync(dashboardPath, 'utf-8');
    expect(c).toContain("pro_paywall_opened', { action: 'dashboard_get_started'");
    expect(c).toContain("import posthog from 'posthog-js'");
  });

  it('T5 — PRO empty muestra Cargar datos de ejemplo', () => {
    const c = readFileSync(dashboardPath, 'utf-8');
    expect(c).toContain('Cargar datos de ejemplo');
    expect(c).toContain('¿Quieres ver cómo funciona con datos de ejemplo?');
    expect(c).toContain('Son datos reales de ejemplo');
    expect(c).toContain('hasProAccess &&');
    expect(c).toContain('stats.clients === 0 && stats.cases === 0 && hasProAccess');
  });

  it('T6 — PRO puede ejecutar loadDemoData', () => {
    const c = readFileSync(dashboardPath, 'utf-8');
    expect(c).toContain('loadDemoData(user.id)');
    // The PRO branch contains the loadDemoData call
    const proSectionIdx = c.indexOf('hasProAccess &&');
    const loadIdx = c.indexOf('loadDemoData(user.id)', proSectionIdx);
    expect(loadIdx).toBeGreaterThan(proSectionIdx);
  });

  it('T7 — FREE direct loadDemoData RLS sigue bloqueando (has_pro_access en 3 tablas)', () => {
    const proGates = readFileSync(migrationProGates, 'utf-8');
    expect(proGates).toContain('has_pro_access');
    expect(proGates).toContain('lawyer_clients_owner_insert');
    expect(proGates).toContain('lawyer_cases_owner_insert');
    expect(proGates).toContain('Lawyers can insert own LAWYER_DIRECT bookings');
    const servicesGate = readFileSync(migrationProServices, 'utf-8');
    expect(servicesGate).toContain('has_pro_access');
  });

  it('Source tag: demoData usa @demo.legalup.cl y LAWYER_DIRECT (documentado)', () => {
    const d = readFileSync(demoPath, 'utf-8');
    expect(d).toContain('@demo.legalup.cl');
    expect(d).toContain("source: 'LAWYER_DIRECT'");
    // clearDemoData exists
    expect(d).toContain('clearDemoData');
  });

  it('T13 — analytics demo click/success/fail', () => {
    const c = readFileSync(dashboardPath, 'utf-8');
    expect(c).toContain('pro_demo_data_clicked');
    expect(c).toContain('pro_demo_data_loaded');
    expect(c).toContain('pro_demo_data_failed');
  });

  it('No Marketplace regression: Dashboard no toca /api/bookings/create', () => {
    const c = readFileSync(dashboardPath, 'utf-8');
    expect(c).not.toContain('/api/bookings/create');
  });

  it('Pricing sigue 19990 en server', () => {
    const s = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(s).toContain('PRO_SUBSCRIPTION_PRICE_CLP');
    expect(s).toContain('19990');
  });

  it('No AI changes en esta fase', () => {
    const c = readFileSync(dashboardPath, 'utf-8');
    // Should not have changed AI entitlement logic
    expect(c).toContain('useAISubscription');
    // Should not contain new AI limits
    expect(c).not.toContain('AI_PRO_LIMITS');
  });
});
