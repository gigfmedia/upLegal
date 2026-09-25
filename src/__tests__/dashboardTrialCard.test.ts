import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const dashboard = () => read('src/pages/lawyer/DashboardPage.tsx');

describe('4.41A dashboard trial card aligns with Pro positioning', () => {
  it('badge "Nuevo" eliminado del bloque AI del dashboard', () => {
    const c = dashboard();
    // El badge vivía junto al título LegalUp + pill AI; ya no existe ahí.
    expect(c).not.toMatch(/uppercase tracking-wider">Nuevo</);
    expect(c).not.toContain('>Nuevo</span>');
  });

  it('bloque trial promo: título LegalUp Pro + copies exactos', () => {
    const c = dashboard();
    expect(c).toContain('isTrialPromo');
    expect(c).toContain("'LegalUp Pro'");
    expect(c).toContain('Gestiona clientes, casos, citas y documentos con LegalUp AI integrado.');
    expect(c).toContain('Tu acceso de prueba termina pronto. Activa Pro para seguir usando todas las funciones.');
    expect(c).toContain('Incluye consultas IA, análisis de documentos e investigación jurídica.');
    expect(c).toContain("'Ver LegalUp Pro'");
  });

  it('sin precio en la tarjeta trial (se eliminó el $49.900 hardcodeado)', () => {
    const c = dashboard();
    expect(c).not.toContain('$49.900');
    expect(c).not.toContain('49.900');
    expect(c).not.toContain('Suscribirme');
  });

  it('CTA trial abre el flujo comercial existente de Pro (paywall modal)', () => {
    const c = dashboard();
    const handler = c.slice(c.indexOf('const handleLegalUpAIClick'), c.indexOf('let aiBadgeText'));
    expect(handler).toContain('isTrialPromo');
    expect(handler).toContain('setProPaywallOpen(true)');
    // El modal de pricing del dashboard sigue siendo el destino comercial.
    expect(c).toContain('triggerAction="dashboard_get_started"');
  });

  it('condición de visibilidad trial preservada (misma autoridad, sin nueva lógica)', () => {
    const c = dashboard();
    expect(c).toContain('hasLegacyAI && (aiSub as { isTrialing?: unknown }).isTrialing === true');
    expect(c).toContain("(aiSub as any).isActive");
    expect(c).toContain("aiSub.status === 'expired'");
  });

  it('otros estados conservan su copy y destino (sin regresión)', () => {
    const c = dashboard();
    expect(c).toContain("'Ir a mis casos'");
    expect(c).toContain("'Empezar prueba gratis'");
    expect(c).toContain("'Ir a LegalUp AI'");
    expect(c).toContain("'Reanudar suscripción'");
    expect(c).toContain("navigate('/lawyer/ai')");
    expect(c).toContain("navigate('/lawyer/cases')");
  });

  it('terminología: Pro como producto, IA como capacidad integrada', () => {
    const c = dashboard();
    const start = c.indexOf('isTrialPromo ? (');
    const trialBlock = c.slice(start, c.indexOf(') : (', start));
    expect(trialBlock).toContain("'LegalUp Pro'");
    expect(trialBlock).not.toMatch(/>\s*AI\s*</);
  });
});
