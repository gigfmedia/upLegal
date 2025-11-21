export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Functions: {
      create_consultation_with_free_check: {
        Args: {
          p_client_id: string
          p_lawyer_id: string
          p_message: string
          p_is_free: boolean
          p_price: number
        }
        Returns: {
          id: string
          success: boolean
          is_free: boolean
        }
      }
    }
    Tables: {
      lawyer_services: {
        Row: {
          available: boolean | null
          created_at: string
          delivery_time: string | null
          description: string | null
          features: string[] | null
          id: string
          lawyer_user_id: string
          price_clp: number
          title: string
          updated_at: string
        }
        Insert: {
          available?: boolean | null
          created_at?: string
          delivery_time?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          lawyer_user_id: string
          price_clp: number
          title: string
          updated_at?: string
        }
        Update: {
          available?: boolean | null
          created_at?: string
          delivery_time?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          lawyer_user_id?: string
          price_clp?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      linkedin_profiles: {
        Row: {
          connections_count: number | null
          created_at: string
          first_name: string | null
          headline: string | null
          id: string
          industry: string | null
          last_name: string | null
          linkedin_id: string | null
          location: string | null
          profile_picture_url: string | null
          public_profile_url: string | null
          raw_data: Json | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connections_count?: number | null
          created_at?: string
          first_name?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          last_name?: string | null
          linkedin_id?: string | null
          location?: string | null
          profile_picture_url?: string | null
          public_profile_url?: string | null
          raw_data?: Json | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connections_count?: number | null
          created_at?: string
          first_name?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          last_name?: string | null
          linkedin_id?: string | null
          location?: string | null
          profile_picture_url?: string | null
          public_profile_url?: string | null
          raw_data?: Json | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          client_user_id: string | null
          created_at: string
          currency: string | null
          id: string
          lawyer_amount: number | null
          lawyer_user_id: string | null
          platform_fee: number | null
          service_description: string | null
          status: string | null
          payment_gateway_id: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          client_user_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          lawyer_amount?: number | null
          lawyer_user_id?: string | null
          platform_fee?: number | null
          service_description?: string | null
          status?: string | null
          payment_gateway_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          client_user_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          lawyer_amount?: number | null
          lawyer_user_id?: string | null
          platform_fee?: number | null
          service_description?: string | null
          status?: string | null
          payment_gateway_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          first_name: string | null
          last_name: string | null
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          location: string | null
          phone: string | null
          website: string | null
          specialties: string[] | null
          hourly_rate_clp: number | null
          response_time: string | null
          satisfaction_rate: number | null
          languages: string[] | null
          availability: Json | null
          verified: boolean
          available_for_hire: boolean
          bar_number: string | null
          zoom_link: string | null
          education: Json[] | null
          certifications: Json[] | null
          experience_years: number | null
          rating: number
          review_count: number
          has_used_free_consultation: boolean
          visibility_settings: Json
          verification_documents: Json
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          languages?: string[] | null
          last_name?: string | null
          location?: string | null
          phone?: string | null
          response_time?: string | null
          satisfaction_rate?: number | null
          specialties?: string[] | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
          website?: string | null
          zoom_link?: string | null
        }
        Update: {
          availability?: string | null
          available_for_hire?: boolean | null
          avatar_url?: string | null
          bar_number?: string | null
          bio?: string | null
          certifications?: Json | null
          created_at?: string | null
          display_name?: string | null
          education?: Json | null
          experience_years?: number | null
          first_name?: string | null
          has_used_free_consultation?: boolean
          hourly_rate_clp?: number | null
          id?: string
          languages?: string[] | null
          last_name?: string | null
          location?: string | null
          phone?: string | null
          response_time?: string | null
          satisfaction_rate?: number | null
          specialties?: string[] | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
          website?: string | null
          zoom_link?: string | null
        }
        Relationships: []
      }
      consultations: {
        Row: {
          id: string
          client_id: string
          lawyer_id: string
          message: string
          is_free: boolean
          status: 'pending' | 'accepted' | 'rejected' | 'completed'
          price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          lawyer_id: string
          message: string
          is_free: boolean
          status?: 'pending' | 'accepted' | 'rejected' | 'completed'
          price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          lawyer_id?: string
          message?: string
          is_free?: boolean
          status?: 'pending' | 'accepted' | 'rejected' | 'completed'
          price?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_lawyer_id_fkey"
            columns: ["lawyer_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_consultation_with_free_check: {
        Args: {
          p_client_id: string
          p_lawyer_id: string
          p_message: string
          p_is_free: boolean
          p_price: number
        }
        Returns: {
          id: string
          success: boolean
          is_free: boolean
        }
      },
      mark_free_consultation_used: {
        Args: {
          user_id: string
        }
        Returns: void
      }
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
    Functions: {
      mark_free_consultation_used: {
        Args: {
          user_id: string
        }
        Returns: void
      }
    }
    Tables: {},
  },
} as const
