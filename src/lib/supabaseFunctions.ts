import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise fall back to hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lgxsfmvyjctxehwslvyw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHNmbXZ5amN0eGVod3Nsdnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTkyMTAsImV4cCI6MjA2ODM3NTIxMH0.s2DoNuKigl_G3erwGeC4oLCC_3UiMQu5KJd0gnnYDeU';

// Create a client specifically for function invocations
export const functionsClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: typeof window !== 'undefined',
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});

/**
 * Helper function to invoke a Supabase Edge Function with proper error handling
 */
export const invokeFunction = async <T = any>(
  functionName: string,
  body?: Record<string, any>,
  options?: {
    headers?: Record<string, string>;
  }
): Promise<{ data?: T; error?: Error }> => {
  try {
    // Get the function URL - use the same URL as the one used to create the client
    const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;
    
    // Prepare headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      ...options?.headers
    });

    console.log('Calling function:', functionUrl);
    
    // Make the fetch request directly
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    console.log('Function response status:', response.status);

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If we can't parse the error as JSON, use the status text
        errorMessage = response.statusText || errorMessage;
      }
      
      console.error(`Error invoking function ${functionName}:`, errorMessage);
      return { error: new Error(errorMessage) };
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
