import * as Sentry from '@sentry/react';
import * as React from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (!dsn) {
  // Sin DSN no se inicializa: evita reportar a una cuenta ajena o quemar cuota.
  // Configurar VITE_SENTRY_DSN en Netlify para activar.
} else {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate: 0.1,
    tracePropagationTargets: [/^\//],
  });
}
