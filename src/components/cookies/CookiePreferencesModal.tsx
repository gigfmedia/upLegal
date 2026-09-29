import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { DEFAULT_CONSENT } from '@/lib/cookieConsent';

/**
 * Segunda capa: modal de preferencias (shadcn/Radix Dialog con focus trap y
 * Escape nativos). Los toggles solo existen aquí, nunca en el banner.
 */
export default function CookiePreferencesModal() {
  const { consent, isPreferencesOpen, openPreferences, closePreferences, acceptAll, rejectOptional, savePreferences } =
    useCookieConsent();

  // Ref para el listener de evento global (evita re-suscribirse).
  const openPreferencesRef = useRef(openPreferences);
  openPreferencesRef.current = openPreferences;

  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [preferences, setPreferences] = useState(false);

  // Carga las preferencias actuales cada vez que se abre el modal.
  useEffect(() => {
    if (isPreferencesOpen) {
      setAnalytics(consent?.analytics ?? DEFAULT_CONSENT.analytics);
      setMarketing(consent?.marketing ?? DEFAULT_CONSENT.marketing);
      setPreferences(consent?.preferences ?? DEFAULT_CONSENT.preferences);
    }
  }, [isPreferencesOpen, consent]);

  // Permite abrir el modal desde cualquier lugar (footer) sin acoplarse al
  // contexto: window.dispatchEvent(new CustomEvent('legalup:open-cookie-preferences')).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => openPreferencesRef.current();
    window.addEventListener('legalup:open-cookie-preferences', handler);
    return () => window.removeEventListener('legalup:open-cookie-preferences', handler);
  }, []);

  return (
    <Dialog open={isPreferencesOpen} onOpenChange={(open) => !open && closePreferences()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferencias de cookies</DialogTitle>
          <DialogDescription>
            Puedes elegir qué tipos de cookies permitir. Las cookies necesarias siempre están
            activas porque permiten el funcionamiento básico de LegalUp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <section className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold">Necesarias</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Necesarias para funciones esenciales como autenticación, seguridad y
                  funcionamiento básico de la plataforma.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                Siempre activas
              </span>
            </div>
          </section>

          <section className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold">Analíticas</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nos ayudan a entender cómo se utiliza LegalUp y a mejorar la experiencia.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Incluye: Google Analytics, PostHog.
                </p>
              </div>
              <Switch
                checked={analytics}
                onCheckedChange={setAnalytics}
                aria-label="Permitir cookies analíticas"
              />
            </div>
          </section>

          <section className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold">Marketing</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Permiten medir campañas y mostrar contenido o publicidad más relevante.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Incluye: TikTok Pixel.</p>
              </div>
              <Switch
                checked={marketing}
                onCheckedChange={setMarketing}
                aria-label="Permitir cookies de marketing"
              />
            </div>
          </section>

          <section className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold">Preferencias</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Permiten recordar ciertas configuraciones no esenciales de la experiencia.
                </p>
              </div>
              <Switch
                checked={preferences}
                onCheckedChange={setPreferences}
                aria-label="Permitir cookies de preferencias"
              />
            </div>
          </section>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={rejectOptional}
            className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Rechazar opcionales
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Aceptar todas
          </button>
          <button
            type="button"
            onClick={() => savePreferences({ analytics, marketing, preferences })}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Guardar preferencias
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
