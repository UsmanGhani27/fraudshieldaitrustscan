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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_deletion_carryover: {
        Row: {
          created_at: string
          email_hash: string
          id: string
          period_start: string
          units: number
        }
        Insert: {
          created_at?: string
          email_hash: string
          id?: string
          period_start: string
          units: number
        }
        Update: {
          created_at?: string
          email_hash?: string
          id?: string
          period_start?: string
          units?: number
        }
        Relationships: []
      }
      alerts: {
        Row: {
          analysis_id: string | null
          body: string
          created_at: string
          id: string
          kind: string
          read_at: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          analysis_version: string
          claimed_brand: string | null
          claimed_identity: string | null
          confidence: number
          created_at: string
          details: Json
          evidence_deleted_at: string | null
          id: string
          input_type: Database["public"]["Enums"]["input_type"]
          is_saved: boolean
          model: string
          normalized_input_hash: string | null
          observed_indicators: Json
          primary_threat: Database["public"]["Enums"]["threat_category"] | null
          provider: string
          raw_input_text: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_score: number
          safe_to_proceed: boolean
          screenshot_storage_path: string | null
          sender_label: string | null
          source_url: string | null
          summary: string
          title: string
          uncertainty_notes: Json
          updated_at: string
          user_id: string
          verification_status: string
        }
        Insert: {
          analysis_version: string
          claimed_brand?: string | null
          claimed_identity?: string | null
          confidence: number
          created_at?: string
          details?: Json
          evidence_deleted_at?: string | null
          id?: string
          input_type: Database["public"]["Enums"]["input_type"]
          is_saved?: boolean
          model: string
          normalized_input_hash?: string | null
          observed_indicators?: Json
          primary_threat?: Database["public"]["Enums"]["threat_category"] | null
          provider: string
          raw_input_text?: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_score: number
          safe_to_proceed?: boolean
          screenshot_storage_path?: string | null
          sender_label?: string | null
          source_url?: string | null
          summary: string
          title: string
          uncertainty_notes?: Json
          updated_at?: string
          user_id: string
          verification_status?: string
        }
        Update: {
          analysis_version?: string
          claimed_brand?: string | null
          claimed_identity?: string | null
          confidence?: number
          created_at?: string
          details?: Json
          evidence_deleted_at?: string | null
          id?: string
          input_type?: Database["public"]["Enums"]["input_type"]
          is_saved?: boolean
          model?: string
          normalized_input_hash?: string | null
          observed_indicators?: Json
          primary_threat?: Database["public"]["Enums"]["threat_category"] | null
          provider?: string
          raw_input_text?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number
          safe_to_proceed?: boolean
          screenshot_storage_path?: string | null
          sender_label?: string | null
          source_url?: string | null
          summary?: string
          title?: string
          uncertainty_notes?: Json
          updated_at?: string
          user_id?: string
          verification_status?: string
        }
        Relationships: []
      }
      analysis_actions: {
        Row: {
          action_text: string
          action_type: string
          analysis_id: string
          created_at: string
          id: string
          sort_order: number
        }
        Insert: {
          action_text: string
          action_type?: string
          analysis_id: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Update: {
          action_text?: string
          action_type?: string
          analysis_id?: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "analysis_actions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_categories: {
        Row: {
          analysis_id: string
          category: Database["public"]["Enums"]["threat_category"]
          created_at: string
          id: string
        }
        Insert: {
          analysis_id: string
          category: Database["public"]["Enums"]["threat_category"]
          created_at?: string
          id?: string
        }
        Update: {
          analysis_id?: string
          category?: Database["public"]["Enums"]["threat_category"]
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_categories_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_signals: {
        Row: {
          analysis_id: string
          created_at: string
          evidence: string
          explanation: string
          id: string
          severity: Database["public"]["Enums"]["signal_severity"]
          title: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          evidence?: string
          explanation?: string
          id?: string
          severity: Database["public"]["Enums"]["signal_severity"]
          title: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          evidence?: string
          explanation?: string
          id?: string
          severity?: Database["public"]["Enums"]["signal_severity"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_signals_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      data_preferences: {
        Row: {
          created_at: string
          history_enabled: boolean
          id: string
          retention_days: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          history_enabled?: boolean
          id?: string
          retention_days?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          history_enabled?: boolean
          id?: string
          retention_days?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_storage_deletions: {
        Row: {
          bucket: string
          created_at: string
          id: string
          path: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          id?: string
          path: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          path?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          monthly_analysis_limit: number
          plan_code: Database["public"]["Enums"]["plan_code"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          monthly_analysis_limit?: number
          plan_code?: Database["public"]["Enums"]["plan_code"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          monthly_analysis_limit?: number
          plan_code?: Database["public"]["Enums"]["plan_code"]
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          analysis_id: string
          generated_at: string
          id: string
          report_title: string
          storage_path: string | null
          user_id: string
        }
        Insert: {
          analysis_id: string
          generated_at?: string
          id?: string
          report_title: string
          storage_path?: string | null
          user_id: string
        }
        Update: {
          analysis_id?: string
          generated_at?: string
          id?: string
          report_title?: string
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata_json: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata_json?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata_json?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_code: Database["public"]["Enums"]["plan_code"]
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_code?: Database["public"]["Enums"]["plan_code"]
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_code?: Database["public"]["Enums"]["plan_code"]
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          analysis_id: string | null
          created_at: string
          event_type: string
          id: string
          units: number
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          units?: number
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          units?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_steps: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          sort_order: number
          step_text: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          sort_order?: number
          step_text: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          step_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_steps_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_data: { Args: { _user_id: string }; Returns: undefined }
      owns_analysis: { Args: { _analysis_id: string }; Returns: boolean }
      purge_expired_analyses: { Args: never; Returns: number }
      reserve_analysis_usage: { Args: { _user_id: string }; Returns: Json }
    }
    Enums: {
      input_type: "message" | "email" | "url" | "screenshot" | "qr"
      plan_code: "free" | "personal" | "pro" | "team"
      risk_level: "low" | "medium" | "high" | "critical"
      signal_severity: "low" | "medium" | "high"
      threat_category:
        | "phishing"
        | "brand_impersonation"
        | "account_takeover"
        | "payment_scam"
        | "fake_support"
        | "job_scam"
        | "investment_scam"
        | "delivery_scam"
        | "government_impersonation"
        | "qr_phishing"
        | "suspicious_attachment"
        | "social_engineering"
        | "credential_harvesting"
        | "ai_manipulation"
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
  public: {
    Enums: {
      input_type: ["message", "email", "url", "screenshot", "qr"],
      plan_code: ["free", "personal", "pro", "team"],
      risk_level: ["low", "medium", "high", "critical"],
      signal_severity: ["low", "medium", "high"],
      threat_category: [
        "phishing",
        "brand_impersonation",
        "account_takeover",
        "payment_scam",
        "fake_support",
        "job_scam",
        "investment_scam",
        "delivery_scam",
        "government_impersonation",
        "qr_phishing",
        "suspicious_attachment",
        "social_engineering",
        "credential_harvesting",
        "ai_manipulation",
      ],
    },
  },
} as const
