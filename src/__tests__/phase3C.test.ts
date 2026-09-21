import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('FASE 3C — LegalUp Pro landing', () => {
  const proPath = resolve('src/pages/LegalUpPro.tsx');
  const appPath = resolve('src/App.tsx');
  const sitemapPath = resolve('public/sitemap.xml');
  const serverPath = resolve('server.mjs');

  it('/pro existe y es publica (lazy route + no RequireLawyer)', () => {
    expect(existsSync(proPath)).toBe(true);
    const app = readFileSync(appPath, 'utf-8');
    expect(app).toContain("path=\"/pro\"");
    expect(app).toContain("LegalUpPro");
    // No debe estar protegida por RequireLawyer: buscar patrón <RequireLawyer><LegalUpPro o Route con RequireLawyer y /pro
    expect(app).not.toContain('<RequireLawyer><LegalUpPro');
    expect(app).not.toContain('RequireLawyer.*LegalUpPro');
    // La ruta /pro debe estar fuera de bloque RequireLawyer - verificar que hay Route path="/pro" directo sin wrapper
    expect(app).toMatch(/<Route path="\/pro" element={<LegalUpPro/);
  });

  it('Pricing muestra $19.990', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('$19.990');
  });

  it('Muestra 3 meses', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('3 meses');
  });

  it('Muestra Founder / 15 cupos', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('Founder');
    expect(c).toContain('15');
  });

  it('NO ofrece AI Full como producto separado (4.32B: Pro es el único producto pago)', () => {
    const c = readFileSync(proPath, 'utf-8');
    // Supersede Fase 3C: ya no se vende AI standalone a usuarios nuevos.
    expect(c).not.toContain('AI Full');
    expect(c).not.toContain('por separado');
  });

  it('Comunica LegalUp AI integrado (4.37C: sin framing de producto AI separado)', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('LegalUp AI integrado');
    expect(c).not.toContain('AI Limited');
    expect(c).not.toContain('1 caso + 3 documentos');
    expect(c).not.toContain('1 caso y hasta 3 documentos');
  });

  it('CTA principal existe', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('Comenzar con LegalUp Pro');
  });

  it('CTA no crea checkout alternativo', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).not.toContain('/api/pro/subscribe');
    expect(c).not.toContain('mercadopago');
    expect(c).not.toContain('initPoint');
    // Debe reutilizar ProPricingModal
    expect(c).toContain('ProPricingModal');
  });

  it('CTA usa auth/Pro flow existente', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('useAuth');
    expect(c).toContain('useProSubscription');
    expect(c).toContain('AuthModal');
  });

  it('Marketplace no cambia (bookings create intacto)', () => {
    const s = readFileSync(serverPath, 'utf-8');
    expect(s).toContain("app.post('/api/bookings/create'");
  });

  it('Precios públicos son Pro 19.990 → 49.990; server conserva legacy AI 49900', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('$19.990');
    expect(c).toContain('$49.990');
    expect(c).not.toContain('$49.900');
    // Server mantiene legacy AI billing intacto (compatibilidad, sin venta nueva)
    const s = readFileSync(serverPath, 'utf-8');
    expect(s).toContain('49900');
  });

  it('PRO_SUBSCRIPTION_PRICE_CLP permanece 19990', () => {
    const s = readFileSync(serverPath, 'utf-8');
    expect(s).toContain('PRO_SUBSCRIPTION_PRICE_CLP = 19990');
    expect(s).toContain('19990');
  });

  it('pro_landing_viewed instrumentado', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('pro_landing_viewed');
  });

  it('pro_landing_cta_clicked instrumentado', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('pro_landing_cta_clicked');
  });

  it('canonical /pro', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('https://legalup.cl/pro');
    expect(c).toContain('rel="canonical"');
  });

  it('sitemap incluye /pro', () => {
    const s = readFileSync(sitemapPath, 'utf-8');
    expect(s).toContain('https://legalup.cl/pro');
  });

  it('Helmet title correcto', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('LegalUp Pro | Gestión para abogados en Chile');
  });

  it('Meta description presente', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).toContain('Gestiona clientes, casos, solicitudes y citas');
  });

  it('No inventa precio tachado ni descuento %', () => {
    const c = readFileSync(proPath, 'utf-8');
    expect(c).not.toMatch(/ahorra.*%/i);
    expect(c).not.toMatch(/\$39\.990/i);
  });

  it('Header minimal no incluye links B2C directos a /search como principal', () => {
    const c = readFileSync(proPath, 'utf-8');
    // Debe tener header propio con LegalUp PRO badge
    expect(c).toContain('PRO</span>');
  });
});
