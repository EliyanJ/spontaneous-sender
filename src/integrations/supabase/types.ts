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
      cms_blocks: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string
          css: string | null
          description: string | null
          editable_params: Json | null
          html_template: string
          id: string
          js: string | null
          name: string
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by: string
          css?: string | null
          description?: string | null
          editable_params?: Json | null
          html_template?: string
          id?: string
          js?: string | null
          name: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string
          css?: string | null
          description?: string | null
          editable_params?: Json | null
          html_template?: string
          id?: string
          js?: string | null
          name?: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          author_id: string
          content: string | null
          created_at: string
          id: string
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          page_type: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          page_type?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          page_type?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
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
          search_batch_date: string | null
          search_batch_id: string | null
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
          search_batch_date?: string | null
          search_batch_id?: string | null
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
          search_batch_date?: string | null
          search_batch_id?: string | null
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
      company_blacklist: {
        Row: {
          blacklist_reason: Database["public"]["Enums"]["blacklist_reason"]
          company_name: string | null
          company_siren: string
          created_at: string
          expires_at: string | null
          hit_count: number
          id: string
          is_permanent: boolean
          updated_at: string
        }
        Insert: {
          blacklist_reason: Database["public"]["Enums"]["blacklist_reason"]
          company_name?: string | null
          company_siren: string
          created_at?: string
          expires_at?: string | null
          hit_count?: number
          id?: string
          is_permanent?: boolean
          updated_at?: string
        }
        Update: {
          blacklist_reason?: Database["public"]["Enums"]["blacklist_reason"]
          company_name?: string | null
          company_siren?: string
          created_at?: string
          expires_at?: string | null
          hit_count?: number
          id?: string
          is_permanent?: boolean
          updated_at?: string
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
      job_queue: {
        Row: {
          company_sirens: string[]
          completed_at: string | null
          created_at: string
          error_count: number
          errors: Json | null
          id: string
          is_premium: boolean
          priority: number
          processed_count: number
          results: Json | null
          search_params: Json
          skipped_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          success_count: number
          total_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          company_sirens?: string[]
          completed_at?: string | null
          created_at?: string
          error_count?: number
          errors?: Json | null
          id?: string
          is_premium?: boolean
          priority?: number
          processed_count?: number
          results?: Json | null
          search_params: Json
          skipped_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          success_count?: number
          total_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          company_sirens?: string[]
          completed_at?: string | null
          created_at?: string
          error_count?: number
          errors?: Json | null
          id?: string
          is_premium?: boolean
          priority?: number
          processed_count?: number
          results?: Json | null
          search_params?: Json
          skipped_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          success_count?: number
          total_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string | null
          cv_content: string | null
          education: string | null
          education_level: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          linkedin_url: string | null
          phone: string | null
          terms_accepted_at: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          cv_content?: string | null
          education?: string | null
          education_level?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          linkedin_url?: string | null
          phone?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          cv_content?: string | null
          education?: string | null
          education_level?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          phone?: string | null
          terms_accepted_at?: string | null
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
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string
          reward_tokens: number
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          reward_tokens?: number
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          reward_tokens?: number
          status?: Database["public"]["Enums"]["referral_status"]
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
      seo_settings: {
        Row: {
          canonical_url: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          page_path: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_path: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_path?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          generic_email_template: Json | null
          id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          sends_limit: number
          sends_remaining: number
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tokens_remaining: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          generic_email_template?: Json | null
          id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          sends_limit?: number
          sends_remaining?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tokens_remaining?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          generic_email_template?: Json | null
          id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          sends_limit?: number
          sends_remaining?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tokens_remaining?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          assigned_to: string | null
          category: string | null
          created_at: string
          current_page: string | null
          description: string
          id: string
          responded_at: string | null
          screenshot_url: string | null
          status: string
          subject: string
          updated_at: string
          urgency: string | null
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          current_page?: string | null
          description: string
          id?: string
          responded_at?: string | null
          screenshot_url?: string | null
          status?: string
          subject: string
          updated_at?: string
          urgency?: string | null
          user_id: string
        }
        Update: {
          admin_response?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          current_page?: string | null
          description?: string
          id?: string
          responded_at?: string | null
          screenshot_url?: string | null
          status?: string
          subject?: string
          updated_at?: string
          urgency?: string | null
          user_id?: string
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          type: Database["public"]["Enums"]["token_transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          type: Database["public"]["Enums"]["token_transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          type?: Database["public"]["Enums"]["token_transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string | null
          duration_ms: number | null
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          session_id?: string
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
      user_roles: {
        Row: {
          created_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_safe: {
        Row: {
          created_at: string | null
          education_level: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string | null
          last_name: string | null
          terms_accepted_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          education_level?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          last_name?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          education_level?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          last_name?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_to_blacklist: {
        Args: {
          p_name: string
          p_permanent?: boolean
          p_reason: Database["public"]["Enums"]["blacklist_reason"]
          p_siren: string
        }
        Returns: undefined
      }
      add_tokens: {
        Args: {
          p_amount: number
          p_description?: string
          p_type: Database["public"]["Enums"]["token_transaction_type"]
          p_user_id: string
        }
        Returns: undefined
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      complete_referral: {
        Args: { p_referral_code: string; p_referred_id: string }
        Returns: boolean
      }
      generate_referral_code: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_blacklisted: { Args: { p_siren: string }; Returns: boolean }
      use_send_credit: {
        Args: { p_count?: number; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "support" | "analyst" | "user"
      blacklist_reason: "no_email_found" | "api_error" | "invalid_company"
      job_status: "pending" | "processing" | "completed" | "failed"
      plan_type: "free" | "simple" | "plus"
      referral_status: "pending" | "completed" | "expired"
      subscription_status:
        | "active"
        | "canceled"
        | "past_due"
        | "trialing"
        | "incomplete"
      token_transaction_type:
        | "purchase"
        | "usage"
        | "bonus"
        | "referral"
        | "monthly_reset"
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
    Enums: {
      app_role: ["admin", "support", "analyst", "user"],
      blacklist_reason: ["no_email_found", "api_error", "invalid_company"],
      job_status: ["pending", "processing", "completed", "failed"],
      plan_type: ["free", "simple", "plus"],
      referral_status: ["pending", "completed", "expired"],
      subscription_status: [
        "active",
        "canceled",
        "past_due",
        "trialing",
        "incomplete",
      ],
      token_transaction_type: [
        "purchase",
        "usage",
        "bonus",
        "referral",
        "monthly_reset",
      ],
    },
  },
} as const
