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
          code_ape: string | null
          code_postal: string | null
          created_at: string | null
          emails: Json | null
          id: string
          libelle_ape: string | null
          nature_juridique: string | null
          nom: string
          pipeline_stage: string | null
          siren: string
          siret: string
          tranche_effectif: string | null
          updated_at: string | null
          user_id: string
          ville: string | null
          website_url: string | null
        }
        Insert: {
          adresse?: string | null
          code_ape?: string | null
          code_postal?: string | null
          created_at?: string | null
          emails?: Json | null
          id?: string
          libelle_ape?: string | null
          nature_juridique?: string | null
          nom: string
          pipeline_stage?: string | null
          siren: string
          siret: string
          tranche_effectif?: string | null
          updated_at?: string | null
          user_id: string
          ville?: string | null
          website_url?: string | null
        }
        Update: {
          adresse?: string | null
          code_ape?: string | null
          code_postal?: string | null
          created_at?: string | null
          emails?: Json | null
          id?: string
          libelle_ape?: string | null
          nature_juridique?: string | null
          nom?: string
          pipeline_stage?: string | null
          siren?: string
          siret?: string
          tranche_effectif?: string | null
          updated_at?: string | null
          user_id?: string
          ville?: string | null
          website_url?: string | null
        }
        Relationships: []
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
      profiles: {
        Row: {
          created_at: string | null
          education: string | null
          full_name: string | null
          id: string
          linkedin_url: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          education?: string | null
          full_name?: string | null
          id: string
          linkedin_url?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          education?: string | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          updated_at?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
  },
} as const
