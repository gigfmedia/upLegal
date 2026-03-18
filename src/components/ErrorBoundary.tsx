import { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '@/utils/errorLogger';

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
function isChunkLoadError(error: Error): boolean {
  const msg = error?.message || '';
  const name = error?.name || '';
  return (
    name === 'ChunkLoadError' ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed')
  );
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const chunkError = isChunkLoadError(error);
    // If it's a chunk error, trigger an immediate reload instead of showing an error UI
    if (chunkError) {
      window.location.reload();
    }
    return { hasError: true, error, isChunkError: chunkError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError({
      type: 'react_error_boundary',
      message: error.message,
      details: {
        componentStack: errorInfo.componentStack,
        error: {
          name: error.name,
          stack: error.stack,
        },
      },
    });
  }

  render() {
    if (this.state.hasError) {
      // Chunk errors trigger an auto-reload so just show a brief loading state
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Actualizando la página…</p>
            </div>
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
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none"
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
