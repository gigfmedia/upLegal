import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";

declare global {
  interface Window {
    gtag?: (...args: Parameters<typeof ReactGA.gtag>) => void;
  }
}

// Interop helper to handle bundler differences where ReactGA could be wrapped in a default property
const ga: typeof ReactGA = (ReactGA as any).default && typeof (ReactGA as any).default.initialize === "function"
  ? (ReactGA as any).default
  : ReactGA;

const GoogleAnalytics = () => {
  const location = useLocation();

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (gaId) {
      if (import.meta.env.DEV) {
        //console.log(`GA Init: ${gaId}`);
      }
      ga.initialize(gaId);

      const originalGtag = window.gtag?.bind(window);
      window.gtag = (...args) => {
        if (import.meta.env.DEV) {
          //console.log("gtag call", args);
        }

        if (typeof originalGtag === "function") {
          originalGtag(...args);
        } else {
          ga.gtag(...args);
        }
      };

      setInitialized(true);
    } else {
      console.warn("Google Analytics Measurement ID is missing (VITE_GA_MEASUREMENT_ID)");
    }
  }, []);

  useEffect(() => {
    if (initialized) {
      if (import.meta.env.DEV) {
        //console.log(`GA Pageview: ${location.pathname + location.search}`);
      }
      ga.send({ hitType: "pageview", page: location.pathname + location.search });
    }
  }, [initialized, location]);

  return null;
};

export default GoogleAnalytics;
