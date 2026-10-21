// UA-4 FASE 1 — overlay de páginas carta.
//
// Dibuja exclusivamente presentación: fondo blanco por página, el hueco gris
// entre páginas y el número de pie alineado a la izquierda del área de
// contenido. No es contenido editable ni entra en `getHTML()`: está fuera de
// `.ProseMirror`, marcado `aria-hidden` y sin interacción de puntero. El zoom
// escala este overlay con la hoja porque vive dentro del mismo envoltorio.
import { footerLabels, pageTop, type PageLayout } from '@/components/legalup-ai/letterPageGeometry';

export function LetterPageOverlay({
  pageCount,
  layout,
}: {
  pageCount: number;
  layout: PageLayout;
}) {
  return (
    <div
      data-testid="letter-page-overlay"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-0 select-none"
    >
      {footerLabels(pageCount).map((label) => {
        const index = label - 1;
        return (
          <div
            key={label}
            data-testid={`letter-page-${label}`}
            data-page-number={label}
            className="absolute left-0 rounded-sm bg-white ring-1 ring-gray-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
            style={{
              top: pageTop(layout, index),
              width: layout.pageWidth,
              height: layout.pageHeight,
            }}
          >
            <span
              data-testid="letter-page-number"
              className="absolute text-[11px] leading-none text-gray-600"
              style={{ left: layout.margins.left, bottom: layout.footerInset }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
