// UA-4 Fase 3 — exportación de borradores con la geometría configurada.
//
// La exportación usa el motor de impresión del navegador ("Guardar como PDF")
// sobre un iframe aislado. `@page` fija tamaño carta y los cuatro márgenes en
// centímetros; el HTML exportado es el del editor (getHTML), nunca el stack de
// decoraciones de paginación. Así el PDF conserva el ancho de línea y los
// márgenes elegidos sin añadir una dependencia de generación PDF al cliente.
import {
  DEFAULT_MARGINS_CM,
  normalizeMarginsCm,
  type PageMarginsCm,
} from '@/components/legalup-ai/letterPageGeometry';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cm(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function buildDraftPrintHtml({
  title,
  html,
  marginsCm,
}: {
  title: string;
  html: string;
  marginsCm: PageMarginsCm;
}): string {
  const margins = normalizeMarginsCm(marginsCm) ?? DEFAULT_MARGINS_CM;
  const pageMargin = `${cm(margins.top)}cm ${cm(margins.right)}cm ${cm(margins.bottom)}cm ${cm(margins.left)}cm`;
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: Letter; margin: ${pageMargin}; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      color: #111827;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.55;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 { font-size: 18pt; line-height: 1.25; margin: 0 0 0.7em; }
    h2 { font-size: 15pt; line-height: 1.3; margin: 1.1em 0 0.5em; }
    h3 { font-size: 13pt; line-height: 1.35; margin: 1em 0 0.4em; }
    p { margin: 0 0 0.75em; }
    ul, ol { margin: 0 0 0.75em 1.5em; padding: 0; }
    li { margin: 0 0 0.25em; }
    h1, h2, h3 { break-after: avoid; page-break-after: avoid; }
    p, li { orphans: 3; widows: 3; }
  </style>
</head>
<body>${html}</body>
</html>`;
}

/**
 * Abre el diálogo de impresión con el documento aislado. Devuelve false si el
 * entorno no permite crear el iframe (p. ej. SSR o un navegador bloqueante).
 */
export function printDraftDocument({
  title,
  html,
  marginsCm,
}: {
  title: string;
  html: string;
  marginsCm: PageMarginsCm;
}): boolean {
  if (typeof document === 'undefined' || !document.body) return false;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'Vista de impresión del borrador');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    return false;
  }

  doc.open();
  doc.write(buildDraftPrintHtml({ title, html, marginsCm }));
  doc.close();

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 1000);
  };
  const trigger = () => {
    try {
      win.focus();
      win.print();
    } finally {
      cleanup();
    }
  };

  if (doc.readyState === 'complete') window.setTimeout(trigger, 0);
  else iframe.addEventListener('load', trigger, { once: true });
  return true;
}
