import { useEffect, useRef, useState } from "react";
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

  // Generación: cancela envíos stale ante navegación rápida.
  const generationRef = useRef(0);
  // Última ruta ya medida: evita duplicados (StrictMode, toggles de consent).
  const lastSentKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialized || getStoredConsent()?.analytics !== true) return;
    // Clave solo por path+search: un cambio solo de hash no es page_view nuevo.
    const key = location.pathname + location.search;
    if (lastSentKeyRef.current === key) return;
    const generation = ++generationRef.current;
    let settled = false;
    const send = () => {
      if (settled) return;
      settled = true;
      observer?.disconnect();
      if (generation !== generationRef.current) return; // navegación más nueva ganó
      if (lastSentKeyRef.current === key) return;
      lastSentKeyRef.current = key;
      gtag("event", "page_view", {
        // page_path desde la navegación que disparó el efecto (destino
        // determinista; window.location no cambia en routers en memoria).
        page_path: key,
        page_title: typeof document !== "undefined" ? document.title : undefined,
        page_location: typeof window !== "undefined" ? window.location.href : undefined,
      });
    };
    // Primario por eventos (no timeout): Helmet conmuta document.title al
    // commitear la ruta destino — también tras chunks lazy, por tarde que
    // lleguen (bug FASE 5.18: rAF fijo pierde contra chunks lentos).
    let observer: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
      const titleEl = document.querySelector("title");
      if (titleEl) {
        observer = new MutationObserver(send);
        observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
      }
    }
    // Respaldo acotado por frames (no timeout arbitrario): cubre rutas sin
    // Helmet o con título idéntico al anterior (el observer jamás dispararía).
    // Sin rAF disponible (SSR), envío sincrónico.
    const MAX_FRAMES = 300;
    let frames = 0;
    const tick = () => {
      if (settled || generation !== generationRef.current) {
        observer?.disconnect();
        return;
      }
      if (++frames >= MAX_FRAMES) {
        send();
        return;
      }
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(tick);
      } else {
        send();
      }
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(tick);
    } else {
      send();
    }
    return () => {
      observer?.disconnect();
    };
  }, [initialized, location]);

  return null;
};

export default GoogleAnalytics;
