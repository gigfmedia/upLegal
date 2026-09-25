import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
// Solo el bloque de la tarjeta promo (handler + copy + JSX), no todo el dashboard.
const cardBlock = () => {
  const c = read('src/pages/lawyer/DashboardPage.tsx');
  const start = c.indexOf('const handleLegalUpAIClick');
  const end = c.indexOf('GoogleCalendarConnect', start);
  return c.slice(start, end);
};
const dashboard = () => read('src/pages/lawyer/DashboardPage.tsx');

describe('4.41A dashboard card: Pro has no trial (rev)', () => {
  it('badge "Nuevo" eliminado del bloque', () => {
    const c = dashboard();
    expect(c).not.toMatch(/uppercase tracking-wider">Nuevo</);
    expect(c).not.toContain('>Nuevo</span>');
  });

  it('cero copy de prueba/trial/expiración en la tarjeta', () => {
    const c = cardBlock();
    expect(c.toLowerCase()).not.toContain('prueba');
    expect(c.toLowerCase()).not.toContain('trial');
    expect(c).not.toContain('termina pronto');
    expect(c).not.toContain('no perder el acceso');
    expect(c).not.toContain('Reanudar suscripción');
    expect(c).not.toContain('Empezar prueba gratis');
    expect(c).not.toContain('Suscribirme');
  });

  it('bloque estático Pro: título + copies exactos', () => {
    const c = cardBlock();
    expect(c).toContain('LegalUp Pro');
    expect(c).toContain('Gestiona clientes, casos, citas y documentos con LegalUp AI integrado.');
    expect(c).toContain('Incluye consultas IA, análisis de documentos e investigación jurídica.');
    expect(c).toContain("'Ver LegalUp Pro'");
  });

  it('sin precio en la tarjeta', () => {
    const c = dashboard();
    expect(c).not.toContain('$49.900');
    expect(c).not.toContain('49.900');
  });

  it('CTA promo abre el flujo comercial existente (paywall modal)', () => {
    const c = dashboard();
    const handler = c.slice(c.indexOf('const handleLegalUpAIClick'), c.indexOf('let aiBadgeText'));
    expect(handler).toContain('setProPaywallOpen(true)');
    expect(handler).not.toContain('/lawyer/ai');
    expect(c).toContain('triggerAction="dashboard_get_started"');
  });

  it('solo dos estados: Pro activo navega a casos, resto ve promo (sin ramas trial)', () => {
    const c = cardBlock();
    expect(c).toContain("'Ir a mis casos'");
    expect(c).toContain("navigate('/lawyer/cases')");
    expect(c).not.toContain('isTrialPromo');
    expect(c).not.toContain('aiTrialText');
    expect(c).not.toContain('aiSub.status');
    expect(c).not.toContain('isTrialing');
    expect(c).not.toContain('(aiSub as');
  });

  it('lockup como header landing: Scale + LegalUp + pill PRO, sin Sparkles', () => {
    const c = cardBlock();
    expect(c).not.toContain('Sparkles');
    expect(c).toContain('Scale');
    expect(c).toContain('>PRO<');
    expect(c).toContain('border-emerald-500/30');
  });
  it('sin lógica legacy-AI en este bloque (hook removido si quedó sin uso)', () => {
    const c = dashboard();
    expect(c).not.toContain('hasLegacyAI');
    expect(c).not.toContain('useAISubscription');
  });
});
