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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          body_template: string
          created_at: string | null
          cv_url: string | null
          delay_between_emails: number | null
          emails_per_day: number | null
          failed_emails: number | null
          id: string
          name: string
          sent_emails: number | null
          status: string | null
          subject: string
          total_emails: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body_template: string
          created_at?: string | null
          cv_url?: string | null
          delay_between_emails?: number | null
          emails_per_day?: number | null
          failed_emails?: number | null
          id?: string
          name: string
          sent_emails?: number | null
          status?: string | null
          subject: string
          total_emails?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body_template?: string
          created_at?: string | null
          cv_url?: string | null
          delay_between_emails?: number | null
          emails_per_day?: number | null
          failed_emails?: number | null
          id?: string
          name?: string
          sent_emails?: number | null
          status?: string | null
          subject?: string
          total_emails?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          adresse: string | null
          career_site_url: string | null
          code_ape: string | null
          code_postal: string | null
          company_insights: Json | null
          created_at: string | null
          emails: Json | null
          has_contact_form: boolean | null
          id: string
          libelle_ape: string | null
          nature_juridique: string | null
          nom: string
          notes: string | null
          pipeline_stage: string | null
          selected_email: string | null
          siren: string
          siret: string
          status: string | null
          tranche_effectif: string | null
          updated_at: string | null
          user_id: string
          ville: string | null
          website_url: string | null
        }
        Insert: {
          adresse?: string | null
          career_site_url?: string | null
          code_ape?: string | null
          code_postal?: string | null
          company_insights?: Json | null
          created_at?: string | null
          emails?: Json | null
          has_contact_form?: boolean | null
          id?: string
          libelle_ape?: string | null
          nature_juridique?: string | null
          nom: string
          notes?: string | null
          pipeline_stage?: string | null
          selected_email?: string | null
          siren: string
          siret: string
          status?: string | null
          tranche_effectif?: string | null
          updated_at?: string | null
          user_id: string
          ville?: string | null
          website_url?: string | null
        }
        Update: {
          adresse?: string | null
          career_site_url?: string | null
          code_ape?: string | null
          code_postal?: string | null
          company_insights?: Json | null
          created_at?: string | null
          emails?: Json | null
          has_contact_form?: boolean | null
          id?: string
          libelle_ape?: string | null
          nature_juridique?: string | null
          nom?: string
          notes?: string | null
          pipeline_stage?: string | null
          selected_email?: string | null
          siren?: string
          siret?: string
          status?: string | null
          tranche_effectif?: string | null
          updated_at?: string | null
          user_id?: string
          ville?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          attachments: Json | null
          body: string
          company_id: string | null
          created_at: string
          follow_up_delay_days: number | null
          follow_up_enabled: boolean | null
          follow_up_sent_at: string | null
          follow_up_status: string | null
          id: string
          next_action: string | null
          pipeline_stage: string | null
          recipient: string
          response_category: string | null
          response_detected_at: string | null
          response_summary: string | null
          sent_at: string | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          company_id?: string | null
          created_at?: string
          follow_up_delay_days?: number | null
          follow_up_enabled?: boolean | null
          follow_up_sent_at?: string | null
          follow_up_status?: string | null
          id?: string
          next_action?: string | null
          pipeline_stage?: string | null
          recipient: string
          response_category?: string | null
          response_detected_at?: string | null
          response_summary?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          company_id?: string | null
          created_at?: string
          follow_up_delay_days?: number | null
          follow_up_enabled?: boolean | null
          follow_up_sent_at?: string | null
          follow_up_status?: string | null
          id?: string
          next_action?: string | null
          pipeline_stage?: string | null
          recipient?: string
          response_category?: string | null
          response_detected_at?: string | null
          response_summary?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          campaign_id: string
          company_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          recipient_email: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id: string
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient_email: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_responses: {
        Row: {
          ai_confidence: number | null
          body: string | null
          campaign_id: string
          category: string | null
          created_at: string
          gmail_message_id: string | null
          html_body: string | null
          id: string
          next_action: string | null
          pipeline_stage: string | null
          received_at: string
          sentiment_score: number | null
          subject: string | null
          summary: string | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          body?: string | null
          campaign_id: string
          category?: string | null
          created_at?: string
          gmail_message_id?: string | null
          html_body?: string | null
          id?: string
          next_action?: string | null
          pipeline_stage?: string | null
          received_at: string
          sentiment_score?: number | null
          subject?: string | null
          summary?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          body?: string | null
          campaign_id?: string
          category?: string | null
          created_at?: string
          gmail_message_id?: string | null
          html_body?: string | null
          id?: string
          next_action?: string | null
          pipeline_stage?: string | null
          received_at?: string
          sentiment_score?: number | null
          subject?: string | null
          summary?: string | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gmail_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gmail_watch_config: {
        Row: {
          email_address: string | null
          expires_at: string | null
          history_id: string | null
          last_check_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          email_address?: string | null
          expires_at?: string | null
          history_id?: string | null
          last_check_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          email_address?: string | null
          expires_at?: string | null
          history_id?: string | null
          last_check_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          cv_content: string | null
          education: string | null
          full_name: string | null
          id: string
          linkedin_url: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cv_content?: string | null
          education?: string | null
          full_name?: string | null
          id: string
          linkedin_url?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cv_content?: string | null
          education?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          count?: number
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          count?: number
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          attachments: Json | null
          created_at: string
          email_body: string | null
          error_message: string | null
          gmail_draft_id: string
          id: string
          notify_on_sent: boolean | null
          queue_msg_id: number | null
          recipients: string[]
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          email_body?: string | null
          error_message?: string | null
          gmail_draft_id: string
          id?: string
          notify_on_sent?: boolean | null
          queue_msg_id?: number | null
          recipients: string[]
          scheduled_for: string
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          email_body?: string | null
          error_message?: string | null
          gmail_draft_id?: string
          id?: string
          notify_on_sent?: boolean | null
          queue_msg_id?: number | null
          recipients?: string[]
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_company_blacklist: {
        Row: {
          company_siren: string
          contacted_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          company_siren: string
          contacted_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          company_siren?: string
          contacted_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_cv_profiles: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_email_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          related_campaign_id: string | null
          status: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          related_campaign_id?: string | null
          status?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          related_campaign_id?: string | null
          status?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_related_campaign_id_fkey"
            columns: ["related_campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          auto_follow_up: boolean | null
          follow_up_delay_days: number | null
          follow_up_template: string | null
          gmail_watch_enabled: boolean | null
          notification_email: string | null
          notify_on_email_sent: boolean | null
          notify_on_follow_up_reminder: boolean | null
          notify_on_response: boolean | null
          updated_at: string
          user_id: string
          watch_check_frequency: string | null
        }
        Insert: {
          auto_follow_up?: boolean | null
          follow_up_delay_days?: number | null
          follow_up_template?: string | null
          gmail_watch_enabled?: boolean | null
          notification_email?: string | null
          notify_on_email_sent?: boolean | null
          notify_on_follow_up_reminder?: boolean | null
          notify_on_response?: boolean | null
          updated_at?: string
          user_id: string
          watch_check_frequency?: string | null
        }
        Update: {
          auto_follow_up?: boolean | null
          follow_up_delay_days?: number | null
          follow_up_template?: string | null
          gmail_watch_enabled?: boolean | null
          notification_email?: string | null
          notify_on_email_sent?: boolean | null
          notify_on_follow_up_reminder?: boolean | null
          notify_on_response?: boolean | null
          updated_at?: string
          user_id?: string
          watch_check_frequency?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
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
