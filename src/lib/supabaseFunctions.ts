import { getSupabaseClient } from './supabaseClient';

// Use the singleton client from supabaseClient.ts
export const functionsClient = getSupabaseClient();

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

// Helper function to get the functions URL
const getFunctionsUrl = () => {
  // Always use the direct Supabase URL since CORS is now configured
  const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
  return baseUrl.replace('/rest/v1', '/functions/v1');
};

/**
 * Helper function to invoke a Supabase Edge Function with proper error handling
 */
export const invokeFunction = async <T = any>(
  functionName: string,
  body?: Record<string, unknown>,
  options?: {
    headers?: Record<string, string>;
  }
): Promise<{ data?: T; error?: Error }> => {
  try {
    // Get the function URL
    const functionUrl = `${getFunctionsUrl()}/${functionName}`;
    
    // Prepare headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      ...options?.headers
    });

    console.log('Calling function:', functionUrl);
    
    let response;
    try {
      // Make the fetch request with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
      
      // Usar modo 'cors' y credenciales 'include' para manejar CORS
      response = await fetch(functionUrl, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include'
      });
      
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('Network error when calling function:', error);
      if (error.name === 'AbortError') {
        return { error: new Error('La solicitud ha excedido el tiempo de espera. Por favor, intenta nuevamente.') };
      }
      return { error: new Error(`Error de red: ${error.message}. Por favor, verifica tu conexión e inténtalo de nuevo.`) };
    }
    
    console.log('Function response status:', response.status);

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `Error HTTP ${response.status}: ${response.statusText || 'Error desconocido'}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
        
        // Log additional error details for debugging
        console.error('Error response details:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
      } catch (e) {
        // If we can't parse the error as JSON, use the status text
        console.error('Failed to parse error response:', e);
      }
      
      console.error(`Error invoking function ${functionName}:`, errorMessage);
      return { 
        error: new Error(errorMessage || 'Ocurrió un error al procesar la solicitud. Por favor, inténtalo de nuevo más tarde.') 
      };
    }

    // Parse the successful response
    const data = await response.json();
    return { data };
    
  } catch (error) {
    console.error(`Unexpected error invoking function ${functionName}:`, error);
    return { 
      error: error instanceof Error 
        ? error 
        : new Error('An unexpected error occurred')
    };
  }
};
