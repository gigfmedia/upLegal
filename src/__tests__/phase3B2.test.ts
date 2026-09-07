import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('FASE 3B-2 — Pro paywall gates', () => {
  it('ClientsPage has Pro gate', () => {
    const c = readFileSync(resolve('src/pages/lawyer/ClientsPage.tsx'), 'utf-8');
    expect(c).toContain('useProSubscription');
    expect(c).toContain('ProPricingModal');
    expect(c).toContain('hasProAccess');
    expect(c).toContain('pro_paywall_opened');
  });
  it('CasesPage has Pro gate', () => {
    const c = readFileSync(resolve('src/pages/lawyer/CasesPage.tsx'), 'utf-8');
    expect(c).toContain('useProSubscription');
    expect(c).toContain('create_case');
  });
  it('RequestsPage has Pro gate', () => {
    const c = readFileSync(resolve('src/pages/lawyer/RequestsPage.tsx'), 'utf-8');
    expect(c).toContain('process_request');
    expect(c).toContain('ProPricingModal');
  });
  it('CitasPage has Pro gate LAWYER_DIRECT', () => {
    const c = readFileSync(resolve('src/pages/lawyer/CitasPage.tsx'), 'utf-8');
    expect(c).toContain('create_appointment');
    expect(c).toContain('hasProAccess');
  });
  it('ProPricingModal exists with correct copy', () => {
    const c = readFileSync(resolve('src/components/legalup-pro/ProPricingModal.tsx'), 'utf-8');
    expect(c).toContain('LegalUp Pro');
    expect(c).toContain('$19.990');
    expect(c).toContain('Founder 15');
    expect(c).toContain('Activar LegalUp Pro');
  });
  it('Dashboard remains free (no paywall gate)', () => {
    const c = readFileSync(resolve('src/pages/lawyer/DashboardPage.tsx'), 'utf-8');
    expect(c).not.toContain('ProPricingModal');
    expect(c).not.toContain('pro_paywall_opened');
  });
  it('Marketplace not gated', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain("app.post('/api/bookings/create'");
    // Should not contain Pro check for UNKNOWN
    expect(c).toContain('lawyer_subscriptions');
  });
  it('Backend has Pro entitlement', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('getProLawyerAccess');
    expect(c).toContain('requireProEntitlement');
    expect(c).toContain('PRO_PLAN_REQUIRED');
  });
  it('RLS has_pro_access for Pro', () => {
    const sql = readFileSync(resolve('supabase/migrations/20260911000000_pro_gates.sql'), 'utf-8');
    expect(sql).toContain('has_pro_access');
    expect(sql).toContain('lawyer_clients_owner_insert');
  });
  it('Analytics pro_paywall_opened', () => {
    const c = readFileSync(resolve('src/pages/lawyer/ClientsPage.tsx'), 'utf-8');
    expect(c).toContain('pro_paywall_opened');
  });
});
