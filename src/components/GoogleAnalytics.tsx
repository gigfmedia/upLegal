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

  // Estado vivo de la navegación en curso. El listener de commits y el loop
  // de frames se montan UNA vez (nunca pierden commits por orden de efectos:
  // los Helmet hijos commitean antes de que este efecto de ruta se ejecute).
  // Cada navegación solo resetea este estado y sube la generación.
  const navRef = useRef({
    generation: 0,
    key: null as string | null,
    settled: true,
    pendingTitle: undefined as string | undefined,
    hasCommit: false,
    debounceLeft: -1,
    frames: 0,
    stableCount: 0,
    lastTitle: "",
  });
  // Última ruta ya medida: evita duplicados (StrictMode, toggles de consent).
  const lastSentKeyRef = useRef<string | null>(null);

  const doSend = (key: string, generation: number, title?: string) => {
    const s = navRef.current;
    if (s.settled) return;
    s.settled = true;
    if (generation !== s.generation) return; // navegación más nueva ganó
    if (lastSentKeyRef.current === key) return;
    lastSentKeyRef.current = key;
    gtag("event", "page_view", {
      // page_path desde la navegación (destino determinista; window.location
      // no cambia en routers en memoria).
      page_path: key,
      page_title:
        title ?? (typeof document !== "undefined" ? document.title : undefined),
      page_location: typeof window !== "undefined" ? window.location.href : undefined,
    });
  };

  useEffect(() => {
    const onCommit = (e: Event) => {
      const s = navRef.current;
      if (s.settled) return;
      s.hasCommit = true;
      s.pendingTitle = (e as CustomEvent<{ title?: string }>)?.detail?.title;
      if (typeof requestAnimationFrame === "function") {
        s.debounceLeft = 5;
      } else {
        doSend(s.key ?? "", s.generation, s.pendingTitle || undefined);
      }
    };
    window.addEventListener("legalup:helmet-commit", onCommit);
    // RESPALDO: solo si Helmet ya habló (hasCommit) y el título se
    // estabilizó —rutas sin título propio, ej. home— o tope absoluto
    // MAX_FRAMES (consent tardío, rutas sin Helmet). Un chunk lento NO
    // dispara el fallback: sin commit, se sigue esperando el título final.
    const STABLE_FRAMES = 10;
    const MAX_FRAMES = 300;
    let rafId = 0;
    const loop = () => {
      const s = navRef.current;
      if (!s.settled) {
        if (s.debounceLeft >= 0) {
          s.debounceLeft -= 1;
          if (s.debounceLeft < 0 && s.pendingTitle) {
            doSend(s.key ?? "", s.generation, s.pendingTitle);
          }
        } else {
          const currentTitle = typeof document !== "undefined" ? document.title : "";
          s.stableCount = currentTitle === s.lastTitle ? s.stableCount + 1 : 1;
          s.lastTitle = currentTitle;
          s.frames += 1;
          if (
            (s.hasCommit && s.stableCount >= STABLE_FRAMES) ||
            s.frames >= MAX_FRAMES
          ) {
            doSend(s.key ?? "", s.generation);
          }
        }
      }
      if (typeof requestAnimationFrame === "function") {
        rafId = requestAnimationFrame(loop);
      }
    };
    if (typeof requestAnimationFrame === "function") {
      rafId = requestAnimationFrame(loop);
    }
    return () => {
      window.removeEventListener("legalup:helmet-commit", onCommit);
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (!initialized || getStoredConsent()?.analytics !== true) return;
    // Clave solo por path+search: un cambio solo de hash no es page_view nuevo.
    const key = location.pathname + location.search;
    if (lastSentKeyRef.current === key) return;
    const s = navRef.current;
    s.generation += 1;
    s.key = key;
    s.settled = false;
    s.pendingTitle = undefined;
    s.hasCommit = false;
    s.debounceLeft = -1;
    s.frames = 0;
    s.stableCount = 0;
    s.lastTitle = typeof document !== "undefined" ? document.title : "";
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
