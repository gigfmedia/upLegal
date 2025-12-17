import { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '@/utils/errorLogger';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
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
