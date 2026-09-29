import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

/**
 * Primera capa del Cookie Consent Manager: barra flotante oscura abajo.
 * - Sin toggles (solo aparecen en el modal de "Configurar").
 * - Ancho igual al buscador del hero (max-w-3xl centrado, mismo gutter).
 * - No full-width pegado a los bordes; separación inferior ~20-24px.
 * - Al llegar al footer, sube por encima de él (como el botón de WhatsApp).
 */
export default function CookieBanner() {
  const { isBannerVisible, acceptAll, rejectOptional, openPreferences } = useCookieConsent();
  // Cuánto debe elevarse el banner para no tapar el footer al final de página.
  const [lift, setLift] = useState(0);

  useEffect(() => {
    if (!isBannerVisible || typeof window === 'undefined') return;
    const footer = document.querySelector('footer');
    if (!footer) {
      setLift(0);
      return;
    }
    const update = () => {
      const rect = footer.getBoundingClientRect();
      const overlap = window.innerHeight - rect.top;
      setLift(overlap > 0 ? Math.ceil(overlap) : 0);
    };
    update();
    const observer = new IntersectionObserver(update, { threshold: 0 });
    observer.observe(footer);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [isBannerVisible]);

  if (!isBannerVisible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[1000] px-4 pb-5 transition-transform duration-300 sm:px-6 sm:pb-6 lg:px-8"
      style={lift > 0 ? { transform: `translateY(-${lift}px)` } : undefined}
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-white/10 bg-[#101820]/95 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10"
              >
                <Cookie className="h-4 w-4 text-white" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Usamos cookies</p>
                <p className="mt-1 text-sm leading-relaxed text-white/70">
                  Usamos cookies para analítica y para mejorar tu experiencia. Puedes aceptar,
                  rechazar o configurar tus preferencias.{' '}
                  <Link
                    to="/cookies"
                    className="whitespace-nowrap text-white underline underline-offset-2 hover:text-white/80"
                  >
                    Política de cookies
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={openPreferences}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Configurar
              </button>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={rejectOptional}
                  className="rounded-lg border border-white/25 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#101820] transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
