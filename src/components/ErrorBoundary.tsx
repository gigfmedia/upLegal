import { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '@/utils/errorLogger';
import { Loader2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

/**
 * Detects whether the error is a stale-chunk / dynamic import failure.
 * This happens when a new deploy is made and the old JS chunk hashes no longer
 * exist on the server while the user still has the old page open.
 */
function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message || '';
  const name = error.name || '';
  return (
    name === 'ChunkLoadError' ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Failed to load module script') ||
    msg.includes('text/html') ||
    msg.includes('not a valid JavaScript MIME type')
  );
}

const CHUNK_RELOAD_KEY = '_legalup_chunk_reload_ts';
const RELOAD_WINDOW_MS = 60_000; // 1 minuto guard

async function handleChunkErrorReload() {
  try {
    // 1. Limpiar Service Workers y Caches
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
  } catch (e) {
    console.warn('[ErrorBoundary] Failed clearing caches:', e);
  }

  // 2. Controlar anti-bucle de recarga (máximo 1 recarga automática por minuto por chunk error)
  const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  const now = Date.now();

  if (now - lastReload > RELOAD_WINDOW_MS) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    window.location.reload();
  } else {
    console.warn('[ErrorBoundary] Suppressing automatic reload loop for chunk error.');
  }
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const chunkError = isChunkLoadError(error);
    return { hasError: true, error, isChunkError: chunkError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isChunk = isChunkLoadError(error);

    logError({
      type: isChunk ? 'chunk_load_error' : 'react_error_boundary',
      message: error.message,
      details: {
        componentStack: errorInfo.componentStack,
        isChunkError: isChunk,
        error: {
          name: error.name,
          stack: error.stack,
        },
      },
    });

    if (isChunk) {
      handleChunkErrorReload();
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-900 mb-4" />
            <p className="text-sm font-medium text-gray-700">Actualizando la aplicación a la última versión...</p>
            <button
              onClick={() => {
                sessionStorage.removeItem(CHUNK_RELOAD_KEY);
                handleChunkErrorReload();
              }}
              className="mt-4 text-xs text-blue-600 underline"
            >
              Hacer clic aquí si la página no se recarga automáticamente
            </button>
          </div>
        );
      }

      return this.props.fallback || (
        <div className="p-4 text-center">
          <h2 className="text-lg font-medium text-red-600">Algo salió mal</h2>
          <p className="mt-2 text-sm text-gray-600">
            Hemos registrado el error y trabajaremos para solucionarlo.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-green-900 focus:outline-none"
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
