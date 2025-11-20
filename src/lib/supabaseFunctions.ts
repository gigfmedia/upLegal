import { getSupabaseClient } from './supabaseClient';
import { z } from 'zod';

// Types
type FunctionResponse<T = unknown> = {
  data?: T;
  error?: Error;
  status?: number;
};

type InvokeFunctionOptions = {
  headers?: Record<string, string>;
  timeout?: number;
  schema?: z.ZodSchema<T>;
};

// Constants
const DEFAULT_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Get and validate Supabase URL
const getFunctionsBaseUrl = (): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not defined in environment variables');
  }

  try {
    const url = new URL(supabaseUrl);
    // Handle local development ports
    const port = url.port === '54321' ? '5433' : url.port;
    const baseUrl = `${url.protocol}//${url.hostname}${port ? `:${port}` : ''}`;
    return `${baseUrl}/functions/v1`;
  } catch (error) {
    console.error('Error parsing Supabase URL:', error);
    throw new Error('Invalid Supabase URL format');
  }
};

// Cache the base URL
const FUNCTIONS_BASE_URL = getFunctionsBaseUrl();

/**
 * Invoke a Supabase Edge Function with improved error handling and TypeScript support
 */
export const invokeFunction = async <T = unknown>(
  functionName: string,
  body?: Record<string, unknown>,
  options: InvokeFunctionOptions = {}
): Promise<FunctionResponse<T>> => {
  // Input validation
  if (!functionName || typeof functionName !== 'string' || functionName.trim() === '') {
    throw new Error('Function name is required');
  }

  // Clean and validate function name
  const cleanFunctionName = functionName.replace(/^\/+|\/+$/g, '');
  
  // Prepare headers
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-Client': 'uplegal-web',
    ...options?.headers,
  });

  const functionUrl = `${FUNCTIONS_BASE_URL}/${cleanFunctionName}`;
  const timeout = options.timeout || DEFAULT_TIMEOUT;

  // Add retry logic
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await parseErrorResponse(response);
        lastError = new Error(
          errorData?.message || `HTTP ${response.status}: ${response.statusText}`
        );
        
        // Don't retry on client errors (4xx) except 429 (Too Many Requests)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          break;
        }
        
        // Exponential backoff for retries
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
          continue;
        }
        
        return {
          error: lastError,
          status: response.status,
        };
      }

      // Parse successful response
      const responseData = await response.json();
      
      // Validate response against schema if provided
      if (options.schema) {
        const validation = options.schema.safeParse(responseData);
        if (!validation.success) {
          throw new Error(`Response validation failed: ${validation.error.message}`);
        }
        return { data: validation.data, status: response.status };
      }
      
      return { data: responseData, status: response.status };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on abort errors
      if (error.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${timeout}ms`);
        break;
      }
      
      // Log error and retry if possible
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
  }

  return {
    error: lastError || new Error('Unknown error occurred'),
    status: 500,
  };
};

// Helper to parse error responses
async function parseErrorResponse(response: Response) {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    return { message: await response.text() };
  } catch {
    return { message: 'Failed to parse error response' };
  }
}

// Utility functions for common operations
export const functions = {
  // Example: Send email
  async sendEmail(params: { to: string; subject: string; template: string; data: Record<string, unknown> }) {
    return invokeFunction('send-email', params);
  },
  
  // Example: Get user profile
  async getUserProfile(userId: string, accessToken: string) {
    return invokeFunction<{ profile: unknown }>('get-profile', { userId }, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      schema: z.object({
        profile: z.object({
          id: z.string(),
          email: z.string().email(),
          // Add more profile fields as needed
        })
      })
    });
  },
  
  // Add more utility functions as needed
};

// Export the Supabase client for direct use if needed
export const functionsClient = getSupabaseClient();
