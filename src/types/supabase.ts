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
    Tables: {
      appointments: {
        Row: {
          address: string | null
          appointment_date: string
          appointment_time: string
          consultation_type: string
          contact_method: string
          created_at: string | null
          description: string | null
          duration: number
          email: string
          id: string
          lawyer_id: string
          name: string
          phone: string | null
          price: number
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          appointment_date: string
          appointment_time: string
          consultation_type: string
          contact_method: string
          created_at?: string | null
          description?: string | null
          duration: number
          email: string
          id?: string
          lawyer_id: string
          name: string
          phone?: string | null
          price: number
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          appointment_date?: string
          appointment_time?: string
          consultation_type?: string
          contact_method?: string
          created_at?: string | null
          description?: string | null
          duration?: number
          email?: string
          id?: string
          lawyer_id?: string
          name?: string
          phone?: string | null
          price?: number
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      consultations: {
        Row: {
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          is_free: boolean
          lawyer_id: string
          price: number
          service_id: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_free?: boolean
          lawyer_id: string
          price?: number
          service_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_free?: boolean
          lawyer_id?: string
          price?: number
          service_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          lawyer_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lawyer_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lawyer_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      lawyers: {
        Row: {
          created_at: string | null
          full_name: string
          is_active: boolean | null
          rut: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          is_active?: boolean | null
          rut: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          is_active?: boolean | null
          rut?: string
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
      messages: {
        Row: {
          consultation_id: string | null
          content: string
          created_at: string
          id: string
          read: boolean | null
          receiver_id: string
          sender_id: string
          service_id: string | null
        }
        Insert: {
          consultation_id?: string | null
          content: string
          created_at?: string
          id?: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
          service_id?: string | null
        }
        Update: {
          consultation_id?: string | null
          content?: string
          created_at?: string
          id?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
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
          availability: string | null
          available_for_hire: boolean | null
          avatar_url: string | null
          bar_association_number: string | null
          bar_number: string | null
          bio: string | null
          certifications: Json | null
          contact_fee_clp: number | null
          created_at: string
          display_name: string | null
          education: Json | null
          experience_years: number | null
          first_name: string | null
          has_used_free_consultation: boolean
          hourly_rate_clp: number | null
          id: string
          languages: string[] | null
          last_name: string | null
          location: string | null
          phone: string | null
          pjud_verified: boolean | null
          profile_setup_completed: boolean | null
          rating: number | null
          response_time: string | null
          review_count: number | null
          role: string | null
          rut: string | null
          satisfaction_rate: number | null
          specialties: string[] | null
          specialty_id: string | null
          stripe_account_id: string | null
          stripe_account_status: string | null
          study_end_year: number | null
          study_start_year: number | null
          university: string | null
          updated_at: string
          user_id: string
          verification_documents: Json | null
          verification_message: string | null
          verified: boolean | null
          website: string | null
          zoom_link: string | null
        }
        Insert: {
          availability?: string | null
          available_for_hire?: boolean | null
          avatar_url?: string | null
          bar_association_number?: string | null
          bar_number?: string | null
          bio?: string | null
          certifications?: Json | null
          contact_fee_clp?: number | null
          created_at?: string
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
          pjud_verified?: boolean | null
          profile_setup_completed?: boolean | null
          rating?: number | null
          response_time?: string | null
          review_count?: number | null
          role?: string | null
          rut?: string | null
          satisfaction_rate?: number | null
          specialties?: string[] | null
          specialty_id?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          study_end_year?: number | null
          study_start_year?: number | null
          university?: string | null
          updated_at?: string
          user_id: string
          verification_documents?: Json | null
          verification_message?: string | null
          verified?: boolean | null
          website?: string | null
          zoom_link?: string | null
        }
        Update: {
          availability?: string | null
          available_for_hire?: boolean | null
          avatar_url?: string | null
          bar_association_number?: string | null
          bar_number?: string | null
          bio?: string | null
          certifications?: Json | null
          contact_fee_clp?: number | null
          created_at?: string
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
          pjud_verified?: boolean | null
          profile_setup_completed?: boolean | null
          rating?: number | null
          response_time?: string | null
          review_count?: number | null
          role?: string | null
          rut?: string | null
          satisfaction_rate?: number | null
          specialties?: string[] | null
          specialty_id?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          study_end_year?: number | null
          study_start_year?: number | null
          university?: string | null
          updated_at?: string
          user_id?: string
          verification_documents?: Json | null
          verification_message?: string | null
          verified?: boolean | null
          website?: string | null
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          available: boolean | null
          created_at: string | null
          delivery_time: string | null
          description: string
          duration: number | null
          features: string[] | null
          id: string
          lawyer_id: string
          price_clp: number
          title: string
          updated_at: string | null
        }
        Insert: {
          available?: boolean | null
          created_at?: string | null
          delivery_time?: string | null
          description: string
          duration?: number | null
          features?: string[] | null
          id?: string
          lawyer_id: string
          price_clp: number
          title: string
          updated_at?: string | null
        }
        Update: {
          available?: boolean | null
          created_at?: string | null
          delivery_time?: string | null
          description?: string
          duration?: number | null
          features?: string[] | null
          id?: string
          lawyer_id?: string
          price_clp?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      specialties: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_favorited: {
        Args: { p_lawyer_id: string; p_user_id: string }
        Returns: boolean
      }
      mark_free_consultation_used: {
        Args: { user_id: string }
        Returns: undefined
      }
      set_bucket_policy: {
        Args: { bucket_name: string; policy: Json }
        Returns: Json
      }
      update_profile_rut: {
        Args: { p_rut: string; p_user_id: string }
        Returns: Json
      }
      update_profile_verification: {
        Args: { p_message: string; p_rut: string; user_id: string }
        Returns: Json
      }
      update_user_avatar: {
        Args: { p_avatar_url: string; p_user_id: string }
        Returns: Json
      }
      verify_lawyer_rpc: {
        Args: { p_full_name: string; p_rut: string }
        Returns: Json
      }
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
  },
} as const
