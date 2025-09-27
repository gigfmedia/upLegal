import { supabase } from '@/lib/supabaseClient';
import { refreshSession } from './sessionUtils';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

interface ApiRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  authToken?: string;
  /** Whether to automatically refresh the session if token is expired */
  autoRefresh?: boolean;
  /** Maximum number of retry attempts for auth failures */
  maxRetries?: number;
}

/**
 * Makes an authenticated API request with automatic token refresh
 * @param endpoint The API endpoint (without the base URL)
 * @param options Request options including method, headers, body, etc.
 * @returns Promise with the response data
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { 
    method = 'GET', 
    headers = {}, 
    body, 
    authToken,
    autoRefresh = true,
    maxRetries = 1
  } = options;
  
  // Get the Supabase URL for the function
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not defined in environment variables');
  }
  
  const functionUrl = `${supabaseUrl}/functions/v1/${endpoint.replace(/^\/+/, '')}`;
  
  // Get the current session for the auth token if not provided
  const getToken = async (): Promise<string | undefined> => {
    if (authToken) return authToken;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };
  
  // Make the API request with retry logic for auth failures
  const makeRequest = async (attempt = 0): Promise<Response> => {
    const token = await getToken();
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...headers,
      },
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(functionUrl, requestOptions);
    
    // Handle 401 Unauthorized with auto-refresh
    if (response.status === 401 && autoRefresh && attempt < maxRetries) {
      try {
        // Try to refresh the session
        const refreshed = await refreshSession();
        if (refreshed) {
          // Retry the request with the new token
          return makeRequest(attempt + 1);
        }
      } catch (refreshError) {
        // Error refreshing session
      }
      
      // If we get here, refresh failed or max retries exceeded
      throw new Error('Session expired. Please log in again.');
    }
    
    return response;
  };
  
  try {
    const response = await makeRequest();
    
    if (!response.ok) {
      let errorMessage = 'An error occurred';
      let errorCode: string | number = 'UNKNOWN_ERROR';
      
      try {
        const errorData = await response.json().catch(() => ({}));
        errorMessage = errorData.error || errorData.message || errorMessage;
        errorCode = errorData.code || response.status;
      } catch (e) {
        errorMessage = await response.text().catch(() => errorMessage);
        errorCode = response.status;
      }
      
      const error = new Error(errorMessage) as any;
      error.status = response.status;
      error.code = errorCode;
      throw error;
    }

    // For 204 No Content responses
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}

// Appointment API
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
export type AppointmentType = 'video' | 'phone' | 'in-person';

export interface AppointmentData {
  id: string;
  title: string;
  description: string;
  status: AppointmentStatus;
  type: AppointmentType;
  lawyer_id: string;
  client_id: string;
  date: string;
  time: string;
  duration: number;
  location?: string;
  meeting_link?: string;
  price: number;
  notes?: string;
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at: string;
}

export const appointmentsApi = {
  create: async (appointment: Omit<AppointmentData, 'id'>, token?: string) => {
    return apiRequest<AppointmentData>('create-appointment', {
      method: 'POST',
      body: appointment,
      authToken: token,
    });
  },
  
  list: async (params?: { status?: string }, token?: string) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    
    return apiRequest<AppointmentData[]>(`appointments?${query.toString()}`, {
      method: 'GET',
      authToken: token,
    });
  },
  
  get: async (id: string, token?: string) => {
    return apiRequest<AppointmentData>(`appointments/${id}`, {
      method: 'GET',
      authToken: token,
    });
  },
  
  update: async (id: string, updates: Partial<AppointmentData>, token?: string) => {
    return apiRequest<AppointmentData>(`appointments/${id}`, {
      method: 'PUT',
      body: updates,
      authToken: token,
    });
  },
  
  delete: async (id: string, token?: string) => {
    return apiRequest<void>(`appointments/${id}`, {
      method: 'DELETE',
      authToken: token,
    });
  },
};
