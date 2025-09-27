import { AuthError } from '@supabase/supabase-js';
import { toast } from '@/components/ui/use-toast';
import { clearAuthData } from './authUtils';

/**
 * Handles authentication errors consistently across the application
 * @param error The error that occurred
 * @param options Additional options for error handling
 */
export const handleAuthError = (
  error: unknown, 
  options: {
    /** Whether to show a toast notification (default: true) */
    showToast?: boolean;
    /** Custom error message to show in the toast */
    customMessage?: string;
    /** Whether to redirect to login on auth errors (default: true) */
    redirectToLogin?: boolean;
  } = {}
): void => {
  const {
    showToast = true,
    customMessage,
    redirectToLogin = true,
  } = options;
  
  // Default error message
  let errorMessage = customMessage || 'An authentication error occurred';
  let shouldLogout = false;
  
  // Handle different types of errors
  if (error instanceof AuthError) {
    console.error('Authentication error:', error);
    
    // Map common auth error codes to user-friendly messages
    switch (error.status) {
      case 400:
        errorMessage = 'Invalid request. Please check your input and try again.';
        break;
      case 401:
        errorMessage = 'Your session has expired. Please log in again.';
        shouldLogout = true;
        break;
      case 403:
        errorMessage = 'You do not have permission to perform this action.';
        break;
      case 404:
        errorMessage = 'The requested resource was not found.';
        break;
      case 409:
        errorMessage = 'This resource already exists.';
        break;
      case 422:
        errorMessage = 'Validation error. Please check your input.';
        break;
      case 429:
        errorMessage = 'Too many requests. Please try again later.';
        break;
      case 500:
        errorMessage = 'An internal server error occurred. Please try again later.';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }
  } else if (error instanceof Error) {
    console.error('Unexpected error:', error);
    errorMessage = error.message || errorMessage;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  // Show toast notification if enabled
  if (showToast) {
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
      duration: 5000,
    });
  }
  
  // Handle logout and redirect if needed
  if (shouldLogout && redirectToLogin) {
    // Clear auth data and redirect to login
    clearAuthData().then(() => {
      // Use window.location instead of navigate to ensure a full page reload
      window.location.href = '/auth/login';
    });
  }
};

/**
 * Creates an error handler function with default options
 */
export const createErrorHandler = (defaultOptions = {}) => {
  return (error: unknown, options = {}) => 
    handleAuthError(error, { ...defaultOptions, ...options });
};

// Common error handlers with default options
export const authErrorHandler = createErrorHandler({ showToast: true });
export const silentAuthErrorHandler = createErrorHandler({ showToast: false });
