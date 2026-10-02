import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const thisDir = dirname(fileURLToPath(import.meta.url));
const detailSrc = readFileSync(resolve(thisDir, '../pages/lawyer/CaseDetailPage.tsx'), 'utf-8');
const drawerSrc = readFileSync(resolve(thisDir, '../components/lawyer/CaseManagementDrawer.tsx'), 'utf-8');
const strip = (s: string) => s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('FASE 5.1C — header metadata (origen + monto)', () => {
  it('se muestra en la línea de contexto del header, no en cards nuevas', () => {
    const code = strip(detailSrc);
    expect(code).toMatch(/Origen: \{sourceLabels\[viewCase\.source\]/);
    expect(code).toMatch(/viewCase\.source !== 'UNKNOWN'/);
    expect(code).toMatch(/viewCase\.price_clp != null/);
    expect(code).toMatch(/toLocaleString\('es-CL'\)/);
  });
  it('drawer no duplica origen ni monto', () => {
    const code = strip(drawerSrc);
    expect(code).not.toMatch(/Origen|Monto|price_clp|sourceLabels/);
  });
  it('sin nuevas cards ni secciones en el detalle por 5.1C', () => {
    const code = strip(detailSrc);
    expect(code).not.toMatch(/<Card.*[Oo]rigen|<Card.*Monto/);
  });
});
