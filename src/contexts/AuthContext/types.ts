import { Json } from '../../auth.types';

export interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  role: 'client' | 'lawyer';
  specialties: string[];
  hourly_rate_clp: number | null;
  response_time: string | null;
  satisfaction_rate: number | null;
  languages: string[];
  availability: string | null;
  verified: boolean;
  available_for_hire: boolean;
  bar_number: string | null;
  zoom_link: string | null;
  education: Json | null;
  certifications: Json | null;
  experience_years: number | null;
  rating: number;
  review_count: number;
  has_used_free_consultation: boolean;
  visibility_settings: {
    profile_visible: boolean;
    show_online_status: boolean;
    allow_direct_messages: boolean;
  };
  verification_documents: {
    id_verification?: {
      status: 'pending' | 'approved' | 'rejected' | 'not_uploaded';
      rejection_reason?: string;
      verified_at?: string;
    };
    bar_verification?: {
      status: 'pending' | 'approved' | 'rejected' | 'not_uploaded';
      bar_number: string;
      state: string;
      rejection_reason?: string;
      verified_at?: string;
    };
  };
  created_at: string;
  updated_at: string | null;
}

// Helper function to safely parse JSON fields
export function safeJsonParse<T>(value: unknown, defaultValue: T): T {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return defaultValue;
    }
  }
  return value as T;
}
