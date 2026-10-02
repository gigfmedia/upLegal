import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'src/pages/lawyer/DashboardPage.tsx'), 'utf-8');
const strip = (s: string) => s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('FASE 5.2C — information architecture', () => {
  it('1. Today Action Center sigue visible y primero', () => {
    const code = strip(src);
    expect(code).toContain('<ActionCenter');
    expect(code.indexOf('<ActionCenter')).toBeLessThan(code.indexOf('Próximas citas'));
  });
  it('2. bloque legacy HOY eliminado', () => {
    expect(src).not.toContain('{/* HOY */}');
    expect(src).not.toContain('Solicitudes pendientes');
  });
  it('3. Requiere tu atención eliminado (vive en Sin próxima gestión)', () => {
    const code = strip(src);
    expect(code).not.toContain('Requiere tu atención');
    expect(code).not.toContain('Caso sin gestionar');
    expect(code).not.toContain('setAttention');
  });
  it('4. Resumen legacy eliminado (clientes/casos/servicios/perfil)', () => {
    const code = strip(src);
    expect(code).not.toContain('Servicios publicados');
    expect(code).not.toContain('Tu perfil');
    expect(code).not.toContain('Administrar servicios');
  });
  it('5. KPIs compactos con valores correctos y navegación', () => {
    const code = strip(src);
    for (const href of ['/lawyer/clients', '/lawyer/cases', '/lawyer/citas', '/lawyer/earnings']) {
      expect(code).toContain(href);
    }
    expect(code).toContain('stats.clients');
    expect(code).toContain('kpis.activeCases');
    expect(code).toContain('kpis.todayCount');
    expect(code).toContain('kpis.revenueMonth');
  });
  it('6. Google Calendar fuera del dashboard', () => {
    expect(strip(src)).not.toContain('GoogleCalendarConnect');
  });
  it('7. sin promo LegalUp Pro dentro del workspace', () => {
    const code = strip(src);
    expect(code).not.toContain('handleLegalUpAIClick');
    expect(code).not.toContain('aiBadgeText');
  });
  it('8. sin completeness de perfil en Inicio', () => {
    const code = strip(src);
    expect(code).not.toContain('completionPercentage');
    expect(code).not.toContain('useProfile');
  });
  it('9. citas sin estado vacío alto; 10. máximo 3', () => {
    expect(src).not.toContain('No tienes citas próximas.</p>\n                <p className="text-xs');
    expect(src).toContain('.limit(3)');
    expect(src).toContain('No tienes citas próximas.');
  });
  it('11-12. solicitudes: sin bloque en 0, aviso compacto si >0', () => {
    expect(strip(src)).toContain('kpis.pendingRequests > 0');
    expect(src).toContain('/lawyer/requests');
  });
  it('13. queries legacy eliminadas; actividad usa datos ya cargados', () => {
    const code = strip(src);
    expect(code).not.toContain('lawyer_services');
    expect(code).not.toContain('directCases');
    expect(code).not.toContain('bookingsForAttention');
    expect(code).toContain('actionCases');
    expect(code).toContain('Actividad reciente');
  });
});
