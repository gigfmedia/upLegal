import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import type { PostHog } from 'posthog-js';
import { loadPostHog } from '@/lib/posthogLoader';
import { getStoredConsent, subscribeConsent } from '@/lib/cookieConsent';

const PostHogProvider = lazy(() =>
  import('@posthog/react').then((mod) => ({ default: mod.PostHogProvider }))
);

// Boundary que activa PostHog solo en las rutas que lo necesitan (/booking*).
// posthog-js y @posthog/react se cargan dinámicamente aquí, de modo que no
// aparecen en el critical path de la landing. Si la carga falla, la UI sigue
// funcionando sin analytics (fallback seguro).
//
// CONSENTIMIENTO: el provider solo se monta con `consent.analytics === true`.
// Sin consentimiento no hay init ni red hacia PostHog.
const PostHogBoundary = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<PostHog | null>(null);

  useEffect(() => {
    let cancelled = false;
    const initIfConsented = () => {
      if (getStoredConsent()?.analytics !== true) return;
      loadPostHog()
        .then((posthog) => {
          if (!cancelled) setClient(posthog);
        })
        .catch(() => {
          // noop — analytics nunca debe romper el flujo de reserva
        });
    };
    initIfConsented();
    const unsubscribe = subscribeConsent((stored) => {
      if (stored.analytics === true) {
        initIfConsented();
      } else if (!cancelled) {
        setClient(null);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (!client) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={<>{children}</>}>
      <PostHogProvider client={client}>{children}</PostHogProvider>
    </Suspense>
  );
};

export default PostHogBoundary;