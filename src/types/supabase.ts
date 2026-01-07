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
          amount: number | null
          appointment_date: string
          appointment_time: string
          consultation_type: string
          contact_method: string
          created_at: string | null
          currency: string | null
          description: string | null
          duration: number
          email: string
          id: string
          lawyer_id: string
          meet_link: string | null
          meeting_link: string | null
          name: string
          notes: string | null
          phone: string | null
          price: number
          status: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          amount?: number | null
          appointment_date: string
          appointment_time: string
          consultation_type: string
          contact_method: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration: number
          email: string
          id?: string
          lawyer_id: string
          meet_link?: string | null
          meeting_link?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          price: number
          status?: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          amount?: number | null
          appointment_date?: string
          appointment_time?: string
          consultation_type?: string
          contact_method?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration?: number
          email?: string
          id?: string
          lawyer_id?: string
          meet_link?: string | null
          meeting_link?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          price?: number
          status?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string | null
          duration: number
          id: string
          lawyer_id: string
          mercadopago_preference_id: string | null
          payment_id: string | null
          payment_status: string | null
          price: number
          scheduled_date: string
          scheduled_time: string
          status: string
          updated_at: string | null
          user_email: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          duration: number
          id?: string
          lawyer_id: string
          mercadopago_preference_id?: string | null
          payment_id?: string | null
          payment_status?: string | null
          price: number
          scheduled_date: string
          scheduled_time: string
          status?: string
          updated_at?: string | null
          user_email: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          duration?: number
          id?: string
          lawyer_id?: string
          mercadopago_preference_id?: string | null
          payment_id?: string | null
          payment_status?: string | null
          price?: number
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          updated_at?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
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
      google_integrations: {
        Row: {
          access_token: string
          created_at: string
          expires_at: number
          id: string
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: number
          id?: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: number
          id?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      mercadopago_accounts: {
        Row: {
          access_token: string
          created_at: string | null
          email: string | null
          expires_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          mercadopago_user_id: string
          nickname: string | null
          public_key: string | null
          refresh_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          mercadopago_user_id: string
          nickname?: string | null
          public_key?: string | null
          refresh_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          mercadopago_user_id?: string
          nickname?: string | null
          public_key?: string | null
          refresh_token?: string | null
          updated_at?: string | null
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
      page_views: {
        Row: {
          created_at: string | null
          id: string
          page_path: string
          page_title: string | null
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_path: string
          page_title?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          appointment_id: string | null
          client_surcharge: number | null
          client_surcharge_percent: number | null
          client_user_id: string | null
          consultation_id: string | null
          created_at: string
          currency: string | null
          id: string
          lawyer_amount: number | null
          lawyer_user_id: string | null
          original_amount: number | null
          payment_gateway_id: string | null
          payout_date: string | null
          payout_error: string | null
          payout_reference: string | null
          payout_status: string
          platform_fee: number | null
          platform_fee_percent: number | null
          service_description: string | null
          status: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          client_surcharge?: number | null
          client_surcharge_percent?: number | null
          client_user_id?: string | null
          consultation_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          lawyer_amount?: number | null
          lawyer_user_id?: string | null
          original_amount?: number | null
          payment_gateway_id?: string | null
          payout_date?: string | null
          payout_error?: string | null
          payout_reference?: string | null
          payout_status?: string
          platform_fee?: number | null
          platform_fee_percent?: number | null
          service_description?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          client_surcharge?: number | null
          client_surcharge_percent?: number | null
          client_user_id?: string | null
          consultation_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          lawyer_amount?: number | null
          lawyer_user_id?: string | null
          original_amount?: number | null
          payment_gateway_id?: string | null
          payout_date?: string | null
          payout_error?: string | null
          payout_reference?: string | null
          payout_status?: string
          platform_fee?: number | null
          platform_fee_percent?: number | null
          service_description?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payments_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lawyer_user_id_fkey"
            columns: ["lawyer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          lawyer_user_id: string
          metadata: Json | null
          payment_ids: string[]
          reference: string | null
          status: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          lawyer_user_id: string
          metadata?: Json | null
          payment_ids: string[]
          reference?: string | null
          status: string
          total_amount: number
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          lawyer_user_id?: string
          metadata?: Json | null
          payment_ids?: string[]
          reference?: string | null
          status?: string
          total_amount?: number
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          client_surcharge_percent: number
          created_at: string
          currency: string
          id: string
          platform_fee_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_surcharge_percent?: number
          created_at?: string
          currency?: string
          id?: string
          platform_fee_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_surcharge_percent?: number
          created_at?: string
          currency?: string
          id?: string
          platform_fee_percent?: number
          updated_at?: string
          updated_by?: string | null
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
          email: string | null
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
          study_end_year: number | null
          study_start_year: number | null
          university: string | null
          updated_at: string
          user_id: string
          verification_documents: Json | null
          verification_message: string | null
          verified: boolean | null
          website: string | null
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
          email?: string | null
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
          study_end_year?: number | null
          study_start_year?: number | null
          university?: string | null
          updated_at?: string
          user_id: string
          verification_documents?: Json | null
          verification_message?: string | null
          verified?: boolean | null
          website?: string | null
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
          email?: string | null
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
          study_end_year?: number | null
          study_start_year?: number | null
          university?: string | null
          updated_at?: string
          user_id?: string
          verification_documents?: Json | null
          verification_message?: string | null
          verified?: boolean | null
          website?: string | null
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
      review_tokens: {
        Row: {
          appointment_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_tokens_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string
          client_id: string
          comment: string | null
          created_at: string
          id: string
          lawyer_id: string
          rating: number
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          lawyer_id: string
          rating: number
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          lawyer_id?: string
          rating?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      calculate_lawyer_rating: { Args: { lawyer_id: string }; Returns: number }
      create_profile: { Args: never; Returns: undefined }
      get_appointment_stats: {
        Args: never
        Returns: {
          cancelled: number
          completed: number
          pending: number
          total: number
        }[]
      }
      get_distinct_lawyers: {
        Args: {
          location_filter?: string
          min_experience?: number
          min_rating?: number
          page_number?: number
          page_size?: number
          search_term?: string
          specialty_filter?: string
        }
        Returns: {
          avatar_url: string
          bio: string
          contact_fee_clp: number
          created_at: string
          experience_years: number
          first_name: string
          hourly_rate_clp: number
          id: string
          last_name: string
          location: string
          pjud_verified: boolean
          rating: number
          review_count: number
          specialties: string[]
          updated_at: string
          user_id: string
          verified: boolean
        }[]
      }
      get_lawyer_busy_slots: {
        Args: { query_date: string; query_lawyer_id: string }
        Returns: {
          duration: number
          scheduled_time: string
        }[]
      }
      increment_review_count: {
        Args: { lawyer_id: string }
        Returns: undefined
      }
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
      validate_rut: { Args: { rut: string }; Returns: boolean }
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
