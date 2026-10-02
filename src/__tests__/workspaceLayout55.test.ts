import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');
const strip = (s: string) => s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('FASE 5.5 — shell vertical sin scroll fantasma', () => {
  it('main flex-col con min-h exacta viewport-header (footer abajo sin phantom scroll)', () => {
    const layout = strip(read('src/components/dashboard/DashboardLayout.tsx'));
    expect(layout).toContain('flex min-h-[calc(100vh-4rem)]');
    expect(layout).toContain('flex-col');
    expect(layout).toContain('className="flex-1"');
  });
  it('outlet wrapper sin min-h-screen (header fixed h-16 + pt-16 ya compensan)', () => {
    const layout = strip(read('src/components/dashboard/DashboardLayout.tsx'));
    // El root sí puede ser min-h-screen; el wrapper interno del Outlet no.
    expect(layout).toContain('min-h-screen flex flex-col');
    const mainBlock = layout.slice(layout.indexOf('<main'));
    expect(mainBlock).not.toMatch(/<div className="min-h-screen">/);
    expect(mainBlock).not.toMatch(/min-h-\[100vh\]|h-screen|100dvh/);
  });
  it('scroll owner = documento (main sin overflow propio)', () => {
    const layout = strip(read('src/components/dashboard/DashboardLayout.tsx'));
    const mainTag = layout.slice(layout.indexOf('<main'), layout.indexOf('<main') + 200);
    expect(mainTag).not.toMatch(/overflow/);
    expect(layout).not.toContain('overflow-y-scroll');
  });
  it('sidebar con altura acotada y scroll interno propio', () => {
    const layout = strip(read('src/components/dashboard/DashboardLayout.tsx'));
    expect(layout).toContain('h-[calc(100vh-4rem)]');
    expect(layout).toContain('overflow-y-auto');
  });
  it('páginas lawyer sin min-h-screen/h-screen a nivel de ruta', () => {
    const pages = [
      'src/pages/lawyer/DashboardPage.tsx',
      'src/pages/lawyer/CasesPage.tsx',
      'src/pages/lawyer/CaseDetailPage.tsx',
      'src/pages/lawyer/ClientsPage.tsx',
      'src/pages/lawyer/ClientDetailPage.tsx',
      'src/pages/lawyer/CitasPage.tsx',
      'src/pages/lawyer/QuoteRequestsPage.tsx',
      'src/pages/lawyer/PlanPage.tsx',
      'src/pages/lawyer/IntegrationsPage.tsx',
    ];
    for (const p of pages) {
      const code = strip(read(p));
      expect(code, p).not.toMatch(/min-h-screen|h-screen|\[100vh\]|100dvh/);
    }
  });
  it('drawers/modals conservan su scroll interno (casos intencionales)', () => {
    expect(strip(read('src/components/lawyer/CaseManagementDrawer.tsx'))).toContain('overflow-y-auto');
  });
  it('footer del main compacto (sin spacer fantasma)', () => {
    const layout = strip(read('src/components/dashboard/DashboardLayout.tsx'));
    expect(layout).toContain('pb-4');
    expect(layout).not.toMatch(/pb-(12|16|20|24|32)|mb-(12|16|20|24|32)/);
  });
});
