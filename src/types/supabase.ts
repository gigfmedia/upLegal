import { Database } from '@/integrations/supabase/types/supabase';

declare module '@/integrations/supabase/types/supabase' {
  export interface Database {
    public: {
      Tables: {
        consultations: {
          Row: {
            id: string;
            client_id: string;
            lawyer_id: string;
            message: string;
            is_free: boolean;
            status: 'pending' | 'accepted' | 'rejected' | 'completed';
            price: number;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: string;
            client_id: string;
            lawyer_id: string;
            message: string;
            is_free: boolean;
            status?: 'pending' | 'accepted' | 'rejected' | 'completed';
            price: number;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            client_id?: string;
            lawyer_id?: string;
            message?: string;
            is_free?: boolean;
            status?: 'pending' | 'accepted' | 'rejected' | 'completed';
            price?: number;
            created_at?: string;
            updated_at?: string;
          };
        };
      };
      Functions: {
        mark_free_consultation_used: {
          Args: {
            user_id: string;
          };
          Returns: void;
        };
      };
    };
  }
}
