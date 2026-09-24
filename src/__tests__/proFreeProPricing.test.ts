import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveFreeCTA, resolveProCTA } from '@/lib/proPlanCTA';
import { setProPendingAction, takeProPendingAction, peekProPendingAction } from '@/lib/proPurchaseIntent';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('PRO.2.3 plan CTA decisions (pure, no render)', () => {
  it('Free: logged out → signup, logged in → dashboard (never checkout)', () => {
    expect(resolveFreeCTA(false)).toEqual({ type: 'signup' });
    expect(resolveFreeCTA(true)).toEqual({ type: 'dashboard' });
  });

  it('Pro: logged out → signup; active → dashboard; pending/free → checkout', () => {
    expect(resolveProCTA({ authenticated: false, hasProAccess: false })).toEqual({ type: 'signup' });
    expect(resolveProCTA({ authenticated: true, hasProAccess: true })).toEqual({ type: 'dashboard' });
    expect(resolveProCTA({ authenticated: true, hasProAccess: false })).toEqual({ type: 'checkout' });
  });
});

describe('PRO.2.3 purchase intent (single-consume session flag)', () => {
  it('set → peek → take consumes once', () => {
    expect(takeProPendingAction()).toBeNull();
    setProPendingAction('checkout');
    expect(peekProPendingAction()).toBe('checkout');
    expect(takeProPendingAction()).toBe('checkout');
    expect(takeProPendingAction()).toBeNull();
    expect(peekProPendingAction()).toBeNull();
  });
});

describe('PRO.2.3 pricing section contract (static)', () => {
  const landing = () => read('src/pages/LegalUpPro.tsx');

  it('Free/Pro two-column section with honest prices, one canonical block', () => {
    const c = landing();
    expect(c).toContain('Empieza gratis. Crece con Pro.');
    expect(c).toContain('$19.990');
    expect(c).toContain('$49.990');
    expect(c).toContain('Comenzar gratis');
    expect(c).toContain('Pasar a Pro');
    // Una sola sección de pricing (la antigua tarjeta única desapareció).
    expect(c).not.toContain('Un precio simple para empezar hoy');
    expect(c).not.toContain('Activar LegalUp Pro <ArrowRight');
  });

  it('matrix rows reflect verified gating (no invented Pro-only claims)', () => {
    const c = landing();
    for (const row of [
      'Tu primer caso',
      'Hasta 20 casos activos',
      'Crear clientes',
      'Procesar solicitudes',
      'Crear citas',
      'Servicios e ingresos',
      'IA integrada',
    ]) {
      expect(c).toContain(row);
    }
    // IA de redacción/workflow NO se anuncian como Pro (solo AI-sub).
    expect(c).not.toMatch(/redact|Redactar documento|workflow/i);
  });

  it('hero no longer competes as a giant pricing moment', () => {
    const c = landing();
    expect(c).toContain('Plan Free disponible');
    // El hero no muestra $19.990 en display gigante.
    const heroBlock = c.slice(c.indexOf('Gestiona tu práctica legal'), c.indexOf('id="producto"'));
    expect(heroBlock).not.toContain('$19.990');
  });

  it('CTAs wire to real flows + intent preservation + tracking', () => {
    const c = landing();
    expect(c).toContain('handleFreeCTA("pricing_free")');
    expect(c).toContain('handleProCTA("pricing_pro")');
    expect(c).toContain('setProPendingAction("checkout")');
    expect(c).toContain('takeProPendingAction()');
    expect(c).toContain('pro_free_cta_clicked');
    expect(c).toContain('pro_paid_cta_clicked');
    // Sin Mercado Pago directo desde el frontend: el modal/endpoint es la autoridad.
    expect(c).not.toMatch(/mercadopago\.com\/checkout|initPoint.*window\.open/i);
  });

  it('AuthModal props fixed (modal actually opens) + dashboard resumes intent', () => {
    const c = landing();
    expect(c).toContain('isOpen={authOpen}');
    expect(c).toContain('proLanding');
    expect(c).not.toMatch(/<AuthModal[\s\S]*?source="proLanding"/);
    const dash = read('src/pages/lawyer/DashboardPage.tsx');
    expect(dash).toContain('takeProPendingAction');
    expect(dash).toContain("setProPaywallOpen(true)");
  });

  it('existing subscriber states handled without duplicate purchase', () => {
    const c = landing();
    expect(c).toContain('Ir a LegalUp Pro');
    expect(c).toContain('Continuar suscripción');
    expect(c).toContain('pro.status === "pending"');
  });
});
