import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";

declare global {
  interface Window {
    gtag?: (...args: Parameters<typeof ReactGA.gtag>) => void;
  }
}

const GoogleAnalytics = () => {
  const location = useLocation();

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (gaId) {
      if (import.meta.env.DEV) {
        console.log(`GA Init: ${gaId}`);
      }
      ReactGA.initialize(gaId);

      // Expose gtag-compatible helper so legacy calls keep working
      window.gtag = (...args) => {
        if (import.meta.env.DEV) {
          console.log("gtag call", args);
        }
        ReactGA.gtag(...args);
      };

      setInitialized(true);
    } else {
      console.warn("Google Analytics Measurement ID is missing (VITE_GA_MEASUREMENT_ID)");
    }
  }, []);

  useEffect(() => {
    if (initialized) {
      if (import.meta.env.DEV) {
        console.log(`GA Pageview: ${location.pathname + location.search}`);
      }
      ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    }
  }, [initialized, location]);

  return null;
};

export default GoogleAnalytics;
