export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  email?: string;
}

export interface Review {
  id: string;
  lawyer_id: string;
  client_id: string;
  appointment_id: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  lawyer?: UserProfile;
  client?: UserProfile;
}
