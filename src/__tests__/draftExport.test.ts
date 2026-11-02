// @vitest-environment node
// UA-4 Fase 3 — exportación: la hoja impresa conserva tamaño carta y los
// cuatro márgenes configurados, sin depender del stack visual del editor.
import { describe, it, expect } from 'vitest';
import { buildDraftPrintHtml } from '@/components/legalup-ai/draftExport';

describe('UA-4 Fase 3 exportación', () => {
  it('fija tamaño carta y los márgenes configurados en centímetros', () => {
    const html = buildDraftPrintHtml({
      title: 'Contestación',
      html: '<p>Contenido del borrador</p>',
      marginsCm: { top: 3, right: 2.5, bottom: 4, left: 1.5 },
    });
    expect(html).toContain('@page { size: Letter; margin: 3cm 2.5cm 4cm 1.5cm; }');
    expect(html).toContain('<p>Contenido del borrador</p>');
    expect(html).toContain('<title>Contestación</title>');
    expect(html).not.toContain('letter-page-break');
  });

  it('incluye estilos de tabla y evita cortar filas entre páginas', () => {
    const html = buildDraftPrintHtml({
      title: 'Cuadro',
      html: '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>',
      marginsCm: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
    });
    expect(html).toContain('table {');
    expect(html).toContain('border-collapse: collapse');
    expect(html).toContain('thead { display: table-header-group; }');
    expect(html).toContain('tr { break-inside: avoid; page-break-inside: avoid; }');
    expect(html).toContain('<table><thead><tr><th>A</th></tr></thead>');
  });

  it('escapa el título y usa los márgenes por defecto si los settings son inválidos', () => {
    const html = buildDraftPrintHtml({
      title: '<script>alert("x")</script>',
      html: '<p>Texto</p>',
      marginsCm: { top: 0, right: 2, bottom: 2, left: 2 },
    });
    expect(html).toContain('@page { size: Letter; margin: 2.5cm 2.5cm 2.5cm 2.5cm; }');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert("x")</script>');
  });
});
