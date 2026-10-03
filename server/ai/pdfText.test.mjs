// @vitest-environment node
// FASE 4.59F.1 — extracción PDF: válidos, multipágina, límite,
// corruptos, sin texto. Sin fixtures gigantes: PDFs pequeños generados.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { extractPdfText, PdfEmptyError, PdfPasswordError, PdfCorruptError } from './pdfText.mjs';

const fix = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));

describe('extractPdfText — válidos', () => {
  it('PDF simple: texto no vacío con frase esperada y 1 página', async () => {
    const { text, pageCount } = await extractPdfText(fix('valid-simple.pdf'));
    expect(pageCount).toBe(1);
    expect(text).toContain('Ana Arrendadora');
    expect(text).toContain('quinientos mil pesos');
    // Acentos y números preservados
    expect(text.length).toBeGreaterThan(20);
  });

  it('multipágina: sobrevive contenido de página 1 y N', async () => {
    const { text, pageCount } = await extractPdfText(fix('valid-multipage.pdf'));
    expect(pageCount).toBe(3);
    expect(text).toContain('PRIMERA PAGINA');
    expect(text).toContain('TERCERA PAGINA');
  });

  it('límite 80k: sin crecimiento descontrolado', async () => {
    const { text } = await extractPdfText(fix('valid-multipage.pdf'), { maxChars: 100 });
    expect(text.length).toBeLessThanOrEqual(100);
  });
});

describe('extractPdfText — casos honestos', () => {
  it('bytes no-PDF: error controlado, sin crash', async () => {
    await expect(extractPdfText(Buffer.from('esto no es un pdf'))).rejects.toBeInstanceOf(PdfCorruptError);
  });

  it('buffer vacío: error controlado', async () => {
    await expect(extractPdfText(Buffer.alloc(0))).rejects.toBeInstanceOf(PdfCorruptError);
  });

  it('PDF solo gráficos: texto vacío honesto (sin OCR)', async () => {
    const { text, pageCount } = await extractPdfText(fix('image-only.pdf'));
    expect(pageCount).toBe(1);
    expect(text).toBe('');
  });

  it('clases de error exportadas', () => {
    expect(new PdfEmptyError().name).toBe('PdfEmptyError');
    expect(new PdfPasswordError().name).toBe('PdfPasswordError');
  });
});
