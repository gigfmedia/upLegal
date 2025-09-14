import { supabase } from '@/integrations/supabase/client';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

interface ApiRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  authToken?: string;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = 'GET', headers = {}, body, authToken } = options;
  
  // Get the Supabase URL for the function
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/${endpoint.replace(/^\/+/, '')}`;
  
  // Get the current session for the auth token if not provided
  const token = authToken || (await supabase.auth.getSession()).data.session?.access_token;
  
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
  
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      errorMessage = await response.text() || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // For 204 No Content responses
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
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
