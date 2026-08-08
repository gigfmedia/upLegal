import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { StrictMode, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './index.css';

import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";
import { isTestHostname, isOwnerActive } from './lib/owner';

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
});

// Aislamiento de pruebas del dueño: marca cada evento con is_owner del owner
// si estamos en un hostname de test (localhost / preview) para poder filtrar
// en los dashboards y no contaminar métricas reales.
const isTestHost = isTestHostname();
if (isTestHost) {
  posthog.register({
    is_owner: true,
    environment: 'test',
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
  
  useEffect(() => {
    if (isTestHost) {
      posthog.capture("test_event");
    }
  }, []);
  
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
