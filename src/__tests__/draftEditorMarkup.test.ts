// @vitest-environment node
// FASE 4.62C — conversión escape-first de markdown legal a HTML de editor.
// La regla dura: contenido jurídico nunca se interpreta como HTML crudo.
import { describe, it, expect } from 'vitest';
import { convertDraftMarkdownToHtml, htmlToPlainText } from '@/components/legalup-ai/draftEditorMarkup';

describe('4.62C convertDraftMarkdownToHtml — escape-first', () => {
  it('HTML crudo queda escapado como texto, nunca como etiqueta', () => {
    const out = convertDraftMarkdownToHtml('<script>alert("x")</script>');
    expect(out).toContain('&lt;script&gt;');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;/script&gt;');
  });

  it('atributos en eventos no se interpretan', () => {
    const out = convertDraftMarkdownToHtml('Texto <img src=x onerror=alert(1)> luego');
    expect(out).toContain('&lt;img');
    expect(out).not.toContain('<img');
  });

  it('entidades de contenido se muestran literales', () => {
    const out = convertDraftMarkdownToHtml('Art. 5 &nbsp; Cláusula "capiatis" &amp; más');
    expect(out).toContain('&amp;nbsp;');
    expect(out).toContain('&quot;capiatis&quot;');
  });

  it('encabezados 1-3 convertidos', () => {
    const out = convertDraftMarkdownToHtml('# Primero\n\n## Segundo\n\n### Tercero');
    expect(out).toBe('<h1>Primero</h1><h2>Segundo</h2><h3>Tercero</h3>');
  });

  it('niveles > 3 no son encabezado (texto visible con el número)', () => {
    const out = convertDraftMarkdownToHtml('#### Cuarto');
    expect(out).toContain('#### Cuarto');
    expect(out).not.toContain('<h4');
  });

  it('negrita y cursiva de whitelist se convierten', () => {
    const out = convertDraftMarkdownToHtml('**obligación** y *clave*');
    expect(out).toBe('<p><strong>obligación</strong> y <em>clave</em></p>');
  });

  it('asteriscos matemáticos no son énfasis', () => {
    const out = convertDraftMarkdownToHtml('daño por monto: 3 * 4 y 2 * 5');
    expect(out).not.toContain('<em>');
  });

  it('bullets y ordenadas generan listas', () => {
    const out = convertDraftMarkdownToHtml('- renta impaga\n- días de atraso\n\n1. cited\n2. segundo');
    expect(out).toContain('<li>renta impaga</li>');
    expect(out).toMatch(/<ul>[\s\S]*<\/ul>/);
    expect(out).toMatch(/<ol>[\s\S]*<\/ol>/);
  });

  it('[POR COMPLETAR: …] sobrevive como texto visible', () => {
    const out = convertDraftMarkdownToHtml('Se solicita conforme. [POR COMPLETAR: número de rol]');
    expect(out).toContain('POR COMPLETAR: número de rol');
    expect(out).toContain('<p>');
  });

  it('líneas continuas dentro de un párrafo se unen con <br>', () => {
    const out = convertDraftMarkdownToHtml('Linea uno\nLinea dos');
    expect(out).toBe('<p>Linea uno<br>Linea dos</p>');
  });

  it('contenido vacío no genera HTML', () => {
    expect(convertDraftMarkdownToHtml('')).toBe('');
  });
});

describe('4.62C htmlToPlainText', () => {
  it('elimina etiquetas y decodifica entidades de escape', () => {
    const out = htmlToPlainText('<h1>Requerimiento</h1><p>obligación &amp; renta</p>');
    expect(out).toBe('Requerimiento\nobligación & renta');
  });

  it('convierte <br> en salto de línea', () => {
    expect(htmlToPlainText('a<br>b')).toContain('a\nb');
  });
});
