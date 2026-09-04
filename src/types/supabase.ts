WARN: config section [inbucket] is deprecated. Please use [local_smtp] instead.
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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      ai_case_timeline_events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          event_type: string
          id: string
          lawyer_id: string
          metadata: Json
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_type: string
          id?: string
          lawyer_id: string
          metadata?: Json
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          lawyer_id?: string
          metadata?: Json
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_case_timeline_events_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_case_timeline_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_case_workflow_items: {
        Row: {
          action_id: string
          case_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          dismissed_at: string | null
          id: string
          lawyer_id: string
          priority: string
          source_document_id: string | null
          source_type: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          action_id: string
          case_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          dismissed_at?: string | null
          id?: string
          lawyer_id: string
          priority?: string
          source_document_id?: string | null
          source_type?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          action_id?: string
          case_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          dismissed_at?: string | null
          id?: string
          lawyer_id?: string
          priority?: string
          source_document_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_case_workflow_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_case_workflow_items_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_case_workflow_items_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "ai_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_case_workflow_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          lawyer_id: string
          metadata: Json | null
          role: string
          workspace_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          lawyer_id: string
          metadata?: Json | null
          role: string
          workspace_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          lawyer_id?: string
          metadata?: Json | null
          role?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          lawyer_id: string
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lawyer_id: string
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lawyer_id?: string
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_document_analyses: {
        Row: {
          claims: Json | null
          created_at: string
          deadlines: Json
          document_id: string
          document_type: string
          evidence_sources: Json | null
          id: string
          key_points: Json
          lawyer_id: string
          model: string | null
          obligations: Json
          parties: Json
          recommendations: Json
          risks: Json
          summary: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          claims?: Json | null
          created_at?: string
          deadlines?: Json
          document_id: string
          document_type: string
          evidence_sources?: Json | null
          id?: string
          key_points?: Json
          lawyer_id: string
          model?: string | null
          obligations?: Json
          parties?: Json
          recommendations?: Json
          risks?: Json
          summary: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          claims?: Json | null
          created_at?: string
          deadlines?: Json
          document_id?: string
          document_type?: string
          evidence_sources?: Json | null
          id?: string
          key_points?: Json
          lawyer_id?: string
          model?: string | null
          obligations?: Json
          parties?: Json
          recommendations?: Json
          risks?: Json
          summary?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_document_analyses_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "ai_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_document_analyses_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_document_analyses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_documents: {
        Row: {
          analysis_error: string | null
          analysis_status: string
          created_at: string
          extracted_text: string | null
          file_path: string
          file_size_bytes: number
          id: string
          lawyer_id: string
          mime_type: string
          model: string | null
          original_filename: string
          page_count: number | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          analysis_error?: string | null
          analysis_status?: string
          created_at?: string
          extracted_text?: string | null
          file_path: string
          file_size_bytes: number
          id?: string
          lawyer_id: string
          mime_type?: string
          model?: string | null
          original_filename: string
          page_count?: number | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          analysis_error?: string | null
          analysis_status?: string
          created_at?: string
          extracted_text?: string | null
          file_path?: string
          file_size_bytes?: number
          id?: string
          lawyer_id?: string
          mime_type?: string
          model?: string | null
          original_filename?: string
          page_count?: number | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_documents_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_lawyer_invites: {
        Row: {
          campaign: string
          created_at: string | null
          email: string | null
          id: string
          lawyer_id: string
          sent_at: string
          sent_by: string | null
        }
        Insert: {
          campaign: string
          created_at?: string | null
          email?: string | null
          id?: string
          lawyer_id: string
          sent_at?: string
          sent_by?: string | null
        }
        Update: {
          campaign?: string
          created_at?: string | null
          email?: string | null
          id?: string
          lawyer_id?: string
          sent_at?: string
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_lawyer_invites_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_research_requests: {
        Row: {
          answer: string
          created_at: string
          id: string
          lawyer_id: string
          model: string | null
          query: string
          sources: Json
          workspace_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          lawyer_id: string
          model?: string | null
          query: string
          sources?: Json
          workspace_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          lawyer_id?: string
          model?: string | null
          query?: string
          sources?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_research_requests_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_research_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          expires_at: string | null
          id: string
          lawyer_id: string
          plan: string
          provider: string | null
          provider_subscription_id: string | null
          started_at: string
          status: string
          trial_email: string | null
          trial_ends_at: string | null
          trial_reminder_day: number | null
          trial_started_at: string | null
          unlimited_trial: boolean
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          expires_at?: string | null
          id?: string
          lawyer_id: string
          plan?: string
          provider?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          trial_email?: string | null
          trial_ends_at?: string | null
          trial_reminder_day?: number | null
          trial_started_at?: string | null
          unlimited_trial?: boolean
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          expires_at?: string | null
          id?: string
          lawyer_id?: string
          plan?: string
          provider?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          trial_email?: string | null
          trial_ends_at?: string | null
          trial_reminder_day?: number | null
          trial_started_at?: string | null
          unlimited_trial?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_subscriptions_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          conversation_id: string | null
          created_at: string
          credits_used: number
          document_id: string | null
          estimated_cost_usd: number
          id: string
          input_tokens: number
          lawyer_id: string
          model: string | null
          operation: string
          output_tokens: number
          provider: string | null
          total_tokens: number
          workspace_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          credits_used?: number
          document_id?: string | null
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          lawyer_id: string
          model?: string | null
          operation: string
          output_tokens?: number
          provider?: string | null
          total_tokens?: number
          workspace_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          credits_used?: number
          document_id?: string | null
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          lawyer_id?: string
          model?: string | null
          operation?: string
          output_tokens?: number
          provider?: string | null
          total_tokens?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_monthly: {
        Row: {
          chat_message_count: number
          document_analysis_count: number
          estimated_cost_usd: number
          id: string
          jurisprudence_research_count: number
          lawyer_id: string
          period_end: string
          period_start: string
          total_credits: number
          total_tokens: number
          updated_at: string
        }
        Insert: {
          chat_message_count?: number
          document_analysis_count?: number
          estimated_cost_usd?: number
          id?: string
          jurisprudence_research_count?: number
          lawyer_id: string
          period_end: string
          period_start: string
          total_credits?: number
          total_tokens?: number
          updated_at?: string
        }
        Update: {
          chat_message_count?: number
          document_analysis_count?: number
          estimated_cost_usd?: number
          id?: string
          jurisprudence_research_count?: number
          lawyer_id?: string
          period_end?: string
          period_start?: string
          total_credits?: number
          total_tokens?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_monthly_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_waitlist: {
        Row: {
          biggest_task: string | null
          created_at: string
          email: string
          id: string
          legal_area: string | null
          time_on_docs: string | null
          uses_chatgpt: string | null
        }
        Insert: {
          biggest_task?: string | null
          created_at?: string
          email: string
          id?: string
          legal_area?: string | null
          time_on_docs?: string | null
          uses_chatgpt?: string | null
        }
        Update: {
          biggest_task?: string | null
          created_at?: string
          email?: string
          id?: string
          legal_area?: string | null
          time_on_docs?: string | null
          uses_chatgpt?: string | null
        }
        Relationships: []
      }
      ai_workspaces: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lawyer_id: string
          name: string
          practice_area: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lawyer_id: string
          name: string
          practice_area?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lawyer_id?: string
          name?: string
          practice_area?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workspaces_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          meet_provider: string | null
          meet_status: string | null
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
          meet_provider?: string | null
          meet_status?: string | null
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
          meet_provider?: string | null
          meet_status?: string | null
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
      auth_states: {
        Row: {
          code_verifier: string
          created_at: string | null
          expires_at: string | null
          state: string
        }
        Insert: {
          code_verifier: string
          created_at?: string | null
          expires_at?: string | null
          state: string
        }
        Update: {
          code_verifier?: string
          created_at?: string | null
          expires_at?: string | null
          state?: string
        }
        Relationships: []
      }
      booking_leads: {
        Row: {
          booking_id: string | null
          booking_type: string | null
          created_at: string
          duration: number | null
          email: string
          id: string
          lawyer_id: string
          name: string
          phone: string | null
          price: number
          selected_date: string | null
          selected_time: string | null
          service_id: string | null
          service_title: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          booking_type?: string | null
          created_at?: string
          duration?: number | null
          email: string
          id?: string
          lawyer_id: string
          name: string
          phone?: string | null
          price: number
          selected_date?: string | null
          selected_time?: string | null
          service_id?: string | null
          service_title?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          booking_type?: string | null
          created_at?: string
          duration?: number | null
          email?: string
          id?: string
          lawyer_id?: string
          name?: string
          phone?: string | null
          price?: number
          selected_date?: string | null
          selected_time?: string | null
          service_id?: string | null
          service_title?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_leads_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_leads_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      booking_rescue_emails: {
        Row: {
          booking_id: string
          created_at: string
          error: string | null
          id: string
          sent_at: string | null
          sent_to: string | null
          status: string
          step: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          error?: string | null
          id?: string
          sent_at?: string | null
          sent_to?: string | null
          status?: string
          step: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          error?: string | null
          id?: string
          sent_at?: string | null
          sent_to?: string | null
          status?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_rescue_emails_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_range: unknown
          booking_type: string
          cancelled_at: string | null
          client_id: string | null
          confirmed_at: string | null
          created_at: string | null
          duration: number | null
          experiment_variant: string | null
          id: string
          lawyer_id: string
          mercadopago_preference_id: string | null
          metadata: Json | null
          needs_manual_review: boolean | null
          payment_id: string | null
          payment_status: string | null
          posthog_distinct_id: string | null
          price: number
          requires_meeting: boolean
          scheduled_date: string | null
          scheduled_time: string | null
          service_delivery_time: string | null
          service_description: string | null
          service_id: string | null
          service_title: string | null
          source: string
          status: string
          updated_at: string | null
          user_email: string
          user_id: string | null
          user_name: string
          user_phone: string | null
        }
        Insert: {
          booking_range?: unknown
          booking_type?: string
          cancelled_at?: string | null
          client_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          duration?: number | null
          experiment_variant?: string | null
          id?: string
          lawyer_id: string
          mercadopago_preference_id?: string | null
          metadata?: Json | null
          needs_manual_review?: boolean | null
          payment_id?: string | null
          payment_status?: string | null
          posthog_distinct_id?: string | null
          price: number
          requires_meeting?: boolean
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_delivery_time?: string | null
          service_description?: string | null
          service_id?: string | null
          service_title?: string | null
          source?: string
          status?: string
          updated_at?: string | null
          user_email: string
          user_id?: string | null
          user_name: string
          user_phone?: string | null
        }
        Update: {
          booking_range?: unknown
          booking_type?: string
          cancelled_at?: string | null
          client_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          duration?: number | null
          experiment_variant?: string | null
          id?: string
          lawyer_id?: string
          mercadopago_preference_id?: string | null
          metadata?: Json | null
          needs_manual_review?: boolean | null
          payment_id?: string | null
          payment_status?: string | null
          posthog_distinct_id?: string | null
          price?: number
          requires_meeting?: boolean
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_delivery_time?: string | null
          service_description?: string | null
          service_id?: string | null
          service_title?: string | null
          source?: string
          status?: string
          updated_at?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "lawyer_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_events: {
        Row: {
          category: string | null
          commercial_intent: string | null
          conversation_id: string | null
          created_at: string
          event_type: string
          id: string
          is_local: boolean
          source: string | null
          subcategory: string | null
          urgency: string | null
          visitor_id: string | null
        }
        Insert: {
          category?: string | null
          commercial_intent?: string | null
          conversation_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          is_local?: boolean
          source?: string | null
          subcategory?: string | null
          urgency?: string | null
          visitor_id?: string | null
        }
        Update: {
          category?: string | null
          commercial_intent?: string | null
          conversation_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          is_local?: boolean
          source?: string | null
          subcategory?: string | null
          urgency?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          employee_count: number | null
          id: string
          industry: string | null
          legal_representative: string | null
          name: string
          rut: string
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          employee_count?: number | null
          id?: string
          industry?: string | null
          legal_representative?: string | null
          name: string
          rut: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          employee_count?: number | null
          id?: string
          industry?: string | null
          legal_representative?: string | null
          name?: string
          rut?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_activity_log: {
        Row: {
          action: string
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_budget_items: {
        Row: {
          budget_id: string
          created_at: string | null
          description: string
          id: string
          legal_service_id: string | null
          quantity: number
          total_clp: number
          unit_price_clp: number
        }
        Insert: {
          budget_id: string
          created_at?: string | null
          description: string
          id?: string
          legal_service_id?: string | null
          quantity?: number
          total_clp?: number
          unit_price_clp?: number
        }
        Update: {
          budget_id?: string
          created_at?: string | null
          description?: string
          id?: string
          legal_service_id?: string | null
          quantity?: number
          total_clp?: number
          unit_price_clp?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "company_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_budget_items_legal_service_id_fkey"
            columns: ["legal_service_id"]
            isOneToOne: false
            referencedRelation: "legal_services"
            referencedColumns: ["id"]
          },
        ]
      }
      company_budgets: {
        Row: {
          approved_at: string | null
          company_id: string
          created_at: string | null
          created_by: string
          description: string | null
          discount_clp: number
          id: string
          lawyer_id: string | null
          rejected_at: string | null
          rejection_reason: string | null
          request_id: string
          status: string
          subtotal_clp: number
          tax_clp: number
          title: string
          total_clp: number
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          discount_clp?: number
          id?: string
          lawyer_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          request_id: string
          status?: string
          subtotal_clp?: number
          tax_clp?: number
          title: string
          total_clp?: number
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          discount_clp?: number
          id?: string
          lawyer_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          request_id?: string
          status?: string
          subtotal_clp?: number
          tax_clp?: number
          title?: string
          total_clp?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_budgets_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "company_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          category: string
          company_id: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          tags: string[] | null
          uploaded_by: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          tags?: string[] | null
          uploaded_by: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          tags?: string[] | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_lawyers: {
        Row: {
          assigned_at: string
          company_id: string
          id: string
          is_primary: boolean
          lawyer_id: string
        }
        Insert: {
          assigned_at?: string
          company_id: string
          id?: string
          is_primary?: boolean
          lawyer_id: string
        }
        Update: {
          assigned_at?: string
          company_id?: string
          id?: string
          is_primary?: boolean
          lawyer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_lawyers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_notes: {
        Row: {
          company_id: string
          content: string
          created_at: string
          created_by: string
          id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_ratings: {
        Row: {
          comment: string | null
          company_id: string
          created_at: string | null
          id: string
          lawyer_id: string
          rater_type: string
          rating: number
          request_id: string
        }
        Insert: {
          comment?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          lawyer_id: string
          rater_type: string
          rating: number
          request_id: string
        }
        Update: {
          comment?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          lawyer_id?: string
          rater_type?: string
          rating?: number
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_ratings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_ratings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "company_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      company_request_documents: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          request_id: string
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          request_id: string
          uploaded_by: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          request_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_request_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_request_documents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "company_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      company_requests: {
        Row: {
          ai_detected_missing_docs: string[] | null
          ai_suggested_lawyer_id: string | null
          ai_suggested_specialties: string[] | null
          ai_summary: string | null
          assigned_at: string | null
          assigned_by: string | null
          category: string
          closed_at: string | null
          company_id: string
          created_at: string
          description: string
          first_response_at: string | null
          id: string
          is_out_of_plan: boolean
          lawyer_id: string | null
          priority: string
          sla_deadline: string | null
          status: string
          subcategory: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_detected_missing_docs?: string[] | null
          ai_suggested_lawyer_id?: string | null
          ai_suggested_specialties?: string[] | null
          ai_summary?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          category: string
          closed_at?: string | null
          company_id: string
          created_at?: string
          description: string
          first_response_at?: string | null
          id?: string
          is_out_of_plan?: boolean
          lawyer_id?: string | null
          priority?: string
          sla_deadline?: string | null
          status?: string
          subcategory?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_detected_missing_docs?: string[] | null
          ai_suggested_lawyer_id?: string | null
          ai_suggested_specialties?: string[] | null
          ai_summary?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          category?: string
          closed_at?: string | null
          company_id?: string
          created_at?: string
          description?: string
          first_response_at?: string | null
          id?: string
          is_out_of_plan?: boolean
          lawyer_id?: string | null
          priority?: string
          sla_deadline?: string | null
          status?: string
          subcategory?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          card_holder_name: string | null
          card_last_four: string | null
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          mercadopago_plan_id: string | null
          mercadopago_preapproval_id: string | null
          payment_method_id: string | null
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          card_holder_name?: string | null
          card_last_four?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          mercadopago_plan_id?: string | null
          mercadopago_preapproval_id?: string | null
          payment_method_id?: string | null
          plan_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          card_holder_name?: string | null
          card_last_four?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          mercadopago_plan_id?: string | null
          mercadopago_preapproval_id?: string | null
          payment_method_id?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      company_usage: {
        Row: {
          company_id: string
          consultations_limit: number
          consultations_used: number
          created_at: string
          id: string
          period_end: string
          period_start: string
          reviews_limit: number
          reviews_used: number
          subscription_id: string
        }
        Insert: {
          company_id: string
          consultations_limit?: number
          consultations_used?: number
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          reviews_limit?: number
          reviews_used?: number
          subscription_id: string
        }
        Update: {
          company_id?: string
          consultations_limit?: number
          consultations_used?: number
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          reviews_limit?: number
          reviews_used?: number
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "company_subscriptions"
            referencedColumns: ["id"]
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
      error_logs: {
        Row: {
          anonymous_id: string | null
          browser: string | null
          build_version: string | null
          commit_hash: string | null
          created_at: string | null
          details: Json | null
          id: string
          is_database_error: boolean | null
          message: string
          os: string | null
          path: string | null
          type: string
          user_id: string | null
          viewport: string | null
        }
        Insert: {
          anonymous_id?: string | null
          browser?: string | null
          build_version?: string | null
          commit_hash?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          is_database_error?: boolean | null
          message: string
          os?: string | null
          path?: string | null
          type: string
          user_id?: string | null
          viewport?: string | null
        }
        Update: {
          anonymous_id?: string | null
          browser?: string | null
          build_version?: string | null
          commit_hash?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          is_database_error?: boolean | null
          message?: string
          os?: string | null
          path?: string | null
          type?: string
          user_id?: string | null
          viewport?: string | null
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
      generated_documents: {
        Row: {
          amount: number | null
          converted_to_legal_service: boolean | null
          created_at: string | null
          download_count: number | null
          email_sent_at: string | null
          error_message: string | null
          generated_at: string | null
          id: string
          mercadopago_preference_id: string | null
          opened_email: boolean | null
          payload: Json
          payment_id: string | null
          pdf_url: string | null
          review_requested: boolean | null
          status: string
          template_version: number | null
          total_paid: number | null
          type: string
          updated_at: string | null
          user_email: string
          user_name: string | null
        }
        Insert: {
          amount?: number | null
          converted_to_legal_service?: boolean | null
          created_at?: string | null
          download_count?: number | null
          email_sent_at?: string | null
          error_message?: string | null
          generated_at?: string | null
          id?: string
          mercadopago_preference_id?: string | null
          opened_email?: boolean | null
          payload?: Json
          payment_id?: string | null
          pdf_url?: string | null
          review_requested?: boolean | null
          status?: string
          template_version?: number | null
          total_paid?: number | null
          type: string
          updated_at?: string | null
          user_email: string
          user_name?: string | null
        }
        Update: {
          amount?: number | null
          converted_to_legal_service?: boolean | null
          created_at?: string | null
          download_count?: number | null
          email_sent_at?: string | null
          error_message?: string | null
          generated_at?: string | null
          id?: string
          mercadopago_preference_id?: string | null
          opened_email?: boolean | null
          payload?: Json
          payment_id?: string | null
          pdf_url?: string | null
          review_requested?: boolean | null
          status?: string
          template_version?: number | null
          total_paid?: number | null
          type?: string
          updated_at?: string | null
          user_email?: string
          user_name?: string | null
        }
        Relationships: []
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
      lawyer_cases: {
        Row: {
          ai_workspace_id: string | null
          booking_id: string | null
          client_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          lawyer_id: string
          practice_area: string | null
          price_clp: number | null
          quote_request_id: string | null
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_workspace_id?: string | null
          booking_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          lawyer_id: string
          practice_area?: string | null
          price_clp?: number | null
          quote_request_id?: string | null
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_workspace_id?: string | null
          booking_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          lawyer_id?: string
          practice_area?: string | null
          price_clp?: number | null
          quote_request_id?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_cases_ai_workspace_id_fkey"
            columns: ["ai_workspace_id"]
            isOneToOne: false
            referencedRelation: "ai_workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_cases_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "lawyer_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_cases_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_cases_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "service_quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_clients: {
        Row: {
          created_at: string
          email: string | null
          first_booking_id: string | null
          id: string
          lawyer_id: string
          name: string
          notes: string | null
          phone: string | null
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_booking_id?: string | null
          id?: string
          lawyer_id: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_booking_id?: string | null
          id?: string
          lawyer_id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_clients_first_booking_id_fkey"
            columns: ["first_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_clients_lawyer_id_fkey"
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
          lawyer_name: string | null
          lawyer_user_id: string
          price_clp: number
          requires_quote: boolean | null
          sort_order: number | null
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
          lawyer_name?: string | null
          lawyer_user_id: string
          price_clp: number
          requires_quote?: boolean | null
          sort_order?: number | null
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
          lawyer_name?: string | null
          lawyer_user_id?: string
          price_clp?: number
          requires_quote?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lawyer_specialties: {
        Row: {
          category: string
          created_at: string
          id: string
          lawyer_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          lawyer_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          lawyer_id?: string
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
      legal_document_requests: {
        Row: {
          created_at: string | null
          document_id: string
          request_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          request_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_document_requests_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "company_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_versions: {
        Row: {
          created_at: string | null
          document_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          notes: string | null
          uploaded_by: string
          version_number: number
        }
        Insert: {
          created_at?: string | null
          document_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          notes?: string | null
          uploaded_by: string
          version_number: number
        }
        Update: {
          created_at?: string | null
          document_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          uploaded_by?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          current_version_id: string | null
          description: string | null
          folder_id: string | null
          id: string
          name: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          current_version_id?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          name: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          current_version_id?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          name?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_documents_current_version_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "legal_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_folders: {
        Row: {
          company_id: string
          created_at: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_folders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "legal_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_services: {
        Row: {
          category_slug: string
          created_at: string | null
          description: string | null
          estimated_days: number | null
          icon: string | null
          id: string
          included_in_subscription: boolean | null
          is_active: boolean | null
          requires_quote: boolean | null
          service_name: string
          sort_order: number | null
          starting_price_clp: number | null
        }
        Insert: {
          category_slug: string
          created_at?: string | null
          description?: string | null
          estimated_days?: number | null
          icon?: string | null
          id?: string
          included_in_subscription?: boolean | null
          is_active?: boolean | null
          requires_quote?: boolean | null
          service_name: string
          sort_order?: number | null
          starting_price_clp?: number | null
        }
        Update: {
          category_slug?: string
          created_at?: string | null
          description?: string | null
          estimated_days?: number | null
          icon?: string | null
          id?: string
          included_in_subscription?: boolean | null
          is_active?: boolean | null
          requires_quote?: boolean | null
          service_name?: string
          sort_order?: number | null
          starting_price_clp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_services_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["slug"]
          },
        ]
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
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_id: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean
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
          visitor_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_path: string
          page_title?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          amount: number | null
          appointment_id: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          payment_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          appointment_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          appointment_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          client_surcharge: number | null
          client_surcharge_percent: number | null
          consultation_id: string | null
          created_at: string
          currency: string | null
          id: string
          lawyer_amount: number | null
          lawyer_id: string | null
          metadata: Json | null
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
          user_id: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          client_surcharge?: number | null
          client_surcharge_percent?: number | null
          consultation_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          lawyer_amount?: number | null
          lawyer_id?: string | null
          metadata?: Json | null
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
          user_id?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          client_surcharge?: number | null
          client_surcharge_percent?: number | null
          consultation_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          lawyer_amount?: number | null
          lawyer_id?: string | null
          metadata?: Json | null
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
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_user_id_fkey"
            columns: ["user_id"]
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
            columns: ["lawyer_id"]
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
          blocked: boolean | null
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
          meet_link: string | null
          mercado_pago_access_token: string | null
          mercado_pago_account_id: string | null
          mercado_pago_connected: boolean | null
          mercado_pago_connected_at: string | null
          mercado_pago_email: string | null
          mercado_pago_expires_at: string | null
          mercado_pago_first_name: string | null
          mercado_pago_last_name: string | null
          mercado_pago_nickname: string | null
          mercado_pago_public_key: string | null
          mercado_pago_refresh_token: string | null
          mercado_pago_user_id: string | null
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
          blocked?: boolean | null
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
          meet_link?: string | null
          mercado_pago_access_token?: string | null
          mercado_pago_account_id?: string | null
          mercado_pago_connected?: boolean | null
          mercado_pago_connected_at?: string | null
          mercado_pago_email?: string | null
          mercado_pago_expires_at?: string | null
          mercado_pago_first_name?: string | null
          mercado_pago_last_name?: string | null
          mercado_pago_nickname?: string | null
          mercado_pago_public_key?: string | null
          mercado_pago_refresh_token?: string | null
          mercado_pago_user_id?: string | null
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
          blocked?: boolean | null
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
          meet_link?: string | null
          mercado_pago_access_token?: string | null
          mercado_pago_account_id?: string | null
          mercado_pago_connected?: boolean | null
          mercado_pago_connected_at?: string | null
          mercado_pago_email?: string | null
          mercado_pago_expires_at?: string | null
          mercado_pago_first_name?: string | null
          mercado_pago_last_name?: string | null
          mercado_pago_nickname?: string | null
          mercado_pago_public_key?: string | null
          mercado_pago_refresh_token?: string | null
          mercado_pago_user_id?: string | null
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
      request_messages: {
        Row: {
          content: string
          created_at: string | null
          file_name: string | null
          file_url: string | null
          id: string
          request_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          request_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "company_requests"
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
          lawyer_id: string | null
          token: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          expires_at: string
          id?: string
          lawyer_id?: string | null
          token: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          lawyer_id?: string | null
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
          {
            foreignKeyName: "review_tokens_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
      service_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      service_quote_requests: {
        Row: {
          created_at: string | null
          description: string
          id: string
          lawyer_id: string
          mercadopago_preference_id: string | null
          paid_at: string | null
          payment_id: string | null
          payment_link: string | null
          payment_status: string | null
          quote_notes: string | null
          quoted_at: string | null
          quoted_price: number | null
          service_id: string
          service_title: string
          status: string
          updated_at: string | null
          user_email: string
          user_id: string
          user_name: string
          user_phone: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          lawyer_id: string
          mercadopago_preference_id?: string | null
          paid_at?: string | null
          payment_id?: string | null
          payment_link?: string | null
          payment_status?: string | null
          quote_notes?: string | null
          quoted_at?: string | null
          quoted_price?: number | null
          service_id: string
          service_title: string
          status?: string
          updated_at?: string | null
          user_email: string
          user_id: string
          user_name: string
          user_phone?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          lawyer_id?: string
          mercadopago_preference_id?: string | null
          paid_at?: string | null
          payment_id?: string | null
          payment_link?: string | null
          payment_status?: string | null
          quote_notes?: string | null
          quoted_at?: string | null
          quoted_price?: number | null
          service_id?: string
          service_title?: string
          status?: string
          updated_at?: string | null
          user_email?: string
          user_id?: string
          user_name?: string
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_quote_requests_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      service_rescue_emails: {
        Row: {
          booking_id: string
          clicked_at: string | null
          created_at: string | null
          error: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          sent_to: string
          status: string
          step: string
        }
        Insert: {
          booking_id: string
          clicked_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          sent_to: string
          status?: string
          step: string
        }
        Update: {
          booking_id?: string
          clicked_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          sent_to?: string
          status?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_rescue_emails_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
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
      subscription_payment_events: {
        Row: {
          amount: number | null
          created_at: string
          event_type: string
          id: string
          mercadopago_event_id: string | null
          metadata: Json | null
          status: string | null
          subscription_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          event_type: string
          id?: string
          mercadopago_event_id?: string | null
          metadata?: Json | null
          status?: string | null
          subscription_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          event_type?: string
          id?: string
          mercadopago_event_id?: string | null
          metadata?: Json | null
          status?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payment_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "company_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          additional_service_discount: number
          consultations_limit: number
          created_at: string
          description: string | null
          features: Json
          has_dedicated_lawyer: boolean
          id: string
          is_active: boolean
          name: string
          price_clp: number
          priority: string
          reviews_limit: number
          sla_hours: number
        }
        Insert: {
          additional_service_discount?: number
          consultations_limit?: number
          created_at?: string
          description?: string | null
          features?: Json
          has_dedicated_lawyer?: boolean
          id: string
          is_active?: boolean
          name: string
          price_clp: number
          priority?: string
          reviews_limit?: number
          sla_hours?: number
        }
        Update: {
          additional_service_discount?: number
          consultations_limit?: number
          created_at?: string
          description?: string | null
          features?: Json
          has_dedicated_lawyer?: boolean
          id?: string
          is_active?: boolean
          name?: string
          price_clp?: number
          priority?: string
          reviews_limit?: number
          sla_hours?: number
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          event_data: Json | null
          event_id: string
          id: string
          processed_at: string | null
        }
        Insert: {
          event_data?: Json | null
          event_id: string
          id?: string
          processed_at?: string | null
        }
        Update: {
          event_data?: Json | null
          event_id?: string
          id?: string
          processed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ai_is_lawyer_on_trial: { Args: { p_lawyer_id: string }; Returns: boolean }
      calculate_lawyer_rating: { Args: { lawyer_id: string }; Returns: number }
      create_payment_secure: {
        Args: {
          p_amount: number
          p_client_surcharge: number
          p_client_surcharge_percent: number
          p_created_at: string
          p_currency: string
          p_id: string
          p_lawyer_amount: number
          p_lawyer_id: string
          p_metadata: Json
          p_original_amount: number
          p_platform_fee: number
          p_platform_fee_percent: number
          p_status: string
          p_updated_at: string
          p_user_id: string
        }
        Returns: Json
      }
      create_profile: { Args: never; Returns: undefined }
      get_appointment_stats: { Args: never; Returns: Json }
      get_company_metrics: { Args: never; Returns: Json }
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
      get_lawyer_busy_slots:
        | {
            Args: { query_date: string; query_lawyer_id: string }
            Returns: {
              duration: number
              scheduled_time: string
            }[]
          }
        | {
            Args: { query_date: string; query_lawyer_id: string }
            Returns: {
              duration: number
              scheduled_time: string
            }[]
          }
      increment_ai_usage_monthly:
        | {
            Args: {
              p_chat_message_count: number
              p_document_analysis_count: number
              p_estimated_cost_usd: number
              p_lawyer_id: string
              p_period_end: string
              p_period_start: string
              p_total_credits: number
              p_total_tokens: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_chat_message_count?: number
              p_document_analysis_count?: number
              p_estimated_cost_usd?: number
              p_jurisprudence_research_count?: number
              p_lawyer_id: string
              p_period_end: string
              p_period_start: string
              p_total_credits?: number
              p_total_tokens?: number
            }
            Returns: undefined
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
      notify_user:
        | {
            Args: {
              p_body?: string
              p_entity_id?: string
              p_entity_type?: string
              p_metadata?: Json
              p_title: string
              p_type: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_body: string
              p_entity_id?: string
              p_entity_type?: string
              p_metadata?: string
              p_title: string
              p_type: string
              p_user_id: string
            }
            Returns: undefined
          }
      reset_company_usage: {
        Args: {
          p_company_id: string
          p_consultations_limit: number
          p_period_end: string
          p_period_start: string
          p_reviews_limit: number
          p_subscription_id: string
        }
        Returns: string
      }
      seed_legal_folders: { Args: { p_company_id: string }; Returns: undefined }
      set_bucket_policy: {
        Args: { bucket_name: string; policy: Json }
        Returns: Json
      }
      update_payment_gateway_id: {
        Args: { p_gateway_id: string; p_payment_id: string }
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
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
