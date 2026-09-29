import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getStoredConsent, subscribeConsent } from "@/lib/cookieConsent";
import { ensureGa4Loaded, disableGa4 } from "@/lib/consentTrackers";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// P2: Carga de GA4 sin duplicados. La app ya dispara todos sus eventos vía
// window.gtag (dataLayer). Antes react-ga4 inyectaba un gtag.js propio (189KB)
// que se sumaba al que pueda cargar GTM, duplicando la descarga. Ahora solo
// inyectamos gtag/js si NO existe ya un script gtag.js en el DOM (ej. el que
// carga GTM). Sin duplicados y sin perder GA4: si gtag.js ya está, los eventos
// siguen funcionando; si no, lo cargamos una única vez.
//
// CONSENTIMIENTO (Cookie Consent Manager): gtag.js NO se carga hasta que
// `consent.analytics === true`. Sin el script, los `window.gtag(...)` de la
// app caen al stub de index.html (cola en memoria, sin red). Al otorgar
// consentimiento, `ensureGa4Loaded()` descarta esa cola pre-consentimiento y
// configura GA4. Al revocar, se niega storage y se detienen los page_view.
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-ZJCG1RNJT6";

function gtag(...args: unknown[]): void {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag(...args);
  }
}

const GoogleAnalytics = () => {
  const location = useLocation();

  const [initialized, setInitialized] = useState(false);

  // Inicializa GA4 solo con consentimiento analytics. Reacciona a cambios
  // (otorgar tardío o revocación) sin remontar el componente.
  useEffect(() => {
    const syncWithConsent = () => {
      if (getStoredConsent()?.analytics === true) {
        ensureGa4Loaded();
        setInitialized(true);
      } else {
        disableGa4();
        setInitialized(false);
      }
    };
    syncWithConsent();
    const unsubscribe = subscribeConsent(syncWithConsent);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (initialized && getStoredConsent()?.analytics === true) {
      gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_title: typeof document !== "undefined" ? document.title : undefined,
        page_location: typeof window !== "undefined" ? window.location.href : undefined,
      });
    }
  }, [initialized, location]);

  return null;
};

export default GoogleAnalytics;
