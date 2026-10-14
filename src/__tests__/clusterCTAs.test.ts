import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('sprint clusters: CTAs problema-específicos con destino de contratación', () => {
  it('arriendo: CTAs mid van a /abogado-arriendo, no a búsqueda genérica', () => {
    for (const f of [
      'src/pages/blog/como-desalojar-a-un-familiar-de-mi-casa-chile-2026.tsx',
      'src/pages/blog/que-pasa-si-no-tengo-contrato-de-arriendo-chile-2026.tsx',
      'src/pages/blog/no-devuelven-garantia-arriendo-chile-2026.tsx',
      'src/pages/blog/me-subieron-el-arriendo-que-hago-2026.tsx',
      'src/pages/blog/dicom-deuda-arriendo-chile-2026.tsx',
    ]) {
      const c = read(f);
      expect(c).toContain('targetUrl="/abogado-arriendo"');
    }
  });

  it('familia: popup deuda va a pension-alimentos; divorcio a hub divorcio', () => {
    expect(read('src/pages/blog/deuda-pension-alimentos-chile-2026.tsx')).toContain(
      'targetUrl="/abogado-pension-alimentos"'
    );
    const div = read('src/pages/blog/divorcio-de-mutuo-acuerdo-chile-2026.tsx');
    expect(div).toContain('targetUrl="/abogados-divorcio"');
    expect(div).toContain('Revisar mi caso de divorcio');
  });

  it('impugnación no promete especialista en landing equivocada', () => {
    const c = read('src/pages/blog/impugnacion-paternidad-chile-2026.tsx');
    expect(c).not.toContain('to="/abogado-pension-alimentos"');
  });

  it('RelatedLawyers e IPC congelados intactos', () => {
    expect(read('src/components/blog/RelatedLawyers.tsx')).toContain('related_lawyers_shown');
    expect(read('src/components/blog/IpcReviewCTA.tsx')).toContain('ipc_review_block_shown');
  });
});
