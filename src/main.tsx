import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { StrictMode, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './index.css';

import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";
import { isTestHostname, isOwnerActive, isOwnerDevice } from './lib/owner';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY || 'phc_CSTbdRjVd5ffcXTJNXS8ZgNtfir4AA3TzU2CTrpvU73C';
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

posthog.init(posthogKey, {
  api_host: posthogHost,
  defaults: '2026-01-30',
  person_profiles: 'identified_only',
  // P1: Session Recording se difiere hasta después del critical path. Con
  // disable_session_recording=true posthog-js NO carga posthog-recorder.js al
  // inicio; se activa más abajo con startSessionRecording() en requestIdleCallback,
  // así el recorder no compite con el primer render de la landing.
  disable_session_recording: true,
});

// P1: Activar Session Recording cuando el navegador esté idle (o tras un timeout
// de respaldo). Retrasa la carga de posthog-recorder.js hasta después de pintar.
if (typeof window !== 'undefined') {
  const win = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void };
  const startRecordingWhenIdle = () => {
    try {
      posthog.startSessionRecording(true);
    } catch {
      // Nunca bloquear el boot de la app por session recording
    }
  };
  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(startRecordingWhenIdle, { timeout: 4000 });
  } else {
    win.setTimeout(startRecordingWhenIdle, 3000);
  }
}

// Aislamiento de pruebas del dueño: marca cada evento con is_owner para poder
// filtrar en los dashboards y no contaminar métricas reales. Aplica cuando el
// hostname es de test (localhost / preview) o cuando el dispositivo ya fue
// identificado como del dueño (legalup_owner_device). En producción, si el
// dueño inicia sesión, setOwnerActive se encarga del registro en runtime.
const isTestHost = isTestHostname();
if (isTestHost || isOwnerDevice()) {
  posthog.register({
    is_owner: true,
    environment: isTestHost ? 'test' : 'prod',
  });
}

// Aislamiento del dueño: cuando la sesión pertenece a una cuenta del dueño
// (o estamos en un hostname de test), NO se envían eventos a GA4. Así el
// tráfico del dueño no contamina la data real (sus IPs cambian y no sirven
// como filtro). En hosts de test también se descarta, como antes.
{
  const realTag = (window as unknown as Record<string, unknown>).gtag;
  const gtagWrapper = (...args: unknown[]) => {
    if (isOwnerActive()) {
      return undefined;
    }
    try {
      return typeof realTag === 'function' ? (realTag as (...a: unknown[]) => unknown)(...args) : undefined;
    } catch {
      return undefined;
    }
  };
  (window as unknown as Record<string, unknown>).gtag = gtagWrapper;
}


// Theme context
type ThemeContextType = {
  theme: string;
  setTheme: (theme: string) => void;
};

const ThemeContext = React.createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {}
});

// Theme provider
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div data-theme={theme} className={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

// App Wrapper para manejar el estado de montaje
const AppWrapper = () => {
  return <App />;
};

// Obtener el contenedor raíz
const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');

// Crear la raíz de la aplicación
const root = createRoot(container);


// ─── Strip tracking query params BEFORE React mounts ───────────────────────
// Facebook (fbclid), Google (gclid), Microsoft (msclkid) append tracking IDs
// to shared URLs. These are harmless for React Router, but when combined with
// Netlify's CDN caching and Vite chunk hashing they can cause a blank screen
// on first load after a new deploy. Stripping them early prevents any issues.
const TRACKING_PARAMS = ['fbclid', 'gclid', 'msclkid', 'igshid', 'mc_eid', 'twclid'];

(function stripTrackingParams() {
  try {
    const url = new URL(window.location.href);
    let changed = false;
    TRACKING_PARAMS.forEach(param => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    });
    if (changed) {
      // Clean URL without triggering a page reload
      window.history.replaceState(null, '', url.pathname + (url.search || '') + (url.hash || ''));
    }
  } catch (e) {
    // Silently fail — never block app boot
  }
})();

// ─── Reload-loop guard ───────────────────────────────────────────────────────
// If the ErrorBoundary triggers reload() more than 3 times in 30s (e.g. after
// a bad deploy), stop reloading and let the user see the error instead.
(function guardReloadLoop() {
  const KEY = '_legalup_reload_count';
  const WINDOW_MS = 30_000;
  const MAX_RELOADS = 3;
  try {
    const raw = sessionStorage.getItem(KEY);
    const { count = 0, ts = Date.now() } = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    if (now - ts > WINDOW_MS) {
      // Reset window
      sessionStorage.setItem(KEY, JSON.stringify({ count: 0, ts: now }));
    } else if (count >= MAX_RELOADS) {
      // Too many reloads — patch location.reload to be a no-op temporarily
      console.warn('[LegalUp] Reload loop detected, suppressing further reloads.');
      const noop = () => {};
      Object.defineProperty(window.location, 'reload', { value: noop, writable: true });
    } else {
      sessionStorage.setItem(KEY, JSON.stringify({ count: count + 1, ts }));
    }
  } catch (e) {
    // Silently fail
  }
})();

// Limpiar contador de recargas por activos fallidos si la app montó exitosamente
sessionStorage.removeItem('asset_reload_count');

// Renderizar la aplicación
root.render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <HelmetProvider>
        <ThemeProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AppWrapper />
          </BrowserRouter>
        </ThemeProvider>
      </HelmetProvider>
    </PostHogProvider>
  </StrictMode>
);
