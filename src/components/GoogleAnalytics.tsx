import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
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
    const send = (title?: string) => {
      if (settled) return;
      settled = true;
      if (generation !== generationRef.current) return; // navegación más nueva ganó
      if (lastSentKeyRef.current === key) return;
      lastSentKeyRef.current = key;
      gtag("event", "page_view", {
        // page_path desde la navegación que disparó el efecto (destino
        // determinista; window.location no cambia en routers en memoria).
        page_path: key,
        page_title:
          title ?? (typeof document !== "undefined" ? document.title : undefined),
        page_location: typeof window !== "undefined" ? window.location.href : undefined,
      });
    };
    // PRIMARIO por eventos (determinista): el commit de Helmet de la ruta
    // destino. Espera ilimitada hasta el commit — cubre chunks lazy lentos
    // sin leer títulos intermedios. Debounce take-last de 5 frames: el
    // desmontaje/montaje puede emitir más de un commit y gana el último.
    // Sin rAF disponible, el primer commit envía directo.
    let pendingTitle: string | undefined;
    let debounceLeft = -1;
    const onCommit = (e: Event) => {
      if (settled || generation !== generationRef.current) return;
      pendingTitle = (e as CustomEvent<{ title?: string }>)?.detail?.title;
      if (typeof requestAnimationFrame === "function") {
        debounceLeft = 5;
      } else {
        send(pendingTitle || undefined);
      }
    };
    window.addEventListener("legalup:helmet-commit", onCommit);
    // RESPALDO por frames (rutas sin título propio, ej. home): si no hay
    // commit con título útil, se envía document.title tras estabilidad Y un
    // mínimo de frames — así un chunk lazy lento (<~1s) aún alcanza a
    // commitear por la vía primaria antes de que el fallback dispare.
    // MAX_FRAMES acota el peor caso. Churn cancela por generación.
    const STABLE_FRAMES = 10;
    const MIN_FALLBACK_FRAMES = 60;
    const MAX_FRAMES = 300;
    let frames = 0;
    let stableCount = 0;
    let lastTitle = typeof document !== "undefined" ? document.title : "";
    const tick = () => {
      if (settled || generation !== generationRef.current) {
        window.removeEventListener("legalup:helmet-commit", onCommit);
        return;
      }
      if (debounceLeft >= 0) {
        debounceLeft -= 1;
        if (debounceLeft < 0) {
          window.removeEventListener("legalup:helmet-commit", onCommit);
          // Commit sin título útil (ruta sin Helmet title): cae al fallback.
          if (pendingTitle) {
            send(pendingTitle);
            return;
          }
        }
      }
      const currentTitle = typeof document !== "undefined" ? document.title : "";
      stableCount = currentTitle === lastTitle ? stableCount + 1 : 1;
      lastTitle = currentTitle;
      frames += 1;
      if (
        (stableCount >= STABLE_FRAMES && frames >= MIN_FALLBACK_FRAMES) ||
        frames >= MAX_FRAMES
      ) {
        window.removeEventListener("legalup:helmet-commit", onCommit);
        send();
        return;
      }
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(tick);
      } else {
        window.removeEventListener("legalup:helmet-commit", onCommit);
        send();
      }
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(tick);
    } else {
      window.removeEventListener("legalup:helmet-commit", onCommit);
      send();
    }
    return () => {
      window.removeEventListener("legalup:helmet-commit", onCommit);
    };
  }, [initialized, location]);

  // FASE 5.18A: onChangeClientState se lee de los props de <Helmet>
  // (el más interno gana), NO del Provider. Este Helmet raíz —sin título
  // propio— recibe el callback global porque ningún Helmet de página lo
  // define. Reemite el commit como evento DOM con el título FINAL.
  const handleHelmetCommit = useCallback((newState: { title?: string }) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("legalup:helmet-commit", { detail: { title: newState?.title } })
      );
    }
  }, []);

  return (
    <Helmet onChangeClientState={handleHelmetCommit} />
  );
};

export default GoogleAnalytics;
