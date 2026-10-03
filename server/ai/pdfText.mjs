/**
 * FASE 4.59F.1 — extracción de texto PDF con pdf.js mantenido.
 *
 * Reemplaza pdf-parse (pdf.js 2019 empaquetado) como capa de parsing:
 * rechazaba PDFs válidos modernos ("bad XRef entry") y su comportamiento
 * variaba por entorno. Contrato idéntico hacia el resto del pipeline:
 * ({ text, pageCount }) o excepción controlada.
 *
 * - Sin worker en runtime server (getDocument en hilo principal).
 * - Sin OCR: PDFs sin texto devuelven texto vacío (la ruta decide).
 * - PDFs con contraseña: error explícito PasswordException (sin reintento).
 * - Normalización mínima: se preservan acentos, números, fechas y saltos
 *   de línea/página; sin colapsar todo a una línea.
 */
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const MAX_PAGES = 200;

export class PdfEmptyError extends Error {
  constructor() {
    super('EMPTY_TEXT');
    this.name = 'PdfEmptyError';
  }
}

export class PdfPasswordError extends Error {
  constructor() {
    super('PASSWORD_REQUIRED');
    this.name = 'PdfPasswordError';
  }
}

export class PdfCorruptError extends Error {
  constructor(message) {
    super(message || 'CORRUPT_PDF');
    this.name = 'PdfCorruptError';
  }
}

function toUint8Array(buffer) {
  if (buffer instanceof Uint8Array) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  if (Buffer.isBuffer(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  throw new PdfCorruptError('INVALID_BUFFER');
}

/**
 * Extrae texto de un Buffer PDF.
 * @param {Buffer|Uint8Array} buffer bytes exactos del PDF (ver §12).
 * @param {object} opts { maxChars?: number }
 * @returns {Promise<{ text: string, pageCount: number }>}
 * text === '' significa sin texto extraíble (imagen/escaneado).
 */
export async function extractPdfText(buffer, { maxChars = 80000 } = {}) {
  let bytes;
  try {
    bytes = toUint8Array(buffer);
  } catch {
    throw new PdfCorruptError('INVALID_BUFFER');
  }
  if (!bytes || bytes.length === 0) throw new PdfCorruptError('EMPTY_BUFFER');
  // §12: verificación barata antes del parser (%PDF + no vacío).
  const head = Buffer.from(bytes.slice(0, 5)).toString('latin1');
  if (head !== '%PDF-') throw new PdfCorruptError('NOT_A_PDF');

  let doc;
  try {
    doc = await pdfjsLib.getDocument({
      data: bytes,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0,
    }).promise;
  } catch (e) {
    if (e && (e.name === 'PasswordException' || /password/i.test(e.message || ''))) {
      throw new PdfPasswordError();
    }
    throw new PdfCorruptError(e?.message || 'PARSE_FAILED');
  }

  const pageCount = doc.numPages || 0;
  if (!Number.isFinite(pageCount) || pageCount < 1 || pageCount > 10000) {
    throw new PdfCorruptError('BAD_PAGE_COUNT');
  }

  const pages = [];
  const limit = Math.min(pageCount, MAX_PAGES);
  try {
    for (let n = 1; n <= limit; n++) {
      const page = await doc.getPage(n);
      const tc = await page.getTextContent();
      const parts = [];
      for (const item of tc.items || []) {
        if (typeof item.str !== 'string') continue;
        parts.push(item.str);
        if (item.hasEOL) parts.push('\n');
      }
      pages.push(parts.join('').replace(/[ \t]+\n/g, '\n').trim());
    }
  } finally {
    try {
      await doc.destroy();
    } catch {}
  }

  const text = pages
    .map((t, i) => (t ? `--- Página ${i + 1} ---\n${t}` : ''))
    .filter(Boolean)
    .join('\n\n')
    .slice(0, maxChars);
  return { text, pageCount };
}
