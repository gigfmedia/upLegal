import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

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
const GA_GTAG_SCRIPT = "gtag/js";
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-ZJCG1RNJT6";

function gtagScriptAlreadyLoaded(): boolean {
  if (typeof document === "undefined") return false;
  return Array.from(document.querySelectorAll("script")).some((s) =>
    (s.src || "").includes(GA_GTAG_SCRIPT)
  );
}

function ensureGtagLoaded(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (gtagScriptAlreadyLoaded()) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // El stub de dataLayer/gtag ya lo define index.html ANTES del boot (para
  // encolar eventos tempranos y para que main.tsx capture realTag). No
  // sobrescribimos window.gtag aquí para no pisar el wrapper anti-dueño que
  // instala main.tsx; solo aseguramos que exista el dataLayer.
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
}

function gtag(...args: unknown[]): void {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag(...args);
  }
}

const GoogleAnalytics = () => {
  const location = useLocation();

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      //console.log(`GA Init: ${GA_MEASUREMENT_ID}`);
    }
    // Configurar GA4. Si gtag.js ya está (por GTM u otra carga) no se duplica;
    // el config entra al dataLayer igualmente.
    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID);
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
      if (import.meta.env.DEV) {
        //console.log(`GA Pageview: ${location.pathname + location.search}`);
      }
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