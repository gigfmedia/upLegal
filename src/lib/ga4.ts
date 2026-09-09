export type GA4Attribution = {
  ga_client_id?: string;
  ga_session_id?: string;
};

export function getGA4Attribution(): Promise<GA4Attribution> {
  return new Promise((resolve) => {
    try {
      const gtag = (window as any).gtag;
      const measurementId = (import.meta as any).env?.VITE_GA4_MEASUREMENT_ID || (import.meta as any).env?.VITE_GA_MEASUREMENT_ID || (window as any).GA_MEASUREMENT_ID;
      if (!gtag || !measurementId) return resolve({});
      let clientId: string | undefined;
      let sessionId: string | undefined;
      let done = 0;
      const maybeDone = () => {
        done += 1;
        if (done >= 2) resolve({ ga_client_id: clientId, ga_session_id: sessionId });
      };
      const timeout = setTimeout(() => resolve({ ga_client_id: clientId, ga_session_id: sessionId }), 400);
      try {
        gtag('get', measurementId, 'client_id', (id: string) => {
          clientId = id;
          maybeDone();
        });
      } catch {
        maybeDone();
      }
      try {
        gtag('get', measurementId, 'session_id', (id: string) => {
          sessionId = id ? String(id) : undefined;
          maybeDone();
        });
      } catch {
        maybeDone();
      }
      // if gtag get never calls back, timeout will resolve
      void timeout;
    } catch {
      resolve({});
    }
  });
}
