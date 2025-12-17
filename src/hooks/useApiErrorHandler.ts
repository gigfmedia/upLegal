import { useCallback } from 'react';
import { logError } from '@/utils/errorLogger';
import { useAuth } from '@/contexts/AuthContext';

export function useApiErrorHandler() {
  const { user } = useAuth();

  return useCallback(async <T>(
    promise: Promise<T>,
    context: Record<string, unknown> = {}
  ): Promise<T | null> => {
    try {
      return await promise;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown API error';
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logError({
        type: 'api_error',
        message: errorMessage,
        details: {
          ...context,
          error: {
            name: errorName,
            stack: errorStack,
          },
        },
        user_id: user?.id,
      });
      
      // Re-throw to allow error boundaries to catch it
      throw error;
    }
  }, [user?.id]);
}

export default useApiErrorHandler;
