import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const dashboard = () => read('src/pages/lawyer/DashboardPage.tsx');

// 4.41A (superseded por 5.2C/5.2D): la tarjeta promo salió del dashboard.
// El estado del plan vive en /lawyer/plan. Este archivo conserva la
// garantía original —cero copy trial/promo en Inicio— como ausencia.
describe('4.41A dashboard card: Pro has no trial (rev) → sin tarjeta en Inicio', () => {
  it('sin tarjeta promo ni copy trial en el dashboard', () => {
    const c = dashboard();
    expect(c).not.toContain('handleLegalUpAIClick');
    expect(c).not.toContain('aiBadgeText');
    expect(c).not.toContain('Empezar prueba gratis');
    expect(c).not.toContain('Suscribirme');
    expect(c).not.toContain('Reanudar suscripción');
    expect(c).not.toContain('$49.900');
    expect(c).not.toContain('49.900');
  });

  it('el CTA comercial vive en /lawyer/plan con el modal existente', () => {
    const p = read('src/pages/lawyer/PlanPage.tsx');
    expect(p).toContain('ProPricingModal');
    expect(p).toContain('Ver LegalUp Pro');
  });
});
