import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ACCEPT_ALL_CONSENT,
  DEFAULT_CONSENT,
  getStoredConsent,
  saveConsent,
  subscribeConsent,
  type CookieConsentPreferences,
  type StoredCookieConsent,
} from '@/lib/cookieConsent';
import {
  applyConsentToTrackers,
  fireConsentUpdatedEvent,
} from '@/lib/consentTrackers';
import { dropPendingCalls } from '@/lib/posthogLoader';

type CookieConsentContextType = {
  /** Preferencias guardadas. `null` = usuario aún no decide. */
  consent: StoredCookieConsent | null;
  /** `true` cuando hay decisión (cualquier versión válida). */
  hasDecided: boolean;
  /** Banner visible solo si no hay decisión. */
  isBannerVisible: boolean;
  /** Modal de preferencias abierto. */
  isPreferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (prefs: Partial<CookieConsentPreferences>) => void;
};

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

function readConsent(): StoredCookieConsent | null {
  try {
    return getStoredConsent();
  } catch {
    return null;
  }
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<StoredCookieConsent | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hidrata desde localStorage solo en cliente (evita hydration mismatch).
  useEffect(() => {
    setConsent(readConsent());
    setHydrated(true);
    const unsubscribe = subscribeConsent((stored) => setConsent(stored));
    return unsubscribe;
  }, []);

  const persist = useCallback(
    (prefs: Partial<CookieConsentPreferences>, opts?: { silent?: boolean }) => {
      let stored: StoredCookieConsent | null = null;
      try {
        stored = saveConsent(prefs);
      } catch {
        return;
      }
      try {
        applyConsentToTrackers();
      } catch {
        // noop
      }
      if (!stored.analytics) {
        // Nada capturado pre-decisión debe viajar después del rechazo.
        try {
          dropPendingCalls();
        } catch {
          // noop
        }
      }
      // El evento de consentimiento solo viaja si analytics quedó permitido.
      if (!opts?.silent && stored.analytics === true) {
        try {
          fireConsentUpdatedEvent(stored);
        } catch {
          // noop
        }
      }
    },
    [],
  );

  const acceptAll = useCallback(() => {
    persist(ACCEPT_ALL_CONSENT);
    setIsPreferencesOpen(false);
  }, [persist]);

  const rejectOptional = useCallback(() => {
    persist(DEFAULT_CONSENT);
    setIsPreferencesOpen(false);
  }, [persist]);

  const savePreferences = useCallback(
    (prefs: Partial<CookieConsentPreferences>) => {
      persist(prefs);
      setIsPreferencesOpen(false);
    },
    [persist],
  );

  const openPreferences = useCallback(() => setIsPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setIsPreferencesOpen(false), []);

  const value = useMemo<CookieConsentContextType>(
    () => ({
      consent,
      hasDecided: consent !== null,
      isBannerVisible: hydrated && consent === null,
      isPreferencesOpen,
      openPreferences,
      closePreferences,
      acceptAll,
      rejectOptional,
      savePreferences,
    }),
    [
      consent,
      hydrated,
      isPreferencesOpen,
      openPreferences,
      closePreferences,
      acceptAll,
      rejectOptional,
      savePreferences,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextType {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}
