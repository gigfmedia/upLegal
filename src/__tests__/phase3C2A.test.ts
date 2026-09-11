import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('FASE 3C.2A — Fix rol cliente en /pro', () => {
  const proPath = resolve('src/pages/LegalUpPro.tsx');
  const serverPath = resolve('server.mjs');

  it('T4 — client NO contiene Ir al panel como CTA funcional', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).not.toContain('Ir al panel');
  });

  it('T4 — client CTA Buscar abogado presente y navega a /search', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('Buscar abogado');
    expect(c).toContain('navigate("/search")');
    expect(c).toContain('Volver a LegalUp');
  });

  it('T1 — logged out CTA Pro disponible (Comenzar + Iniciar sesión)', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('Comenzar con LegalUp Pro');
    expect(c).toContain('Iniciar sesión');
    expect(c).toContain('!user');
    expect(c).toContain('setAuthOpen(true)');
  });

  it('T2 — lawyer FREE Activar Pro abre flujo Pro', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('Activar Pro');
    expect(c).toContain('setPricingOpen(true)');
    expect(c).toContain('userRole === "lawyer"');
  });

  it('T3 — lawyer Pro Ir al dashboard -> /lawyer/dashboard', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('Ir al dashboard');
    expect(c).toContain('navigate("/lawyer/dashboard")');
    expect(c).toContain('pro.hasProAccess');
  });

  it('T5 — client CTA NO abre ProPricingModal', () => {
    const c = readFileSync(proPath, 'utf-8');
    // handleCTAClick for client returns before setPricingOpen
    const handleSection = c.split('const handleCTAClick')[1]?.split('return (')[0] || '';
    // client branch must appear before pro_landing_cta_clicked or before setPricingOpen
    const clientIdx = handleSection.indexOf('userRole === "client"');
    const pricingIdx = handleSection.indexOf('setPricingOpen(true)');
    const excludedIdx = handleSection.indexOf('pro_landing_client_excluded');
    expect(clientIdx).toBeGreaterThan(-1);
    expect(excludedIdx).toBeGreaterThan(-1);
    // client navigate to /search must be before pricing
    expect(handleSection).toContain('navigate("/search")');
    // Ensure client branch does not call setPricingOpen
    const clientBranch = handleSection.slice(clientIdx, clientIdx + 600);
    expect(clientBranch).not.toContain('setPricingOpen');
  });

  it('T6 — analytics client emite pro_landing_client_excluded y NO pro_landing_cta_clicked en rama client', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('pro_landing_client_excluded');
    // Ensure handleCTAClick has early return for client before pro_landing_cta_clicked
    const handle = c.split('const handleCTAClick')[1]?.split('return (')[0] || '';
    const clientPos = handle.indexOf('pro_landing_client_excluded');
    const ctaPos = handle.indexOf('pro_landing_cta_clicked');
    expect(clientPos).toBeGreaterThan(-1);
    expect(ctaPos).toBeGreaterThan(-1);
    expect(clientPos).toBeLessThan(ctaPos);
    // client event props
    expect(c).toContain('role: "client"');
    expect(c).toContain('authenticated: true');
  });

  it('Header desktop/client y mobile/client usan Buscar abogado y Volver', () => {
    const c = readFileSync(proPath, 'utf-8');
    // Header checks
    expect(c).toContain('userRole === "client"');
    // Desktop and mobile both should have Buscar abogado (banner ya no duplica)
    const matches = (c.match(/Buscar abogado/g) || []).length;
    expect(matches).toBeGreaterThanOrEqual(2); // desktop + mobile
    expect(c).toContain('Volver a LegalUp');
  });

  it('Bloque visible para client: headline LegalUp Pro es para abogados', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('LegalUp Pro es para abogados');
    expect(c).toContain('Si necesitas asesoría legal');
    // Banner informativo, sin CTA duplicado — solo texto, acción en header
    expect(c).toContain('usa “Buscar abogado” en el menú superior');
  });

  it('T7 — backend POST /api/pro/subscribe bloquea client con 403 NOT_LAWYER', () => {
    const s = readFileSync(serverPath, 'utf-8');
    expect(s).toContain("/api/pro/subscribe");
    expect(s).toContain("NOT_LAWYER");
    // Check that it checks lawyer role
    expect(s).toMatch(/requireAILawyer|requireLawyer|role.*lawyer/);
  });

  it('T8 — lawyer Pro subscribe continúa funcionando (19990 + initPoint)', () => {
    const s = readFileSync(serverPath, 'utf-8');
    expect(s).toContain('PRO_SUBSCRIPTION_PRICE_CLP');
    expect(s).toContain('initPoint');
    // ProPricingModal still present
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('ProPricingModal');
    expect(c).toContain('triggerAction="pro_landing"');
  });

  it('Marketplace /search sigue sin gate Pro', () => {
    const s = readFileSync(serverPath, 'utf-8');
    expect(s).toContain("/api/bookings/create");
    // Should not require Pro for UNKNOWN
    const c = readFileSync(proPath, 'utf-8');
    // Client banner navigates to /search, not to /dashboard
    expect(c).not.toContain('navigate("/dashboard")');
  });
});
